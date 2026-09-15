import { PLUGIN_NAME } from '../../shared/constants'

export { API_PREFIX, PLUGIN_NAME as PLUGIN_ID } from '../../shared/constants'

export const LOCALE_NAMESPACE = PLUGIN_NAME
export const PANEL_PROTOCOL_NAME = 'panel.protocol'
/**
 * 宿主私有面板槽：本插件只用它作为「宿主已 apply」的就绪门槛
 * （实际注册经 panel.protocol.registerPanel，槽名由宿主按核心版本决定）。
 */
export const PANEL_SLOT_NAME = 'sidebar.panel.action'
export const CONVERSATION_INPUT_LEFT_SLOT = 'conversation.input.left'
export const PANEL_ID = 'dsh-tauri-panel-extension'
/** 面板条目在侧栏清单里的排序位。 */
export const PANEL_ACTION_ORDER = 40
/** 宿主协议未就绪时的重试间隔。 */
export const PROTOCOL_RETRY_MS = 50
export const INPUT_PREFILL_ID = 'dsh-tauri-panel-extension.skill-prefill'
export const INPUT_PREFILL_ORDER = 40
export const INPUT_PREFILL_PRIORITY = 0
export const STYLE_ID = 'dsh-tauri-panel-extension-styles'
export const EXTENSION_PANEL_STYLE_ID = 'dsh-tauri-panel-extension-panel-styles'
export const SKILLS_TAB_STYLE_ID = 'dsh-tauri-panel-extension-skills-tab-styles'
export const MCP_TAB_STYLE_ID = 'dsh-tauri-panel-extension-mcp-tab-styles'
export const MARKDOWN_STYLE_ID = 'dsh-tauri-panel-extension-markdown-styles'
export const MCP_EDITOR_FORM_STYLE_ID = 'dsh-tauri-panel-extension-editor-form-styles'
export const MCP_IMPORT_DIALOG_STYLE_ID = 'dsh-tauri-panel-extension-import-dialog-styles'
export const SKILL_CREATOR_DRAFT = '/skill-creator '
export const SKILL_REFRESH_INTERVAL_MS = 300
export const SKILL_REFRESH_TIMEOUT_MS = 5_000
export const IMPORT_REFRESH_DELAYS_MS = [250, 750, 1_500] as const
export const MCP_RESTART_INITIAL_DELAY_MS = 3_000
export const MCP_RESTART_POLL_INTERVAL_MS = 1_500
export const MCP_RESTART_TIMEOUT_MS = 60_000
export const GITHUB_REPOSITORY_PATTERN = /^(?:https?:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\/?$/i

export const SOURCE_LOCALE_KEYS: Readonly<Record<string, string>> = {
  'project-dsh': 'sourceProjectDsh',
  'project-agents': 'sourceProjectAgents',
  'user-dsh': 'sourceUserDsh',
  'user-agents': 'sourceUserAgents',
  'runtime': 'sourceRuntime',
  'bundled': 'sourceBundled',
  'custom': 'sourceCustom',
}
