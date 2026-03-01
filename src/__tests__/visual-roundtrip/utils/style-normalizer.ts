/**
 * Style Normalizer Utilities
 *
 * Normalizes CSS values for accurate comparison.
 */

/**
 * Normalize a color value to hex format
 */
export function normalizeColor(color: string): string {
  if (!color || color === 'transparent' || color === 'initial' || color === 'inherit') {
    return color
  }

  // Already hex
  if (color.startsWith('#')) {
    return color.toLowerCase()
  }

  // rgb(r, g, b) -> hex
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`.toLowerCase()
  }

  // rgba(r, g, b, a) - if alpha is 1, convert to hex
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
  if (rgbaMatch) {
    const alpha = parseFloat(rgbaMatch[4])
    if (alpha === 1) {
      const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
      const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
      const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
      return `#${r}${g}${b}`.toLowerCase()
    }
    // Keep rgba as is for transparency
    return color.toLowerCase()
  }

  return color.toLowerCase()
}

/**
 * Normalize a pixel value
 */
export function normalizePixelValue(value: string): string {
  if (!value) return value

  // Remove unnecessary decimals (e.g., "16.000px" -> "16px")
  const pxMatch = value.match(/^([\d.]+)px$/)
  if (pxMatch) {
    const num = parseFloat(pxMatch[1])
    return `${Math.round(num * 100) / 100}px`
  }

  return value
}

/**
 * Normalize spacing shorthand (padding, margin)
 */
export function normalizeSpacing(value: string): string {
  if (!value) return value

  // Split by spaces and normalize each value
  const parts = value.split(/\s+/).map(normalizePixelValue)

  // Collapse identical values
  if (parts.length === 4) {
    // top right bottom left
    if (parts[0] === parts[2] && parts[1] === parts[3]) {
      if (parts[0] === parts[1]) {
        return parts[0] // All same
      }
      return `${parts[0]} ${parts[1]}` // Vertical horizontal
    }
  }

  return parts.join(' ')
}

/**
 * Normalize border-radius
 */
export function normalizeBorderRadius(value: string): string {
  if (!value) return value

  const parts = value.split(/\s+/).map(normalizePixelValue)

  // Collapse identical values
  if (parts.length === 4 && parts.every(p => p === parts[0])) {
    return parts[0]
  }

  return parts.join(' ')
}

/**
 * Normalize font-weight
 */
export function normalizeFontWeight(value: string): string {
  const weightMap: Record<string, string> = {
    'normal': '400',
    'bold': '700',
    'lighter': '300',
    'bolder': '700'
  }

  return weightMap[value.toLowerCase()] || value
}

/**
 * Normalize font-family
 */
export function normalizeFontFamily(value: string): string {
  // Extract first font family, ignore fallbacks
  const families = value.split(',').map(f => f.trim().replace(/["']/g, ''))
  return families[0] || value
}

/**
 * Normalize any CSS property value
 */
export function normalizeStyleValue(property: string, value: string): string {
  if (!value || value === 'none' || value === 'initial' || value === 'auto' || value === 'normal') {
    return value
  }

  // Color properties
  if (
    property === 'color' ||
    property === 'background-color' ||
    property === 'border-color' ||
    property.includes('color')
  ) {
    return normalizeColor(value)
  }

  // Spacing properties
  if (property === 'padding' || property === 'margin') {
    return normalizeSpacing(value)
  }

  // Border radius
  if (property === 'border-radius' || property.includes('radius')) {
    return normalizeBorderRadius(value)
  }

  // Font weight
  if (property === 'font-weight') {
    return normalizeFontWeight(value)
  }

  // Font family
  if (property === 'font-family') {
    return normalizeFontFamily(value)
  }

  // Pixel values
  if (value.endsWith('px')) {
    return normalizePixelValue(value)
  }

  return value.toLowerCase().trim()
}

/**
 * Normalize all styles in an object
 */
export function normalizeStyles(styles: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {}

  for (const [property, value] of Object.entries(styles)) {
    if (value) {
      normalized[property] = normalizeStyleValue(property, value)
    }
  }

  return normalized
}

/**
 * Check if two color values are equivalent
 */
export function colorsEqual(color1: string, color2: string): boolean {
  return normalizeColor(color1) === normalizeColor(color2)
}

/**
 * Check if two pixel values are approximately equal
 */
export function pixelsApproxEqual(value1: string, value2: string, tolerance = 1): boolean {
  const num1 = parseFloat(value1)
  const num2 = parseFloat(value2)

  if (isNaN(num1) || isNaN(num2)) {
    return value1 === value2
  }

  return Math.abs(num1 - num2) <= tolerance
}

/**
 * Calculate similarity between two style objects (0-1)
 */
export function calculateStyleSimilarity(
  styles1: Record<string, string>,
  styles2: Record<string, string>
): number {
  const normalized1 = normalizeStyles(styles1)
  const normalized2 = normalizeStyles(styles2)

  const allProps = new Set([...Object.keys(normalized1), ...Object.keys(normalized2)])
  if (allProps.size === 0) return 1

  let matches = 0
  for (const prop of allProps) {
    const val1 = normalized1[prop] || ''
    const val2 = normalized2[prop] || ''

    if (val1 === val2) {
      matches++
    } else if (prop.includes('color') && colorsEqual(val1, val2)) {
      matches++
    } else if (val1.endsWith('px') && val2.endsWith('px') && pixelsApproxEqual(val1, val2)) {
      matches++
    }
  }

  return matches / allProps.size
}
