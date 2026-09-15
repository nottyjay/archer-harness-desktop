/**
 * components/action-item.tsx — 面板区条目（样式/折叠/active 态全宿主，
 * 子插件只填内容与行为）。
 *
 * 纯展示组件：active 态经 usePanelViewId 订阅替换状态。
 */

import type { ReactElement } from 'react'
import type { PanelActionItemProps } from '../types'
import { useMountStyle } from 'dsh-tauri-ui/client'
import { ACTION_ITEM_STYLE_ID, PANEL_DATA_ATTRIBUTES } from '../constants'
import { usePanelViewId } from '../hooks/panel'
import actionItemStyle from './action-item.cssr'

export function PanelActionItem({ id, icon, onClick, children }: PanelActionItemProps): ReactElement {
  const active = usePanelViewId()?.id === id
  useMountStyle(actionItemStyle, ACTION_ITEM_STYLE_ID)
  return (
    <button
      type="button"
      className={active ? 'dshp-panel__menu-item dshp-panel__menu-item--selected' : 'dshp-panel__menu-item'}
      {...{ [PANEL_DATA_ATTRIBUTES.action]: '' }}
      onClick={onClick}
    >
      {icon !== undefined && <span className="dshp-panel__menu-item-icon">{icon}</span>}
      <span className="dshp-panel__menu-item-label">{children}</span>
    </button>
  )
}
