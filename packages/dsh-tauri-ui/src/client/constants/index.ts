/** Shared protocol and UI constants for the dsh-tauri-ui client plugin. */

export const SETTINGS_UI_PLUGIN = 'dsh-tauri-ui'
export const SETTINGS_UI_NS = SETTINGS_UI_PLUGIN

export const SETTINGS_SHELL_OVERLAY_SLOT = 'shell.overlay'
export const SETTINGS_SIDEBAR_SLOT = 'sidebar.settings'
export const SETTINGS_SECTION_SLOT = 'settings.section'
export const SETTINGS_TRIGGER_SLOT = 'settings.trigger'
export const SETTINGS_ONBOARDING_SLOT = 'settings.onboarding'

export const SETTINGS_SHELL_SEAT_ID = SETTINGS_UI_PLUGIN
export const SETTINGS_SIDEBAR_ID = 'dsh-tauri-ui-settings'
export const SETTINGS_STYLE_ID = 'dsh-tauri-ui-settings-sidebar-styles'
export const SETTINGS_TRIGGER_STYLE_ID = 'dsh-tauri-ui-settings-trigger-styles'
export const SETTINGS_NAV_ICON_STYLE_ID = 'dsh-tauri-ui-settings-nav-icon-styles'
export const MENU_SELECT_STYLE_ID = 'dsh-tauri-ui-menu-select-styles'
export const TURN_NAVIGATION_STYLE_ID = 'dsh-tauri-ui-turn-navigation-styles'
export const TURN_NAVIGATION_LABEL_ZH = '轮次导航'
export const TURN_NAVIGATION_LABEL_EN = 'Turn navigation'
export const TURN_NAVIGATION_SELECTOR = `:is(nav[aria-label="${TURN_NAVIGATION_LABEL_ZH}"], nav[aria-label="${TURN_NAVIGATION_LABEL_EN}"])`
export const TURN_NAVIGATION_NARROW_SELECTOR = `[data-sidebar-collapsed] ${TURN_NAVIGATION_SELECTOR}`
export const SETTINGS_REGISTRANT = SETTINGS_UI_PLUGIN
export const SETTINGS_TRIGGER_PRIORITY = -1

export const SETTINGS_UNDERLAY_SLOT_KEYS = ['sidebar', 'conversation', 'details'] as const
export const SETTINGS_EXTERNAL_OVERLAY_SELECTORS = ['[data-dsh-better-sidebar]', '[data-dsh-panel]'] as const

export const RAIL_WIDTH_MIN = 264
export const RAIL_WIDTH_MAX = 420
export const RAIL_WIDTH_DEFAULT = 280

export const DICT_ZH = {
  back: '返回应用',
  search: '搜索设置…',
  settings: '设置',
  noResults: '没有匹配的设置项',
} as const

export const DICT_EN: Record<keyof typeof DICT_ZH, string> = {
  back: 'Back to app',
  search: 'Search settings…',
  settings: 'Settings',
  noResults: 'No matching settings',
}
