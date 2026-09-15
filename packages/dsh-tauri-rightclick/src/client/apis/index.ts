import type * as Types from './index.type'
import { fetch } from 'dsh-tauri/client'
import { OPEN_PATH_ROUTE, OPEN_URL_ROUTE } from '../constants'

/** @method post 用系统默认浏览器打开外链。 */
export function postOpenUrl(body: Types.OpenUrlPayload): Promise<Types.ActionResult> {
  return fetch(OPEN_URL_ROUTE, { method: 'POST', body })
}

/** @method post 在系统文件管理器中打开目录。 */
export function postOpenPath(body: Types.OpenPathPayload): Promise<Types.ActionResult> {
  return fetch(OPEN_PATH_ROUTE, { method: 'POST', body })
}
