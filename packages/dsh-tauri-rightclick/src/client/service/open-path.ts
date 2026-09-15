import { postOpenPath } from '../apis'
import { text } from '../locales'

/**
 * 资源管理器打开目录：走插件自家宿主路由（POST /api/dsh-rightclick-menu/open-path，
 * 由本插件 node half 注册），宿主侧在系统文件管理器中打开该目录。不依赖核心
 * Remote 服务，新旧核心均可用；也绕开 better-sidebar 对 workspaces.openPath 的
 * 包装——目录不会被侧边栏编辑器当文件打开（`xxx is a directory`）。
 */
export async function openInExplorer(path: string): Promise<void> {
  const result = await postOpenPath({ path })
  if (!result?.ok)
    throw new Error(text('openFailed', { reason: result?.error || text('unknownError') }))
}
