/**
 * ColorSwatch - Color preview component used in color pickers and token lists.
 */
import { colors } from '../../theme'

export interface ColorSwatchProps {
  /** The color to display (hex, rgb, or any valid CSS color) */
  color: string
  /** Size of the swatch in pixels (default: 16) */
  size?: number
  /** Border radius in pixels (default: 3) */
  borderRadius?: number
}

export function ColorSwatch({ color, size = 16, borderRadius = 3 }: ColorSwatchProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: color,
        border: `1px solid ${colors.border}`,
        flexShrink: 0,
      }}
    />
  )
}
