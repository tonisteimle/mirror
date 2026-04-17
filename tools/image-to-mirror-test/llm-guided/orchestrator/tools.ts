/**
 * Deterministic Tools for LLM Orchestrator
 *
 * These tools are called by the LLM to gather precise information
 * from the rendered image.
 */

import * as fs from 'fs'
import { PNG } from 'pngjs'

// =============================================================================
// Types
// =============================================================================

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Region extends Bounds {
  id: string
  backgroundColor?: string
  hasChildren: boolean
  childCount?: number
}

export interface ColorSample {
  hex: string
  r: number
  g: number
  b: number
  a: number
}

export interface GapMeasurement {
  direction: 'horizontal' | 'vertical'
  pixels: number
}

export interface LayoutAnalysis {
  direction: 'horizontal' | 'vertical' | 'stacked' | 'unknown'
  gaps: number[]
  consistentGap: number | null
  alignment: 'start' | 'center' | 'end' | 'spread' | 'unknown'
}

// =============================================================================
// Image Context
// =============================================================================

export class ImageContext {
  private png: PNG | null = null
  private imagePath: string = ''

  async load(imagePath: string): Promise<void> {
    this.imagePath = imagePath
    const buffer = fs.readFileSync(imagePath)
    this.png = PNG.sync.read(buffer)
  }

  get width(): number {
    return this.png?.width || 0
  }

  get height(): number {
    return this.png?.height || 0
  }

  getPixel(x: number, y: number): ColorSample {
    if (!this.png) throw new Error('Image not loaded')
    if (x < 0 || x >= this.png.width || y < 0 || y >= this.png.height) {
      return { hex: '#000000', r: 0, g: 0, b: 0, a: 0 }
    }

    const idx = (this.png.width * y + x) * 4
    const r = this.png.data[idx]
    const g = this.png.data[idx + 1]
    const b = this.png.data[idx + 2]
    const a = this.png.data[idx + 3]

    const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')

    return { hex, r, g, b, a }
  }
}

// =============================================================================
// Tools
// =============================================================================

/**
 * Tool 1: Find distinct regions in the image or within bounds
 * Optimized: samples at 8px intervals for speed
 */
export function findRegions(ctx: ImageContext, bounds?: Bounds): Region[] {
  const searchBounds = bounds || { x: 0, y: 0, width: ctx.width, height: ctx.height }
  const regions: Region[] = []
  const STEP = 8 // Sample every 8 pixels for speed

  // Get background color from corner
  const bgColor = ctx.getPixel(searchBounds.x, searchBounds.y).hex

  // Track found regions to avoid duplicates
  const foundColors = new Map<string, Bounds>()

  // Scan for color changes
  for (let y = searchBounds.y; y < searchBounds.y + searchBounds.height; y += STEP) {
    for (let x = searchBounds.x; x < searchBounds.x + searchBounds.width; x += STEP) {
      const color = ctx.getPixel(x, y).hex

      if (color !== bgColor && !isSimilarColor(color, bgColor)) {
        // Check if we already found this color region
        const existing = foundColors.get(color)
        if (existing) {
          // Expand existing bounds
          existing.x = Math.min(existing.x, x)
          existing.y = Math.min(existing.y, y)
          existing.width = Math.max(existing.x + existing.width, x + STEP) - existing.x
          existing.height = Math.max(existing.y + existing.height, y + STEP) - existing.y
        } else {
          foundColors.set(color, { x, y, width: STEP, height: STEP })
        }
      }
    }
  }

  // Convert to regions
  for (const [color, bounds] of foundColors) {
    if (bounds.width > 15 && bounds.height > 15) {
      regions.push({
        id: `region-${regions.length}`,
        ...bounds,
        backgroundColor: color,
        hasChildren: false,
      })
    }
  }

  return regions
}

