/**
 * host/hooks/index.ts — turnrewind 生命周期钩子（hookable）。
 *
 * 事件在业务状态**落定后**触发（快照写入账本完成、撤销完成），apply 里的
 * ctx.on 只是转发器；第三方可 hook 同一轴做审计或联动，不必改插件本体。
 */

import { createHooks } from 'hookable'

/** 插件对外可扩展的生命周期钩子。 */
export interface TurnRewindHooks {
  /** 某 turn 的 after 快照与差异已写入账本（fileCount 为受影响文件数）。 */
  'turn:captured': (sessionId: string, turn: number, fileCount: number) => void
  /** 某 turn 的改动已被撤销（restored 为实际恢复/删除的路径数）。 */
  'turn:undone': (sessionId: string, turn: number, restored: number) => void
}

/** 创建插件生命周期钩子注册表（apply 装配时持有）。 */
export function createTurnRewindHooks() {
  return createHooks<TurnRewindHooks>()
}
