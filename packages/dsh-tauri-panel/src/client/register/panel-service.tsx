/**
 * register/panel-service.tsx — 面板协议宿主服务装配（panel.protocol）。
 *
 * 协议能力见 PROTOCOL.md。机制（全部在宿主，单一权威）：
 *   - 服务经 ctx.reflect.provide('panel.protocol', api) 暴露（cordis
 *     ReflectService，官方 runtime 同款用法 ctx.reflect.provide("sessions", this)）；
 *   - `registerPanel(entry)`：**推荐入口**。核心能力探测后择路（见
 *     utils/official-panels.ts）：
 *       ≥0.1.5-rc.1 → 代注册官方 `sidebar.panellist`（图标行）+ `main`（内容），
 *         该面板成为官方全局面板，与官方/第三方按官方协议注册者同权；
 *       ≤0.1.2-rc.1 → 回退私有 `sidebar.panel.action` 槽 + 会话区替换。
 *   - `renderPanelContent(spec)`：第三方直接调 ActionItem 时的旧入口。官方核心上
 *     改走 `main` key = spec.id + selectPanel（与全局面板共用选中态）；
 *     旧核心走 `conversation` 单槽 / `main` 的 `conversation` cell 双候选 shadow。
 *   - 不能常驻注册 + SlotOutlet 透传：SlotOutlet 对 single 槽只渲染 live 条目，
 *     自己 live 后渲染官方条目 = 自递归（无公开 API 渲染被 shadow 条目）。
 */

import type { ClientContext } from 'dsh-tauri/client'
import type { PanelWidthController } from '../service/width'
import type { PanelContentSpec, PanelProtocol, PanelRegistration } from '../types'
import { PanelActionItem } from '../components/action-item'
import { ConversationSeat } from '../components/conversation-seat'
import { PANEL_ACTION_SLOT, PANEL_LIST_SLOT, PANEL_MAIN_SLOT, PANEL_PROTOCOL_SERVICE } from '../constants'
import { createPanelConversationController } from '../service/controller'
import { supportsOfficialPanels } from '../utils/official-panels'

/** 未声明 locale 的面板体渲染时占位的翻译函数（面板自带文案时不会被用到）。 */
const NO_TRANSLATE = (key: string): string => key

/** `registerPanel` 入参 → 会话区承载规格（渲染容器与宽度同步复用 ConversationSeat）。 */
function toSeatSpec(entry: PanelRegistration): PanelContentSpec {
  return { id: entry.id, render: entry.render, locale: entry.locale }
}

/**
 * 官方路径：把面板注册成官方全局面板（`sidebar.panellist` 行 + `main` 内容）。
 *
 * 两个 inject 都返回 disposer：调用方注销时两条注册一起释放，`main` 条目消失后
 * 布局自己的 `retainMainPanels` 会把选中态复位到会话。
 */
function registerOfficialPanel(
  ctx: ClientContext,
  entry: PanelRegistration,
  width: PanelWidthController,
): () => void {
  const seat = toSeatSpec(entry)
  const disposers: Array<() => void> = [
    ctx.slots.inject(PANEL_LIST_SLOT as never, () =>
      ctx.slots.register(
        {
          name: PANEL_LIST_SLOT,
          id: entry.id,
          order: entry.order ?? 0,
          label: entry.label,
          registrant: entry.id,
        } as never,
        // 图标：ownerProps 是 { size, active }；静态 ReactElement 直接回渲染，
        // 尺寸由宿主行样式（.dshp-panel__menu-item-icon）承担。
        () => entry.icon ?? null,
      )),
    ctx.slots.inject(PANEL_MAIN_SLOT as never, () =>
      ctx.slots.register(
        {
          name: PANEL_MAIN_SLOT,
          key: entry.id,
          ...(entry.locale === undefined ? {} : { locale: entry.locale }),
          registrant: entry.id,
        } as never,
        (props: { t?: (key: string) => string }) => (
          <ConversationSeat t={props.t ?? NO_TRANSLATE} spec={seat} width={width} />
        ),
      )),
  ]
  return () => {
    for (const dispose of disposers)
      dispose()
  }
}

