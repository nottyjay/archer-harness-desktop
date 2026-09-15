/** types/protocol.ts — 扩展面板协议类型（panel.protocol 服务面 + 注入面）。 */

import type { ClientContext } from 'dsh-tauri/client'
import type { ComponentType, ReactElement, ReactNode } from 'react'

export interface IconProps {
  size?: number
  className?: string
}

export interface Translate {
  (key: string): string
}

export interface ExtensionLocaleService {
  register: (namespace: string, locale: string, dictionary: Record<string, string>) => () => void
  bind: (namespace: string) => Translate
}

export type ExtensionClientContext = ClientContext & { locale: ExtensionLocaleService }

export interface PanelContentSpec {
  id: string
  render: ComponentType<{ t?: Translate }>
  locale?: string
}

export interface PanelActionItemProps {
  id: string
  icon?: ReactElement
  onClick?: () => void
  children?: ReactNode
}

/**
 * panel.protocol 的一次性面板注册入参（宿主按核心版本代注册官方全局面板）。
 * 完整契约见 dsh-tauri-panel/PROTOCOL.md。
 */
export interface PanelRegistration {
  /** 面板唯一标识；同时用作 `main` 的 key。 */
  id: string
  /** 展示文案；thunk 读时求值，跟随语言切换而无需重新注册。 */
  label: string | (() => string)
  /** 面板本体。 */
  render: ComponentType<{ t?: Translate }>
  /** 面板本体文案命名空间。 */
  locale?: string
  /** 条目图标。 */
  icon?: ReactElement
  /** 清单排序位，升序。 */
  order?: number
}

export interface PanelProtocol {
  ActionItem: (props: PanelActionItemProps) => ReactElement
  renderPanelContent: (spec: PanelContentSpec) => void
  closePanelContent: () => void
  /**
   * 注册一个全局面板（图标 + 内容），返回注销句柄。
   * （可选：老版本宿主无此字段，消费方探测后再用。）
   */
  registerPanel?: (entry: PanelRegistration) => () => void
  /** ≥0.1.5-rc.1：报告右侧栏占不占 track / 是否全屏。（可选。） */
  openRightPanel?: (track: boolean, fullscreen: boolean) => void
  /** ≥0.1.5-rc.1：报告右侧栏隐藏。（可选。） */
  closeRightPanel?: () => void
}
