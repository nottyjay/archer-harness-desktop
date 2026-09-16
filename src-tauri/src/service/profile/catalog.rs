use serde_yaml::{Mapping, Value};
use std::fs;
use std::io::ErrorKind;
use std::path::Path;

/// 档案 catalog 条目不能再写 `catalog:`：那是给 package.json 用的协议。
/// pnpm 会报 `ERR_PNPM_CATALOG_ENTRY_INVALID_RECURSIVE_DEFINITION`，任何
/// `dsh plugin add`（含内置插件自愈）都会在档案里直接失败。
pub(super) fn heal_recursive_catalog_entries(profile: &Path) -> Result<Vec<String>, String> {
    let path = profile.join("pnpm-workspace.yaml");
    let existing = match fs::read_to_string(&path) {
        Ok(content) => content,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("PROFILE_WORKSPACE_READ: {error}")),
    };
    let mut document: Value = serde_yaml::from_str(&existing)
        .map_err(|e| format!("PROFILE_WORKSPACE_INVALID_YAML: {e}"))?;
    let mapping = document.as_mapping_mut().ok_or_else(|| {
        "PROFILE_WORKSPACE_NOT_MAP: pnpm-workspace.yaml must be a mapping".to_string()
    })?;
    let lock = read_lockfile(profile);
    let mut healed = Vec::new();
    rewrite_catalog_map(
        mapping.get_mut("catalog").and_then(Value::as_mapping_mut),
        profile,
        lock.as_ref(),
        &mut healed,
    );
    if let Some(catalogs) = mapping.get_mut("catalogs").and_then(Value::as_mapping_mut) {
        for catalog in catalogs.values_mut() {
            rewrite_catalog_map(
                catalog.as_mapping_mut(),
                profile,
                lock.as_ref(),
                &mut healed,
            );
        }
    }
    if healed.is_empty() {
        return Ok(healed);
    }
    let rendered =
        serde_yaml::to_string(&document).map_err(|e| format!("PROFILE_WORKSPACE_RENDER: {e}"))?;
    fs::write(&path, rendered).map_err(|e| format!("PROFILE_WORKSPACE_WRITE: {e}"))?;
    log::info!(
        "PROFILE_CATALOG_HEALED: rewrote recursive catalog: entries {:?}",
        healed
    );
    Ok(healed)
}

fn rewrite_catalog_map(
    catalog: Option<&mut Mapping>,
    profile: &Path,
    lock: Option<&Value>,
    healed: &mut Vec<String>,
) {
    let Some(catalog) = catalog else {
        return;
    };
    for (key, value) in catalog.iter_mut() {
        let Some(name) = key.as_str() else {
            continue;
        };
        if !is_recursive_catalog_value(value) {
            continue;
        }
        let Some(version) = resolve_installed_version(profile, lock, name) else {
            log::warn!(
                "PROFILE_CATALOG_RECURSIVE: {name} is catalog: with no lockfile/node_modules version; skipped"
            );
            continue;
        };
        *value = Value::String(version);
        healed.push(name.to_string());
    }
}

fn is_catalog_protocol(spec: &str) -> bool {
    spec.trim().starts_with("catalog:")
}

/// `catalog:` 字符串，或 YAML 把未加引号的 `catalog:` 解析成 `{catalog: null}`。
fn is_recursive_catalog_value(value: &Value) -> bool {
    if let Some(spec) = value.as_str() {
        return is_catalog_protocol(spec);
    }
    let Some(map) = value.as_mapping() else {
        return false;
    };
    map.len() == 1 && map.keys().any(|key| key.as_str() == Some("catalog"))
}

fn read_lockfile(profile: &Path) -> Option<Value> {
    let raw = fs::read_to_string(profile.join("pnpm-lock.yaml")).ok()?;
    serde_yaml::from_str(&raw).ok()
}

fn resolve_installed_version(profile: &Path, lock: Option<&Value>, name: &str) -> Option<String> {
    if let Some(lock) = lock {
        if let Some(version) = lockfile_catalog_version(lock, name) {
            return Some(version);
        }
        if let Some(version) = lockfile_importer_version(lock, name) {
            return Some(version);
        }
    }
    node_modules_version(profile, name)
}

fn lockfile_catalog_version(lock: &Value, name: &str) -> Option<String> {
    let catalogs = lock.get("catalogs")?.as_mapping()?;
    for catalog in catalogs.values() {
        let version = catalog.get(name)?.get("version")?.as_str()?;
        if usable_version(version) {
            return Some(version.to_string());
        }
    }
    None
}

fn lockfile_importer_version(lock: &Value, name: &str) -> Option<String> {
    let version = lock
        .get("importers")?
        .get(".")?
        .get("dependencies")?
        .get(name)?
        .get("version")?
        .as_str()?;
    usable_version(version).then(|| version.to_string())
}

