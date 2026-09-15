import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { REASON_GIT_REQUIRED, REASON_UNSAFE_WORKSPACE } from '../constants'
import { isSystemSensitivePath, probeWorkspace, workspaceHash, workspaceKey } from './workspace'

const run = promisify(execFile)

const temporaryDirectories: string[] = []

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-turnrewind-workspace-'))
  temporaryDirectories.push(root)
  return root
}

async function initRepo(path: string): Promise<void> {
  await run('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet', path], { windowsHide: true })
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('isSystemSensitivePath', () => {
  it('rejects the home directory, its ancestors, and drive roots', () => {
    expect(isSystemSensitivePath(process.env.USERPROFILE ?? process.env.HOME ?? '')).toBe(true)
    const home = process.env.USERPROFILE ?? process.env.HOME ?? ''
    if (home.length > 0)
      expect(isSystemSensitivePath(join(home, '..'))).toBe(true)
    if (process.platform === 'win32')
      expect(isSystemSensitivePath('C:\\')).toBe(true)
  })

  it('accepts an ordinary project directory', async () => {
    const root = await tempRoot()
    expect(isSystemSensitivePath(root)).toBe(false)
  })
})

describe('workspaceKey', () => {
  it('folds casing on Windows so one directory cannot spawn two snapshot domains', () => {
    const key = workspaceKey('C:\\Repo\\Sub')
    if (process.platform === 'win32')
      expect(key).toBe(workspaceKey('c:\\repo\\sub'))
    expect(workspaceHash('C:\\Repo')).toBe(workspaceHash('C:\\Repo'))
  })
})

describe('probeWorkspace', () => {
  it('reports TURNREWIND_GIT_REQUIRED outside a Git worktree', async () => {
    const root = await tempRoot()
    const probe = await probeWorkspace(root)
    expect(probe).toEqual({ ok: false, reason: REASON_GIT_REQUIRED })
  })

  it('refuses a system-sensitive cwd before consulting git', async () => {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? ''
    if (home.length === 0)
      return
    const probe = await probeWorkspace(home)
    expect(probe).toEqual({ ok: false, reason: REASON_UNSAFE_WORKSPACE })
  })

  it('resolves a subdirectory session to the worktree root', async () => {
    const root = await tempRoot()
    await initRepo(root)
    await mkdir(join(root, 'packages', 'app'), { recursive: true })
    await writeFile(join(root, 'packages', 'app', 'index.ts'), 'export {}\n', 'utf8')

    const fromRoot = await probeWorkspace(root)
    const fromSubdir = await probeWorkspace(join(root, 'packages', 'app'))
    expect(fromRoot.ok).toBe(true)
    expect(fromSubdir.ok).toBe(true)
    if (fromRoot.ok && fromSubdir.ok)
      expect(workspaceKey(fromSubdir.root)).toBe(workspaceKey(fromRoot.root))
  })

  it('treats a missing cwd as not-a-Git-workspace instead of guessing process.cwd()', async () => {
    expect(await probeWorkspace(undefined)).toEqual({ ok: false, reason: REASON_GIT_REQUIRED })
    expect(await probeWorkspace('')).toEqual({ ok: false, reason: REASON_GIT_REQUIRED })
  })
})
