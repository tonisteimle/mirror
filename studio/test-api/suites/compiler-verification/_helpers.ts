/**
 * Shared helpers for compiler verification tests
 */

// =============================================================================
// Helper: Exakte Farb-Vergleiche
// =============================================================================

export function normalizeColor(color: string): string {
  // Normalize hex to rgb for comparison
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return `rgb(${r}, ${g}, ${b})`
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  return color
}

export function colorsMatch(actual: string, expected: string, tolerance = 2): boolean {
  const normalize = (c: string) => {
    const match = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
    return null
  }

  const a = normalize(actual) || normalize(normalizeColor(expected))
  const b = normalize(normalizeColor(expected))

  if (!a || !b) return actual === expected

  return (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance
  )
}
