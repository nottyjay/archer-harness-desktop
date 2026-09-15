import type { SettingsRow } from '../types'
import { describe, expect, it } from 'vitest'
import { SETTINGS_WELCOME_ONBOARDING_ID } from '../constants'
import { omitWelcomeNoticeStep } from './onboarding'

function row(id: string, order: number): SettingsRow {
  return { id, order, label: id }
}

describe('omitWelcomeNoticeStep', () => {
  it('drops the official welcome notice and keeps API-key setup first', () => {
    expect(omitWelcomeNoticeStep([
      row(SETTINGS_WELCOME_ONBOARDING_ID, -100),
      row('deepseek-official', 0),
    ])).toEqual([row('deepseek-official', 0)])
  })

  it('leaves an empty list unchanged', () => {
    expect(omitWelcomeNoticeStep([])).toEqual([])
  })
})
