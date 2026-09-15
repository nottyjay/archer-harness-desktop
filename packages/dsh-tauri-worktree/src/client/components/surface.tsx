import type { ReactElement } from 'react'
import type { SurfaceBarProps } from '../types'
import { CircleTree, Icon, useMountStyle } from 'dsh-tauri-ui/client'
/**
 * surface.tsx — 聊天框正上方、仅会话内容区内的工作树状态条。
 *
 * 职责拆分：slot 注册在 register/surface.ts，样式在 styles.ts。
 */
import { useState } from 'react'
import { SURFACE_STYLE_ID } from '../constants'
import { text, useLocale } from '../locales'
import { patchSession, useWorktreeSession } from '../store'
import surfaceStyle from './surface.cssr'

export function WorktreeSurface({ sessionId }: SurfaceBarProps): ReactElement | null {
  useMountStyle(surfaceStyle, SURFACE_STYLE_ID)
  useLocale()
  const state = useWorktreeSession(sessionId)
  const [logOpen, setLogOpen] = useState(false)

  if (state.phase === 'idle' || state.mode === 'local')
    return null

  const creating = state.phase === 'creating'
  const deleting = state.phase === 'deleting'
  const failed = state.phase === 'error'
  const bound = state.mode === 'worktree'
  const label = creating
    ? state.loadingLabel || text('progressCreating')
    : deleting
      ? text('progressDeleting')
      : failed
        ? `${text('progressError')}${state.error ? `: ${state.error}` : ''}`
        : text('surfaceWorktree')

  return (
    <div className="dshp-worktree">
      <div className="dshp-worktree__surface">
        <div className="dshp-worktree__surface-bar" data-dsh-worktree-surface={sessionId}>
          <Icon as={CircleTree} size={14} />
          <div className="dshp-worktree__surface-content">
            <span className="dshp-worktree__surface-label">
              {label}
              {creating && `...`}
            </span>
            {bound && state.log.length > 0 && (
              <button type="button" className={`${'dshp-worktree__action'} ${'dshp-worktree__action--log'}`} onClick={() => setLogOpen(value => !value)}>
                {text('progressViewLogs')}
              </button>
            )}
          </div>
          <span className="dshp-worktree__spacer" />
          {bound && !deleting && (
            <>
              <button type="button" className="dshp-worktree__action" onClick={() => patchSession(sessionId, { checkoutOpen: true })}>
                {text('surfaceCheckout')}
              </button>
              <button type="button" className={`${'dshp-worktree__action'} ${'dshp-worktree__action--danger'}`} onClick={() => patchSession(sessionId, { abandonOpen: true })}>
                {text('surfaceAbandon')}
              </button>
            </>
          )}
        </div>
        <Logs log={state.log} open={logOpen} />
      </div>
    </div>
  )
}

export function Logs({ log, open }: { log: string[], open: boolean }): ReactElement {
  return (
    <div
      aria-hidden={!open}
      className={`${'dshp-worktree__logs'} ${open ? 'dshp-worktree__logs--open' : ''}`}
    >
      <div className="dshp-worktree__logs-inner">
        <div className="dshp-worktree__logs-panel">
          {log.map((line, index) => <div key={`${index}:${line}`} className="dshp-worktree__log-line">{line}</div>)}
        </div>
      </div>
    </div>
  )
}
