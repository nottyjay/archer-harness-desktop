import { cssr, styles as sharedStyles } from 'dsh-tauri-ui/client'

const { c } = cssr
const { secondary, tertiary, borderL2: border, hover } = sharedStyles

/** 任务卡片（task-card.tsx）：名称/计划·下次运行 + 操作菜单。 */
export default c([
  c('.dshp-scheduler__card', { boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', width: '100%', minWidth: '0', height: '60px', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: '10px', background: 'transparent', color: 'inherit', font: 'inherit', fontSize: '13px', lineHeight: '20px', textAlign: 'left', cursor: 'pointer', overflow: 'hidden' }),
  c('.dshp-scheduler__card:hover', { background: hover }),
  c('.dshp-scheduler__card--paused', { opacity: '.6' }),
  c('.dshp-scheduler__card-title', { display: 'flex', alignItems: 'center', gap: '8px', margin: '0', fontSize: '13px', lineHeight: '18px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__card-icon', { flex: 'none', width: '16px', height: '16px', color: 'var(--dsw-alias-state-business-primary)' }),
  c('.dshp-scheduler__task-toggle', { flex: 'none', display: 'inline-flex', marginTop: '2px', fontSize: '16px', color: tertiary, cursor: 'pointer' }),
  c('.dshp-scheduler__task-toggle:hover', { color: secondary }),
  c('.dshp-scheduler__card-meta', { display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' }),
  c('.dshp-scheduler__card-meta-text', { flex: '1', minWidth: '0', color: tertiary, fontSize: '12px', lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__card-meta-text strong', { color: secondary, fontWeight: '600' }),
])
