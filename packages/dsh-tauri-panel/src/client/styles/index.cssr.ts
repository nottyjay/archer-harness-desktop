import { cssr } from 'dsh-tauri-ui/client'

const { c, bem: { b, e } } = cssr

/** 跨组件通用的「分区标题行」（侧栏 ActionItem 区域标题，折叠时隐藏）。 */
export default b('panel', [
  e('section-header', {
    boxSizing: 'border-box',
    height: '36px',
    color: 'var(--dsw-alias-label-tertiary)',
    borderRadius: '12px',
    flex: 'none',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '4px',
    paddingLeft: '8px',
    display: 'flex',
    overflow: 'hidden',
  }),
  e('section-header-title', {
    whiteSpace: 'nowrap',
    opacity: 1,
    visibility: 'visible',
    minWidth: 0,
    maxWidth: '45%',
    transition: 'max-width .18s var(--ds-ease-in-out), margin-right .18s var(--ds-ease-in-out), opacity .12s var(--ds-ease-in-out), transform .18s var(--ds-ease-in-out), visibility 0s linear',
    flex: 'none',
    lineHeight: '20px',
    overflow: 'hidden',
  }),
  c('.dshp-panel--collapsed .dshp-panel__section-header-title', { opacity: 0, visibility: 'hidden', maxWidth: 0 }),
])
