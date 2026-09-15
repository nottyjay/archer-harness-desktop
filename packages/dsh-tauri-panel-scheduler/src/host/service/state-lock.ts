/**
 * host/service/state-lock.ts — 单写者队列：串行化「读整表 → 改 → 写整表」临界区。
 *
 * tasks/runs 是整表读写（getTasks → 变更 → saveTasks）。同一时刻并发的变更
 * （多个到点任务同时收敛、HTTP 与工具并发 CRUD）若交错读改写，后写覆盖先写 →
 * 丢更新。createAtomicFsStorage 只保证单次写入原子，不保证读改写互斥，因此用
 * 一条 promise 链把所有「读整表→改→写整表」串起来，天然单写者。读不加锁
 * （快照读，容忍短暂旧值）。
 */

let stateLock: Promise<unknown> = Promise.resolve()

/** 在单写者队列中执行一次读改写临界区（fn 返回 Promise 或同步值）。 */
export function withStateLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = stateLock.then(() => fn())
  // 失败不阻断后续排队项（异常由调用方按各自语义处理）。
  stateLock = run.then(() => undefined, () => undefined)
  return run
}
