/**
 * register/panel.tsx — 调度器面板的 slot 注册。
 *
 * 走 **官方全局面板协议**（0.1.5-rc.1 起）：`panel.protocol.registerPanel` 由宿主
 * 代注册 `sidebar.panellist`（入口行）+ `main`（内容），选中态由官方
 * `ctx.layout.selectPanel` 统一派发。旧核心宿主内部回退到私有槽 + 会话区替换。
 * 完整契约见 dsh-tauri-panel/PROTOCOL.md。
 *
 * 注册逻辑与组件分离：这里只负责「等宿主协议就绪 → 一次性注册」，含 50ms 重试等待
 * （宿主 apply 与插件 apply 的先后由客户端加载器决定）。UI 在
 * components/scheduler-panel.tsx。
 */

import type { ReactElement } from 'react'
import type { PanelProtocol, SchedulerClientContext, Translate } from '../types'
import { Calendar, Icon } from 'dsh-tauri-ui/client'
import { SchedulerPanel } from '../components/scheduler-panel'
import {
  LOCALE_NAMESPACE,
  PANEL_ACTION_ORDER,
  PANEL_ID,
  PANEL_PROTOCOL_NAME,
  PANEL_SLOT_NAME,
  PROTOCOL_RETRY_MS,
} from '../constants'
import { setChatPrefill } from '../prefill'
import { hydrateScheduler } from '../service/scheduler'

export function registerSchedulerPanel(ctx: SchedulerClientContext, t: Translate): void {
  ctx.slots.inject(PANEL_SLOT_NAME as never, () => {
    let registration: (() => void) | undefined
    let retryTimer: number | undefined

    const attemptRegistration = (): void => {
      if (registration)
        return
      const protocol = ctx.reflect.get(PANEL_PROTOCOL_NAME) as PanelProtocol | undefined
      if (typeof protocol?.registerPanel !== 'function')
        return
      // 「通过 Chat 创建」：照搬 dsh-automation 的 setChatPrefill + 关闭面板回到会话。
      const Content = (): ReactElement => (
        <SchedulerPanel
          t={t}
          onViaChat={() => {
            setChatPrefill(t('chatPrompt'))
            protocol.closePanelContent?.()
          }}
        />
      )
      registration = protocol.registerPanel({
        id: PANEL_ID,
        order: PANEL_ACTION_ORDER,
        locale: LOCALE_NAMESPACE,
        label: () => t('scheduler'),
        icon: <Icon as={Calendar} />,
        render: Content,
      })
      if (retryTimer !== undefined) {
        window.clearInterval(retryTimer)
        retryTimer = undefined
      }
      void hydrateScheduler()
    }

    attemptRegistration()
    if (!registration)
      retryTimer = window.setInterval(attemptRegistration, PROTOCOL_RETRY_MS)
    return () => {
      if (retryTimer !== undefined)
        window.clearInterval(retryTimer)
      registration?.()
    }
  })
}
