//! 用户 `link:` 本地插件的开发监视。
//!
//! DSH 的 `@deepseek-ai/dsh-client-hmr` 已在 web 组合里常驻：它 stat 轮询 client
//! bundle，有重建才重载。打包用户没有 `pnpm run dev`，改源码不会写出 bundle。
//! 本模块为当前档案里的**用户** link 插件（非内置、非 `@deepseek-ai/*`）：
//! - 有 `dev` / tsdown 配置则拉起 `tsdown --watch`，client 变更交给上游 HMR；
//! - 轮询宿主源码（`src/` 里除 `client` 外、`cordis.patch.yml` 等），变更后通知
//!   前端重启 Harness（Node 会缓存 host `apply`，必须换进程）。
//!
//! 不引入 notify：与 [`super::watch`] 一样秒级指纹比对。监视进程在应用退出时回收，
//! Harness 重启期间保持运行。

use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use super::install::build_plugin_envs;
use super::installed::{installed_name, profile_dir, ProfilePackageJson};
use super::preset::load_presets;
use super::verify::pnpm_direct;
use crate::service::profile::active_profile;

pub(crate) const HOST_CHANGED_EVENT: &str = "link-plugin-host-changed";

const TICK: Duration = Duration::from_secs(1);
const HOST_DEBOUNCE: Duration = Duration::from_millis(800);

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct UserLinkPlugin {
    pub id: String,
    pub dir: PathBuf,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HostChangedPayload {
    id: String,
}

struct LiveWatch {
    child: Child,
    dir: PathBuf,
}

struct HostWatchState {
    by_id: HashMap<String, String>,
    pending: Option<(String, Instant)>,
}

fn watchers() -> &'static Mutex<HashMap<String, LiveWatch>> {
    static SLOT: OnceLock<Mutex<HashMap<String, LiveWatch>>> = OnceLock::new();
    SLOT.get_or_init(|| Mutex::new(HashMap::new()))
}

fn host_state() -> &'static Mutex<HostWatchState> {
    static SLOT: OnceLock<Mutex<HostWatchState>> = OnceLock::new();
    SLOT.get_or_init(|| {
        Mutex::new(HostWatchState {
            by_id: HashMap::new(),
            pending: None,
        })
    })
}

/// 从依赖 spec 解析本地目录（`link:` / `file:`）。目录不存在则 None。
pub(crate) fn parse_link_dir(spec: &str) -> Option<PathBuf> {
    let rest = spec
        .strip_prefix("link:")
        .or_else(|| spec.strip_prefix("file:"))?;
    let rest = rest.trim().trim_matches('"');
    if rest.is_empty() {
        return None;
    }
    let path = PathBuf::from(rest);
    if !path.is_dir() {
        return None;
    }
    Some(dunce::canonicalize(&path).unwrap_or(path))
}

/// 用户本地 link 插件：可解析目录、非内置、非核心包。
pub(crate) fn is_user_link_plugin(
    id: &str,
    spec: &str,
    builtin: &HashSet<String>,
) -> Option<PathBuf> {
    if id.starts_with("@deepseek-ai/") || builtin.contains(id) {
        return None;
    }
    parse_link_dir(spec)
}

/// 当前档案里已激活的用户 link 插件（`dependencies` 为 `link:`/`file:`，且仍在
/// `dsh.profile.bundles`）。跳过模式会把用户插件移出 bundles，禁用同理，这两种
/// 都不该再拉起 tsdown 或因改源码重启。
pub(crate) fn user_link_plugins_from_manifest(
    manifest: &ProfilePackageJson,
    builtin: &HashSet<String>,
) -> Vec<UserLinkPlugin> {
    let bundles = manifest
        .dsh
        .as_ref()
        .and_then(|dsh| dsh.profile.as_ref())
        .map(|profile| profile.bundles.as_slice())
        .unwrap_or(&[]);
    let mut plugins: Vec<UserLinkPlugin> = manifest
        .dependencies
        .iter()
        .filter(|(id, _)| bundles.iter().any(|bundle| bundle == *id))
        .filter_map(|(id, spec)| {
            is_user_link_plugin(id, spec, builtin).map(|dir| UserLinkPlugin {
                id: id.clone(),
                dir,
            })
        })
        .collect();
    plugins.sort_by(|a, b| a.id.cmp(&b.id));
    plugins
}

fn skip_walk_name(name: &str) -> bool {
    matches!(
        name,
        "node_modules" | "dist" | "lib" | ".git" | ".turbo" | "coverage" | ".DS_Store"
    )
}

