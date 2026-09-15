/**
 * host/service/queue.ts — 工作区级 FIFO 串行。
 *
 * 私有快照仓的 **index 与 refs 是每个工作区共享的可变状态**：捕获（`add --all` +
 * `write-tree`）、结算、运行中实时读数、撤销（`checkout`）、容量治理（`prune` / 整仓重建）
 * 都在动同一份 index。任何两件并发就会撞 `index.lock` 或读到半更新的 index，
 * 因此全部经同一个队列串行（不同工作区互不影响）。
 *
 * 队尾在结算后立即出队：否则每见过一个工作区就常驻一条 Promise，
 * 长期运行的 Host 会无界增长（与归档版 `enqueueTurnTask` 同一处理）。
 */

/** 工作区级串行队列。 */
export interface WorkspaceQueue {
  /**
   * 在指定工作区的串行区内执行任务。
   * @param key - 工作区键（worktree 根）。
   * @param task - 要执行的异步任务。
   * @returns 任务结果（拒绝原样透出）。
   */
  run: <T>(key: string, task: () => Promise<T>) => Promise<T>
  /** 当前仍在排队/在飞的工作区数（诊断与测试用）。 */
  size: () => number
}

/** 创建一个工作区级 FIFO 队列。 */
export function createWorkspaceQueue(): WorkspaceQueue {
  const tails = new Map<string, Promise<unknown>>()
  return {
    run<T>(key: string, task: () => Promise<T>): Promise<T> {
      const previous = tails.get(key) ?? Promise.resolve()
      // 前一个任务失败不能阻断后续排队者：队尾只保留「已结算」的守卫 promise。
      const settled = previous.then(task)
      const guard = settled.then(() => undefined, () => undefined)
      tails.set(key, guard)
      void guard.then(() => {
        if (tails.get(key) === guard)
          tails.delete(key)
      })
      return settled
    },
    size: () => tails.size,
  }
}
