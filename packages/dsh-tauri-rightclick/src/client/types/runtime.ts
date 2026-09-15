/**
 * client/types/runtime.ts — 右键菜单的运行时面与官方 controller 投影。
 *
 * 【来源】官方 `dsh-tauri/client` 的 `ISessions`、`IWorkspaces`、
 * `SessionListState`、`SessionSummary`、`WorkspaceSnapshot`、`WorkspaceView`。
 * 【版本】@deepseek-ai/dsh-api-session-controller@0.1.2-alpha.3；
 * @deepseek-ai/dsh-api-workspace-controller@0.1.2-alpha.3。
 * 【修订】2026-01：删除重复的官方摘要/快照声明；仅保留右键菜单扩展协议，
 * 并把 alpha/桌面专属 `startSession` 标注为兼容扩展。
 */

import type {
  ISessions,
  IWorkspaces,
  SessionId,
  SessionListState,
  SessionSummary,
  WorkspaceId,
  WorkspaceSnapshot,
  WorkspaceView,
} from 'dsh-tauri/client'

export type { SessionId, SessionListState, SessionSummary, WorkspaceId, WorkspaceSnapshot, WorkspaceView }

export type SessionSummaryLike = SessionSummary
export type SessionListSnapshotLike = Pick<SessionListState, 'ids' | 'byId' | 'current'>

/** 会话绑定（`ctx.sessions.binding` 返回面的最小子集）。 */
export interface SessionBindingLike {
  session: {
    rename: (title: string) => Promise<{ ok: boolean, error?: { message?: string } }>
  }
}

/** 官方 sessions 服务加上右键菜单 fork 所需能力。 */
export type SessionsRuntimeLike = Pick<ISessions, 'list' | 'open' | 'binding' | 'fork'>

export type WorkspaceViewLike = WorkspaceView
export type WorkspaceListSnapshotLike = Pick<WorkspaceSnapshot, 'items' | 'archivedSessionIds'>

/** 官方 workspaces 服务加上 alpha/桌面导航兼容扩展。 */
export type WorkspacesRuntimeLike = Pick<IWorkspaces, 'list' | 'archiveSession' | 'delete'> & {
  startSession?: (workspaceId: WorkspaceId) => void
}

/** 右键菜单扩展协议：其他 Web 插件登记到全局注册表的一条扩展项。 */
export interface ContextMenuExtension {
  id: string
  order?: number
  label?: string
  /** 按会话决定是否显示（缺省显示）。 */
  visible?: (context: { session?: SessionSummaryLike | null, row: Element | null }) => boolean
  /** 点击菜单项时执行。 */
  run: (context: {
    session?: SessionSummaryLike | null
    row: Element | null
    sessions: SessionsRuntimeLike
    workspaces: WorkspacesRuntimeLike
    close: () => void
  }) => void | Promise<void>
}

/** `dsh:rightclick-menu` 事件 detail（每次打开菜单时派发）。 */
export interface ContextMenuEventDetail {
  row: Element | null
  /** 官方会话操作按钮（存在时）。 */
  action: HTMLElement | null
  session: SessionSummaryLike | null
  workspace: WorkspaceViewLike | null
  target: EventTarget | null
  x: number
  y: number
  extensions: ContextMenuExtension[]
}
