import { cssr } from 'dsh-tauri-ui/client'

const { bem: { b, e } } = cssr

/**
 * 变更计数（绿色 +N / 红色 -M）的共享样式。
 *
 * 变更卡片与「运行中」提示条都要渲染同一组计数（官方 deliverables 行也是这个配色），
 * 组件面无差异，故按仓库约定放在 `client/styles/`，由两个组件各自 useMountStyle 挂载
 * （mountStyle 对同一 CNode 引用计数，重复挂载安全）。
 */
export default b('turnrewind-counts', {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '6px',
  fontVariantNumeric: 'tabular-nums',
}, [
  e('add', { color: 'var(--dsw-alias-state-success-primary, #2f9e44)' }),
  e('del', { color: 'var(--dsw-alias-state-error-primary, #d93025)' }),
  e('binary', { color: 'var(--dsw-alias-label-secondary, var(--dsw-alias-label-primary))' }),
])
