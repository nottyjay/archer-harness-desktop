# Scheduler 同步日志

用于记录 `source/dsh-automation` 能力同步到 `packages/dsh-tauri-panel-scheduler` 的进度，避免后续重复对比或遗漏实现。

## 同步基线

- 参考项目：[`MichengAI/dsh-automation`](https://github.com/MichengAI/dsh-automation)
- 本次对比版本：`v0.1.32`
- 本次对比提交：`f1bc91a`
- Panel 当前版本：`0.6.7`
- 记录更新时间：2026-09-07
- 宿主兼容跟进：上游 `c426c3d`（`v0.1.35`，2026-09-10）适配 DSH `0.1.5-rc.1`；
  上游最新 tag 为 `v0.1.40`（`88e20ed`）。

## 宿主兼容修复（DSH 0.1.5-rc.1）

### 现象

内核升级到 `0.1.5-rc.1` 后，面板的「立即执行」与「定时触发」全部失败：`$DSH_HOME/crons/runs`
中的运行记录错误恒为 `cannot get property "agent" without inject`。

### 根因

- `0.1.2-rc.1` 的 `@deepseek-ai/dsh-agent/lib/types/index.js` 注册了 DX accessor
  `ctx.accessor('agent', { get: () => undefined })`；`0.1.5-rc.1` 移除了该注册。
- 于是读取 `agentCtx.agent` 不再得到 `undefined`，而是被 Cordis 上下文代理抛出
  `cannot get property "agent" without inject`（`@deepseek-ai/cordis/lib/index.js:675`）。
- `@deepseek-ai/dsh-agent-loop/lib/index.js` 同步改为把 Agent 作为 setup 的第二参数传入
  （`setup?.(prepared.agent.ctx, prepared.agent)`），`agents.enter(agent, parentAgent)` 也不再从 ctx 读 Agent。
- 旧实现 `const agent = agentCtx.agent` 在 setup 阶段即抛错，`executeTask` 整体失败；
  立即执行与定时触发共用该路径，故同时失效。

### 修复（对齐上游 `c426c3d` / `v0.1.35`）

- `src/host/service/executor.ts`：新增 `SetupAgentLike` 与 `resolveSetupAgent(agentCtx, createdAgent)`；
  setup 签名改为 `(agentCtx, createdAgent?)`，取值 `createdAgent ?? agentCtx.agent`——`??` 短路保证
  新宿主上绝不触碰会抛错的 `agentCtx.agent`，旧宿主仍走上下文入口。
- `src/types/dsh.d.ts`：移除 `Context.agent` 声明，避免再把 accessor 当作稳定 API。
- `src/host/service/executor.test.ts`：新增 3 例覆盖「第二参数优先」「旧宿主回落」「两者皆无 → undefined」，
  其中第一例用会抛错的 getter 模拟 `0.1.5-rc.1` 的 Cordis 代理行为。

### 已核对仍存在（0.1.5-rc.1）的宿主 API

`agents.create` 的 `setup` 首参、`agents.withoutInitiator`、`agentPresets.mount(agentCtx, id)`、
`installModelSelection`（`@deepseek-ai/dsh-agent`）、`sessions.flush(session)`、
`ctx.permissionPresets`——除 `ctx.agent` 外执行路径无其它 API 漂移。

### 与上游的其它差异（本插件不适用）

- `cordis.patch.yml` 的 `connection.inject: [webServer, webRuntime]`：上游用它恢复 Web RPC 启动；
  本插件路由直接注册在自身作用域的 `ctx.webServer`（`inject` 已声明 `webServer`），无需该补丁。
- `knownSessionIds` 的 `canListStored` 判定与 `{ header }` 兜底：本插件没有会话枚举关联逻辑。

## 已同步

### P0

- [x] 移除 scheduler executor 固定 `UNATTENDED_TOOL_ALLOWLIST`。
- [x] 不再禁止 `bash` / `pwsh` 的 `run_in_background`。
- [x] 无人值守执行只应用 Host permission preset，并调用 `setApprovalPolicy('never')`。
- [x] 保留执行超时、取消与取消收敛逻辑。
- [x] 支持 `once`、`hourly`、`daily`、`interval`、`workdays`、`weekly`、`monthly`、`custom`。
- [x] `interval` / `custom` 支持固定 `anchor`，下一次执行按 anchor + N × step 计算。
- [x] 恢复逻辑将进程中断的 `running` 记录标记为 `interrupted`；`queued` 不作为已开始执行处理。

### P1

- [x] 执行状态增加 `interrupted`，同步中英文显示。
- [x] 任务卡片菜单增加显式 `Edit`。
- [x] 任务计划描述支持单次、每小时、每月、自定义周期。
- [x] 每月计划支持日期 `1–31` 与时间。
- [x] 自定义计划支持间隔天数 `1–366` 与时间。
- [x] 一次性计划使用 `datetime-local`，并在计划行内填充剩余宽度。
- [x] 恢复原有工具栏布局，不增加时间筛选 Select。

### P2/P3

- [x] 页面从隐藏状态恢复可见时刷新。
- [x] 页面重新获得焦点时刷新。
- [x] 保留已有删除确认、workspace 校验、卡片点击编辑、超时取消与并发上限。

## 明确未同步

以下能力依赖桌面端当前没有提供的 Archive Manager 或 session-folder 能力，本轮不实施：

- Web 专用 session folders。
- whole-group archive。
- host sync bridge。
- Archive Manager UI。

## 验证记录

### DSH 0.1.5-rc.1 宿主兼容修复（2026-09-13）

```text
pnpm run test -- --run                          # 43 test files, 338 tests passed
pnpm run typecheck                              # tsc --noEmit 通过（0 error）
pnpm --filter dsh-tauri-panel-scheduler build   # tsdown 构建通过，publint 无问题
pnpm exec eslint packages/dsh-tauri-panel-scheduler/src --fix
```

Lint 当前只有既有 warning（6 条既有 React 规则提示），无新增 error。

### v0.1.32 同步（2026-09-07）

```text
pnpm run test -- --run       # 17 test files, 106 tests passed
pnpm --filter dsh-tauri-panel-scheduler typecheck
pnpm --filter dsh-tauri-panel-scheduler build
pnpm exec eslint packages/dsh-tauri-panel-scheduler/src --fix
```

PR #412 的 Frontend、macOS、Ubuntu、Windows CI 均已通过。

## 内核侧交叉验证（0.1.5-rc.1）

内核自身消费方已经全部改用 setup 第二参数，可作为新 API 的权威样例：

- `@deepseek-ai/dsh-api-session-controller/lib/index.js:356-366`：
  `setup: async (agentCtx, agent) => { this.installSelection(agent); await presets.mount(agentCtx, resolvedId) }`。
- `@deepseek-ai/dsh-acp/lib/index.js:717`：`setup: async (agentCtx, agent) => { …agent.session.requestHeader()… }`。
- `@deepseek-ai/dsh-agent-loop/lib/index.js:1856`：`setup?.(prepared.agent.ctx, prepared.agent)`。

结论：`agentCtx` 只用于挂载预设/安装模型选择，Agent 一律走第二参数；`ctx.agent` 不再是可依赖入口。

## 后续同步流程

1. 获取参考仓库最新 tag 与提交：记录版本号和 commit SHA。
2. 对照参考项目的 `CHANGELOG.md`，按 P0 → P1 → P2/P3 分类新增能力。
3. 先更新本文件的“同步基线”和“待同步”项，再修改 host/client 实现。
4. 同步协议时同时检查：
   - `src/shared/constants.ts`
   - `src/host/types/index.ts`
   - `src/client/types/scheduler.ts`
   - `src/host/service/schedule.ts`
   - `src/host/service/executor.ts`
   - `src/client/components/task-create-dialog.tsx`
   - `src/client/locales/index.ts`
5. 完成后运行 lint、typecheck、test、build，并在本文件补充验证结果。
6. 将已完成项从“待同步”移动到“已同步”，保留未实施项及原因。

## 待同步项

本轮只处理 DSH `0.1.5-rc.1` 宿主兼容（P0 缺陷），参考仓库 `v0.1.36`–`v0.1.40` 的新能力尚未评估：

- `0156a06`（v0.1.36）`fix: preserve automation availability when session enumeration fails`——会话枚举失败时保活；
  需先确认本插件是否存在同类枚举依赖。
- `f05c477`（v0.1.37）/ `d60a711`（v0.1.38）DSH `0.1.5-rc.2` 支持与 rc.2 包校验——待内核进入 rc.2 时对齐。
- `1f38c56`/`207d2cc`/`3a4be24`/`88e20ed`（v0.1.39–v0.1.40）取消全局并发上限、按任务并发、一分钟间隔粒度、
  RPC 边界并发校验——属能力扩展（P2），需要 UI（任务创建对话框）与协议同步后再实施。

