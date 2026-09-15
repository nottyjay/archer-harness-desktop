/**
 * types/stubs/dsh-tools.d.ts — 上游类型发布缺陷兜底。
 *
 * `@deepseek-ai/dsh-tools` 的 lib/types/index.d.ts 以 `./*.ts` 引用内部模块
 * （发布物只有 .d.ts），部分导出失效。本文件用 ambient module augmentation
 * 补充本仓库使用的成员；新增使用成员时在此补充。
 */
declare module '@deepseek-ai/dsh-tools' {
  /** 工具定义（code mode / tool registry 契约）。 */
  export interface ToolSchema {
    name: string
    description: string
    parameters?: Record<string, unknown>
    [key: string]: unknown
  }

  export interface ToolDefinition extends ToolSchema {
    execute?: (args: Record<string, unknown>, context: unknown) => Promise<unknown>
    presentResult?: (result: unknown, context: unknown) => Promise<unknown>
    [key: string]: unknown
  }

  export interface ToolExecution {
    toolName: string
    arguments: Record<string, unknown>
    sessionId?: string
    [key: string]: unknown
  }

  export interface ToolRunContext {
    sessionId?: string
    [key: string]: unknown
  }

  export interface ToolRuntime {
    register: (definition: ToolDefinition | unknown) => () => void | undefined
    [key: string]: unknown
  }

  export function defineTool(definition: ToolDefinition): ToolDefinition
  export const RUN_CODE_NAME: string
  export class CodeRunFailedError extends Error {
    readonly code?: string
  }
}
