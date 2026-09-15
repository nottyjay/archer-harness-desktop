/**
 * client/store/index.ts — 每会话摘要缓存 + 撤销动作（模块级 SnapshotStore + uSES 桥）。
 *
 * 与 dsh-tauri-worktree 同款约定：模块级 `createExternalStore`，组件经
 * `useSyncExternalStore` 订阅按会话切片的状态；在飞请求按会话合并，
 * 避免同一会话的多个 turn 卡片同时打同一份摘要。
 */

import type { SessionSummary, TurnrewindSessionState, TurnrewindUiState } from '../types'
import { createExternalStore } from 'dsh-tauri/client'
import { useSyncExternalStore } from 'react'
import { getSummary, postUndo } from '../apis'

/** 无缓存会话的空白态（引用必须稳定，否则 uSES 会无限重渲染）。 */
const EMPTY_STATE: TurnrewindSessionState = {
  status: 'idle',
  summary: null,
  error: null,
  attempts: {},
  undoing: false,
  undoError: null,
  undoConflicts: [],
}

export const turnrewindStore = createExternalStore<TurnrewindUiState>({ bySession: {} })

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 取某会话的状态切片（无则空白态）。 */
export function selectSessionState(state: TurnrewindUiState, sessionId: string | undefined): TurnrewindSessionState {
  if (!sessionId)
    return EMPTY_STATE
  return state.bySession[sessionId] ?? EMPTY_STATE
}

/** 更新某会话状态（merge 语义）。 */
export function patchSession(sessionId: string | undefined, patch: Partial<TurnrewindSessionState>): void {
  if (!sessionId)
    return
  turnrewindStore.set(state => ({
    ...state,
    bySession: {
      ...state.bySession,
      [sessionId]: { ...(state.bySession[sessionId] ?? EMPTY_STATE), ...patch },
    },
  }))
}

/** 组件内订阅某会话状态。 */
export function useTurnrewindSession(sessionId: string | undefined): TurnrewindSessionState {
  return useSyncExternalStore(
    turnrewindStore.subscribe,
    () => selectSessionState(turnrewindStore.getSnapshot(), sessionId),
  )
}

/** 在飞摘要请求（按会话合并；force 时另起一次）。 */
const inflight = new Map<string, Promise<void>>()

/**
 * 拉取（或强制刷新）某会话摘要。
 * @param sessionId - 会话 id。
 * @param force - true 时忽略已有缓存与在飞请求，强制重拉。
 */
export function ensureSummary(sessionId: string | undefined, force = false): Promise<void> {
  if (!sessionId)
    return Promise.resolve()
  const current = selectSessionState(turnrewindStore.getSnapshot(), sessionId)
  if (!force) {
    if (current.status === 'ready' || current.status === 'loading')
      return inflight.get(sessionId) ?? Promise.resolve()
  }
  const existing = inflight.get(sessionId)
  if (existing !== undefined && !force)
    return existing
  const task = (async (): Promise<void> => {
    patchSession(sessionId, { status: 'loading', error: null })
    try {
      const summary: SessionSummary = await getSummary(sessionId)
      patchSession(sessionId, { status: 'ready', summary, error: null })
    }
    catch (error) {
      patchSession(sessionId, { status: 'error', error: messageOf(error) })
    }
    finally {
      inflight.delete(sessionId)
    }
  })()
  inflight.set(sessionId, task)
  return task
}

/**
 * 「本轮已结束但账本暂无记录」的重试：累计该 turn 的重试次数后强制重拉。
 * after 快照在 turn/end 之后后台结算，卡片可能先于账本落地渲染。
 */
export function retrySummaryForTurn(sessionId: string | undefined, turn: number): Promise<void> {
  if (!sessionId)
    return Promise.resolve()
  const current = selectSessionState(turnrewindStore.getSnapshot(), sessionId)
  patchSession(sessionId, { attempts: { ...current.attempts, [turn]: (current.attempts[turn] ?? 0) + 1 } })
  return ensureSummary(sessionId, true)
}

/**
 * 撤销某 turn 的文件改动。
 * 成功 → 强制刷新摘要（卡片转为「已撤销」）；409 → 展示冲突清单；其它 → 展示错误。
 * @returns 是否成功。
 */
export async function requestUndo(sessionId: string | undefined, turn: number): Promise<boolean> {
  if (!sessionId)
    return false
  patchSession(sessionId, { undoing: true, undoError: null, undoConflicts: [] })
  try {
    const { status, data } = await postUndo({ sessionId, turn })
    if (status >= 200 && status < 300 && data.ok !== false) {
      patchSession(sessionId, { undoing: false, undoError: null, undoConflicts: [] })
      await ensureSummary(sessionId, true)
      return true
    }
    patchSession(sessionId, {
      undoing: false,
      undoError: data.error ?? `HTTP ${status}`,
      undoConflicts: data.conflicts ?? [],
    })
    return false
  }
  catch (error) {
    patchSession(sessionId, { undoing: false, undoError: messageOf(error), undoConflicts: [] })
    return false
  }
}

export type { SessionSummary, TurnrewindSessionState, TurnrewindUiState } from '../types'
