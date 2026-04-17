/**
 * Rectangle Analyzer - Schritt 0
 *
 * Erkennt ein einzelnes farbiges Rechteck auf einem Hintergrund.
 * Extrahiert: Größe, Position, Hintergrundfarbe
 */

import type { RenderedImage, AnalysisResult, ImageAnalyzer } from '../types'

// =============================================================================
// Types
// =============================================================================

interface Pixel {
  r: number
  g: number
  b: number
  a: number
}

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface DetectedRectangle {
  bounds: BoundingBox
  backgroundColor: string
}

// =============================================================================
// Pixel Utilities
// =============================================================================

/**
 * Parse PNG buffer to pixel array using Jimp v1.x API
 */
async function getPixels(
  buffer: Buffer
): Promise<{ data: Uint8Array; width: number; height: number }> {
  // Jimp v1.x uses named exports
  const { Jimp } = await import('jimp')

  const image = await Jimp.read(buffer)
  const width = image.width
  const height = image.height

  // Jimp v1.x: bitmap.data is the raw RGBA buffer
  const data = new Uint8Array(image.bitmap.data)

  return { data, width, height }
}

/**
 * Get pixel at position
 */
function getPixelAt(data: Uint8Array, width: number, x: number, y: number): Pixel {
  const idx = (y * width + x) * 4
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3],
  }
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(v => {
        const hex = v.toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

/**
 * Check if two pixels are the same color (with tolerance)
 */
function pixelsEqual(a: Pixel, b: Pixel, tolerance = 2): boolean {
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance
  )
}

// =============================================================================
// Analysis Functions
// =============================================================================

/**
 * Get background color by checking all four corners
 * Returns the most common corner color (robust against elements at edges)
 */
function getBackgroundColor(data: Uint8Array, width: number, height: number): Pixel {
  const corners = [
    getPixelAt(data, width, 0, 0), // top-left
    getPixelAt(data, width, width - 1, 0), // top-right
    getPixelAt(data, width, 0, height - 1), // bottom-left
    getPixelAt(data, width, width - 1, height - 1), // bottom-right
  ]

  // Count occurrences of each color
  const colorCounts = new Map<string, { count: number; pixel: Pixel }>()

  for (const pixel of corners) {
    const key = `${pixel.r},${pixel.g},${pixel.b}`
    const existing = colorCounts.get(key)
    if (existing) {
      existing.count++
    } else {
      colorCounts.set(key, { count: 1, pixel })
    }
  }

  // Return most common color
  let maxCount = 0
  let bgPixel = corners[0]

  for (const { count, pixel } of colorCounts.values()) {
    if (count > maxCount) {
      maxCount = count
      bgPixel = pixel
    }
  }

  return bgPixel
}

/**
 * Find bounding box of non-background pixels
 */
function findBoundingBox(
  data: Uint8Array,
  width: number,
  height: number,
  backgroundColor: Pixel
): BoundingBox | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = getPixelAt(data, width, x, y)
      if (!pixelsEqual(pixel, backgroundColor)) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < 0) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

/**
 * Get dominant color inside bounding box
 */
function getRectangleColor(data: Uint8Array, width: number, bounds: BoundingBox): Pixel {
  // Sample center of rectangle
  const centerX = bounds.x + Math.floor(bounds.width / 2)
  const centerY = bounds.y + Math.floor(bounds.height / 2)
  return getPixelAt(data, width, centerX, centerY)
}

// =============================================================================
// Mirror Code Generator
// =============================================================================

/**
 * Generate Mirror code from detected rectangle
 */
function generateMirrorCode(rect: DetectedRectangle): string {
  const { width, height } = rect.bounds
  const bg = rect.backgroundColor

  return `Frame w ${width}, h ${height}, bg ${bg}`
}

// =============================================================================
// Analyzer Class
// =============================================================================

export class RectangleAnalyzer implements ImageAnalyzer {
  name = 'RectangleAnalyzer'
  version = '0.1.0'

  async analyze(image: RenderedImage): Promise<AnalysisResult> {
    const startTime = Date.now()

    // 1. Load pixels
    const { data, width, height } = await getPixels(image.buffer)

    // 2. Get background color
    const bgPixel = getBackgroundColor(data, width, height)
    const bgColor = rgbToHex(bgPixel.r, bgPixel.g, bgPixel.b)

    // 3. Find bounding box of non-background pixels
    const bounds = findBoundingBox(data, width, height, bgPixel)

    if (!bounds) {
      // No rectangle found - just background
      return {
        generatedCode: `Frame w ${width}, h ${height}, bg ${bgColor}`,
        confidence: 1.0,
        metadata: {
          analyzer: this.name,
          version: this.version,
          duration: Date.now() - startTime,
          elements: [],
        },
      }
    }

    // 4. Get rectangle color
    const rectPixel = getRectangleColor(data, width, bounds)
    const rectColor = rgbToHex(rectPixel.r, rectPixel.g, rectPixel.b)

    // 5. Build detected rectangle
    const rectangle: DetectedRectangle = {
      bounds,
      backgroundColor: rectColor,
    }

    // 6. Generate Mirror code
    const generatedCode = generateMirrorCode(rectangle)

    return {
      generatedCode,
      confidence: 1.0,
      metadata: {
        analyzer: this.name,
        version: this.version,
        duration: Date.now() - startTime,
        canvasSize: { width, height },
        canvasBackground: bgColor,
        elements: [rectangle],
      },
    }
  }
}
