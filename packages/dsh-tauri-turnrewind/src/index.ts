/**
 * dsh-tauri-turnrewind 宿主侧（node half）：turn 级工作区快照与一键撤销。
 *
 * 三层目录（host / client / shared，与 dsh-tauri-worktree 同口径）：
 *   - index.ts（本文件）  public barrel：公开面（name / inject / API_PREFIX / apply / 领域能力）；
 *   - shared/constants.ts 跨 half 协议常量（插件名 / API 前缀）；
 *   - host/               Node half 领域（apply 装配 / hooks(hookable) / routes /
 *                         service：git · workspace · snapshot · ledger · undo · capture）；
 *   - client/             Browser half（turnTail 变更卡片 + 撤销 + 非 Git 提示弹窗，
 *                         经 /api/turnrewind/* 与本 half 通信）。
 *
 * 职责：
 *   1. 每个 Agent turn 在**私有 Git 快照仓**（`$DSH_HOME/<feature>/workspaces/<hash>.git`）
 *      记录 before / after 两个快照，算出逐文件 `+N -M`；
 *   2. 差异写入每会话 JSON 账本（`$DSH_HOME/<feature>/sessions/<id>.json`）；
 *   3. 暴露 2 条路由：summary（读）与 undo（写，仅回环）；
 *   4. 对用户仓库全程只读——HEAD / 分支 / index / stash / 提交历史零污染。
 *
 * Git 是硬前置：会话 cwd 不在 Git worktree 内时不建快照，
 * 客户端点「撤销」改为弹出说明弹窗（见 docs/plugins/11.优化计划.turnrewind实现.md）。
 */

import { TURNREWIND_API_PREFIX, TURNREWIND_PLUGIN_NAME } from './shared/constants'

/** 插件名（诊断元数据，与导出的 name 一致）。 */
export const name = TURNREWIND_PLUGIN_NAME

/**
 * 需要的宿主服务（**只声明 0.1.2-rc.1 与 0.1.5-rc.1 都提供**的服务：
 * 声明星座里不存在的服务会让 fiber 永久 PENDING、插件静默失效）：
 *   webServer  HTTP 路由（summary / undo）
 *   sessions   会话查找（解析 cwd 与工作区归属）
 *   agents     会话 turn 事件源（agent/pre-step 屏障与 idle 兜底结算）
 * 连接信任边界用可选的 `ctx.get('connection')` 获取，不进 inject 星座。
 */
export const inject = ['webServer', 'sessions', 'agents']

/** API 路由前缀（客户端同源 fetch）。 */
export const API_PREFIX = TURNREWIND_API_PREFIX

export { apply } from './host/apply'
export type { PluginConfig } from './host/apply'
export { createTurnRewindHooks } from './host/hooks'
export type { TurnRewindHooks } from './host/hooks'
export { buildRoutes } from './host/routes'
export { createTurnCapture } from './host/service/capture'
export { applyRetention, ledgerPath, markTurnExpired, readLedger, recordTurn, writeLedger } from './host/service/ledger'
export { assertSafeParents, resolveInsideWorkspace } from './host/service/paths'
export { createWorkspaceQueue } from './host/service/queue'
export { enforceWorkspaceRetention, ensureWorkspaceRetention, readExclusions, repositorySizeMb, writeExclusions } from './host/service/retention'
export {
  captureSnapshot,
  conflictPaths,
  deleteRefs,
  diffTurnChanges,
  ensureSnapshotRepo,
  liveDiff,
  readGenerationFor,
  readRefCommit,
  restoreTurnChanges,
  rotateGeneration,
  scanNestedRepos,
  snapshotStoreFor,
  turnRef,
} from './host/service/snapshot'
export { undoTurn } from './host/service/undo'
export { clearWorkspaceProbeCache, isSystemSensitivePath, probeWorkspace, workspaceHash } from './host/service/workspace'
