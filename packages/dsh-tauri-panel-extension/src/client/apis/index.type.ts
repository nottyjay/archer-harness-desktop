import type { ImportedServerView, McpRow, SkillRowView } from '../types'

export type { ImportedServerView, McpRow, SkillRowView }

/** GET /skills、POST /skills/refresh 响应。 */
export interface SkillsResponse {
  skills: SkillRowView[]
}

/** GET /skill 响应。 */
export interface SkillContentResponse {
  content: string
}

/** 简单动作结果（save/delete/policy/open/import/mcp 变更）。 */
export interface ActionResult {
  ok: boolean
  error?: string
}

/** POST /mcp/save 响应（宿主返回新服务器 id）。 */
export interface McpSaveResponse {
  ok: boolean
  id: string
}

/** GET /mcp 响应。 */
export interface McpListResponse {
  servers: McpRow[]
  global?: McpRow[]
  profile?: McpRow[]
}

/** POST /mcp/check connectivity response. */
export interface McpConnectivityResponse {
  ok: boolean
  latencyMs?: number
  error?: string
}

/** GET /import/scan 响应。 */
export interface McpImportScanResponse {
  servers: ImportedServerView[]
  existing: string[]
}

/** POST /import/apply 响应。 */
export interface McpApplyImportResponse {
  ok: boolean
  results: Array<{ name: string, ok: boolean, error?: string }>
}

/** POST /skill/save 请求体。 */
export type PostSkillSaveBody = Record<string, unknown>

/** POST /skill/delete 请求体。 */
export interface PostSkillDeleteBody {
  name: string
}

/** POST /skill/policy 请求体。 */
export interface PostSkillPolicyBody {
  name: string
  enabled: boolean
}

/** POST /mcp/toggle 请求体。 */
export interface PostMcpToggleBody {
  id: string
  disabled: boolean
}

/** POST /mcp/remove 请求体。 */
export interface PostMcpRemoveBody {
  id: string
}

/** POST /import/apply 请求体。 */
export interface PostMcpApplyImportBody {
  items: Array<{ agent: string, name: string }>
}
