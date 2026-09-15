/**
 * components/conversation-seat.tsx — conversation 槽条目：包标记容器
 * + 宿主内容列（宽度约束由宿主决定，见 styles.ts）+ 宽度同步（方案 A 机制侧）。
 *
 * 宽度能力（镜像 alpha ConversationRoot，仅同步不拖拽）：
 *   - 根元素 ref + ResizeObserver 发布 `--dsh-conversation-column-width`；
 *   - 偏好读写（localStorage 与官方共用一键）；宽度调整走协议侧 set/reset；
 *   - 无偏好时回退自适应 clamp；旧 WebView（无 RO）→ 固定宽度（supported=false），
 *     见 service/width.ts。
 *
 * 纯展示组件；spec 由控制器在渲染期快照注入（close() 置空后条目已注销）。
 */

import type { ReactElement } from 'react'
import type { PanelWidthController } from '../service/width'
import type { PanelContentSpec } from '../types'
import { useMountStyle } from 'dsh-tauri-ui/client'
import { useEffect, useRef } from 'react'
import { CONVERSATION_SEAT_STYLE_ID, PANEL_DATA_ATTRIBUTES } from '../constants'
import conversationSeatStyle from './conversation-seat.cssr'

export function ConversationSeat({
  t,
  spec,
  width,
}: {
  t: (key: string) => string
  spec: PanelContentSpec | undefined
  width: PanelWidthController
}): ReactElement | null {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useMountStyle(conversationSeatStyle, CONVERSATION_SEAT_STYLE_ID)

  // 挂载根元素到宽度控制器：RO 发布列宽 + 偏好；卸载时 detach（disconnect）。
  useEffect(() => {
    const root = rootRef.current
    if (!root)
      return undefined
    return width.attach(root)
  }, [width])

  if (!spec)
    return null
  const View = spec.render
  return (
    <div ref={rootRef} {...{ [PANEL_DATA_ATTRIBUTES.view]: '' }} className="dshp-panel__panel-view">
      {/* 内容列：对齐官方内容列宽度（max-width var(--dsh-chat-content-width, 780px)），
          子插件零宽度关注，只负责内容自身布局（垂直方向自定）。 */}
      <div style={{ padding: '16px 16px 16px 8px' }}>
        <div className="dshp-panel__panel-view-column">
          <View t={t} />
        </div>
      </div>
    </div>
  )
}
