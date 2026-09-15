import type { TurnRecord } from '../types'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'pathe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LEDGER_VERSION, MAX_TURN_RECORDS, MAX_TURNS_PER_SESSION, REASON_EXPIRED } from '../constants'
import {
  blankLedger,
  ledgerPath,
  markTurnUndone,
  mutateLedger,
  readLedger,
  recordTurn,
  recordWorkspaceState,
  writeLedger,
} from './ledger'

const temporaryDirectories: string[] = []

async function tempHome(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-turnrewind-ledger-'))
  temporaryDirectories.push(root)
  return root
}

function record(turn: number): TurnRecord {
  return {
    turn,
    beforeRef: `refs/turnrewind/s/${turn}/before`,
    afterRef: `refs/turnrewind/s/${turn}/after`,
    files: [],
    insertions: 0,
    deletions: 0,
    createdAt: turn,
    undoneAt: null,
    unavailable: null,
  }
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('ledger', () => {
  it('round-trips a session ledger through the atomic writer', async () => {
    const home = await tempHome()
    const ledger = blankLedger('session-1')
    ledger.workspaceRoot = 'C:/proj'
    ledger.isGit = true
    await writeLedger(home, ledger)
    const restored = await readLedger(home, 'session-1')
    expect(restored).toMatchObject({ sessionId: 'session-1', workspaceRoot: 'C:/proj', isGit: true })
    expect(restored.turns).toEqual([])
    // 文件确实是 JSON 文本（原子写落盘），并且按会话分文件。
    const raw = await readFile(ledgerPath(home, 'session-1'), 'utf8')
    expect(JSON.parse(raw).sessionId).toBe('session-1')
  })

  it('records a turn and marks it undone', async () => {
    const home = await tempHome()
    await recordTurn(home, 'session-2', record(1))
    await recordTurn(home, 'session-2', record(2))
    expect((await readLedger(home, 'session-2')).turns.map(turn => turn.turn)).toEqual([1, 2])
    expect(await markTurnUndone(home, 'session-2', 1, 1234)).toBe(true)
    expect((await readLedger(home, 'session-2')).turns[0]?.undoneAt).toBe(1234)
    // 未知 turn 不写入、不报错。
    expect(await markTurnUndone(home, 'session-2', 99, 1)).toBe(false)
  })

  it('keeps sessions isolated from each other', async () => {
    const home = await tempHome()
    await recordTurn(home, 'session-a', record(1))
    await recordTurn(home, 'session-b', record(1))
    await writeLedger(home, { ...blankLedger('session-a'), isGit: true, workspaceRoot: 'C:/a' })
    expect((await readLedger(home, 'session-a')).workspaceRoot).toBe('C:/a')
    expect((await readLedger(home, 'session-b')).workspaceRoot).toBeNull()
  })

  it('falls back to an empty ledger on malformed or version-mismatched files', async () => {
    const home = await tempHome()
    const path = ledgerPath(home, 'session-bad')
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, '{ not json', 'utf8')
    expect((await readLedger(home, 'session-bad')).turns).toEqual([])

    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await writeFile(path, JSON.stringify({ ...blankLedger('session-bad'), version: LEDGER_VERSION + 1 }), 'utf8')
    const downgraded = await readLedger(home, 'session-bad')
    expect(downgraded.version).toBe(LEDGER_VERSION)
    expect(downgraded.turns).toEqual([])
  })

  it('把超出保留窗口的 turn 标记过期并回传其 refs（审计行保留）', async () => {
    const home = await tempHome()
    const overflow = MAX_TURNS_PER_SESSION + 3
    const { refsToDelete } = await mutateLedger(home, 'session-retain', ledger => ({
      ...ledger,
      turns: Array.from({ length: overflow }, (_, index) => record(index + 1)),
    }))
    // 最老 3 条各自的 before/after ref 都要删（对象随之可被 prune 回收）。
    expect(refsToDelete).toHaveLength(6)
    const stored = await readLedger(home, 'session-retain')
    // 过期只锁执行、不抹审计：行还在、计数还在，但文件明细与 refs 已清空。
    expect(stored.turns).toHaveLength(overflow)
    expect(stored.turns[0]?.turn).toBe(1)
    expect(stored.turns[0]?.expiredAt).toBeTypeOf('number')
    expect(stored.turns[0]?.unavailable).toBe(REASON_EXPIRED)
    expect(stored.turns[0]?.files).toEqual([])
    expect(stored.turns[0]?.beforeRef).toBe('')
    expect(stored.turns.at(-1)?.expiredAt ?? null).toBeNull()
  })

  it('超过硬上限的最老审计行被真正丢弃', async () => {
    const home = await tempHome()
    const overflow = MAX_TURN_RECORDS + 5
    await mutateLedger(home, 'session-cap', ledger => ({
      ...ledger,
      turns: Array.from({ length: overflow }, (_, index) => record(index + 1)),
    }))
    const stored = await readLedger(home, 'session-cap')
    expect(stored.turns).toHaveLength(MAX_TURN_RECORDS)
    expect(stored.turns[0]?.turn).toBe(overflow - MAX_TURN_RECORDS + 1)
    expect(stored.turns.at(-1)?.turn).toBe(overflow)
  })

  it('serializes concurrent load-modify-save so no update is lost', async () => {
    const home = await tempHome()
    await Promise.all(Array.from({ length: 8 }, (_, index) => recordTurn(home, 'session-lock', record(index + 1))))
    expect((await readLedger(home, 'session-lock')).turns.map(turn => turn.turn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('only writes the workspace state when it actually changes', async () => {
    const home = await tempHome()
    await recordWorkspaceState(home, 'session-ws', { workspaceRoot: 'C:/p', isGit: true, unavailableReason: null })
    const before = JSON.stringify(await readLedger(home, 'session-ws'))
    await recordWorkspaceState(home, 'session-ws', { workspaceRoot: 'C:/p', isGit: true, unavailableReason: null })
    // 幂等：重复的同一结论不产生新的写入（内容一致）。
    expect(JSON.stringify(await readLedger(home, 'session-ws'))).toBe(before)
  })
})
