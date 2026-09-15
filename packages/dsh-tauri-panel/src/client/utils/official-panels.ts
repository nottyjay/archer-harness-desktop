/**
 * utils/official-panels.ts — 官方全局面板（`main` + `ctx.layout.selectPanel`）的
 * 能力探测与安全调用。
 *
 * 0.1.5-rc.1 起布局把会话区并入 keyed 槽 `main`，并新增 `ctx.layout.selectPanel`；
 * 旧核心（≤0.1.2-rc.1）两者都不存在。上游对**未注册的 id 会直接 throw**，
 * 而我们的调用点常在注册/渲染流程中，所以调用前自查 `main` 的 key 集合。
 */

import type { ClientContext } from 'dsh-tauri/client'
import { PANEL_MAIN_SLOT } from '../constants'

/** 核心是否提供官方全局面板切换（selectPanel 存在 ⇔ 布局是 ≥0.1.5-rc.1）。 */
export function supportsOfficialPanels(ctx: ClientContext): boolean {
  return typeof ctx.layout.selectPanel === 'function'
}

/** 目标 id 是否已在 `main` 槽注册（keyed 槽按 key 每 cell 取渲染胜者）。 */
export function isMainPanelRegistered(ctx: ClientContext, id: string): boolean {
  const entries = ctx.slots.entriesOfSlot?.(PANEL_MAIN_SLOT)
  return entries?.some(entry => entry.options.key === id) ?? false
}

/**
 * 选中一个 `main` 面板；未注册时只记日志，绝不把上游的 throw 抛进调用方流程。
 * @param ctx - 客户端根上下文。
 * @param id - `main` 槽的 cell key。
 */
export function selectMainPanel(ctx: ClientContext, id: string): void {
  if (!isMainPanelRegistered(ctx, id)) {
    console.error(`[dsh-tauri-panel] panel "${id}" is not registered in the "${PANEL_MAIN_SLOT}" slot`)
    return
  }
  ctx.layout.selectPanel?.(id)
}
