/**
 * client/utils/open-file.test.ts — 「点击文件打开」的决策与静默边界。
 *
 * 核心断言：**旧内核（无侧边栏能力）即使拿到了 `openFile` 也绝不能被调用**。
 */

import { describe, expect, it, vi } from 'vitest'
import { fileOpenHandler } from './open-file'

describe('fileOpenHandler', () => {
  it('新内核（有侧边栏能力 + 有 openFile）→ 返回可点处理器', () => {
    const openFile = vi.fn()
    const handler = fileOpenHandler({ openFile, sidebarPreview: true })
    expect(handler).toBeTypeOf('function')
    handler?.('src/a.ts')
    expect(openFile).toHaveBeenCalledWith('src/a.ts')
  })

  it('旧内核（有 openFile 但无侧边栏能力）→ 不可点，且**一个字节都不调用**', () => {
    const openFile = vi.fn()
    expect(fileOpenHandler({ openFile, sidebarPreview: false })).toBeUndefined()
    expect(openFile).not.toHaveBeenCalled()
  })

  it('框架没派发 openFile → 不可点', () => {
    expect(fileOpenHandler({ sidebarPreview: true })).toBeUndefined()
    expect(fileOpenHandler({ openFile: undefined, sidebarPreview: true })).toBeUndefined()
  })

  it('openFile 不是函数（壳提供了脏字段）→ 不可点', () => {
    expect(fileOpenHandler({ openFile: 'open' as never, sidebarPreview: true })).toBeUndefined()
  })

  it('openFile 返回 rejected promise → 静默吞掉，不产生未处理 rejection', async () => {
    const handler = fileOpenHandler({
      openFile: () => Promise.reject(new Error('path open failed')),
      sidebarPreview: true,
    })
    expect(handler).toBeTypeOf('function')
    handler?.('src/a.ts')
    // 让微任务队列跑完：若有未处理 rejection，vitest 会在这里报出来。
    await Promise.resolve()
    await Promise.resolve()
  })

  it('openFile 同步抛错 → 静默吞掉（卡片没有错误面，打开失败不该打断会话）', () => {
    const handler = fileOpenHandler({
      openFile: () => {
        throw new Error('boom')
      },
      sidebarPreview: true,
    })
    expect(() => handler?.('src/a.ts')).not.toThrow()
  })

  it('路径原样透传（相对路径由框架按会话 cwd 解析）', () => {
    const openFile = vi.fn()
    const handler = fileOpenHandler({ openFile, sidebarPreview: true })
    handler?.('packages/a/b.ts')
    handler?.('C:\\Other\\file.txt')
    expect(openFile.mock.calls).toEqual([['packages/a/b.ts'], ['C:\\Other\\file.txt']])
  })
})
