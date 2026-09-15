/**
 * session-files.ts — 会话定位与持久化文件域：从 ctx 找会话对象、读其 cwd，
 * 以及按会话 id 定位/删除磁盘上的会话数据目录。
 *
 * 删除授权边界：
 *   - id → 编码（encodeSessionId）与 dsh 宿主 JSONL 持久化后端的编码完全一致；
 *   - 路径必须严格位于 sessionsRoot 之内（isWithinSessionsRoot），防 `..`/绝对路径逃逸；
 *   - 物理删除是 best-effort（找不到就跳过），但抛出异常时必须由调用方中止流程。
 */

import type { HostContext, SessionLike } from '../types'
import { readdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { dirname, join, resolve, sep } from 'pathe'

/** 会话数据根目录（默认 `$DSH_HOME/sessions`；测试可注入临时根）。 */
function sessionsRoot(dshHome: string | undefined): string {
  return join(dshHome ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'sessions')
}

/** 查找会话对象（host ctx.sessions）。 */
export function findSession(ctx: HostContext, sessionId: string): SessionLike | undefined {
  if (!sessionId)
    return undefined
  return (ctx.sessions?.get?.(sessionId) as SessionLike | undefined)
    ?? (ctx.sessions?.list?.() as SessionLike[] | undefined)?.find((session: SessionLike) => session.id === sessionId)
}

/** 会话工作目录（header.cwd）。 */
export function sessionCwd(session: SessionLike | undefined): string | undefined {
  const cwd = session?.header?.cwd
  return typeof cwd === 'string' && cwd ? cwd : undefined
}

/** 判断一个路径是否是存在的目录。 */
function isDir(path: string): boolean {
  try {
    return readdirSync(path).length >= 0
  }
  catch {
    return false
  }
}

/** 判断一个路径是否是空目录（不存在视为 false）。 */
function isEmptyDir(path: string): boolean {
  try {
    return readdirSync(path).length === 0
  }
  catch {
    return false
  }
}

/** 规范化路径是否严格位于 sessionsRoot 之内（防 `..`/绝对路径逃逸）。 */
export function isWithinSessionsRoot(sessionsRoot: string, candidate: string): boolean {
  const root = resolve(sessionsRoot)
  const target = resolve(candidate)
  return target === root || target.startsWith(`${root}${sep}`)
}

/** Encode the session id exactly as the JSONL persistence backend does. */
export function encodeSessionId(id: string): string {
  if (id === '.')
    return '~002E'
  if (id === '..')
    return '~002E~002E'
  let encoded = ''
  for (let index = 0; index < id.length; index++) {
    const code = id.charCodeAt(index)
    const char = String.fromCharCode(code)
    encoded += char !== '~' && /^[\w.-]$/.test(char)
      ? char
      : `~${code.toString(16).toUpperCase().padStart(4, '0')}`
  }
  return encoded
}

/**
 * 物理删除一个会话的持久化目录（best-effort，找不到就跳过），并顺带清理
 * 删除后变空的父目录（`$DSH_HOME/sessions/<group>/` 一类残留）。
 * dsh 宿主没有公开的「删除会话」API，会话数据存放在 `$DSH_HOME/sessions/<group>/session-<id>/`；
 * 这里做有界扫描（深度 2）命中 `session-<id>` 目录后删除。删除后宿主重启时
 * 会从持久化重建会话索引，该会话从工作区/归档中彻底消失。
 * @returns 是否实际删除了目录。
 */
export function removeSessionDataDir(sessionId: string, dshHome?: string): boolean {
  const sessionsRootDir = sessionsRoot(dshHome)
  const dir = findSessionDataDir(sessionsRootDir, sessionId)
  if (!dir)
    return false
  rmSync(dir, { recursive: true, force: true })
  pruneEmptyParents(sessionsRootDir, dirname(dir))
  return true
}

/** 递归清理删除会话目录后变空的父目录（不越过 sessionsRoot 根）。 */
function pruneEmptyParents(sessionsRoot: string, parent: string): void {
  if (!isWithinSessionsRoot(sessionsRoot, parent) || resolve(parent) === resolve(sessionsRoot))
    return
  if (!isEmptyDir(parent))
    return
  rmSync(parent, { recursive: true, force: true })
  pruneEmptyParents(sessionsRoot, dirname(parent))
}

/**
 * 只读定位一个会话的持久化数据目录（不删除）。
 * 扫描规则与 removeSessionDataDir 完全一致（有界深度 2，防 `..`/绝对路径逃逸），
 * 供「打开会话目录」解析目标路径使用。
 * @returns 会话数据目录绝对路径；未找到返回 undefined。
 */
export function locateSessionDataDir(sessionId: string, dshHome?: string): string | undefined {
  return findSessionDataDir(sessionsRoot(dshHome), sessionId)
}

/** 有界扫描（深度 2）查找会话数据目录，返回首个命中（含一级/二级布局）。 */
function findSessionDataDir(sessionsRoot: string, sessionId: string): string | undefined {
  // DSH versions use either the raw id or the legacy `session-<id>` directory name.
  const encodedId = encodeSessionId(sessionId)
  const markers = [encodedId, `session-${sessionId}`, sessionId]
  // 一级：sessions/<id> or sessions/session-<id>
  for (const marker of markers) {
    const direct = join(sessionsRoot, marker)
    if (isWithinSessionsRoot(sessionsRoot, direct) && isDir(direct))
      return direct
  }
  // 二级：sessions/<group>/session-<id>
  let groups: string[] = []
  try {
    groups = readdirSync(sessionsRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  }
  catch {
    return undefined
  }
  for (const group of groups) {
    for (const marker of markers) {
      const nested = join(sessionsRoot, group, marker)
      if (isWithinSessionsRoot(sessionsRoot, nested) && isDir(nested))
        return nested
    }
  }
  return undefined
}
