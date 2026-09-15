/** types/archive.ts — 归档页领域类型（载荷 / 行 / 排序 / UI 状态 / 组件 props）。 */

import type { ArchivedListPayload } from '../apis/index.type'
import type { SessionsRuntimeLike, WorkspacesRuntimeLike } from './runtime'

export type { ArchivedListPayload }

/** One archived session row after merging host metadata + session/workspace runtime facts. */
export interface ArchiveRow {
  sessionId: string
  title: string
  cwd?: string
  createdAt?: number
  updatedAt?: number
  archivedAt?: number
  /** Workspace group this session is displayed under; undefined means the 未分组 bucket. */
  workspaceId?: string
  workspaceTitle?: string
}

/** Sort method for the archive page filter (applies to both rows and groups). */
export type ArchiveSort = 'updatedAt' | 'createdAt' | 'title'

/** Persistent archive-page UI state (shared via a module SnapshotStore). */
export interface ArchiveUiState {
  archived: ArchivedListPayload
  sort: ArchiveSort
  query: string
  /** Selected project/workspace filter; 'all' shows every group. */
  workspaceId: string
  loading: boolean
  /** A destructive/restore mutation is in flight (drives disabled + loading toast). */
  pending: boolean
  error: string
  /** IDs hidden optimistically after a successful restore/delete until host mirror catches up. */
  suppressedSessionIds: string[]
  /** Titles observed before a session disappears from the filtered session list. */
  titleById: Record<string, string>
}

/** Props injected into the settings.section slot component. */
export interface ArchivePanelProps {
  close?: () => void
  sessionsRuntime: SessionsRuntimeLike
  workspacesRuntime: WorkspacesRuntimeLike
}