/// 宿主监视文件：清单 / patch，以及 `src/` 下除 `client` 外的源码。
/// 无 `src/` 时回落到包根 `index.js|ts`（纯 JS 插件）。
pub(crate) fn host_source_files(dir: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    for name in ["package.json", "cordis.patch.yml", "dsh.plugin.json"] {
        let path = dir.join(name);
        if path.is_file() {
            files.push(path);
        }
    }
    let src = dir.join("src");
    if src.is_dir() {
        walk_host_sources(&src, dir, &mut files);
    } else {
        for name in ["index.js", "index.ts", "index.mjs", "index.cjs"] {
            let path = dir.join(name);
            if path.is_file() {
                files.push(path);
            }
        }
    }
    files.sort();
    files.dedup();
    files
}

fn walk_host_sources(dir: &Path, root: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with('.') || skip_walk_name(&name) {
            continue;
        }
        if path.is_dir() {
            let rel = path.strip_prefix(root).unwrap_or(&path);
            if rel.components().any(|c| c.as_os_str() == "client") {
                continue;
            }
            walk_host_sources(&path, root, out);
        } else if path.is_file() {
            let rel = path.strip_prefix(root).unwrap_or(&path);
            if rel.components().any(|c| c.as_os_str() == "client") {
                continue;
            }
            out.push(path);
        }
    }
}

pub(crate) fn host_fingerprint(files: &[PathBuf]) -> String {
    let mut rows = Vec::new();
    for path in files {
        let meta = match fs::metadata(path) {
            Ok(meta) => meta,
            Err(_) => continue,
        };
        let mtime = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis())
            .unwrap_or(0);
        rows.push(format!("{}\0{mtime}\0{}", path.display(), meta.len()));
    }
    rows.sort();
    rows.join("\n")
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum DevWatchKind {
    NpmDev,
    Tsdown,
}

/// 是否值得拉起常驻重建：有 `scripts.dev`，或存在 tsdown 配置。
pub(crate) fn detect_dev_watch(dir: &Path) -> Option<DevWatchKind> {
    let raw = fs::read_to_string(dir.join("package.json")).ok()?;
    let json: serde_json::Value = serde_json::from_str(&raw).ok()?;
    if json
        .pointer("/scripts/dev")
        .and_then(|v| v.as_str())
        .is_some_and(|s| !s.trim().is_empty())
    {
        return Some(DevWatchKind::NpmDev);
    }
    for name in ["tsdown.config.ts", "tsdown.config.js", "tsdown.config.mts"] {
        if dir.join(name).is_file() {
            return Some(DevWatchKind::Tsdown);
        }
    }
    None
}

fn builtin_names(app_handle: &AppHandle) -> HashSet<String> {
    load_presets(app_handle)
        .iter()
        .filter(|plugin| plugin.internal)
        .map(|plugin| installed_name(plugin).to_string())
        .collect()
}

fn read_profile_manifest(app_handle: &AppHandle) -> Option<ProfilePackageJson> {
    let content = fs::read_to_string(profile_dir(app_handle).join("package.json")).ok()?;
    serde_json::from_str(&content).ok()
}

fn current_user_links(app_handle: &AppHandle) -> Vec<UserLinkPlugin> {
    let Some(manifest) = read_profile_manifest(app_handle) else {
        return Vec::new();
    };
    user_link_plugins_from_manifest(&manifest, &builtin_names(app_handle))
}

fn kill_child(child: &mut Child) {
    let pid = child.id();
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .creation_flags(0x0800_0000)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("kill")
            .args(["-TERM", &format!("-{pid}")])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let _ = child.wait();
}

