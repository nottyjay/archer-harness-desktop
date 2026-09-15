# dsh-tauri-panel 协议

`dsh-tauri-panel` 客户端插件体（browser half）通过槽位与反射服务向其他客户端插件
暴露面板能力。本文件是 `panel.protocol` 的完整契约（代码注释多处引用）。

> **接入建议（0.1.5-rc.1 起）**：优先用 `panel.protocol.registerPanel(entry)`
> 一次性注册面板——宿主按核心版本择路（新核心 = 官方 `sidebar.panellist` + `main`
> 全局面板，旧核心 = 私有槽 + 会话区替换）。官方面板协议的直接用法见第 6 节。
> `ActionItem` + `renderPanelContent` 保留为兼容路径。

## 1. 服务面：`panel.protocol`

宿主在 `apply()` 期间经 `ctx.reflect.provide('panel.protocol', api)` 同步发布
（早于兄弟 effect，第三方在 apply 阶段即可取用）。

```ts
interface PanelProtocol {
  // —— 推荐入口（0.1.5-rc.1 起）——
  registerPanel?: (entry: PanelRegistration) => () => void

  // —— 基础（自 0.1.1-rc.2 起，稳定）——
  ActionItem: (props: PanelActionItemProps) => ReactElement
  renderPanelContent: (spec: PanelContentSpec) => void
  closePanelContent: () => void

  // —— 可选能力（0.1.2-alpha 线起；老版本协议对象无这些字段）——
  setPanelWidth?: (px: number) => void
  resetPanelWidth?: () => void
  getPanelWidth?: () => number | null
  openDetails?: () => void
  closeDetails?: () => void
  openRightPanel?: (track: boolean, fullscreen: boolean) => void
  closeRightPanel?: () => void
}
```

### 1.0 `registerPanel`（推荐入口）

```ts
interface PanelRegistration {
  id: string // 面板唯一标识；同时是 main 槽的 key
  label: string | (() => string) // thunk 读时求值 → 跟随语言，无需重新注册
  render: ComponentType<{ t?: Translate }> // 面板本体
  locale?: string // 面板文案 NS（声明后框架合成 t seat）
  icon?: ReactElement // 条目图标
  order?: number // 清单排序位，升序
}
```

宿主按核心能力择路，**消费方不需要感知核心版本**：

| 核心 | 宿主行为 |
| --- | --- |
| ≥ `0.1.5-rc.1` | 代注册官方 `sidebar.panellist`（图标行）+ `main`（内容）→ 该面板成为**官方全局面板**：`ctx.layout.selectPanel(id)` 可选中、选中态经 `usePanelInfo` 统一可读，与官方/第三方按官方协议注册者同权 |
| ≤ `0.1.2-rc.1` | 回退：注册私有 `sidebar.panel.action` 条目 + 点击切「会话区替换」（`ActionItem` + `renderPanelContent` 的等价形态） |

返回注销句柄；注销后 `main` 条目消失，布局自己的 `retainMainPanels` 会把选中态
复位到会话。

**就绪门槛**：`panel.protocol` 在宿主 apply 阶段同步发布，但客户端加载器不保证
插件顺序。消费方应在 `ctx.slots.inject('sidebar.panel.action', …)` 的回调里取协议
（该私有槽由宿主侧栏条目声明，是最确定的「宿主已就绪」信号），或退而用 50ms
轮询直到 `protocol.registerPanel` 出现。

### 1.1 基础方法

| 方法 | 语义 |
| --- | --- |
| `ActionItem(props)` | 面板区条目组件：样式/折叠态/active 态全由宿主承担，子插件只填 `id` / `icon` / `onClick` / `children` |
| `renderPanelContent(spec)` | 切换面板内容：未替换则打开 `spec.render`，已替换则关闭恢复官方会话界面（toggle 语义）；再调同 `id` → dispose 句柄 → 官方恢复 |
| `closePanelContent()` | 显式恢复官方会话界面（同时把官方全局面板选中的方向也归还给会话）；面板内需要跳转到会话的动作用它 |

面板内容的承载随核心版本变化（宿主按 `ctx.layout.selectPanel` 能力自动择路）：

| 核心 | 承载方式 |
| --- | --- |
| ≤ `0.1.2-rc.1` | `conversation`（`single`）priority -1 shadow；或 `main` keyed 槽的 `conversation` cell |
| ≥ `0.1.5-rc.1` | `main` keyed 槽的 **`spec.id` cell**（priority 0）+ `ctx.layout.selectPanel(spec.id)`；与官方全局面板共用同一选中态 |

