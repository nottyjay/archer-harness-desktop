import type * as Types from './index.type'
import { fetch } from 'dsh-tauri/client'
import { API_PREFIX } from '../constants'

export const baseURL = API_PREFIX

/** @method get 查询任务列表。 */
export function getTasks(query?: Types.GetTasksQuery): Promise<Types.TasksResponse> {
  return fetch(`${baseURL}/tasks${query?.search ? `?search=${encodeURIComponent(query.search)}` : ''}`)
}

/** @method post 新建任务。 */
export function postTasksCreate(body: Types.PostTasksCreateBody): Promise<Types.TaskActionResult> {
  return fetch(`${baseURL}/tasks/create`, { method: 'POST', body })
}

/** @method post 更新任务。 */
export function postTasksUpdate(body: Types.PostTasksUpdateBody): Promise<Types.TaskActionResult> {
  return fetch(`${baseURL}/tasks/update`, { method: 'POST', body: { id: body.id, ...body.input } })
}

/** @method post 暂停/恢复任务。 */
export function postTasksToggle(body: Types.PostTasksToggleBody): Promise<Types.TaskActionResult> {
  return fetch(`${baseURL}/tasks/toggle`, { method: 'POST', body })
}

/** @method post 删除任务。 */
export function postTasksDelete(body: Types.PostIdBody): Promise<Types.SimpleActionResult> {
  return fetch(`${baseURL}/tasks/delete`, { method: 'POST', body })
}

/** @method post 立即运行任务。 */
export function postTasksRun(body: Types.PostIdBody): Promise<Types.SimpleActionResult> {
  return fetch(`${baseURL}/tasks/run`, { method: 'POST', body })
}

/** @method get 查询执行记录。 */
export function getHistory(query?: Types.GetHistoryQuery): Promise<Types.RunsResponse> {
  return fetch(`${baseURL}/history${query?.taskId ? `?taskId=${encodeURIComponent(query.taskId)}` : ''}`)
}

/** @method post 删除执行记录。 */
export function postHistoryDelete(body: Types.PostIdBody): Promise<Types.SimpleActionResult> {
  return fetch(`${baseURL}/history/delete`, { method: 'POST', body })
}

/** @method get 查询面板选项。 */
export function getOptions(): Promise<Types.SchedulerOptions> {
  return fetch(`${baseURL}/options`)
}

/** @method post 触发宿主自愈恢复。 */
export function postRecover(): Promise<unknown> {
  return fetch(`${baseURL}/recover`, { method: 'POST', body: {} })
}
