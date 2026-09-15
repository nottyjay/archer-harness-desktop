/**
 * install-hook.test.ts — 安装命令识别与「安装前断开共享链接」的真实文件系统回归。
 */

import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { linkWorktreeDependencies } from './dependencies'
import { materializeLinkedDependencies, shellCommandFrom } from './install-hook'

const temporaryDirectories: string[] = []

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix))
  temporaryDirectories.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

/** 构造源仓库 + 已链接依赖的工作树 + 指向该工作树的 ledger 记录。 */
async function createLinkedWorktreeFixture(sessionId: string): Promise<{
  project: string
  worktree: string
  worktreesRoot: string
  marker: string
}> {
  const project = await temporaryRoot('dsh-install-hook-project-')
  const worktree = await temporaryRoot('dsh-install-hook-worktree-')
  const worktreesRoot = await temporaryRoot('dsh-install-hook-root-')
  const marker = join(project, 'node_modules', 'pkg', 'index.js')
  await mkdir(join(project, 'node_modules', 'pkg'), { recursive: true })
  await writeFile(marker, 'shared-dependency\n')
  await linkWorktreeDependencies(project, worktree, ['node_modules'])

  await mkdir(join(worktreesRoot, 'ledger'), { recursive: true })
  await writeFile(join(worktreesRoot, 'ledger', `${sessionId}.json`), JSON.stringify({
    sessionId,
    sourceSessionId: sessionId,
    hash: 'hash',
    dirname: 'project',
    worktreePath: worktree,
    projectPath: project,
    branchName: '(detached)',
    ownsBranch: false,
    createdAt: new Date().toISOString(),
    log: [],
    linkedDependencies: ['node_modules'],
  }))

  return { project, worktree, worktreesRoot, marker }
}

describe('shellCommandFrom', () => {
  it('reads the command from known shell tools', () => {
    expect(shellCommandFrom({ name: 'pwsh', arguments: { command: 'pnpm install' } })).toBe('pnpm install')
    expect(shellCommandFrom({ name: 'bash', arguments: { cmd: 'npm ci' } })).toBe('npm ci')
    expect(shellCommandFrom({ name: 'shell', arguments: { script: 'yarn' } })).toBe('yarn')
  })

  it('ignores non-shell tools and malformed executions', () => {
    expect(shellCommandFrom({ name: 'read', arguments: { command: 'pnpm install' } })).toBe('')
    expect(shellCommandFrom({ name: 'pwsh', arguments: {} })).toBe('')
    expect(shellCommandFrom({ name: 'pwsh' })).toBe('')
    expect(shellCommandFrom(undefined)).toBe('')
  })
})

describe('materializeLinkedDependencies', () => {
  it('unlinks the shared dependency directory before an install command runs', async () => {
    const sessionId = 'session-install'
    const { project, worktree, worktreesRoot, marker } = await createLinkedWorktreeFixture(sessionId)
    const info = vi.fn()

    const unlinked = await materializeLinkedDependencies(
      { logger: { info } },
      worktreesRoot,
      undefined,
      { name: 'pwsh', arguments: { command: 'pnpm install' }, agent: { session: { id: sessionId } } },
    )

    expect(unlinked).toEqual(['node_modules'])
    await expect(lstat(join(worktree, 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
    // 源仓库依赖必须完好，否则工作树删除会连带毁掉本地主工作区。
    expect(await readFile(marker, 'utf8')).toBe('shared-dependency\n')
    expect(await readFile(join(project, 'node_modules', 'pkg', 'index.js'), 'utf8')).toBe('shared-dependency\n')
    expect(info).toHaveBeenCalledTimes(1)
  })

  it('leaves the link in place for non-install commands and unknown sessions', async () => {
    const sessionId = 'session-other'
    const { worktree, worktreesRoot } = await createLinkedWorktreeFixture(sessionId)

    const nonInstall = await materializeLinkedDependencies(
      { logger: {} },
      worktreesRoot,
      undefined,
      { name: 'pwsh', arguments: { command: 'pnpm run build' }, agent: { session: { id: sessionId } } },
    )
    expect(nonInstall).toEqual([])

    const unknownSession = await materializeLinkedDependencies(
      { logger: {} },
      worktreesRoot,
      undefined,
      { name: 'pwsh', arguments: { command: 'pnpm install' }, agent: { session: { id: 'session-missing' } } },
    )
    expect(unknownSession).toEqual([])
    expect((await lstat(join(worktree, 'node_modules'))).isSymbolicLink()).toBe(true)
  })

  it('honors configured extra dependency directories recorded in the binding', async () => {
    const sessionId = 'session-venv'
    const { project, worktree, worktreesRoot } = await createLinkedWorktreeFixture(sessionId)
    await mkdir(join(project, '.venv', 'lib'), { recursive: true })
    await linkWorktreeDependencies(project, worktree, ['.venv'])

    const unlinked = await materializeLinkedDependencies(
      { logger: {} },
      worktreesRoot,
      ['.venv'],
      { name: 'pwsh', arguments: { command: 'uv sync' }, agent: { session: { id: sessionId } } },
    )

    // binding 记录的 node_modules ∪ 配置新增的 .venv 都会被断开。
    expect(unlinked).toEqual(['node_modules', '.venv'])
    await expect(lstat(join(worktree, '.venv'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(worktree, 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
