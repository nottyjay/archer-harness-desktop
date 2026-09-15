/**
 * components/runs-tab.tsx — 执行记录 tab：按开始时间倒序的 run 列表。
 */

import type { ReactElement } from 'react'
import type { RunView, Translate } from '../types'
import { useMountStyle } from 'dsh-tauri-ui/client'
import { RUNS_TAB_STYLE_ID } from '../constants'
import { formatLocalTime } from '../utils/schedule'
import runsTabStyle from './runs-tab.cssr'

export interface RunsTabProps {
  t: Translate
  runs: RunView[]
  onDelete: (id: string) => void
}

function statusKey(t: Translate, status: RunView['status']): string {
  switch (status) {
    case 'succeeded': return t('succeeded')
    case 'failed': return t('failed')
    case 'interrupted': return t('interrupted')
    case 'skipped': return t('skipped')
    case 'cancelled': return t('cancelled')
    case 'queued': return t('queued')
    case 'running': return t('running')
  }
}

export function RunsTab({ t, runs, onDelete }: RunsTabProps): ReactElement {
  useMountStyle(runsTabStyle, RUNS_TAB_STYLE_ID)
  if (runs.length === 0)
    return <p className="dshp-scheduler__empty">{t('emptyRuns')}</p>
  return (
    <>
      <ul className="dshp-scheduler__runs-list">
        {runs.map(run => (
          <li key={run.id} className="dshp-scheduler__run-row">
            <div className="dshp-scheduler__run-main">
              <span className="dshp-scheduler__run-name" title={run.taskName}>{run.taskName}</span>
              {run.error ? <p className="dshp-scheduler__run-error">{run.error}</p> : null}
            </div>
            <div className="dshp-scheduler__run-meta">
              {run.status !== 'succeeded' && <span className="dshp-scheduler__chip" data-status={run.status}>{statusKey(t, run.status)}</span>}
              <span className="dshp-scheduler__run-time">{formatLocalTime(run.startedAt) ?? ''}</span>
              <button type="button" className="dshp-scheduler__run-delete" onClick={() => onDelete(run.id)} aria-label={t('deleteRun')}>{t('delete')}</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
