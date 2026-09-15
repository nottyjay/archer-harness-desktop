import type * as Types from './index.type'
import { fetch } from 'dsh-tauri/client'
import { SESSION_API_PREFIX } from '../../shared/constants'

export const baseURL = SESSION_API_PREFIX

/** @method get 查询归档会话列表。 */
export function getArchived(): Promise<Types.ArchivedListPayload> {
  return fetch(`${baseURL}/archived`)
}

/** @method post 在系统文件管理器中打开归档会话的数据目录。 */
export function postOpenSessionDir(body: Types.PostOpenSessionDirBody): Promise<Types.SessionActionResult> {
  return fetch(`${baseURL}/open-path`, { method: 'POST', body })
}

/** @method post 归档单个会话。 */
export function postArchive(body: Types.PostArchiveBody): Promise<Types.ArchivedListPayload> {
  return fetch(`${baseURL}/archive`, { method: 'POST', body })
}

/** @method post 取消归档（会话回到其工作区组保留的位置）。 */
export function postUnarchive(body: Types.PostSessionIdBody): Promise<Types.SessionActionResult> {
  return fetch(`${baseURL}/unarchive`, { method: 'POST', body })
}

/** @method post 彻底删除一个归档会话（宿主移除 + 物理删除会话数据，不可恢复）。 */
export function postDelete(body: Types.PostSessionIdBody): Promise<Types.SessionActionResult> {
  return fetch(`${baseURL}/delete`, { method: 'POST', body })
}

/** @method post 归档整个工作区组（一次写入多条记录）。 */
export function postArchiveWorkspace(body: Types.PostArchiveWorkspaceBody): Promise<Types.ArchivedListPayload> {
  return fetch(`${baseURL}/archive-workspace`, { method: 'POST', body })
}

/** @method post 清空归档（全部会话彻底删除，不可恢复）。 */
export function postClear(): Promise<Types.SessionActionResult> {
  return fetch(`${baseURL}/clear`, { method: 'POST', body: {} })
}

/** @method post 删除项目内的全部归档会话。 */
export function postDeleteWorkspace(body: Types.PostDeleteWorkspaceBody): Promise<Types.SessionActionResult> {
  return fetch(`${baseURL}/delete-workspace`, { method: 'POST', body })
}
