//! 启动后手动载入未打包的本地开发插件。
//!
//! `dsh plugin add` 是 pnpm 转发器：只把 `link:<abs>` 写入当前档案的
//! `dependencies`，再按 `dsh.bundle.patch` 把包名追加进 `dsh.profile.bundles`。
//! 它**不会**热挂到正在跑的 Cordis 树。桌面端因此仍先停服务再 add，装完由前端
//! 重启 Harness；真正加载发生在下一次进程启动。之后 `linkwatch` 会为该目录拉起
//! tsdown watch（client 走 DSH HMR），宿主源码变更再自动重启。

use crate::config;
use crate::service::cli;
use crate::service::core;
use crate::service::profile::active_profile;
use crate::service::workflow;
use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use super::artifact::ensure_plugin_entry_built;
use super::build_plugin_envs;
use super::diagnose::{
    diagnostic_suffix, git_transport_hint, network_error_hint, pick_error_message,
};
use super::errors;
use super::is_installed;
use super::new_process_owner;
use super::pnpm::{ensure_pnpm, profile_store_dir};
use super::profile_dir;
use super::run_plugin_install_with_transient_retry;
use super::{PreinstallLogPayload, PREINSTALL_LOG_EVENT};

/// 本地插件安装成功后返回给前端的摘要（刷新列表 / toast 用）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalPluginInstallResult {
    pub name: String,
    pub version: String,
}

/// 从本地目录读出的可安装插件元信息。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LocalPluginInspect {
    pub name: String,
    pub version: String,
    pub description: String,
    pub patch: String,
}

#[derive(Deserialize)]
struct PackageManifest {
    name: Option<String>,
    #[serde(default)]
    version: String,
    #[serde(default)]
    description: String,
    dsh: Option<DshSection>,
}

#[derive(Deserialize)]
struct DshSection {
    bundle: Option<BundleSection>,
}

#[derive(Deserialize)]
struct BundleSection {
    patch: Option<String>,
}

/// 系统文件夹选择器；取消返回 `Ok(None)`。必须在主线程弹原生面板。
pub async fn pick_local_plugin_directory(app_handle: &AppHandle) -> Result<Option<String>, String> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| "WINDOW_NOT_FOUND: main window missing".to_string())?;
    let title = crate::config::i18n::t("plugins.load_local");
    let parent = window.clone();
    let (tx, rx) = tokio::sync::oneshot::channel();
    app_handle
        .run_on_main_thread(move || {
            let picked = rfd::FileDialog::new()
                .set_title(&title)
                .set_parent(&parent)
                .pick_folder();
            let _ = tx.send(picked);
        })
        .map_err(|e| format!("LOCAL_PLUGIN_PICK_FAILED: {e}"))?;
    let picked = rx
        .await
        .map_err(|_| "LOCAL_PLUGIN_PICK_FAILED: folder dialog closed unexpectedly".to_string())?;
    Ok(picked.map(|path| path.to_string_lossy().into_owned()))
}

