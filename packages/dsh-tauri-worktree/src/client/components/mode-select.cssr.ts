import { cssr } from 'dsh-tauri-ui/client'

const { c } = cssr

/** 会话工作模式选择器（mode-select.tsx）：trigger + host 定位。 */
export default c([
  // 对齐官方 .Sh0Q9G_trigger（PermissionSelect.module.css）：min-width:0; max-width:220px;
  // height:28px; color:--dsw-alias-label-secondary; border-radius:24px; padding:0 4px 0 8px;
  // outline:none; font-size:13px; font-weight:500; line-height:20px; display:inline-flex;
  // align-items:center; gap:4px。label 用 ellipsis 收窄以避免溢出。
  c('.dshp-mode-select__trigger', {
    boxSizing: 'border-box',
    minWidth: 0,
    maxWidth: '220px',
    height: '28px',
    padding: '0 4px 0 8px',
    border: 'none',
    borderRadius: '24px',
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary)',
    fontFamily: 'var(--dsw-font-family, inherit)',
    fontSize: '13px',
    fontWeight: 500,
    lineHeight: '20px',
    cursor: 'pointer',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  }, [
    c('&:hover', { background: 'var(--dsw-alias-interactive-bg-hover)' }),
    c('&:focus-visible', { boxShadow: '0 0 0 2px var(--dsw-alias-border-l3)' }),
  ]),
  c('.dshp-mode-select__trigger.dshp-mode-select__trigger--open', { background: 'var(--dsw-alias-interactive-bg-hover)' }),
  c('.dshp-mode-select__label', { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  c('.dshp-mode-select__icon', { color: 'var(--dsw-alias-label-primary)', display: 'inline-flex', flex: 'none' }),
  c('.dshp-mode-select__chevron', { color: 'var(--dsw-alias-label-caption)', flex: 'none' }),
  // host 现在是 .tools 的直接 flex 子元素（gap 16px）；flex:none 防止长文案触发被压缩、
  // 以及部分浏览器对 inline-flex 的收缩行为导致控件宽度塌陷。
  c('.dshp-mode-select__host', { display: 'inline-flex', alignItems: 'center', flex: 'none' }),
  c('.dshp-mode-select__anchor', { display: 'none' }),
])
