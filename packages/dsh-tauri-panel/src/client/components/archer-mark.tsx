import type { ReactElement } from 'react'
import { useId } from 'react'
import { BRAND_APP_NAME } from '../constants'

/** Owner 传入的方形边长；hero 还会带上宿主 class 以保持空态几何。 */
export interface ArcherMarkProps {
  size: number
  className?: string
}

/**
 * Archer A 标。多实例共用同一 SVG 时 gradient id 会撞车，所以用 React useId 加前缀。
 */
export function ArcherMark({ size, className }: ArcherMarkProps): ReactElement {
  const rawId = useId()
  const uid = rawId.replace(/:/g, '')
  const top = `${uid}-top`
  const accent = `${uid}-accent`
  const stem = `${uid}-stem`
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={top} gradientUnits="userSpaceOnUse" x1="900.3449" y1="281.2035" x2="401.6071" y2="281.2035">
          <stop offset="0" stopColor="#006BFF" />
          <stop offset="1" stopColor="#0233AC" />
        </linearGradient>
        <linearGradient
          id={accent}
          gradientUnits="userSpaceOnUse"
          x1="753.1015"
          y1="749.3278"
          x2="1065.9233"
          y2="749.3278"
          gradientTransform="matrix(0.9856 0.1691 -0.1691 0.9856 111.0277 -93.7821)"
        >
          <stop offset="0" stopColor="#FF533A" />
          <stop offset="1" stopColor="#FF8137" />
        </linearGradient>
        <linearGradient id={stem} gradientUnits="userSpaceOnUse" x1="342.3633" y1="86.1841" x2="342.3633" y2="907.8973">
          <stop offset="0" stopColor="#006BFF" />
          <stop offset="1" stopColor="#023EC5" />
        </linearGradient>
      </defs>
      <path fill={`url(#${top})`} d="M403 105.5 553.2 416c21 41.6 40.5 54.5 87.1 55.4l220.6 4c28.5.6 47.8-28.8 36-54.7L775.4 154.6C756.6 113.4 715.6 87 670.3 87H414.4c-9.5 0-15.7 10-11.4 18.5Z" />
      <path fill="#0067FD" d="M529 870.4 864.4 619c33.9-25.4 9.9-68.8-38-68.8H550.6c-14.1 0-27.7 4.2-37.8 11.6L152.4 829c-33.7 25-11 68 36.4 68.9l233.4 4.5c39.9.8 78.5-10.7 106.8-32Z" />
      <path fill={`url(#${accent})`} d="m1019.8 868.7-81.7-182.9c-11.7-26.1-44.9-34.3-67.3-16.5L737.4 775.2c-15.5 12.3-20.8 33.4-13.1 51.6l10.1 23.5c23.2 54.4 77.8 88.5 136.9 85.6l110.7-5.5c30.7-1.6 50.4-33.5 37.8-61.7Z" />
      <path fill={`url(#${stem})`} d="M9.5 771.3c-27.8 66 22 138.8 93.5 136.6l318.6-5.7s-113.8-17.3-81-142.6l263.5-626.4s13.3-39.7 78.9-45.9l-327.7-1c-34.2-.8-65.5 19.4-78.8 51L9.5 771.3Z" />
    </svg>
  )
}

/** 侧栏 brand.name：纯文字，样式跟克隆侧栏的 fallback 字重一致。 */
export function ArcherBrandName(): ReactElement {
  return <span className="dshp-panel__fallback-brand-name">{BRAND_APP_NAME}</span>
}
