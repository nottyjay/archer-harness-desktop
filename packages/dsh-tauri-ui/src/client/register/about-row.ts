import type { ClientContext } from 'dsh-tauri/client'
import { AboutRow } from '../components/about-row'
import {
  SETTINGS_ABOUT_ITEM_EFFECT,
  SETTINGS_ABOUT_ITEM_ID,
  SETTINGS_ABOUT_ITEM_ORDER,
  SETTINGS_GENERAL_ITEM_SLOT,
  SETTINGS_REGISTRANT,
} from '../constants'

/**
 * register/about-row.ts — 通用设置底部版本号与致谢行。
 *
 * 注册进 settings.general.item，order 足够大以保证排在官方偏好行之后。
 * @param ctx - 客户端根上下文。
 */
export function registerAboutRow(ctx: ClientContext): void {
  ctx.effect(
    () =>
      ctx.slots.inject(SETTINGS_GENERAL_ITEM_SLOT as never, () =>
        ctx.slots.register(
          {
            name: SETTINGS_GENERAL_ITEM_SLOT,
            id: SETTINGS_ABOUT_ITEM_ID,
            order: SETTINGS_ABOUT_ITEM_ORDER,
            registrant: SETTINGS_REGISTRANT,
          } as never,
          AboutRow,
        )),
    SETTINGS_ABOUT_ITEM_EFFECT,
  )
}
