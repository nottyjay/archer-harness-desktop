# dsh-hmr-client-probe

阶段 1 客户端热更新探针：左下角固定角标。改 `src/client` 应只刷新 UI，不重启 Harness。

**不要放进 `packages/`**，否则 debug 会当内置插件发现，linkwatch 不会监视它。

首次载入前在仓库根安装依赖并为本探针产出 `dist/`（被 gitignore）：

```sh
pnpm install
pnpm --filter dsh-hmr-client-probe build
```

本目录挂在仓库 workspace 里，只为解析 `tsdown`；debug 内置发现仍只扫 `packages/*`，不会把它当内置插件。Archer 载入时若 `dist/index.js` 仍缺失，会尝试补构建。

## 怎么测

1. Archer 先正常进就绪页（Rust 侧已含 linkwatch，必要时先重启一次 `pnpm tauri dev`）。
2. 设置 → 插件 → **载入本地插件**，选本目录。首次载入会重启一次。
3. 就绪后左下角应出现绿色角标 `dsh-hmr-client-probe v1`。
4. 把 `src/client/index.ts` 里的 `STAMP` 改成 `v2` 并保存。
5. 预期：角标变成 `v2`；**不要**出现「宿主代码已更新，正在重启服务…」。上游 HMR hot-swap 若仍走桌面降级补丁，可能整页刷新，但 Node 进程不应重启。

不要改 `src/index.ts` / `package.json`：那是宿主源码，会走自动重启。

测完在插件面板卸载即可。
