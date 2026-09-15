/**
 * types/stubs/dsh-llm.d.ts — 上游类型发布缺陷兜底。
 * 本仓库使用的 dsh-llm 类型成员，经 ambient module augmentation 补齐。
 */
declare module '@deepseek-ai/dsh-llm' {
  export interface ContentBlock {
    type: string
    [key: string]: unknown
  }
  export interface MessageSource {
    [key: string]: unknown
  }
  export interface UserMessage {
    [key: string]: unknown
  }
  export interface LlmRuntime {
    resolveModelInfo?: (provider: string, model: string) => Promise<{
      reasoning?: { efforts?: Array<{ id: string | number, name: string, description?: string }> }
    } | undefined> | undefined
    [key: string]: unknown
  }
}
