/**
 * operation.ts — 工作树生命周期操作：创建 / 检出本地 / 放弃，以及绑定的
 * 磁盘定位（hash / 路径 / key 计算）。
 *
 * 规则（与宿主侧 AGENTS.md 一致）：
 *   - 破坏性 Git 操作必须检查每一步结果，失败时保留可恢复的 binding/ledger；
 *   - 绝不静默覆盖用户已有分支或未提交改动；
 *   - binding 按会话独立落盘（ledger/<sessionId>.json），读写只碰自己的文件，
 *     同组多工作树的 create/checkout/discard 不再共享整表文件，天然避免并发覆盖。
 */

import type {
  Binding,
  CheckoutOptions,
  EnsureOptions,
  HostContext,
  OperationResult,
  WorktreeParams,
  WorktreeProcessController,
} from '../types'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { rmdir } from 'node:fs/promises'
import process from 'node:process'
import { join, resolve } from 'pathe'
import { WORKTREE_BRANCH_NAME_PATTERN } from '../constants'
import { listBindings, loadBinding, removeBinding, saveBinding } from '../storage'
import { linkWorktreeDependencies, normalizeLinkDirectories, unlinkWorktreeDependencies } from './dependencies'
import { removeDirectoryReliably } from './filesystem'
import {
  applyStagedPatch,
  carryStagedChanges,
  git,
  gitToplevel,
  headSubject,
  projectDirname,
  shortHead,
  stagedPatch,
} from './git'

/** 计算 hash：项目路径 + 会话 ID → sha256 前 12 位。 */
export function computeHash(projectPath: string, sessionId: string): string {
  return createHash('sha256').update(`${projectPath}:${sessionId}`).digest('hex').slice(0, 12)
}

/** 工作树落盘目录：`<home>/worktrees/<hash>/<dirname>`。 */
export function worktreePath(worktreesRoot: string, hash: string, dirname: string): string {
  return join(worktreesRoot, 'worktrees', hash, dirname)
}

/** 工作树展示用相对标识 `[hash]/[dirname]`。 */
export function worktreeKey(hash: string, dirname: string): string {
  return `${hash}/${dirname}`
}

function worktreeTrashPath(worktreesRoot: string, hash: string, dirname: string): string {
  return join(worktreesRoot, '.trash', hash, dirname)
}

/**
 * 顺带删除某 hash 的插件自有容器目录 `worktrees/<hash>` 与 `.trash/<hash>`。
 * 工作树目录被 rename 到 .trash 再删除后，这两个父目录只剩空壳；一并移除，避免
 * 每次放弃/检出都在 worktreesRoot 下累积一个空 `<hash>` 文件夹。rmdir 只在目录
 * 为空时成功——目录不存在（ENOENT）或仍含内容（ENOTEMPTY，如并发重建/异常残留）
 * 时静默跳过；收尾是尽力而为，绝不因清理失败让删除操作整体报错。
 */
async function removeEmptyHashContainers(worktreesRoot: string, hash: string): Promise<void> {
  for (const container of [
    join(worktreesRoot, 'worktrees', hash),
    join(worktreesRoot, '.trash', hash),
  ]) {
    try {
      await rmdir(container)
    }
    catch {
      /* 目录已不存在或非空：无需处理 */
    }
  }
}

async function pruneWorktreeAdmin(root: string, signal?: AbortSignal): Promise<OperationResult> {
  // Explicit expiry makes directory-less admin entries (state C) disappear
  // immediately rather than waiting for Git's default stale-entry age.
  const pruned = await git(['worktree', 'prune', '--expire', 'now'], root, { signal })
  return pruned.ok ? { ok: true } : { ok: false, error: pruned.error }
}

/** Compare absolute paths the way the platform does (case-insensitive on win32). */
function samePath(a: string, b: string): boolean {
  const left = resolve(a)
  const right = resolve(b)
  return process.platform === 'win32'
    ? left.replaceAll('/', '\\').toLowerCase() === right.replaceAll('/', '\\').toLowerCase()
    : left === right
}