/**
 * 安装宿主服务：经 ctx.reflect.provide 暴露 panel.protocol（effect 生命周期，
 * 插件卸载即注销）。不依赖 renderer 补丁（面板注册只走 slots runtime）——
 * 旧核心下会话区替换仍可用（仅私有槽条目需 renderer 渲染）。
 *
 * 协议方法：既有三方法原样；`registerPanel` 为推荐入口（见上）；`setPanelWidth` /
 * `resetPanelWidth` / `getPanelWidth` 委托宽度控制器（始终提供——控制器内部有
 * 能力探测降级，消费方 `?.()` 探测调用）；右侧栏按 `ctx.layout` 实际能力探测后
 * 提供（0.1.2-rc.1 的 `openDetails/closeDetails`、0.1.5-rc.1 的
 * `openRightbar/closeRightbar` 各自映射到对应协议字段）。
 * @param ctx - 客户端根上下文。
 */
export function registerPanelService(ctx: ClientContext): void {
  const controller = createPanelConversationController()
  const api: PanelProtocol = {
    ActionItem: PanelActionItem,
    renderPanelContent: spec => controller.toggle(ctx, spec),
    closePanelContent: () => {
      controller.close()
      // 由 registerPanel / 官方协议直接注册的全局面板不经过控制器，必须显式归还
      // 选中态——否则面板内「回到会话」的动作在官方路径下会变成 no-op。
      ctx.layout.selectPanel?.(null)
    },
    registerPanel: entry => supportsOfficialPanels(ctx)
      ? registerOfficialPanel(ctx, entry, controller.width)
      : registerLegacyPanel(ctx, entry, api),
    setPanelWidth: px => controller.width.setWidth(px),
    resetPanelWidth: () => controller.width.resetWidth(),
    getPanelWidth: () => controller.width.getWidth(),
  }
  if (typeof ctx.layout.openDetails === 'function')
    api.openDetails = () => ctx.layout.openDetails()
  if (typeof ctx.layout.closeDetails === 'function')
    api.closeDetails = () => ctx.layout.closeDetails()
  if (typeof ctx.layout.openRightbar === 'function')
    api.openRightPanel = (track, fullscreen) => ctx.layout.openRightbar?.(track, fullscreen)
  if (typeof ctx.layout.closeRightbar === 'function')
    api.closeRightPanel = () => ctx.layout.closeRightbar?.()
  // Publish synchronously during apply: alpha slot injections can run before
  // sibling effects, so publishing from inside ctx.effect makes consumers see
  // an absent protocol and permanently skip their action registration.
  const disposeProtocol = ctx.reflect.provide(PANEL_PROTOCOL_SERVICE, api)
  ctx.effect(() => {
    return () => {
      controller.close()
      disposeProtocol()
    }
  }, 'dsh-tauri-panel: panel.protocol host service')
}

/**
 * 旧核心路径：注册私有 `sidebar.panel.action` 条目，点击切到会话区替换。
 * 文案是 thunk 时在此求值一次（ActionItem 的 children 不随时间重投影）。
 */
function registerLegacyPanel(
  ctx: ClientContext,
  entry: PanelRegistration,
  api: PanelProtocol,
): () => void {
  const label = typeof entry.label === 'function' ? entry.label() : entry.label
  return ctx.slots.inject(PANEL_ACTION_SLOT as never, () =>
    ctx.slots.register(
      {
        name: PANEL_ACTION_SLOT,
        id: entry.id,
        order: entry.order ?? 0,
        registrant: entry.id,
      } as never,
      () => (
        <api.ActionItem
          id={entry.id}
          icon={entry.icon}
          onClick={() => api.renderPanelContent(toSeatSpec(entry))}
        >
          {label}
        </api.ActionItem>
      ),
    ))
}
