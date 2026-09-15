/**
 * host/service/ledger.ts — 每会话 JSON 账本（原子写 + 进程内串行）。
 *
 * 存放于 `$DSH_HOME/<feature>/sessions/<sessionId>.json`。选 JSON 而非 SQLite：
 * 本插件的读写面只有「追加一条 turn、标记一次撤销、读一份摘要」，事务需求为零；
 * 原子写由 dsh-tauri 的 `writeAtomic`（tmp + rename，Windows 锁竞争有界退避）承担。
 *
 * 两个边界策略：
 *   - **过期只锁执行、不抹审计**：超出保留窗口的 turn 标记 `expiredAt` 并清空
 *     `files` 与 refs（撤销不再可能），但 turn 号、计数、时间戳留在账本里可回溯；
 *     只有超过硬上限（`MAX_TURN_RECORDS`）的最老行才会被真正丢弃，避免账本与
 *     summary 载荷无界增长。
 *   - 同一会话的 load-modify-save 全部经过 {@link mutateLedger} 串行化，避免
 *     「捕获结算」与「撤销回写」交叉覆盖（AGENTS.plugins.md 宿主侧规则）；
 *     队尾结算即出队，长期运行不会每会话常驻一条 Promise。
 */

import type { SessionLedger, TurnRecord } from '../types'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import process from 'node:process'
import { writeAtomic } from 'dsh-tauri'
import { join } from 'pathe'
import {
  LEDGER_VERSION,
  MAX_TURN_RECORDS,
  MAX_TURNS_PER_SESSION,
  REASON_EXPIRED,
  SNAPSHOT_FEATURE_DIR,
} from '../constants'

/** 账本目录（DSH_HOME 可被环境变量覆盖，与 dsh-tauri 的存储口径一致）。 */
export function ledgerDir(dshHome: string): string {
  return join(dshHome, SNAPSHOT_FEATURE_DIR, 'sessions')
}

/** 会话账本文件路径；会话 id 做文件名安全化并附短哈希防撞。 */
export function ledgerPath(dshHome: string, sessionId: string): string {
  const sanitized = sessionId.replace(/[^\w.-]/g, '_').slice(0, 96) || 'session'
  const digest = createHash('sha256').update(sessionId).digest('hex').slice(0, 8)
  return join(ledgerDir(dshHome), `${sanitized}-${digest}.json`)
}

/** 空账本。 */
export function blankLedger(sessionId: string): SessionLedger {
  return {
    version: LEDGER_VERSION,
    sessionId,
    workspaceRoot: null,
    isGit: false,
    unavailableReason: null,
    turns: [],
  }
}

/** 读取账本；文件缺失/损坏/版本不符时返回空账本（损坏显式告警，不静默修数据）。 */
export async function readLedger(dshHome: string, sessionId: string): Promise<SessionLedger> {
  try {
    const raw = await readFile(ledgerPath(dshHome, sessionId), 'utf8')
    const parsed = JSON.parse(raw) as SessionLedger
    if (parsed === null || typeof parsed !== 'object' || parsed.sessionId !== sessionId)
      return blankLedger(sessionId)
    if (parsed.version !== LEDGER_VERSION || !Array.isArray(parsed.turns)) {
      console.warn(`[dsh-tauri-turnrewind] ledger for session ${sessionId} has an unsupported version; starting fresh`)
      return blankLedger(sessionId)
    }
    return {
      version: LEDGER_VERSION,
      sessionId,
      workspaceRoot: typeof parsed.workspaceRoot === 'string' ? parsed.workspaceRoot : null,
      isGit: parsed.isGit === true,
      unavailableReason: typeof parsed.unavailableReason === 'string' ? parsed.unavailableReason : null,
      turns: parsed.turns.filter(turn => typeof turn?.turn === 'number' && Array.isArray(turn.files)),
    }
  }
  catch {
    return blankLedger(sessionId)
  }
}

/** 写入账本（原子）。 */
export async function writeLedger(dshHome: string, ledger: SessionLedger): Promise<void> {
  await writeAtomic(ledgerPath(dshHome, ledger.sessionId), `${JSON.stringify(ledger, null, 2)}\n`)
}

/** 每会话串行队列：返回当前队尾的 promise 并接上本次任务。 */
const sessionQueues = new Map<string, Promise<unknown>>()

/** mutateLedger 的副作用：调用方据此删除已失效 turn 的 refs。 */
export interface LedgerMutation {
  /** 被标记过期 / 被硬上限丢弃的 turn 所对应的 refs。 */
  refsToDelete: string[]
}

/**
 * 对账本做「保留窗口 + 硬上限」治理（纯函数，便于单测）。
 * @param ledger - 当前账本。
 * @param now - 过期标记时间戳。
 * @returns 治理后的账本与需要删除的 refs。
 */
