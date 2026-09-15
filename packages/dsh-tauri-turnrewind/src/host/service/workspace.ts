/**
 * host/service/workspace.ts — 会话工作区解析、规范化与资格守卫。
 *
 * 三条判定集中在此，路由与捕获路径共用：
 *   1. 会话 cwd 必须位于 Git worktree 内（否则 `TURNREWIND_GIT_REQUIRED`）；
 *   2. PATH 上没有 git 时单独报 `TURNREWIND_GIT_UNAVAILABLE`——两者给用户的指引
 *      完全不同（去 git init vs 去装 git），不能混为一谈；
 *   3. 家目录本身、家目录祖先、任何盘根与 UNC 共享根一律拒绝
 *      （`TURNREWIND_UNSAFE_WORKSPACE`）——这类目录做快照既有灾难风险又没有撤销价值。
 *
 * 快照域是 **worktree 根**：会话 cwd 是子目录时归并到根，同一仓库共享一个快照域。
 * 绝不使用 `process.cwd()` 兜底：宿主进程的工作目录未必是会话工作区。
 *
 * 性能：一次 `rev-parse` 批量取全部元数据（原先是两次子进程），结果进 60s 缓存并走
 * stale-while-revalidate——探测挂在 `agent/pre-step` 的执行屏障上，不能每次 turn 都
 * 同步阻塞在 git 上；探测超时也单列（30s，而不是重活的 5 分钟）。
 */

import type { WorkspaceProbe } from '../types'
import { createHash } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { resolve } from 'pathe'
import {
  GIT_PROBE_TIMEOUT_MS,
  REASON_GIT_REQUIRED,
  REASON_GIT_UNAVAILABLE,
  REASON_UNSAFE_WORKSPACE,
  WORKSPACE_CACHE_MAX,
  WORKSPACE_CACHE_TTL_MS,
} from '../constants'
import { gitInRepo } from './git'

/** 解析为磁盘上的真实路径（符号链接/短名归一）；路径不存在时退回 resolve 结果。 */
export function canonicalWorkspacePath(target: string): string {
  const resolved = resolve(target)
  try {
    // `.native` 是 Windows 的硬要求：libuv 的 JS-path realpath 不展开 8.3 短名
    // （TEMP=C:\Users\RUNNER~1\...），而 git 的 --show-toplevel 输出的是长名；
    // 不统一就会让同一个工作区产生两种拼写，归属校验永远失败。
    const native = process.platform === 'win32' ? resolved.replaceAll('/', '\\') : resolved
    return resolve(realpathSync.native(native))
  }
  catch {
    return resolved
  }
}

/**
 * 快照域的键：规范化后再做大小写折叠。
 * Windows 文件系统大小写不敏感，`C:\Repo` 与 `c:\repo` 必须折叠成同一个域，
 * 否则同一个工作区会分裂出两个私有快照仓。
 */
export function workspaceKey(target: string): string {
  const canonical = canonicalWorkspacePath(target)
  return process.platform === 'win32' ? canonical.toLowerCase() : canonical
}

/** 工作区键的短哈希（私有快照仓目录名）。 */
export function workspaceHash(target: string): string {
  return createHash('sha256').update(workspaceKey(target)).digest('hex').slice(0, 24)
}

/** 是否为系统级敏感目录（家目录本身、家目录祖先、盘根、UNC 共享根）。 */
export function isSystemSensitivePath(target: string): boolean {
  const raw = target.trim()
  if (raw.length === 0)
    return true
  // 盘根与 UNC 根必须按**原始形态**判定：pathe 会把 `C:\` 解析成 `/C:`、
  // 把 `\\server\share` 压成 `/server/share`，解析之后再判形态就不可靠了。
  if (/^[a-z]:[\\/]*$/i.test(raw))
    return true
  if (/^[\\/]{2}[^\\/]+[\\/][^\\/]+[\\/]*$/.test(raw))
    return true
  const canonical = workspaceKey(raw)
  if (canonical.length === 0)
    return true
  if (/^\/?[a-z]:\/?$/i.test(canonical) || canonical === '/')
    return true
  const home = workspaceKey(homedir())
  if (canonical === home)
    return true
  const homePrefix = canonical.endsWith('/') ? canonical : `${canonical}/`
  return home.startsWith(homePrefix)
}

