---
description: session handoff, regenerate with /handoff when a quest finishes
budget_tokens: 1000
---
# STATUS — deepseek-harness-desktop

> Single source of truth for resuming work. Read this FIRST when starting a session.
> Update this file at the end of every work phase so the next `/clear` resumes in 1 read.
> Last updated: 2026-09-15 10:00 CST

---

## ✅ Done

<!-- Move items here from "🚀 Next phase" when finished. Group by area. -->

- Runtime lookup now prefers bundled resource payloads directly; no AppData copy.
- Added multi-target build wrappers: `pnpm tauri build`, `pnpm tauri build:linux`, `pnpm tauri build:win`, `pnpm tauri build:mac`.
- Vendored DeepSeek Harness `0.1.5-rc.1` and added automatic target-specific Node `22.22.0` plus Harness build/deploy preparation.
- Fixed the deploy closure so `@deepseek-ai/dsh` is included and links to the source checkout are materialized.
- Replaced application and macOS tray icons with the built Harness Rust assets.
- Stored the Harness logo, original ICNS, and tray template under `assets/`; `pnpm icons` now reproduces the replacement without reverting to the old favicon.
- Verified `pnpm tauri build:mac`; it produced a 503 MB app and 111 MB DMG with runnable bundled Node/DSH.
- Removed Node/DSH from the startup installer, mapped Rust `macos` to the packaged `darwin` resource directory, and made missing bundled resources fail immediately instead of downloading.
- Completed a real macOS startup smoke test: the service process runs both Node 22.22.0 and DSH 0.1.5-rc.1 from the `.app` resource directory and serves HTTP 200 on port 3080.
- Fixed the vendored Harness deployment closure by installing workspace peers, adding the two omitted runtime packages, and failing the build when any bundled workspace peer is unresolved.
- Rebuilt the macOS app/DMG at 2026-09-15 09:55 CST and replaced the stale `/Applications/Deepseek Harness Desktop.app` copy with the verified build.

---

## 🚀 Next phase

**Goal:** Validate Linux and Windows installers on matching build hosts or with target-specific prebuilt payload overrides.

### Acceptance criteria
1. `pnpm tauri build:linux` produces a Linux package containing only `linux-x86_64` resources.
2. `pnpm tauri build:win` produces a Windows installer containing only `windows-x86_64` resources.
3. `pnpm tauri build` invokes Linux, Windows, and macOS builds in sequence when the required target toolchains and payloads are available.

### Files to create / edit
| Type | File | Content |
|---|---|---|
| verify | Linux build host | Run `pnpm tauri build:linux` and inspect the package resources. |
| verify | Windows build host | Run `pnpm tauri build:win` and inspect the installer resources and taskbar icon. |

### Closed decisions
- Runtime lookup reads `resources/bundled/<os>-<arch>` directly from the installed application.
- Target builds remove other platform payloads before Tauri bundles resources.
- Harness source is compiled during packaging; prebuilt target directories remain optional CI overrides.

### Open decisions
- Build machines still need Rust targets and native cross-compilation toolchains for non-host platforms.

---

## 📁 Active architecture

- **Stack:** _<frameworks, libraries, runtime>_
- **Key tables / modules:** _<list>_
- **Patterns:** _<conventions enforced project-wide>_

---

## ⚠️ External blockers (don't block coding)

- Apple Developer ID signing/notarization is not configured; the generated macOS app and DMG are suitable for local testing, while external distribution still needs signing credentials.

---

## 🔧 Useful commands

```bash
pnpm tauri build:mac
pnpm tauri build:linux
pnpm tauri build:win
pnpm tauri build
```

---

## 📚 References (read IF needed)

- `.wolf/cerebrum.md` — User Preferences + Do-Not-Repeat + Decision Log
- `.wolf/anatomy.md` — token-efficient file index
- `.wolf/buglog.json` — known bugs + fixes
