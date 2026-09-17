/** 改这个常量应只刷新左下角角标，不应触发 Harness 整进程重启。 */
export const STAMP = 'v2'

export const name = 'dsh-hmr-client-probe'

type ClientCtx = {
  effect: (factory: () => () => void, label?: string) => void
}

export function apply(ctx: ClientCtx): void {
  ctx.effect(() => {
    const el = document.createElement('div')
    el.id = 'dsh-hmr-client-probe'
    el.textContent = `dsh-hmr-client-probe ${STAMP}`
    el.style.cssText = [
      'position:fixed',
      'left:12px',
      'bottom:12px',
      'z-index:2147483647',
      'padding:8px 12px',
      'border-radius:8px',
      'background:#111',
      'color:#7CFF6B',
      'font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace',
      'box-shadow:0 4px 16px rgba(0,0,0,.35)',
      'pointer-events:none',
    ].join(';')
    document.body.appendChild(el)
    return () => el.remove()
  }, 'dsh-hmr-client-probe: overlay')
}