/** 一次 rev-parse 批量取全部元数据：输出行序与参数顺序一致，省掉重复子进程。 */
const REV_PARSE_ARGS = ['rev-parse', '--is-inside-work-tree', '--show-toplevel', '--git-common-dir']

interface CacheEntry {
  at: number
  result: WorkspaceProbe
}

const probeCache = new Map<string, CacheEntry>()
const probeRefreshing = new Set<string>()

function remember(key: string, result: WorkspaceProbe): void {
  // git 缺失不缓存：装好 git / 修好 PATH 后应当立即恢复，而不是等 TTL 过期。
  if (!result.ok && result.reason === REASON_GIT_UNAVAILABLE)
    return
  probeCache.set(key, { at: Date.now(), result })
  if (probeCache.size <= WORKSPACE_CACHE_MAX)
    return
  const oldest = [...probeCache.entries()].sort((left, right) => left[1].at - right[1].at)[0]
  if (oldest !== undefined)
    probeCache.delete(oldest[0])
}

/** 后台刷新（stale-while-revalidate 的异步半边）：结果直接落缓存。 */
function refreshInBackground(key: string, cwd: string): void {
  if (probeRefreshing.has(key))
    return
  probeRefreshing.add(key)
  void probeUncached(cwd)
    .then((result) => {
      remember(key, result)
    })
    .catch(() => undefined)
    .finally(() => {
      probeRefreshing.delete(key)
    })
}

async function probeUncached(cwd: string): Promise<WorkspaceProbe> {
  const probed = await gitInRepo(cwd, REV_PARSE_ARGS, { timeoutMs: GIT_PROBE_TIMEOUT_MS })
  if (!probed.ok) {
    return {
      ok: false,
      reason: probed.code === 'ENOENT' ? REASON_GIT_UNAVAILABLE : REASON_GIT_REQUIRED,
    }
  }
  const lines = probed.out.split(/\r?\n/u).map(line => line.trim())
  if (lines[0] !== 'true')
    return { ok: false, reason: REASON_GIT_REQUIRED }
  const root = canonicalWorkspacePath(resolve(cwd, lines[1] ?? ''))
  const commonDir = canonicalWorkspacePath(resolve(cwd, lines[2] ?? ''))
  if (root.length === 0)
    return { ok: false, reason: REASON_GIT_REQUIRED }
  if (isSystemSensitivePath(root))
    return { ok: false, reason: REASON_UNSAFE_WORKSPACE }
  return { ok: true, root, commonDir }
}

/**
 * 探测会话工作区资格（带缓存）。
 * @param cwd - 会话 header 的 cwd；缺失时按「非 Git」处理（不猜测进程工作目录）。
 * @returns 通过时为 worktree 根与 common dir，否则为拒绝原因。
 */
export async function probeWorkspace(cwd: unknown): Promise<WorkspaceProbe> {
  if (typeof cwd !== 'string' || cwd.length === 0)
    return { ok: false, reason: REASON_GIT_REQUIRED }
  if (isSystemSensitivePath(cwd))
    return { ok: false, reason: REASON_UNSAFE_WORKSPACE }
  const key = workspaceKey(cwd)
  const cached = probeCache.get(key)
  if (cached !== undefined) {
    if (Date.now() - cached.at < WORKSPACE_CACHE_TTL_MS)
      return cached.result
    // 元数据短暂陈旧可接受（探测在执行屏障上）：先回缓存值，后台刷新下一次生效。
    refreshInBackground(key, cwd)
    return cached.result
  }
  const result = await probeUncached(cwd)
  remember(key, result)
  return result
}

/** 清空探测缓存（测试用：避免跨用例互相影响）。 */
export function clearWorkspaceProbeCache(): void {
  probeCache.clear()
}

/** 从会话对象上读取 cwd（header.cwd 优先，兼容 session.cwd）。 */
export function sessionCwdOf(session: any): string | null {
  const cwd = typeof session?.header?.cwd === 'string'
    ? session.header.cwd
    : typeof session?.cwd === 'string'
      ? session.cwd
      : ''
  return cwd.length > 0 ? cwd : null
}

/** 宿主 SessionStore 中查找会话；找不到返回 undefined（调用方按未知处理）。 */
export function findSession(ctx: any, sessionId: string): any {
  if (!sessionId)
    return undefined
  try {
    return ctx.sessions?.get?.(sessionId)
      ?? ctx.sessions?.list?.().find((session: any) => session?.id === sessionId)
  }
  catch {
    return undefined
  }
}
