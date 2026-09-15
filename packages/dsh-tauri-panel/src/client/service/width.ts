/**
 * service/width.ts — 面板内容区宽度同步（方案 A 的机制侧，镜像 alpha
 * ConversationRoot 的宽度协议，自给自足：自己的根元素发布变量、自己的偏好读写，
 * 不依赖官方根元素）。协议层方法（setWidth/resetWidth/getWidth）也在这里，
 * 供 panel.protocol 装配。
 *
 * 能力探测：ResizeObserver 缺失（旧 WebView）→ supported=false，宽度固定
 * （与现状一致），仅 console.warn 一次。
 */

import { createLifecycleController } from 'dsh-tauri/client'
import {
  PANEL_CONTENT_DEFAULT,
  PANEL_WIDTH_PREF_KEY,
  PANEL_WIDTH_VARS,
} from '../constants'
import { readWidthPreference, resolveContentWidth, writeWidthPreference } from '../utils/width'

/** 宽度控制器：UI 侧（attach）+ 协议侧（set/reset/get）共用。 */
export interface PanelWidthController {
  /** 能力探测结果：false 时固定宽度。 */
  supported: boolean
  /** 挂载根元素：ResizeObserver 发布列宽 + 偏好；返回 detach（disconnect）。 */
  attach: (root: HTMLElement) => () => void
  /** 程序化设置内容宽度（clamp 到契约范围并持久化）。 */
  setWidth: (px: number) => void
  /** 清除宽度偏好，恢复自适应。 */
  resetWidth: () => void
  /** 当前内容宽度（含偏好；无根元素时返回偏好或 null）。 */
  getWidth: () => number | null
}

/** 能力探测（旧 WebView 无 ResizeObserver 时降级固定宽度）。 */
function detectWidthSupport(): boolean {
  if (typeof window === 'undefined')
    return false
  return typeof window.ResizeObserver === 'function'
}

/** 创建宽度控制器（每次面板服务装配创建一次，重载时随 bundle 重建）。 */
export function createPanelWidthController(): PanelWidthController {
  const supported = detectWidthSupport()
  let warned = false
  let root: HTMLElement | null = null

  const warnOnce = (): void => {
    if (warned)
      return
    warned = true
    console.warn('[dsh-tauri-panel] width sync unsupported (ResizeObserver missing) — fixed width.')
  }

  /** 把列宽 + 当前偏好发布到根元素 CSS 变量。 */
  function publishWidths(el: HTMLElement): void {
    const column = el.offsetWidth
    el.style.setProperty(PANEL_WIDTH_VARS.column, `${column}px`)
    const preference = readWidthPreference(window.localStorage)
    if (preference === null)
      el.style.removeProperty(PANEL_WIDTH_VARS.user)
    else
      el.style.setProperty(PANEL_WIDTH_VARS.user, `${resolveContentWidth(column, preference)}px`)
  }

  function attach(el: HTMLElement): () => void {
    root = el
    if (!supported) {
      warnOnce()
      return () => {
        root = null
      }
    }
    publishWidths(el)
    // 每次 attach 建独立生命周期：detach 时统一清理该次的 observer，
    // 面板重开（再次 attach）不会命中已 dispose 的旧控制器。
    const lifecycle = createLifecycleController()
    const observer = new ResizeObserver(() => publishWidths(el))
    observer.observe(el)
    lifecycle.add(() => observer.disconnect())
    return () => {
      lifecycle.dispose()
      root = null
    }
  }

  function setWidth(px: number): void {
    const column = root?.offsetWidth ?? PANEL_CONTENT_DEFAULT
    const resolved = resolveContentWidth(column, px)
    writeWidthPreference(window.localStorage, resolved)
    if (root)
      root.style.setProperty(PANEL_WIDTH_VARS.user, `${resolved}px`)
  }

  function resetWidth(): void {
    window.localStorage.removeItem(PANEL_WIDTH_PREF_KEY)
    if (root)
      publishWidths(root)
  }

  function getWidth(): number | null {
    const preference = readWidthPreference(window.localStorage)
    if (!root)
      return preference
    return resolveContentWidth(root.offsetWidth, preference)
  }

  return { supported, attach, setWidth, resetWidth, getWidth }
}
