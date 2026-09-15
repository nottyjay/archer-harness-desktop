import type { TurnRecord } from '../types'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { REASON_ALREADY_UNDONE, REASON_CONFLICT, REASON_EXPIRED, REASON_GIT_REQUIRED, REASON_TURN_ACTIVE } from '../constants'
import { readLedger, recordTurn, recordWorkspaceState } from './ledger'
import { createWorkspaceQueue } from './queue'
import { captureSnapshot, diffTurnChanges, readGenerationFor, readRefCommit, snapshotStoreFor, turnRef } from './snapshot'
import { undoTurn } from './undo'

const run = promisify(execFile)

/** 撤销与捕获共用同一工作区队列；本文件的用例只需一个实例。 */
const queue = createWorkspaceQueue()

const temporaryDirectories: string[] = []

interface Fixture {
  dshHome: string
  worktree: string
  sessionId: string
  turn: number
  record: TurnRecord
}

/**
 * 造一个「一轮改了一个文件」的真实场景：before 快照 → 改文件 → after 快照 →
 * 差异算好写进账本，等价于 capture.ts 在真实 turn 里做的事。
 */
async function fixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-turnrewind-undo-'))
  temporaryDirectories.push(root)
  const dshHome = join(root, 'home')
  const worktree = join(root, 'project')
  await mkdir(dshHome, { recursive: true })
  await mkdir(worktree, { recursive: true })
  await run('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet', worktree], { windowsHide: true })
  await writeFile(join(worktree, 'a.txt'), 'first\n', 'utf8')

  const sessionId = 'session-undo'
  const turn = 1
  const store = snapshotStoreFor(dshHome, worktree)
  const before = await captureSnapshot(store, turnRef(sessionId, turn, 'before'), 'before')
  await writeFile(join(worktree, 'a.txt'), 'first\nsecond\n', 'utf8')
  await writeFile(join(worktree, 'added.txt'), 'new\n', 'utf8')
  const after = await captureSnapshot(store, turnRef(sessionId, turn, 'after'), 'after')
  if (!before.ok || !after.ok)
    throw new Error('fixture capture failed')
  const diff = await diffTurnChanges(store, before.commit, after.commit)
  if (!diff.ok)
    throw new Error('fixture diff failed')

  let insertions = 0
  let deletions = 0
  for (const change of diff.changes) {
    insertions += change.insertions ?? 0
    deletions += change.deletions ?? 0
  }
  const record: TurnRecord = {
    turn,
    beforeRef: turnRef(sessionId, turn, 'before'),
    afterRef: turnRef(sessionId, turn, 'after'),
    files: diff.changes,
    insertions,
    deletions,
    createdAt: Date.now(),
    undoneAt: null,
    unavailable: null,
  }
  await recordWorkspaceState(dshHome, sessionId, { workspaceRoot: store.worktree, isGit: true, unavailableReason: null })
  await recordTurn(dshHome, sessionId, record)
  return { dshHome, worktree, sessionId, turn, record }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('undoTurn', () => {
  it('restores the workspace and marks the turn undone', async () => {
    const { dshHome, worktree, sessionId, turn } = await fixture()
    const outcome = await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: worktree })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok)
      return
    expect(outcome.failed).toEqual([])
    expect(outcome.restored).toContain('a.txt')
    expect(outcome.removed).toContain('added.txt')
    expect((await readFile(join(worktree, 'a.txt'), 'utf8')).replace(/\r\n/g, '\n')).toBe('first\n')
    expect(existsSync(join(worktree, 'added.txt'))).toBe(false)
  })

  it('refuses with the conflict list and changes nothing when the file changed again', async () => {
    const { dshHome, worktree, sessionId, turn } = await fixture()
    await writeFile(join(worktree, 'a.txt'), 'user edit after the turn\n', 'utf8')
    const outcome = await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: worktree })
    expect(outcome.ok).toBe(false)
    if (outcome.ok)
      return
    expect(outcome.code).toBe(409)
    expect(outcome.error).toBe(REASON_CONFLICT)
    expect(outcome.conflicts?.map(conflict => conflict.path)).toEqual(['a.txt'])
    // 预检发生在动文件之前：内容与新增文件都保持原样。
    expect(await readFile(join(worktree, 'a.txt'), 'utf8')).toBe('user edit after the turn\n')
    expect(existsSync(join(worktree, 'added.txt'))).toBe(true)
  })

  it('rejects a second undo of the same turn', async () => {
    const { dshHome, worktree, sessionId, turn } = await fixture()
    expect((await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: worktree })).ok).toBe(true)
    const second = await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: worktree })
    expect(second.ok).toBe(false)
    if (!second.ok)
      expect(second.error).toBe(REASON_ALREADY_UNDONE)
  })

  it('returns 404 for a turn with no record', async () => {
    const { dshHome, worktree, sessionId } = await fixture()
    const outcome = await undoTurn({ queue, dshHome, sessionId, turn: 42, currentWorkspace: worktree })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok)
      expect(outcome.code).toBe(404)
  })

  it('refuses when the session now points at another workspace', async () => {
    const { dshHome, worktree, sessionId, turn } = await fixture()
    const outcome = await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: join(worktree, 'other') })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok)
      expect(outcome.code).toBe(403)
  })

  it('reports the Git requirement for a non-repository ledger', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-turnrewind-undo-nogit-'))
    temporaryDirectories.push(home)
    await recordWorkspaceState(home, 'session-nogit', {
      workspaceRoot: null,
      isGit: false,
      unavailableReason: REASON_GIT_REQUIRED,
    })
    await recordTurn(home, 'session-nogit', {
      turn: 1,
      beforeRef: '',
      afterRef: '',
      files: [],
      insertions: 0,
      deletions: 0,
      createdAt: Date.now(),
      undoneAt: null,
      unavailable: null,
    })
    const outcome = await undoTurn({ queue, dshHome: home, sessionId: 'session-nogit', turn: 1, currentWorkspace: null })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok)
      expect(outcome.error).toBe(REASON_GIT_REQUIRED)
  })

  it('refs 消失时把该轮落为「已过期」终态，而不是每次点击都撞同一个模糊错误', async () => {
    const { dshHome, worktree, sessionId, turn } = await fixture()
    const store = snapshotStoreFor(dshHome, worktree)
    const { deleteRefs } = await import('./snapshot')
    await deleteRefs(store, [turnRef(sessionId, turn, 'before')])
    const outcome = await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: worktree })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.code).toBe(409)
      expect(outcome.error).toBe(REASON_EXPIRED)
    }
    // 终态写回账本：卡片能给出确定结论，后续点击不会重复走一遍 git 校验。
    const ledger = await readLedger(dshHome, sessionId)
    const record = ledger.turns.find(item => item.turn === turn)
    expect(record?.unavailable).toBe(REASON_EXPIRED)
    expect(record?.beforeRef).toBe('')
  })

  it('代际不一致时直接落「已过期」——即使 refs 还在，也不能信任它是同一批快照', async () => {
    const { dshHome, worktree, sessionId, turn, record } = await fixture()
    const store = snapshotStoreFor(dshHome, worktree)
    const generation = await readGenerationFor(dshHome, worktree)
    expect(generation).toBeTypeOf('string')
    // 真实捕获路径会把代数写进账本记录；fixture 手工补上。
    await recordTurn(dshHome, sessionId, { ...record, generation })

    // 模拟「标记文件被清理掉、但私有仓还在」：下一次捕获会重新分配一个代数，
    // 而旧 refs 依然存在——此时**只有代数比对**能发现这轮记录不可信。
    await rm(`${store.gitDir}.json`, { force: true })
    const recapture = await captureSnapshot(store, turnRef(sessionId, turn + 100, 'before'), 'recheck')
    expect(recapture.ok).toBe(true)
    expect(await readGenerationFor(dshHome, worktree)).not.toBe(generation)

    const outcome = await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: worktree })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.code).toBe(409)
      expect(outcome.error).toBe(REASON_EXPIRED)
    }
    // 关键：refs 仍在（说明不是「ref 消失」那条兜底在生效），且工作区一个字节都没动。
    expect(await readRefCommit(store, record.beforeRef)).not.toBeNull()
    expect(await readFile(join(worktree, 'a.txt'), 'utf8')).toBe('first\nsecond\n')
    expect(existsSync(join(worktree, 'added.txt'))).toBe(true)
  })

  it('会话仍在跑（有在飞 turn）时拒绝撤销', async () => {
    const { dshHome, worktree, sessionId, turn } = await fixture()
    const outcome = await undoTurn({ queue, dshHome, sessionId, turn, currentWorkspace: worktree, turnActive: true })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.code).toBe(409)
      expect(outcome.error).toBe(REASON_TURN_ACTIVE)
    }
    // 拒绝发生在动文件之前。
    expect(await readFile(join(worktree, 'a.txt'), 'utf8')).toBe('first\nsecond\n')
  })
})
