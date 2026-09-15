/**
 * service/panel-list.ts — 官方 `sidebar.panellist` 的行投影服务。
 *
 * 官方 ui-sidebar 在它的 apply() 里维护同一份投影（内部 `syncPanels`）：
 * 读 `entriesOfSlot('sidebar.panellist')` → `{ id, order, label }` → 按 order 升序。
 * 本插件以 priority -1 shadow 了官方 `sidebar` 条目，克隆侧栏**必须自己复刻这份
 * 投影**，否则按官方协议注册的面板会「注册成功、没有任何入口」（静默失效）。
 *
 * 两个实现细节对齐上游：
 *   - `label` 可为 thunk，读时才求值（语义同上游 `resolveSlotLabel`）；本地实现
 *     而不引入 `@deepseek-ai/dsh-client-ui-slots` 平台模块的类型面依赖。
 *   - `entriesOfSlot` 每次返回新数组且「未声明时为空表」，所以写入 store 前必须做
 *     结构比较，否则 `useSyncExternalStore` 每帧都判定快照变化。
 *
 * 旧核心（≤0.1.2-rc.1）的 slots 服务没有这两个方法，`available` 为 false，
 * store 恒为空表 → 克隆侧栏不渲染面板清单（与官方侧栏「无注册不渲染」一致）。
 */

import type { ClientContext, SlotEntryLike } from 'dsh-tauri/client'
import type { PanelListEntry, PanelListStore } from '../types'
import { createExternalStore } from 'dsh-tauri/client'
import { PANEL_LIST_SLOT } from '../constants'

/** 官方 list 槽行投影服务。 */
export interface PanelListService {
  /** 行快照 store（组件经 `useSyncExternalStore` 订阅）。 */
  store: PanelListStore
  /** 官方 `sidebar.panellist` 投影能力是否可用（新核心 + slots 服务带读取能力）。 */
  available: boolean
}

/** `resolveSlotLabel` 的本地等价实现（thunk 读时求值）。 */
function resolveLabel(label: string | (() => string) | undefined): string | undefined {
  return typeof label === 'function' ? label() : label
}

/** 把 list 槽的活条目投影成有序行；slots 服务不支持读取时返回 undefined。 */
function projectPanels(ctx: ClientContext): PanelListEntry[] | undefined {
  let entries: readonly SlotEntryLike[] | undefined
  try {
    entries = ctx.slots.entriesOfSlot?.(PANEL_LIST_SLOT)
  }
  catch {
    // 未知 key / 版本不符的 slots 服务不应让侧栏整体崩掉：按「无注册」处理。
    return undefined
  }
  if (entries === undefined)
    return undefined

  const rows: PanelListEntry[] = []
  for (const entry of entries) {
    const id = entry.options.id
    if (id === undefined)
      continue
    rows.push({
      id,
      order: entry.options.order ?? 0,
      label: resolveLabel(entry.options.label) ?? id,
    })
  }
  return rows.sort((a, b) => a.order - b.order)
}

/** 行序列结构比较（entriesOfSlot 每次返回新数组，必须比内容而非引用）。 */
function sameRows(a: readonly PanelListEntry[], b: readonly PanelListEntry[]): boolean {
  return a.length === b.length
    && a.every((row, index) =>
      row.id === b[index].id && row.order === b[index].order && row.label === b[index].label)
}

/**
 * 建立行投影服务并挂上订阅：槽位变化（注册/注销/声明建立）与 locale 变化都会
 * 重新投影，thunk 文案因此跟随语言切换而无需消费方重新注册。
 * @param ctx - 客户端根上下文。
 */
export function createPanelList(ctx: ClientContext): PanelListService {
  const store = createExternalStore<PanelListEntry[]>([])
  const available = typeof ctx.slots.entriesOfSlot === 'function'
    && typeof ctx.slots.subscribe === 'function'

  const sync = (): void => {
    const next = projectPanels(ctx)
    if (next === undefined)
      return
    if (sameRows(store.getSnapshot(), next))
      return
    store.set(next)
  }

  ctx.effect(() => {
    sync()
    const disposers: Array<() => void> = []
    if (available) {
      disposers.push(ctx.slots.subscribe?.(PANEL_LIST_SLOT, sync) ?? (() => {}))
      disposers.push(ctx.locale.subscribe(sync))
    }
    return () => {
      for (const dispose of disposers)
        dispose()
    }
  }, 'dsh-tauri-panel: panellist projection')

  return { store, available }
}
