# dsh-tauri-ui

`dsh-tauri-ui` 为 DSH 提供 Tauri 风格的客户端界面扩展。目前包含将设置对话框改造成左侧停靠设置栏的功能。

## 功能

- 在 `sidebar.settings` 注册设置触发器。
- 在 `shell.overlay` 渲染桌面化设置侧边栏。
- 通过稳定的中英文 `aria-label` 选择器修补核心 `轮次导航`（`Turn navigation`），在侧栏缩小/窄栏时仍固定在视口内常驻可见，并保留核心导航项与内部滚动。
- 通过 `settings.section` 展示官方设置分区。
- 设置打开期间持续隐藏并禁用宿主内容列及异步挂载的 Better Sidebar，关闭时精确恢复原状态。
- 提供中英文的返回应用、搜索设置等文案。
- renderer 缺少 `SlotOutlet` 时自动保留官方设置对话框。
- 作为 workspace 共享 UI 面导出 `MenuSelect`、`styles` 与 Gravity UI 图标适配器；其他内置插件统一从 `dsh-tauri-ui/client` 引用，不再复制下拉模式或自绘通用图标。

## 兼容性

设置侧边栏需要 renderer 提供通用 `SlotOutlet`。在旧版核心或缺少 renderer patch 的环境中，插件会安全降级，不会阻塞官方设置功能。
