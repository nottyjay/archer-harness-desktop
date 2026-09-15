import type { HostContext } from 'dsh-tauri'
/**
 * src/index.test.ts — 宿主装配 apply() 的性能约定回归。
 *
 * 背景（0.11.x 用户反馈「吐字变慢」）：宿主曾在**每个** session/event（含逐 token 的
 * assistant/chunk）上调用 `sessionTitle.get(session)`，其内部是
 * `foldSessionTitle(session.snapshotEvents())` —— 整份会话事件日志 O(N) 复制 + O(N)
 * 扫描，成熟会话单次 1–4 ms，跑在 append() 的同步发布路径上（与流式转发同进程）。
 *
 * 本文件锁死三条约定：
 *   1. 无 SSE 消费者（桌宠停用/隐藏）时不挂载监听，会话事件不触发任何工作；
 *   2. 标题折叠次数与会话事件数无关（每会话至多一次全量折叠）；
 *   3. 有 `title` 投影时只走 O(新事件) 的 `stateOf`，不再全量折叠。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apply, SESSION_STREAM_PATH } from './index'

interface FakeHostOptions {
  /** 是否提供 sessionTitle 服务（`get()` = O(整份日志) 折叠）。默认提供。 */
  titleService?: boolean
  /** 是否提供注册了 key='title' 的 sessionProjections 服务（O(新事件) 投影）。 */
  projections?: boolean
}

interface FakeHost {
  ctx: HostContext
  routes: string[]
  frames: string[]
  titleLookups: () => number
  listenerCount: (name: string) => number
  emitEvent: (session: unknown, event: unknown) => void
  emitDisposed: (session: unknown) => void
  /** 接入一个 SSE 消费者，返回其断开函数。 */
  connect: () => () => void
}

/** 最小宿主上下文替身：记录标题折叠次数、路由、SSE 帧与监听挂载情况。 */
function createHost(options: FakeHostOptions = {}): FakeHost {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const routes: string[] = []
  const frames: string[] = []
  let lookups = 0
  let routeHandler: ((request: unknown, response: unknown) => void) | undefined
  const closers = new Set<() => void>()

  const ctx = {
    get: (name: string) => {
      if (name === 'sessionTitle' && options.titleService !== false) {
        return {
          get: () => {
            lookups += 1
            return { title: `title-${lookups}` }
          },
        }
      }
      if (name === 'sessionProjections' && options.projections === true) {
        return {
          stateOf: (session: unknown, key: string) => key === 'title'
            ? (session as { title?: string }).title
            : undefined,
        }
      }
      return undefined
    },
    on: (name: string, handler: (...args: unknown[]) => void) => {
      const set = listeners.get(name) ?? new Set<(...args: unknown[]) => void>()
      listeners.set(name, set)
      set.add(handler)
      return () => {
        set.delete(handler)
      }
    },
    effect: (fn: () => unknown) => {
      fn()
    },
    webServer: {
      register: (route: { path: string, handler: (request: unknown, response: unknown) => void }) => {
        routes.push(route.path)
        routeHandler = route.handler
        return () => {}
      },
    },
  } as unknown as HostContext

  return {
    ctx,
    routes,
    frames,
    titleLookups: () => lookups,
    listenerCount: name => listeners.get(name)?.size ?? 0,
    emitEvent: (session, event) => {
      for (const handler of listeners.get('session/event') ?? [])
        handler(session, event)
    },
    emitDisposed: (session) => {
      for (const handler of listeners.get('session/disposed') ?? [])
        handler(session)
    },
    connect: () => {
      const request = {
        on: (name: string, handler: () => void) => {
          if (name === 'close')
            closers.add(handler)
        },
      }
      routeHandler?.(request, {
        writeHead: () => {},
        write: (chunk: string) => {
          frames.push(chunk)
        },
        end: () => {},
      })
      return () => {
        for (const closer of [...closers]) {
          closers.delete(closer)
          closer()
        }
      }
    },
  }
}

/** 取出 SSE 数据帧里的半结构化载荷。 */
function payloads(frames: readonly string[]): Array<{ action: string, payload: Record<string, unknown> }> {
  return frames
    .filter(frame => frame.startsWith('data: '))
    .map(frame => JSON.parse(frame.slice('data: '.length).trim()) as { action: string, payload: Record<string, unknown> })
}

