import { cssr, styles as sharedStyles } from 'dsh-tauri-ui/client'

const { c } = cssr
const { primary, secondary, tertiary, borderL2: border, hover } = sharedStyles

/** 推荐（预置）定时任务（recommendations.tsx）。 */
export default c([
  c('.dshp-scheduler__recs', { display: 'flex', flexDirection: 'column', gap: '8px', margin: '20px 0 0' }),
  c('.dshp-scheduler__recs-title', { margin: '0', fontSize: '13px', lineHeight: '20px', fontWeight: '600' }),
  c('.dshp-scheduler__recs-list', { display: 'flex', flexDirection: 'column', gap: '8px', margin: '0', padding: '0', listStyle: 'none' }),
  c('.dshp-scheduler__recs-item', { boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', minWidth: '0', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: '10px', background: 'transparent', color: 'inherit', font: 'inherit', fontSize: '13px', lineHeight: '20px', textAlign: 'left', cursor: 'pointer' }),
  c('.dshp-scheduler__recs-item:hover', { background: hover }),
  c('.dshp-scheduler__recs-icon', { flex: 'none', display: 'inline-flex', marginTop: '2px', fontSize: '16px' }),
  c('.dshp-scheduler__recs-body', { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }),
  c('.dshp-scheduler__recs-name', { color: primary, fontSize: '13px', lineHeight: '18px', fontWeight: '500' }),
  c('.dshp-scheduler__recs-name strong', { color: secondary, fontWeight: '600' }),
  c('.dshp-scheduler__recs-prompt', { color: tertiary, fontSize: '12px', lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__muted', { margin: '0', color: secondary, fontSize: '12px' }),
])