> 0.1.5-rc.1 起布局改为 `renderSlot('main', {}, { entryKey: activePanelId ?? 'conversation' })`，
> 官方会话条目注册在 `main` 槽的 `conversation` cell，旧的 `conversation` 槽
> 已不复存在。消费方无需感知该差异——`registerPanel` / `renderPanelContent`
> 仍是唯一入口。

`PanelContentSpec`：

```ts
interface PanelContentSpec {
  id: string // 唯一标识；active 态以它匹配 ActionItem
  render: ComponentType<{ t?: (key: string) => string }>
  locale?: string // 文案 NS，默认宿主 'panel'
  side?: 'conversation' | 'details' // 可选（预留）：承载侧；当前仅 conversation 生效
}
```

### 1.2 可选方法（「先探测后调用」约定）

所有可选字段**老版本协议对象不存在**。消费方一律用可选链探测调用，绝不断言存在：

```ts
protocol.setPanelWidth?.(720)
protocol.resetPanelWidth?.()
protocol.openRightPanel?.(true, false)
```

| 方法 | 语义 | 能力来源 |
| --- | --- | --- |
| `setPanelWidth(px)` | 程序化设置内容宽度（clamp 进契约范围 `[640, column-176]` 并持久化） | 宽度控制器（方案 A） |
| `resetPanelWidth()` | 清除宽度偏好，恢复自适应宽度 | 同上 |
| `getPanelWidth()` | 当前内容宽度（含偏好）；无面板挂载时返回偏好或 `null` | 同上 |
| `openDetails()` | 透传 `ctx.layout.openDetails()`：打开右侧 details 列（**仅 ≤0.1.2-rc.1 核心**） | 宿主按 `ctx.layout` 能力探测提供 |
| `closeDetails()` | 透传 `ctx.layout.closeDetails()`（同上） | 同上 |
| `openRightPanel(track, fullscreen)` | 透传 `ctx.layout.openRightbar(track, fullscreen)`：**报告式**——告诉布局右侧栏占不占 track、是否全屏覆盖（**≥0.1.5-rc.1**） | 同上 |
| `closeRightPanel()` | 透传 `ctx.layout.closeRightbar()`：报告右侧栏隐藏 | 同上 |

> `details` 单槽在 ≥0.1.5-rc.1 已被 `rightbar` 取代，`openDetails` / `closeDetails`
> 在该核心上**不存在**（能力探测自然降级）。新代码请用 `openRightPanel` /
> `closeRightPanel`，注意它是**报告式**而非开关式：占用方报告自己的表现，布局据此
> 决定是否让出 track。

## 2. 槽面：`sidebar.panel.action`（私有 / 兼容）

面板区功能项经 `sidebar.panel.action` 槽注册（`list` / `root`，由 `dsh-tauri-panel`
条目 children 声明，**非官方槽**）。0.1.5-rc.1 起官方提供等价的
`sidebar.panellist`（见第 6 节）；本槽保留给旧核心宿主与直接调 `ActionItem` 的
存量第三方插件，新代码请优先 `registerPanel` 或官方 `sidebar.panellist`。

```tsx
// 等待宿主就绪（缺失时降级：不注册条目，旧核心/宿主未装）
ctx.slots.inject('sidebar.panel.action', () => {
  const protocol = ctx.reflect.get('panel.protocol') as PanelProtocol | undefined
  if (!protocol)
    return () => {}

  const icon = undefined
  const label = '我的面板'
  return ctx.slots.register(
    {
      name: 'sidebar.panel.action',
      id: PLUGIN_ID,
      order: 10,
      locale: LOCALE_NAMESPACE,
      inject: () => ({ protocol }),
    } as never,
    props => <props.protocol.ActionItem id={PANEL_ID} icon={icon} onClick={() => { /* 打开内容区替换 */ }}>{label}</props.protocol.ActionItem>,
  )
})
```

条目典型点击行为：调 `renderPanelContent({ id, render, locale })` 打开自己的内容区替换。

> 该槽的条目由克隆侧栏渲染；`ActionItem` 的 active 态来自宿主自己的
> `panelViewStore`（会话区替换状态），与官方 `usePanelInfo` 是两条独立的选中态源。

## 3. 内容宽度协议（方案 A，CSS 变量 + localStorage）

面板内容列宽度与官方对话宽度**共用同一契约**，面板自给自足发布，不依赖官方根元素：

