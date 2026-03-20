/**
 * Size Calculator - Pure Functions
 *
 * Calculates component default sizes.
 * Used at dragstart to determine preview size.
 */

import type { Size } from './types'

/**
 * Default sizes for component types
 */
const COMPONENT_DEFAULTS: Record<string, Size> = {
  button: { width: 80, height: 36 },
  input: { width: 200, height: 36 },
  textarea: { width: 200, height: 80 },
  text: { width: 60, height: 24 },
  image: { width: 100, height: 100 },
  icon: { width: 24, height: 24 },
  checkbox: { width: 20, height: 20 },
  radio: { width: 20, height: 20 },
  divider: { width: 100, height: 1 },
  spacer: { width: 16, height: 16 },
  box: { width: 100, height: 100 },
}

const DEFAULT_SIZE: Size = { width: 100, height: 40 }

/**
 * Get default size for a component type
 */
export function getDefaultSize(componentName: string): Size {
  const normalized = componentName.toLowerCase()
  return COMPONENT_DEFAULTS[normalized] ?? DEFAULT_SIZE
}

/**
 * Parse explicit size from properties string
 */
export function parseSize(properties: string | undefined): Partial<Size> {
  if (!properties) return {}

  const result: Partial<Size> = {}

  // Match width: "w 200" or "w full"
  const wMatch = properties.match(/(?:^|,\s*)w\s+(\d+)(?:,|$|\s)/)
  if (wMatch) {
    result.width = parseInt(wMatch[1], 10)
  }

  // Match height: "h 100" or "h full"
  const hMatch = properties.match(/(?:^|,\s*)h\s+(\d+)(?:,|$|\s)/)
  if (hMatch) {
    result.height = parseInt(hMatch[1], 10)
  }

  return result
}

/**
 * Calculate size for a new component
 * Merges explicit properties with defaults
 */
export function calculateNewComponentSize(
  componentName: string,
  properties?: string
): Size {
  const defaults = getDefaultSize(componentName)
  const explicit = parseSize(properties)

  return {
    width: explicit.width ?? defaults.width,
    height: explicit.height ?? defaults.height,
  }
}
