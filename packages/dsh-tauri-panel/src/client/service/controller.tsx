/**
 * service/controller.tsx — 会话区替换控制器：拥有 inject 句柄、当前规格与
 * capture 层 pointerdown 监听；close() 恢复官方会话界面并释放全部资源。
 *
 * 两条路径按核心能力择一（见 utils/official-panels.ts）：
 *   - **官方路径（≥0.1.5-rc.1）**：把替换视图注册为 `main` keyed 槽里 key = spec.id
 *     的条目，再 `ctx.layout.selectPanel(spec.id)`。于是内容区替换与官方全局面板
 *     （`sidebar.panellist`）共用同一套选中态：`usePanelInfo().activePanelId` 对
 *     两者都成立，切走/切回由布局统一派发，不再需要 pointer capture 兜底。
 *   - **旧核心路径（≤0.1.2-rc.1）**：`conversation` 单槽 / `main` 的 `conversation`
 *     cell 双候选 + priority -1 shadow（PANEL_VIEW_SEAT_TARGETS），并用 capture 层
 *     pointerdown 把「侧栏里的导航动作」翻译成关闭面板。
 *
 * 只注册旧槽时 0.1.5+ 的声明永不出现 → inject 回调永不执行 → 内容区不替换
 * （只剩侧栏条目选中样式）。
 *
 * open/close 走命名钩子（hookable），供诊断与第三方联动。重复创建（插件
 * 重载）时旧实例先被其 effect 清理，互不干扰。
 */

import type { ClientContext } from 'dsh-tauri/client'
import type { ReactElement } from 'react'
import type { PanelContentSpec, PanelViewSeatTarget } from '../types'
import type { PanelWidthController } from './width'
import { createHooks } from 'dsh-tauri/client'
import { ConversationSeat } from '../components/conversation-seat'
import { PANEL_MAIN_SLOT, PANEL_VIEW_SEAT_TARGETS } from '../constants'
import { setSidebarPanelActive, shouldClosePanelForSidebarTarget } from '../dom/panel'
import { NS } from '../locales'
import { panelViewStore } from '../store'
import { selectMainPanel, supportsOfficialPanels } from '../utils/official-panels'
import { createPanelWidthController } from './width'

/** 会话区替换控制器的对外形状（panel.protocol 的机制侧）。 */
export interface PanelConversationController {
  open: (ctx: ClientContext, spec: PanelContentSpec) => void
  close: () => void
  toggle: (ctx: ClientContext, spec: PanelContentSpec) => void
  viewId: () => { id: string } | null
  /** 内容宽度控制器（方案 A：attach/handle；方案 C：setWidth/resetWidth/getWidth）。 */
  width: PanelWidthController
}

/** 会话区替换的生命周期钩子（hookable：open/close 事件轴）。 */
export interface ConversationLifecycleHooks {
  'view:open': (spec: PanelContentSpec) => void
  'view:close': () => void
}

/**
 * 把槽位候选翻译成 slots.register options。
 *
 * 旧单槽用 `id`（single 槽的稳定标识），≥0.1.5 的 `main` keyed 槽用 `key`
 * （槽内 cell 选择键）；两者都以 priority -1 shadow 官方会话条目。
 */
function seatRegistrationOptions(target: PanelViewSeatTarget, locale: string): Record<string, unknown> {
  return {
    ...target.id === undefined ? {} : { id: target.id },
    ...target.key === undefined ? {} : { key: target.key },
    locale,
    name: target.slot,
    priority: -1,
  }
}

/** 创建会话区替换控制器。 */
export function createPanelConversationController(): PanelConversationController {
  const hooks = createHooks<ConversationLifecycleHooks>()
  const width = createPanelWidthController()
  let seatDisposers: Array<() => void> = []
  let currentSpec: PanelContentSpec | undefined
  let onPointerDownCapture: ((event: PointerEvent) => void) | undefined
  /** 本次替换走的是官方 `main` 路径（close 需要据此归还选中态）。 */
  let viaOfficialPanel = false
  /** 官方路径的 close() 需要 ctx；open() 与 close() 由同一宿主插件调用，缓存安全。 */
  let activeCtx: ClientContext | undefined

  /**
   * 渲染条目：spec 经渲染期快照传入（close() 置空后条目已注销，组件自然卸载）。
   */
  function renderSeat(props: { t: (key: string) => string }): ReactElement {
    return <ConversationSeat t={props.t} spec={currentSpec} width={width} />
  }

  /**
   * 打开面板内容：官方核心走 `main` + selectPanel（与全局面板同一选中态），
   * 旧核心走 `conversation` 单槽 / `main` 的 `conversation` cell 双候选 shadow。
   */
  function open(ctx: ClientContext, spec: PanelContentSpec): void {
    if (currentSpec && currentSpec.id === spec.id)
      return
    if (seatDisposers.length > 0)
      close()
    currentSpec = spec
    activeCtx = ctx
    panelViewStore.set({ id: spec.id })
    const locale = spec.locale ?? NS

    if (supportsOfficialPanels(ctx)) {
      viaOfficialPanel = true
      seatDisposers = [
        ctx.slots.inject(PANEL_MAIN_SLOT as never, () =>
          ctx.slots.register({ key: spec.id, locale, name: PANEL_MAIN_SLOT } as never, renderSeat)),
      ]
      selectMainPanel(ctx, spec.id)
    }
    else {
      viaOfficialPanel = false
      seatDisposers = PANEL_VIEW_SEAT_TARGETS.map(target =>
        ctx.slots.inject(target.slot as never, () =>
          ctx.slots.register(seatRegistrationOptions(target, locale) as never, renderSeat)))
      onPointerDownCapture = (event: PointerEvent): void => {
        if (shouldClosePanelForSidebarTarget(event.target instanceof Element ? event.target : null))
          close()
      }
      document.addEventListener('pointerdown', onPointerDownCapture, true)
    }
    setSidebarPanelActive(true)
    void hooks.callHook('view:open', spec)
  }

  /** 关闭面板内容：官方路径归还选中态到会话，旧核心 dispose 条目 → 官方会话恢复。 */
  function close(): void {
    // 官方路径先归还选中态，再注销条目——否则布局会先因条目消失而重置选中态，
    // 两步结果相同，但显式归还让「谁改的状态」始终可读。
    if (viaOfficialPanel && activeCtx !== undefined)
      activeCtx.layout.selectPanel?.(null)
    viaOfficialPanel = false
    for (const dispose of seatDisposers)
      dispose()
    seatDisposers = []
    currentSpec = undefined
    activeCtx = undefined
    panelViewStore.set(null)
    if (onPointerDownCapture) {
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
      onPointerDownCapture = undefined
    }
    setSidebarPanelActive(false)
    void hooks.callHook('view:close')
  }

  return {
    open,
    close,
    toggle(ctx, spec) {
      // 同 id → toggle 关闭；不同/无 → open()（open 内部已处理「已有则先 close 替换」），
      // 实现多面板「点一个切一个」，而非一开就全关。
      if (currentSpec && currentSpec.id === spec.id)
        close()
      else
        open(ctx, spec)
    },
    viewId: () => panelViewStore.getSnapshot(),
    width,
  }
}
