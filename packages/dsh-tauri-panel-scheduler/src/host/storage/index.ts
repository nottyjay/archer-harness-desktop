/**
 * host/storage/index.ts — 调度器持久化存储入口（crons 功能目录）。
 *
 * 只暴露模块级 `storage` 单例；数据的读取/变更一律在 host/service/*.ts
 * （get-tasks / get-runs / save-task / remove-task 等）实现，不在此写包装。
 */

import { createAtomicFsStorage } from 'dsh-tauri'

/** crons 功能目录存储（`$DSH_HOME/crons`；key 如 `tasks` / `runs`）。 */
export const storage = createAtomicFsStorage('crons')
