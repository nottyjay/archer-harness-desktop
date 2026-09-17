/** 阶段 1 宿主监视探针：改 STAMP 应触发 Archer 自动重启 Harness。 */
export const name = 'dsh-hmr-probe'
export const STAMP = 'v3'

export function apply(ctx) {
  ctx?.logger?.info?.(`dsh-hmr-probe host stamp ${STAMP}`)
}
