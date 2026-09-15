/**
 * client/index.ts — 调度器客户端装配入口。
 *
 * 只做 import + 组装（locale / styles / RPC / 注册）；无业务实现。
 * 结构分层见 AGENTS.md 客户端目录模板：types/ utils/ apis/ store/ styles/
 * components/ register/ 各司其职。
 */

import type { SchedulerClientContext, Translate } from './types'
import { mountStyle } from 'dsh-tauri-ui/client'
import { LOCALE_NAMESPACE, PLUGIN_ID, SESSION_ICONS_EFFECT, STYLE_ID, STYLES_EFFECT } from './constants'
import { registerSchedulerLocale } from './locales'
import { registerSchedulerPanel } from './register/panel'
import { registerSchedulerPrefill } from './register/prefill'
import { registerSessionIcons } from './register/session-icons'
import schedulerIndexStyle from './styles/index.cssr'

export { SCHEDULER_API_PREFIX } from '../shared/constants'
export type * from './types'

/** 插件显示名（诊断元数据）。 */
export const name = PLUGIN_ID

/** 需要的客户端服务：slots（注册点位）、locale（双语文案）。 */
export const inject = ['slots', 'layout', 'locale', 'sessions', 'workspaces']

/**
 * 插件体：安装文案与样式，注册面板条目与 Chat 预填桥。
 * @param ctx - 客户端根上下文。
 */
export function apply(ctx: SchedulerClientContext): void {
  registerSchedulerLocale(ctx)
  ctx.effect(() => mountStyle(schedulerIndexStyle, STYLE_ID), STYLES_EFFECT)
  const t = ctx.locale.bind(LOCALE_NAMESPACE) as Translate
  registerSchedulerPanel(ctx, t)
  registerSchedulerPrefill(ctx)
  ctx.effect(() => registerSessionIcons(), SESSION_ICONS_EFFECT)
}
