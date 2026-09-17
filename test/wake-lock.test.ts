// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * 屏幕唤醒锁契约（issue #469）。
 *
 * 主窗口没有「屏幕常亮」的正当需求。壳层用 reause `useWakeLock()` 观察唤醒锁
 * 状态，一旦有锁生效立刻 `release()`。
 *
 * 原先的 `navigator.wakeLock.request` 猴补丁（`utils/disable-wake-lock.ts`）已删除，
 * 这里把「入口释放唤醒锁」的不变量锁在源码层面：漏掉即失败。
 */
describe('wake lock contract', () => {
  it('releases any active wake lock in the main window entry', () => {
    const source = readFileSync(new URL('../src/layout/index.tsx', import.meta.url), 'utf8')
    expect(source).toContain('useWakeLock()')
    expect(source).toContain('useWatch(wakelock.isActive')
    expect(source).toContain('wakelock.release()')
  })

  it('no longer patches navigator.wakeLock anywhere in the shell', () => {
    const entries = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
    expect(entries).not.toContain('disableWakeLock')
  })
})
