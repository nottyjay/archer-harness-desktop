/**
 * components/panel-row.tsx — 官方全局面板（`sidebar.panellist`）的单行入口。
 *
 * 语义逐条对齐官方 ui-sidebar 的 `PanelRow`：
 *   - 每行**只订阅自己的选中态**（`usePanelInfo(info => info.activePanelId === id)`），
 *     避免整列随任意面板切换而重渲染；
 *   - 图标经槽内过滤取自己那一条（`opts.only = id`），ownerProps 传 `{ size, active }`；
 *   - 点击调宿主注入的 `selectPanel(id)`；
 *   - 折叠 rail 态用 tooltip 暴露文案（wide 态文案已在行内可见）。
 *
 * 与私有协议条目（`components/action-item.tsx`）共用 `.dshp-panel__menu-item` 行样式，
 * 保证两套协议在视觉上是同一份面板区。
 */

import type { ReactElement } from 'react'
import type { PanelInfo, UsePanelInfo } from '../types'
import { SlotOutlet } from '@deepseek-ai/dsh-client-ui-renderer'
import { PANEL_DATA_ATTRIBUTES, PANEL_LIST_ICON_SIZE_RAIL, PANEL_LIST_ICON_SIZE_WIDE, PANEL_LIST_SLOT } from '../constants'

/**
 * 旧核心没有 `panelInfo` root hook → 框架不合成 `usePanelInfo`。此时 panellist 清单
 * 恒为空、本行不会渲染；这个兜底只为保持 Hook 调用的**无条件性**（只切换被调用的
 * 函数），运行时返回 false，符合「没有全局面板选中态」的事实。
 */
const noPanelInfo: UsePanelInfo = () => false as never

export interface PanelRowProps {
  /** 面板 id（同时是 `main` 槽的 key）。 */
  id: string
  /** 已解析的展示文案。 */
  label: string
  /** wide 态（决定图标边长与是否渲染行内文案）。 */
  wide: boolean
  /** 框架标准 prop；旧核心缺席。 */
  usePanelInfo?: UsePanelInfo
  /** 选中该面板（inject：ctx.layout.selectPanel）。 */
  selectPanel: (id: string) => void
}

export function PanelRow({ id, label, wide, usePanelInfo, selectPanel }: PanelRowProps): ReactElement {
  const active = (usePanelInfo ?? noPanelInfo)((info: PanelInfo) => info.activePanelId === id)
  const size = wide ? PANEL_LIST_ICON_SIZE_WIDE : PANEL_LIST_ICON_SIZE_RAIL

  return (
    <button
      type="button"
      className={active ? 'dshp-panel__menu-item dshp-panel__menu-item--selected' : 'dshp-panel__menu-item'}
      {...{ [PANEL_DATA_ATTRIBUTES.panelRow]: id }}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      title={wide ? undefined : label}
      onClick={() => selectPanel(id)}
    >
      <span className="dshp-panel__menu-item-icon">
        <SlotOutlet
          slotKey={PANEL_LIST_SLOT}
          ownerProps={{ size, active }}
          opts={{ only: id }}
        />
      </span>
      <span className="dshp-panel__menu-item-label">{label}</span>
    </button>
  )
}
