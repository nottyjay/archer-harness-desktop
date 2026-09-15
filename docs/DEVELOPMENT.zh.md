# 开发

DeepSeek Harness Desktop 是 **Tauri 2 + React 19** 应用：前端位于 `src/`，Rust 后端位于 `src-tauri/`。仓库使用 pnpm 10，桌面端捆绑运行时为 Node.js 22.22.0。

## 环境要求

| 工具 | 版本 |
| --- | --- |
| Node.js | 22.19+（CI 与捆绑运行时：22.22.0） |
| Rust | 1.77.2+ |
| pnpm | 10.x（`pnpm@10.28.2`） |

以及平台编译工具链：

- **Windows** — MSVC 构建工具 + WebView2
- **macOS** — Xcode Command Line Tools
- **Linux** — WebKit2GTK

## 常用命令

```bash
# 以下命令均在 harness-desktop 仓库根目录执行。
pnpm install          # 安装依赖
pnpm dev              # 前端开发服务器（Vite）
pnpm dev:plugins      # 监听内置插件构建
pnpm typecheck        # 前端 TypeScript 检查
pnpm build:plugins    # 构建内置插件 bundle
pnpm tauri dev        # 调试模式运行桌面端
pnpm tauri build         # 依次构建 Linux、Windows、macOS 安装包
pnpm tauri build:linux   # 只构建 Linux x86_64
pnpm tauri build:win     # 只构建 Windows x86_64
pnpm tauri build:mac     # 只构建当前构建机架构的 macOS
```

发布构建会自动编译 `vendor/deepseek-harness`，并下载目标平台对应的 Node.js
22.22.0。下载内容会校验 SHA-256，并缓存在 `.tmp/bundled-runtime`。

也可以用预编译产物覆盖自动步骤。通用环境变量作为回退值，目标专用变量
优先级更高：

```bash
export DSH_BUNDLED_DIR=/path/to/compiled-dsh
export NODE_BUNDLED_DIR=/path/to/node-runtime
pnpm tauri build
```

如果每个平台使用不同资源，可设置例如
`DSH_BUNDLED_DIR_WINDOWS_X86_64` 和 `NODE_BUNDLED_DIR_WINDOWS_X86_64`。
自动编译 Harness 要求构建机系统与目标系统一致。交叉编译时必须提供
`DSH_BUNDLED_DIR_<TARGET>`，并安装对应的 Rust target 和 Tauri 原生编译工具链。

后端检查（在 `src-tauri/` 下执行）：

```bash
cargo check
cargo test
```

macOS 的 Developer ID 签名、公证与 GitHub Actions Secrets 配置见 [macOS 签名与公证](./spec/MACOS_SIGNING.zh.md)。

若要新增一个随安装包分发、内置在应用里的插件，请参阅 [内置插件（Internal Plugins）](./spec/BUILTIN_PLUGINS.zh.md)。

## 小贴士

- 调试模式使用 **3081** 端口，正式版使用 **3080** —— 两者互不冲突，可以同时运行已安装版本与开发构建。
- 调试数据与正式版隔离：使用 `~/.archer.dev` 和 `.store.dev.dat`，不会迁移正式版数据，也不会注册生产版 `dsh` PATH shim。