fn spawn_dev_watch(app_handle: &AppHandle, plugin: &UserLinkPlugin) -> Option<Child> {
    let kind = detect_dev_watch(&plugin.dir)?;
    let (program, mut args) = pnpm_direct(app_handle)?;
    match kind {
        DevWatchKind::NpmDev => {
            args.push(OsString::from("run"));
            args.push(OsString::from("dev"));
        }
        DevWatchKind::Tsdown => {
            args.push(OsString::from("exec"));
            args.push(OsString::from("tsdown"));
            args.push(OsString::from("--watch"));
            args.push(OsString::from("--config-loader"));
            args.push(OsString::from("unrun"));
        }
    }
    let envs = build_plugin_envs(app_handle, true);
    let mut cmd = Command::new(program);
    cmd.args(&args)
        .envs(&envs)
        .current_dir(&plugin.dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    match cmd.spawn() {
        Ok(child) => {
            log::info!(
                "linkwatch: watching {} ({}) pid {}",
                plugin.id,
                plugin.dir.display(),
                child.id()
            );
            Some(child)
        }
        Err(error) => {
            log::warn!(
                "linkwatch: failed to spawn watcher for {}: {error}",
                plugin.id
            );
            None
        }
    }
}

fn sync_watchers(app_handle: &AppHandle) {
    let wanted = current_user_links(app_handle);
    let wanted_ids: HashSet<String> = wanted.iter().map(|p| p.id.clone()).collect();
    let mut slot = watchers().lock().unwrap_or_else(|e| e.into_inner());

    let stale: Vec<String> = slot
        .keys()
        .filter(|id| !wanted_ids.contains(*id))
        .cloned()
        .collect();
    for id in stale {
        if let Some(mut live) = slot.remove(&id) {
            log::info!("linkwatch: stop watcher for {id}");
            kill_child(&mut live.child);
        }
    }

    for plugin in &wanted {
        let mut respawn = false;
        match slot.get_mut(&plugin.id) {
            None => respawn = true,
            Some(live) if live.dir != plugin.dir => {
                kill_child(&mut live.child);
                respawn = true;
            }
            Some(live) => {
                if let Ok(Some(status)) = live.child.try_wait() {
                    log::warn!(
                        "linkwatch: watcher for {} exited ({status:?}), will respawn",
                        plugin.id
                    );
                    respawn = true;
                }
            }
        }
        if !respawn {
            continue;
        }
        if let Some(mut old) = slot.remove(&plugin.id) {
            let _ = old.child.try_wait();
        }
        if let Some(child) = spawn_dev_watch(app_handle, plugin) {
            slot.insert(
                plugin.id.clone(),
                LiveWatch {
                    child,
                    dir: plugin.dir.clone(),
                },
            );
        }
    }
}

fn poll_host_sources(app_handle: &AppHandle) {
    let plugins = current_user_links(app_handle);
    let mut state = host_state().lock().unwrap_or_else(|e| e.into_inner());
    let live_ids: HashSet<String> = plugins.iter().map(|p| p.id.clone()).collect();
    state.by_id.retain(|id, _| live_ids.contains(id));

    let mut changed: Option<(String, String)> = None;
    for plugin in &plugins {
        let next = host_fingerprint(&host_source_files(&plugin.dir));
        match state.by_id.get(&plugin.id) {
            None => {
                state.by_id.insert(plugin.id.clone(), next);
            }
            Some(prev) if prev == &next => {}
            Some(_) => {
                if changed.is_none() {
                    changed = Some((plugin.id.clone(), next));
                }
            }
        }
    }

    let Some((id, next)) = changed else {
        state.pending = None;
        return;
    };
    let now = Instant::now();
    match state.pending.as_ref() {
        None => {
            state.pending = Some((id, now));
            return;
        }
        Some((pending_id, since))
            if pending_id == &id && now.duration_since(*since) < HOST_DEBOUNCE =>
        {
            return;
        }
        Some(_) => {}
    }
    log::info!(
        "linkwatch: host sources changed in profile {} ({id})",
        active_profile(app_handle)
    );
    if let Err(error) = app_handle.emit(HOST_CHANGED_EVENT, HostChangedPayload { id: id.clone() }) {
        log::warn!("linkwatch: emit {HOST_CHANGED_EVENT} failed: {error}");
    }
    state.by_id.insert(id, next);
    state.pending = None;
}

/// 启动常驻循环：同步 tsdown watch、轮询宿主源码。
pub fn start(app_handle: &AppHandle) {
    let app = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(TICK);
        loop {
            interval.tick().await;
            sync_watchers(&app);
            poll_host_sources(&app);
        }
    });
}

