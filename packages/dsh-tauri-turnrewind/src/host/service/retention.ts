/**
 * host/service/retention.ts — 私有快照仓的容量治理与排除清单。
 *
 * 三件事，全部只在「工作区首次触碰」这个安全点做一次（此时该工作区没有在飞 turn、
 * 也没有进行中的撤销，且调用方已持有工作区串行队列）：
 *
 *   1. **回收不可达对象**：`git prune --expire=now`。运行中的实时读数每 1.5s 就跑一次
 *      `git add --all`，中间版本的 blob 没有任何 ref 可达；我们把 `gc.auto` 关成 0
 *      （避免后台回收与撤销抢锁），所以必须显式回收，否则私有仓只涨不降。
 *   2. **容量上限 → 整仓隔离重建**：`rename` 到隔离目录是**原子发布点**，之后任何一步
 *      死亡都自洽（live 路径已空，下一次捕获重建基线）；随后轮换快照仓代数，账本里
 *      引用旧代数的记录自然转为「已过期」，不需要扫描所有会话账本、也不需要回滚任何行。
 *   3. **排除清单**：超限文件与嵌套仓库不进快照，但必须被**记录**（而不是静默漏掉）；
 *      清单持久化在这里，每次复检——文件缩回上限内或被删、嵌套仓库消失，就自动移出。
 */

import type { SnapshotStore } from '../types'
import { existsSync, lstatSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'pathe'
import { MAX_FILE_BYTES, MAX_SNAPSHOT_REPO_MB } from '../constants'
import { gitInSnapshot, pruneLooseObjects } from './git'
import { resolveInsideWorkspace } from './paths'
import { rotateGeneration } from './snapshot'

/** 排除清单文件：与快照仓同目录、同哈希前缀。 */
export function exclusionsPathFor(store: SnapshotStore): string {
  return `${store.gitDir}.exclude.json`
}

/** 目录体积（MB）。best-effort：并发清理/杀软句柄丢一两个文件不影响量级判断。 */
export async function repositorySizeMb(dir: string): Promise<number> {
  let total = 0
  const walk = async (path: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(path, { withFileTypes: true })
    }
    catch {
      return
    }
    for (const entry of entries) {
      const full = join(path, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      try {
        total += (await stat(full)).size
      }
      catch {
        /* 并发清理：忽略 */
      }
    }
  }
  await walk(dir)
  return total / (1024 * 1024)
}

/**
 * 读取排除清单并复检：路径必须仍在工作区内，且仍然「值得排除」——
 * 文件仍超过单文件上限，或目录里仍有 `.git`。失效项顺手从磁盘上清掉。
 * @param store - 私有快照仓。
 * @returns 复检后仍然有效的排除路径。
 */
export async function readExclusions(store: SnapshotStore): Promise<string[]> {
  const path = exclusionsPathFor(store)
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'))
  }
  catch {
    return []
  }
  const record = parsed as { paths?: unknown }
  if (!Array.isArray(record?.paths))
    return []
  const valid: string[] = []
  for (const candidate of record.paths) {
    if (typeof candidate !== 'string')
      continue
    const absolute = resolveInsideWorkspace(store.worktree, candidate)
    if (absolute === null)
      continue
    try {
      const stats = lstatSync(absolute)
      if (stats.isDirectory()) {
        if (existsSync(join(absolute, '.git')))
          valid.push(candidate)
        continue
      }
      if (stats.size > MAX_FILE_BYTES)
        valid.push(candidate)
    }
    catch {
      /* 路径已消失：不再排除 */
    }
  }
  const unique = [...new Set(valid)]
  if (unique.length !== record.paths.length)
    await writeExclusions(store, unique)
  return unique
}

/** 持久化排除清单。 */
export async function writeExclusions(store: SnapshotStore, paths: readonly string[]): Promise<void> {
  const path = exclusionsPathFor(store)
  try {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify({ paths: [...new Set(paths)] }, null, 2)}\n`, 'utf8')
  }
  catch {
    /* 清单只是加速手段：写失败只是下次多付一次重捕代价 */
  }
}

export interface RetentionOutcome {
  /** 是否执行了不可达对象回收。 */
  pruned: boolean
  /** 治理后测得的私有仓体积（MB）。 */
  repoSizeMb: number
  /** 是否因超限做了整仓隔离重建（此后旧 turn 全部转为过期）。 */
  rebuilt: boolean
  /** 复检后的排除清单。 */
  exclusions: string[]
}

/**
 * 对一个工作区执行容量治理（调用方保证：无在飞 turn、无进行中的撤销、持有工作区队列）。
 * @param store - 私有快照仓。
 * @param options - 容量治理选项。
 * @param options.maxRepoMb - 覆盖容量上限（缺省用常量；宿主配置/测试可覆盖）。
 * @returns 治理结果（含复检后的排除清单）。
 */
export async function enforceWorkspaceRetention(store: SnapshotStore, options: { maxRepoMb?: number } = {}): Promise<RetentionOutcome> {
  const maxRepoMb = options.maxRepoMb ?? MAX_SNAPSHOT_REPO_MB
  const pruned = await pruneLooseObjects(store)
  const exclusions = await readExclusions(store)
  const beforeMb = await repositorySizeMb(store.gitDir)
  if (beforeMb <= maxRepoMb)
    return { pruned, repoSizeMb: beforeMb, rebuilt: false, exclusions }

  // 两阶段重建：先把 live 仓库整体改名进隔离目录（原子发布点），再删隔离目录。
  // 直删在半途死亡会留下一个半删的 live 目录；改名之后任何一步死亡都自洽。
  const quarantine = `${store.gitDir}.retention-quarantine`
  await rm(quarantine, { recursive: true, force: true }).catch(() => undefined)
  await rename(store.gitDir, quarantine)
  await rotateGeneration(store, `repository exceeded ${maxRepoMb}MB (${Math.round(beforeMb)}MB)`)
  await rm(quarantine, { recursive: true, force: true }).catch(() => undefined)
  // 排除清单随仓一起失效（路径仍然有效，但清单文件与仓同名前缀、此时已被卷进隔离目录）。
  await writeExclusions(store, [])
  return { pruned, repoSizeMb: 0, rebuilt: true, exclusions: [] }
}

/** 每工作区每进程只治理一次（避免每个 turn 都走目录体积统计）。 */
const retained = new Set<string>()

/**
 * 首次触碰某工作区时执行一次容量治理。
 * @param store - 私有快照仓。
 * @returns 治理结果；本进程内重复调用直接返回缓存结论。
 */
export async function ensureWorkspaceRetention(store: SnapshotStore): Promise<RetentionOutcome | null> {
  const key = store.gitDir
  if (retained.has(key))
    return null
  retained.add(key)
  return enforceWorkspaceRetention(store)
}

/** 清空「本进程已治理」标记（测试用）。 */
export function resetRetentionState(): void {
  retained.clear()
}

/** 私有仓健康摘要（诊断：ref 数 + 体积 + 是否有残留隔离目录）。 */
export async function describeRepository(store: SnapshotStore): Promise<{ refs: number, sizeMb: number, quarantineLeftover: boolean }> {
  const listed = await gitInSnapshot(store, ['for-each-ref', '--format=%(refname)'])
  const refs = listed.ok ? listed.out.split('\n').filter(line => line.trim().length > 0).length : 0
  return {
    refs,
    sizeMb: Math.round(await repositorySizeMb(store.gitDir)),
    quarantineLeftover: existsSync(`${store.gitDir}.retention-quarantine`),
  }
}
