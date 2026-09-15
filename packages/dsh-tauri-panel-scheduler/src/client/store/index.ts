/**
 * store/index.ts — 调度器共享客户端状态（任务列表 + 执行记录 + 对话框选项）。
 *
 * 模块级 SnapshotStore 供面板各子组件订阅；刷新代际、动作编排与错误归一
 * 已迁移到 service/scheduler.ts，本文件只保留状态源与订阅。
 */

import type { RunView, SchedulerOptions, TaskView } from '../types'
import { createExternalStore } from 'dsh-tauri/client'
import { useSyncExternalStore } from 'react'

/** 面板 UI 状态。 */
export interface SchedulerUiState {
  tasks: TaskView[]
  runs: RunView[]
  options: SchedulerOptions
  loading: boolean
  error: string
  refreshedAt: number
}

/** 初始状态。 */
export function blankUiState(): SchedulerUiState {
  return {
    tasks: [],
    runs: [],
    options: { workspaces: [], permissions: [], defaultPermission: 'read-only', models: [], failures: [], defaultModel: null },
    loading: false,
    error: '',
    refreshedAt: 0,
  }
}

export const schedulerStore = createExternalStore<SchedulerUiState>(blankUiState())

/** 取当前状态快照。 */
export function selectSchedulerState(): SchedulerUiState {
  return schedulerStore.getSnapshot()
}

/** 组件内订阅调度器状态（uSES）。 */
export function useSchedulerState(): SchedulerUiState {
  return useSyncExternalStore(schedulerStore.subscribe, () => schedulerStore.getSnapshot())
}
