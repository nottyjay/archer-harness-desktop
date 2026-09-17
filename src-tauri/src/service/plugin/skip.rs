//! 当前档案「跳过用户插件」启动：从 `dsh.profile.bundles` 临时拿掉用户插件，
//! 不写禁用清单、不切安全档案、不卸载。
//!
//! DSH 是 fail-loud：任意用户插件激活失败会让整棵树拒绝启动。错误页需要一个
//! 可逆逃生口——在当前档案屏蔽用户插件再启动。内置插件与 `@deepseek-ai/*`
//! 永远保留。被拿掉的包名记在 profile sidecar `skipped-user-plugins.json`；
//! 关闭 skip 后加回 bundles（已在 `disabled-plugins.json` 的除外）。

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::disable::{add_to_bundles, load_disabled, remove_from_bundles};
use super::installed::profile_dir;
use super::installed_name;
use super::preset::load_presets;
use super::process;
use super::recovery::is_actionable_plugin_ref;
use super::watch;
use crate::config;

const SIDECAR_FILE: &str = "skipped-user-plugins.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
struct SkippedList {
    #[serde(default)]
    plugins: Vec<String>,
}

fn sidecar_path(profile: &Path) -> PathBuf {
    profile.join(SIDECAR_FILE)
}

fn load_sidecar(profile: &Path) -> Vec<String> {
    let Ok(content) = fs::read_to_string(sidecar_path(profile)) else {
        return Vec::new();
    };
    serde_json::from_str::<SkippedList>(&content)
        .map(|list| list.plugins)
        .or_else(|_| serde_json::from_str::<Vec<String>>(&content))
        .unwrap_or_default()
}

fn save_sidecar(profile: &Path, plugins: &[String]) -> Result<(), String> {
    let path = sidecar_path(profile);
    let json = serde_json::to_string_pretty(&SkippedList {
        plugins: plugins.to_vec(),
    })
    .map_err(|e| format!("SKIP_RENDER_FAILED: {e}"))?;
    fs::write(&path, format!("{json}\n")).map_err(|e| format!("SKIP_WRITE_FAILED: {e}"))
}

fn delete_sidecar(profile: &Path) -> Result<(), String> {
    let path = sidecar_path(profile);
    if !path.exists() {
        return Ok(());
    }
    fs::remove_file(&path).map_err(|e| format!("SKIP_REMOVE_FAILED: {e}"))
}

