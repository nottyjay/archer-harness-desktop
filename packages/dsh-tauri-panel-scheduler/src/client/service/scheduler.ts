import type { SchedulerUiState } from '../store'
/**
 * service/scheduler.ts — 调度器领域的组合逻辑（刷新代际 / 动作后刷新）。
 *
 * 错误归一由 dsh-tauri 的 JSON 客户端统一承担，apis/ 直接返回解析后的类型；
 * 本文件只做 store 写入与「动作 → 刷新」串联。
 */
import {
  getHistory,
  getOptions,
  getTasks,
  postHistoryDelete,
  postRecover,
  postTasksCreate,
  postTasksDelete,
  postTasksRun,
  postTasksToggle,
  postTasksUpdate,
} from '../apis'
import { schedulerStore } from '../store'

/** 领域 injected（模块级单例，与面板注册共享）。 */
/** 合并状态（merge 语义）。 */
function patchState(patch: Partial<SchedulerUiState>): void {
  schedulerStore.set(state => ({ ...state, ...patch }))
}

/** 轮询代际：只允许最新一次 refresh 落地，防止旧响应覆盖新状态。 */
let refreshGeneration = 0

/** 拉取任务 + 执行记录 + 选项（幂等，可重复调用）。 */
export async function refreshScheduler(loadOptions = false): Promise<void> {
  const generation = ++refreshGeneration
  patchState({ loading: true, error: '' })
  try {
    const [tasks, runs] = await Promise.all([
      getTasks(),
      getHistory(),
    ])
    if (generation !== refreshGeneration)
      return
    patchState({ tasks: tasks.tasks, runs: runs.runs, loading: false, refreshedAt: Date.now() })
    if (loadOptions) {
      const options = await getOptions()
      if (generation !== refreshGeneration)
        return
      patchState({ options })
    }
  }
  catch (error) {
    if (generation !== refreshGeneration)
      return
    patchState({ loading: false, error: error instanceof Error ? error.message : String(error) })
  }
}

/** 新建任务（成功则刷新）。返回 { ok, error? }。 */
export async function applyCreateTask(input: Record<string, unknown>): Promise<{ ok: boolean, error?: string }> {
  const result = await postTasksCreate(input)
  if (!result.ok)
    return { ok: false, error: result.error }
  await refreshScheduler()
  return { ok: true }
}

/** 更新任务。 */
export async function applyUpdateTask(id: string, input: Record<string, unknown>): Promise<{ ok: boolean, error?: string }> {
  const result = await postTasksUpdate({ id, input })
  if (!result.ok)
    return { ok: false, error: result.error }
  await refreshScheduler()
  return { ok: true }
}

/** 暂停/恢复。 */
export async function applyToggleTask(id: string, enabled: boolean): Promise<{ ok: boolean, error?: string }> {
  const result = await postTasksToggle({ id, enabled })
  if (!result.ok)
    return { ok: false, error: result.error }
  await refreshScheduler()
  return { ok: true }
}

/** 删除任务。 */
export async function applyDeleteTask(id: string): Promise<{ ok: boolean, error?: string }> {
  const result = await postTasksDelete({ id })
  if (!result.ok)
    return { ok: false, error: result.error }
  await refreshScheduler()
  return { ok: true }
}

/** 立即运行。 */
export async function applyDeleteRun(id: string): Promise<{ ok: boolean, error?: string }> {
  const result = await postHistoryDelete({ id })
  if (!result.ok)
    return result
  await refreshScheduler()
  return { ok: true }
}

export async function applyRunTask(id: string): Promise<{ ok: boolean, error?: string }> {
  const result = await postTasksRun({ id })
  if (!result.ok)
    return { ok: false, error: result.error }
  await refreshScheduler()
  return { ok: true }
}

/** 启动自愈（应用启动时调用一次）。 */
export function hydrateScheduler(): void {
  void postRecover().then(() => refreshScheduler(true)).catch(() => {})
}