async function isRegisteredWorktree(root: string, path: string, signal?: AbortSignal): Promise<OperationResult<{ registered: boolean }>> {
  const listed = await git(['worktree', 'list', '--porcelain'], root, { signal })
  if (!listed.ok)
    return { ok: false, error: listed.error }
  const registered = listed.out
    .split('\n')
    .filter(line => line.startsWith('worktree '))
    .some(line => samePath(line.slice('worktree '.length), path))
  return { ok: true, registered }
}

/**
 * Stop processes that still hold the worktree as their cwd (optional host
 * capability). The host ctx is a cordis proxy: reading a property that was
 * never injected throws `cannot get property "X" without inject`, so the
 * capability must be probed via `ctx.get(name)` first; a plain-object ctx
 * (tests, non-cordis hosts) falls back to a direct property read. A missing
 * or broken controller must never block the removal, so the whole probe and
 * call is guarded.
 */
async function stopWorktreeProcesses(ctx: HostContext, sessionId: string, path: string): Promise<void> {
  try {
    const get = (ctx as { get?: (name: string) => unknown } | undefined)?.get
    const controller = typeof get === 'function'
      ? get.call(ctx, 'worktreeProcessController')
      : (ctx as { worktreeProcessController?: WorktreeProcessController } | undefined)?.worktreeProcessController
    const stop = (controller as WorktreeProcessController | undefined)?.stopSessionProcesses
    if (typeof stop === 'function')
      await stop(sessionId, path)
  }
  catch {
    // A missing or broken controller is optional: skip process termination.
  }
}

async function removeWorktreeOnDisk(
  ctx: HostContext,
  sessionId: string,
  worktreesRoot: string,
  root: string,
  path: string,
  hash: string,
  dirname: string,
  linkDirectories: readonly string[] = [],
  signal?: AbortSignal,
): Promise<OperationResult> {
  await stopWorktreeProcesses(ctx, sessionId, path)

  // 依赖目录是目录联接：先摘链接再删目录，确保 fs.rm 不会进入（也绝不删除）
  // 源仓库的 node_modules。已独立安装的真实目录不受影响。
  if (linkDirectories.length > 0)
    await unlinkWorktreeDependencies(path, linkDirectories)

  try {
    await removeDirectoryReliably(path, worktreeTrashPath(worktreesRoot, hash, dirname))
  }
  catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  // 工作树目录及其 .trash 副本都已删除：顺带清掉因此变空的 <hash> 容器目录。
  await removeEmptyHashContainers(worktreesRoot, hash)

  // Git is deliberately limited to metadata cleanup. It must never traverse
  // the worktree because old Git for Windows follows junction targets.
  return pruneWorktreeAdmin(root, signal)
}

/**
 * 删除工作树时需要断开的依赖链接目录：binding 记录 ∪ 当前配置，回退默认 node_modules。
 * 旧 ledger 没有 linkedDependencies，但可能仍残留 node_modules 链接，故回退默认值。
 */
function removalLinkDirectories(binding: Binding, configured?: readonly string[]): string[] {
  const configuredDirectories = normalizeLinkDirectories(configured)
  if (!binding.linkedDependencies || binding.linkedDependencies.length === 0)
    return configuredDirectories
  return normalizeLinkDirectories([...binding.linkedDependencies, ...configuredDirectories])
}

async function deleteOwnedBranch(root: string, branch: string, signal?: AbortSignal): Promise<OperationResult> {
  // for-each-ref succeeds with empty output when the branch is absent, letting
  // us distinguish an idempotent retry from a real Git/cancellation failure.
  const existing = await git(['for-each-ref', '--format=%(refname)', `refs/heads/${branch}`], root, { signal })
  if (!existing.ok)
    return { ok: false, error: existing.error }
  if (!existing.out.trim())
    return { ok: true }
  const dropped = await git(['branch', '-D', branch], root, { signal })
  return dropped.ok ? { ok: true } : { ok: false, error: dropped.error }
}

