# dsh-hmr-probe

阶段 1 本地热更新探针：纯 JS 宿主插件，无 `src/client`、无 tsdown。用来确认「改宿主源码 → 自动重启」。

**不要放进 `packages/`**，否则 debug 会当内置插件发现，linkwatch 不会监视它。

## 宿主重启

1. Archer 先正常进就绪页。
2. 设置 → 插件 → **载入本地插件**，选本目录（`fixtures/dsh-hmr-probe`）。首次载入会重启一次。
3. 就绪后把 `index.js` 里的 `STAMP` 改成 `v2` 并保存。
4. 预期：约 1 秒内 toast「本地插件 dsh-hmr-probe 的宿主代码已更新，正在重启服务…」，Harness 重启；日志出现 `dsh-hmr-probe host stamp v2`。

## 客户端热更新

本探针没有 client bundle。测 client HMR 请改用旁边的 `fixtures/dsh-hmr-client-probe`。

测完在插件面板卸载即可。
