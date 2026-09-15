# dsh-tauri-panel

`dsh-tauri-panel` 是 Tauri 桌面端面板能力的扩展入口。当前版本提供稳定的插件包结构、客户端注入点与**内容区宽度拖拽**（方案 A，与 alpha 官方对话宽度协议一致）。

## 能力

- **整槽替换 sidebar**（priority -1 shadow 官方 `ui-sidebar`）：紧凑 logoRow + 面板区（新会话 + 官方全局面板行 + 第三方功能项）+ 官方子槽透传（`<SlotOutlet>`，无 renderer 补丁时整体降级不注册）。
- **官方全局面板入口**（0.1.5-rc.1 起提供）：克隆侧栏渲染官方 `sidebar.panellist` 清单（`components/panel-row.tsx` + `service/panel-list.ts` 投影服务），按官方协议注册的面板因此有完整入口（每行只订阅自己的选中态、`order` 升序、thunk 文案跟随语言）。旧核心 slots 服务无投影能力时清单整块不渲染。
- **面板注册**（推荐）：`panel.protocol.registerPanel(entry)` 一次性注册；宿主按核心择路——新核心代注册官方 `sidebar.panellist` + `main` 全局面板，旧核心回退私有槽 + 会话区替换。
- **内容区替换**：面板内容承载按核心能力择路——`≥0.1.5-rc.1` 注册 `main` 的 `spec.id` cell + `ctx.layout.selectPanel`（与官方全局面板共用选中态）；`≤0.1.2-rc.1` 走 `conversation` 单槽 priority -1 shadow。`panel.protocol` 提供 `ActionItem` / `renderPanelContent` / `closePanelContent` 兼容面。
- **内容宽度拖拽**：内容列左右对称 `data-width-handle` 手柄（pointer capture + rAF 节流 + 外向 2× 位移），偏好持久化 `localStorage['dsh.conversation.contentWidth']`，与官方共用同一 CSS 变量协议（`--dsh-chat-content-width` / `--dsh-chat-user-width` / `--dsh-conversation-column-width`），rc.x / alpha 双版本兼容、自给自足发布。
- **协议可选能力**（方案 C）：`setPanelWidth` / `resetPanelWidth` / `getPanelWidth`；右侧栏按核心能力分别提供 `openDetails` / `closeDetails`（≤`0.1.2-rc.1` 的 details 列）与 `openRightPanel` / `closeRightPanel`（≥`0.1.5-rc.1` 的 rightbar，报告式），消费方 `?.()` 探测调用。

## 面板协议

完整契约见 [`PROTOCOL.md`](./PROTOCOL.md)。快速面：

- **推荐**：`panel.protocol.registerPanel({ id, label, render, icon?, order?, locale? })`
  —— 一次性注册图标 + 内容，宿主按核心版本自动择路（官方全局面板 / 私有槽回退）。
- **兼容**：客户端注册 `sidebar.panel.action` 槽，并经反射服务 `panel.protocol` 获取宿主 API：
  - `ActionItem`：统一的侧栏面板条目。
  - `renderPanelContent(spec)`：切换面板内容与官方会话内容。
  - `closePanelContent()`：显式恢复官方会话内容（含归还官方全局面板选中态）。
  - `setPanelWidth?.(px)` / `resetPanelWidth?.()` / `getPanelWidth?.()`：内容宽度程序化控制。
  - `openDetails?.()` / `closeDetails?.()` / `openRightPanel?.(track, fullscreen)` / `closeRightPanel?.()`：右侧栏（透传 `ctx.layout`，按核心能力探测提供）。

官方 `sidebar.panellist` + `main` 协议也可以直接使用（不再经过本宿主），两种方式
共用同一选中态。细节见 `PROTOCOL.md` 第 6 节。

## 相关包

- [`dsh-tauri-ui`](../dsh-tauri-ui)：通用桌面 UI。
- [`dsh-tauri-panel-placeholder`](../dsh-tauri-panel-placeholder)：占位实现。
- [`dsh-tauri-panel-extension`](../dsh-tauri-panel-extension)：扩展面板（技能 / MCP）。
