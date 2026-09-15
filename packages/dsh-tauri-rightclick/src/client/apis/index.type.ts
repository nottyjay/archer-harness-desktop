/** 宿主动作路由的统一结果体（200 时宿主返回；error 字段为宿主侧诊断文案）。 */
export interface ActionResult {
  ok?: boolean
  error?: string
}

/** POST /open-url 请求体。 */
export interface OpenUrlPayload {
  url: string
}

/** POST /open-path 请求体。 */
export interface OpenPathPayload {
  path: string
}