| 键 | 类型 | 说明 |
| --- | --- | --- |
| `localStorage['dsh.conversation.contentWidth']` | `number`（px） | 拖拽宽度偏好；缺失/损坏 = 无偏好（自适应） |
| `--dsh-conversation-column-width` | `px` | 列宽（ResizeObserver 发布） |
| `--dsh-chat-user-width` | `px` | 拖拽偏好（拖动中实时写入；无偏好时 CSS 回退自适应） |
| `--dsh-chat-content-width` | `px` | 内容列实际宽度（`var(--dsh-chat-user-width, clamp(680px, calc(var(--dsh-conversation-column-width, 0px) * .64), 920px))`） |
| `--dsh-width-handle-pointer-y` | `px` | 手柄 hover 发光条跟随指针的 Y |

约束：内容宽 `[640, column-176]`（两侧各留 88px 放手柄）；无偏好自适应
`clamp(680px, column * .64, 920px)`。

任何插件可读写这些变量实现一致的宽度体验；偏好互操作是有意产品一致行为。
`resetPanelWidth()` 可一键清除。

## 4. 降级与兼容

> **版本门槛（已核实）**：`0.1.5-rc.1` 与 `0.1.5-rc.2` 在本协议相关能力上**完全一致**——
> 侧栏壳声明的子槽键集（`brand.mark` / `brand.name` / `workspaces` / `settings` /
> `footer.action` / **`panellist`**）、渲染侧（`PanelRow` / `panelList` / `usePanelInfo` /
> `entriesOfSlot`）、布局顶层槽（`sidebar` / `main` / `rightbar` / `shell.overlay`）与
> `ctx.layout`（`selectPanel` / `openRightbar` / `closeRightbar`，已无
> `openDetails`/`closeDetails`）逐项相同。因此门槛一律写 **`≥0.1.5-rc.1`**，
> 不要写成 `≥0.1.5-rc.2`。

- **`0.1.5-rc.x` ↔ alpha 双版本**：全部新增为「可选字段 / 能力探测 / 自实现镜像」，
  既有方法（`ActionItem` / `renderPanelContent` / `closePanelContent`）与消费方零破坏；
- **面板内容承载**（宿主按 `ctx.layout.selectPanel` 能力自动择路）：
  - `≥ 0.1.5-rc.1`：`main` keyed 槽的 **`spec.id` cell**（priority 0）+
    `ctx.layout.selectPanel(spec.id)`——与官方全局面板共用同一选中态；
  - `≤ 0.1.2-rc.1`：`conversation` 单槽 priority -1 shadow（`PANEL_VIEW_SEAT_TARGETS`
    里的 `main` 候选在该核心上槽未声明，只是幂等的保险丝）。
  旧核心分支下只注册旧槽会导致 inject 回调永不执行 → 面板内容区不替换，
  只剩侧栏条目选中样式；
- **官方全局面板行**：`sidebar.panellist` 由**被 shadow 的官方 `sidebar` 条目**声明
  （与 `sidebar.workspaces` / `sidebar.settings` 同一张 children 表），克隆侧栏经
  投影服务（`service/panel-list.ts`）读取并渲染。旧核心（≤0.1.2-rc.1）的 slots
  服务没有 `entriesOfSlot` / `subscribe`，投影恒为空表 → 清单整块不渲染；
- **右侧栏**：`details` 单槽与 `ctx.layout.openDetails/closeDetails` 已被 `rightbar`
  与 `openRightbar/closeRightbar` 取代（`≥0.1.5-rc.1`）。宿主按实际方法能力探测后
  提供 `openDetails`/`closeDetails`（旧核心）或 `openRightPanel`/`closeRightPanel`
  （新核心），两者语义不同（开关式 vs 报告式）；
- **旧 WebView**（无 ResizeObserver / PointerEvent / rAF）：`supported=false`，
  手柄不渲染、宽度固定（`--dsh-chat-content-width` 回退 `780px`），仅 console.warn 一次；
- **renderer 补丁缺失**：`<SlotOutlet>` 为 `undefined` → 克隆侧栏不注册
  （官方侧栏原样工作）。官方侧栏自己会渲染 `sidebar.panellist`，因此经
  `registerPanel` 注册的面板仍然可用；只有私有 `sidebar.panel.action` 协议路径
  （`ActionItem` + `renderPanelContent`）在此时没有入口。

## 5. 纯 Web 插件的 DOM 兼容锚点（`PANEL_SIDEBAR_COMPAT_CLASS`）

桌面端以 `priority: -1` 整槽替换官方 `ui-sidebar`，官方 `SidebarRoot`（含
`logoRow` / `newSession` 等 CSS module camelCase class）不再渲染。纯 Web 生态插件
（dsh-web 的 `dsh-task-board` / `dsh-ssh` 等）**不接入**本协议的
`sidebar.panel.action` 槽，而是按官方 class 的 camelCase 子串做纯 DOM 注入：

