/**
 * host/service/executor.ts — 定时任务的执行器：新建独立 Agent 会话 + 注入任务指令。
 *
 * 执行逻辑逐字对齐 MichengAI/dsh-automation 的 src/executor.ts（executeAutomationRun）：
 *   ctx.agents.withoutInitiator(() => ctx.agents.create({...})) → AgentHandle；
 *   setup 回调里 installModelSelection 把模型选择写入 agent 上下文（解决汇编 deployment:persona
 *   段 {{model}} 无值导致运行无反应）、applyUnattendedPermission 应用权限预设、tools.guard 施加
 *   无人值守工具白名单；随后 handle.agent.followup(createUserMessage(...)) 把任务指令作为带来源的
 *   首条用户消息唤醒驱动；Promise.race([whenIdle, deadline, cancellation]) 等收敛（带超时/取消）；
 *   summarizeRun 提取结果与结束原因。
 *
 * 模型绑定：**始终解析一个模型选择**。任务成对 provider/model 则固定之（可带 reasoningEffort），
 * 旧任务仅有 module 则用之，否则回退宿主默认 ctx.agentDefaultModel.currentSelection()（兼容
 * ctx.get('agentDefaultModel') 访问器）。模型经 installModelSelection 绑定，保证汇编可靠。
 */

import type { ModelSelection } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-agent-presets'
import type { HostContext, RunTrigger, SchedulerTask } from '../types'
import type { PermissionPresetService } from './permission-presets'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { createRun, updateRun } from './run'

import { schedulerSessionTitle } from './run-title'

/** 单次执行结果（scheduler.ts / 路由消费）。 */
export interface ExecuteOutcome {
  ok: boolean
  sessionId?: string
  error?: string
  /** 实际触发的模型选择（调试/展示用）。 */
  model?: string
}

/** 宿主 loader 的最小接口：从 DSH 自身模块根解析核心包，而非插件资源目录。 */
interface PlatformModuleLoader {
  import: (name: string) => Promise<unknown>
  unwrapExports: (exports: unknown) => unknown
}

interface SchedulerRuntimeModules {
  installModelSelection: (agentCtx: unknown, selection: {
    current: ModelSelection | undefined
    assembled: ModelSelection | undefined
  }) => () => void
  createUserMessage: (value: {
    content: readonly { type: 'text', text: string }[]
    source: unknown
  }) => unknown
  setApprovalPolicy: (session: unknown, policy: 'ask' | 'never') => void
}

type RuntimeModuleExports = Partial<SchedulerRuntimeModules>

interface SessionEventLike {
  readonly seq: number
  readonly type: string
  readonly data: Record<string, any>
}

/*
 * Permission is intentionally delegated to the host preset. The scheduler must not
 * maintain a second, stale tool allowlist: new DSH tools should work automatically.
 */
/**
 * 无人值守工具白名单（对齐 MichengAI unattendedToolGuardReason，并按 dsh 0.1.0-rc.x
 * standard 预设的实际模型工具目录补齐安全类别）。该列表只限制无人值守可调用的工具
 * 类别；读写边界仍由已应用的 Host 权限预设（applyUnattendedPermission）决定。
 *
 * 刻意不放行的类别（fail-closed，缺省拒绝）：
 *  - ask_user_question / exit_plan_mode：交互式人工应答/计划审批，无人值守没有应答方；
 *  - create_worktree / checkout_worktree（dsh-tauri-worktree 插件）：工具契约要求用户
 *    显式授权，本 guard 就是无人值守下的授权层；
 *  - scheduler_*（本插件自注册工具）：防止无人值守任务增删改/触发自动化，形成自我
 *    perpetuation 循环；
 *  - MCP 等动态注册工具：静态白名单无法逐一核验，保持拒绝。
 */

const CANCEL_CONVERGENCE_TIMEOUT_MS = 10_000

/** @deprecated Permission policy is host-owned; retained as a no-op compatibility export. */
export function unattendedToolGuardReason(_name: string, _args: unknown): undefined {
  return undefined
}

/**
 * 从平台 loader 加载 DSH-owned 核心模块。内置插件位于独立 resources/node_modules，
 * 原生 ESM 裸导入会错误地从该资源树查找这些包；loader 才持有 DSH 安装目录的解析基址。
 */
