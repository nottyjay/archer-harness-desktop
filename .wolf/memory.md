---
description: chronological action log per session, consolidated weekly
---
# Memory

> Chronological action log. Hooks and AI append to this file automatically.
> Old sessions are consolidated by the daemon weekly.
| 19:55 | Bundled Node/DSH must execute directly from Tauri resources; AppData seeding is intentionally disallowed. | src-tauri/src/config/runtime.rs, src-tauri/src/bridge/lifecycle.rs | Resource lookup and DSH release self-check bypass added; payload generation remains. | ~600 |
| 20:10 | Build commands select one Tauri target and prune other bundled payload directories before packaging; generic payload env vars have target-specific overrides. | scripts/tauri.mjs, scripts/build-tauri.mjs, scripts/prepare-bundled-runtime.mjs, package.json | Added aggregate and per-platform build entrypoints. | ~500 |
| 20:18 | Build aliases are invoked as `pnpm tauri build:linux` / `build:win` / `build:mac`; the tauri wrapper maps them to target triples. | scripts/tauri.mjs, docs/DEVELOPMENT.md, docs/DEVELOPMENT.zh.md | Corrected command shape requested by user. | ~120 |
| 22:55 | Fixed bundled Harness deployment by adding the CLI package and materializing external workspace links; regenerated icons from Harness Rust assets and completed a macOS app/DMG build with runnable bundled Node 22.22.0 and DSH 0.1.5-rc.1. | scripts/prepare-bundled-runtime.mjs, src-tauri/icons, .wolf/buglog.json, .wolf/STATUS.md | `pnpm tauri build:mac` passed; app contains only darwin-aarch64 runtime resources. | ~1400 |
| 23:00 | Made Harness branding reproducible by storing the built logo, ICNS, and tray template as source assets and updating `pnpm icons` to regenerate from them. | assets/harness-logo.png, assets/harness-icon.icns, assets/harness-tray.png, scripts/rebuild-macos-icon.ts, package.json | Icon regeneration passed and preserves the original macOS and tray binaries. | ~250 |
| 10:00 | Removed startup Node/DSH installation, fixed macOS `darwin-aarch64` resource lookup, completed the Harness workspace peer closure, rebuilt the macOS package, and verified a real launch uses only `.app` resources. | src-tauri/src, scripts/prepare-bundled-runtime.mjs, vendor/deepseek-harness/python/sdk-runtime/package.json | HTTP 200 on port 3080; installed app replaced with the verified build and no AppData runtime files changed. | ~1800 |
