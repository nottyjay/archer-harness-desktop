import type { ExternalStore } from 'dsh-tauri/client'
import type { ComponentType, ReactElement, ReactNode } from 'react'

/** 官方全局面板的选中态快照（layout 的 `panelInfo` root hook 投影）。 */
export interface PanelInfo {
  /** 当前选中的 `main` key；`null` 表示会话（官方 conversation）。 */
  activePanelId: string | null
}

/**
 * 框架注入的标准 prop `usePanelInfo`（ownerProps/standardProps 之外的那一层）。
 * 0.1.5-rc.1 起布局经 `ctx.slots.provideRoot({ hooks: { panelInfo } })` 提供，
 * 由 slot 运行期按 `standardHookPropName('panelInfo')` 合成到所有条目 props 上；
 * 旧核心没有这个 seat，消费方必须可选探测。
 */
export type UsePanelInfo = <S>(selector: (info: PanelInfo) => S) => S

/** `sidebar.panellist` 一趟投影出的行（id / 排序位 / 已解析文案）。 */
export interface PanelListEntry {
  /** 条目 id，同时是 `main` 槽里承载该面板的 key。 */
  id: string
  /** 升序排序位（官方默认 0）。 */
  order: number
  /** 已解析的展示文案（thunk 已求值）。 */
  label: string
}

/** 面板清单的外部 store（`useSyncExternalStore` 安全）。 */
export type PanelListStore = ExternalStore<PanelListEntry[]>

/**
 * 官方全局面板行的 owner props（对齐上游 `SidebarPanelIconOwnerProps`）。
 * 图标组件按 `size` 渲染，按 `active` 决定选中态的视觉呈现。
 */
export interface PanelIconOwnerProps {
  /** 请求的方形边长（px）：wide 16 / 折叠 rail 18。 */
  size: number
  /** 该面板当前是否在中间列被选中。 */
  active: boolean
}

/** 侧栏槽 owner 传入的合成 props 子集。 */
export interface SidebarRootProps {
  /** 侧栏折叠态（layout 的 sidebarCol 状态）。 */
  collapsed: boolean
  /** 侧栏宽度（wide 态生效）。 */
  width: number
  /** 开始新会话（inject：ctx.workspaces.startSession）。 */
  startSession: (workspaceId?: string) => void
  /** 折叠/展开切换（inject：ctx.layout.toggleSidebar）。 */
  toggleSidebar: () => void
  /** 选中全局面板（inject：ctx.layout.selectPanel；旧核心缺席）。 */
  selectPanel: (id: string | null) => void
  /** 官方 `sidebar.panellist` 的行投影（inject：宿主 panellist 服务）。 */
  panels: PanelListStore
  /** 框架标准 prop；旧核心缺席。 */
  usePanelInfo?: UsePanelInfo
  /** 本条目 locale 翻译函数（panel NS）。 */
  t: (key: string) => string
}

/**
 * 会话区替换的槽位候选（跨核心版本的 inject 键 + register options 形状）。
 *
 * 核心 0.1.5-rc.1 起把会话区并入 keyed 槽 `main`（cell key `conversation`），
 * 旧 `conversation` 单槽消失；两个候选同时 inject，任一版本只有对应声明存在。
 */
export interface PanelViewSeatTarget {
  /** 需要 inject / register 的槽位声明键（与 register options.name 同值）。 */
  slot: string
  /** keyed 槽的 cell key（≥0.1.5 的 `main`）；旧单槽无此字段。 */
  key?: string
  /** 旧单槽的条目 id（single 槽的稳定标识）；keyed 槽无此字段。 */
  id?: string
}

/** 内容区替换规格（renderPanelContent 入参）。 */
export interface PanelContentSpec {
  /** 视图唯一标识（同一时刻只存在一个替换；active 态以它匹配 ActionItem）。 */
  id: string
  /** 视图组件：宿主渲染时按标准 kit 传入 t（可选，自包含组件可忽略）。 */
  render: ComponentType<{ t?: (key: string) => string }>
  /** 视图文案命名空间（可选，默认宿主 'panel'；视图可声明自己的 NS）。 */
  locale?: string
  /**
   * 承载侧（可选，缺省 conversation）：方案 B 预留字段。
   * 当前实现只处理 conversation（会话区替换）；`details`（右侧可拖拽列）
   * 为二期能力，本期不渲染，消费方调用时按 conversation 处理。
   */
  side?: 'conversation' | 'details'
}

