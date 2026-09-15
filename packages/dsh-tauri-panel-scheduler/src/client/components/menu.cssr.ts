import { cssr, styles as sharedStyles } from 'dsh-tauri-ui/client'

const { c } = cssr
const { secondary } = sharedStyles
/** menu 基础设施（menu.tsx，照搬 dsh-automation menu 样式值）。 */
export default c([
  c('.dshp-scheduler__menu-row', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%', padding: '8px 10px', border: '0', borderRadius: '10px', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__menu-row:hover, .dshp-scheduler__menu-row.is-on', { background: 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06))' }),
  c('.dshp-scheduler__menu-row.is-kv .dshp-scheduler__menu-row-main', { flex: 'none' }),
  c('.dshp-scheduler__menu-row.is-kv .dshp-scheduler__menu-row-side', { flex: '1', justifyContent: 'flex-end', minWidth: '0' }),
  c('.dshp-scheduler__menu-row-main', { display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }),
  c('.dshp-scheduler__menu-row-side', { display: 'flex', alignItems: 'center', gap: '8px', flex: 'none' }),
  c('.dshp-scheduler__menu-tick', { flex: 'none', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--dsw-alias-brand-primary)' }),
  c('.dshp-scheduler__menu-next', { flex: 'none', width: '6px', height: '6px', transform: 'rotate(45deg)', borderTop: '1.5px solid currentColor', borderRight: '1.5px solid currentColor' }),
  c('.dshp-scheduler__menu-float', { position: 'absolute', zIndex: '1200', boxSizing: 'border-box' }),
  c('.dshp-scheduler__menu-select', { position: 'relative', minWidth: '0', flex: 'none' }),
  c('.dshp-scheduler__menu-select-btn', { display: 'flex', alignItems: 'center', gap: '6px', minHeight: '28px', height: '28px', padding: '0 8px', border: '0', borderRadius: '8px', background: 'transparent', color: secondary, fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', cursor: 'pointer' }),
  c('.dshp-scheduler__menu-select-btn:hover', { background: 'rgba(255,255,255,.06)', color: 'var(--dsw-alias-label-primary)' }),
  c('.dshp-scheduler__menu-select-menu', { zIndex: '30', width: 'min(240px, calc(100vw - 32px))', maxHeight: 'min(360px, calc(100vh - 96px))', overflowY: 'auto', padding: '4px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '12px', background: 'var(--dsw-specific-menu, var(--dsw-alias-bg-base))', boxShadow: 'var(--dsw-shadow-lv3)' }),
  c('.dshp-scheduler__chip-btn', { display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '28px', height: '28px', padding: '0 8px', border: '0', borderRadius: '8px', background: 'transparent', color: secondary, fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', cursor: 'pointer' }),
  c('.dshp-scheduler__chip-btn:hover', { background: 'rgba(255,255,255,.06)', color: 'var(--dsw-alias-label-primary)' }),
])
