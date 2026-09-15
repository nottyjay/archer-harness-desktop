import { cssr } from 'dsh-tauri-ui/client'
import { SESSION_ICON_ATTRIBUTE } from '../constants'

const { c } = cssr

/** 侧边栏会话行 Git 分支图标补丁样式（配合 register/session-icons.ts 的 DOM 观察器）。 */
export default c([
  c(`[${SESSION_ICON_ATTRIBUTE}]`, {
    width: '16px',
    height: '20px',
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '2px',
    color: 'var(--dsw-alias-label-secondary)',
  }),
  c('[role="treeitem"]', { position: 'relative' }),
])
