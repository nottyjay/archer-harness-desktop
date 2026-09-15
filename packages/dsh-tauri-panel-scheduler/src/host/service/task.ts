/**
 * host/service/task.ts — 定时任务领域原语（crons 功能目录）。
 *
 * create / update / delete / get / getAll 任务；写操作在单写者队列内完成，
 * 读走 storage.getItem（自动 JSON 解析）。存储层见 ../storage（只暴露 storage）。
 */

import type { SchedulerSchedule, SchedulerTask } from '../types'
import { randomUUID } from 'node:crypto'
import { NAME_MAX_LENGTH, PROMPT_MAX_LENGTH } from '../constants'
import { storage } from '../storage'
import { localTimeZone, nextOccurrence, validateSchedule } from './schedule'
import { withStateLock } from './state-lock'

/** 任务创建入参。 */
export interface TaskInput {
  name: string
  schedule: SchedulerSchedule
  prompt: string
  recommendationId?: string
  workspaceId?: string
  permission?: string
  provider?: string
  model?: string
  reasoningEffort?: string
  enabled?: boolean
}

/** 从输入构建任务对象（含 id/时间戳/nextRunAt）。 */
export function buildTask(input: TaskInput): SchedulerTask {
  const now = new Date()
  const schedule = input.schedule
  // 时间戳缺省用宿主本地时区；interval/custom 以创建时刻作为固定锚点。
  const anchoredSchedule = (schedule.kind === 'interval' || schedule.kind === 'custom') && !schedule.anchor
    ? { ...schedule, anchor: now.toISOString() }
    : schedule
  const timeZone = typeof anchoredSchedule.timeZone === 'string' && anchoredSchedule.timeZone
    ? anchoredSchedule.timeZone
    : localTimeZone()
  const normalized: SchedulerSchedule = { ...anchoredSchedule, timeZone } as SchedulerSchedule
  const next = nextOccurrence(normalized, now.getTime())
  return {
    id: `task-${randomUUID()}`,
    name: input.name.trim(),
    schedule: normalized,
    prompt: input.prompt,
    recommendationId: input.recommendationId || undefined,
    workspaceId: input.workspaceId || undefined,
    permission: input.permission || undefined,
    provider: input.provider || undefined,
    model: input.model || undefined,
    reasoningEffort: input.reasoningEffort || undefined,
    enabled: input.enabled ?? true,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    nextRunAt: next === undefined ? undefined : new Date(next).toISOString(),
  }
}

/** 校验创建/更新入参，返回错误信息或 null。 */
export function validateTaskInput(input: unknown): string | null {
  if (typeof input !== 'object' || input === null)
    return '请求体必须是对象'
  const value = input as Partial<TaskInput>
  if (typeof value.name !== 'string' || value.name.trim() === '')
    return '任务名称不能为空'
  if (value.name.trim().length > NAME_MAX_LENGTH)
    return `任务名称不能超过 ${NAME_MAX_LENGTH} 个字符`
  if (typeof value.prompt !== 'string' || value.prompt.trim() === '')
    return '任务指令不能为空'
  if (value.prompt.length > PROMPT_MAX_LENGTH)
    return `任务指令不能超过 ${PROMPT_MAX_LENGTH} 个字符`
  if (!validateSchedule(value.schedule))
    return '计划配置无效'
  return null
}

function isTask(value: unknown): value is SchedulerTask {
  return typeof value === 'object' && value !== null
    && typeof (value as SchedulerTask).id === 'string'
    && typeof (value as SchedulerTask).name === 'string'
    && typeof (value as SchedulerTask).prompt === 'string'
    && typeof (value as SchedulerTask).enabled === 'boolean'
    && validateSchedule((value as SchedulerTask).schedule)
}

async function readTasks(): Promise<SchedulerTask[]> {
  const raw = await storage.getItem<{ tasks?: unknown[] }>('tasks')
  return Array.isArray(raw?.tasks) ? raw.tasks.filter(isTask) : []
}

async function writeTasks(tasks: SchedulerTask[]): Promise<void> {
  await storage.setItem('tasks', `${JSON.stringify({ version: 1, tasks }, null, 2)}\n`)
}

