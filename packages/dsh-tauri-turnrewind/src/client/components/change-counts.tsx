import type { ReactElement } from 'react'

/** 计数组件 props：二进制差异用文案代替行数。 */
export interface ChangeCountsProps {
  insertions: number | null
  deletions: number | null
  binary: boolean
  /** 二进制差异的展示文案（调用方按当前语言提供）。 */
  binaryLabel: string
}

/**
 * 绿色 `+N` / 红色 `-M` 计数（官方 deliverables 行同款配色）。
 *
 * 视觉是分开着色的两个 span，同时由调用方把 `formatCounts` 的结果放进 `title`，
 * 保证读屏与悬浮提示拿到的是同一条「+N -M」文本。
 */
export function ChangeCounts({ insertions, deletions, binary, binaryLabel }: ChangeCountsProps): ReactElement {
  if (binary)
    return <span className="dshp-turnrewind-counts"><span className="dshp-turnrewind-counts__binary">{binaryLabel}</span></span>
  return (
    <span className="dshp-turnrewind-counts">
      <span className="dshp-turnrewind-counts__add">{`+${insertions ?? 0}`}</span>
      <span className="dshp-turnrewind-counts__del">{`-${deletions ?? 0}`}</span>
    </span>
  )
}