/// 校验目录是带 `dsh.bundle.patch` 的 DSH 插件包，然后 `dsh plugin add link:<abs>`。
pub async fn install_local(
    app_handle: &AppHandle,
    dir: &Path,
) -> Result<LocalPluginInstallResult, String> {
    let dir = dunce::canonicalize(dir)
        .map_err(|e| format!("LOCAL_PLUGIN_CANONICALIZE: {} ({e})", dir.display()))?;
    let inspect = inspect(&dir)?;
    let spec = link_spec(&dir);

    cli::ensure_shims(app_handle)?;
    let node = config::get_node_binary_path(app_handle);
    let dsh_bin = core::active_dsh_binary(app_handle);
    if !node.exists() {
        return Err("NODE_NOT_FOUND: Node.js runtime missing".to_string());
    }
    if !dsh_bin.exists() {
        return Err("HARNESS_NOT_FOUND: dsh CLI missing".to_string());
    }

    let window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| "WINDOW_NOT_FOUND: main window missing".to_string())?;
    emit_log(
        &window,
        format!(
            "[harness] 正在以 link: 载入本地插件 {}@{}（{}）。dsh plugin add 只写入档案，不会热挂当前进程；装完会重启服务才加载。",
            inspect.name, inspect.version, dir.display()
        ),
    );

    let owner = new_process_owner();
    let prefer_bundled_pnpm = ensure_pnpm(app_handle, &window, owner).await?;
    super::ensure_profile_npmrc(app_handle)?;
    super::ensure_profile_pnpm_policy(app_handle)?;

    let mut stopped = true;
    if workflow::has_owned_process() {
        emit_log(
            &window,
            "[harness] 正在停止运行中的服务（载入本地插件需要短暂重启）…",
        );
        log::info!(
            "Stopping running harness service before linking local plugin {}",
            inspect.name
        );
        stopped = match workflow::stop(app_handle.clone()).await {
            Ok(()) => true,
            Err(e) => {
                log::warn!("failed to stop harness before local plugin install: {e}");
                false
            }
        };
    }
    if stopped && is_installed(app_handle, &inspect.name) {
        super::super::snapshot::create_best_effort(app_handle, &inspect.name);
    }

    let envs = build_plugin_envs(app_handle, prefer_bundled_pnpm);
    let mut args = vec![
        dsh_bin.as_os_str().to_os_string(),
        OsString::from("plugin"),
        OsString::from("--profile"),
        OsString::from(active_profile(app_handle)),
        OsString::from("add"),
    ];
    if let Some(store_dir) = profile_store_dir(app_handle) {
        log::info!("pinning local plugin install pnpm store via CLI: {store_dir}");
        args.push(OsString::from(format!("--store-dir={store_dir}")));
    }
    args.push(OsString::from(&spec));

    let cwd = config::get_dsh_install_path(app_handle);
    log::info!("Running dsh plugin install for local spec {spec}");

    let (exit_code, last_output) = run_plugin_install_with_transient_retry(
        app_handle, &node, &args, &cwd, &envs, &window, "install", None, owner,
    )
    .await?;

    if exit_code != 0 {
        return fail_install(app_handle, &inspect.name, exit_code, &last_output, &window);
    }

    let pkg_dir = profile_dir(app_handle)
        .join("node_modules")
        .join(&inspect.name);
    let manifest = pkg_dir.join("package.json");
    if !manifest.is_file() {
        let detail = format!(
            "PREINSTALL_SILENT_FAIL: dsh plugin exited with code 0, but no install artifact was created for [{}]. Expected package manifest: {}.",
            inspect.name,
            manifest.display()
        );
        log::error!("{detail}");
        if let Err(e) = errors::record(app_handle, &inspect.name, "install", &detail) {
            log::warn!("failed to record plugin error for {}: {e}", inspect.name);
        }
        return Err(detail);
    }
    if let Err(e) = errors::clear(app_handle, &inspect.name) {
        log::warn!("failed to clear plugin error for {}: {e}", inspect.name);
    }

    if let Err(e) =
        ensure_plugin_entry_built(app_handle, &inspect.name, &pkg_dir, &envs, &window).await
    {
        if let Err(record_err) = errors::record(app_handle, &inspect.name, "install", &e) {
            log::warn!(
                "failed to record plugin error for {}: {record_err}",
                inspect.name
            );
        }
        return Err(e);
    }

    emit_log(
        &window,
        format!(
            "[harness] 已把 {} 链入当前档案；接下来重启服务才会进入 Cordis 树",
            inspect.name
        ),
    );
    log::info!(
        "Local plugin linked successfully: {} -> {spec}",
        inspect.name
    );
    Ok(LocalPluginInstallResult {
        name: inspect.name,
        version: inspect.version,
    })
}

pub fn inspect(dir: &Path) -> Result<LocalPluginInspect, String> {
    if !dir.is_dir() {
        return Err(format!(
            "LOCAL_PLUGIN_NOT_DIR: {} is not a directory",
            dir.display()
        ));
    }
    let manifest_path = dir.join("package.json");
    let raw = fs::read_to_string(&manifest_path).map_err(|e| {
        format!(
            "LOCAL_PLUGIN_NO_MANIFEST: failed to read {} ({e})",
            manifest_path.display()
        )
    })?;
    let manifest: PackageManifest = serde_json::from_str(&raw).map_err(|e| {
        format!(
            "LOCAL_PLUGIN_INVALID_JSON: {} ({e})",
            manifest_path.display()
        )
    })?;
    let name = manifest
        .name
        .as_deref()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .ok_or_else(|| {
            "LOCAL_PLUGIN_NO_NAME: package.json is missing a non-empty name".to_string()
        })?
        .to_string();
    let patch = manifest
        .dsh
        .as_ref()
        .and_then(|dsh| dsh.bundle.as_ref())
        .and_then(|bundle| bundle.patch.as_deref())
        .map(str::trim)
        .filter(|patch| !patch.is_empty())
        .ok_or_else(|| {
            "LOCAL_PLUGIN_NO_BUNDLE_PATCH: package.json must declare dsh.bundle.patch; without it dsh plugin add installs a plain dependency and the plugin will not load".to_string()
        })?
        .to_string();
    let patch_path = resolve_patch_path(dir, &patch);
    if !patch_path.is_file() {
        return Err(format!(
            "LOCAL_PLUGIN_PATCH_MISSING: dsh.bundle.patch points to {}, which is not a file",
            patch_path.display()
        ));
    }
    Ok(LocalPluginInspect {
        name,
        version: manifest.version,
        description: manifest.description,
        patch,
    })
}

