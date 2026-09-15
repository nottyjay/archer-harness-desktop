import type { IconComponent } from 'dsh-tauri-ui/client'
import type { ReactElement } from 'react'
import type { ScheduleForm, TaskFormState, TaskView, Translate } from '../types'
import { Calendar, Icon, useMountStyle } from 'dsh-tauri-ui/client'
import { RECOMMENDATIONS_STYLE_ID } from '../constants'
import { applyCreateTask } from '../service/scheduler'
import { recommendationMatchesTask } from '../utils/recommendations'
import { describeSchedule } from '../utils/schedule'
import recommendationsStyle from './recommendations.cssr'

/**
 * components/recommendations.tsx — 推荐（预置）定时任务，展示在任务列表下方。
 *
 * 推荐消费状态由任务记录中的 recommendationId 持久化承载；对旧版本创建的任务，
 * 仍用名称、计划和指令做兼容匹配。这样刷新页面或重新打开面板时，已添加项不会回到列表。
 */

type IconLike = IconComponent

export interface Recommendation {
  id: string
  nameKey: string
  promptKey: string
  schedule: ScheduleForm
  accent: string
  icon: IconLike
  /** 构造可直接创建的表单（名称/计划/指令，其余取默认）。 */
  form: (t: Translate) => TaskFormState
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'weekly-review',
    nameKey: 'recReviewName',
    promptKey: 'recReviewPrompt',
    schedule: { kind: 'weekly', weekdays: ['FR'], time: '16:00' },
    accent: '#8B6FF0',
    icon: Calendar,
    form: t => ({ name: t('recReviewName'), schedule: { kind: 'weekly', weekdays: ['FR'], time: '16:00' }, prompt: t('recReviewPrompt'), workspaceId: '', permission: 'read-only', provider: '', model: '', reasoningEffort: '' }),
  },
  {
    id: 'weekday-briefing',
    nameKey: 'recWeekdayBriefingName',
    promptKey: 'recWeekdayBriefingPrompt',
    schedule: { kind: 'workdays', time: '08:00' },
    accent: '#3D9A80',
    icon: Calendar,
    form: t => ({ name: t('recWeekdayBriefingName'), schedule: { kind: 'workdays', time: '08:00' }, prompt: t('recWeekdayBriefingPrompt'), workspaceId: '', permission: 'read-only', provider: '', model: '', reasoningEffort: '' }),
  },
]

export interface RecommendationsProps {
  t: Translate
  tasks: TaskView[]
}

/** 推荐（预置）定时任务列表：点击直接创建，成功后该项从任务列表中消失。 */
export function Recommendations({ t, tasks }: RecommendationsProps): ReactElement {
  useMountStyle(recommendationsStyle, RECOMMENDATIONS_STYLE_ID)
  async function add(rec: Recommendation): Promise<void> {
    const form = rec.form(t)
    await applyCreateTask({
      name: form.name,
      schedule: form.schedule,
      prompt: form.prompt,
      workspaceId: form.workspaceId || undefined,
      recommendationId: rec.id,
      enabled: false,
    })
  }

  const visible = RECOMMENDATIONS.filter(rec => !tasks.some(task => recommendationMatchesTask(rec, task, t)))

  return (
    <section className="dshp-scheduler__recs" aria-label={t('recommended')}>
      <h2 className="dshp-scheduler__recs-title">{t('recommended')}</h2>
      {visible.length === 0
        ? <p className="dshp-scheduler__muted">{t('recommendedEmpty')}</p>
        : (
            <ul className="dshp-scheduler__recs-list">
              {visible.map(rec => (
                <li key={rec.id}>
                  <button type="button" className="dshp-scheduler__recs-item" onClick={() => void add(rec)}>
                    <span className="dshp-scheduler__recs-icon" style={{ color: rec.accent }}>
                      <Icon as={rec.icon} />
                    </span>
                    <span className="dshp-scheduler__recs-body">
                      <span className="dshp-scheduler__recs-name">
                        {t(rec.nameKey)}
                        {' '}
                        <span style={{ color: 'var(--dsw-alias-label-tertiary)' }}>{describeSchedule(rec.schedule, t)}</span>
                      </span>
                      <span className="dshp-scheduler__recs-prompt">{t(rec.promptKey)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
    </section>
  )
}
