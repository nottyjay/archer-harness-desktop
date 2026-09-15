/**
 * register/turn-tail.ts — 把变更卡片注册进 `conversation.chat.turnTail`。
 *
 * 该槽是 **chain** 型：升序 priority 依次征询 select，首个返回非 null 的条目当选，
 * 同一轮只渲染一个条目。官方 `ui-deliverables` 以默认 priority 0 注册
 * （两个内核均如此，0.1.2 组件名 ProducedFiles、0.1.5 为 Deliverables），
 * 本插件用 {@link TURNREWIND_TURN_TAIL_PRIORITY} 抢先当选，用带撤销能力的卡片
 * 替换官方 “Files changed” 行（需求已确认接受）。
 *
 * select 必须是**纯函数**（只读 owner props）：因此「本轮有没有记录」不能在这里判断，
 * 只能先无脑当选，再由组件按 store 状态决定渲染内容（无记录时返回 null）。
 * sessionId 走 inject 工厂首参（两内核的框架解析结果），不依赖 SessionStandardProps。
 */

import type { ClientContext } from 'dsh-tauri/client'
import { TurnChangesCard } from '../components/turn-changes-card'
import {
  TURNREWIND_PLUGIN_NAME,
  TURNREWIND_TURN_TAIL_PRIORITY,
  TURNREWIND_TURN_TAIL_SLOT,
} from '../constants'

/** chain 征询用的 owner props 视图（框架派发 TurnTailOwnerProps）。 */
interface TurnTailOwnerLike {
  turn?: { turn?: number } | undefined
}

/**
 * 注册变更卡片。
 * @param ctx - 客户端根上下文（须已注入 slots）。
 * @returns 释放 inject 句柄的 disposer。
 */
export function registerTurnChangesCard(ctx: ClientContext): () => void {
  return ctx.slots.inject(
    TURNREWIND_TURN_TAIL_SLOT as never,
    () =>
      ctx.slots.register(
        {
          name: TURNREWIND_TURN_TAIL_SLOT,
          registrant: TURNREWIND_PLUGIN_NAME,
          priority: TURNREWIND_TURN_TAIL_PRIORITY,
          select: (owner: TurnTailOwnerLike) => ({ turn: owner?.turn?.turn ?? 0 }),
          inject: (sessionId?: string) => ({ sessionId }),
        } as never,
        TurnChangesCard as never,
      ),
  )
}
