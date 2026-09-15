import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { MAX_FILE_BYTES } from '../constants'
import { gitInRepo, gitInSnapshot } from './git'
import {
  describeRepository,
  enforceWorkspaceRetention,
  exclusionsPathFor,
  readExclusions,
  repositorySizeMb,
  resetRetentionState,
  writeExclusions,
} from './retention'
import { captureSnapshot, ensureSnapshotRepo, snapshotStoreFor, turnRef } from './snapshot'

const run = promisify(execFile)

const temporaryDirectories: string[] = []

type Store = ReturnType<typeof snapshotStoreFor>

async function fixture(): Promise<{ dshHome: string, worktree: string, store: Store }> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-turnrewind-retention-'))
  temporaryDirectories.push(root)
  const dshHome = join(root, 'home')
  const worktree = join(root, 'project')
  await mkdir(dshHome, { recursive: true })
  await mkdir(worktree, { recursive: true })
  await run('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet', worktree], { windowsHide: true })
  await writeFile(join(worktree, 'a.txt'), 'tracked\n', 'utf8')
  const store = snapshotStoreFor(dshHome, worktree)
  const ensured = await ensureSnapshotRepo(store)
  expect(ensured.ok).toBe(true)
  return { dshHome, worktree, store }
}

afterEach(async () => {
  resetRetentionState()
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

/** 造出两个「值得排除」的对象：超限文件 + 嵌套仓库。 */
async function makeExcludable(worktree: string): Promise<{ bigPath: string, nested: string }> {
  const bigPath = join(worktree, 'big.bin')
  await writeFile(bigPath, Buffer.alloc(MAX_FILE_BYTES + 1024))
  const nested = join(worktree, 'nested')
  await mkdir(join(nested, '.git'), { recursive: true })
  return { bigPath, nested }
}

describe('排除清单', () => {
  it('写读往返：丢弃越界路径并去重', async () => {
    const { worktree, store } = await fixture()
    await makeExcludable(worktree)
    await writeExclusions(store, ['big.bin', 'nested', '../escape.txt', '/abs/outside.txt', 'big.bin'])
    // 越界路径读回时必须被丢掉：绝不接受账本/清单里的逃逸路径。
    expect((await readExclusions(store)).sort()).toEqual(['big.bin', 'nested'])
  })

  it('文件缩回上限内、嵌套仓库消失后自动移出清单', async () => {
    const { worktree, store } = await fixture()
    const { bigPath, nested } = await makeExcludable(worktree)

    await writeExclusions(store, ['big.bin', 'nested'])
    expect((await readExclusions(store)).sort()).toEqual(['big.bin', 'nested'])

    await writeFile(bigPath, 'small', 'utf8')
    await rm(nested, { recursive: true, force: true })
    expect(await readExclusions(store)).toEqual([])
    // 复检结论已回写磁盘：后续读取不再重复判定。
    expect(existsSync(exclusionsPathFor(store))).toBe(true)
  })
})

describe('容量治理', () => {
  it('prune 回收不可达对象，但不碰 refs/turnrewind/* 链上的对象', async () => {
    const { worktree, store } = await fixture()
    const captured = await captureSnapshot(store, turnRef('s1', 1, 'before'), 'turn 1 before')
    expect(captured.ok).toBe(true)

    // 造一个没有任何 ref 可达的 loose object——正是实时读数每 1.5s 产生的那些东西。
    const orphan = join(worktree, 'orphan.txt')
    await writeFile(orphan, 'unreachable content\n', 'utf8')
    const hashed = await run('git', ['--git-dir', store.gitDir, 'hash-object', '-w', orphan], { windowsHide: true })
    const oid = hashed.stdout.trim()
    expect(oid).toMatch(/^[0-9a-f]{40}$/)
    await rm(orphan, { force: true })

    const retention = await enforceWorkspaceRetention(store, { maxRepoMb: 1024 })
    expect(retention.pruned).toBe(true)
    expect(retention.rebuilt).toBe(false)
    const orphanAlive = await gitInSnapshot(store, ['cat-file', '-e', oid]).then(result => result.ok)
    expect(orphanAlive).toBe(false)
    // 被 ref 引用的快照仍然完好。
    const refAlive = await gitInSnapshot(store, ['rev-parse', '--verify', turnRef('s1', 1, 'before')]).then(result => result.ok)
    expect(refAlive).toBe(true)
  })

  it('超过容量上限：整仓隔离重建 + 代数轮换 + 排除清单清空', async () => {
    const { store } = await fixture()
    await writeExclusions(store, ['a.txt'])
    const beforeGeneration = store.generation
    const sizeMb = await repositorySizeMb(store.gitDir)
    expect(sizeMb).toBeGreaterThan(0)

    // 用一个极小上限触发重建路径（真实上限 2GB，测试造不出来）。
    const retention = await enforceWorkspaceRetention(store, { maxRepoMb: sizeMb / 2 })
    expect(retention.rebuilt).toBe(true)
    expect(retention.exclusions).toEqual([])
    expect(existsSync(join(store.gitDir, 'HEAD'))).toBe(false)
    // 隔离目录是过渡态，必须被清掉；残留会让下次重建拿到脏数据。
    expect(existsSync(`${store.gitDir}.retention-quarantine`)).toBe(false)
    // 代数轮换 → 账本里的旧记录自然转为「已过期」。
    expect(store.generation).toBeTypeOf('string')
    expect(store.generation).not.toBe(beforeGeneration)
    expect(store.rebuiltReason).toContain('exceeded')
  })

  it('隔离目录残留时重建前先清场', async () => {
    const { store } = await fixture()
    // 模拟上一次重建死在 `rm` 之前：隔离目录里躺着旧仓。
    await rename(store.gitDir, `${store.gitDir}.retention-quarantine`).catch(() => undefined)
    const ensured = await ensureSnapshotRepo(store)
    expect(ensured.ok).toBe(true)
    const retention = await enforceWorkspaceRetention(store, { maxRepoMb: 0 })
    expect(retention.rebuilt).toBe(true)
    expect(existsSync(`${store.gitDir}.retention-quarantine`)).toBe(false)
  })
})

describe('describeRepository', () => {
  it('汇总 ref 数、体积与隔离残骸', async () => {
    const { store } = await fixture()
    const captured = await captureSnapshot(store, turnRef('s1', 1, 'before'), 'turn 1 before')
    expect(captured.ok).toBe(true)

    const described = await describeRepository(store)
    expect(described.refs).toBeGreaterThan(0)
    expect(described.sizeMb).toBeGreaterThanOrEqual(0)
    expect(described.quarantineLeftover).toBe(false)

    // 未初始化的仓（git 命令失败）不应抛，只是 ref 数为 0。
    const empty = snapshotStoreFor(join(store.gitDir, '..', 'absent-home'), store.worktree)
    await expect(describeRepository(empty)).resolves.toMatchObject({ refs: 0, quarantineLeftover: false })
  })
})

describe('工作区状态', () => {
  it('治理不修改用户仓库（私有仓之外零副作用）', async () => {
    const { worktree, store } = await fixture()
    const head = await gitInRepo(worktree, ['rev-parse', 'HEAD']).then(result => (result.ok ? result.out.trim() : 'no-head'))
    await enforceWorkspaceRetention(store, { maxRepoMb: 0 })
    const after = await gitInRepo(worktree, ['rev-parse', 'HEAD']).then(result => (result.ok ? result.out.trim() : 'no-head'))
    expect(after).toBe(head)
    expect((await gitInRepo(worktree, ['status', '--porcelain=v1'])).ok).toBe(true)
  })
})
