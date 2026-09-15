/**
 * service/archive.ts — 归档领域的组合逻辑（并发代际 / 变更后 resync / 结果判定）。
 *
 * 错误归一由 dsh-tauri 的 JSON 客户端统一承担；本文件只做业务编排：
 * 解析后的载荷写 store、「变更 → 刷新」串联与 `ok === false` 的领域判定。
 */
import type { ArchivedListPayload, ArchiveUiState } from '../types'
import {
  postOpenSessionDir as apiPostOpenSessionDir,
  getArchived,
  postArchive,
  postArchiveWorkspace,
  postClear,
  postDelete,
  postDeleteWorkspace,
  postUnarchive,
} from '../apis'
import { text } from '../locales'
import { archiveStore } from '../store'

/** 从 unknown 错误里取可展示文本（Error 取 message，其余字符串化）。 */
function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 在系统文件管理器中打开归档会话的数据目录（宿主按 sessionId 解析）。 */
export async function postOpenSessionDir(sessionId: string): Promise<void> {
  const result = await apiPostOpenSessionDir({ sessionId })
  if (!result.ok)
    throw new Error(text('openFailed', { reason: result.error ?? '' }))
}

/** 归档刷新代数：只允许最新一次刷新的响应写回 store（过期响应整体丢弃）。 */
let refreshGeneration = 0

/**
 * 拉取归档载荷并写入 store。
 *
 * 刷新成功后清空抑制标记：抑制只服务于「变更 → 刷新」窗口内的幽灵行
 * （宿主归档集合在变更后短暂含过期 id）。刷新成功即载荷权威，若保留抑制，
 * 取消归档后再归档的会话会被旧标记永久过滤出归档页（#235）。
 *
 * 并发保护：每次调用推进代数，只有仍是最新代数的响应才写回 —— 否则慢的旧
 * 响应会覆盖新数据，或把刚写入的抑制标记清掉（幽灵行提前闪现）。
 */
export async function refreshArchived(): Promise<void> {
  const generation = ++refreshGeneration
  archiveStore.set(state => ({ ...state, loading: true, error: '' }))
  try {
    const archived = await getArchived()
    if (generation !== refreshGeneration)
      return
    archiveStore.set(state => ({ ...state, archived, loading: false, suppressedSessionIds: [] }))
  }
  catch (error) {
    if (generation !== refreshGeneration)
      return
    archiveStore.set(state => ({ ...state, loading: false, error: errMessage(error) }))
  }
}

/**
 * 包裹一个破坏性/恢复变更：置 pending（驱动禁用 + loading toast），成功后并行
 * 刷新归档载荷与工作区归档镜像，失败写入 error。返回是否成功。
 */
async function runMutation(mutate: () => Promise<unknown>, resync?: () => Promise<void>, sessionIds: readonly string[] = []): Promise<boolean> {
  archiveStore.set(state => ({ ...state, pending: true, error: '' }))
  try {
    await mutate()
    if (sessionIds.length > 0) {
      archiveStore.set(state => ({
        ...state,
        suppressedSessionIds: [...state.suppressedSessionIds, ...sessionIds.filter(sessionId => !state.suppressedSessionIds.includes(sessionId))],
      }))
    }
    await Promise.all([
      refreshArchived(),
      resync ? Promise.race([resync(), new Promise<void>(resolve => setTimeout(resolve, 2_000))]) : Promise.resolve(),
    ])
    return true
  }
  catch (error) {
    archiveStore.set(state => ({ ...state, error: errMessage(error) }))
    return false
  }
  finally {
    archiveStore.set(state => ({ ...state, pending: false }))
  }
}

/** 归档一个会话并刷新。 */
export async function archiveSession(sessionId: string, workspaceId?: string, beforeSessionId?: string): Promise<void> {
  archiveStore.set(state => ({
    ...state,
    suppressedSessionIds: state.suppressedSessionIds.filter(id => id !== sessionId),
  }))
  await runMutation(() => postArchive({ sessionId, workspaceId, beforeSessionId }))
}

/** 归档整个工作区并刷新。 */
export async function archiveWorkspace(workspaceId: string, sessionIds: string[]): Promise<void> {
  await runMutation(() => postArchiveWorkspace({ workspaceId, sessionIds }))
}

/** 取消归档并刷新（resync 重新拉取官方归档镜像）。返回是否成功。 */
export function unarchiveSession(sessionId: string, resync?: () => Promise<void>): Promise<boolean> {
  return runMutation(() => postUnarchive({ sessionId }), resync, [sessionId])
}

/** 彻底删除单个归档会话并刷新。返回是否成功。 */
export function deleteSession(sessionId: string, resync?: () => Promise<void>): Promise<boolean> {
  return runMutation(() => postDelete({ sessionId }), resync, [sessionId])
}

/** 彻底删除全部归档会话并刷新。返回是否成功。 */
export function clearArchive(resync?: () => Promise<void>): Promise<boolean> {
  const sessionIds = [...archiveStore.getSnapshot().archived.archivedSessionIds]
  return runMutation(() => postClear(), resync, sessionIds)
}

/** 彻底删除项目内归档会话并刷新。返回是否成功。 */
export function deleteWorkspaceSessions(sessionIds: readonly string[], resync?: () => Promise<void>): Promise<boolean> {
  return runMutation(() => postDeleteWorkspace({ sessionIds }), resync, sessionIds)
}

export type { ArchivedListPayload, ArchiveUiState }
