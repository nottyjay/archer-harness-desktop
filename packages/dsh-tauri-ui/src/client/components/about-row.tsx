import type { ReactElement } from 'react'
import type { ThanksPart } from '../types'
import { useInvoke } from 'dsh-tauri/client'
import {
  CMD_GET_APP_VERSION,
  CREDIT_DESKTOP_URL,
  CREDIT_HARNESS_URL,
  SETTINGS_ABOUT_STYLE_ID,
} from '../constants'
import { settingsText, useSettingsLocale } from '../locales'
import { openExternalUrl } from '../service/about'
import { useMountStyle } from '../utils/style'
import { parseThanksTemplate } from '../utils/thanks'
import aboutRowStyle from './about-row.cssr'

/**
 * 通用设置最底部：当前桌面端版本号，并致谢来源项目。
 * @returns 版本行与可点击致谢文案。
 */
export function AboutRow(): ReactElement {
  useSettingsLocale()
  useMountStyle(aboutRowStyle, SETTINGS_ABOUT_STYLE_ID)
  const { data: version } = useInvoke<string>(CMD_GET_APP_VERSION)
  const parts = parseThanksTemplate(settingsText('thanks'))

  return (
    <div className="dshp-about-row">
      <div className="dshp-about-row__head">
        <div className="dshp-about-row__title">{settingsText('version')}</div>
        <div className="dshp-about-row__value">{version || settingsText('versionFallback')}</div>
      </div>
      <div className="dshp-about-row__thanks">
        {parts.map((part, index) => renderThanksPart(part, index))}
      </div>
    </div>
  )
}

function renderThanksPart(part: ThanksPart, index: number): ReactElement {
  if (part.type === 'text')
    return <span key={index}>{part.value}</span>
  const name = settingsText(part.type === 'desktop' ? 'thanksDesktop' : 'thanksHarness')
  const url = part.type === 'desktop' ? CREDIT_DESKTOP_URL : CREDIT_HARNESS_URL
  return (
    <button
      key={index}
      type="button"
      className="dshp-about-row__link"
      aria-label={settingsText('openCredit', { name })}
      onClick={() => {
        void openExternalUrl(url)
      }}
    >
      {name}
    </button>
  )
}
