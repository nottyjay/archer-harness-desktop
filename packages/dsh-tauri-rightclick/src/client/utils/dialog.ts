/** dialog.ts — lightweight toast notifications for context-menu actions. */
import { TOAST_DURATION_MS } from '../constants'

/** Toast 展示：同一时刻只保留一条，自动消失。 */
export function toast(message: string): void {
  document.querySelector(`.${'dshp-toast'}`)?.remove()
  const node = document.createElement('div')
  node.className = 'dshp-toast'
  node.textContent = message
  document.body.appendChild(node)
  setTimeout(() => node.remove(), TOAST_DURATION_MS)
}
