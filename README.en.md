<p align="center">
  <a href="https://github.com/nottyjay/archer-harness-desktop">
    <img src="public/favicon.svg" width="96" alt="DeepSeek Harness Desktop" />
  </a>
</p>

<h1 align="center">DeepSeek Harness Desktop</h1>

<p align="center">
  Run <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> on your desktop, instantly —<br />
  no Node.js, no pnpm, no Docker. Download, install, go.
</p>

<p align="center">
  <a href="https://github.com/nottyjay/archer-harness-desktop/releases">
    <img src="https://img.shields.io/github/v/release/nottyjay/archer-harness-desktop?style=flat-square&label=release&color=4D6BFE" alt="Release" />
  </a>
  <img src="https://img.shields.io/github/downloads/nottyjay/archer-harness-desktop/total?style=flat-square&label=downloads&color=4D6BFE" alt="Downloads" />
  <img src="https://img.shields.io/github/stars/nottyjay/archer-harness-desktop?style=flat-square&label=stars&color=4D6BFE" alt="Stars" />
  <img src="https://img.shields.io/github/license/nottyjay/archer-harness-desktop?style=flat-square&label=license&color=4D6BFE" alt="MIT License" />
  <img src="https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-black?style=flat-square" alt="Windows | macOS | Linux" />
  <img src="https://img.shields.io/badge/dsh-0.1.5--rc.2-4D6BFE?style=flat-square" alt="dsh 0.1.5-rc.2" />
</p>

<p align="center">
  <samp><strong>English</strong> · <a href="./README.es.md">Español</a> · <a href="https://dshtauri.mintlify.site">Docs</a> · <a href="./README.md">中文</a></samp>
</p>

<p align="center">
 <a href="https://trendshift.io/repositories/151676?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-151676" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/151676/daily?language=Rust" alt="nottyjay%2Farcher-harness-desktop | Trendshift" width="250" height="55"/></a>
</p>

<p align="center">
  <a href="docs/PREVIEW.md">
    <img src="./docs/images/hero-en.png" width="100%" alt="DSH Desktop English promotional banner" />
  </a>
</p>

## Features

- ⚡️ **Zero setup** — The installer contains the matching Node runtime and Harness core, so first launch needs no runtime download or environment changes.
- 📦 **Fixed runtime** — The packaged Harness core is selected at build time for the target platform and is used directly at runtime.
- 🖥️ **Config** — One dialog for Debug / Profiles / Plugins / Core, with bilingual (zh/en) UI labels and dark-mode support.
- 🗂️ **Profile isolation** — Profiles are isolated from each other in the config; plugins, patches, and settings stay independent and do not interfere.
- 🧩 **Plugin management** — The plugin panel manages installed plugins; when something misbehaves it offers upgrade / uninstall entry points plus error details.
- 🎁 **Built-in plugins** — Ships with bundled plugins; more high-quality built-in plugins are coming in the future.
- 🪶 **Native & lightweight** — A Tauri 2 shell (not Electron): smaller installers, lower memory, native windows.
- ⌨️ **CLI integration** — Install automatically registers the `dsh` command, ready in a new terminal; does not overwrite your existing shell config.
- 🧭 **Launch wizard** — On first launch, choose recommended plugins, or re-select them later in config.
- 🚀 **Self-update** — In-app updates; no need to re-download.
- 🐾 **Desktop pets** — Manage Pets and Codex sources with presets that work out of the box (streamed from their upstream asset hosts, no download step), import Codex `.zip` packs, and show activity states from conversations.

## Origins & Acknowledgments

This project originates from [deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop). We honor that desktop project and upstream [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), and thank them for their contributions.

## Presets

Plugins offered in the first-run wizard; select what you need and install on demand:

