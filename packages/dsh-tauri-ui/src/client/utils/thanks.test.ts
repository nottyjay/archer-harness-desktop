import { describe, expect, it } from 'vitest'
import { DICT_EN, DICT_ZH } from '../constants'
import { parseThanksTemplate } from './thanks'

describe('parseThanksTemplate', () => {
  it('keeps surrounding copy and marks both credit tokens', () => {
    expect(parseThanksTemplate('源自 {{desktop}}，感谢 {{harness}}。')).toEqual([
      { type: 'text', value: '源自 ' },
      { type: 'desktop' },
      { type: 'text', value: '，感谢 ' },
      { type: 'harness' },
      { type: 'text', value: '。' },
    ])
  })

  it('returns a single text part when there are no tokens', () => {
    expect(parseThanksTemplate('thanks')).toEqual([{ type: 'text', value: 'thanks' }])
  })

  it('parses both locale dictionaries', () => {
    for (const template of [DICT_ZH.thanks, DICT_EN.thanks]) {
      const types = parseThanksTemplate(template).map(part => part.type)
      expect(types).toContain('desktop')
      expect(types).toContain('harness')
    }
  })
})
