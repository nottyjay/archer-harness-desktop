/**
 * store.ts — 归档页面的共享客户端状态（archived 载荷 + 页面筛选状态）。
 *
 * 每个归档会话的业务字段（标题、更新时间、工作区组）由组件合并
 * ctx.sessions / ctx.workspaces 的运行时快照得到，这里不复制那份数据。
 *
 * 变更编排（unarchive/delete/clear → 刷新 + resync）、错误归一与并发代际
 * 已迁移到 service/archive.ts，本文件只保留状态源、订阅与页面 setter。
 */
import type { ArchiveSort, ArchiveUiState } from '../types'
import { createExternalStore } from 'dsh-tauri/client'
import { useSyncExternalStore } from 'react'

export type { ArchivedListPayload, ArchiveUiState } from '../types'

/** 全局唯一共享状态源（模块级单例）。 */
export const archiveStore = createExternalStore<ArchiveUiState>({
  archived: { archivedSessionIds: [], meta: {} },
  sort: 'updatedAt',
  query: '',
  workspaceId: 'all',
  loading: false,
  pending: false,
  error: '',
  suppressedSessionIds: [],
  titleById: {},
})

/** 组件内订阅归档 UI 状态（uSES）。 */
export function useArchiveUi(): ArchiveUiState {
  return useSyncExternalStore(archiveStore.subscribe, archiveStore.getSnapshot)
}

/** 归档页排序方式（更新时间 / 创建时间 / 标题）。 */
export function setSort(sort: ArchiveSort): void {
  archiveStore.set(state => ({ ...state, sort }))
}

/** 归档页搜索关键字。 */
export function setQuery(query: string): void {
  archiveStore.set(state => ({ ...state, query }))
}

/** 归档页项目筛选（'all' 显示全部组）。 */
export function setWorkspaceFilter(workspaceId: string): void {
  archiveStore.set(state => ({ ...state, workspaceId }))
}