function floodFindBounds(
  ctx: ImageContext,
  startX: number,
  startY: number,
  targetColor: string,
  searchBounds: Bounds
): Bounds | null {
  let minX = startX,
    maxX = startX
  let minY = startY,
    maxY = startY

  // Expand horizontally
  while (minX > searchBounds.x && isSimilarColor(ctx.getPixel(minX - 1, startY).hex, targetColor)) {
    minX--
  }
  while (
    maxX < searchBounds.x + searchBounds.width - 1 &&
    isSimilarColor(ctx.getPixel(maxX + 1, startY).hex, targetColor)
  ) {
    maxX++
  }

  // Expand vertically
  while (minY > searchBounds.y && isSimilarColor(ctx.getPixel(startX, minY - 1).hex, targetColor)) {
    minY--
  }
  while (
    maxY < searchBounds.y + searchBounds.height - 1 &&
    isSimilarColor(ctx.getPixel(startX, maxY + 1).hex, targetColor)
  ) {
    maxY++
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function isSimilarColor(color1: string, color2: string, threshold = 30): boolean {
  const r1 = parseInt(color1.slice(1, 3), 16)
  const g1 = parseInt(color1.slice(3, 5), 16)
  const b1 = parseInt(color1.slice(5, 7), 16)
  const r2 = parseInt(color2.slice(1, 3), 16)
  const g2 = parseInt(color2.slice(3, 5), 16)
  const b2 = parseInt(color2.slice(5, 7), 16)

  return (
    Math.abs(r1 - r2) < threshold && Math.abs(g1 - g2) < threshold && Math.abs(b1 - b2) < threshold
  )
}

/**
 * Tool 2: Get color at specific position
 */
export function getColor(ctx: ImageContext, x: number, y: number): ColorSample {
  return ctx.getPixel(x, y)
}

/**
 * Tool 3: Sample colors in a region (for dominant color)
 */
export function sampleColors(ctx: ImageContext, bounds: Bounds, samples = 9): Map<string, number> {
  const colors = new Map<string, number>()

  const stepX = Math.max(1, Math.floor(bounds.width / Math.sqrt(samples)))
  const stepY = Math.max(1, Math.floor(bounds.height / Math.sqrt(samples)))

  for (let y = bounds.y + stepY; y < bounds.y + bounds.height - stepY; y += stepY) {
    for (let x = bounds.x + stepX; x < bounds.x + bounds.width - stepX; x += stepX) {
      const color = ctx.getPixel(x, y).hex
      colors.set(color, (colors.get(color) || 0) + 1)
    }
  }

  return colors
}

/**
 * Tool 4: Measure gap between two regions
 */
export function measureGap(region1: Bounds, region2: Bounds): GapMeasurement {
  // Determine if horizontal or vertical
  const horizontalOverlap = !(
    region1.x + region1.width < region2.x || region2.x + region2.width < region1.x
  )
  const verticalOverlap = !(
    region1.y + region1.height < region2.y || region2.y + region2.height < region1.y
  )

  if (verticalOverlap && !horizontalOverlap) {
    // Horizontal gap
    const gap =
      region2.x > region1.x
        ? region2.x - (region1.x + region1.width)
        : region1.x - (region2.x + region2.width)
    return { direction: 'horizontal', pixels: Math.max(0, gap) }
  } else {
    // Vertical gap
    const gap =
      region2.y > region1.y
        ? region2.y - (region1.y + region1.height)
        : region1.y - (region2.y + region2.height)
    return { direction: 'vertical', pixels: Math.max(0, gap) }
  }
}

/**
 * Tool 5: Analyze layout of children
 */
export function analyzeLayout(children: Bounds[]): LayoutAnalysis {
  if (children.length < 2) {
    return { direction: 'unknown', gaps: [], consistentGap: null, alignment: 'unknown' }
  }

  // Sort children by position
  const sortedByX = [...children].sort((a, b) => a.x - b.x)
  const sortedByY = [...children].sort((a, b) => a.y - b.y)

  // Check horizontal layout
  const horizontalGaps: number[] = []
  let isHorizontal = true
  for (let i = 1; i < sortedByX.length; i++) {
    const gap = sortedByX[i].x - (sortedByX[i - 1].x + sortedByX[i - 1].width)
    horizontalGaps.push(gap)
    // Check if elements overlap vertically (required for horizontal layout)
    const prevBottom = sortedByX[i - 1].y + sortedByX[i - 1].height
    const currTop = sortedByX[i].y
    if (currTop >= prevBottom || sortedByX[i].y + sortedByX[i].height <= sortedByX[i - 1].y) {
      isHorizontal = false
    }
  }

  // Check vertical layout
  const verticalGaps: number[] = []
  let isVertical = true
  for (let i = 1; i < sortedByY.length; i++) {
    const gap = sortedByY[i].y - (sortedByY[i - 1].y + sortedByY[i - 1].height)
    verticalGaps.push(gap)
    // Check if elements overlap horizontally (required for vertical layout)
    const prevRight = sortedByY[i - 1].x + sortedByY[i - 1].width
    const currLeft = sortedByY[i].x
    if (currLeft >= prevRight || sortedByY[i].x + sortedByY[i].width <= sortedByY[i - 1].x) {
      isVertical = false
    }
  }

  // Determine direction
  let direction: 'horizontal' | 'vertical' | 'stacked' | 'unknown' = 'unknown'
  let gaps: number[] = []

  if (isHorizontal && horizontalGaps.every(g => g >= 0)) {
    direction = 'horizontal'
    gaps = horizontalGaps
  } else if (isVertical && verticalGaps.every(g => g >= 0)) {
    direction = 'vertical'
    gaps = verticalGaps
  }

  // Check for consistent gap
  let consistentGap: number | null = null
  if (gaps.length > 0) {
    const avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
    const isConsistent = gaps.every(g => Math.abs(g - avgGap) <= 2)
    if (isConsistent) {
      consistentGap = avgGap
    }
  }

  // Check alignment
  let alignment: 'start' | 'center' | 'end' | 'spread' | 'unknown' = 'unknown'
  if (direction === 'horizontal') {
    const tops = children.map(c => c.y)
    const bottoms = children.map(c => c.y + c.height)
    if (Math.max(...tops) - Math.min(...tops) <= 2) alignment = 'start'
    else if (Math.max(...bottoms) - Math.min(...bottoms) <= 2) alignment = 'end'
    // Could add center detection
  } else if (direction === 'vertical') {
    const lefts = children.map(c => c.x)
    const rights = children.map(c => c.x + c.width)
    if (Math.max(...lefts) - Math.min(...lefts) <= 2) alignment = 'start'
    else if (Math.max(...rights) - Math.min(...rights) <= 2) alignment = 'end'
  }

  return { direction, gaps, consistentGap, alignment }
}

/**
 * Tool 6: Detect if region looks like text (thin, wide or tall)
 */
export function detectTextRegion(region: Bounds): {
  isText: boolean
  orientation: 'horizontal' | 'vertical'
} {
  const aspectRatio = region.width / region.height

  // Text is usually wider than tall (horizontal text)
  if (aspectRatio > 2 && region.height < 50) {
    return { isText: true, orientation: 'horizontal' }
  }

  // Vertical text (rare)
  if (aspectRatio < 0.5 && region.width < 30) {
    return { isText: true, orientation: 'vertical' }
  }

  return { isText: false, orientation: 'horizontal' }
}

/**
 * Tool 7: Measure border radius (approximate)
 */
export function measureBorderRadius(ctx: ImageContext, bounds: Bounds): number {
  const bgColor = ctx.getPixel(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2).hex

  // Check corners for how many pixels until we hit the background color
  let radius = 0

  for (let d = 1; d < Math.min(bounds.width, bounds.height) / 2; d++) {
    const cornerColor = ctx.getPixel(bounds.x + d, bounds.y + d).hex
    if (isSimilarColor(cornerColor, bgColor)) {
      radius = d
      break
    }
  }

  // Round to common values
  if (radius <= 2) return 0
  if (radius <= 5) return 4
  if (radius <= 8) return 6
  if (radius <= 12) return 8
  if (radius <= 16) return 12
  return Math.round(radius / 4) * 4
}

/**
 * Tool 8: Derive layout rules from measurements
 */
export function deriveRules(measurements: {
  gaps: number[]
  paddings: number[]
  radii: number[]
}): string[] {
  const rules: string[] = []

  // Gap rule
  if (measurements.gaps.length > 0) {
    const uniqueGaps = [...new Set(measurements.gaps)]
    if (uniqueGaps.length === 1) {
      rules.push(`Konsistenter Gap: ${uniqueGaps[0]}px`)
    } else if (uniqueGaps.length <= 2) {
      rules.push(`Gaps: ${uniqueGaps.join(', ')}px (könnten Tokens sein)`)
    }
  }

  // Padding rule
  if (measurements.paddings.length > 0) {
    const uniquePaddings = [...new Set(measurements.paddings)]
    if (uniquePaddings.length <= 3) {
      rules.push(`Padding-System: ${uniquePaddings.join(', ')}px`)
    }
  }

  // Radius rule
  if (measurements.radii.length > 0) {
    const uniqueRadii = [...new Set(measurements.radii.filter(r => r > 0))]
    if (uniqueRadii.length === 1) {
      rules.push(`Einheitlicher Radius: ${uniqueRadii[0]}px`)
    } else if (uniqueRadii.length <= 2) {
      rules.push(`Radius-System: ${uniqueRadii.join(', ')}px`)
    }
  }

  return rules
}