fn resolve_patch_path(dir: &Path, patch: &str) -> PathBuf {
    let candidate = Path::new(patch);
    if candidate.is_absolute() {
        candidate.to_path_buf()
    } else {
        dir.join(candidate)
    }
}

fn link_spec(dir: &Path) -> String {
    format!("link:{}", dir.display())
}

fn emit_log(window: &WebviewWindow, line: impl Into<String>) {
    let _ = window.emit(
        PREINSTALL_LOG_EVENT,
        PreinstallLogPayload { line: line.into() },
    );
}

fn fail_install(
    app_handle: &AppHandle,
    name: &str,
    exit_code: i32,
    last_output: &str,
    window: &WebviewWindow,
) -> Result<LocalPluginInstallResult, String> {
    log::error!("dsh plugin install failed with exit code {exit_code} for local plugin {name}");
    let network_error = network_error_hint(last_output).is_some()
        || (exit_code == 3 && last_output.trim().is_empty());
    let hint = git_transport_hint(last_output);
    let network_hint = network_error.then_some(
        "NETWORK_ERROR: plugin registry request failed; check network or proxy settings and retry.",
    );
    let message = if network_error {
        network_hint.unwrap_or_default().to_string()
    } else {
        pick_error_message(last_output, hint)
    };
    if let Err(e) = errors::record(app_handle, name, "install", &message) {
        log::warn!("failed to record plugin error for {name}: {e}");
    }
    if let Some(network_hint) = network_hint {
        emit_log(window, format!("[network] {network_hint}"));
        return Err(network_hint.to_string());
    }
    if let Some(hint) = hint {
        emit_log(window, format!("[pnpm] {hint}"));
        return Err(format!(
            "PREINSTALL_FAILED: dsh plugin exited with code {exit_code} ({hint})"
        ));
    }
    let detail = pick_error_message(last_output, None);
    if !detail.is_empty() {
        log::error!("dsh plugin install diagnostic: {detail}");
    }
    Err(format!(
        "PREINSTALL_FAILED: dsh plugin exited with code {exit_code}{}",
        diagnostic_suffix(&detail)
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_plugin(label: &str) -> PathBuf {
        let root =
            std::env::temp_dir().join(format!("dsh-local-plugin-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("create temp plugin dir");
        root
    }

    fn write_plugin(dir: &Path, name: &str, patch: &str, extra_dsh: &str) {
        fs::write(
            dir.join("package.json"),
            format!(
                r#"{{"name":"{name}","version":"0.1.0","description":"demo","dsh":{{"bundle":{{"patch":"{patch}"}}{extra_dsh}}}}}"#
            ),
        )
        .unwrap();
        fs::write(dir.join("cordis.patch.yml"), "$version: 1\n").unwrap();
    }

    #[test]
    fn inspect_accepts_bundle_patch_and_existing_file() {
        let dir = temp_plugin("ok");
        write_plugin(&dir, "demo-slot-tags", "./cordis.patch.yml", "");
        let info = inspect(&dir).unwrap();
        assert_eq!(info.name, "demo-slot-tags");
        assert_eq!(info.version, "0.1.0");
        assert_eq!(info.patch, "./cordis.patch.yml");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn inspect_rejects_plain_dependency_without_dsh_bundle() {
        let dir = temp_plugin("plain");
        fs::write(
            dir.join("package.json"),
            r#"{"name":"just-a-lib","version":"1.0.0"}"#,
        )
        .unwrap();
        let err = inspect(&dir).unwrap_err();
        assert!(err.starts_with("LOCAL_PLUGIN_NO_BUNDLE_PATCH"), "{err}");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn inspect_rejects_missing_patch_file() {
        let dir = temp_plugin("missing-patch");
        fs::write(
            dir.join("package.json"),
            r#"{"name":"demo","version":"1.0.0","dsh":{"bundle":{"patch":"./cordis.patch.yml"}}}"#,
        )
        .unwrap();
        let err = inspect(&dir).unwrap_err();
        assert!(err.starts_with("LOCAL_PLUGIN_PATCH_MISSING"), "{err}");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn inspect_rejects_missing_name() {
        let dir = temp_plugin("no-name");
        fs::write(
            dir.join("package.json"),
            r#"{"version":"1.0.0","dsh":{"bundle":{"patch":"./cordis.patch.yml"}}}"#,
        )
        .unwrap();
        fs::write(dir.join("cordis.patch.yml"), "$version: 1\n").unwrap();
        let err = inspect(&dir).unwrap_err();
        assert!(err.starts_with("LOCAL_PLUGIN_NO_NAME"), "{err}");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn link_spec_uses_link_protocol() {
        let spec = link_spec(Path::new("/tmp/demo-plugin"));
        assert!(spec.starts_with("link:"), "{spec}");
        assert!(spec.contains("demo-plugin"), "{spec}");
    }
}
