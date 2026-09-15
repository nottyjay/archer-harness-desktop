/**
 * service/handle-post-mcp-restart.ts — 需要宿主配合的 API 处理：MCP 重启。
 *
 * 桌面端优先经宿主 `window.dshDesktop.restartSidecar` 重启 sidecar；Web 环境
 * 回退 HTTP 重启（连接会断开，宿主完成重启后恢复）。
 */
import { postRestart } from '../apis'

/** 触发 MCP 服务重启（桌面优先，HTTP 兜底）。 */
export async function handlePostMcpRestart(): Promise<void> {
  if (window.dshDesktop !== undefined) {
    window.dshDesktop.restartSidecar?.()
    return
  }
  try {
    await postRestart()
  }
  catch { /* The connection normally closes while the host restarts. */ }
}

/** 是否为桌面宿主（决定重启提示文案）。 */
export function isMcpDesktop(): boolean {
  return typeof window !== 'undefined' && window.dshDesktop !== undefined
}
