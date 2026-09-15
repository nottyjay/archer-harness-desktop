import type { ReactElement } from 'react'
import DOMPurify from 'dompurify'
import { useMountStyle } from 'dsh-tauri-ui/client'
import { marked } from 'marked'
import { useMemo } from 'react'
import { MARKDOWN_STYLE_ID } from '../constants'
import markdownStyle from './markdown.cssr'

function parseMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(text, { async: false, gfm: true, breaks: false }) as string)
}

export function MarkdownPreview(props: { text: string }): ReactElement {
  useMountStyle(markdownStyle, MARKDOWN_STYLE_ID)
  const html = useMemo(() => parseMarkdown(props.text), [props.text])
  return <div className="dshp-extension__md-body" dangerouslySetInnerHTML={{ __html: html }} />
}