/// 应用退出时结束全部监视子进程。
pub fn stop_all() {
    let mut slot = watchers().lock().unwrap_or_else(|e| e.into_inner());
    for (id, mut live) in slot.drain() {
        log::info!("linkwatch: stop watcher for {id} on exit");
        kill_child(&mut live.child);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("dsh-linkwatch-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn parse_link_and_file_specs() {
        let dir = tmp("parse");
        let spec = format!("link:{}", dir.display());
        let parsed = parse_link_dir(&spec).expect("link dir");
        assert_eq!(parsed, dunce::canonicalize(&dir).unwrap());
        assert!(parse_link_dir("1.2.3").is_none());
        assert!(parse_link_dir("link:/no/such/linkwatch-dir").is_none());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn user_link_skips_builtin_and_core() {
        let dir = tmp("user");
        let spec = format!("link:{}", dir.display());
        let mut builtin = HashSet::new();
        builtin.insert("dsh-tauri".to_string());
        assert!(is_user_link_plugin("dsh-tauri", &spec, &builtin).is_none());
        assert!(is_user_link_plugin("@deepseek-ai/dsh-base", &spec, &builtin).is_none());
        assert!(is_user_link_plugin("dsh-boot-bomb", &spec, &builtin).is_some());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn host_sources_skip_client_and_dist() {
        let dir = tmp("sources");
        fs::write(dir.join("package.json"), "{\"name\":\"x\"}\n").unwrap();
        fs::write(dir.join("cordis.patch.yml"), "- insert: []\n").unwrap();
        fs::create_dir_all(dir.join("src/host")).unwrap();
        fs::create_dir_all(dir.join("src/client")).unwrap();
        fs::create_dir_all(dir.join("dist")).unwrap();
        fs::write(dir.join("src/index.ts"), "export function apply() {}\n").unwrap();
        fs::write(dir.join("src/host/apply.ts"), "export {}\n").unwrap();
        fs::write(dir.join("src/client/index.ts"), "export {}\n").unwrap();
        fs::write(dir.join("dist/index.js"), "export {}\n").unwrap();
        let files = host_source_files(&dir);
        let joined = files
            .iter()
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .collect::<Vec<_>>()
            .join("\n");
        assert!(joined.contains("src/index.ts"));
        assert!(joined.contains("src/host/apply.ts"));
        assert!(joined.contains("cordis.patch.yml"));
        assert!(!joined.contains("src/client"));
        assert!(!joined.contains("/dist/"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn js_only_plugin_watches_root_index() {
        let dir = tmp("js-only");
        fs::write(dir.join("package.json"), "{\"name\":\"x\"}\n").unwrap();
        fs::write(dir.join("index.js"), "export function apply() {}\n").unwrap();
        let files = host_source_files(&dir);
        assert!(files.iter().any(|p| p.ends_with("index.js")));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn fingerprint_changes_when_host_file_changes() {
        let dir = tmp("fp");
        fs::write(dir.join("package.json"), "{\"name\":\"x\"}\n").unwrap();
        fs::write(dir.join("index.js"), "one\n").unwrap();
        let before = host_fingerprint(&host_source_files(&dir));
        fs::write(dir.join("index.js"), "two\n").unwrap();
        let after = host_fingerprint(&host_source_files(&dir));
        assert_ne!(before, after);
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn detect_dev_script_and_tsdown_config() {
        let dir = tmp("dev");
        fs::write(
            dir.join("package.json"),
            r#"{"name":"x","scripts":{"dev":"tsdown --watch"}}"#,
        )
        .unwrap();
        assert_eq!(detect_dev_watch(&dir), Some(DevWatchKind::NpmDev));
        let dir2 = tmp("tsdown");
        fs::write(dir2.join("package.json"), r#"{"name":"x"}"#).unwrap();
        fs::write(dir2.join("tsdown.config.ts"), "export default {}\n").unwrap();
        assert_eq!(detect_dev_watch(&dir2), Some(DevWatchKind::Tsdown));
        let dir3 = tmp("none");
        fs::write(dir3.join("package.json"), r#"{"name":"x"}"#).unwrap();
        assert_eq!(detect_dev_watch(&dir3), None);
        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_dir_all(&dir2);
        let _ = fs::remove_dir_all(&dir3);
    }

    #[test]
    fn manifest_collects_only_user_links() {
        let dir = tmp("manifest");
        let spec = format!("link:{}", dir.display());
        let manifest = ProfilePackageJson {
            dependencies: HashMap::from([
                ("dsh-boot-bomb".to_string(), spec.clone()),
                ("dsh-tauri".to_string(), spec.clone()),
                ("dshmarket".to_string(), "1.47.0".to_string()),
                ("dsh-disabled-link".to_string(), spec.clone()),
            ]),
            dsh: Some(super::super::installed::ProfileDshSection {
                profile: Some(super::super::installed::ProfileInner {
                    bundles: vec![
                        "dsh-boot-bomb".to_string(),
                        "dsh-tauri".to_string(),
                        "dshmarket".to_string(),
                    ],
                }),
            }),
        };
        let builtin = HashSet::from(["dsh-tauri".to_string()]);
        let plugins = user_link_plugins_from_manifest(&manifest, &builtin);
        assert_eq!(plugins.len(), 1);
        assert_eq!(plugins[0].id, "dsh-boot-bomb");
        let _ = fs::remove_dir_all(&dir);
    }
}
