# Development

DeepSeek Harness Desktop is a **Tauri 2 + React 19** app: the UI lives in `src/`, the Rust backend in `src-tauri/`. The repository uses pnpm 10 and the desktop's bundled runtime is Node.js 22.22.0.

## Requirements

| Tool | Version |
| --- | --- |
| Node.js | 22.19+ (CI and bundled runtime: 22.22.0) |
| Rust | 1.77.2+ |
| pnpm | 10.x (`pnpm@10.28.2`) |

Plus the platform toolchain:

- **Windows** — MSVC build tools + WebView2
- **macOS** — Xcode Command Line Tools
- **Linux** — WebKit2GTK

## Commands

```bash
# Run these commands from the harness-desktop repository root.
pnpm install          # install dependencies
pnpm dev              # frontend dev server (Vite)
pnpm dev:plugins      # watch built-in plugins
pnpm typecheck        # frontend TypeScript check
pnpm build:plugins    # build built-in plugin bundles
pnpm tauri dev        # run the desktop app in debug mode
pnpm tauri build         # build the current platform installer
```

Release builds compile `vendor/deepseek-harness` and download the matching
Node.js 22.22.0 distribution automatically. The download is checksum verified
and cached under `.tmp/bundled-runtime`.

Prebuilt payloads can override either automatic step. Generic variables are
fallbacks and target-specific variables take precedence:

```bash
export DSH_BUNDLED_DIR=/path/to/compiled-dsh
export NODE_BUNDLED_DIR=/path/to/node-runtime
pnpm tauri build
```

For different payloads per operating system, use names such as
`DSH_BUNDLED_DIR_WINDOWS_X86_64` and `NODE_BUNDLED_DIR_WINDOWS_X86_64`.
Automatic Harness compilation requires a build host matching the target OS.
Cross builds must provide `DSH_BUNDLED_DIR_<TARGET>` as well as the corresponding
Rust target and native Tauri toolchain.

Backend checks (from `src-tauri/`):

```bash
cargo check
cargo test
```

For Developer ID signing, notarization, and the required GitHub Actions secrets, see [macOS signing and notarization](./spec/MACOS_SIGNING.md).

To add a new built-in (internal) plugin bundled with the app, see [Built-in (Internal) Plugins](./spec/BUILTIN_PLUGINS.md).

## Tips

- Debug mode serves on port **3081**, release builds on **3080** — the two never clash, so you can run an installed copy and a dev build side by side.
- Debug data is isolated from release data: it uses `~/.archer.dev` and `.store.dev.dat`; it does not migrate release data or register a production `dsh` PATH shim.
