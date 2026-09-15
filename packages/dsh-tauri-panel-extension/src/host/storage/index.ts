/**
 * host/storage/index.ts — 扩展面板持久化存储入口（skills 功能目录）。
 *
 * 只暴露模块级 `storage` 单例；skill root 的读取/变更在 host/service/skill-root.ts
 * 实现，不在此写包装。
 */

import { createAtomicFsStorage } from 'dsh-tauri'

/** skills 功能目录存储（`$DSH_HOME/skills`；key 如 `state.json`）。 */
export const storage = createAtomicFsStorage('skills')
