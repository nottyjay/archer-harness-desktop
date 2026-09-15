/** Shared protocol and UI constants for the dsh-tauri-session client plugin. */

import { SESSION_PLUGIN_NAME } from '../../shared/constants'

export { SESSION_API_PREFIX, SESSION_PLUGIN_NAME, SESSION_SECTION_ORDER } from '../../shared/constants'

export const SESSION_CLIENT_NS = SESSION_PLUGIN_NAME
export const SESSION_REGISTRANT = SESSION_PLUGIN_NAME

export const SETTINGS_SECTION_SLOT = 'settings.section'
export const SESSION_SECTION_ID = 'dsh-tauri-session-archive'

export const SESSION_STYLE_ID = 'dsh-tauri-session-styles'

/** Effects / lifecycle ids (诊断元数据). */
export const SESSION_STYLES_EFFECT = `${SESSION_PLUGIN_NAME}: styles`
export const SESSION_ARCHIVE_PATCH_EFFECT = `${SESSION_PLUGIN_NAME}: workspace archive patch`
export const SESSION_ARCHIVE_SECTION_EFFECT = `${SESSION_PLUGIN_NAME}: archive section`

/** css-render class prefix (value 仅用于样式命名，不作为协议). */

/**
 * Sync strings for matching the official workspace-row menu's delete item
 * (zh/en). The item is a primitives `Menu` row rendered in a portal, so the
 * patch scans `document.body`, not the sidebar.
 */
export const DELETE_WORKSPACE_LABELS: readonly string[] = ['删除工作区', 'Delete workspace']

/** Official primitives menu row selector (portal). */
export const MENU_ITEM_SELECTOR = 'button[role="menuitem"]'

/** Sidebar shell seat holding the official WorkspaceBrowser. */
export const SIDEBAR_SELECTOR = '[data-slot="sidebar"]'

/** Attribute marking a project-row ellipsis whose click records the open menu's workspace. */
export const WORKSPACE_MENU_ANCHOR_ATTRIBUTE = 'data-dsh-tauri-session-menu-anchor'
/** Attribute marking a portal workspace menu already patched with the archive item. */
export const WORKSPACE_MENU_PATCH_ATTRIBUTE = 'data-dsh-tauri-session-archive-menu-patched'
