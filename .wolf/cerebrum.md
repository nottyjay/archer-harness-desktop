---
description: learned preferences, project conventions, and Do-Not-Repeat rules
budget_tokens: 2000
---
# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-09-15

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

- Node.js 与 DSH 是安装包硬性资源；运行时必须直接从安装包读取，不复制到 AppData，不做启动自检下载。

## Key Learnings

- **Project:** deepseek-harness-desktop
- **Description:** Desktop application for DeepSeek Harness (dsh) — one-click local install and launch, no Node.js setup required.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

- [2026-09-15] Rust 的 macOS 名称是 `macos`，Node 发行资源目录名称是 `darwin`；资源查找必须显式映射，不能直接拼接 `env::consts::OS`。
- [2026-09-15] 仅执行 `dsh --version` 不能证明部署闭包可启动；打包必须校验 workspace peer 依赖，并用最终随包 Node 启动 web profile 做冒烟验证。

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->

- [2026-09-15] Node/DSH 不再实现启动安装任务；资源缺失属于安装包缺陷，直接返回 `NODE_BUNDLED_RESOURCE_MISSING` 或 `DSH_BUNDLED_RESOURCE_MISSING`。
