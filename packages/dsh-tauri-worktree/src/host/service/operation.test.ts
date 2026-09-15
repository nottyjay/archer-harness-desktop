/**
 * operation.test.ts — ensureWorktree 的 Git 来源与分支行为。
 */

import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { simpleGit } from 'simple-git'
import { afterEach, describe, expect, it } from 'vitest'
import { projectDirname } from './git'
import { computeHash, discardWorktree, ensureWorktree, worktreePath } from './operation'

const temporaryDirectories: string[] = []

async function git(cwd: string, args: string[]): Promise<string> {
  return (await simpleGit({ baseDir: cwd, trimmed: true }).raw(args)).trim()
}

async function createRepository(branch: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-worktree-operation-'))
  temporaryDirectories.push(root)
  await git(root, ['init', '-b', branch])
  await writeFile(join(root, 'value.txt'), `${branch}\n`)
  await git(root, ['add', 'value.txt'])
  await git(root, [
    '-c',
    'user.name=DSH Test',
    '-c',
    'user.email=dsh-test@example.invalid',
    'commit',
    '-m',
    'initial',
  ])
  return root
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

/**
 * Mimic the cordis host ctx (see @deepseek-ai/cordis): reading a property that
 * was never injected throws `cannot get property "X" without inject`, while
 * optional host services are reachable through `ctx.get(name)`.
 */
function injectingCtx(services: Record<string, unknown> = {}): Record<string, unknown> {
  const target: Record<string, unknown> = {
    get(name: string): unknown {
      return services[name]
    },
  }
  return new Proxy(target, {
    get(t, prop, receiver) {
      if (prop in t)
        return Reflect.get(t, prop, receiver)
      throw new Error(`cannot get property "${String(prop)}" without inject`)
    },
  })
}

describe('ensureWorktree', () => {
  it('creates detached worktrees from refs/heads/main even when source HEAD differs', async () => {
    const repository = await createRepository('main')
    const mainHead = await git(repository, ['rev-parse', 'refs/heads/main'])
    await git(repository, ['checkout', '-b', 'feature'])
    await writeFile(join(repository, 'value.txt'), 'feature\n')
    await git(repository, ['add', 'value.txt'])
    await git(repository, [
      '-c',
      'user.name=DSH Test',
      '-c',
      'user.email=dsh-test@example.invalid',
      'commit',
      '-m',
      'feature',
    ])

    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)
    const result = await ensureWorktree({}, worktreesRoot, repository, 'detached-session')

    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(await git(result.binding.worktreePath, ['rev-parse', 'HEAD'])).toBe(mainHead)
    expect((await readFile(join(result.binding.worktreePath, 'value.txt'), 'utf8')).replaceAll('\r\n', '\n')).toBe('main\n')
    expect(result.binding.branchName).toBe('(detached)')

    await expect(discardWorktree({}, worktreesRoot, { sessionId: 'detached-session' })).resolves.toMatchObject({ ok: true })
  })

  it('creates -b worktrees from main while preserving branch-name conflict checks', async () => {
    const repository = await createRepository('main')
    const mainHead = await git(repository, ['rev-parse', 'refs/heads/main'])
    await git(repository, ['checkout', '-b', 'feature'])
    await writeFile(join(repository, 'value.txt'), 'feature\n')
    await git(repository, ['add', 'value.txt'])
    await git(repository, [
      '-c',
      'user.name=DSH Test',
      '-c',
      'user.email=dsh-test@example.invalid',
      'commit',
      '-m',
      'feature',
    ])

    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)
    const created = await ensureWorktree({}, worktreesRoot, repository, 'branch-session', { branchName: 'topic-main-source' })

    expect(created.ok).toBe(true)
    if (!created.ok)
      return
    expect(created.binding.branchName).toBe('dsh/topic-main-source')
    expect(await git(created.binding.worktreePath, ['rev-parse', 'HEAD'])).toBe(mainHead)
    expect((await readFile(join(created.binding.worktreePath, 'value.txt'), 'utf8')).replaceAll('\r\n', '\n')).toBe('main\n')

    const conflict = await ensureWorktree({}, worktreesRoot, repository, 'other-session', { branchName: 'topic-main-source' })
    expect(conflict).toEqual({ ok: false, error: '分支已存在：dsh/topic-main-source' })
    await expect(discardWorktree({}, worktreesRoot, { sessionId: 'branch-session' })).resolves.toMatchObject({ ok: true })
  }, 15_000)

  it('recreates over a directory-only orphan (state B) before adding', async () => {
    const repository = await createRepository('main')
    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)
    const hash = computeHash(repository, 'state-b-session')
    const orphan = worktreePath(worktreesRoot, hash, projectDirname(repository))
    await mkdir(join(orphan, 'residue'), { recursive: true })
    await writeFile(join(orphan, 'residue', 'old.txt'), 'stale')

    const result = await ensureWorktree({}, worktreesRoot, repository, 'state-b-session')

    expect(result.ok).toBe(true)
    if (!result.ok)
      return
    expect(existsSync(join(orphan, 'residue'))).toBe(false)
    expect(await git(result.binding.worktreePath, ['rev-parse', 'HEAD'])).not.toBe('')
    await expect(discardWorktree({}, worktreesRoot, { sessionId: 'state-b-session' })).resolves.toMatchObject({ ok: true })
  }, 15_000)

  it('fails clearly before creating a worktree when refs/heads/main is absent', async () => {
    const repository = await createRepository('develop')
    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)

    const result = await ensureWorktree({}, worktreesRoot, repository, 'missing-main-session')

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('refs/heads/main'),
    })
    expect(result.ok).toBe(false)
    expect(existsSync(worktreePath(worktreesRoot, computeHash(repository, 'missing-main-session'), projectDirname(repository))))
      .toBe(false)
  })

  it('stops worktree processes via ctx.get before discarding on a cordis-style ctx', async () => {
    const repository = await createRepository('main')
    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)
    const created = await ensureWorktree({}, worktreesRoot, repository, 'ctx-controller-session')
    expect(created.ok).toBe(true)
    if (!created.ok)
      return

    const stopped: string[] = []
    const ctx = injectingCtx({
      worktreeProcessController: {
        stopSessionProcesses: (sessionId: string, worktreePath: string) => {
          stopped.push(`${sessionId}:${worktreePath}`)
          return Promise.resolve()
        },
      },
    })

    const result = await discardWorktree(ctx, worktreesRoot, { sessionId: 'ctx-controller-session' })

    expect(result.ok).toBe(true)
    expect(existsSync(created.binding.worktreePath)).toBe(false)
    expect(stopped).toEqual([`ctx-controller-session:${created.binding.worktreePath}`])
  })

  it('discards even when the host ctx has no worktreeProcessController service (regression)', async () => {
    const repository = await createRepository('main')
    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)
    const created = await ensureWorktree({}, worktreesRoot, repository, 'ctx-probe-session')
    expect(created.ok).toBe(true)
    if (!created.ok)
      return

    // A cordis ctx whose uninjected property read throws used to make the
    // controller probe fail and leave the worktree on disk forever.
    const result = await discardWorktree(injectingCtx(), worktreesRoot, { sessionId: 'ctx-probe-session' })

    expect(result.ok).toBe(true)
    expect(existsSync(created.binding.worktreePath)).toBe(false)
  })

  it('removes the emptied worktrees/<hash> and .trash/<hash> containers along with the worktree', async () => {
    const repository = await createRepository('main')
    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)
    const created = await ensureWorktree({}, worktreesRoot, repository, 'container-cleanup-session')
    expect(created.ok).toBe(true)
    if (!created.ok)
      return

    const container = join(worktreesRoot, 'worktrees', created.binding.hash)
    const trashContainer = join(worktreesRoot, '.trash', created.binding.hash)
    expect(existsSync(container)).toBe(true)

    const result = await discardWorktree({}, worktreesRoot, { sessionId: 'container-cleanup-session' })

    expect(result.ok).toBe(true)
    expect(existsSync(created.binding.worktreePath)).toBe(false)
    // 删除后不再残留空的 <hash> 容器目录（含 .trash 一侧的 rename 中间目录）。
    expect(existsSync(container)).toBe(false)
    expect(existsSync(trashContainer)).toBe(false)
  })

  it('links source dependency directories into the worktree and unlinks before discard', async () => {
    const repository = await createRepository('main')
    const dependency = join(repository, 'node_modules', 'pkg', 'index.js')
    await mkdir(join(repository, 'node_modules', 'pkg'), { recursive: true })
    await writeFile(dependency, 'shared-dependency\n')
    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)

    const created = await ensureWorktree({}, worktreesRoot, repository, 'linked-session')

    expect(created.ok).toBe(true)
    if (!created.ok)
      return
    expect(created.binding.linkedDependencies).toEqual(['node_modules'])
    const link = join(created.binding.worktreePath, 'node_modules')
    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(readFileSync(join(link, 'pkg', 'index.js'), 'utf8')).toBe('shared-dependency\n')

    await expect(discardWorktree({}, worktreesRoot, { sessionId: 'linked-session' })).resolves.toMatchObject({ ok: true })
    // 删除工作树只能摘链接，绝不能穿透链接删掉源仓库的 node_modules。
    expect(readFileSync(dependency, 'utf8')).toBe('shared-dependency\n')
  })

  it('skips dependency linking when linkDependencies is false', async () => {
    const repository = await createRepository('main')
    await mkdir(join(repository, 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(repository, 'node_modules', 'pkg', 'index.js'), 'shared-dependency\n')
    const worktreesRoot = await mkdtemp(join(tmpdir(), 'dsh-worktrees-root-'))
    temporaryDirectories.push(worktreesRoot)

    const created = await ensureWorktree({}, worktreesRoot, repository, 'unlinked-session', { linkDependencies: false })

    expect(created.ok).toBe(true)
    if (!created.ok)
      return
    expect(created.binding.linkedDependencies).toBeUndefined()
    expect(existsSync(join(created.binding.worktreePath, 'node_modules'))).toBe(false)
  })
})
