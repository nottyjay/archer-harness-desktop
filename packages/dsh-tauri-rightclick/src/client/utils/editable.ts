/**
 * utils/editable.ts — 可编辑元素 / 内容面的选区操作（纯 DOM 逻辑，可独立测试）。
 *
 * 从 menu.ts 拆出的三态选区能力：input / textarea 走 selectionStart/End，
 * contenteditable 走 Selection/Range；「全选内容区」针对对话正文 / 设置弹窗 /
 * hero 首屏三类表面。不含菜单装配与生命周期职责。
 */
import { text } from '../locales'

/**
 * 将文本粘贴进可编辑元素（input/textarea 走 replaceSelection，contenteditable
 * 走编辑器自身粘贴管线）。
 *
 * contenteditable（Lexical 系富文本编辑器，如 dsh 聊天输入框 `data-composer-input`）
 * 只接受自身编辑管线：外部直接改 DOM 再派发合成 `input` 事件会被编辑器模型
 * reconcile 静默丢弃（表现为右键「粘贴」点了没反应、无报错、无 toast）。因此
 * 优先派发携带纯文本 DataTransfer 的合成 paste 事件交给编辑器自身 beforeinput/
 * paste 管线；若编辑器未接管（未 preventDefault 且内容未同步变化）再回退
 * `document.execCommand('insertText')`，最后才退回原 DOM 写入。input/textarea
 * 行为与旧实现一致。
 */
export function pasteInto(editable: HTMLElement, value: string): void {
  if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
    replaceSelection(editable, value)
    return
  }
  editable.focus()
  const before = editable.textContent ?? ''
  // 合成 paste 事件不带默认行为，须由监听器（编辑器管线）接管并 preventDefault + 写入。
  const dataTransfer = new DataTransfer()
  dataTransfer.setData('text/plain', value)
  const event = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer,
  })
  editable.dispatchEvent(event)
  // 接收方已接管（preventDefault）：编辑器会自行写入，但 ProseMirror 的 DOM 更新
  // 是异步的，同步 textContent 此刻仍是旧值——若只看内容变化会误判“没插入”而
  // 触发兜底，导致右键粘贴重复插入两次（Ctrl+V 不经过此路径，故正常）。
  if (event.defaultPrevented)
    return
  // 接收方未 preventDefault 但内容已同步变化：同样视为已写入。
  if ((editable.textContent ?? '') !== before)
    return
  if (document.execCommand('insertText', false, value))
    return
  replaceSelection(editable, value)
}

/** 替换可编辑元素中的当前选区（输入/文本域/可编辑区三态）。 */
export function replaceSelection(editable: HTMLElement, value: string): void {
  editable.focus()
  if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
    const start = editable.selectionStart ?? editable.value.length
    const end = editable.selectionEnd ?? start
    editable.setRangeText(value, start, end, 'end')
    editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }))
    return
  }
  const selection = globalThis.getSelection()
  if (!selection?.rangeCount || !editable.contains(selection.anchorNode))
    throw new Error(text('editPositionUnknown'))
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const textNode = document.createTextNode(value)
  range.insertNode(textNode)
  range.setStartAfter(textNode)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }))
}

/** 全选某个内容面（Range.selectNodeContents）。 */
export function selectSurface(surface: HTMLElement): void {
  if (!surface)
    return
  const selection = globalThis.getSelection()
  if (!selection)
    return
  const range = document.createRange()
  range.selectNodeContents(surface)
  selection.removeAllRanges()
  selection.addRange(range)
}

/** 全选的可编辑目标（输入/文本域直接 select()，可编辑区走内容面全选）。 */
export function selectAll(editable: HTMLElement): void {
  editable.focus()
  if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement)
    editable.select()
  else
    selectSurface(editable)
}

/** 全选的会话内容区（对话正文 / 设置弹窗 / hero 首屏）。 */
export function selectionSurface(target: unknown): HTMLElement | null {
  if (target instanceof Element) {
    const conversation = target.closest<HTMLElement>('[data-slot="conversation.session"]')
    if (conversation)
      return conversation
    const dialog = target.closest<HTMLElement>('[role="dialog"]')
    if (dialog)
      return dialog
    const hero = target.closest<HTMLElement>('[data-phase="hero"]')
    if (hero?.querySelector(':scope > [data-conversation-scroll]'))
      return hero
  }
  return null
}
