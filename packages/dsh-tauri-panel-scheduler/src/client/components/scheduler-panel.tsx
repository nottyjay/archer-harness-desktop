/**
 * components/scheduler-panel.tsx — 定时任务面板主容器。
 *
 * 布局对齐 issue #307 的 ASCII 设计图：
 *   标题 + 副标题 → 工具栏（搜索 / 刷新 / 通过 Chat 创建 / 手动创建）
 *   → Tabs（定时任务 / 执行记录）→ 任务列表（单列）→ 推荐列表。
 * 控件用官方复刻样式：搜索 = 官方 input 类；按钮 = 36px 胶囊；刷新 = iconButton。
 * 数据经 schedulerStore（uSES）订阅，轮询由本组件生命周期驱动。
 */

import type { ReactElement } from 'react'
import type { SchedulerPanelProps, TaskFormState, TaskView } from '../types'
import { CommentPlus, Icon, Magnifier, Plus, useMountStyle } from 'dsh-tauri-ui/client'
import { useEffect, useState } from 'react'
import { REFRESH_INTERVAL_MS, SCHEDULER_PANEL_STYLE_ID } from '../constants'
import { applyDeleteRun, refreshScheduler } from '../service/scheduler'
import { useSchedulerState } from '../store'
import { describeSchedule, formatRelative, isTaskPaused } from '../utils/schedule'
import { Recommendations } from './recommendations'
import { RunsTab } from './runs-tab'
import schedulerPanelStyle from './scheduler-panel.cssr'
import { TaskCard } from './task-card'
import { TaskCreateDialog } from './task-create-dialog'

/** 对话框状态：手动创建（无 initial/taskId）、编辑（taskId + initial）、推荐（initial）。 */
type DialogState = { taskId?: string, initial?: TaskFormState } | null

/** 由任务视图构造编辑表单（去掉 timeZone 等宿主字段）。 */
function taskToForm(task: TaskView): TaskFormState {
  const schedule = { ...task.schedule }
  // ScheduleForm 不含 timeZone；仅保留 kind 相关字段。
  delete (schedule as Partial<typeof schedule> & { timeZone?: string }).timeZone
  return {
    name: task.name,
    schedule: schedule as TaskFormState['schedule'],
    prompt: task.prompt,
    workspaceId: task.workspaceId ?? '',
    permission: task.permission || 'read-only',
    provider: task.provider ?? '',
    model: task.model ?? '',
    // 编辑旧任务（无显式推理等级）时不预填。
    reasoningEffort: task.reasoningEffort || '',
  }
}

export function SchedulerPanel({ t, onViaChat }: SchedulerPanelProps): ReactElement {
  useMountStyle(schedulerPanelStyle, SCHEDULER_PANEL_STYLE_ID)
  const state = useSchedulerState()
  const [tab, setTab] = useState<'tasks' | 'runs'>('tasks')
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  // 相对「下次运行」以刷新时刻为基准，避免每次渲染抖动。
  const [now, setNow] = useState(() => Date.now())

  // 轮询刷新：任务下次运行时间与执行记录跟随；同时推进相对时间基准。
  useEffect(() => {
    void refreshScheduler(true)
    const timer = window.setInterval(() => {
      void refreshScheduler(false)
      setNow(Date.now())
    }, REFRESH_INTERVAL_MS)
    const refreshOnResume = (): void => {
      if (document.visibilityState === 'visible')
        void refreshScheduler(false)
    }
    document.addEventListener('visibilitychange', refreshOnResume)
    window.addEventListener('focus', refreshOnResume)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshOnResume)
      window.removeEventListener('focus', refreshOnResume)
    }
  }, [])

  const filtered = search
    ? state.tasks.filter(task => `${task.name} ${task.prompt}`.toLowerCase().includes(search.toLowerCase()))
    : state.tasks

  return (
    <div className="dshp-scheduler__shell">
      <header className="dshp-scheduler__top">
        <div className="dshp-scheduler__heading">
          <h1>{t('scheduler')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <div className="dshp-scheduler__toolbar">
          <div className="dshp-scheduler__search-wrap">
            <Icon as={Magnifier} className="dshp-scheduler__search-icon" />
            <input
              className="dshp-scheduler__input"
              type="search"
              aria-label={t('searchPlaceholder')}
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <div className="dshp-scheduler__toolbar-spacer" />
          <button className="dshp-scheduler__btn" type="button" onClick={onViaChat}>
            <Icon as={CommentPlus} />
            {t('viaChat')}
          </button>
          <button className={`${'dshp-scheduler__btn'} ${'dshp-scheduler__btn--primary'}`} type="button" onClick={() => setDialog({})}>
            <Icon as={Plus} />
            {t('createManual')}
          </button>
        </div>
      </header>

      <div className="dshp-scheduler__tabs" role="tablist" aria-label={t('scheduler')}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tasks'}
          className={tab === 'tasks' ? `${'dshp-scheduler__tab'} ${'dshp-scheduler__tab--active'}` : 'dshp-scheduler__tab'}
          onClick={() => setTab('tasks')}
        >
          {t('tasksTab')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'runs'}
          className={tab === 'runs' ? `${'dshp-scheduler__tab'} ${'dshp-scheduler__tab--active'}` : 'dshp-scheduler__tab'}
          onClick={() => setTab('runs')}
        >
          {t('runsTab')}
        </button>
      </div>

      {state.error ? <p className="dshp-scheduler__error" role="alert">{state.error}</p> : null}

      {tab === 'tasks'
        ? (
            <>
              {filtered.length === 0
                ? <p className="dshp-scheduler__empty">{search ? t('noMatch') : t('emptyTasks')}</p>
                : (
                    <ul className="dshp-scheduler__cards">
                      {filtered.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          t={t}
                          describe={describeSchedule(task.schedule, t)}
                          nextRun={task.enabled ? formatRelative(task.nextRunAt, now, t) : undefined}
                          paused={isTaskPaused(task)}
                          onEdit={task => setDialog({ taskId: task.id, initial: taskToForm(task) })}
                        />
                      ))}
                    </ul>
                  )}
              <Recommendations t={t} tasks={state.tasks} />
            </>
          )
        : (
            <RunsTab
              t={t}
              runs={state.runs}
              onDelete={id => void applyDeleteRun(id)}
            />
          )}

      {dialog
        ? <TaskCreateDialog t={t} options={state.options} initial={dialog.initial} taskId={dialog.taskId} onClose={() => setDialog(null)} />
        : null}
    </div>
  )
}
