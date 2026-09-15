import type * as Types from './index.type'
import { fetch } from 'dsh-tauri/client'
import { API_PREFIX } from '../../shared/constants'

export const baseURL = API_PREFIX

/** @method get 查询技能列表。 */
export function getSkills(): Promise<Types.SkillsResponse> {
  return fetch(`${baseURL}/skills`)
}

/** @method post 强制宿主重扫全部技能根。 */
export function postSkillsRefresh(): Promise<Types.SkillsResponse> {
  return fetch(`${baseURL}/skills/refresh`, { method: 'POST', body: {} })
}

/** @method get 读取单个技能内容。 */
export function getSkill(name: string): Promise<Types.SkillContentResponse> {
  return fetch(`${baseURL}/skill?name=${encodeURIComponent(name)}`)
}

/** @method post 保存技能。 */
export function postSkillSave(body: Types.PostSkillSaveBody): Promise<Types.ActionResult> {
  return fetch(`${baseURL}/skill/save`, { method: 'POST', body })
}

/** @method post 删除技能。 */
export function postSkillDelete(body: Types.PostSkillDeleteBody): Promise<Types.ActionResult> {
  return fetch(`${baseURL}/skill/delete`, { method: 'POST', body })
}

/** @method post 切换技能加载策略。 */
export function postSkillPolicy(body: Types.PostSkillPolicyBody): Promise<Types.ActionResult> {
  return fetch(`${baseURL}/skill/policy`, { method: 'POST', body })
}

/** @method post 打开用户技能目录或某技能。 */
export function postOpen(target: { target: 'user-skills' | 'skill', name?: string }): Promise<Types.ActionResult> {
  return fetch(`${baseURL}/open`, { method: 'POST', body: target })
}

/** @method post 导入 GitHub 技能仓库。 */
export function postRootsAdd(url: string): Promise<Types.ActionResult> {
  return fetch(`${baseURL}/roots/add`, { method: 'POST', body: { kind: 'git', url } })
}

/** @method get 查询 MCP 服务器列表。 */
export function getMcp(): Promise<Types.McpListResponse> {
  return fetch(`${baseURL}/mcp`)
}

/** @method post 保存 MCP 服务器。 */
export function postMcpSave(body: Record<string, unknown>): Promise<Types.McpSaveResponse> {
  return fetch(`${baseURL}/mcp/save`, { method: 'POST', body })
}

/** @method post 检查 MCP 服务器连通性。 */
export function postMcpCheck(body: { id: string }): Promise<Types.McpConnectivityResponse> {
  return fetch(`${baseURL}/mcp/check`, { method: 'POST', body })
}

/** @method post 启用/禁用 MCP 服务器。 */
export function postMcpToggle(body: Types.PostMcpToggleBody): Promise<Types.ActionResult> {
  return fetch(`${baseURL}/mcp/toggle`, { method: 'POST', body })
}

/** @method post 移除 MCP 服务器。 */
export function postMcpRemove(body: Types.PostMcpRemoveBody): Promise<Types.ActionResult> {
  return fetch(`${baseURL}/mcp/remove`, { method: 'POST', body })
}

/** @method get 扫描可导入的 MCP 配置。 */
export function getMcpImportScan(): Promise<Types.McpImportScanResponse> {
  return fetch(`${baseURL}/import/scan`)
}

/** @method post 应用 MCP 导入项。 */
export function postMcpImportApply(body: Types.PostMcpApplyImportBody): Promise<Types.McpApplyImportResponse> {
  return fetch(`${baseURL}/import/apply`, { method: 'POST', body })
}

/** @method post 请求宿主重启（连接会断开）。 */
export function postRestart(): Promise<unknown> {
  return fetch(`${baseURL}/restart`, { method: 'POST', body: {} })
}