export function applyRetention(ledger: SessionLedger, now: number): { ledger: SessionLedger, refsToDelete: string[] } {
  const turns = [...ledger.turns].sort((left, right) => left.turn - right.turn)
  const refsToDelete: string[] = []
  const reversible = turns.filter(turn => turn.expiredAt === null || turn.expiredAt === undefined)
  const excess = new Set(
    reversible.slice(0, Math.max(0, reversible.length - MAX_TURNS_PER_SESSION)).map(turn => turn.turn),
  )
  const marked = turns.map((turn) => {
    if (!excess.has(turn.turn))
      return turn
    if (turn.beforeRef.length > 0)
      refsToDelete.push(turn.beforeRef)
    if (turn.afterRef.length > 0)
      refsToDelete.push(turn.afterRef)
    // 过期行只保留审计信息：清空文件明细与 refs，避免账本与载荷随历史无限增长。
    return {
      ...turn,
      expiredAt: now,
      unavailable: REASON_EXPIRED,
      files: [],
      beforeRef: '',
      afterRef: '',
    }
  })
  const dropCount = Math.max(0, marked.length - MAX_TURN_RECORDS)
  for (const turn of marked.slice(0, dropCount)) {
    if (turn.beforeRef.length > 0)
      refsToDelete.push(turn.beforeRef)
    if (turn.afterRef.length > 0)
      refsToDelete.push(turn.afterRef)
  }
  return {
    ledger: { ...ledger, turns: dropCount > 0 ? marked.slice(dropCount) : marked },
    refsToDelete,
  }
}

/**
 * 在会话级串行区内执行 load-modify-save。
 * @param dshHome - 宿主数据根目录。
 * @param sessionId - 会话 id（队列键）。
 * @param task - 收到当前账本，返回要落盘的账本（null 表示无需写入）。
 * @returns 需要删除的 refs（保留窗口淘汰 / 硬上限丢弃）。
 */
export async function mutateLedger(
  dshHome: string,
  sessionId: string,
  task: (ledger: SessionLedger) => SessionLedger | null,
): Promise<LedgerMutation> {
  const previous = sessionQueues.get(sessionId) ?? Promise.resolve()
  const run = previous.then(async (): Promise<LedgerMutation> => {
    const ledger = await readLedger(dshHome, sessionId)
    const next = task(ledger)
    if (next === null)
      return { refsToDelete: [] }
    const retained = applyRetention(next, Date.now())
    await writeLedger(dshHome, retained.ledger)
    return { refsToDelete: retained.refsToDelete }
  })
  // 队尾只保留「已结算」的守卫，并在结算后出队：否则每见过一个会话就常驻一条 Promise。
  const guard = run.then(() => undefined, () => undefined)
  sessionQueues.set(sessionId, guard)
  void guard.then(() => {
    if (sessionQueues.get(sessionId) === guard)
      sessionQueues.delete(sessionId)
  })
  return run
}

/** 记录工作区资格结论（非 Git / 拒绝目录也要留痕，供客户端呈现不可用态）。 */
export async function recordWorkspaceState(
  dshHome: string,
  sessionId: string,
  state: { workspaceRoot: string | null, isGit: boolean, unavailableReason: string | null },
): Promise<void> {
  await mutateLedger(dshHome, sessionId, (ledger) => {
    if (ledger.workspaceRoot === state.workspaceRoot
      && ledger.isGit === state.isGit
      && ledger.unavailableReason === state.unavailableReason) {
      return null
    }
    return { ...ledger, ...state }
  })
}

/** 追加/覆盖某 turn 的记录；返回需要删除的 refs（保留窗口淘汰时非空）。 */
export async function recordTurn(dshHome: string, sessionId: string, record: TurnRecord): Promise<LedgerMutation> {
  return mutateLedger(dshHome, sessionId, (ledger) => {
    const turns = ledger.turns.filter(item => item.turn !== record.turn)
    turns.push(record)
    turns.sort((left, right) => left.turn - right.turn)
    return { ...ledger, turns }
  })
}

/** 标记某 turn 已撤销；返回是否命中记录。 */
export async function markTurnUndone(dshHome: string, sessionId: string, turn: number, at: number): Promise<boolean> {
  let hit = false
  await mutateLedger(dshHome, sessionId, (ledger) => {
    const target = ledger.turns.find(item => item.turn === turn)
    if (target === undefined)
      return null
    hit = true
    return {
      ...ledger,
      turns: ledger.turns.map(item => (item.turn === turn ? { ...item, undoneAt: at } : item)),
    }
  })
  return hit
}

/**
 * 把某 turn 标记为过期（refs 已消失 / 快照仓代数不匹配）。
 * 这样卡片能给出确定结论，而不是每次点击都重复撞同一个「快照不可用」错误。
 * @returns 是否命中记录。
 */
export async function markTurnExpired(dshHome: string, sessionId: string, turn: number, reason: string, at = Date.now()): Promise<boolean> {
  let hit = false
  await mutateLedger(dshHome, sessionId, (ledger) => {
    const target = ledger.turns.find(item => item.turn === turn)
    if (target === undefined || (target.expiredAt !== null && target.expiredAt !== undefined))
      return null
    hit = true
    return {
      ...ledger,
      turns: ledger.turns.map(item => (item.turn === turn
        ? { ...item, expiredAt: at, unavailable: reason, files: [], beforeRef: '', afterRef: '' }
        : item)),
    }
  })
  return hit
}

/** 宿主数据根目录（`$DSH_HOME`，与 dsh-tauri 存储口径一致）。 */
export function currentDshHome(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}