function resolveRuntimeExport<T extends keyof SchedulerRuntimeModules>(
  loader: PlatformModuleLoader,
  moduleExports: unknown,
  name: T,
): SchedulerRuntimeModules[T] {
  // DSH modules may expose both named exports and a default export. `unwrapExports()`
  // intentionally returns the default in that case, so prefer the namespace's named
  // export and only unwrap as a compatibility fallback for CJS-shaped modules.
  const direct = (moduleExports as RuntimeModuleExports | null)?.[name]
  if (typeof direct === 'function')
    return direct as SchedulerRuntimeModules[T]

  const unwrapped = loader.unwrapExports(moduleExports) as RuntimeModuleExports | null
  const fallback = unwrapped?.[name]
  if (typeof fallback !== 'function')
    throw new TypeError(`SCHEDULER_RUNTIME_EXPORT_MISSING: ${String(name)}`)
  return fallback as SchedulerRuntimeModules[T]
}

export async function loadSchedulerRuntimeModules(loader: PlatformModuleLoader): Promise<SchedulerRuntimeModules> {
  const [agent, llm, approval] = await Promise.all([
    loader.import('@deepseek-ai/dsh-agent'),
    loader.import('@deepseek-ai/dsh-llm'),
    loader.import('@deepseek-ai/dsh-user-approval'),
  ])
  return {
    installModelSelection: resolveRuntimeExport(loader, agent, 'installModelSelection'),
    createUserMessage: resolveRuntimeExport(loader, llm, 'createUserMessage'),
    setApprovalPolicy: resolveRuntimeExport(loader, approval, 'setApprovalPolicy'),
  }
}

/** 对不保证及时响应 AbortSignal 的宿主任务设置第二道退出上限（对齐 MichengAI）。 */
export function settlesWithin(promise: Promise<unknown>, timeoutMs: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return Promise.race([
      promise.then(() => true, () => false),
      new Promise<false>((resolve) => { timer = setTimeout(resolve, timeoutMs, false) }),
    ])
  }
  finally {
    if (timer !== undefined)
      clearTimeout(timer)
  }
}

/** 先应用官方预设的完整语义，再让无人值守审批 fail-closed（对齐 MichengAI）。 */
export function applyUnattendedPermission(
  presets: PermissionPresetService,
  session: unknown,
  permission: string | undefined,
  setApprovalPolicy: SchedulerRuntimeModules['setApprovalPolicy'],
): void {
  presets.set(session, permission ?? presets.defaultPreset)
  setApprovalPolicy(session, 'never')
}

/**
 * setup 回调可拿到的目标 Agent 的最小面（本插件只用到 session 来应用权限预设）。
 *
 * DSH 0.1.5-rc.1 起，Agent 由宿主作为 setup 的**第二参数**显式传入；0.1.2 及更早版本
 * 只把 Agent 挂在 setup 拿到的 agentCtx 上。
 */
export interface SetupAgentLike {
  readonly session: unknown
}

/**
 * 跨宿主版本解析 setup 回调拿到的目标 Agent。
 *
 * 为什么不能直接读 `agentCtx.agent`：`ctx.agent` 是 dsh-agent 在 0.1.2 注册的 DX accessor
 * （`ctx.accessor('agent', { get: () => undefined })`）；0.1.5-rc.1 移除了该注册，于是读取
 * `agentCtx.agent` 不再得到 undefined，而是被 Cordis 上下文代理抛出
 * `cannot get property "agent" without inject`（@deepseek-ai/cordis/lib/index.js），
 * 使执行在 setup 阶段整体失败——立即执行与定时触发都经这里，所以两者同时失效。
 *
 * 优先取宿主显式传入的 createdAgent：`??` 短路保证新宿主上绝不触碰 agentCtx.agent；
 * 只有旧宿主才回落到上下文入口（对齐 MichengAI/dsh-automation c426c3d 的写法）。
 */
export function resolveSetupAgent(
  agentCtx: unknown,
  createdAgent?: SetupAgentLike,
): SetupAgentLike | undefined {
  return createdAgent ?? (agentCtx as { agent?: SetupAgentLike } | undefined)?.agent
}

