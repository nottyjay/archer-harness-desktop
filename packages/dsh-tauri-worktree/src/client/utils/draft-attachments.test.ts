/**
 * draft-attachments.test.ts — 输入条附件 API 的跨核心版本兼容回归。
 *
 * 0.1.5-alpha.1 把 imageIds/addImages/removeImage 改名为
 * attachmentIds/addAttachments/removeAttachment；旧核心下读 attachmentIds 会拿到
 * undefined，旧插件直接取 imageIds 则是新核心下 `Cannot read properties of undefined
 * (reading 'length')` 的根因。
 */

import { describe, expect, it, vi } from 'vitest'
import {
  addDraftAttachments,
  draftAttachmentIds,
  NO_DRAFT_ATTACHMENTS,
  removeDraftAttachment,
} from './draft-attachments'

describe('draftAttachmentIds', () => {
  it('prefers the alpha attachmentIds field', () => {
    expect(draftAttachmentIds({ draft: '', attachmentIds: ['a'] })).toEqual(['a'])
  })

  it('falls back to the legacy imageIds field', () => {
    expect(draftAttachmentIds({ draft: '', imageIds: ['b'] })).toEqual(['b'])
  })

  it('returns a stable empty array when neither field is present', () => {
    const first = draftAttachmentIds({ draft: '' })
    const second = draftAttachmentIds(undefined)
    expect(first).toBe(NO_DRAFT_ATTACHMENTS)
    expect(second).toBe(NO_DRAFT_ATTACHMENTS)
    expect(first.length).toBe(0)
  })
})

describe('addDraftAttachments', () => {
  it('uses addAttachments when the alpha action face is present', () => {
    const addAttachments = vi.fn(() => true)
    const addImages = vi.fn(() => true)
    expect(addDraftAttachments({ setDraft: vi.fn(), submit: vi.fn(), addAttachments, addImages }, ['a'])).toBe(true)
    expect(addAttachments).toHaveBeenCalledWith(['a'])
    expect(addImages).not.toHaveBeenCalled()
  })

  it('uses the legacy addImages action when addAttachments is absent', () => {
    const addImages = vi.fn(() => true)
    expect(addDraftAttachments({ setDraft: vi.fn(), submit: vi.fn(), addImages }, ['a'])).toBe(true)
    expect(addImages).toHaveBeenCalledWith(['a'])
  })

  it('is a no-op success without attachments and a failure when the action face is missing', () => {
    expect(addDraftAttachments({ setDraft: vi.fn(), submit: vi.fn() }, [])).toBe(true)
    expect(addDraftAttachments({ setDraft: vi.fn(), submit: vi.fn() }, ['a'])).toBe(false)
    expect(addDraftAttachments(undefined, ['a'])).toBe(false)
  })
})

describe('removeDraftAttachment', () => {
  it('prefers removeAttachment over the legacy removeImage', () => {
    const removeAttachment = vi.fn()
    const removeImage = vi.fn()
    removeDraftAttachment({ setDraft: vi.fn(), submit: vi.fn(), removeAttachment, removeImage }, 'a')
    expect(removeAttachment).toHaveBeenCalledWith('a')
    expect(removeImage).not.toHaveBeenCalled()
  })

  it('falls back to removeImage and tolerates a missing action face', () => {
    const removeImage = vi.fn()
    removeDraftAttachment({ setDraft: vi.fn(), submit: vi.fn(), removeImage }, 'a')
    expect(removeImage).toHaveBeenCalledWith('a')
    expect(() => removeDraftAttachment(undefined, 'a')).not.toThrow()
  })
})