- `[class*="sidebarCol"]`（官方 layout 列；桌面仍在）定位侧栏列；
- 列内 `[class*="logoRow"]` 元素的 `parentElement` 作为注入 root；
- root 内 `button[class*="newSession"]` 作为「新会话块」定位；
- 入口行插入该块与 workspace 浏览器之间（`closest('[class*="logoRow"]')`
  命中块 → 块是 root 直接子级 → 插到块之后）。

克隆侧栏 class 为 kebab 命名（`dshp-panel__logo-row` 等），与 camelCase 子串
不匹配 → 这类插件的入口行永不挂载（静默，仅 console.error）。为此克隆 DOM 在
**语义等价**元素上携带带官方 camelCase 子串的 token class（无任何样式）：

| token | 值 | 位置（语义） |
| --- | --- | --- |
| `PANEL_SIDEBAR_COMPAT_CLASS.logoRow` | `dshp-panel-compat-logoRow` | 面板区容器 `dshp-panel__panel-area`（充当「新会话所在块」） |
| `PANEL_SIDEBAR_COMPAT_CLASS.newSession` | `dshp-panel-compat-newSession` | 面板区内新会话菜单项（`dshp-panel__new-session`） |

效果：注入行落入 panel-area（新会话 + 官方全局面板行 + 第三方条目）与 region-area
（workspace 浏览器）之间，与官方侧栏语义等价。**panel-area 内部顺序固定为
「新会话 → 官方 `sidebar.panellist` 行（`<nav class="dshp-panel__panel-list">`）→
私有 `sidebar.panel.action` 条目」**；两类面板入口排序位（`sidebar.panellist` 的
`order` / `sidebar.panel.action` 的 `order`）各自独立，**不跨协议排序**。

`registerPanel` / 官方 `sidebar.panellist` 是推荐接入方式，DOM 锚点仅为无法改造的
纯 Web 插件提供回退。未来若克隆侧栏结构调整，须保持 panel-area 为 root 直接子级
且 newSession token 位于 logoRow token 容器内（`closest` 链依赖此几何）。

## 6. 官方全局面板协议（`sidebar.panellist` + `main`，≥0.1.5-rc.1）

### 6.1 契约

官方侧栏壳声明 `sidebar.panellist`（`list` / `root`）作为全局面板入口清单；
承载槽是布局声明的 `main`（`keyed` / `root`，`conversation` 为保留 key）。

```ts
// list 槽：注册选项
interface SidebarPanelListOptions {
  id: string // 必填；同时是 main 槽的 key
  order?: number // 升序排序位，默认 0
  label?: string | (() => string) // thunk 读时求值（上游 resolveSlotLabel）
}

// 图标组件 ownerProps
interface SidebarPanelIconOwnerProps {
  size: number // 请求边长：wide 16 / 折叠 rail 18
  active: boolean // 该面板是否在中间列被选中
}
```

```tsx
// 直接接官方协议（不经过 panel.protocol）
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
  { name: 'sidebar.panellist', id: 'my-entry', order: 100, label: () => t('myEntry') },
  ({ size, active }) => <MyIcon size={size} active={active} />,
))
ctx.slots.inject('main', () => ctx.slots.register(
  { name: 'main', key: 'my-entry' },
  MyPanel,
))
// 选中：
ctx.layout.selectPanel('my-entry') // null = 回到会话
```

### 6.2 与 `panel.protocol` 的关系

| | `panel.protocol.registerPanel` | 直接接官方协议 |
| --- | --- | --- |
| 核心兼容 | 宿主自动择路（新核心官方 / 旧核心私有槽） | 仅 ≥0.1.5-rc.1 |
| 注册者 | 宿主（`registrant` = 面板 id） | 插件自己 |
| 选中态 | 官方 `panelInfo.activePanelId` | 同 |
| 适合 | 需要同时支持旧核心的插件 | 只面向新核心的插件 |

两者共用同一套选中态，可以安全混用：宿主代注册的面板与官方/第三方直接注册的
面板在 `sidebar.panellist` 清单里按 `order` 一起排序，`ctx.layout.selectPanel`
对它们一视同仁。

### 6.3 已知约束

- `ctx.layout.selectPanel(id)` 对**未注册的 `main` key 会 throw**（且不改变当前
  选中）。宿主侧自查见 `utils/official-panels.ts`；第三方直接调用时请先确认自己的
  `main` 条目已注册。
- 面板 id 需避开官方保留 key `conversation`。
- `main` 条目是 `root` scope，**不带 Session 绑定**；面板本体自行从
  `useSessions` 取当前会话。
- 选中面板时会话整体卸载（布局按 `entryKey` 只渲染一个 `main` cell）；`selectPanel(null)`
  回到会话且不切换 Session。
