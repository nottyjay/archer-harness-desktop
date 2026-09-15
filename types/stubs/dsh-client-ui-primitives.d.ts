/**
 * types/stubs/dsh-client-ui-primitives.d.ts — 上游类型发布缺陷兜底。
 *
 * `@deepseek-ai/dsh-client-ui-primitives@0.1.0-rc.8` 的 lib/types/index.d.ts 以
 * `./*.tsx` 引用各组件（发布物只有 .d.ts），re-export 全部失效，使用方报
 * "no exported member"。本文件用 ambient module augmentation 把本仓库实际
 * 使用的成员补充进该模块的导出表（宽松 props，兼容浅/深主题用法）。
 * 新增使用成员时在此补充。
 */
import type * as React from 'react'

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  /** 图标 props（render fill=currentColor，{size,className}）。 */
  export interface IconProps {
    size?: number
    className?: string
    [key: string]: unknown
  }

  /** Selectable row (optionally with a nested submenu). */
  export interface MenuItem {
    id: string
    label: React.ReactNode
    disabled?: boolean
    icon?: React.ReactNode
    danger?: boolean
    submenu?: readonly MenuItem[]
  }

  /** Hairline between item groups (not selectable). */
  export interface MenuSeparator {
    type: 'separator'
    id: string
  }

  /** Non-interactive heading row above a group of items. */
  export interface MenuLabel {
    type: 'label'
    id: string
    text: string
  }

  export type MenuEntry = MenuItem | MenuSeparator | MenuLabel

  export interface MenuProps {
    open?: boolean
    anchor?: React.ReactNode
    items?: readonly MenuEntry[]
    selectedId?: string
    selectedIds?: readonly string[]
    onSelect?: (entry: MenuEntry) => void
    onClose?: () => void
    align?: string
    side?: string
    portal?: boolean
    closeOnPointerLeave?: boolean
    className?: string
    [key: string]: unknown
  }

  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'outline' | 'toolbar' | string
    size?: string
    icon?: React.ReactNode
    children?: React.ReactNode
  }

  export interface ModalProps {
    open?: boolean
    onClose?: () => void
    className?: string
    children?: React.ReactNode
    [key: string]: unknown
  }

  export interface StateDotProps {
    state?: string
    className?: string
    [key: string]: unknown
  }

  export interface ToastProps {
    durationMs?: number
    className?: string
    children?: React.ReactNode
    [key: string]: unknown
  }

  export interface StateDotState {
    [key: string]: unknown
  }

  export const Button: React.FC<ButtonProps>
  export const Modal: React.FC<ModalProps>
  export const StateDot: React.FC<StateDotProps>
  export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & Record<string, unknown>>
  export const Menu: React.FC<MenuProps>
  export const Toast: React.FC<ToastProps>

  // 图标渲染为 SVG（fill=currentColor），兼容 dsh-tauri-ui Icon 的 as 类型。
  export const IconChevronDownOutline14: React.ComponentType<React.SVGProps<SVGSVGElement>>
  export const IconCheckOutline16: React.ComponentType<React.SVGProps<SVGSVGElement>>
  export const IconWarningOutline16: React.ComponentType<React.SVGProps<SVGSVGElement>>
  export const IconAgentPresetOutline16: React.ComponentType<React.SVGProps<SVGSVGElement>>
  export const IconDataOutline16: React.ComponentType<React.SVGProps<SVGSVGElement>>
  export const IconPersonalizationOutline16: React.ComponentType<React.SVGProps<SVGSVGElement>>
  export const IconSettingsOutline16: React.ComponentType<React.SVGProps<SVGSVGElement>>
}