/**
 * 一次性注册一个面板（宿主负责按核心版本择路）。
 *
 * 新核心（≥0.1.5-rc.1）：宿主代注册 `sidebar.panellist`（图标行）+ `main`（内容），
 * 于是该面板成为**官方全局面板**——`ctx.layout.selectPanel(id)` 可选中、选中态经
 * `usePanelInfo` 统一可读，和官方/第三方按官方协议注册的面板完全同权。
 *
 * 旧核心：宿主回退注册 `sidebar.panel.action`（私有槽）+ 会话区替换，行为不变。
 */
export interface PanelRegistration {
  /** 面板唯一标识；同时用作 `main` 的 key，需避开官方保留的 `conversation`。 */
  id: string
  /** 展示文案；thunk 读时求值，因此本地化文案无需重新注册。 */
  label: string | (() => string)
  /** 面板本体；宿主在选中时渲染。 */
  render: ComponentType<{ t?: (key: string) => string }>
  /** 面板本体文案命名空间；声明后框架在 `main` 条目上合成 `t` seat。 */
  locale?: string
  /** 条目图标（16px 语义，共享图标或官方 primitives 组件实例）。 */
  icon?: ReactElement
  /** 清单排序位，升序。 */
  order?: number
}

/** panel.protocol 的稳定服务面。 */
export interface PanelProtocol {
  /** 面板区条目组件：样式、折叠态与 active 态由宿主承担。 */
  ActionItem: (props: PanelActionItemProps) => ReactElement
  /** 切换会话区替换：当前关闭则打开，当前打开则恢复会话。 */
  renderPanelContent: (spec: PanelContentSpec) => void
  /** 显式恢复官方会话区；用于面板内需要跳转到会话的动作。 */
  closePanelContent: () => void
  /**
   * 注册一个全局面板（图标 + 内容），返回注销句柄。
   * （可选：老版本宿主无此字段，消费方探测后再用。）
   */
  registerPanel?: (entry: PanelRegistration) => () => void
  /**
   * 程序化设置内容宽度（clamp 到契约范围并持久化）。（可选：老版本协议
   * 对象无此字段，消费方一律 `?.()` 探测调用。）
   */
  setPanelWidth?: (px: number) => void
  /** 清除宽度偏好，恢复自适应宽度。（可选，同上。） */
  resetPanelWidth?: () => void
  /** 当前内容宽度（含偏好；无面板挂载时返回偏好或 null）。（可选，同上。） */
  getPanelWidth?: () => number | null
  /** 透传 ctx.layout.openDetails：打开右侧 details 列。（可选，同上。） */
  openDetails?: () => void
  /** 透传 ctx.layout.closeDetails：关闭右侧 details 列。（可选，同上。） */
  closeDetails?: () => void
  /**
   * ≥0.1.5-rc.1 的右侧栏：报告占用 track / 是否全屏。
   * 语义与 `openDetails` 不同（报告式而非开关式），故独立命名。
   */
  openRightPanel?: (track: boolean, fullscreen: boolean) => void
  /** ≥0.1.5-rc.1：报告右侧栏隐藏。 */
  closeRightPanel?: () => void
}

/** ActionItem 合成 props：id + 图标 + 点击行为 + 文字（子插件只填这些）。 */
export interface PanelActionItemProps {
  /** 条目唯一标识（active 态：当前内容区替换 id 与之相等则保持选中样式）。 */
  id: string
  /** 条目图标（16px 语义，共享图标或官方 primitives 组件实例）。 */
  icon?: ReactElement
  /** 点击行为：自定义动作；打开内容区替换典型写法是调 renderPanelContent。 */
  onClick?: () => void
  /** 条目文字（wide 态显示；折叠态宿主 CSS 自动隐藏，只留图标钮）。 */
  children?: ReactNode
}
