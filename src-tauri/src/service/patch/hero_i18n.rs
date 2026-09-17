//! 空态 EmptyHero 标题文案：把上游「探索未至之境 / Into the Unknown」换成 Archer。
//!
//! 标题不是 slot，词典也不能被别的插件覆盖（同 NS 二次 register 会抛错）。
//! `patches/dsh` 只在打包时打到暂存副本，debug 仍读未打补丁的核心。
//! 因此走启动期 [`crate::utils::patch_dsh`]，改活动核心里已构建的
//! `dsh-client-ui-conversation` client bundle，debug 与 release 同一套。

use crate::utils::{patch_dsh, PatchOutcome};

const PATCH_MARKER: &str = "dsh-tauri-desktop: archer hero headline";
const HEADLINE_ZH: &str = "探索未至之境";
const HEADLINE_EN: &str = "Into the Unknown";
const HEADLINE_ARCHER: &str = "Archer";
const CLIENT_JS: &str = "node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js";

fn patch_source(source: &str) -> PatchOutcome {
    if source.contains(PATCH_MARKER) {
        return PatchOutcome::AlreadyPatched;
    }
    if !source.contains(HEADLINE_ZH) && !source.contains(HEADLINE_EN) {
        return PatchOutcome::AnchorMissing;
    }
    let next = source
        .replace(HEADLINE_ZH, HEADLINE_ARCHER)
        .replace(HEADLINE_EN, HEADLINE_ARCHER);
    PatchOutcome::Patched(format!("/* {PATCH_MARKER} */\n{next}"))
}

/// 启动前：EmptyHero 标题换成应用名；锚点缺失则跳过。
pub fn apply(app_handle: &tauri::AppHandle) -> Result<(), String> {
    patch_dsh(app_handle, CLIENT_JS, patch_source)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_both_locale_headlines() {
        let source = "t('hero.headline'); const zh='探索未至之境'; const en=\"Into the Unknown\";";
        let PatchOutcome::Patched(patched) = patch_source(source) else {
            panic!("expected patched source");
        };
        assert!(patched.contains(PATCH_MARKER));
        assert!(patched.contains("'Archer'"));
        assert!(patched.contains("\"Archer\""));
        assert!(!patched.contains(HEADLINE_ZH));
        assert!(!patched.contains(HEADLINE_EN));
    }

    #[test]
    fn patch_is_idempotent() {
        let source = "'探索未至之境'";
        let PatchOutcome::Patched(patched) = patch_source(source) else {
            panic!("expected patched source");
        };
        assert_eq!(patch_source(&patched), PatchOutcome::AlreadyPatched);
    }

    #[test]
    fn skips_unknown_bundle() {
        assert_eq!(
            patch_source("export function apply() {}"),
            PatchOutcome::AnchorMissing
        );
    }
}
