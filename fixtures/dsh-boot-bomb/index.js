/** 故意让整棵 Cordis 树拒绝启动，用来测 Archer 当前档案跳过/禁用用户插件。 */
export const name = 'dsh-boot-bomb'

export function apply() {
  throw new Error('dsh-boot-bomb: intentional fail-loud for Phase 0 skip/disable test')
}
