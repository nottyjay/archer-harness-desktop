/** GET /archived 响应：归档会话 id 集 + 创建元数据。 */
export interface ArchivedListPayload {
  archivedSessionIds: string[]
  /** Per archived session, creation metadata read from the host session header. */
  meta: Record<string, { createdAt?: number, cwd?: string, title?: string }>
}

/** 变更类动作的宿主结果体（200 返回；error 为宿主侧诊断文案）。 */
export interface SessionActionResult {
  ok: boolean
  error?: string
}

/** POST /open-path 请求体。 */
export interface PostOpenSessionDirBody {
  sessionId: string
}

/** POST /archive 请求体（truthy 省略 optional 字段，与旧实现一致）。 */
export interface PostArchiveBody {
  sessionId: string
  workspaceId?: string
  beforeSessionId?: string
}

/** POST /unarchive、/delete 请求体。 */
export interface PostSessionIdBody {
  sessionId: string
}

/** POST /archive-workspace 请求体。 */
export interface PostArchiveWorkspaceBody {
  workspaceId: string
  sessionIds: readonly string[]
}

/** POST /delete-workspace 请求体。 */
export interface PostDeleteWorkspaceBody {
  sessionIds: readonly string[]
}
