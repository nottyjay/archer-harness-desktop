export type HostContext = any

/** Optional host capability for terminating processes that still hold a worktree cwd. */
export interface WorktreeProcessController {
  stopSessionProcesses?: (sessionId: string, worktreePath: string) => Promise<void>
}

export type JsonBody = Record<string, unknown>

export interface PluginConfig {
  worktreesRoot?: string
  /** 是否把源仓库的依赖目录链接进新工作树（默认 true）。 */
  linkDependencies?: boolean
  /** 需要链接的依赖目录名，默认 `['node_modules']`。 */
  linkDependencyDirectories?: string[]
}

export interface Binding {
  sessionId: string
  sourceSessionId: string
  hash: string
  dirname: string
  worktreePath: string
  projectPath: string
  branchName: string
  ownsBranch: boolean
  createdAt: string
  log: string[]
  /** 本工作树内由插件建立链接的依赖目录名（安装前会被断开物化）。 */
  linkedDependencies?: string[]
}

export type Ledger = Record<string, Binding>

export interface CheckoutContext {
  projectPath: string
  branch?: string
  worktreePath?: string
  checkedOutAt: string
}

export type CheckoutContexts = Record<string, CheckoutContext>

export interface GitOptions {
  timeout?: number
  signal?: AbortSignal
}

export interface EnsureOptions extends GitOptions {
  sourceSessionId?: string
  branchName?: string
  /** 是否把源仓库已暂存（index）内容携带进新工作树；默认 false。 */
  carryStaged?: boolean
  /** 是否把源仓库的依赖目录链接进新工作树；默认 true。 */
  linkDependencies?: boolean
  /** 需要链接的依赖目录名；默认 `['node_modules']`。 */
  linkDependencyDirectories?: string[]
}

export interface CheckoutOptions extends GitOptions {
  beforeRemove?: (checkout: { branch: string, projectPath: string, worktreePath: string }) => Promise<OperationResult<any>>
  /** 是否把工作树已暂存（index）内容携带回本地检出；默认 false。 */
  carryStaged?: boolean
  /** 删除工作树前需要断开的依赖链接目录名；默认 `['node_modules']`。 */
  linkDependencyDirectories?: string[]
}

export interface CheckoutInfo {
  branch?: string
  worktreePath?: string
}

export interface PendingHandoff {
  sourceAgent: any
  targetSessionId: string
  binding: Binding
}

export type OperationResult<T extends object = object>
  = | ({ ok: true } & T)
    | { ok: false, error: string }

export interface WorktreeParams {
  worktree_hash_dirname?: string
  worktreeHashDirname?: string
  sessionId?: string
  branch_name?: string
}

export type RouteResult = [number, unknown]
export type RouteFunction = (body: JsonBody, req: import('node:http').IncomingMessage) => Promise<RouteResult>