fn read_manifest(profile: &Path) -> Result<serde_json::Value, String> {
    let content = fs::read_to_string(profile.join("package.json"))
        .map_err(|e| format!("SKIP_READ_MANIFEST: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("SKIP_PARSE_MANIFEST: {e}"))
}

fn write_manifest(profile: &Path, manifest: &serde_json::Value) -> Result<(), String> {
    let rendered =
        serde_json::to_string_pretty(manifest).map_err(|e| format!("SKIP_RENDER_MANIFEST: {e}"))?;
    fs::write(profile.join("package.json"), format!("{rendered}\n"))
        .map_err(|e| format!("SKIP_WRITE_MANIFEST: {e}"))
}

fn bundle_names(manifest: &serde_json::Value) -> Vec<String> {
    manifest
        .get("dsh")
        .and_then(|dsh| dsh.get("profile"))
        .and_then(|profile| profile.get("bundles"))
        .and_then(|bundles| bundles.as_array())
        .map(|bundles| {
            bundles
                .iter()
                .filter_map(|value| value.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

/// 当前 bundles 里应被跳过的用户插件（可卸载、非内置、非核心）。
fn user_plugins_in_bundles(manifest: &serde_json::Value, builtin: &HashSet<String>) -> Vec<String> {
    let mut names: Vec<String> = bundle_names(manifest)
        .into_iter()
        .filter(|name| is_actionable_plugin_ref(name) && !builtin.contains(name))
        .collect();
    names.sort();
    names.dedup();
    names
}

fn merge_unique(existing: Vec<String>, extra: Vec<String>) -> Vec<String> {
    let mut names: Vec<String> = existing;
    names.extend(extra);
    names.sort();
    names.dedup();
    names
}

/// 从 bundles 拿掉用户插件并写入 sidecar。不写 `disabled-plugins.json`。
///
/// 幂等：已 skip 过时保留 sidecar 原名单，不会被空 bundles 冲掉。
/// 核心/内置即使出现在 bundles 也不会进入 sidecar。
pub(crate) fn apply_skip_at(
    profile: &Path,
    builtin: &HashSet<String>,
) -> Result<Vec<String>, String> {
    let mut manifest = read_manifest(profile)?;
    let current = user_plugins_in_bundles(&manifest, builtin);
    let skipped = merge_unique(load_sidecar(profile), current);
    if skipped.is_empty() {
        delete_sidecar(profile)?;
        return Ok(Vec::new());
    }
    for name in &skipped {
        remove_from_bundles(&mut manifest, name);
    }
    write_manifest(profile, &manifest)?;
    save_sidecar(profile, &skipped)?;
    Ok(skipped)
}

/// 把 sidecar 里、且不在禁用清单的包加回 bundles，再删 sidecar。
///
/// 无 sidecar 时 no-op。已禁用的保持禁用。
pub(crate) fn restore_skip_at(profile: &Path) -> Result<Vec<String>, String> {
    let skipped = load_sidecar(profile);
    if skipped.is_empty() {
        delete_sidecar(profile)?;
        return Ok(Vec::new());
    }
    let disabled: HashSet<String> = load_disabled(profile).into_keys().collect();
    let mut restored = Vec::new();
    let mut manifest = read_manifest(profile)?;
    for name in &skipped {
        if disabled.contains(name) {
            continue;
        }
        if add_to_bundles(&mut manifest, name) {
            restored.push(name.clone());
        }
    }
    write_manifest(profile, &manifest)?;
    delete_sidecar(profile)?;
    Ok(restored)
}

fn builtin_plugin_names(app_handle: &AppHandle) -> HashSet<String> {
    load_presets(app_handle)
        .iter()
        .filter(|plugin| plugin.internal)
        .map(|plugin| installed_name(plugin).to_string())
        .collect()
}

/// spawn 前：开关开则 apply，关则 restore。内置清单不可用时拒绝 apply。
///
/// **禁止** `block_on` 拿操作锁：本函数由异步 `launch_harness` 在 tokio worker 上
/// 同步调用，`block_on` 会 panic「Cannot start a runtime from within a runtime」，
/// 前端就会一直停在「正在启动 Harness」。安全模式 purge 同样无锁、只改清单。
pub(crate) fn sync_skip_for_launch(app_handle: &AppHandle) -> Result<(), String> {
    let skip = config::get_store_dat_setting(app_handle).skip_user_plugins;
    let profile = profile_dir(app_handle);
    let result = if skip {
        let builtin = builtin_plugin_names(app_handle);
        if builtin.is_empty() {
            log::warn!(
                "SKIP_USER_PLUGINS_SKIPPED: built-in plugin manifest unavailable, cannot tell user plugins apart"
            );
            Ok(())
        } else {
            let skipped = apply_skip_at(&profile, &builtin)?;
            if skipped.is_empty() {
                log::info!("skip user plugins: no user plugins in bundles");
            } else {
                log::info!(
                    "skip user plugins: shielding {} plugin(s): {skipped:?}",
                    skipped.len()
                );
            }
            Ok(())
        }
    } else {
        let restored = restore_skip_at(&profile)?;
        if !restored.is_empty() {
            log::info!(
                "skip user plugins: restored {} plugin(s) to bundles: {restored:?}",
                restored.len()
            );
        }
        Ok(())
    };
    watch::force_emit(app_handle);
    result
}

/// 持久化开关并同步 sidecar / bundles。调用方随后重启服务。
///
/// 这是同步 Tauri 命令入口，可以 `block_on` 拿操作锁（与 disable/enable 相同）。
pub fn set_skip_user_plugins(app_handle: &AppHandle, enabled: bool) -> Result<(), String> {
    config::update_store_dat_setting(app_handle, |setting| {
        setting.skip_user_plugins = enabled;
    });
    let _guard = tauri::async_runtime::block_on(process::acquire_operation_lock());
    let result = sync_skip_for_launch(app_handle);
    drop(_guard);
    result
}

#[cfg(test)]
mod tests {
    use super::super::disable::{disable_plugin_at, load_disabled};
    use super::*;

    fn build_profile(test_name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "dsh-skip-test-{}-{}",
            test_name,
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let manifest = serde_json::json!({
            "name": "dsh-profile-web",
            "private": true,
            "dependencies": {
                "dsh-better-sidebar": "1.0.0",
                "dshmarket": "2.0.0",
                "dsh-tauri": "1.0.0",
                "@deepseek-ai/dsh-base": "1.0.0"
            },
            "dsh": {
                "profile": {
                    "bundles": [
                        "dsh-better-sidebar",
                        "dshmarket",
                        "dsh-tauri",
                        "@deepseek-ai/dsh-base"
                    ]
                }
            }
        });
        fs::write(
            dir.join("package.json"),
            serde_json::to_string_pretty(&manifest).unwrap(),
        )
        .unwrap();
        dir
    }

    fn read_manifest(profile: &Path) -> serde_json::Value {
        serde_json::from_str(&fs::read_to_string(profile.join("package.json")).unwrap()).unwrap()
    }

    fn bundles(profile: &Path) -> Vec<String> {
        bundle_names(&read_manifest(profile))
    }

    fn builtin() -> HashSet<String> {
        ["dsh-tauri".to_string()].into_iter().collect()
    }

    fn disabled_path_exists(profile: &Path) -> bool {
        profile.join("disabled-plugins.json").exists()
    }

    #[test]
    fn apply_skip_removes_user_plugins_keeps_core_and_builtin() {
        let profile = build_profile("apply-keeps-core");
        let skipped = apply_skip_at(&profile, &builtin()).unwrap();
        assert_eq!(
            skipped,
            vec!["dsh-better-sidebar".to_string(), "dshmarket".to_string()]
        );
        let bundles = bundles(&profile);
        assert!(!bundles.iter().any(|name| name == "dshmarket"));
        assert!(!bundles.iter().any(|name| name == "dsh-better-sidebar"));
        assert!(bundles.iter().any(|name| name == "dsh-tauri"));
        assert!(bundles.iter().any(|name| name == "@deepseek-ai/dsh-base"));
        assert!(!disabled_path_exists(&profile));
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn apply_skip_does_not_write_disabled_list() {
        let profile = build_profile("no-disabled");
        apply_skip_at(&profile, &builtin()).unwrap();
        assert!(load_disabled(&profile).is_empty());
        assert!(!disabled_path_exists(&profile));
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn apply_skip_is_idempotent_and_keeps_sidecar() {
        let profile = build_profile("idempotent");
        apply_skip_at(&profile, &builtin()).unwrap();
        let again = apply_skip_at(&profile, &builtin()).unwrap();
        assert_eq!(
            again,
            vec!["dsh-better-sidebar".to_string(), "dshmarket".to_string()]
        );
        assert_eq!(
            load_sidecar(&profile),
            vec!["dsh-better-sidebar".to_string(), "dshmarket".to_string()]
        );
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn restore_puts_user_plugins_back() {
        let profile = build_profile("restore");
        apply_skip_at(&profile, &builtin()).unwrap();
        let restored = restore_skip_at(&profile).unwrap();
        assert_eq!(
            restored,
            vec!["dsh-better-sidebar".to_string(), "dshmarket".to_string()]
        );
        let bundles = bundles(&profile);
        assert!(bundles.iter().any(|name| name == "dshmarket"));
        assert!(bundles.iter().any(|name| name == "dsh-better-sidebar"));
        assert!(!sidecar_path(&profile).exists());
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn restore_keeps_persistently_disabled_plugins_out() {
        let profile = build_profile("restore-disabled");
        apply_skip_at(&profile, &builtin()).unwrap();
        disable_plugin_at(&profile, "dshmarket").unwrap();
        restore_skip_at(&profile).unwrap();
        let bundles = bundles(&profile);
        assert!(
            !bundles.iter().any(|name| name == "dshmarket"),
            "skip 期间禁用的插件 restore 后不得加回 bundles"
        );
        assert!(bundles.iter().any(|name| name == "dsh-better-sidebar"));
        assert!(load_disabled(&profile).contains_key("dshmarket"));
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn restore_without_sidecar_is_noop() {
        let profile = build_profile("restore-noop");
        let original = bundles(&profile);
        assert!(restore_skip_at(&profile).unwrap().is_empty());
        assert_eq!(bundles(&profile), original);
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn core_and_builtin_never_enter_sidecar() {
        let profile = build_profile("protect");
        apply_skip_at(&profile, &builtin()).unwrap();
        let skipped = load_sidecar(&profile);
        assert!(!skipped.iter().any(|name| name == "dsh-tauri"));
        assert!(!skipped.iter().any(|name| name.starts_with("@deepseek-ai/")));
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn empty_builtin_set_still_protects_core_packages() {
        let profile = build_profile("empty-builtin");
        // 纯函数本身只按 actionable + builtin 过滤；空 builtin 时内置也会被跳过，
        // 这就是 launch 路径在清单不可用时拒绝 apply 的原因。核心包仍受保护。
        let skipped = apply_skip_at(&profile, &HashSet::new()).unwrap();
        assert!(skipped.contains(&"dsh-tauri".to_string()));
        assert!(!skipped.iter().any(|name| name.starts_with("@deepseek-ai/")));
        let bundles = bundles(&profile);
        assert!(bundles.iter().any(|name| name == "@deepseek-ai/dsh-base"));
        let _ = fs::remove_dir_all(&profile);
    }
}
