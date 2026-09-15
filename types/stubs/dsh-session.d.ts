/**
 * types/stubs/dsh-session.d.ts — 上游类型发布缺陷兜底。
 * 本仓库使用的 dsh-session 类型成员，经 ambient module augmentation 补齐。
 */
declare module '@deepseek-ai/dsh-session' {
  export interface SessionStore {
    [key: string]: unknown
  }
}
