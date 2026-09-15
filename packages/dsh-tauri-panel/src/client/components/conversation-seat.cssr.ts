import { cssr } from 'dsh-tauri-ui/client'

const { c } = cssr

/** 会话区替换视图（conversation-seat.tsx）：内容列居中。 */
export default c([
  c('.dshp-panel__panel-view', {
    'height': '100%',
    'boxSizing': 'border-box',
    'minWidth': 0,
    'overflowY': 'auto',
    'scrollbarGutter': 'stable',
    'position': 'relative',
    // 内容宽度派生（自给自足镜像 alpha）：有拖拽偏好用偏好，否则自适应
    // clamp(680px, col*0.64, 920px)；列宽与偏好由 width 控制器发布。
    '--dsh-chat-content-width': 'var(--dsh-chat-user-width, clamp(680px, calc(var(--dsh-conversation-column-width, 0px) * .64), 920px))',
  }),
  // 对齐官方 .EvIC1a_column（ChatView.module.css）：max-width:var(--dsh-chat-content-width);
  // width:100%; margin:0 auto; display:flex; flex-direction:column。保留 minHeight:100% 让空态撑满。
  c('.dshp-panel__panel-view-column', {
    maxWidth: 'var(--dsh-chat-content-width,780px)',
    minHeight: '100%',
    width: '100%',
    margin: '0 auto',
    flexDirection: 'column',
    gap: '16px',
    display: 'flex',
  }),
])
