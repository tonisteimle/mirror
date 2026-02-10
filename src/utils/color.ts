/**
 * Shared color utility functions for color pickers and panels.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

/**
 * Convert HSL values to a hex color string (without #).
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string in uppercase (e.g., "3B82F6")
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return (toHex(r) + toHex(g) + toHex(b)).toUpperCase()
}

/**
 * Convert hex color string to RGB values.
 * @param hex - Hex color string (with or without #, 3 or 6 digits)
 * @returns RGB object or null if invalid
 */
export function hexToRgb(hex: string): RGB | null {
  hex = hex.replace('#', '')
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('')
  }
  if (hex.length !== 6) return null

  const num = parseInt(hex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Convert RGB values to HSL.
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns HSL object with h (0-360), s (0-100), l (0-100)
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

// Base hues for color grids (0-360 in 20 degree steps)
export const HUES = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340]

export interface ColorGridConfig {
  /** Number of columns (lightness variations) - default: 12 */
  columns?: number
  /** Whether to include grayscale row - default: true */
  includeGrayscale?: boolean
  /** Saturation level for hue rows (0-100) - default: 80 */
  saturation?: number
}

/**
 * Generate a color grid with hue rows and optional grayscale.
 * @param config - Optional configuration for grid generation
 * @returns 2D array of hex color strings (without #)
 */
export function generateColorGrid(config: ColorGridConfig = {}): string[][] {
  const { columns = 12, includeGrayscale = true, saturation = 80 } = config
  const grid: string[][] = []

  // Grayscale row
  if (includeGrayscale) {
    const grays: string[] = []
    for (let i = 0; i < columns; i++) {
      const l = 95 - i * (90 / (columns - 1))
      grays.push(hslToHex(0, 0, Math.max(5, l)))
    }
    grid.push(grays)
  }

  // Hue rows
  for (const hue of HUES) {
    const row: string[] = []
    for (let i = 0; i < columns; i++) {
      const l = 90 - i * (80 / (columns - 1))
      row.push(hslToHex(hue, saturation, Math.max(10, l)))
    }
    grid.push(row)
  }

  return grid
}

/**
 * Generate variations for a specific hue (for ColorPicker's detailed view).
 * @param hue - Hue value (0-360), or null for grayscale
 * @param cols - Number of saturation columns (default: 18)
 * @param rows - Number of lightness rows (default: 10)
 * @returns 2D array of hex color strings (without #)
 */
export function generateHueVariations(hue: number | null, cols = 18, rows = 10): string[][] {
  const variations: string[][] = []

  const saturations: number[] = []
  for (let i = 0; i < cols; i++) {
    saturations.push(100 - i * 5.5)
  }

  const lightnesses: number[] = []
  for (let i = 0; i < rows; i++) {
    lightnesses.push(95 - i * 9)
  }

  for (const l of lightnesses) {
    const row: string[] = []
    for (const s of saturations) {
      // Use saturation 0 for grayscale
      const sat = hue === null ? 0 : Math.max(5, s)
      const h = hue ?? 0
      row.push(hslToHex(h, sat, Math.max(5, l)))
    }
    variations.push(row)
  }

  return variations
}

// Pre-generated color grid for InlineColorPanel (12 columns, with grayscale)
export const COLOR_GRID = generateColorGrid()
