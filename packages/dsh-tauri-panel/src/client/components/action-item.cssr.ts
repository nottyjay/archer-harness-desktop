import { cssr } from 'dsh-tauri-ui/client'

const { c, bem: { b, e, m } } = cssr

/** 面板区条目（action-item.tsx）：菜单行 + 选中态。 */
export default b('panel', [
  e('menu-item', {
    boxSizing: 'border-box',
    appearance: 'none',
    cursor: 'pointer',
    userSelect: 'none',
    width: '100%',
    minWidth: 0,
    height: '34px',
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 8px',
    border: 0,
    borderRadius: '8px',
    overflow: 'hidden',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary)',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '22px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    transition: 'background-color .12s var(--ds-ease-in-out), color .12s var(--ds-ease-in-out)',
  }, [
    c('&:hover', { background: 'var(--dsw-alias-interactive-bg-hover)' }),
    c('&:focus-visible', { outline: '2px solid var(--dsw-alias-border-focus)', outlineOffset: '-2px' }),
    m('selected', { background: 'var(--dsw-alias-interactive-bg-hover)' }),
  ]),
  e('menu-item-icon', {
    boxSizing: 'border-box',
    flex: 'none',
    justifyContent: 'center',
    alignItems: 'center',
    display: 'inline-flex',
    fontSize: '16px',
  }),
  e('menu-item-label', {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: '0 6px 0 0',
  }),
])
