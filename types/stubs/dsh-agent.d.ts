/**
 * types/stubs/dsh-agent.d.ts — 上游类型发布缺陷兜底。
 * 本仓库使用的 dsh-agent 类型成员（发布物 .d.ts 以 .ts 引用内部模块导致
 * re-export 失效），经 ambient module augmentation 补齐。
 */
declare module '@deepseek-ai/dsh-agent' {
  export interface AgentRegistry {
    [key: string]: unknown
  }
  export interface AgentHandle {
    [key: string]: unknown
  }
  export interface ModelSelection {
    provider: string
    model: string
    [key: string]: unknown
  }
}
