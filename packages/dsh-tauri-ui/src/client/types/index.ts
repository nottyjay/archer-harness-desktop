import type { SessionListState } from 'dsh-tauri/client'

/** Selector hook shape shared by standard slot props. */
export type SelectorHook<T> = <S>(sel: (state: T) => S) => S

/** Props supplied to the settings trigger slot. */
export interface SettingsTriggerProps {
  /** sidebar.settings owner: expanded sidebar state. */
  wide: boolean
  /** Framework standard hook: session list snapshot. */
  useSessions: SelectorHook<SessionListState>
  useWorkspaces?: unknown
}

/** Props supplied to the shell.overlay settings sidebar slot. */
export interface SettingsSidebarProps {
  useSessions: SelectorHook<SessionListState>
  useWorkspaces?: unknown
}

/** Settings sidebar UI state. */
export interface SettingsUiState {
  /** Whether the sidebar is open. */
  open: boolean
  /** Active settings section id. */
  activeId: string | undefined
  /** Search query used to filter the settings list. */
  query: string
  /** Current sidebar width in pixels, or undefined when unset. */
  railWidth: number | undefined
}

/** A settings section or onboarding step projected into a navigation row. */
export interface SettingsRow {
  /** List slot entry id. */
  id: string
  /** Display order, defaulting to 0. */
  order: number
  /** Resolved display label. */
  label: string
}

/** Keys in the settings UI translation dictionary. */
export type SettingsUiKey = 'back' | 'search' | 'settings' | 'noResults'

/** One option displayed by the shared primitives Menu select. */
export interface MenuSelectOption {
  id: string
  label: string
}

/** Props for the shared official-style Menu select trigger. */
export interface MenuSelectProps {
  value: string
  options: readonly MenuSelectOption[]
  onSelect: (id: string) => void
  label: string
  /** `pill` matches LanguageRow; `default` matches regular form selectors. */
  variant?: 'pill' | 'default'
  /** Existing plugin classes can remain stable during migration. */
  triggerClassName?: string
  labelClassName?: string
  chevronClassName?: string
}
