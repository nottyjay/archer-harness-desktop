/**
 * draft-attachments.ts — 输入条草稿附件的跨核心版本兼容读取。
 *
 * DSH 核心在 0.1.5-alpha.1 把输入条草稿字段与动作从
 * `imageIds` / `addImages` / `removeImage` 改名为
 * `attachmentIds` / `addAttachments` / `removeAttachment`。
 * 工作树插件需要同时兼容两条版本线：直接读 `input.imageIds` 在新核心下是
 * undefined，`imageIds.length` 会抛
 * `Cannot read properties of undefined (reading 'length')`，
 * 使「新建工作树」在宿主创建成功后于客户端阶段整体失败。
 *
 * 纯函数、无副作用，便于单测；消费方一律经本模块访问，不直接取单一字段名。
 */

import type { InputActions, InputState } from '../types'

/** 稳定空数组：useInput 选择器每次返回新数组会触发无谓重渲染。 */
export const NO_DRAFT_ATTACHMENTS: readonly string[] = []

/** 读取草稿附件 id 列表（优先新核心的 attachmentIds，回退旧核心的 imageIds）。 */
export function draftAttachmentIds(state: InputState | undefined): readonly string[] {
  return state?.attachmentIds ?? state?.imageIds ?? NO_DRAFT_ATTACHMENTS
}

/**
 * 把草稿附件迁移到目标会话的输入动作面。
 * @returns 是否全部迁移成功；无附件恒为 true，确有附件但两个动作面都缺失时为 false。
 */
export function addDraftAttachments(actions: InputActions | undefined, ids: readonly string[]): boolean {
  if (ids.length === 0)
    return true
  if (typeof actions?.addAttachments === 'function')
    return actions.addAttachments([...ids])
  if (typeof actions?.addImages === 'function')
    return actions.addImages([...ids])
  return false
}

/** 从输入动作面移除单个草稿附件（兼容两种核心版本的动作名）。 */
export function removeDraftAttachment(actions: InputActions | undefined, id: string): void {
  if (typeof actions?.removeAttachment === 'function') {
    actions.removeAttachment(id)
    return
  }
  actions?.removeImage?.(id)
}