/** 从会话事件中提取 assistant 文本与 turn 结束原因（对齐 MichengAI summarizeRun）。 */
export function summarizeRun(events: readonly SessionEventLike[], firstSeq: number): {
  readonly text: string
  readonly reason?: Record<string, any>
} {
  let text = ''
  let reason: Record<string, any> | undefined

  for (const event of events) {
    if (event.seq < firstSeq)
      continue
    if (event.type === 'assistant/message') {
      const blocks = (event.data.message?.content ?? []) as readonly { type: string, text?: string }[]
      const joined = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('')
      if (joined)
        text = joined
    }
    else if (event.type === 'turn/end') {
      reason = event.data.reason as Record<string, any>
    }
  }

  return { text, ...(reason ? { reason } : {}) }
}

/**
 * 执行一次定时任务。创建 run 记录（running）→ 建会话 → followup → 等收敛（带超时/取消）→ 汇总结果并持久化。
 */
export async function executeTask(
  ctx: HostContext,
  task: SchedulerTask,
  trigger: RunTrigger,
  timeoutMs = 30 * 60 * 1000,
): Promise<ExecuteOutcome> {
  const runId = `run-${randomUUID()}`
  const scheduledFor = new Date().toISOString()
  const sessionId = `task-${randomUUID()}`

  // 1. 初始化并持久化运行记录
  await createRun({
    id: runId,
    taskId: task.id,
    taskName: task.name,
    trigger,
    status: 'running',
    scheduledFor,
    startedAt: scheduledFor,
    sessionId,
  })

  // 辅助内联函数：把某次执行更新为终态并持久化（保留最近 RUNS_HISTORY_LIMIT 条）
  const finalizeRun = (status: 'succeeded' | 'failed' | 'cancelled', outcome: ExecuteOutcome) =>
    updateRun(runId, {
      status,
      finishedAt: new Date().toISOString(),
      error: outcome.error,
      ...(outcome.sessionId ? { sessionId: outcome.sessionId } : {}),
    })

  try {
    const runtime = await loadSchedulerRuntimeModules(
      (ctx as HostContext & { loader: PlatformModuleLoader }).loader,
    )

    // 2. 解析工作区 CWD
    let cwd: string
    let workspace: { attachSession?: (id: unknown) => Promise<unknown> } | undefined

    if (task.workspaceId) {
      const resolved = ctx.workspaceRegistry?.get?.(task.workspaceId) as
        | { path?: string, status?: () => Promise<string>, attachSession?: (id: unknown) => Promise<unknown> }
        | undefined

      if (!resolved || typeof resolved.path !== 'string') {
        const outcome = { ok: false, sessionId, error: '目标工作区已不存在。' }
        await finalizeRun('failed', outcome)
        return outcome
      }
      if (await resolved.status?.() !== 'ok') {
        const outcome = { ok: false, sessionId, error: '目标工作区目录不可用或已变更。' }
        await finalizeRun('failed', outcome)
        return outcome
      }
      cwd = resolved.path
      workspace = resolved
    }
    else {
      // 未分组任务 cwd：~/.dsh/automations。不注册工作区、不 attachSession——
      // 侧边栏「未分组」桶是客户端按「不在任何 workspace.sessionIds 里」计算的
      // stray 组（dsh-client-ui-workspace groupByWorkspace），无归属会话自动落入。
      const env = process.env.DSH_HOME
      const home = env?.trim() ? env.trim() : join(homedir(), '.dsh')
      cwd = join(home, 'automations')
      await mkdir(cwd, { recursive: true }).catch(() => {})
    }

    // 3. 解析模型选择
    const selection: ModelSelection | undefined = task.provider && task.model
      ? { provider: task.provider, model: task.model, ...(task.reasoningEffort ? { reasoningEffort: task.reasoningEffort } : {}) }
      : ((): ModelSelection | undefined => {
          try {
            return (ctx.get?.('agentDefaultModel') as { currentSelection?: () => ModelSelection })?.currentSelection?.()
          }
          catch { return undefined }
        })()

    // 4. 执行 Agent 任务逻辑
    const agentPreset = task.agentPreset?.trim() || 'standard'
    let handle: any
    let timeout: ReturnType<typeof setTimeout> | undefined
    let agentResult: { status: 'succeeded' | 'failed' | 'cancelled', error?: { code: string, message: string } }

    try {
      const create = () => ctx.agents.create({
        sessionId,
        meta: { cwd, agentPreset },
        agentOptions: selection ? { provider: selection.provider, model: selection.model } : {},
        setup: async (agentCtx: any, createdAgent?: SetupAgentLike) => {
          await (ctx.agentPresets as { mount?: (agentCtx: unknown, presetId: string) => Promise<unknown> } | undefined)?.mount?.(agentCtx, agentPreset)
          runtime.installModelSelection(agentCtx, { current: selection, assembled: undefined })
          // 0.1.5-rc.1 起 Agent 由宿主作为 setup 第二参数传入；旧宿主才从 agentCtx 读取。
          const agent = resolveSetupAgent(agentCtx, createdAgent)
          if (!agent)
            throw new Error('scheduler setup has no scoped Agent')
          applyUnattendedPermission(
            ctx.permissionPresets as PermissionPresetService,
            agent.session,
            task.permission,
            runtime.setApprovalPolicy,
          )
        },
      })

      handle = ctx.agents.withoutInitiator != null ? await ctx.agents.withoutInitiator(create) : await create()
      await handle.agent.whenIdle()
      if (workspace)
        await workspace.attachSession?.(sessionId)

      // 内联 Pin session title 逻辑
      try {
        const titleService = ctx.get?.('sessionTitle') as { rename?: (target: unknown, value: string) => unknown } | undefined
        titleService?.rename?.(handle.agent.session, schedulerSessionTitle(task.name))
      }
      catch (err) {
        ctx.logger?.warn?.(`dsh-tauri-panel-scheduler: failed to pin session title: ${err instanceof Error ? err.message : String(err)}`)
      }

      const firstSeq = handle.agent.session.seq
      handle.agent.followup(runtime.createUserMessage({
        content: [{ type: 'text', text: task.prompt }],
        source: { kind: 'scheduler', taskId: task.id, runId, scheduledFor },
      }))

      let timedOut = false
      const idle = handle.agent.whenIdle()
      const deadline = new Promise<void>((resolve) => {
        timeout = setTimeout(() => {
          timedOut = true
          handle?.agent.cancel({ kind: 'hook', reason: 'scheduler run timeout' })
          resolve()
        }, timeoutMs)
      })

      await Promise.race([idle, deadline])

      if (timedOut && !await settlesWithin(idle, CANCEL_CONVERGENCE_TIMEOUT_MS)) {
        agentResult = { status: 'failed', error: { code: 'cancel_convergence_timeout', message: '定时任务取消后未能在安全时限内停止。' } }
      }
      else {
        await (ctx.sessions as { flush: (session: unknown) => Promise<unknown> }).flush(handle.agent.session)
        const outcome = summarizeRun(handle.agent.session.events, firstSeq)

        if (timedOut) {
          agentResult = { status: 'failed', error: { code: 'timeout', message: '定时任务超过最大运行时限。' } }
        }
        else if (outcome.reason?.kind === 'completed') {
          agentResult = { status: 'succeeded' }
        }
        else {
          // 内联解析错误原因逻辑
          const reason = outcome.reason
          const errCode = !reason
            ? 'no_turn_result'
            : reason.kind === 'error'
              ? (typeof reason.error?.code === 'string' ? reason.error.code : 'agent_error')
              : `turn_${String(reason.kind)}`
          const errMsg = !reason
            ? '本次定时任务没有产生完整 turn。'
            : reason.kind === 'error'
              ? (typeof reason.error?.message === 'string' ? reason.error.message : '定时任务 Agent 执行失败。')
              : `定时任务以 ${String(reason.kind)} 结束。`

          agentResult = { status: 'failed', error: { code: errCode, message: errMsg } }
        }
      }
    }
    finally {
      if (timeout !== undefined)
        clearTimeout(timeout)
    }

    // 5. 组装结果并写盘
    const outcome: ExecuteOutcome = {
      ok: agentResult.status === 'succeeded',
      sessionId,
      model: selection?.model,
      ...(agentResult.error ? { error: agentResult.error.message } : {}),
    }

    await finalizeRun(agentResult.status, outcome)
    return outcome
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const outcome: ExecuteOutcome = { ok: false, sessionId, error: message }
    await finalizeRun('failed', outcome)
    return outcome
  }
}