/** 读取全部任务（保持持久化顺序）。 */
export async function getAllTask(): Promise<SchedulerTask[]> {
  return readTasks()
}

/** 读取单个任务；不存在返回 undefined。 */
export async function getTask(id: string): Promise<SchedulerTask | undefined> {
  return (await readTasks()).find(task => task.id === id)
}

/** 新建任务。返回 [ok, task|error]。 */
export async function createTask(input: TaskInput): Promise<{ ok: true, task: SchedulerTask } | { ok: false, error: string }> {
  const invalid = validateTaskInput(input)
  if (invalid !== null)
    return { ok: false, error: invalid }
  const task = buildTask(input)
  await withStateLock(async () => {
    const tasks = await readTasks()
    tasks.push(task)
    await writeTasks(tasks)
  })
  return { ok: true, task }
}

/** 更新任务（合并语义；undefined 字段保持不变，id 不变）。 */
export async function updateTask(
  id: string,
  patch: Partial<TaskInput>,
): Promise<{ ok: true, task: SchedulerTask } | { ok: false, error: string }> {
  return withStateLock(async () => {
    const tasks = await readTasks()
    const current = tasks.find(task => task.id === id)
    if (!current)
      return { ok: false, error: '任务不存在' }
    const merged: TaskInput = {
      name: patch.name ?? current.name,
      schedule: patch.schedule ?? current.schedule,
      prompt: patch.prompt ?? current.prompt,
      recommendationId: patch.recommendationId === undefined ? current.recommendationId : patch.recommendationId,
      workspaceId: patch.workspaceId === undefined ? current.workspaceId : patch.workspaceId,
      permission: patch.permission === undefined ? current.permission : patch.permission,
      provider: patch.provider === undefined ? current.provider : patch.provider,
      model: patch.model === undefined ? current.model : patch.model,
      reasoningEffort: patch.reasoningEffort === undefined ? current.reasoningEffort : patch.reasoningEffort,
      enabled: patch.enabled ?? current.enabled,
    }
    const invalid = validateTaskInput(merged)
    if (invalid !== null)
      return { ok: false, error: invalid }
    const task = { ...buildTask(merged), id: current.id }
    const index = tasks.findIndex(item => item.id === id)
    tasks[index] = task
    await writeTasks(tasks)
    return { ok: true, task }
  })
}

/** 启用/暂停。返回 [ok, task|error]。 */
export async function setTaskEnabled(id: string, enabled: boolean): Promise<{ ok: true, task: SchedulerTask } | { ok: false, error: string }> {
  return withStateLock(async () => {
    const tasks = await readTasks()
    const task = tasks.find(item => item.id === id)
    if (!task)
      return { ok: false, error: '任务不存在' }
    task.enabled = enabled
    task.updatedAt = new Date().toISOString()
    if (enabled && task.nextRunAt === undefined) {
      const next = nextOccurrence(task.schedule, Date.now())
      if (next !== undefined)
        task.nextRunAt = new Date(next).toISOString()
    }
    await writeTasks(tasks)
    return { ok: true, task }
  })
}

/** 回写任务的执行时间字段（引擎每次运行结束后更新 lastRunAt/nextRunAt）。 */
export async function updateTaskTimes(
  id: string,
  state: Partial<Pick<SchedulerTask, 'lastRunAt' | 'nextRunAt' | 'updatedAt'>>,
): Promise<void> {
  await withStateLock(async () => {
    const tasks = await readTasks()
    const task = tasks.find(item => item.id === id)
    if (!task)
      return
    task.lastRunAt = state.lastRunAt
    task.nextRunAt = state.nextRunAt
    task.updatedAt = state.updatedAt ?? new Date().toISOString()
    await writeTasks(tasks)
  })
}

/** 删除任务（保留执行历史，任务名快照已存在）。返回 [ok | error]。 */
export async function deleteTask(id: string): Promise<{ ok: true } | { ok: false, error: string }> {
  return withStateLock(async () => {
    const tasks = await readTasks()
    const index = tasks.findIndex(task => task.id === id)
    if (index === -1)
      return { ok: false, error: '任务不存在' }
    tasks.splice(index, 1)
    await writeTasks(tasks)
    return { ok: true }
  })
}
