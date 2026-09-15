import type { ClientContext, WorkspaceId } from 'dsh-tauri/client'
import type { PanelListService } from '../service/panel-list'
import { resolveStartSession } from 'dsh-tauri/client'
import { SidebarRootClone } from '../components/sidebar'
import { PANEL_ACTION_SLOT } from '../constants'
import { NS } from '../locales'

/**
 * register/sidebar.ts — sidebar 槽整槽替换的安装器（priority -1 shadow 官方
 * ui-sidebar）；克隆组件见 components/sidebar.tsx。
 *
 * 等待 sidebar 槽声明（layout 的 AppFrame renderSlot("sidebar")）后，以
 * priority -1 shadow 官方 ui-sidebar 条目；children 仅声明新增的
 * sidebar.panel.action 协议槽（官方子槽由被 shadow 的官方条目声明，克隆经
 * <SlotOutlet> 渲染）。
 *
 * inject 向克隆注入：
 *   - `startSession`：新会话（跨核心版本的能力探测见 resolveStartSession）；
 *   - `toggleSidebar`：折叠开关（ctx.layout）；
 *   - `selectPanel`：官方全局面板选中（ctx.layout.selectPanel，≥0.1.5-rc.1；
 *     旧核心缺席时降级为 no-op——该核心也没有 panellist 槽，行不会渲染）；
 *   - `panels`：官方 `sidebar.panellist` 的行投影 store（见 service/panel-list.ts）。
 *
 * 框架标准 prop `usePanelInfo`（选中态）由 root hook 自动合成，无需 inject。
 * @param ctx - 客户端根上下文。
 * @param panelList - 官方全局面板行投影服务。
 */
export function registerSidebarRoot(ctx: ClientContext, panelList: PanelListService): void {
  ctx.slots.inject('sidebar' as never, () =>
    ctx.slots.register(
      {
        name: 'sidebar',
        id: 'dsh-tauri-panel',
        priority: -1,
        locale: NS,
        children: {
          [PANEL_ACTION_SLOT]: { kind: 'list', scope: 'root' },
        },
        inject: () => ({
          startSession: (workspaceId?: WorkspaceId) => {
            const start = resolveStartSession(ctx)
            if (start === undefined) {
              console.error('[dsh-tauri-panel] new session unavailable: no workspace navigation service')
              return
            }
            void start(workspaceId)
          },
          toggleSidebar: () => ctx.layout.toggleSidebar(),
          selectPanel: (panelId: string | null) => {
            // 旧核心没有全局面板：静默忽略，绝不向 ctx.layout 断言方法存在。
            ctx.layout.selectPanel?.(panelId)
          },
          panels: panelList.store,
        }),
      } as never,
      SidebarRootClone,
    ))
}