/**
 * 创建工作树（幂等）：已存在则复用并返回已存在标记。
 * @param ctx 宿主根上下文（agents/workspaceRegistry 与 agents.create 流程在 handoff.ts 使用）
 * @param worktreesRoot 工作树根目录
 * @param projectPath 源项目路径（须为 git 仓库顶层）
 * @param sessionId 目标（工作树）会话 id
 * @param opts 创建选项（signal / sourceSessionId / branchName / carryStaged）
 * @returns 创建/复用结果
 */
export async function ensureWorktree(
  ctx: HostContext,
  worktreesRoot: string,
  projectPath: string,
  sessionId: string,
  opts: EnsureOptions = {},
): Promise<OperationResult<{ binding: Binding, log: string[], existed: boolean }>> {
  // ctx 仅为工具/路由层统一签名保留（本实现只依赖 worktreesRoot 与 opts）。
  void ctx
  const root = await gitToplevel(projectPath)
  if (!root)
    return { ok: false, error: `项目路径不是 git 仓库顶层：${projectPath}` }

  const hash = computeHash(projectPath, sessionId)
  const dirname = projectDirname(projectPath)
  const path = worktreePath(worktreesRoot, hash, dirname)
  // 依赖链接配置在建/删两条路径上共用：创建时建立，删除前断开。
  const linkDirectories = normalizeLinkDirectories(opts.linkDependencyDirectories)
  const linkDependencies = opts.linkDependencies !== false

  const existing = await loadBinding(worktreesRoot, sessionId)
  if (existing && !samePath(existing.worktreePath, path)) {
    // A stale ledger pointing elsewhere must never be silently ignored: the
    // computed path could then be recreated while the old directory (or its
    // Git registration) still holds real user data.
    return { ok: false, error: `会话已绑定的其他工作树与本次计算路径不一致：${existing.worktreePath}（期望 ${path}）；请先放弃或检出该会话的原工作树` }
  }
  if (existing && existsSync(existing.worktreePath)) {
    const registration = await isRegisteredWorktree(root, path, opts.signal)
    if (!registration.ok)
      return { ok: false, error: `检查工作树残留状态失败：${registration.error}` }
    if (registration.registered)
      return { ok: true, binding: existing, existed: true, log: [] }
  }

  // Validate the requested baseline before any orphan cleanup or metadata mutation.
  const mainSource = 'refs/heads/main'
  const mainRef = await git(['rev-parse', '--verify', '--quiet', mainSource], root, { signal: opts.signal })
  if (!mainRef.ok)
    return { ok: false, error: `创建工作树失败：本地分支 main 不存在或无法解析（refs/heads/main）：${mainRef.error}` }
  if (!mainRef.out.trim())
    return { ok: false, error: '创建工作树失败：本地分支 main 不存在或无法解析（refs/heads/main）：empty git response' }

  const registration = await isRegisteredWorktree(root, path, opts.signal)
  if (!registration.ok)
    return { ok: false, error: `检查工作树残留状态失败：${registration.error}` }

  if (existsSync(path)) {
    if (registration.registered) {
      // A complete Git worktree without this session's usable binding may
      // contain user data. Never infer that it is safe to delete.
      return { ok: false, error: `目标路径已是 Git 工作树但缺少当前会话绑定，拒绝覆盖：${path}` }
    }
    // State B: a prior interrupted removal left only the directory. Delete the
    // orphan before pruning metadata; prune alone never removes disk content.
    const removed = await removeWorktreeOnDisk(ctx, sessionId, worktreesRoot, root, path, hash, dirname, linkDirectories, opts.signal)
    if (!removed.ok)
      return { ok: false, error: `清理孤儿工作树目录失败：${removed.error}` }
  }
  else {
    // State C: only Git's admin entry remains. No filesystem deletion is
    // necessary, but it must be pruned before add can reuse the path.
    const pruned = await pruneWorktreeAdmin(root, opts.signal)
    if (!pruned.ok)
      return { ok: false, error: `清理工作树管理记录失败：${pruned.error}` }
  }

  const requestedBranch = String(opts.branchName ?? '').trim()
  if (requestedBranch && !WORKTREE_BRANCH_NAME_PATTERN.test(requestedBranch)) {
    return { ok: false, error: `非法分支名：${requestedBranch}` }
  }
  const branchName = requestedBranch
    ? (requestedBranch.startsWith('dsh/') ? requestedBranch : `dsh/${requestedBranch.replace(/^\/+/, '')}`)
    : ''
  if (branchName === 'dsh/')
    return { ok: false, error: '分支名不能为空' }
  if (branchName) {
    const exists = await git(['rev-parse', '--verify', '--quiet', `refs/heads/${branchName}`], root, { signal: opts.signal })
    if (exists.ok && exists.out.trim())
      return { ok: false, error: `分支已存在：${branchName}` }
  }

  const log = ['Starting worktree creation']
  const addArgs = branchName
    ? ['worktree', 'add', '-b', branchName, path, mainSource]
    : ['worktree', 'add', '--detach', path, mainSource]
  const add = await git(addArgs, root, { signal: opts.signal })
  if (!add.ok)
    return { ok: false, error: `创建工作树失败：${add.error}` }

  // 可选携带源仓库暂存内容：工作树默认从 main 干净检出，用户已暂存的改动不会出现；
  // carryStaged 打开时把 index 状态搬进新工作树（只搬已暂存，未暂存/未跟踪不携带）。
  // 失败则回滚刚创建的 worktree，避免留下「创建成功但内容不完整」的半成品。
  if (opts.carryStaged === true) {
    const carried = await carryStagedChanges(root, path, { signal: opts.signal })
    if (!carried.ok) {
      const rollbackFailures: string[] = []
      const removed = await removeWorktreeOnDisk(ctx, sessionId, worktreesRoot, root, path, hash, dirname, linkDirectories, opts.signal)
      if (!removed.ok)
        rollbackFailures.push(`移除工作树失败：${removed.error}`)
      if (branchName) {
        const dropped = await deleteOwnedBranch(root, branchName, opts.signal)
        if (!dropped.ok)
          rollbackFailures.push(`删除分支失败：${dropped.error}`)
      }
      const suffix = rollbackFailures.length > 0 ? `；回滚不完整：${rollbackFailures.join('；')}` : '，工作树已回滚'
      return { ok: false, error: `携带暂存内容失败：${carried.error}${suffix}` }
    }
    if (carried.carried.length > 0)
      log.push(`Carried staged changes (${carried.carried.length} file(s)) from the source repository`)
  }

  // UI 预选流程保持 detached；Agent 工具提供 branch_name 时直接在 dsh/* 分支工作。
  const head = await git(['rev-parse', '--abbrev-ref', 'HEAD'], path)
  const activeBranch = head.ok && head.out !== 'HEAD' ? head.out : (branchName || '(detached)')
  log.push(branchName
    ? `Preparing worktree (branch ${branchName})`
    : `Preparing worktree (detached HEAD ${await shortHead(path)})`)
  log.push(`HEAD is now at ${await shortHead(path)} ${await headSubject(path)}`)
  log.push(`Worktree created at ${path}`)

  // 依赖目录自动链接：工作树只检出 tracked 文件，node_modules 等被 gitignore 的目录
  // 不会跟随。默认把源仓库的依赖目录以目录联接挂进工作树，使其开箱可用；安装类命令
  // 执行前会先断开链接（见 apply.ts 的 tools/execute 钩子），从而物化为独立目录。
  // 链接失败仅记录日志，绝不让工作树创建失败。
  const linkedDependencies: string[] = []
  if (linkDependencies) {
    try {
      const linked = await linkWorktreeDependencies(root, path, linkDirectories)
      linkedDependencies.push(...linked.linked)
      if (linked.linked.length > 0)
        log.push(`Linked dependencies from the source repository (${linked.linked.join(', ')}); install will materialize an independent copy`)
      for (const name of linked.skipped) {
        if (existsSync(join(root, name)))
          log.push(`Dependency directory already present, kept as-is (${name})`)
      }
    }
    catch (error) {
      log.push(`Dependency link skipped: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const binding = {
    sessionId,
    sourceSessionId: opts.sourceSessionId || sessionId,
    hash,
    dirname,
    worktreePath: path,
    projectPath: root,
    branchName: activeBranch,
    ownsBranch: Boolean(branchName),
    createdAt: new Date().toISOString(),
    log,
    ...(linkedDependencies.length > 0 ? { linkedDependencies } : {}),
  }
  // 绑定落盘失败时回滚刚创建的 git worktree 与分支，避免留下未被 ledger 引用的
  // 孤儿目录。saveBinding 只原子写本会话自己的文件，不再整表读写；saveBinding 内部
  // 已对瞬时 EPERM 做退避重试，这里兜底覆盖其余硬失败（如权限/磁盘）。
  try {
    await saveBinding(worktreesRoot, sessionId, binding)
  }
  catch {
    const rollbackFailures: string[] = []
    const removed = await removeWorktreeOnDisk(ctx, sessionId, worktreesRoot, root, path, hash, dirname, linkDirectories, opts.signal)
    if (!removed.ok)
      rollbackFailures.push(`移除工作树失败：${removed.error}`)
    if (branchName) {
      const dropped = await deleteOwnedBranch(root, branchName, opts.signal)
      if (!dropped.ok)
        rollbackFailures.push(`删除分支失败：${dropped.error}`)
    }
    const suffix = rollbackFailures.length > 0 ? `；回滚不完整：${rollbackFailures.join('；')}` : '，已回滚'
    return { ok: false, error: `保存工作树记录失败${suffix}` }
  }

  // 不注册成普通 DSH Workspace：否则「新建会话」会复用 blank worktree 会话，
  // 造成默认进入工作树。隔离会话直接以 sessions.create({ cwd }) 绑定此路径。

  return { ok: true, binding, log, existed: false }
}

/** 解析工作树绑定（兼容 sessionId 或 worktreeHashDirname 定位）。 */
export async function resolveBinding(worktreesRoot: string, sessionId?: string, key?: string): Promise<{ binding: Binding | null }> {
  // 主路径：按会话直读自己的 ledger 文件（多工作树同组时也能精确命中）。
  if (sessionId) {
    const bySession = await loadBinding(worktreesRoot, sessionId)
    if (bySession)
      return { binding: bySession }
  }
  // 回退：按 [hash]/[dirname] key 遍历。仅会话 id 对不上时走全量扫描。
  if (key) {
    const all = await listBindings(worktreesRoot)
    for (const binding of all) {
      if (binding.hash && binding.dirname && `${binding.hash}/${binding.dirname}` === key) {
        return { binding }
      }
    }
  }
  return { binding: null }
}

/** 清理旧版本创建的普通 Workspace 注册；仅注销记录，不删除目录或会话。 */
export async function unregisterWorktreeWorkspace(ctx: HostContext, path: string): Promise<void> {
  try {
    const workspace = await ctx.workspaceRegistry.resolveByPath(path)
    if (workspace?.id)
      await ctx.workspaceRegistry.delete(workspace.id)
  }
  catch {
    /* 未注册或路径已不存在时无需处理 */
  }
}

/**
 * 检出本地：在工作树分支保留改动，本地仓库创建/切换用户指定的分支。
 *
 * 检出语义（已与用户确认）：「检出本地」= 在工作树分支上保留全部改动，在本地仓库
 * 创建/切换到 `dsh/<branch>` 分支，Agent 继续在本地仓库工作；主分支不受影响。
 * @param ctx 宿主根上下文
 * @param worktreesRoot 工作树根目录
 * @param params 检出参数（worktree_hash_dirname / sessionId / branch_name）
 * @param opts 检出选项（signal / carryStaged / beforeRemove 会话交接钩子）
 * @returns 检出结果
 */
export async function checkoutToLocal(
  ctx: HostContext,
  worktreesRoot: string,
  params: WorktreeParams,
  opts: CheckoutOptions = {},
): Promise<OperationResult<{ branch: string, projectPath: string, worktreePath: string }>> {
  const { binding } = await resolveBinding(worktreesRoot, params.sessionId, params.worktreeHashDirname)
  if (!binding)
    return { ok: false, error: `未找到绑定的工作树` }
  if (!existsSync(binding.worktreePath))
    return { ok: false, error: `工作树目录不存在：${binding.worktreePath}` }

  const root = binding.projectPath
  // 删除工作树前需断开的依赖链接（binding 记录 ∪ 当前配置）。
  const linkDirectories = removalLinkDirectories(binding, opts.linkDependencyDirectories)
  // 本地分支名完全使用调用方输入；UI 默认填 `dsh/`，但用户可删除该前缀。
  const branch = String(params.branch_name ?? binding.branchName ?? '').trim()
  if (!branch || branch.endsWith('/'))
    return { ok: false, error: `分支名不能为空或以 / 结尾：${branch}` }
  const validBranch = await git(['check-ref-format', '--branch', branch], root, { signal: opts.signal })
  if (!validBranch.ok)
    return { ok: false, error: `非法分支名：${branch}` }

  // 1) 在改动 ref 前完成安全预检。主工作区必须干净，避免 git checkout 把本地改动
  //    静默带到功能分支；隔离工作树仅允许 committed 内容和显式携带的 staged 内容。
  const mainStatus = await git(['status', '--porcelain=v1'], root, { signal: opts.signal })
  if (!mainStatus.ok)
    return { ok: false, error: `读取本地主工作区状态失败：${mainStatus.error}` }
  if (mainStatus.out)
    return { ok: false, error: '本地主工作区存在未提交改动；请先提交或清理后再检出工作树' }
  const worktreeStatus = await git(['status', '--porcelain=v1'], binding.worktreePath, { signal: opts.signal })
  if (!worktreeStatus.ok)
    return { ok: false, error: `读取隔离工作树状态失败：${worktreeStatus.error}` }
  const dirtyRows = worktreeStatus.out.split('\n').filter(Boolean)
  const unsupportedRows = dirtyRows.filter(row => !/^[ACDMRT] /.test(row))
  if (unsupportedRows.length > 0)
    return { ok: false, error: '隔离工作树存在未暂存或未跟踪改动；请先提交这些改动再检出，避免删除工作树时丢失内容' }
  if (dirtyRows.length > 0 && opts.carryStaged !== true)
    return { ok: false, error: '隔离工作树存在已暂存改动；请启用 carry_staged 或先提交这些改动再检出' }

  const worktreeHead = await git(['rev-parse', 'HEAD'], binding.worktreePath, { signal: opts.signal })
  if (!worktreeHead.ok)
    return { ok: false, error: `读取工作树 HEAD 失败：${worktreeHead.error}` }
  const prev = await git(['symbolic-ref', '--quiet', '--short', 'HEAD'], root, { signal: opts.signal })
  if (!prev.ok)
    return { ok: false, error: '本地主工作区当前处于 detached HEAD；请先切换到本地分支再检出工作树' }
  const prevBranch = prev.out
  // 显式标注联合类型，保证 `ok` 判别后两端各自可访问 error/patch（含 ok:boolean 的
  // 泛化联合无法据此收窄到 error 分支）。
  const carriedPatch: OperationResult<{ patch: string }> = opts.carryStaged === true
    ? await stagedPatch(binding.worktreePath, { signal: opts.signal })
    : { ok: true, patch: '' }
  if (!carriedPatch.ok)
    return { ok: false, error: `读取工作树暂存内容失败：${carriedPatch.error}` }

  // 2) Agent 创建的工作树已经拥有其功能分支。先把工作树 detach 以释放该分支，再在
  //    本地主工作区切到同一个现有分支；不能把“分支已存在”误判成冲突并复制第二个分支。
  //    其他已存在分支仍安全拒绝，绝不静默重置用户分支指针。
  const branchRef = await git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], root, { signal: opts.signal })
  const handsOffOwnedBranch = binding.ownsBranch && binding.branchName === branch
  let detachedOwnedBranch = false
  let createdBranch = false
  if (handsOffOwnedBranch) {
    if (!branchRef.ok)
      return { ok: false, error: `工作树拥有的本地分支不存在，拒绝重建以避免覆盖状态：${branch}` }
    if (branchRef.out !== worktreeHead.out)
      return { ok: false, error: `工作树 HEAD 与其本地分支指针不一致，拒绝检出：${branch}` }
    const activeBranch = await git(['symbolic-ref', '--quiet', '--short', 'HEAD'], binding.worktreePath, { signal: opts.signal })
    if (!activeBranch.ok || activeBranch.out !== branch)
      return { ok: false, error: `工作树未签出其记录的本地分支，拒绝检出：${branch}` }
    const detached = await git(['checkout', '--detach'], binding.worktreePath, { signal: opts.signal })
    if (!detached.ok)
      return { ok: false, error: `释放工作树分支失败：${detached.error}` }
    detachedOwnedBranch = true
  }
  else {
    if (branchRef.ok)
      return { ok: false, error: `本地分支已存在且不属于当前工作树，为避免覆盖其提交而拒绝检出：${branch}` }
    const created = await git(['branch', branch, worktreeHead.out], root, { signal: opts.signal })
    if (!created.ok)
      return { ok: false, error: `创建本地分支失败：${created.error}` }
    createdBranch = true
  }

  const restoreSourceBranch = async (): Promise<string> => {
    if (!detachedOwnedBranch)
      return ''
    const restored = await git(['checkout', branch], binding.worktreePath)
    return restored.ok ? '' : `；工作树分支自动恢复失败：${restored.error}`
  }
  const removeCreatedBranch = async (): Promise<string> => {
    if (!createdBranch)
      return ''
    const removed = await git(['branch', '-D', branch], root)
    return removed.ok ? '' : `；新建分支自动清理失败：${removed.error}`
  }
  const rollbackHandoff = async (resetTarget = false): Promise<string> => {
    const failures: string[] = []
    if (resetTarget) {
      const reset = await git(['reset', '--hard', 'HEAD'], root)
      if (!reset.ok)
        failures.push(`清理目标分支暂存状态失败：${reset.error}`)
    }
    const switchedBack = await git(['checkout', prevBranch], root, { signal: opts.signal })
    if (!switchedBack.ok) {
      failures.push(`恢复本地主分支失败：${switchedBack.error}`)
    }
    else {
      const sourceRecovery = detachedOwnedBranch ? await restoreSourceBranch() : await removeCreatedBranch()
      if (sourceRecovery)
        failures.push(sourceRecovery.replace(/^；/, ''))
    }
    return failures.length > 0 ? `；${failures.join('；')}` : ''
  }

  // 3) 本地主工作区切到移交或新建的分支。失败时恢复原工作树的分支占用，或清理本次
  //    新建的分支，保证重试不会因残留状态再次失败。
  const check = await git(['checkout', branch], root, { signal: opts.signal })
  if (!check.ok) {
    const recovery = detachedOwnedBranch ? await restoreSourceBranch() : await removeCreatedBranch()
    return { ok: false, error: `切换到本地分支失败：${check.error}${recovery}` }
  }

  // 3.5) carryStaged：把工作树已暂存内容应用到本地检出，只动补丁涉及的路径，不覆盖
  //      本地其他未提交改动。失败时回滚到检出前分支并保留工作树，便于重试。
  if (carriedPatch.patch.trim()) {
    const applied = await applyStagedPatch(root, carriedPatch.patch, { signal: opts.signal })
    if (!applied.ok) {
      const recovery = await rollbackHandoff(true)
      return { ok: false, error: `携带暂存内容失败，工作树已保留：${applied.error}${recovery}` }
    }
  }

  // Preserve the worktree until the local session has been created successfully.
  if (opts.beforeRemove) {
    const prepared = await opts.beforeRemove({ branch, projectPath: root, worktreePath: binding.worktreePath })
    if (!prepared.ok) {
      const recovery = await rollbackHandoff(Boolean(carriedPatch.patch.trim()))
      return { ok: false, error: `Failed to create the local handback session; the worktree was preserved: ${prepared.error}${recovery}` }
    }
  }

  // 4) 注销旧版本可能创建的普通 Workspace 记录，再用 junction-safe 的 fs.rm
  // 删除磁盘内容；Git 只清管理记录，绝不递归遍历工作树。
  await unregisterWorktreeWorkspace(ctx, binding.worktreePath)
  const removed = await removeWorktreeOnDisk(
    ctx,
    binding.sessionId,
    worktreesRoot,
    root,
    binding.worktreePath,
    binding.hash,
    binding.dirname,
    linkDirectories,
    opts.signal,
  )
  if (!removed.ok) {
    // rename/rm 完全失败时目录仍可用，恢复检出前状态以允许安全重试。若目录已经
    // 消失而只剩 admin 清理失败（state C），则不能恢复源工作树，但仍保留 binding。
    const recovery = existsSync(binding.worktreePath)
      ? await rollbackHandoff(Boolean(carriedPatch.patch.trim()))
      : ''
    return { ok: false, error: `删除工作树失败，绑定已保留以便重试：${removed.error}${recovery}` }
  }

  // 5) 解除绑定：只删本会话的 ledger 文件，互不干扰同组其他工作树。
  await removeBinding(worktreesRoot, binding.sessionId)

  return { ok: true, branch, projectPath: root, worktreePath: binding.worktreePath }
}

/**
 * 放弃更改：删除工作树并解除绑定（会话保留）。
 * @param ctx 宿主根上下文
 * @param worktreesRoot 工作树根目录
 * @param params 放弃参数（worktree_hash_dirname / sessionId）
 * @param opts 选项
 * @param opts.signal 可选取消信号
 * @param opts.linkDependencyDirectories 删除前需断开的依赖链接目录名
 * @returns 放弃结果
 */
export async function discardWorktree(
  ctx: HostContext,
  worktreesRoot: string,
  params: WorktreeParams,
  opts: { signal?: AbortSignal, linkDependencyDirectories?: string[] } = {},
): Promise<OperationResult<{ worktreePath: string }>> {
  const { binding } = await resolveBinding(worktreesRoot, params.sessionId, params.worktreeHashDirname)
  if (!binding)
    return { ok: false, error: `未找到绑定的工作树` }

  await unregisterWorktreeWorkspace(ctx, binding.worktreePath)
  // Run even when the directory is absent so state C (admin-only) converges.
  const removed = await removeWorktreeOnDisk(
    ctx,
    binding.sessionId,
    worktreesRoot,
    binding.projectPath,
    binding.worktreePath,
    binding.hash,
    binding.dirname,
    removalLinkDirectories(binding, opts.linkDependencyDirectories),
    opts.signal,
  )
  if (!removed.ok)
    return { ok: false, error: `删除工作树失败，绑定已保留以便重试：${removed.error}` }

  // create_worktree(branch_name) 新建的 dsh/* 分支属于临时工作树；放弃时一并删除。
  // UI detached 流程和旧 ledger 没有 ownsBranch，不碰其任何本地分支。
  if (binding.ownsBranch && binding.branchName) {
    const dropped = await deleteOwnedBranch(binding.projectPath, binding.branchName, opts.signal)
    if (!dropped.ok)
      return { ok: false, error: `删除工作树分支失败，绑定已保留以便重试：${dropped.error}` }
  }

  await removeBinding(worktreesRoot, binding.sessionId)

  return { ok: true, worktreePath: binding.worktreePath }
}
