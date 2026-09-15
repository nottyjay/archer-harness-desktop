/**
 * host/service/run.ts — 执行记录领域原语（crons 功能目录）。
 *
 * create / update / delete / get / getAll 执行记录 + 启动自愈；写操作在
 * 单写者队列内完成，读走 storage.getItem。
 */

import type { SchedulerRun } from '../types'
import { RUNS_HISTORY_LIMIT } from '../constants'
import { storage } from '../storage'
import { withStateLock } from './state-lock'

function isRun(value: unknown): value is SchedulerRun {
  return typeof value === 'object' && value !== null
    && typeof (value as SchedulerRun).id === 'string'
    && typeof (value as SchedulerRun).taskId === 'string'
    && typeof (value as SchedulerRun).taskName === 'string'
    && typeof (value as SchedulerRun).status === 'string'
    && typeof (value as SchedulerRun).startedAt === 'string'
    && typeof (value as SchedulerRun).scheduledFor === 'string'
}

async function readRuns(): Promise<SchedulerRun[]> {
  const raw = await storage.getItem<{ runs?: unknown[] }>('runs')
  return Array.isArray(raw?.runs) ? raw.runs.filter(isRun) : []
}

async function writeRuns(runs: SchedulerRun[]): Promise<void> {
  await storage.setItem('runs', `${JSON.stringify({ version: 1, runs }, null, 2)}\n`)
}

/** 读取全部执行记录。 */
export async function getAllRun(): Promise<SchedulerRun[]> {
  return readRuns()
}

/** 读取单条执行记录；不存在返回 undefined。 */
export async function getRun(id: string): Promise<SchedulerRun | undefined> {
  return (await readRuns()).find(run => run.id === id)
}

/** 追加一条执行记录并持久化。 */
export async function createRun(run: SchedulerRun): Promise<void> {
  await withStateLock(async () => {
    const runs = await readRuns()
    runs.push(run)
    await writeRuns(runs)
  })
}

/** 按 id 更新执行记录（保留最近 RUNS_HISTORY_LIMIT 条）。 */
export async function updateRun(id: string, patch: Partial<Omit<SchedulerRun, 'id'>>): Promise<void> {
  await withStateLock(async () => {
    const runs = await readRuns()
    const run = runs.find(item => item.id === id)
    if (!run)
      return
    Object.assign(run, patch)
    await writeRuns(runs.slice(-RUNS_HISTORY_LIMIT))
  })
}

/** 删除执行记录。返回 [ok | error]。 */
export async function deleteRun(id: string): Promise<{ ok: true } | { ok: false, error: string }> {
  return withStateLock(async () => {
    const runs = await readRuns()
    const index = runs.findIndex(run => run.id === id)
    if (index < 0)
      return { ok: false, error: '执行记录不存在' }
    runs.splice(index, 1)
    await writeRuns(runs)
    return { ok: true }
  })
}

/** 启动自愈：把上次进程中断留下的 running 记录标记为 failed（host_interrupted）。 */
export async function recoverInterruptedRuns(): Promise<void> {
  await withStateLock(async () => {
    const runs = await readRuns()
    let changed = false
    for (const run of runs) {
      // queued work was never started and can be resumed; only started work is interrupted.
      if (run.status === 'running') {
        run.status = 'interrupted'
        run.finishedAt = new Date().toISOString()
        run.error = run.error || 'host_interrupted'
        changed = true
      }
    }
    if (changed)
      await writeRuns(runs)
  })
}