/** 一段流式正文事件（逐 token 的 assistant/chunk）。 */
function chunk(seq: number) {
  return { type: 'assistant/chunk', seq, time: seq, data: { chunk: { type: 'text-delta', text: 'x' } } }
}

describe('pet host apply()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('注册会话流路由', () => {
    const host = createHost()
    apply(host.ctx)
    expect(host.routes).toEqual([SESSION_STREAM_PATH])
  })

  it('无消费者（桌宠停用/隐藏）时不挂载监听，会话事件不触发任何工作', () => {
    const host = createHost()
    apply(host.ctx)
    expect(host.listenerCount('session/event')).toBe(0)
    expect(host.listenerCount('session/disposed')).toBe(0)

    host.emitEvent({ id: 's1' }, chunk(0))
    expect(host.titleLookups()).toBe(0)
    expect(host.frames).toHaveLength(0)
  })

  it('首个消费者接入才挂载监听，标题折叠不随流式事件数增长', () => {
    const host = createHost()
    apply(host.ctx)
    host.connect()
    expect(host.listenerCount('session/event')).toBe(1)

    const session = { id: 's1' }
    for (let seq = 0; seq < 500; seq++)
      host.emitEvent(session, chunk(seq))
    expect(host.titleLookups()).toBe(1)

    // 另一个会话首次出现：再读一次；同会话后续事件不再触发。
    const other = { id: 's2' }
    host.emitEvent(other, { type: 'turn/start', seq: 0, time: 0, data: {} })
    for (let seq = 1; seq < 200; seq++)
      host.emitEvent(other, chunk(seq))
    expect(host.titleLookups()).toBe(2)
  })

  it('最后一个消费者断开后注销监听并丢弃状态，重新接入再折叠一次', () => {
    const host = createHost()
    apply(host.ctx)
    const disconnect = host.connect()
    const session = { id: 's1' }

    host.emitEvent(session, chunk(0))
    expect(host.titleLookups()).toBe(1)

    disconnect()
    expect(host.listenerCount('session/event')).toBe(0)
    expect(host.listenerCount('session/disposed')).toBe(0)

    // 断开期间的会话事件不再产生任何工作（也不读标题）。
    host.emitEvent(session, chunk(1))
    host.emitDisposed(session)
    expect(host.titleLookups()).toBe(1)

    // 重新接入：状态从零重建，标题重新折叠一次。
    host.connect()
    host.emitEvent(session, chunk(2))
    expect(host.titleLookups()).toBe(2)
  })

  it('后续标题变化仍由 session/title 事件增量转发到 SSE', () => {
    const host = createHost()
    apply(host.ctx)
    host.connect()
    const session = { id: 's1' }

    host.emitEvent(session, { type: 'turn/start', seq: 0, time: 0, data: {} })
    host.emitEvent(session, { type: 'session/title', seq: 1, time: 1, data: { title: '新标题' } })

    const last = payloads(host.frames).at(-1)
    expect(last?.action).toBe('update')
    expect(last?.payload).toMatchObject({ id: 's1', title: '新标题', displayTitle: '新标题' })
    expect(host.titleLookups()).toBe(1)
  })

  it('有 title 投影时只走 O(新事件) 的 stateOf，不做全量折叠', () => {
    const host = createHost({ projections: true })
    apply(host.ctx)
    host.connect()
    const session = { id: 's1', title: '投影标题' }

    for (let seq = 0; seq < 200; seq++)
      host.emitEvent(session, chunk(seq))

    // 投影路径：sessionTitle.get() 一次都不该被调用。
    expect(host.titleLookups()).toBe(0)
    const create = payloads(host.frames).find(frame => frame.action === 'create')
    expect(create?.payload).toMatchObject({ id: 's1', title: '投影标题' })

    // 标题在外部变化后，下一次事件即带上新值（无需 session/title 事件）。
    session.title = '改名后'
    host.emitEvent(session, { type: 'turn/start', seq: 200, time: 200, data: {} })
    expect(payloads(host.frames).at(-1)?.payload).toMatchObject({ id: 's1', title: '改名后' })
  })
})
