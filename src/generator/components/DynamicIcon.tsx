/**
 * DynamicIcon - Icon component for the generator
 *
 * Supports three icon libraries:
 * - Lucide: SVG-based React components (default)
 * - Material: Font-based Google Material Symbols
 * - Phosphor: SVG-based React components with 6 weight variants
 *
 * Icon Weight (icon-weight / iw):
 * - Lucide: Maps to strokeWidth (1.0-3.0, default 2.0)
 * - Material: Maps to font-variation-settings wght (100-700, default 400)
 * - Phosphor: Maps to weight variant (thin, light, regular, bold, fill, duotone)
 *
 * Icon Fill (fill):
 * - Material only: Sets FILL to 1 (filled) instead of 0 (outlined)
 *
 * Uses synchronous loading from the icon cache for SSR compatibility.
 */

import React, { memo } from 'react'
import { getIcon, getPhosphorIcon } from '../utils/icon-cache'

export type IconLibrary = 'lucide' | 'material' | 'phosphor'

interface DynamicIconProps {
  name: string
  size?: number
  color?: string
  library?: IconLibrary
  /** Icon weight: Lucide uses strokeWidth (1-3), Material uses wght (100-700), Phosphor uses named weights */
  weight?: number
  /** Fill icon (Material only): true = filled, false = outlined */
  fill?: boolean
}

/**
 * Convert weight to Lucide strokeWidth
 * Weight 100-700 maps to strokeWidth 0.75-3.0
 * Default weight 400 = strokeWidth 2.0
 */
function weightToStrokeWidth(weight: number): number {
  // Map 100-700 to 0.75-3.0
  // 100 → 0.75, 400 → 2.0, 700 → 3.0
  const normalized = (weight - 100) / 600  // 0 to 1
  return 0.75 + normalized * 2.25
}

/**
 * Convert weight to Phosphor weight variant
 * Weight 100-700 maps to: thin, light, regular, bold, fill
 */
function weightToPhosphorWeight(weight: number): 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' {
  if (weight <= 150) return 'thin'
  if (weight <= 250) return 'light'
  if (weight <= 450) return 'regular'
  if (weight <= 550) return 'bold'
  return 'fill'  // 600+
}

/**
 * Dynamic Icon Component
 *
 * Renders an icon by name from the specified library.
 * - Lucide: React SVG components (default)
 * - Material: Font-based Material Symbols
 * - Phosphor: React SVG components with weight variants
 */
export const DynamicIcon = memo(function DynamicIcon({
  name,
  size = 24,
  color,
  library = 'lucide',
  weight,
  fill = false
}: DynamicIconProps) {
  // Material Icons: Font-based rendering with variable font settings
  if (library === 'material') {
    const wght = weight ?? 400
    const fillValue = fill ? 1 : 0
    return (
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: size,
          color: color || 'currentColor',
          fontVariationSettings: `'FILL' ${fillValue}, 'wght' ${wght}, 'GRAD' 0, 'opsz' 24`,
        }}
      >
        {name}
      </span>
    )
  }

  // Phosphor Icons: React component rendering with weight variant
  if (library === 'phosphor') {
    const IconComponent = getPhosphorIcon(name)

    if (!IconComponent) {
      return null
    }

    // Apply weight as Phosphor weight variant if specified
    const phosphorWeight = weight ? weightToPhosphorWeight(weight) : 'regular'

    return <IconComponent size={size} color={color} weight={phosphorWeight} />
  }

  // Lucide Icons: React component rendering with strokeWidth
  const IconComponent = getIcon(name)

  if (!IconComponent) {
    return null
  }

  // Apply weight as strokeWidth if specified
  const strokeWidth = weight ? weightToStrokeWidth(weight) : undefined

  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />
})

/**
 * Render dynamic icon helper - returns JSX or null
 * Use this as a drop-in replacement for IconComponent rendering
 */
export function renderDynamicIcon(
  iconName: string | undefined,
  size: number = 24,
  color: string = 'currentColor',
  library: IconLibrary = 'lucide',
  weight?: number,
  fill?: boolean
): React.JSX.Element | null {
  if (!iconName) return null
  return <DynamicIcon name={iconName} size={size} color={color} library={library} weight={weight} fill={fill} />
}
