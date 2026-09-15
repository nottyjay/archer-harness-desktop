import { describe, expect, it, vi } from 'vitest'
import { postOpenPath } from '../apis'
import { openInExplorer } from './open-path'

vi.mock('../apis', () => ({ postOpenPath: vi.fn() }))

const postOpenPathMock = vi.mocked(postOpenPath)

describe('openInExplorer', () => {
  it('posts the directory to the plugin-owned open-path route', async () => {
    postOpenPathMock.mockResolvedValue({ ok: true })

    await expect(openInExplorer('C:\\workspace')).resolves.toBeUndefined()
    expect(postOpenPathMock).toHaveBeenCalledWith({ path: 'C:\\workspace' })
  })

  it('surfaces the route error instead of a JSON SyntaxError', async () => {
    postOpenPathMock.mockResolvedValue({ ok: false, error: 'not-a-directory' })

    await expect(openInExplorer('C:\\workspace')).rejects.toThrow('not-a-directory')
  })

  it('falls back to the generic error when the route reports no detail', async () => {
    postOpenPathMock.mockResolvedValue({ ok: false })

    await expect(openInExplorer('C:\\workspace')).rejects.toThrow(/打开失败|Failed to open/)
  })
})
