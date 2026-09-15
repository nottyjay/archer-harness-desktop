/**
 * register/extension-panel.tsx — 扩展面板的 slot 注册。
 *
 * 走 **官方全局面板协议**（0.1.5-rc.1 起）：`panel.protocol.registerPanel` 由宿主
 * 代注册 `sidebar.panellist`（入口行）+ `main`（内容），选中态由官方
 * `ctx.layout.selectPanel` 统一派发。旧核心宿主内部回退到私有槽 + 会话区替换。
 * 完整契约见 dsh-tauri-panel/PROTOCOL.md。
 *
 * 注册逻辑与组件分离：这里只负责「等宿主协议就绪 → 一次性注册」，含 50ms 重试等待。
 * UI 在 components/extension-panel.tsx。
 */

import type { ReactElement } from 'react'
import type { ExtensionClientContext, ExtensionRuntimeContext, PanelProtocol, Translate } from '../types'
import { Icon, Puzzle } from 'dsh-tauri-ui/client'
import { compat } from 'dsh-tauri/client'
import { ExtensionPanel } from '../components/extension-panel'
import { pendingPrefills } from '../config'
import {
  LOCALE_NAMESPACE,
  PANEL_ACTION_ORDER,
  PANEL_ID,
  PANEL_PROTOCOL_NAME,
  PANEL_SLOT_NAME,
  PROTOCOL_RETRY_MS,
} from '../constants'
import { chooseWorkspace } from '../utils/workspace'

export function registerExtensionPanel(ctx: ExtensionClientContext, t: Translate): void {
  ctx.slots.inject(PANEL_SLOT_NAME as never, () => {
    let registration: (() => void) | undefined
    let retryTimer: number | undefined

    const attemptRegistration = (): void => {
      if (registration)
        return
      const protocol = ctx.reflect.get(PANEL_PROTOCOL_NAME) as PanelProtocol | undefined
      if (typeof protocol?.registerPanel !== 'function')
        return
      const runtime = compat(ctx) as unknown as ExtensionRuntimeContext
      const createSkill = async (): Promise<void> => {
        const id = chooseWorkspace(runtime)
        if (id === undefined)
          throw new Error(t('workspaceUnavailable'))
        const sessionId = await runtime.workspaces.connectWorkspace?.(id)
        if (!sessionId)
          throw new Error(t('workspaceUnavailable'))
        pendingPrefills.add(sessionId)
        protocol.closePanelContent?.()
        runtime.sessions.open(sessionId)
      }
      const Content = (): ReactElement => (
        <ExtensionPanel
          t={t}
          createSkill={createSkill}
        />
      )
      registration = protocol.registerPanel({
        id: PANEL_ID,
        order: PANEL_ACTION_ORDER,
        locale: LOCALE_NAMESPACE,
        label: () => t('extension'),
        icon: <Icon as={Puzzle} />,
        render: Content,
      })
      if (retryTimer !== undefined) {
        window.clearInterval(retryTimer)
        retryTimer = undefined
      }
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
