# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-09-14T11:45:09.465Z
> Files: 514 tracked | Anatomy hits: 0 | Misses: 0

> Project structure index. Auto-maintained by OpenWolf hooks and daemon.
> Run `openwolf scan` to generate, or wait for the first Claude Code session.
> Status: Pending initial scan

## ./

- `.editorconfig` — Editor configuration (~38 tok)
- `.gitattributes` — Git attributes (~70 tok)
- `.gitignore` — Git ignore rules (~94 tok)
- `AGENTS.md` — Workspace Routing & Context Guidelines (~162 tok)
- `bump.config.ts` (~62 tok)
- `eslint.config.mjs` — ESLint flat configuration (~145 tok)
- `index.html` — Deepseek Harness Desktop (~102 tok)
- `LICENSE` — Project license (~292 tok)
- `LICENSE.details` (~199 tok)
- `package.json` — Node.js package manifest (~1156 tok)
- `pet.html` — Deepseek Harness Pet (~84 tok)
- `pnpm-workspace.yaml` (~966 tok)
- `postcss.config.js` — PostCSS configuration (~20 tok)
- `README.en.md` — Features (~3275 tok)
- `README.es.md` — Características (~3398 tok)
- `README.md` — Project documentation (~2330 tok)
- `skills-lock.json` (~78 tok)
- `tailwind.config.js` — Tailwind CSS configuration (~658 tok)
- `tsconfig.json` — TypeScript configuration (~197 tok)
- `tsconfig.node.json` (~66 tok)
- `vite.config.ts` — Vite build configuration (~408 tok)
- `vitest.config.ts` — Vitest test configuration (~307 tok)

## .github/

- `CODEOWNERS` (~12 tok)
- `stale.yml` (~100 tok)

## .github/ISSUE_TEMPLATE/

- `bug_report.yml` (~451 tok)
- `config.yml` (~8 tok)
- `feature_request.yml` (~398 tok)

## .github/actions/setup-node-pnpm/

- `action.yml` — CI: Setup Node.js and pnpm (~208 tok)

## .github/workflows/

