/**
 * install-hook.ts — 安装类命令执行前的依赖链接断开。
 *
 * 工作树默认把源仓库的依赖目录链接进来（见 service/dependencies.ts）。链接是共享的：
 * 若包管理器直接写入会穿透链接污染源仓库。本模块在 `tools/execute` 钩子里检测到
 * 「安装依赖」类命令时，先摘掉工作树内的链接，让这次安装在**工作树内**物化成一份
 * 独立目录 —— 满足「agent 依旧可以安装，但安装后是独立 node_modules」的要求。
 *
 * 钩子体保持纯编排：命令识别、链接断开、ledger 读取都委托给各自模块；任何失败都
 * 只记录日志，绝不阻断工具调用本身。
 */

import type { HostContext } from '../types'
import { loadBindingSync } from '../storage'
import { isDependencyInstallCommand, normalizeLinkDirectories, unlinkWorktreeDependencies } from './dependencies'

/**
 * shell 类工具名白名单：只有这些工具的 `command` 参数才可能是安装命令。
 * 未知工具名直接跳过，避免把普通参数误判成命令。
 */
const SHELL_TOOL_NAMES = new Set(['bash', 'pwsh', 'shell', 'sh', 'zsh', 'terminal', 'run_command', 'exec'])

/** 从工具执行上下文里取命令文本（兼容 command/cmd/script 三种参数名）。 */
export function shellCommandFrom(exec: unknown): string {
  const name = (exec as { name?: unknown } | undefined)?.name
  if (typeof name !== 'string' || !SHELL_TOOL_NAMES.has(name))
    return ''
  const args = (exec as { arguments?: unknown } | undefined)?.arguments
  if (!args || typeof args !== 'object')
    return ''
  for (const key of ['command', 'cmd', 'script']) {
    const value = (args as Record<string, unknown>)[key]
    if (typeof value === 'string' && value)
      return value
  }
  return ''
}

/**
 * 若本次工具调用是「在工作树里安装依赖」，先断开共享链接。
 *
 * @returns 实际断开的目录名（无操作时为空数组）
 */
export async function materializeLinkedDependencies(
  ctx: HostContext,
  worktreesRoot: string,
  configuredDirectories: readonly string[] | undefined,
  exec: unknown,
): Promise<string[]> {
  const command = shellCommandFrom(exec)
  if (!command || !isDependencyInstallCommand(command))
    return []
  const sessionId = (exec as { agent?: { session?: { id?: unknown } } } | undefined)?.agent?.session?.id
  if (typeof sessionId !== 'string' || !sessionId)
    return []
  const binding = loadBindingSync(worktreesRoot, sessionId)
  if (!binding?.worktreePath)
    return []
  const directories = normalizeLinkDirectories([
    ...(binding.linkedDependencies ?? []),
    ...normalizeLinkDirectories(configuredDirectories),
  ])
  const unlinked = await unlinkWorktreeDependencies(binding.worktreePath, directories)
  if (unlinked.length > 0) {
    ctx.logger?.info?.(
      `dsh-tauri-worktree: unlinked ${unlinked.join(', ')} before install in ${binding.worktreePath}; `
      + 'the package manager will materialize an independent copy',
    )
  }
  return unlinked
}
