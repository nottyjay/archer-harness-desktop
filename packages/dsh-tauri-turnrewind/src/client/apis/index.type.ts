/**
 * client/apis/index.type.ts — 客户端 RPC 的请求/响应类型。
 */

export type { LiveSnapshot, SessionSummary, TurnFileChange, TurnSummary, UndoResponse } from '../types'

/** 撤销请求体。 */
export interface PostUndoBody {
  sessionId: string
  turn: number
}
