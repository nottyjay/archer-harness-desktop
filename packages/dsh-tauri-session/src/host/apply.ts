/**
 * host/apply.ts — 归档插件装配：旧版归档迁移 + HTTP 路由注册。
 * 迁移/路由均挂 effect（插件卸载即清理）；归档状态钩子（archive:added 等）
 * 由 archive.ts 在业务操作内触发，见 host/hooks.ts。
 */

import type { HostContext, PluginConfig } from './types'
import { SESSION_PLUGIN_NAME } from '../shared/constants'
import { buildRoutes } from './routes'
import { migrateLegacyArchive } from './service/archive'

/**
 * 插件体：迁移旧版归档 + 注册 HTTP 路由。
 * @param ctx - 宿主根上下文（注入 webServer/sessions/workspaceRegistry）。
 * @param config - 插件行配置（保留；存储路径由 storage 单例按 DSH_HOME 解析）。
 */
export function apply(ctx: HostContext, _config: PluginConfig = {}): void {
  // 旧版自持归档一次性迁入宿主集合（幂等：文件不存在或为空则直接跳过）。
  ctx.effect(() => {
    void migrateLegacyArchive(ctx)
  }, `${SESSION_PLUGIN_NAME}: migrate legacy archive`)

  // HTTP 路由注册（客户端经此调用 archived/archive/unarchive/delete/clear）。
  ctx.effect(() => {
    const disposers = buildRoutes(ctx).map(route => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers)
        dispose()
    }
  }, `${SESSION_PLUGIN_NAME}: routes`)
}
