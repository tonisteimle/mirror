/**
 * Icon Recognition via Fingerprinting
 *
 * Extracts statistical features from icon images and matches against a library
 * of known Lucide icons.
 */

// =============================================================================
// Types
// =============================================================================

export interface IconFingerprint {
  name: string
  // Geometric features
  inkDensity: number // Ratio of ink pixels to total pixels
  aspectRatio: number // Width / Height of bounding box
  centerOfMassX: number // Normalized X position of center of mass (0-1)
  centerOfMassY: number // Normalized Y position of center of mass (0-1)
  // Symmetry features
  horizontalSymmetry: number // 0-1, how symmetric left-right
  verticalSymmetry: number // 0-1, how symmetric top-bottom
  // Stroke features
  edgeRatio: number // Ratio of edge pixels to total ink (thin strokes = high)
}

export interface IconMatch {
  name: string
  distance: number
  confidence: number
}

// =============================================================================
// Feature Extraction
// =============================================================================

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Extract fingerprint features from icon pixel data
 */
export function extractIconFeatures(
  data: Uint8Array,
  imageWidth: number,
  bounds: Bounds,
  bgColor: { r: number; g: number; b: number }
): IconFingerprint {
  const { x, y, width, height } = bounds
  const totalPixels = width * height

  // Track ink pixels and their positions
  let inkPixels = 0
  let sumX = 0
  let sumY = 0
  const inkMap: boolean[][] = []

  // Initialize ink map
  for (let row = 0; row < height; row++) {
    inkMap[row] = []
    for (let col = 0; col < width; col++) {
      inkMap[row][col] = false
    }
  }

  // First pass: find ink pixels and center of mass
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = ((y + row) * imageWidth + (x + col)) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isInk =
        Math.abs(r - bgColor.r) > 30 || Math.abs(g - bgColor.g) > 30 || Math.abs(b - bgColor.b) > 30

      if (isInk) {
        inkPixels++
        sumX += col
        sumY += row
        inkMap[row][col] = true
      }
    }
  }

  // Calculate features
  const inkDensity = inkPixels / totalPixels
  const aspectRatio = width / height
  const centerOfMassX = inkPixels > 0 ? sumX / inkPixels / width : 0.5
  const centerOfMassY = inkPixels > 0 ? sumY / inkPixels / height : 0.5

  // Calculate symmetry
  const horizontalSymmetry = calculateHorizontalSymmetry(inkMap, width, height)
  const verticalSymmetry = calculateVerticalSymmetry(inkMap, width, height)

  // Calculate edge ratio (pixels with at least one non-ink neighbor)
  const edgeRatio = calculateEdgeRatio(inkMap, width, height, inkPixels)

  return {
    name: '',
    inkDensity,
    aspectRatio,
    centerOfMassX,
    centerOfMassY,
    horizontalSymmetry,
    verticalSymmetry,
    edgeRatio,
  }
}

/**
 * Calculate horizontal (left-right) symmetry
 */
function calculateHorizontalSymmetry(inkMap: boolean[][], width: number, height: number): number {
  let matches = 0
  let total = 0
  const halfWidth = Math.floor(width / 2)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < halfWidth; col++) {
      const mirrorCol = width - 1 - col
      const left = inkMap[row][col]
      const right = inkMap[row][mirrorCol]

      if (left || right) {
        total++
        if (left === right) matches++
      }
    }
  }

  return total > 0 ? matches / total : 0
}

/**
 * Calculate vertical (top-bottom) symmetry
 */
function calculateVerticalSymmetry(inkMap: boolean[][], width: number, height: number): number {
  let matches = 0
  let total = 0
  const halfHeight = Math.floor(height / 2)

  for (let row = 0; row < halfHeight; row++) {
    const mirrorRow = height - 1 - row
    for (let col = 0; col < width; col++) {
      const top = inkMap[row][col]
      const bottom = inkMap[mirrorRow][col]

      if (top || bottom) {
        total++
        if (top === bottom) matches++
      }
    }
  }

  return total > 0 ? matches / total : 0
}

/**
 * Calculate ratio of edge pixels (pixels with at least one non-ink neighbor)
 */
