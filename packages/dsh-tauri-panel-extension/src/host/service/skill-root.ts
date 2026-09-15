/**
 * host/service/skill-root.ts — 用户注册的自定义技能仓库领域原语（skills 功能目录）。
 *
 * 状态文档：`$DSH_HOME/skills/state.json`（skillRoots 数组）。create / delete /
 * get 原语；写走 storage.setItem（原子写），读走 storage.getItem。
 */

import { randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { storage } from '../storage'

/** One user-registered custom skill repository. */
export interface SkillRootEntry {
  /** Stable id (used by the remove route and directory names). */
  id: string
  /** `local` — a path on this machine; `git` — extracted from a GitHub URL. */
  kind: 'local' | 'git'
  /** Display label (repo `owner/name` or the local path's basename). */
  label: string
  /** The source URL (git entries). */
  url?: string
  /** Branch/tag/ref the tarball was pulled from (git entries). */
  ref?: string
  /** Local path the user pointed at (local entries). */
  path?: string
  /** Scan roots this entry contributes (single-skill repos get a wrapper dir). */
  roots: string[]
  /** Where this entry's downloaded/junctioned material lives, if any. */
  materialDir?: string
  addedAt: number
}

/** On-disk state document. */
export interface PluginState {
  skillRoots: SkillRootEntry[]
}

const STATE_KEY = 'state.json'

/** skills 功能目录的绝对路径（material 落盘与只读判定用，与 storage base 一致）。 */
export function skillsRootDir(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'skills')
}

/** 读取全部注册的自定义技能仓库。 */
export async function getSkillRoots(): Promise<SkillRootEntry[]> {
  const parsed = await storage.getItem<Partial<PluginState>>(STATE_KEY)
  if (!Array.isArray(parsed?.skillRoots))
    return []
  return parsed.skillRoots.filter((entry): entry is SkillRootEntry =>
    typeof entry === 'object' && entry !== null && typeof entry.id === 'string' && Array.isArray(entry.roots))
}

/** 按 GitHub 源 URL 查找已注册仓库（含 legacy labels）。 */
export async function findSkillRootByUrl(url: string): Promise<SkillRootEntry | undefined> {
  return (await getSkillRoots()).find(entry => entry.url === url)
}

/** 新增唯一 entry id。 */
export function newEntryId(kind: 'local' | 'git'): string {
  return `${kind}-${randomBytes(4).toString('hex')}`
}

/** 某 entry 的下载物目录（git 提取、junction 包装）。 */
export function materialDirFor(entryId: string): string {
  return join(skillsRootDir(), 'repos', entryId)
}

/** 追加一个 entry 并持久化。返回存储的 entry。 */
export async function createSkillRoot(entry: Omit<SkillRootEntry, 'addedAt'>): Promise<SkillRootEntry> {
  const skillRoots = await getSkillRoots()
  const stored: SkillRootEntry = { ...entry, addedAt: Date.now() }
  skillRoots.push(stored)
  await storage.setItem(STATE_KEY, `${JSON.stringify({ skillRoots }, null, 2)}\n`)
  return stored
}

/**
 * 注销一个 entry 并持久化。material 目录不在此删除：provider 仍在 watch 它，
 * 删除被 watch 的树在 Windows 上会 EPERM。调用方先 remountProvider，再用返回的
 * entry.materialDir 清树。返回被移除的 entry；id 未知返回 undefined。
 */
export async function deleteSkillRoot(id: string): Promise<SkillRootEntry | undefined> {
  const skillRoots = await getSkillRoots()
  const at = skillRoots.findIndex(entry => entry.id === id)
  if (at === -1)
    return undefined
  const [removed] = skillRoots.splice(at, 1)
  await storage.setItem(STATE_KEY, `${JSON.stringify({ skillRoots }, null, 2)}\n`)
  return removed
}
