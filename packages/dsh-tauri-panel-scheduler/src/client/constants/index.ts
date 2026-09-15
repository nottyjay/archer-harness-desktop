/** client/constants/index.ts — 客户端共享常量（跨 half 协议常量见 shared/constants.ts）。 */

import { SCHEDULER_PLUGIN_NAME } from '../../shared/constants'

export { SCHEDULER_API_PREFIX as API_PREFIX, SCHEDULER_PLUGIN_NAME as PLUGIN_ID } from '../../shared/constants'

export const LOCALE_NAMESPACE = SCHEDULER_PLUGIN_NAME

export const PANEL_PROTOCOL_NAME = 'panel.protocol'
/**
 * 宿主私有面板槽：本插件只用它作为「宿主已 apply」的就绪门槛
 * （实际注册经 panel.protocol.registerPanel，槽名由宿主按核心版本决定）。
 */
export const PANEL_SLOT_NAME = 'sidebar.panel.action'
export const PANEL_ID = 'dsh-tauri-panel-scheduler'
/** 面板条目在侧栏清单里的排序位。 */
export const PANEL_ACTION_ORDER = 30

/** 「通过 Chat 创建」草稿预填桥：conversation.input.left 槽（照搬 dsh-automation）。 */
export const CONVERSATION_INPUT_LEFT_SLOT = 'conversation.input.left'
export const INPUT_PREFILL_ID = 'dsh-tauri-panel-scheduler.prefill'
export const INPUT_PREFILL_ORDER = 40
export const INPUT_PREFILL_PRIORITY = 0

export const STYLE_ID = 'dsh-tauri-panel-scheduler-styles'
export const SCHEDULER_PANEL_STYLE_ID = 'dsh-tauri-panel-scheduler-panel-styles'
export const TASK_CARD_STYLE_ID = 'dsh-tauri-panel-scheduler-task-card-styles'
export const RUNS_TAB_STYLE_ID = 'dsh-tauri-panel-scheduler-runs-tab-styles'
export const RECOMMENDATIONS_STYLE_ID = 'dsh-tauri-panel-scheduler-recommendations-styles'
export const MODEL_PICKER_STYLE_ID = 'dsh-tauri-panel-scheduler-model-picker-styles'
export const MENU_STYLE_ID = 'dsh-tauri-panel-scheduler-menu-styles'
export const TASK_CREATE_DIALOG_STYLE_ID = 'dsh-tauri-panel-scheduler-task-create-dialog-styles'

export const STYLES_EFFECT = `${SCHEDULER_PLUGIN_NAME}: styles`
export const PANEL_EFFECT = `${SCHEDULER_PLUGIN_NAME}: panel slot`
export const SESSION_ICONS_EFFECT = `${SCHEDULER_PLUGIN_NAME}: session clock icons`

/** 会话行时钟图标补丁的 css-render 样式 id（防重复挂载）。 */
export const SESSION_ICON_STYLE_ID = '@deepseek-ai/dsh-tauri-panel-scheduler/SessionClockIcon.module.css'
/** 会话行内注入的时钟图标 span 的标记属性。 */
export const SESSION_ICON_ATTRIBUTE = 'data-dsh-scheduler-icon'
/** 官方侧边栏容器（应用晚挂载时的轮询锚点）。 */
export const SIDEBAR_SELECTOR = '[data-slot="sidebar"]'

/** 客户端轮询刷新间隔（执行记录 / 下次运行时间跟随）。 */
export const REFRESH_INTERVAL_MS = 5_000
/** 协议未就绪时的重试间隔。 */
export const PROTOCOL_RETRY_MS = 50

/**
 * css-render class 前缀（值仅用于样式命名，不作为协议）。
 *
 * 遵循 dsh-tauri-session 的 SESSION_CLASSES 约定：插件前缀 + 语义名，
 * 控件类（input / select-input / icon-button / selector / btn / field）复刻
 * 官方 ModelsSection.module.css 与 LanguageRow.module.css 的样式值，
 * 全部基于 --dsw-alias-* 令牌（浅色/深色主题自动适配），不依赖生成的
 * CSS module hash（docs/AGENTS.plugins.md 禁止）。
 */