- [DSH Market](https://github.com/dsh-market/dsh-market) — browse, search, and one-click install community plugins (Recommended)
- [DSH Better Sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) — a VSCode-like right sidebar, isolated per session (Recommended)
- [DSH Rewind](https://github.com/SiriLee/dsh-rewind) — in-window conversation rewind that never forks a new session, plus a lightweight workspace backup that restores files along with the rewind (Recommended)

> The preset list is maintained by the desktop project. To request a new or updated preset, open an issue in [deepseek-harness-desktop](https://github.com/nottyjay/archer-harness-desktop/issues).

## Built-in plugins

First-party plugins bundled with the installer:

- [DSH Tauri](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri) — provides a communication channel with the Tauri 2 shell
- [DSH Tauri UI](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-ui) — provides a custom settings sidebar for the Tauri 2 shell
- [DSH Tauri Worktree](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-worktree) — creates an isolated Git worktree per session, with checkout to a local branch or archive-and-abandon flows
- [DSH Tauri Panel](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-panel) — sidebar shell: compact logo row, a panel area (New Session + third-party panel items via `sidebar.panel.action`), and the `panel.protocol` service
- [DSH Tauri Panel Extension](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-panel-extension) — Skills and MCP management with skill repository import
- [DSH Tauri Panel Scheduler](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-panel-scheduler) — creates daily, interval, weekday, and weekly scheduled tasks; runs them in independent Agent sessions and retains run history
- [DSH Tauri Turn Rewind](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-turnrewind) — records private Git snapshots per Agent turn, shows file-change cards, and safely undoes a turn with conflict protection
- [DSH Tauri Session](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-session) — replaces workspace deletion with archiving and adds an Archived Chats settings page with search, sorting, grouping, project filtering, and unarchive support
- [DSH Better Sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) — bundled VS Code-like right sidebar (explorer / editor / terminal / git / browser)
- [DSH Rewind](https://github.com/SiriLee/dsh-rewind) — bundled in-window conversation rewind that can restore workspace files
- [DSH Tauri Rightclick](https://github.com/nottyjay/archer-harness-desktop/tree/main/packages/dsh-tauri-rightclick) — native-style right-click context menus for sessions, workspaces, conversation text, links, and inputs
- More plugins coming soon...

## Quick Start

Download the installer for your platform from [Releases](https://github.com/nottyjay/archer-harness-desktop/releases), install, and launch.

**macOS (Homebrew):** you can also install it in one command via Homebrew:

```bash
brew install dsh-tauri-desk/desktop/deepseek-harness
```

The installer includes the matching Node runtime and Harness core for its platform, then takes you straight into the harness at `http://127.0.0.1:3080`; the desktop does not check GitHub or download a replacement core at runtime.

**System requirements:** Windows 10+ · macOS 10.15+ · Linux (AppImage / .deb)

> **Linux Wayland note (PikaOS / GNOME Wayland / Ubuntu 22.04+):** AppImage may crash or render black on Wayland due to WebKitGTK; the app auto-fixes the common case. <details><summary>If it still crashes / renders black:</summary><br>**Prefer `.deb`** (verified on PikaOS 4 Wayland), or manually run `WEBKIT_DISABLE_COMPOSITING_MODE=1 WEBKIT_DISABLE_DMABUF_RENDERER=1 GDK_BACKEND=x11 ./AppImage`. If icons do not appear, copy the app's `hicolor` icons to `~/.local/share/icons` and run `update-desktop-database`.<br></details>

## Community

- [Join the Discord community](https://discord.gg/RT9As6Cj8B)

<table>
  <tr>
    <td align="center"><strong>QQ Group</strong><br /><img src="./docs/images/community/qq-qrcode.jpg" width="360" alt="QQ group QR code" /></td>
    <td align="center"><strong>WeChat Group</strong><br /><img src="./docs/images/community/wx-qrcode.png" width="360" alt="WeChat group QR code" /></td>
  </tr>
</table>

## Dev

Want to get involved in development? See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## How It Works

```text
┌──────────────────────────────────────────────┐
│ Tauri WebView (React)                        │
│   setup state machine → progress → iframe    │
│   loads the dsh web UI + sidebar controls    │
└──────────────────────┬───────────────────────┘
                       │ invoke commands + events
┌──────────────────────┴───────────────────────┐
│ Tauri Rust backend                           │
│   service/download  installer + extraction   │
│   service/core      Harness core versions    │
│   service/profile   dsh profile management   │
│   service/plugin    plugin remove / upgrade  │
│   service/cli       dsh command shim + PATH  │
│   service/update    desktop self-update      │
│   service/workflow  dsh process lifecycle    │
│   task              dsh health checks        │
└──────┬───────────────────────────┬───────────┘
       │                           │
  runtime/ (Node.js v22.22.0)   dependencies/dsh/ (prebuilt bundle)
       └─────────────┬─────────────┘
                     ▼
   dsh --profile <profile> --host 127.0.0.1 --port 3080
                     │  DSH_HOME=~/.dsh
                     ▼
        http://127.0.0.1:3080/  ← embedded UI
```

The Harness bundle is compiled as part of the desktop build and distributed inside each platform installer. Runtime startup uses that platform-matched resource directly; it does not query GitHub or download a replacement core.

## Notes

> [!WARNING]
> **Developer preview** — upstream `dsh` is evolving fast with breaking changes; this project tracks it closely.

> [!NOTE]
> **Security** — `dsh` can execute code locally. For learning / research / testing only; run it in a trusted, isolated environment.

## Related

- [deepseek-harness-desktop](https://github.com/dsh-tauri-desk/deepseek-harness-desktop) — the desktop project this app originates from
- [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) — the upstream `dsh` agent platform
- [deepseek-harness-pkg](https://github.com/dsh-tauri-desk/deepseek-harness-pkg) — prebuilt Harness bundles consumed by this app
- [dsh-tauri-plugins](https://github.com/nottyjay/archer-harness-desktop) — development repository for some bundled plugin packages
- [n8n-desktop](https://github.com/tangtao646/n8n-desktop) — reference implementation

### Plugin data sources

Remote assets and upstream catalogs that plugins reference at runtime:

- [qinyre/dsh-plugin-capabilities](https://github.com/qinyre/dsh-plugin-capabilities) — upstream of the Skills / MCP manager, pinned to `3412f8d`
- [anthropics/skills](https://github.com/anthropics/skills) / [vercel-labs/skills](https://github.com/vercel-labs/skills) — source of the packaged `skill-creator` / `find-skills`

### Plugin sub-repositories

Reference repositories cloned under `source/` as plugins need them; most are not committed to this repository:

- [Anionex/dsh-turn-rewind](https://github.com/Anionex/dsh-turn-rewind) / [Willmylife/dsh-rewind](https://github.com/Willmylife/dsh-rewind) — turn snapshots, conflict classification and undo reference
- [a179-sanae/dsh-auto-collapse](https://github.com/a179-sanae/dsh-auto-collapse) / [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream) — optional-capability probing and cross-core compatibility reference

## License

[MIT](./LICENSE) with a [Non-Commercial Condition](./LICENSE.details) © deepseek-harness-desktop contributors
