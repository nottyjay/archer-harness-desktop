/**
 * client/utils/open-file.ts — 「点击文件打开」的纯决策 + 受保护的调用。
 *
 * 决策规则（需求：新核心打开侧边栏的文件，旧核心静默）：
 *
 *   1. 框架没有派发 `openFile`（旧内核之外的壳、或未来的契约变化）→ 不可点；
 *   2. 当前内核没有应用内右侧边栏能力 → 不可点。**这一条是关键**：旧内核也派发
 *      `openFile`，但它会把路径交给宿主/系统去打开，不是我们要的行为；
 *   3. 两条都满足才返回可用的点击处理器。
 *
 * 拆成纯函数是为了能直接单测「旧内核绝不打开」这条不变量（不依赖 DOM 环境）。
 */

/** 文件打开入口的框架契约（owner props 的 `openFile`）。 */
export type FileOpener = (path: string) => void | Promise<unknown>

/** 决策输入。 */
export interface FileOpenContext {
  /** 框架派发的 `openFile`（可能缺席）。 */
  openFile?: FileOpener | undefined
  /** 当前内核是否具备应用内右侧边栏预览能力（见 client/capabilities）。 */
  sidebarPreview: boolean
}

/**
 * 解析出可用的点击处理器；不可用时返回 `undefined`（调用方据此渲染成**不可点**的元素，
 * 而不是渲染一个点了没反应的按钮）。
 * @param context - 框架派发的 `openFile` 与当前内核能力。
 * @returns 点击处理器，或 `undefined`。
 */
export function fileOpenHandler(context: FileOpenContext): ((path: string) => void) | undefined {
  const { openFile, sidebarPreview } = context
  if (!sidebarPreview || typeof openFile !== 'function')
    return undefined
  const open = openFile
  return (path: string): void => {
    // 打开文件只是便利功能：失败不影响撤销，卡片也没有错误面可挂，因此这里静默。
    // 同时兜住同步抛错与返回 rejected promise 两种失败形态，避免未处理的 rejection。
    try {
      void Promise.resolve(open(path)).catch(() => undefined)
    }
    catch {
      /* 同步抛错：同上，静默 */
    }
  }
}
