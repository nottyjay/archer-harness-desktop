import type { ClientContext } from 'dsh-tauri/client'
import { ArcherBrandName, ArcherMark } from '../components/archer-mark'
import {
  BRAND_MARK_SLOT,
  BRAND_NAME_SLOT,
  BRAND_PRIORITY,
  HERO_BRAND_MARK_SLOT,
} from '../constants'

/**
 * 占用官方品牌槽：侧栏标/名 + 空态 hero 标。
 *
 * 侧栏槽由官方 ui-sidebar 声明（本插件 shadow 该条目后 children 仍有效）；
 * hero 标由 ui-conversation 声明。priority -1 盖过 official 构建的鱼标/字标。
 */
export function registerBrand(ctx: ClientContext): void {
  ctx.slots.inject(BRAND_MARK_SLOT as never, () =>
    ctx.slots.register(
      { name: BRAND_MARK_SLOT, priority: BRAND_PRIORITY } as never,
      ArcherMark,
    ))
  ctx.slots.inject(BRAND_NAME_SLOT as never, () =>
    ctx.slots.register(
      { name: BRAND_NAME_SLOT, priority: BRAND_PRIORITY } as never,
      ArcherBrandName,
    ))
  ctx.slots.inject(HERO_BRAND_MARK_SLOT as never, () =>
    ctx.slots.register(
      { name: HERO_BRAND_MARK_SLOT, priority: BRAND_PRIORITY } as never,
      ArcherMark,
    ))
}