fn usable_version(version: &str) -> bool {
    let version = version.trim();
    !version.is_empty()
        && !is_catalog_protocol(version)
        && !version.starts_with("link:")
        && !version.starts_with("file:")
        && !version.starts_with("workspace:")
}

fn node_modules_version(profile: &Path, name: &str) -> Option<String> {
    let raw =
        fs::read_to_string(profile.join("node_modules").join(name).join("package.json")).ok()?;
    let manifest: serde_json::Value = serde_json::from_str(&raw).ok()?;
    let version = manifest.get("version")?.as_str()?.trim();
    usable_version(version).then(|| version.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn temp_profile(label: &str) -> PathBuf {
        let root =
            std::env::temp_dir().join(format!("dsh-catalog-heal-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("create temp profile");
        root
    }

    #[test]
    fn heal_rewrites_recursive_default_catalog_from_lockfile() {
        let profile = temp_profile("lock");
        fs::write(
            profile.join("pnpm-workspace.yaml"),
            "packages:\n  - .\ncatalog:\n  dsh-better-sidebar: 'catalog:'\n  dshmarket: ^1.47.0\n",
        )
        .unwrap();
        fs::write(
            profile.join("pnpm-lock.yaml"),
            "lockfileVersion: '9.0'\ncatalogs:\n  default:\n    dsh-better-sidebar:\n      specifier: 'catalog:'\n      version: 0.19.1\n",
        )
        .unwrap();
        let healed = heal_recursive_catalog_entries(&profile).unwrap();
        assert_eq!(healed, vec!["dsh-better-sidebar"]);
        let yaml = fs::read_to_string(profile.join("pnpm-workspace.yaml")).unwrap();
        let doc: Value = serde_yaml::from_str(&yaml).unwrap();
        assert_eq!(
            doc["catalog"]["dsh-better-sidebar"].as_str(),
            Some("0.19.1")
        );
        assert_eq!(doc["catalog"]["dshmarket"].as_str(), Some("^1.47.0"));
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn heal_falls_back_to_node_modules_version() {
        let profile = temp_profile("nm");
        fs::write(
            profile.join("pnpm-workspace.yaml"),
            "catalog:\n  dsh-rewind-plugin: 'catalog:'\n",
        )
        .unwrap();
        let pkg = profile.join("node_modules").join("dsh-rewind-plugin");
        fs::create_dir_all(&pkg).unwrap();
        fs::write(
            pkg.join("package.json"),
            r#"{"name":"dsh-rewind-plugin","version":"0.12.2"}"#,
        )
        .unwrap();
        let healed = heal_recursive_catalog_entries(&profile).unwrap();
        assert_eq!(healed, vec!["dsh-rewind-plugin"]);
        let yaml = fs::read_to_string(profile.join("pnpm-workspace.yaml")).unwrap();
        let doc: Value = serde_yaml::from_str(&yaml).unwrap();
        assert_eq!(doc["catalog"]["dsh-rewind-plugin"].as_str(), Some("0.12.2"));
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn heal_rewrites_unquoted_catalog_nested_mapping() {
        let profile = temp_profile("nested");
        fs::write(
            profile.join("pnpm-workspace.yaml"),
            "catalog:\n  dshmarket:\n    catalog: null\n",
        )
        .unwrap();
        fs::write(
            profile.join("pnpm-lock.yaml"),
            "lockfileVersion: '9.0'\ncatalogs:\n  default:\n    dshmarket:\n      specifier: 'catalog:'\n      version: 1.47.0\n",
        )
        .unwrap();
        let healed = heal_recursive_catalog_entries(&profile).unwrap();
        assert_eq!(healed, vec!["dshmarket"]);
        let yaml = fs::read_to_string(profile.join("pnpm-workspace.yaml")).unwrap();
        let doc: Value = serde_yaml::from_str(&yaml).unwrap();
        assert_eq!(doc["catalog"]["dshmarket"].as_str(), Some("1.47.0"));
        let _ = fs::remove_dir_all(&profile);
    }

    #[test]
    fn heal_is_noop_for_healthy_catalog_and_missing_workspace() {
        let profile = temp_profile("noop");
        fs::write(
            profile.join("pnpm-workspace.yaml"),
            "catalog:\n  dsh-better-sidebar: ^0.19.1\n",
        )
        .unwrap();
        assert!(heal_recursive_catalog_entries(&profile).unwrap().is_empty());
        let missing = profile.join("absent");
        fs::create_dir_all(&missing).unwrap();
        assert!(heal_recursive_catalog_entries(&missing).unwrap().is_empty());
        let _ = fs::remove_dir_all(&profile);
    }
}