- `build-linux.yml` — CI: Reusable Linux Build (~620 tok)
- `build-macos.yml` — CI: Reusable macOS Build (~1251 tok)
- `build-test.yml` — CI: Build Test (unsigned) (~1349 tok)
- `build-windows.yml` — CI: Reusable Windows Build (~564 tok)
- `ci.yml` — ", "**/*.md"]' (~1058 tok)
- `release.yml` — CI: Build & Release (~2425 tok)

## docs/

- `AGENTS.desktop.md` — Development Specification Document (~4667 tok)
- `AGENTS.plugins.md` — AGENTS.md (~3735 tok)
- `DEVELOPMENT.md` — Development (~387 tok)
- `DEVELOPMENT.zh.md` — 开发 (~261 tok)
- `DEVLOPMENT.SPEC.md` — 通用软件开发规范与协议 (Universal Software Engineering Protocol) (~932 tok)
- `PREVIEW.md` — Preview Gallery (~175 tok)

## docs/plugins/

- `12.迁移计划.0.1.5-rc.2-左侧边栏协议.md` — 0.1.5-rc.2 左侧边栏协议（`sidebar.panellist`）调研与 `dsh-tauri-panel-*` 迁移方案 (~5279 tok)

## docs/plugins/expired/

- `0.优化计划.基础变更.done.md` — ## DSH 架构与代码职责重构方案（全面并行推进） (~456 tok)
- `1.优化计划.工具库评估.done.md` — UnJS 工具库落地报告（packages workspace） (~862 tok)
- `10.优化计划.sidebar-app-宿主与tauri层通讯.md` — 10. 方案：sidebar-app 宿主与 Tauri 层通讯 (~3033 tok)
- `11.优化计划.turnrewind实现.done.md` — TurnRewind 插件实施方案（`dsh-tauri-turnrewind`） (~12802 tok)
- `2.优化计划.目录重组清单.done.md` — packages 目录重组清单（统一规律） (~2479 tok)
- `3.优化计划.alpha-panel.done.md` — alpha panel 优化计划 (~3119 tok)
- `4.优化计划.alpha.plan.done.md` — DSH Alpha 版本接口审查与优化计划（0.1.2-alpha.3） (~3434 tok)
- `5.优化计划.webhook-集成.盘点.done.md` — dsh-webhook(-github) 接口盘点与桌面端落地评估 (~2717 tok)
- `6.优化计划.worktree.done.md` — Worktree 删除可靠性优化文档 (~2871 tok)
- `8.优化计划.内置插件UI收敛.md` — 内置插件 UI 收敛优化方案 (~3584 tok)
- `9.优化计划.类型定义优化.md` — 9. 优化计划 · 插件类型定义优化（手写型收敛到 dsh-tauri + 官方来源） (~3286 tok)
- `pet.todo.md` — Pet 后续实现 TODO 与交接 (~7272 tok)

## docs/spec/

- `BUILTIN_PLUGINS.md` — Built-in (Internal) Plugins (~2209 tok)
- `BUILTIN_PLUGINS.zh.md` — 内置插件（Internal Plugins） (~1286 tok)
- `EDIT_MESSAGE.md` — ## 需求整理 (~542 tok)
- `MACOS_SIGNING.md` — macOS signing and notarization (~1005 tok)
- `MACOS_SIGNING.zh.md` — macOS 签名与公证 (~617 tok)
- `PET_PLUGINS.md` (~608 tok)
- `REMOTE.md` — 手机端远程连接 —— 调研与落地方案（方案 B：原生移动桥） (~2583 tok)
- `SDK_STDIO_BRIDGE.md` — Phase 3：SDK stdio 桥 —— dsh-sdk-* 接口盘点单（评估/预留） (~3327 tok)
- `TURNREWIND.md` — DSH TurnRewind 会话流程设计 (~2052 tok)
- `WORKTREE.md` — ## 需求规格说明书：Tauri 客户端内置 Git Worktree 插件集成 (~516 tok)

## docs/testing/

- `all_cases.md` — 测试用例汇总（all_cases.md） (~17362 tok)
- `checklist.md` — 测试任务与质量检查清单：deepseek-harness-desktop (~1537 tok)
- `plan.md` — 测试计划（DeepSeek Harness 桌面版） (~2844 tok)
- `quality-report.md` — 质量报告：deepseek-harness-desktop (~742 tok)

## docs/testing/01-install/

- `01-运行时与内核依赖安装.md` — 测试点：运行时与内核依赖安装 (~895 tok)
- `02-下载与解压进度.md` — 测试点：下载与解压进度 (~637 tok)
- `03-本机Node与Pnpm复用.md` — 测试点：本机 Node/Pnpm 复用 (~700 tok)
- `04-首次启动预设插件引导.md` — 测试点：首次启动预设插件引导 (~791 tok)
- `05-安装失败与网络异常处理.md` — 测试点：安装失败与网络异常处理 (~872 tok)

## docs/testing/02-core/

- `01-核心列表展示.md` — [P1] 验证存在本地核心时列表同时展示 local 与 app 版本行 (~402 tok)
- `02-激活核心切换.md` — [P1] 验证切换到本地核心成功并持久化 active_core=local (~602 tok)
- `03-历史版本下载.md` — [P1] 验证下载指定 tag 到槽位成功并展示两阶段进度 (~454 tok)
- `04-历史版本卸载.md` — [P1] 验证卸载非激活的历史版本成功 (~428 tok)
- `05-本地核心更新.md` — [P1] 验证更新本地核心到最新版本成功并回读新版本号 (~411 tok)

## docs/testing/03-lifecycle/

- `01-服务启动.md` — [P1] 验证点击启动后按 web 档案与 3080 端口拉起服务并进入 Running (~582 tok)
- `02-服务停止与重启.md` — [P1] 验证停止服务后状态进入 Stopped 且端口释放 (~409 tok)
- `03-状态流转与健康检查.md` — [P1] 验证状态按 Initial/Installing/Starting/Running/Stopped 正确流转并推送事件 (~436 tok)

## docs/testing/04-config/

- `01-配置对话框与管理.md` — [P1] 验证打开配置对话框正确展示四个分页 (~279 tok)
- `02-语言与主题.md` — [P1] 验证切换语言为 en 后界面文案即时变为英文 (~340 tok)
- `03-侧边栏与偏好设置.md` — [P2] 验证切换侧边栏开关生效 (~282 tok)
- `04-设置持久化.md` — [P1] 验证保存设置后 store 写入对应键值并触发 setting_updated 事件 (~334 tok)

## docs/testing/05-profile/

- `01-档案列表与展示.md` — 档案列表与展示 (~333 tok)
- `02-新建档案.md` — 新建档案 (~475 tok)
- `03-切换档案.md` — 切换档案 (~303 tok)
- `04-删除档案.md` — 删除档案 (~251 tok)
- `05-档案隔离性.md` — 档案隔离性 (~344 tok)

## docs/testing/06-plugin/

- `01-已安装插件列表与监控.md` — [P1] 验证已安装插件列表只读且正确展示 (~475 tok)
- `02-插件升级与卸载.md` — [P1] 验证升级已装插件到新版本成功 (~406 tok)
- `03-插件异常与恢复.md` — [P1] 验证页面运行期错误通过 report_plugin_error 记录并实时同步 (~542 tok)
- `04-预装插件安装引导.md` — [P1] 验证选中推荐插件后确认安装并展示实时安装日志 (~727 tok)

## docs/testing/07-cli/

- `01-dsh命令链接状态.md` — [P1] 验证安装完成后命令行集成状态为已链接 (~468 tok)
- `02-PATH注册与shim.md` — [P1] 验证安装后在各平台生成dsh shim并注册PATH (~665 tok)

## docs/testing/08-isolation/

- `01-端口隔离.md` — [P1] 验证 release 构建默认服务端口为 3080 (~335 tok)
- `02-数据目录隔离.md` — [P1] 验证 release 构建数据目录为 ~/.dsh 且 store 使用 .store.dat (~570 tok)

## docs/testing/09-privacy/

- `01-纯本地与隐私默认.md` — 纯本地与隐私默认 (~384 tok)
- `02-中英双语与暗色模式.md` — 中英双语与暗色模式 (~377 tok)

## docs/testing/10-updater/

- `01-版本检查与更新.md` — 桌面端自更新 — 版本检查与更新（10-updater / 01） (~866 tok)

## docs/testing/11-system/

- `01-系统操作集成.md` — [P1] 验证服务地址可在默认浏览器打开并复制到系统剪贴板 (~432 tok)
- `02-跨平台兼容与Windows极简模式.md` — [P1] 验证 Windows（MSVC/WebView2）下安装与启动正常 (~581 tok)

## packages/dsh-tauri-bundle/

- `package.json` — Node.js package manifest (~144 tok)

## packages/dsh-tauri-panel-extension/

- `cordis.patch.yml` (~24 tok)
- `package.json` — Node.js package manifest (~574 tok)
- `README.md` — Project documentation (~495 tok)
- `THIRD_PARTY_NOTICES.md` — Third-party notices (~184 tok)
- `tsconfig.json` — TypeScript configuration (~25 tok)
- `tsdown.config.ts` — Client-only libraries must be bundled into the classic loader artifact. The (~148 tok)

## packages/dsh-tauri-panel-extension/docs/

- `upstream-sync-log.md` — 上游同步日志 (~692 tok)

## packages/dsh-tauri-panel-extension/src/

- `index.ts` — dsh-tauri-panel-extension 宿主侧（node half）：能力管理器。 (~296 tok)

## packages/dsh-tauri-panel-extension/src/client/

- `index.ts` — client/index.ts — 扩展面板客户端装配入口。 (~322 tok)

## packages/dsh-tauri-panel-extension/src/client/apis/

- `index.ts` — Exports baseURL, getSkills, postSkillsRefresh, getSkill + 13 more (~880 tok)
- `index.type.ts` — GET /skills、POST /skills/refresh 响应。 (~479 tok)

## packages/dsh-tauri-panel-extension/src/client/components/

- `extension-panel.cssr.ts` — 扩展面板外壳（extension-panel.tsx）：Tabs 布局。 (~378 tok)
- `extension-panel.tsx` — components/extension-panel.tsx — 扩展面板：技能 / MCP 两个 tab 的容器 UI。 (~942 tok)
- `markdown.cssr.ts` — 技能详情 Markdown 预览（markdown.tsx）。 (~362 tok)
- `markdown.tsx` — parseMarkdown — uses useMemo (~209 tok)
- `mcp-editor-form.cssr.ts` — MCP 服务器编辑器（mcp-editor-form.tsx）：编辑器页签 + JSON 编辑区。 (~315 tok)
- `mcp-editor-form.tsx` — components/mcp-editor-form.tsx — MCP 服务器编辑器（json 粘贴 / 表单双 tab）。 (~1727 tok)
- `mcp-import-dialog.cssr.ts` — MCP 批量导入弹窗（mcp-import-dialog.tsx）：分组滚动列表 + 勾选行。 (~301 tok)
- `mcp-import-dialog.tsx` — components/mcp-import-dialog.tsx — MCP 跨目录导入弹窗（按 agent 分组勾选）。 (~1481 tok)
- `mcp-tab.cssr.ts` — MCP 列表（mcp-tab.tsx）：list-head 内的范围筛选下拉。 (~192 tok)
- `mcp-tab.tsx` — components/mcp-tab.tsx — Settings → Plugins “MCP” tab：管理 profile 的 (~4944 tok)
- `skill-creator-prefill.tsx` — components/skill-creator-prefill.tsx — 新会话草稿预填组件。 (~178 tok)
- `skills-tab.cssr.ts` — 技能列表（skills-tab.tsx）：头部 + 横幅 + 刷新。 (~1381 tok)
- `skills-tab.tsx` — components/skills-tab.tsx — Settings → Plugins “Skills” tab：查看/编辑技能、 (~5078 tok)

## packages/dsh-tauri-panel-extension/src/client/config/

- `index.ts` — config/index.ts — 技能创建器的待预填会话集合（模块级单例）。 (~44 tok)

## packages/dsh-tauri-panel-extension/src/client/constants/

- `index.ts` — 宿主私有面板槽：本插件只用它作为「宿主已 apply」的就绪门槛 (~596 tok)

## packages/dsh-tauri-panel-extension/src/client/hooks/

- `use-timers.ts` — hooks/use-timers.ts — 受控定时器集合 + mounted 守卫。 (~307 tok)

## packages/dsh-tauri-panel-extension/src/client/locales/

- `index.ts` — Exports registerExtensionLocale (~2188 tok)

## packages/dsh-tauri-panel-extension/src/client/register/

- `extension-panel.tsx` — register/extension-panel.tsx — 扩展面板的 slot 注册。 (~769 tok)
- `skill-creator-prefill.ts` — register/skill-creator-prefill.ts — 技能创建器草稿预填的 slot 注册。 (~305 tok)

## packages/dsh-tauri-panel-extension/src/client/service/

- `handle-post-mcp-restart.ts` — service/handle-post-mcp-restart.ts — 需要宿主配合的 API 处理：MCP 重启。 (~189 tok)

## packages/dsh-tauri-panel-extension/src/client/styles/

- `index.cssr.ts` — 跨组件通用：卡片列表 / 标签 / 空态文案 / 代码块（技能与 MCP 页共享）。 (~1662 tok)

## packages/dsh-tauri-panel-extension/src/client/types/

- `index.ts` — types/index.ts — 客户端共享类型聚合 barrel。 (~78 tok)
- `mcp.ts` — types/mcp.ts — MCP 服务器管理领域类型（McpTab 相关）。 (~404 tok)
- `protocol.ts` — types/protocol.ts — 扩展面板协议类型（panel.protocol 服务面 + 注入面）。 (~498 tok)
- `runtime.ts` — types/runtime.ts — 宿主运行时快照与桌面桥类型。 (~276 tok)
- `skills.ts` — types/skills.ts — 技能管理领域类型（SkillsTab 相关）。 (~248 tok)

## packages/dsh-tauri-panel-extension/src/client/utils/

- `mcp.ts` — lib/mcp.ts — MCP 导入/解析的纯函数（无 DOM、无 React、无副作用）。 (~1404 tok)
- `skills.ts` — lib/skills.ts — 技能列表展示的纯函数（无 DOM、无 React、无副作用）。 (~250 tok)
- `workspace.ts` — Follow DSH's New Session target order: current session, recent workspace, first workspace. (~301 tok)

## packages/dsh-tauri-panel-extension/src/host/

- `apply.ts` — dsh-tauri-panel-extension host entry: mount the manager's HTTP routes once (~1902 tok)

## packages/dsh-tauri-panel-extension/src/host/constants/

- `index.ts` — host/constants.ts — 宿主侧私有常量（跨 half 协议常量见 shared/constants.ts）。 (~49 tok)

## packages/dsh-tauri-panel-extension/src/host/hooks/

- `index.ts` — host/hooks.ts — 宿主 filesystem skill provider 的生命周期钩子（hookable）。 (~209 tok)

## packages/dsh-tauri-panel-extension/src/host/routes/

- `index.ts` — host/routes/index.ts — HTTP 路由装配：按业务领域把路由分派给 routes/ 下的四个模块 (~515 tok)
- `mcp.ts` — routes/mcp.ts — MCP 服务器行 HTTP 路由（mcp 列表/保存/开关/移除 + 导入扫描/应用）。 (~2870 tok)
- `repositories.ts` — routes/repositories.ts — 自定义技能仓库 HTTP 路由（roots 列表 / 添加 / 移除）。 (~1310 tok)
- `restart.ts` — routes/restart.ts — 独立 `dsh web` 的自重启路由。 (~384 tok)
- `skills.ts` — routes/skills.ts — 技能目录 HTTP 路由（skills / skill 读写 / policy / 打开目录）。 (~4188 tok)

## packages/dsh-tauri-panel-extension/src/host/service/

- `agents.ts` — Foreign-agent config readers: MCP servers from Claude Code (~/.claude.json, (~2140 tok)
- `mcp.ts` — MCP server rows in the profile's own patch layer: one (~5010 tok)
- `opener.ts` — Open a directory in the OS file manager, from the dsh sidecar process. (~362 tok)
- `profile.ts` — Profile discovery (pure reads; same contract as dsh-plugin-install). (~222 tok)
- `repos.ts` — Custom skill repositories the user registers from the Settings page: (~2636 tok)
- `restart.ts` — Self-restart for standalone `dsh web`: relaunch the exact invocation that (~1218 tok)
- `rmtree.ts` — Windows-hardened recursive delete for repository material. The skill (~534 tok)
- `skill-root.ts` — host/service/skill-root.ts — 用户注册的自定义技能仓库领域原语（skills 功能目录）。 (~947 tok)
- `skills.ts` — Skill catalog plumbing: frontmatter serialization for user-root SKILL.md (~1733 tok)
- `tar.ts` — Minimal pure-JS tar.gz extraction (node zlib + a USTAR/GNU/PAX-path (~1755 tok)

## packages/dsh-tauri-panel-extension/src/host/storage/

- `index.ts` — host/storage/index.ts — 扩展面板持久化存储入口（skills 功能目录）。 (~90 tok)

## packages/dsh-tauri-panel-extension/src/host/types/

- `index.ts` — Shared types across the capabilities manager modules. (~695 tok)

## packages/dsh-tauri-panel-extension/src/shared/

- `constants.ts` — shared/constants.ts — 跨 host/client 的稳定协议常量（panel-extension）。 (~96 tok)

## packages/dsh-tauri-panel-placeholder/

- `cordis.patch.yml` (~26 tok)
- `package.json` — Node.js package manifest (~433 tok)
- `README.md` — Project documentation (~162 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-panel-placeholder/src/

- `index.ts` — dsh-tauri-panel-placeholder 宿主侧（node half）：纯浏览器插件，无宿主行为。 (~53 tok)

## packages/dsh-tauri-panel-placeholder/src/client/

- `index.ts` — dsh-tauri-panel-placeholder 客户端插件体（browser half）：panel 协议样板。 (~319 tok)

## packages/dsh-tauri-panel-placeholder/src/client/components/

- `content.tsx` — content.tsx — 自定义内容区（样板视图）：居中占位「自定义内容区」。 (~163 tok)

## packages/dsh-tauri-panel-placeholder/src/client/constants/

- `index.ts` — 宿主私有面板槽：本插件只用它作为「宿主已 apply」的就绪门槛 (~176 tok)

## packages/dsh-tauri-panel-placeholder/src/client/locales/

- `index.ts` — locale.ts — 样板插件的双语文案（placeholder NS）。 (~179 tok)

## packages/dsh-tauri-panel-placeholder/src/client/register/

- `panel.tsx` — register/panel.tsx — 面板条目的槽位注册。 (~458 tok)

## packages/dsh-tauri-panel-placeholder/src/client/styles/

- `index.cssr.ts` — 占位面板内容：居中容器 + 次级文案。 (~128 tok)

## packages/dsh-tauri-panel-placeholder/src/client/types/

- `index.ts` — types/index.ts — 本插件类型（样板插件只用到协议面与 locale bind 扩展）。 (~689 tok)
- `slots.d.ts` — slots.d.ts — 本插件的类型增广（模块文件：含 import，故仅对**可解析**的 (~312 tok)

## packages/dsh-tauri-panel-scheduler/

- `cordis.patch.yml` (~24 tok)
- `package.json` — Node.js package manifest (~602 tok)
- `README.md` — Project documentation (~680 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-panel-scheduler/docs/

- `sync-log.md` — Scheduler 同步日志 (~1301 tok)

## packages/dsh-tauri-panel-scheduler/src/

- `index.ts` — dsh-tauri-panel-scheduler 宿主侧（node half）：定时任务调度器。 (~654 tok)

## packages/dsh-tauri-panel-scheduler/src/client/

- `index.ts` — client/index.ts — 调度器客户端装配入口。 (~397 tok)
- `prefill.ts` — 面板「通过 Chat 创建」交给会话输入框的待填草稿（照搬 dsh-automation prefill.ts）。 (~304 tok)

## packages/dsh-tauri-panel-scheduler/src/client/apis/

- `index.ts` — Exports baseURL, getTasks, postTasksCreate, postTasksUpdate + 7 more (~596 tok)
- `index.type.ts` — GET /tasks 响应。 (~324 tok)

## packages/dsh-tauri-panel-scheduler/src/client/components/

- `menu.cssr.ts` — menu 基础设施（menu.tsx，照搬 dsh-automation menu 样式值）。 (~816 tok)
- `menu.tsx` — components/menu.tsx — 下拉菜单基础设施（照搬 dsh-automation 的 menu.tsx）。 (~2194 tok)
- `model-picker.cssr.ts` — ModelPicker（model-picker.tsx，照搬 dsh-automation create-modal ModelPicker）。 (~1067 tok)
- `model-picker.tsx` — components/model-picker.tsx — 模型选择器（完全照搬 dsh-automation (~2406 tok)
- `prefill-bridge.tsx` — components/prefill-bridge.tsx — 「通过 Chat 创建」草稿预填桥（照搬 dsh-automation (~277 tok)
- `recommendations.cssr.ts` — 推荐（预置）定时任务（recommendations.tsx）。 (~480 tok)
- `recommendations.test.ts` — translations: task (~592 tok)
- `recommendations.tsx` — components/recommendations.tsx — 推荐（预置）定时任务，展示在任务列表下方。 (~1105 tok)
- `runs-tab.cssr.ts` — 执行记录（runs-tab.tsx）：行 + 状态 chip。 (~670 tok)
- `runs-tab.tsx` — components/runs-tab.tsx — 执行记录 tab：按开始时间倒序的 run 列表。 (~578 tok)
- `scheduler-panel.cssr.ts` — 定时任务面板主容器（scheduler-panel.tsx）：外壳 + 搜索 + Tabs。 (~674 tok)
- `scheduler-panel.tsx` — components/scheduler-panel.tsx — 定时任务面板主容器。 (~1846 tok)
- `task-card.cssr.ts` — 任务卡片（task-card.tsx）：名称/计划·下次运行 + 操作菜单。 (~495 tok)
- `task-card.tsx` — components/task-card.tsx — 任务列表卡片：名称 + 计划·下次运行 + [...] 菜单。 (~1826 tok)
- `task-create-dialog.cssr.ts` — 新建/编辑任务对话框（task-create-dialog.tsx）：官方 Modal 加宽。 (~80 tok)
- `task-create-dialog.tsx` — components/task-create-dialog.tsx — 新建任务对话框。 (~4753 tok)

## packages/dsh-tauri-panel-scheduler/src/client/constants/

- `index.ts` — client/constants/index.ts — 客户端共享常量（跨 half 协议常量见 shared/constants.ts）。 (~734 tok)

## packages/dsh-tauri-panel-scheduler/src/client/locales/

- `index.ts` — Exports registerSchedulerLocale (~2377 tok)

## packages/dsh-tauri-panel-scheduler/src/client/register/

- `panel.tsx` — register/panel.tsx — 调度器面板的 slot 注册。 (~662 tok)
- `prefill.ts` — register/prefill.ts — 「通过 Chat 创建」草稿预填桥的 slot 注册。 (~277 tok)
- `session-icons.ts` — register/session-icons.ts — 侧边栏会话行给定时任务会话加时钟图标（DOM 补丁）。 (~1039 tok)

## packages/dsh-tauri-panel-scheduler/src/client/service/

- `scheduler.ts` — service/scheduler.ts — 调度器领域的组合逻辑（刷新代际 / 动作后刷新）。 (~942 tok)

## packages/dsh-tauri-panel-scheduler/src/client/store/

- `index.ts` — store/index.ts — 调度器共享客户端状态（任务列表 + 执行记录 + 对话框选项）。 (~335 tok)

## packages/dsh-tauri-panel-scheduler/src/client/styles/

- `index.cssr.ts` — 跨组件通用的官方控件复刻（input / selectInput / textarea / iconButton / (~1652 tok)

## packages/dsh-tauri-panel-scheduler/src/client/types/

- `index.ts` — client/types/index.ts — 客户端共享类型聚合 barrel。 (~57 tok)
- `protocol.ts` — types/protocol.ts — 面板协议类型（panel.protocol 服务面 + 注入面）。 (~544 tok)
- `scheduler.ts` — types/scheduler.ts — 调度器领域视图类型（客户端投影）。 (~1003 tok)

## packages/dsh-tauri-panel-scheduler/src/client/utils/

- `recommendations.ts` — 判断任务是否由该推荐创建，兼容 recommendationId 引入前的旧任务。 (~338 tok)
- `schedule.ts` — utils/schedule.ts — 计划描述与下次运行时间的展示格式化（纯函数）。 (~727 tok)

## packages/dsh-tauri-panel-scheduler/src/host/

- `apply.ts` — host/apply.ts — 调度器插件装配。 (~615 tok)

## packages/dsh-tauri-panel-scheduler/src/host/constants/

- `index.ts` — host/constants/index.ts — 宿主侧私有常量（跨 half 协议常量见 shared/constants.ts）。 (~182 tok)

## packages/dsh-tauri-panel-scheduler/src/host/hooks/

- `index.ts` — host/hooks/index.ts — 调度器生命周期钩子（hookable）。 (~230 tok)

## packages/dsh-tauri-panel-scheduler/src/host/routes/

- `index.ts` — host/routes/index.ts — 调度器 HTTP 路由（/api/dsh-scheduler/*）。 (~1613 tok)

## packages/dsh-tauri-panel-scheduler/src/host/service/

- `executor.test.ts` — installModelSelection: agent (~1187 tok)
- `executor.ts` — host/service/executor.ts — 定时任务的执行器：新建独立 Agent 会话 + 注入任务指令。 (~4190 tok)
- `options.ts` — host/service/options.ts — 供客户端对话框/下拉使用的选项收集（工作区 / 权限 / 模型目录）。 (~1822 tok)
- `permission-presets.ts` — host/service/permission-presets.ts — Host 官方权限预设服务的最小结构契约。 (~248 tok)
- `run-title.ts` — host/service/run-title.ts — 定时执行 Session 的展示标题。 (~79 tok)
- `run.ts` — host/service/run.ts — 执行记录领域原语（crons 功能目录）。 (~863 tok)
- `schedule.test.ts` — Declares from (~1618 tok)
- `schedule.ts` — Exports parseTimeToMinutes, nextOccurrence, validateSchedule, localTimeZone (~1449 tok)
- `scheduler.ts` — host/service/scheduler.ts — 调度引擎：按计划轮询到期任务并触发执行。 (~1163 tok)
- `state-lock.ts` — host/service/state-lock.ts — 单写者队列：串行化「读整表 → 改 → 写整表」临界区。 (~174 tok)
- `task.ts` — host/service/task.ts — 定时任务领域原语（crons 功能目录）。 (~2109 tok)

## packages/dsh-tauri-panel-scheduler/src/host/storage/

- `index.ts` — host/storage/index.ts — 调度器持久化存储入口（crons 功能目录）。 (~100 tok)

## packages/dsh-tauri-panel-scheduler/src/host/tools/

- `index.ts` — host/tools/index.ts — Agent 自发调用的定时任务工具集。 (~2242 tok)

## packages/dsh-tauri-panel-scheduler/src/host/types/

- `index.ts` — host/types/index.ts — 调度器宿主侧类型。 (~1408 tok)

## packages/dsh-tauri-panel-scheduler/src/shared/

- `constants.ts` — shared/constants.ts — 跨 host/client 的稳定协议常量（dsh-tauri-panel-scheduler）。 (~235 tok)

## packages/dsh-tauri-panel-scheduler/src/types/

- `dsh.d.ts` — Host 运行时由 DSH 提供的最小编译期声明（对齐 MichengAI/dsh-automation 的 src/types/dsh.d.ts）。 (~1344 tok)

## packages/dsh-tauri-panel/

- `cordis.patch.yml` (~19 tok)
- `package.json` — Node.js package manifest (~446 tok)
- `PROTOCOL.md` — dsh-tauri-panel 协议 (~2715 tok)
- `README.md` — Project documentation (~562 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-panel/src/

- `index.ts` — dsh-tauri-panel 宿主侧（node half）：纯浏览器插件，无宿主行为。 (~50 tok)

## packages/dsh-tauri-panel/src/client/

- `index.ts` — dsh-tauri-panel 客户端插件体（browser half）：工作区上方面板 UI。 (~701 tok)

## packages/dsh-tauri-panel/src/client/components/

- `action-item.cssr.ts` — 面板区条目（action-item.tsx）：菜单行 + 选中态。 (~405 tok)
- `action-item.tsx` — components/action-item.tsx — 面板区条目（样式/折叠/active 态全宿主， (~304 tok)
- `conversation-seat.cssr.ts` — 会话区替换视图（conversation-seat.tsx）：内容列居中。 (~279 tok)
- `conversation-seat.tsx` — components/conversation-seat.tsx — conversation 槽条目：包标记容器 (~508 tok)
- `panel-row.tsx` — components/panel-row.tsx — 官方全局面板（`sidebar.panellist`）的单行入口。 (~631 tok)
- `sidebar.cssr.test.ts` — dsh-tauri-ui/client 的 dist bundle 以 `window.__ModuleLoader__.load(...)` 包裹， (~625 tok)
- `sidebar.cssr.ts` — 侧栏整槽克隆（sidebar.tsx）：root + logo 行 + 面板区 + 官方子槽透传 + 折叠态。 (~1961 tok)
- `sidebar.tsx` — components/sidebar.tsx — sidebar 槽整槽替换的克隆组件（priority -1 shadow 官方 (~2380 tok)

## packages/dsh-tauri-panel/src/client/constants/

- `index.ts` — Stable client-side identifiers shared by the panel implementation. (~1214 tok)
- `width.ts` — constants/width.ts — 面板内容区宽度拖拽契约（方案 A，镜像 alpha (~364 tok)

## packages/dsh-tauri-panel/src/client/dom/

- `panel.ts` — dom.ts — 面板的 DOM 逻辑（无 JSX）：侧栏导航判定 + 激活态投影。 (~454 tok)

## packages/dsh-tauri-panel/src/client/hooks/

- `panel.ts` — hooks/panel.ts — 面板协议相关 React hooks。 (~99 tok)

## packages/dsh-tauri-panel/src/client/locales/

- `index.ts` — locale.ts — 本插件文案（zh/en 双语）。命名空间 `panel`： (~272 tok)

## packages/dsh-tauri-panel/src/client/register/

- `panel-service.tsx` — register/panel-service.tsx — 面板协议宿主服务装配（panel.protocol）。 (~1700 tok)
- `sidebar.ts` — register/sidebar.ts — sidebar 槽整槽替换的安装器（priority -1 shadow 官方 (~606 tok)

## packages/dsh-tauri-panel/src/client/service/

- `controller.test.ts` — controller.test.ts — 面板内容控制器的槽位注册回归。 (~2185 tok)
- `controller.tsx` — service/controller.tsx — 会话区替换控制器：拥有 inject 句柄、当前规格与 (~1592 tok)
- `panel-list.test.ts` — panel-list.test.ts — 官方 `sidebar.panellist` 行投影服务。 (~1500 tok)
- `panel-list.ts` — service/panel-list.ts — 官方 `sidebar.panellist` 的行投影服务。 (~931 tok)
- `width.ts` — service/width.ts — 面板内容区宽度同步（方案 A 的机制侧，镜像 alpha (~931 tok)

## packages/dsh-tauri-panel/src/client/store/

- `index.ts` — store.ts — 面板协议的状态层：会话区替换状态（ActionItem active 样式订阅源）。 (~83 tok)

## packages/dsh-tauri-panel/src/client/styles/

- `index.cssr.ts` — 跨组件通用的「分区标题行」（侧栏 ActionItem 区域标题，折叠时隐藏）。 (~281 tok)

## packages/dsh-tauri-panel/src/client/types/

- `index.ts` — 官方全局面板的选中态快照（layout 的 `panelInfo` root hook 投影）。 (~1430 tok)

## packages/dsh-tauri-panel/src/client/utils/

- `official-panels.ts` — utils/official-panels.ts — 官方全局面板（`main` + `ctx.layout.selectPanel`）的 (~344 tok)
- `width.test.ts` — utils/width.test.ts — 宽度纯函数单测（resolveContentWidth / readWidthPreference / (~786 tok)
- `width.ts` — utils/width.ts — 面板内容区宽度拖拽的纯函数（方案 A）。镜像 alpha (~612 tok)

## packages/dsh-tauri-pet/

- `cordis.patch.yml` (~100 tok)
- `package.json` — Node.js package manifest (~586 tok)
- `README.md` — Project documentation (~790 tok)
- `THIRD_PARTY_NOTICES.md` — Third-party asset notices (~411 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-pet/docs/

- `sync-log.md` — dsh-tauri-pet 上游同步日志 (~3899 tok)

## packages/dsh-tauri-pet/src/

- `index.test.ts` — src/index.test.ts — 宿主装配 apply() 的性能约定回归。 (~2071 tok)
- `index.ts` — src/index.ts — dsh-tauri-pet 宿主侧（node half）。 (~2712 tok)

## packages/dsh-tauri-pet/src/client/

- `index.ts` — client/index.ts — dsh-tauri-pet 客户端插件体（browser half）：侧栏入口 + 设置分区。 (~414 tok)

## packages/dsh-tauri-pet/src/client/components/

- `pet-settings.cssr.ts` — styles/index.ts — 桌宠侧栏入口 + 设置分区样式（css-render，apply() effect 内 mount）。 (~2242 tok)
- `pet-settings.tsx` — 模块级清单缓存：跨组件挂载复用，避免反复打开设置页闪烁（初次仍显示加载占位）。 (~3875 tok)
- `prefill.tsx` — PetPrefill — uses useEffect (~132 tok)

## packages/dsh-tauri-pet/src/client/config/

- `index.ts` — Pending session drafts keyed by session id; consumed by conversation.input.left. (~42 tok)

## packages/dsh-tauri-pet/src/client/constants/

- `index.ts` — Stable client protocol identifiers and shared UI defaults for dsh-tauri-pet. (~487 tok)

## packages/dsh-tauri-pet/src/client/dom/

- `sidebar-icon.ts` — dom/sidebar-icon.ts — 侧栏「桌宠入口」DOM 补丁。 (~1882 tok)

## packages/dsh-tauri-pet/src/client/locales/

- `index.ts` — Bilingual copy for the pet settings section. (~785 tok)

## packages/dsh-tauri-pet/src/client/register/

- `pet.ts` — Resolve the workspace and connector needed for standard session creation. (~914 tok)

## packages/dsh-tauri-pet/src/client/service/

- `pet.ts` — 启用/关闭桌宠（持久化：关闭后重启不再自动拉起）。 (~406 tok)

## packages/dsh-tauri-pet/src/client/store/

- `index.ts` — store/index.ts — 桌宠状态缓存的轻量共享状态。 (~430 tok)

## packages/dsh-tauri-pet/src/client/styles/

- `index.cssr.ts` — styles/index.ts — 桌宠侧栏入口 + 设置分区样式（css-render，apply() effect 内 mount）。 (~859 tok)

## packages/dsh-tauri-pet/src/client/types/

- `index.ts` — Shared client types for pet settings and raw session forwarding. (~568 tok)

## packages/dsh-tauri-pet/src/client/utils/

- `workspace.ts` — Follow the standard new-session target order: current, recent, then first workspace. (~293 tok)

## packages/dsh-tauri-pet/src/host/

- `reducer.test.ts` — src/host/reducer.test.ts — reducer（会话增量 → 桌宠展示态）单测。 (~4777 tok)
- `reducer.ts` — src/host/reducer.ts — dsh-tauri-pet 宿主侧「会话增量 → 桌宠展示态」reducer。 (~6867 tok)

## packages/dsh-tauri-rightclick/

- `cordis.patch.yml` (~22 tok)
- `package.json` — Node.js package manifest (~494 tok)
- `README.md` — Project documentation (~638 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-rightclick/src/

- `constants.ts` — Host-half protocol constants for dsh-tauri-rightclick. (~137 tok)
- `index.ts` — dsh-tauri-rightclick 宿主侧（node half）：系统浏览器开链 + 文件管理器打开目录。 (~1334 tok)
- `types.ts` — Host-half shared types for dsh-tauri-rightclick. (~168 tok)

## packages/dsh-tauri-rightclick/src/client/

- `index.ts` — dsh-tauri-rightclick 客户端插件体（browser half）：原生风格的完整右键菜单。 (~392 tok)

## packages/dsh-tauri-rightclick/src/client/apis/

- `index.ts` — Exports postOpenUrl, postOpenPath (~147 tok)
- `index.type.ts` — 宿主动作路由的统一结果体（200 时宿主返回；error 字段为宿主侧诊断文案）。 (~79 tok)

## packages/dsh-tauri-rightclick/src/client/components/

- `confirm-dialog.ts` — confirm-dialog.ts — 客户端样式确认弹窗（primitives Modal），替代原生 confirm。 (~473 tok)

## packages/dsh-tauri-rightclick/src/client/constants/

- `index.ts` — Shared protocol and UI constants for the dsh-tauri-rightclick client plugin. (~469 tok)

## packages/dsh-tauri-rightclick/src/client/dom/

- `locate.ts` — locate.ts — 从右键目标定位「会话行 / 工作区行」及官方操作按钮的 DOM 解析。 (~2067 tok)
- `menu-item.ts` — dom/menu-item.ts — 右键菜单的纯 DOM 构建：菜单根 / 菜单项 / 分隔线 / 视口内定位。 (~655 tok)

## packages/dsh-tauri-rightclick/src/client/locales/

- `index.ts` — locales/index.ts — 本插件自有文案（右键菜单 / Toast / 确认框 / 错误提示）。 (~1869 tok)

## packages/dsh-tauri-rightclick/src/client/service/

- `actions.test.ts` — Declares postOpenPathMock (~301 tok)
- `actions.ts` — actions.ts — 菜单项对应的业务动作：官方操作转交官方组件；插件自有能力 (~1977 tok)
- `menu.ts` — menu.ts — 右键菜单控制器：按目标（会话行 / 工作区行 / 可编辑元素 / 选中文本 / (~2800 tok)
- `open-path.ts` — 资源管理器打开目录：走插件自家宿主路由（POST /api/dsh-rightclick-menu/open-path， (~152 tok)
- `registry.ts` — registry.ts — 全局扩展注册表：其他 Web 插件经 (~588 tok)

## packages/dsh-tauri-rightclick/src/client/styles/

- `index.cssr.ts` — 右键菜单与动作反馈 toast（DOM 补丁样式，无 React 组件面）。 (~515 tok)

## packages/dsh-tauri-rightclick/src/client/types/

- `index.ts` — types/index.ts — 客户端共享类型聚合 barrel。 (~57 tok)
- `locale.ts` — locale.ts — 本插件文案键（zh 字典键集合为权威）。 (~478 tok)
- `runtime.ts` — client/types/runtime.ts — 右键菜单的运行时面与官方 controller 投影。 (~656 tok)

## packages/dsh-tauri-rightclick/src/client/utils/

- `clipboard.ts` — clipboard.ts — 剪贴板读写（Clipboard API 优先，回退 execCommand 复制）。 (~387 tok)
- `dialog.ts` — dialog.ts — lightweight toast notifications for context-menu actions. (~131 tok)
- `editable.test.ts` — editable.test.ts — editable.ts 粘贴/选区工具的 DOM 逻辑单测。 (~1820 tok)
- `editable.ts` — utils/editable.ts — 可编辑元素 / 内容面的选区操作（纯 DOM 逻辑，可独立测试）。 (~1117 tok)

## packages/dsh-tauri-session/

- `cordis.patch.yml` (~20 tok)
- `package.json` — Node.js package manifest (~457 tok)
- `README.md` — Project documentation (~740 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-session/src/

- `index.ts` — dsh-tauri-session 宿主侧（node half）：「已归档聊天」的管理接口。 (~546 tok)

## packages/dsh-tauri-session/src/client/

- `index.ts` — client/index.ts — 归档管理客户端装配入口。 (~344 tok)

## packages/dsh-tauri-session/src/client/apis/

- `index.ts` — Exports baseURL, getArchived, postOpenSessionDir, postArchive + 5 more (~509 tok)
- `index.type.ts` — GET /archived 响应：归档会话 id 集 + 创建元数据。 (~285 tok)

## packages/dsh-tauri-session/src/client/components/

- `archive-panel.cssr.ts` — Archive page styles generated as css-render nodes. (~2090 tok)
- `archive-panel.tsx` — archive-panel.tsx — 设置页「归档」分区内容（已归档的聊天）。 (~3693 tok)

## packages/dsh-tauri-session/src/client/constants/

- `index.ts` — Shared protocol and UI constants for the dsh-tauri-session client plugin. (~509 tok)

## packages/dsh-tauri-session/src/client/dom/

- `workspace-patch.ts` — workspace-patch.ts — 在官方工作区浏览器里为「删除工作区」补一个「归档工作区」。 (~3904 tok)

## packages/dsh-tauri-session/src/client/locales/

- `index.ts` — client/locales/index.ts — 本插件自有文案（归档设置页 / 归档工作区按钮）。 (~1322 tok)

## packages/dsh-tauri-session/src/client/register/

- `archive-section.ts` — register/archive-section.ts — 设置页「归档」分区的 slot 注册。 (~307 tok)

## packages/dsh-tauri-session/src/client/service/

- `archive.ts` — service/archive.ts — 归档领域的组合逻辑（并发代际 / 变更后 resync / 结果判定）。 (~1228 tok)

## packages/dsh-tauri-session/src/client/store/

- `index.ts` — store.ts — 归档页面的共享客户端状态（archived 载荷 + 页面筛选状态）。 (~387 tok)

## packages/dsh-tauri-session/src/client/types/

- `archive.ts` — types/archive.ts — 归档页领域类型（载荷 / 行 / 排序 / UI 状态 / 组件 props）。 (~470 tok)
- `index.ts` — client/types.ts — 客户端共享类型聚合 barrel。 (~67 tok)
- `locale.ts` — types/locale.ts — 归档插件文案键集合（zh 字典键权威）。 (~266 tok)
- `runtime.ts` — types/runtime.ts — 宿主运行时快照类型（ctx.sessions / ctx.workspaces 投影）。共享面见 dsh-tauri/client。 (~75 tok)

## packages/dsh-tauri-session/src/client/utils/

- `archive-rows.ts` — client/utils/archive-rows.ts — 归档列表的纯函数：行构建 / 去重 / 标题与时间格式化。 (~880 tok)
- `sort.ts` — archive-sort.ts — 归档列表的分组与排序纯函数。 (~832 tok)

## packages/dsh-tauri-session/src/host/

- `apply.ts` — host/apply.ts — 归档插件装配：旧版归档迁移 + HTTP 路由注册。 (~298 tok)

## packages/dsh-tauri-session/src/host/constants/

- `index.ts` — host/constants.ts — 宿主侧私有常量（跨 half 协议常量见 shared/constants.ts）。 (~70 tok)

## packages/dsh-tauri-session/src/host/hooks/

- `index.ts` — host/hooks.ts — 归档状态变更钩子（hookable）。 (~186 tok)

## packages/dsh-tauri-session/src/host/routes/

- `index.ts` — route.ts — 归档管理 HTTP 路由（/api/dsh-session/*）：archived / open-path / (~852 tok)

## packages/dsh-tauri-session/src/host/service/

- `archive.ts` — archive.ts — 归档业务域：读取归档列表、归档/取消归档、旧版 v1 归档迁移， (~2268 tok)
- `registry.ts` — registry.ts — 宿主归档集合的状态机面。 (~1816 tok)
- `session-files.test.ts` — Declares makeSessionDir (~796 tok)
- `session-files.ts` — session-files.ts — 会话定位与持久化文件域：从 ctx 找会话对象、读其 cwd， (~1355 tok)

## packages/dsh-tauri-session/src/host/storage/

- `index.ts` — host/storage.ts — 旧版（v1）自持归档的持久化（新机制由宿主 WorkspaceRegistry (~114 tok)

## packages/dsh-tauri-session/src/host/types/

- `index.ts` — 旧版自持归档的根目录（v1 迁移用；默认 `~/.dsh`）。 (~444 tok)

## packages/dsh-tauri-session/src/shared/

- `constants.ts` — shared/constants.ts — 跨 host/client 的稳定协议常量（session 归档管理）。 (~98 tok)

## packages/dsh-tauri-tsdown/

- `package.json` — Node.js package manifest (~89 tok)
- `README.md` — Project documentation (~71 tok)

## packages/dsh-tauri-tsdown/src/

- `index.ts` — tsdown 单条构建配置（宽松面；运行时由 tsdown 校验）。 (~1302 tok)

## packages/dsh-tauri-turnrewind/

- `cordis.patch.yml` (~22 tok)
- `package.json` — Node.js package manifest (~497 tok)
- `README.md` — Project documentation (~2970 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-turnrewind/src/

- `index.ts` — dsh-tauri-turnrewind 宿主侧（node half）：turn 级工作区快照与一键撤销。 (~775 tok)

## packages/dsh-tauri-turnrewind/src/client/

- `index.ts` — dsh-tauri-turnrewind 客户端插件体（browser half）：turn 级变更卡片与一键撤销。 (~668 tok)

## packages/dsh-tauri-turnrewind/src/client/apis/

- `index.ts` — client/apis/index.ts — 客户端 HTTP 面（同源 fetch，唯一入口 dsh-tauri/client 的 fetch）。 (~346 tok)
- `index.type.ts` — client/apis/index.type.ts — 客户端 RPC 的请求/响应类型。 (~71 tok)

## packages/dsh-tauri-turnrewind/src/client/capabilities/

- `index.test.ts` — client/capabilities/index.test.ts — 「打开文件」与「审核」的内核能力判据。 (~1222 tok)
- `index.ts` — client/capabilities/index.ts — 运行时能力探测（跨内核代，不做版本嗅探）。 (~812 tok)

## packages/dsh-tauri-turnrewind/src/client/components/

- `change-counts.tsx` — 计数组件 props：二进制差异用文案代替行数。 (~253 tok)
- `running-changes-chip.cssr.test.ts` — Declares mod (~386 tok)
- `running-changes-chip.cssr.ts` — 运行中提示条（running-changes-chip.tsx）：输入框正上方居中的胶囊 (~280 tok)
- `running-changes-chip.tsx` — running-changes-chip.tsx — 会话运行中的实时变更提示条。 (~537 tok)
- `turn-changes-card.cssr.test.ts` — dsh-tauri-ui/client 的 dist bundle 以 `window.__ModuleLoader__.load(...)` 包裹， (~1108 tok)
- `turn-changes-card.cssr.ts` — 变更卡片（turn-changes-card.tsx）——按官方 deliverables 行的视觉重做： (~2112 tok)
- `turn-changes-card.tsx` — turn-changes-card.tsx — 一轮结束时渲染的变更卡片（视觉对齐官方 deliverables 行）。 (~3821 tok)

## packages/dsh-tauri-turnrewind/src/client/constants/

- `index.ts` — client/constants/index.ts — 客户端共享常量（跨 half 协议常量见 shared/constants.ts）。 (~1065 tok)

## packages/dsh-tauri-turnrewind/src/client/hooks/

- `use-live-changes.ts` — 一次读数属于哪个会话的哪次订阅。 (~665 tok)

## packages/dsh-tauri-turnrewind/src/client/locales/

- `index.ts` — client/locales/index.ts — 本插件界面文案（zh / en 双语）。 (~1266 tok)

## packages/dsh-tauri-turnrewind/src/client/register/

- `running-chip.ts` — register/running-chip.ts — 把「运行中」提示条注册进 `conversation.input.dock`。 (~365 tok)
- `turn-tail.ts` — register/turn-tail.ts — 把变更卡片注册进 `conversation.chat.turnTail`。 (~435 tok)

## packages/dsh-tauri-turnrewind/src/client/store/

- `index.ts` — client/store/index.ts — 每会话摘要缓存 + 撤销动作（模块级 SnapshotStore + uSES 桥）。 (~1232 tok)

## packages/dsh-tauri-turnrewind/src/client/styles/

- `counts.cssr.ts` — 变更计数（绿色 +N / 红色 -M）的共享样式。 (~189 tok)

## packages/dsh-tauri-turnrewind/src/client/types/

- `index.ts` — client/types/index.ts — 客户端共享类型（宿主协议投影 + 卡片状态 + 组件 props）。 (~1109 tok)

## packages/dsh-tauri-turnrewind/src/client/utils/

- `format.test.ts` — turnSummary: summary (~2486 tok)
- `format.ts` — client/utils/format.ts — 纯函数：计数文本、文件名、卡片状态判定、文件清单裁剪。 (~1569 tok)
- `open-file.test.ts` — client/utils/open-file.test.ts — 「点击文件打开」的决策与静默边界。 (~588 tok)
- `open-file.ts` — client/utils/open-file.ts — 「点击文件打开」的纯决策 + 受保护的调用。 (~373 tok)
- `review.test.ts` — client/utils/review.test.ts — 「审核」按钮的决策与静默边界。 (~645 tok)
- `review.ts` — client/utils/review.ts — 「审核」按钮的纯决策 + 受保护的调用。 (~440 tok)

## packages/dsh-tauri-turnrewind/src/host/

- `apply.ts` — host/apply.ts — turnrewind 插件装配（turn 生命周期接线 + HTTP 路由）。 (~1178 tok)

## packages/dsh-tauri-turnrewind/src/host/constants/

- `index.ts` — host/constants/index.ts — 宿主侧私有常量。 (~992 tok)

## packages/dsh-tauri-turnrewind/src/host/hooks/

- `index.ts` — host/hooks/index.ts — turnrewind 生命周期钩子（hookable）。 (~182 tok)

## packages/dsh-tauri-turnrewind/src/host/routes/

- `index.ts` — host/routes/index.ts — turnrewind HTTP 路由（客户端 UI 唯一的数据面）。 (~1770 tok)

## packages/dsh-tauri-turnrewind/src/host/service/

- `capture.test.ts` — 本次用例建过的捕获编排器（收尾要卸载，否则实时轮询会一直持有临时目录）。 (~3858 tok)
- `capture.ts` — host/service/capture.ts — turn 生命周期编排：before 快照 → after 快照 → 差异 → 账本。 (~5493 tok)
- `git.test.ts` — run: tempRepo (~589 tok)
- `git.ts` — host/service/git.ts — git 子进程封装。 (~1141 tok)
- `ledger.test.ts` — temporaryDirectories: tempHome, record (~1659 tok)
- `ledger.ts` — host/service/ledger.ts — 每会话 JSON 账本（原子写 + 进程内串行）。 (~2323 tok)
- `paths.test.ts` — 建一个指向工作区外部的目录链接（Windows 用 junction，无需开发者模式）。 (~1032 tok)
- `paths.ts` — host/service/paths.ts — 恢复路径的安全解析与删除。 (~830 tok)
- `queue.test.ts` — host/service/queue.test.ts — 工作区级串行队列。 (~880 tok)
- `queue.ts` — host/service/queue.ts — 工作区级 FIFO 串行。 (~362 tok)
- `retention.test.ts` — 造出两个「值得排除」的对象：超限文件 + 嵌套仓库。 (~1936 tok)
- `retention.ts` — host/service/retention.ts — 私有快照仓的容量治理与排除清单。 (~1667 tok)
- `snapshot.test.ts` — API routes: GET (3 endpoints) (~6600 tok)
- `snapshot.ts` — host/service/snapshot.ts — 每个工作区一个**私有 Git 快照仓**的捕获 / 差异 / 恢复引擎。 (~8200 tok)
- `undo.test.ts` — 撤销与捕获共用同一工作区队列；本文件的用例只需一个实例。 (~2580 tok)
- `undo.ts` — host/service/undo.ts — 撤销一个 turn 的工作区改动。 (~1186 tok)
- `workspace.test.ts` — run: tempRoot, initRepo (~978 tok)
- `workspace.ts` — host/service/workspace.ts — 会话工作区解析、规范化与资格守卫。 (~1793 tok)

## packages/dsh-tauri-turnrewind/src/host/types/

- `index.ts` — host/types/index.ts — 宿主侧共享类型。 (~1296 tok)

## packages/dsh-tauri-turnrewind/src/shared/

- `constants.ts` — shared/constants.ts — 跨 host/client 的稳定协议常量。 (~374 tok)

## packages/dsh-tauri-ui/

- `cordis.patch.yml` (~17 tok)
- `package.json` — Node.js package manifest (~511 tok)
- `README.md` — Project documentation (~153 tok)
- `tsdown.config.ts` (~39 tok)

## packages/dsh-tauri-ui/src/

- `index.ts` — dsh-tauri-ui 宿主侧（node half）：纯浏览器插件，无宿主行为。 (~49 tok)

## packages/dsh-tauri-ui/src/client/

- `index.ts` — dsh-tauri-ui 客户端插件体（browser half）：定制化 Tauri UI 的未来载体。 (~1217 tok)
- `theme.ts` — Shared design values extracted from the dsh web-frontend design tokens. (~495 tok)

## packages/dsh-tauri-ui/src/client/components/

- `icon.tsx` — Common props for a Gravity or primitives SVG component. (~200 tok)
- `icons.tsx` — Gravity UI icon barrel. (~555 tok)
- `index.ts` (~178 tok)
- `menu-select.cssr.ts` — 共享 MenuSelect 触发按钮（default 36px 胶囊；pill 28px 浅触发）。 (~366 tok)
- `menu-select.tsx` — Shared official-style select pattern: a button anchored to the primitives (~563 tok)
- `nav-icon.cssr.ts` — 设置导航行图标（官方 primitives 图标的外层对齐）。 (~48 tok)
- `nav-icon.tsx` — nav-icon.tsx — 设置导航行的分区图标。 (~351 tok)
- `seat.ts` — `shell.overlay` 条目组件（骨架占位）：定制化 Tauri UI 的渲染落点。 (~128 tok)
- `sidebar.cssr.ts` — 设置侧边栏：整窗 docked 左栏 + 内容区。 (~1009 tok)
- `sidebar.tsx` — sidebar.tsx — shell.overlay 里的设置侧边栏（id 'dsh-tauri-ui-settings'）。 (~1776 tok)
- `special-icons.tsx` — Brand fallback; Gravity UI has no equivalent for this mark. (~894 tok)
- `trigger.cssr.ts` — 设置触发按钮（sidebar.settings shadow 官方齿轮；rail 为窄栏圆钮）。 (~246 tok)
- `trigger.tsx` — trigger.tsx — sidebar.settings 座位的新“赢家”（priority -1）。 (~852 tok)

## packages/dsh-tauri-ui/src/client/constants/

- `index.ts` — Shared protocol and UI constants for the dsh-tauri-ui client plugin. (~576 tok)

## packages/dsh-tauri-ui/src/client/dom/

- `settings-obstructions.ts` — Finds host surfaces that could remain above or show through the settings overlay. (~1188 tok)

## packages/dsh-tauri-ui/src/client/hooks/

- `sections.ts` — hooks/sections.ts — 设置分区/引导步骤的注册表投影（只读 hooks 半区）。 (~720 tok)
- `use-rail-drag.ts` — hooks/use-rail-drag.ts — 左栏宽度拖拽交互（pointer capture + rAF 节流）。 (~484 tok)

## packages/dsh-tauri-ui/src/client/locales/

- `index.ts` — locale.ts — 本插件自有的界面文案（返回应用 / 搜索设置… / 设置）。 (~470 tok)

## packages/dsh-tauri-ui/src/client/register/

- `sections.ts` — register/sections.ts — 'settings.section' / 'settings.onboarding' 投影的 (~272 tok)
- `sidebar.ts` — register/sidebar.ts — shell.overlay 设置侧边栏条目注册。 (~234 tok)
- `trigger.ts` — register/trigger.ts — sidebar.settings 触发条目注册（priority -1 shadow 官方）。 (~226 tok)

## packages/dsh-tauri-ui/src/client/store/

- `index.ts` — store.ts — dsh-tauri-ui 设置侧边栏的共享 UI 状态。 (~591 tok)

## packages/dsh-tauri-ui/src/client/styles/

- `global.cssr.ts` — 全局样式（挂载于 `apply`：`mountStyle(globalStyle, 'dsh-tauri-ui-global-styles')`）。 (~350 tok)
- `index.cssr.ts` — 轮次导航窄栏常驻（纯样式，无组件面）。 (~271 tok)

## packages/dsh-tauri-ui/src/client/types/

- `index.ts` — Selector hook shape shared by standard slot props. (~575 tok)

## packages/dsh-tauri-ui/src/client/utils/

- `cssr.ts` — workspace 统一 css-render 实例与 bem 助手。 (~169 tok)
- `style.ts` — 命令式挂载 css-render 节点；返回卸载 disposer。 (~353 tok)

## packages/dsh-tauri-worktree/

- `cordis.patch.yml` (~20 tok)
- `package.json` — Node.js package manifest (~453 tok)
- `README.md` — Project documentation (~1476 tok)
- `tsdown.config.ts` (~29 tok)

## packages/dsh-tauri-worktree/src/

- `index.ts` — dsh-tauri-worktree 宿主侧（node half）：会话级 Git Worktree 隔离。 (~636 tok)

## packages/dsh-tauri-worktree/src/client/

- `index.ts` — dsh-tauri-worktree 客户端插件体（browser half）：会话级 Git Worktree 隔离的 UI。 (~792 tok)

## packages/dsh-tauri-worktree/src/client/apis/

- `index.ts` — Exports baseURL, getBindings, getStatus, postCreate + 3 more (~418 tok)
- `index.type.ts` — GET /status 查询参数。 (~222 tok)

## packages/dsh-tauri-worktree/src/client/components/

- `dialog.cssr.ts` — 检出/放弃工作树弹窗（dialog.tsx）：遮罩 + 卡片表单。 (~813 tok)
- `dialog.tsx` — dialog.tsx — 检出本地 / 放弃更改 两个模态框（shell.overlay 条目）。 (~2674 tok)
- `mode-select.cssr.ts` — 会话工作模式选择器（mode-select.tsx）：trigger + host 定位。 (~538 tok)
- `mode-select.tsx` — mode-select.tsx — 「标准模式」右侧的会话工作模式选择器。 (~2760 tok)
- `surface.cssr.ts` — 工作树状态条（surface.tsx）：会话下方状态条 + 折叠日志。 (~638 tok)
- `surface.tsx` — surface.tsx — 聊天框正上方、仅会话内容区内的工作树状态条。 (~892 tok)

## packages/dsh-tauri-worktree/src/client/constants/

- `index.ts` — client/constants.ts — 客户端共享常量（跨 half 协议常量见 shared/constants.ts）。 (~1060 tok)

## packages/dsh-tauri-worktree/src/client/locales/

- `index.ts` — locale.ts — 本插件自有的界面文案（模式选择 / Surface 提示 / 检出 / 放弃 / 处理状态）。 (~1104 tok)

## packages/dsh-tauri-worktree/src/client/register/

- `dialog.ts` — register/dialog.ts — 检出本地 / 放弃更改 两个模态框的 slot 注册。 (~427 tok)
- `hydration.test.ts` — hydration.test.ts — registerWorktreeHydration 的请求量回归测试。 (~5015 tok)
- `hydration.ts` — hydration.ts — 从 Host ledger 恢复所有已知会话的工作树状态。 (~4958 tok)
- `mode-select.ts` — register/mode-select.ts — 「标准模式」右侧工作模式选择器的 slot 注册。 (~420 tok)
- `session-icons.ts` — register/session-icons.ts — 会话列表里给绑定工作树的会话行加 Git 分支图标（DOM 补丁）。 (~1021 tok)
- `surface.ts` — register/surface.ts — 工作树状态条（input.dock 上方的 surface）的 slot 注册。 (~202 tok)

## packages/dsh-tauri-worktree/src/client/service/

- `actions.ts` — service/actions.ts — 工作树变更动作（检出 / 放弃），含 job 轮询与乐观状态。 (~1690 tok)
- `handoff.ts` — 等待新工作树会话在客户端列表中稳定后再打开，并确认 selection 已实际切换。 (~582 tok)

## packages/dsh-tauri-worktree/src/client/store/

- `index.ts` — store/index.ts — dsh-tauri-worktree 的共享客户端状态（per-session 工作树状态 + 偏好）。 (~970 tok)

## packages/dsh-tauri-worktree/src/client/styles/

- `index.cssr.ts` — 侧边栏会话行 Git 分支图标补丁样式（配合 register/session-icons.ts 的 DOM 观察器）。 (~147 tok)

## packages/dsh-tauri-worktree/src/client/types/

- `index.ts` — types.ts — 客户端共享类型聚合 barrel。 (~65 tok)
- `locale.ts` — types/locale.ts — 工作树插件文案键集合（zh 字典键权威）。 (~216 tok)

## packages/dsh-tauri/

- `cordis.patch.yml` (~15 tok)
- `package.json` — Node.js package manifest (~502 tok)
- `README.md` — Project documentation (~88 tok)
- `tsdown.config.ts` (~85 tok)

## packages/dsh-tauri/src/

- `index.ts` — dsh-tauri 宿主侧（node half）：共享 HTTP 路由工具 / 系统打开 / 原子文件存储。 (~335 tok)

## packages/dsh-tauri/src/client/

- `apply.ts` — client/apply.ts — dsh-tauri 客户端插件体（browser half）：纯消息桥，无 UI、无运行时依赖。 (~736 tok)
- `index.ts` — dsh-tauri 客户端 barrel（browser half）：插件入口 + 全 workspace 客户端共享工具。 (~544 tok)

## packages/dsh-tauri/src/client/apis/

- `client.test.ts` — Declares chunks (~663 tok)
- `index.ts` — apis/index.ts — 客户端 RPC/HTTP 层：全局 fetch（ofetch 统一 JSON 客户端）。 (~336 tok)

## packages/dsh-tauri/src/client/constants/

- `index.ts` — iframe → 宿主：invoke 请求的 source。 (~701 tok)

## packages/dsh-tauri/src/client/controller/

- `index.ts` — client/controller.ts — 基于 hookable 的生命周期控制器（全 workspace 客户端共享）。 (~1087 tok)

## packages/dsh-tauri/src/client/hooks/

- `use-invoke.ts` — command 成功返回值；未完成/失败时为 null。 (~595 tok)
- `use-listen-parent.ts` — 「监听主窗口消息」的过滤条件：省略表示监听全部消息。 (~311 tok)
- `use-listen.ts` — 订阅一个「宿主转发进 iframe 的 Tauri 事件」，卸载时自动注销。 (~353 tok)

## packages/dsh-tauri/src/client/register/

- `sidebar.ts` — register/sidebar.ts — 侧边栏（宿主顶部导航栏 ↔ iframe），两个方向各一件事： (~681 tok)
- `zoom-shortcut.ts` — register/zoom-shortcut.ts — iframe 内的缩放快捷键（Ctrl/Cmd + `+` / `-` / `0`）。 (~303 tok)

## packages/dsh-tauri/src/client/service/

- `invoke-parent.ts` — 发送结果：`ok=false` 表示未送达（没有宿主 / payload 不可结构化克隆）。 (~285 tok)
- `invoke.test.ts` — 构造一个最小的 window 替身：parent 作为宿主接收 postMessage，按类型独立收集 (~1167 tok)
- `invoke.ts` — dsh-tauri invoke 桥（iframe 侧客户端）。 (~928 tok)
- `listen-parent.ts` — 监听主窗口（宿主）发来的消息 —— iframe 侧**收消息的唯一入口**。 (~375 tok)
- `listen.ts` — 订阅一个「宿主转发进 iframe 的 Tauri 事件」。 (~363 tok)

## packages/dsh-tauri/src/client/storage/

- `index.ts` — client/storage.ts — 浏览器端统一 key-value 存储（unstorage）。 (~135 tok)

## packages/dsh-tauri/src/client/store/

- `index.ts` — Framework-neutral external state store. (~743 tok)

## packages/dsh-tauri/src/client/types/

- `agent.ts` — 官方 Agent/Tools 类型统一客户端出口。 (~99 tok)
- `bridge.ts` — 记录动作（与宿主 `PluginError.action` 语义一致）。 (~692 tok)
- `context.ts` — 槽位条目的注册选项子集（list/keyed 槽的投影只读这几项）。 (~516 tok)
- `index.ts` (~43 tok)
- `inject.ts` — 布局服务面（ctx.layout）。 (~279 tok)
- `json.ts` — 官方 branded id 与 JSON 类型统一出口。 (~94 tok)
- `runtime.ts` — 官方 controller 客户端类型统一出口。 (~800 tok)

## packages/dsh-tauri/src/client/utils/

- `compat.ts` — Read a service without triggering Cordis' inject-only property guard. (~1657 tok)
- `error.ts` — 错误上报桥（iframe 内 → 桌面宿主）。 (~430 tok)
- `zoom.test.ts` — Declares shortcut (~337 tok)
- `zoom.ts` — 缩放动作（与宿主 `src/utils/zoom.ts` 的 `ZoomAction` 同口径）。 (~244 tok)

## packages/dsh-tauri/src/host/

- `apply.ts` — host/apply.ts — dsh-tauri 宿主插件入口：纯工具包，无宿主行为。 (~35 tok)

## packages/dsh-tauri/src/host/service/

- `open.ts` — host/open.ts — 系统默认方式打开 URL/目录（跨平台 spawn，windowsHide）。 (~486 tok)

## packages/dsh-tauri/src/host/storage/

- `index.test.ts` — host/storage/index.test.ts — 原子写契约：EPERM 锁竞争重试 + 内容落盘 + 临时清理。 (~1255 tok)
- `index.ts` — host/storage.ts — workspace 统一的宿主文件存储（unstorage fs driver + 原子写）。 (~610 tok)

## packages/dsh-tauri/src/host/types/

- `index.ts` — dsh-tauri 宿主共享类型出口。 (~791 tok)

## packages/dsh-tauri/src/host/utils/

- `http.ts` — host/utils/http.ts — 宿主侧 HTTP 路由工具：连接鉴权包装、JSON 请求体读取、 (~1599 tok)
