import type { ThanksPart } from '../types'

const CREDIT_TOKEN = /\{\{(desktop|harness)\}\}/g

/** Split a thanks template into plain text and clickable credit tokens. */
export function parseThanksTemplate(template: string): ThanksPart[] {
  const parts: ThanksPart[] = []
  let last = 0
  for (const match of template.matchAll(CREDIT_TOKEN)) {
    const index = match.index ?? 0
    if (index > last)
      parts.push({ type: 'text', value: template.slice(last, index) })
    parts.push({ type: match[1] as 'desktop' | 'harness' })
    last = index + match[0].length
  }
  if (last < template.length)
    parts.push({ type: 'text', value: template.slice(last) })
  return parts
}
