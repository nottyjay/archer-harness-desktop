import { cssr, styles as sharedStyles } from 'dsh-tauri-ui/client'

const { c } = cssr
const { secondary, tertiary, borderL2: border, hover, success } = sharedStyles

/** 执行记录（runs-tab.tsx）：行 + 状态 chip。 */
export default c([
  c('.dshp-scheduler__runs-toolbar', { display: 'flex', alignItems: 'center', gap: '8px' }),
  c('.dshp-scheduler__runs-list', { display: 'flex', flexDirection: 'column', gap: '6px', margin: '0', padding: '0', listStyle: 'none' }),
  c('.dshp-scheduler__run-row', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minWidth: '0', padding: '8px 12px', border: `1px solid ${border}`, borderRadius: '10px', background: 'transparent' }),
  c('.dshp-scheduler__run-row:hover', { background: hover }),
  c('.dshp-scheduler__run-main', { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }),
  c('.dshp-scheduler__run-meta', { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }),
  c('.dshp-scheduler__run-name', { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', lineHeight: '20px', fontWeight: '500' }),
  c('.dshp-scheduler__run-time', { color: tertiary, fontSize: '12px', lineHeight: '18px' }),
  c('.dshp-scheduler__run-delete', { border: 'none', background: 'transparent', color: tertiary, cursor: 'pointer', font: 'inherit', fontSize: '12px', padding: '2px 4px' }),
  c('.dshp-scheduler__run-delete:hover', { color: 'var(--dsw-alias-state-error-primary)' }),
  c('.dshp-scheduler__run-error', { margin: '0', fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-state-error-primary)' }),
  c('.dshp-scheduler__chip', { display: 'inline-flex', alignItems: 'center', minHeight: '20px', padding: '1px 8px', borderRadius: '999px', fontSize: '11px', lineHeight: '18px', background: 'var(--dsw-alias-interactive-bg-hover)' }),
  c('.dshp-scheduler__chip[data-status="succeeded"]', { color: success, background: 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)' }),
  c('.dshp-scheduler__chip[data-status="failed"]', { color: 'var(--dsw-alias-state-error-primary)', background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)' }),
  c('.dshp-scheduler__chip[data-status="running"],.dshp-scheduler__chip[data-status="queued"]', { color: secondary }),
])
