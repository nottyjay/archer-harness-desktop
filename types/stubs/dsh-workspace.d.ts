/**
 * types/stubs/dsh-workspace.d.ts — 上游类型发布缺陷兜底。
 * 本仓库使用的 dsh-workspace 类型成员，经 ambient module augmentation 补齐。
 */
declare module '@deepseek-ai/dsh-workspace' {
  export type WorkspaceId = string
  export interface WorkspaceRegistry {
    list?: () => Promise<Array<{ id: string, path?: string, title?: string }>>
    [key: string]: unknown
  }
}
