import type { ComponentType, ReactElement, SVGProps } from 'react'

/** Common props for a Gravity or primitives SVG component. */
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'as'> {
  as: IconComponent
  size?: number
}

export type SharedIconProps = Omit<SVGProps<SVGSVGElement>, 'as'> & { size?: number }

/**
 * Normalizes icon sizing without wrapping individual upstream icons.
 * The `as` component remains the source of the SVG path and metadata.
 */
export function Icon({ as: Component, size = 16, ...props }: IconProps): ReactElement {
  return <Component {...props} width={size} height={size} />
}
