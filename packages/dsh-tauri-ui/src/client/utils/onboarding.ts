import type { SettingsRow } from '../types'
import { SETTINGS_WELCOME_ONBOARDING_ID } from '../constants'

/** Drop the official welcome notice so onboarding starts at API-key setup. */
export function omitWelcomeNoticeStep(rows: SettingsRow[]): SettingsRow[] {
  return rows.filter(row => row.id !== SETTINGS_WELCOME_ONBOARDING_ID)
}