function calculateEdgeRatio(
  inkMap: boolean[][],
  width: number,
  height: number,
  totalInk: number
): number {
  if (totalInk === 0) return 0

  let edgePixels = 0

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!inkMap[row][col]) continue

      // Check if this ink pixel has any non-ink neighbor
      const hasNonInkNeighbor =
        (row > 0 && !inkMap[row - 1][col]) ||
        (row < height - 1 && !inkMap[row + 1][col]) ||
        (col > 0 && !inkMap[row][col - 1]) ||
        (col < width - 1 && !inkMap[row][col + 1])

      if (hasNonInkNeighbor) edgePixels++
    }
  }

  return edgePixels / totalInk
}

// =============================================================================
// Icon Matching
// =============================================================================

/**
 * Calculate distance between two icon fingerprints
 */
function fingerprintDistance(a: IconFingerprint, b: IconFingerprint): number {
  // Weight each feature
  const weights = {
    inkDensity: 2.0,
    aspectRatio: 1.0,
    centerOfMassX: 1.5,
    centerOfMassY: 1.5,
    horizontalSymmetry: 1.0,
    verticalSymmetry: 1.0,
    edgeRatio: 1.5,
  }

  let sumSquaredDiff = 0
  let totalWeight = 0

  // Ink density
  sumSquaredDiff += weights.inkDensity * Math.pow(a.inkDensity - b.inkDensity, 2)
  totalWeight += weights.inkDensity

  // Aspect ratio (normalize to 0-1 range)
  const aspectDiff =
    Math.abs(a.aspectRatio - b.aspectRatio) / Math.max(a.aspectRatio, b.aspectRatio)
  sumSquaredDiff += weights.aspectRatio * Math.pow(aspectDiff, 2)
  totalWeight += weights.aspectRatio

  // Center of mass
  sumSquaredDiff += weights.centerOfMassX * Math.pow(a.centerOfMassX - b.centerOfMassX, 2)
  totalWeight += weights.centerOfMassX
  sumSquaredDiff += weights.centerOfMassY * Math.pow(a.centerOfMassY - b.centerOfMassY, 2)
  totalWeight += weights.centerOfMassY

  // Symmetry
  sumSquaredDiff +=
    weights.horizontalSymmetry * Math.pow(a.horizontalSymmetry - b.horizontalSymmetry, 2)
  totalWeight += weights.horizontalSymmetry
  sumSquaredDiff += weights.verticalSymmetry * Math.pow(a.verticalSymmetry - b.verticalSymmetry, 2)
  totalWeight += weights.verticalSymmetry

  // Edge ratio
  sumSquaredDiff += weights.edgeRatio * Math.pow(a.edgeRatio - b.edgeRatio, 2)
  totalWeight += weights.edgeRatio

  return Math.sqrt(sumSquaredDiff / totalWeight)
}

/**
 * Find the best matching icon from a library of fingerprints
 */
export function matchIcon(features: IconFingerprint, library: IconFingerprint[]): IconMatch {
  let bestMatch = library[0]
  let bestDistance = Infinity

  for (const icon of library) {
    const distance = fingerprintDistance(features, icon)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = icon
    }
  }

  // Convert distance to confidence (0-100)
  // Distance 0 = 100% confidence, distance 0.3+ = low confidence
  const confidence = Math.max(0, Math.min(100, (1 - bestDistance * 3) * 100))

  return {
    name: bestMatch?.name || 'unknown',
    distance: bestDistance,
    confidence,
  }
}

// =============================================================================
// Library Management
// =============================================================================

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let iconLibrary: IconFingerprint[] = []

/**
 * Load icon fingerprint library from JSON file
 */
export function loadIconLibraryFromFile(): boolean {
  try {
    const libraryPath = path.join(__dirname, 'icon-library.json')
    if (fs.existsSync(libraryPath)) {
      const data = fs.readFileSync(libraryPath, 'utf-8')
      iconLibrary = JSON.parse(data)
      return true
    }
  } catch (err) {
    console.error('Failed to load icon library:', err)
  }
  return false
}

/**
 * Load icon fingerprint library from array
 */
export function loadIconLibrary(fingerprints: IconFingerprint[]): void {
  iconLibrary = fingerprints
}

/**
 * Get the current icon library
 */
export function getIconLibrary(): IconFingerprint[] {
  return iconLibrary
}

/**
 * Check if library is loaded
 */
export function isLibraryLoaded(): boolean {
  return iconLibrary.length > 0
}

/**
 * Match an icon against the loaded library
 */
export function identifyIcon(features: IconFingerprint): IconMatch {
  if (iconLibrary.length === 0) {
    return { name: 'unknown', distance: 1, confidence: 0 }
  }
  return matchIcon(features, iconLibrary)
}
