import { cssr, styles as sharedStyles } from 'dsh-tauri-ui/client'

const { c } = cssr
const { primary, secondary, tertiary, borderL2: border, hover } = sharedStyles

/** ModelPicker（model-picker.tsx，照搬 dsh-automation create-modal ModelPicker）。 */
export default c([
  c('.dshp-scheduler__model-select', { position: 'relative', zIndex: '1', minWidth: '0', flex: 'none', height: '28px' }),
  c('.dshp-scheduler__model-select--open', { zIndex: '30' }),
  c('.dshp-scheduler__model-trigger', { display: 'flex', alignItems: 'center', gap: '4px', minWidth: '0', maxWidth: '260px', height: '28px', padding: '0 4px 0 8px', border: '0', borderRadius: '24px', background: 'transparent', color: secondary, fontSize: '13px', fontWeight: '500', lineHeight: '20px', cursor: 'pointer' }),
  c('.dshp-scheduler__model-trigger:hover', { background: hover, color: primary }),
  c('.dshp-scheduler__model-trigger > span:first-child', { minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__model-trigger-effort', { flex: 'none', color: tertiary, whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__model-trigger-chevron', { flex: 'none', transition: 'transform .16s ease' }),
  c('.dshp-scheduler__model-trigger-chevron--open', { transform: 'rotate(180deg)' }),
  c('.dshp-scheduler__model-select-menu', { zIndex: '30', width: 'min(240px, calc(100vw - 32px))', maxHeight: 'min(360px, calc(100vh - 96px))', overflowY: 'auto', padding: '4px', border: `1px solid ${border}`, borderRadius: '12px', background: 'var(--dsw-specific-menu, var(--dsw-alias-bg-base))', boxShadow: 'var(--dsw-shadow-lv3)' }),
  c('.dshp-scheduler__model-select-menu--float', { position: 'absolute', zIndex: '1200', boxSizing: 'border-box' }),
  c('.dshp-scheduler__model-select-menu .dshp-scheduler__menu-row', { minHeight: '40px', padding: '0 10px', borderRadius: '10px', fontSize: '14px' }),
  c('.dshp-scheduler__model-select-menu .dshp-scheduler__menu-row.is-kv .dshp-scheduler__menu-row-side', { fontSize: '13px', color: tertiary }),
  c('.dshp-scheduler__model-group + .dshp-scheduler__model-group', { marginTop: '4px' }),
  c('.dshp-scheduler__model-group-title', { position: 'sticky', top: '0', zIndex: '1', padding: '5px 8px 3px', background: 'var(--dsw-specific-menu, var(--dsw-alias-bg-base))', color: tertiary, fontSize: '12px', fontWeight: '500', lineHeight: '18px' }),
  c('.dshp-scheduler__model-option', { display: 'flex', width: '100%', minHeight: '38px', alignItems: 'center', gap: '8px', padding: '6px 8px', border: '0', borderRadius: '10px', background: 'transparent', color: primary, textAlign: 'left', cursor: 'pointer' }),
  c('.dshp-scheduler__model-option:hover, .dshp-scheduler__model-option:focus-visible', { background: hover, outline: 'none' }),
  c('.dshp-scheduler__model-option-copy', { display: 'flex', minWidth: '0', flex: '1', flexDirection: 'column' }),
  c('.dshp-scheduler__model-name', { overflow: 'hidden', fontSize: '14px', fontWeight: '500', lineHeight: '20px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__model-description', { overflow: 'hidden', color: tertiary, fontSize: '12px', lineHeight: '18px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  c('.dshp-scheduler__model-check', { display: 'grid', flex: '0 0 18px', placeItems: 'center', color: primary }),
  c('.dshp-scheduler__model-warning', { margin: '4px', padding: '8px', borderRadius: '8px', background: 'var(--dsw-alias-interactive-bg-hover-danger, rgba(248,81,73,.1))', color: 'var(--dsw-alias-state-error-primary, #f85149)', fontSize: '12px', lineHeight: '18px' }),
  c('.dshp-scheduler__model-empty', { padding: '14px 12px', color: tertiary, fontSize: '12px', textAlign: 'center' }),
])
