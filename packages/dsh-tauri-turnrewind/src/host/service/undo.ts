/**
 * host/service/undo.ts — 撤销一个 turn 的工作区改动。
 *
 * 顺序固定为「读账本 → 校验归属/代数 → 校验快照可用 → **冲突预检** → 恢复 → 回写账本」：
 * 预检在动任何文件之前完成，命中冲突时不写一个字节（AGENTS.plugins.md
 * 「不得静默覆盖用户已有改动」）。恢复过程不做 force 通道，部分失败如实上报且
 * **不标记已撤销**，用户可以再点一次。
 *
 * 并发：整个 git 阶段跑在与捕获/结算/容量治理**同一条工作区队列**里——私有仓的
 * index 是共享可变状态，撤销与结算并发会撞 `index.lock` 或读到半更新的 index。
 * 会话仍有在飞 turn 时直接拒绝：那时 after 快照还没结算，撤销对象本身不成立。
 */

import type { UndoConflict, UndoOutcome } from '../types'
import type { WorkspaceQueue } from './queue'
import {
  REASON_ALREADY_UNDONE,
  REASON_CONFLICT,
  REASON_EXPIRED,
  REASON_GIT_REQUIRED,
  REASON_TURN_ACTIVE,
} from '../constants'
import { markTurnExpired, markTurnUndone, readLedger } from './ledger'
import { conflictDetails, readGenerationFor, readRefCommit, restoreTurnChanges, snapshotStoreFor } from './snapshot'
import { workspaceKey } from './workspace'

/** 撤销入参。 */
export interface UndoTurnOptions {
  /** 宿主数据根目录（`$DSH_HOME`）。 */
  dshHome: string
  sessionId: string
  turn: number
  /** 会话当前解析出的 worktree 根；用于会话归属校验（null 表示当前无法解析）。 */
  currentWorkspace: string | null
  /** 工作区级串行队列（与捕获/结算共用）。 */
  queue: WorkspaceQueue
  /** 该会话此刻是否有在飞的 turn。 */
  turnActive?: boolean
}

/**
 * 撤销指定 turn。
 * @param options - 会话、turn、当前工作区与共享队列。
 * @returns 成功时给出已恢复/已删除/失败明细；失败时给出 HTTP 状态码与原因。
 */
export async function undoTurn(options: UndoTurnOptions): Promise<UndoOutcome> {
  const { dshHome, sessionId, turn, currentWorkspace, queue } = options
  // 该轮还在跑：after 快照未结算，撤销对象不成立（预览文件集也还没定）。
  if (options.turnActive === true)
    return { ok: false, code: 409, error: REASON_TURN_ACTIVE }

  const ledger = await readLedger(dshHome, sessionId)
  const record = ledger.turns.find(item => item.turn === turn)
  if (record === undefined)
    return { ok: false, code: 404, error: '未找到该轮的文件变更记录' }
  if (!ledger.isGit || ledger.workspaceRoot === null)
    return { ok: false, code: 409, error: ledger.unavailableReason ?? REASON_GIT_REQUIRED }
  if (record.unavailable)
    return { ok: false, code: 409, error: record.unavailable }
  if (record.undoneAt !== null && record.undoneAt !== undefined)
    return { ok: false, code: 409, error: REASON_ALREADY_UNDONE }
  // 会话归属：cwd 可能后来被切到别的工作区，此时账本里的相对路径不再指向同一目录。
  if (currentWorkspace !== null && workspaceKey(currentWorkspace) !== workspaceKey(ledger.workspaceRoot))
    return { ok: false, code: 403, error: '会话当前工作区与该轮记录不一致，拒绝撤销' }

  const workspaceRoot = ledger.workspaceRoot
  const store = snapshotStoreFor(dshHome, workspaceRoot)

  // 快照仓代数：整仓被容量治理重建或被手工删除后，账本里引用旧代数的记录必然失效。
  // 这类记录直接落「过期」终态，避免用户每次点击都撞同一个不可用错误。
  const currentGeneration = await readGenerationFor(dshHome, workspaceRoot)
  if (record.generation !== null && record.generation !== undefined
    && currentGeneration !== null && record.generation !== currentGeneration) {
    await markTurnExpired(dshHome, sessionId, turn, REASON_EXPIRED)
    return { ok: false, code: 409, error: REASON_EXPIRED }
  }

  const outcome = await queue.run(workspaceRoot, async (): Promise<UndoOutcome> => {
    const beforeCommit = await readRefCommit(store, record.beforeRef)
    const afterCommit = await readRefCommit(store, record.afterRef)
    if (beforeCommit === null || afterCommit === null) {
      // refs 不在了（仓库被清空/记录来自旧版本）：同样落过期终态。
      await markTurnExpired(dshHome, sessionId, turn, REASON_EXPIRED)
      return { ok: false, code: 409, error: REASON_EXPIRED }
    }

    if (record.files.length === 0)
      return { ok: true, restored: [], removed: [], failed: [] }

    const conflicts = await conflictDetails(store, afterCommit, record.files)
    if (!conflicts.ok)
      return { ok: false, code: 500, error: conflicts.reason }
    if (conflicts.conflicts.length > 0) {
      const details: UndoConflict[] = conflicts.conflicts
      return { ok: false, code: 409, error: REASON_CONFLICT, conflicts: details }
    }

    const report = await restoreTurnChanges(store, beforeCommit, record.files)
    return { ok: true, restored: report.restored, removed: report.removed, failed: report.failed }
  })

  if (outcome.ok && outcome.failed.length === 0)
    await markTurnUndone(dshHome, sessionId, turn, Date.now())
  return outcome
}
