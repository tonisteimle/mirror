/**
 * Nested Rectangle Analyzer - Schritt 1
 *
 * Erkennt verschachtelte Rechtecke und generiert hierarchischen Mirror-Code.
 */

import type { RenderedImage, AnalysisResult, ImageAnalyzer } from '../types'
import { extractFontFeatures, detectFontFamily, detectFontWeight } from '../font-recognition'
import {
  extractIconFeatures,
  identifyIcon,
  loadIconLibraryFromFile,
  isLibraryLoaded,
  type IconFingerprint,
} from '../icon-recognition'

// =============================================================================
// Types
// =============================================================================

interface Pixel {
  r: number
  g: number
  b: number
  a: number
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

interface Border {
  width: number
  color: string
}

interface Layout {
  direction: 'hor' | 'ver'
  gap: number
}

interface Padding {
  top: number
  right: number
  bottom: number
  left: number
}

interface TextElement {
  content: string
  bounds: Bounds
  fontSize: number
  color: string
  confidence: number
  fontFamily?: 'sans' | 'serif' | 'mono'
  fontWeight?: 'light' | 'normal' | 'bold'
}

interface IconElement {
  bounds: Bounds
  size: number // Icon size (is property)
  color: string // Icon color (ic property)
  name?: string // Icon name if recognized (future: icon matching)
}

interface Rectangle {
  bounds: Bounds
  color: string
  alignment?: string // center, tl, tc, tr, cl, cr, bl, bc, br
  border?: Border
  radius?: number
  padding?: Padding // Padding between this rect and its children
  layout?: Layout // Layout info when multiple children exist
  children: Rectangle[]
  texts: TextElement[] // Detected text elements
  icons: IconElement[] // Detected icon elements
}

// =============================================================================
// Pixel Utilities
// =============================================================================

async function getPixels(
  buffer: Buffer
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(buffer)
  return {
    data: new Uint8Array(image.bitmap.data),
    width: image.width,
    height: image.height,
  }
}

function getPixelAt(data: Uint8Array, width: number, x: number, y: number): Pixel {
  const idx = (y * width + x) * 4
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function pixelsEqual(a: Pixel, b: Pixel, tolerance = 2): boolean {
  return (
    Math.abs(a.r - b.r) <= tolerance &&
    Math.abs(a.g - b.g) <= tolerance &&
    Math.abs(a.b - b.b) <= tolerance
  )
}

function pixelToHex(p: Pixel): string {
  return rgbToHex(p.r, p.g, p.b)
}

function hexToPixel(hex: string): Pixel {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
    a: 255,
  }
}

// =============================================================================
// Text Detection (Tesseract.js)
// =============================================================================

let tesseractWorker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null

/**
 * Initialize Tesseract worker (lazy, singleton)
 */
async function getTesseractWorker() {
  if (!tesseractWorker) {
    const { createWorker } = await import('tesseract.js')
    tesseractWorker = await createWorker('eng')
  }
  return tesseractWorker
}

/**
 * Detect text in a region of the image
 * Returns array of detected text elements with bounds and estimated font size
 */
async function detectTexts(
  buffer: Buffer,
  region: Bounds,
  bgColor: Pixel,
  data: Uint8Array,
  imageWidth: number,
  debug = false
): Promise<TextElement[]> {
  const texts: TextElement[] = []

  try {
    const worker = await getTesseractWorker()

    // Recognize text in the image
    const result = await worker.recognize(buffer, {
      rectangle: {
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      },
    })

    // Get the detected text
    const detectedText = result.data.text?.trim() || ''

    if (debug) {
      console.log(`[OCR] Region: ${region.x},${region.y} ${region.width}x${region.height}`)
      console.log(`[OCR] Result text: "${detectedText}"`)
    }

    // If no text detected, return empty
    if (!detectedText) return []

    // Filter out false positives:
    // - Single punctuation characters are likely noise from borders/edges
    // - Very short non-word text is likely noise (but keep currency, percentages, etc.)
    const isNoise =
      detectedText.length === 1 && /[|\\\/\-_=+*#@\[\]{}()<>,.;:'"!?]/.test(detectedText)

    // Allow: letters, numbers, currency ($€£), percentages (%), prices ($12,450), times, etc.
    const isValidShortText = /^[$€£%+\-]?[a-zA-Z0-9]/.test(detectedText)
    const isShortNonWord = detectedText.length <= 2 && !isValidShortText

    if (isNoise || isShortNonWord) {
      if (debug) {
        console.log(`[OCR] Filtered out noise: "${detectedText}"`)
      }
      return []
    }

    // Split multi-line text into separate lines
    const lines = detectedText.split('\n').filter(line => line.trim())

    if (debug) {
      console.log(`[OCR] Detected ${lines.length} lines:`, lines)
    }

    // Find text bounds with margin to exclude edge pixels (rounded corners, anti-aliasing)
    // Use larger margin for smaller regions to avoid corner artifacts
    const margin = Math.max(3, Math.min(10, Math.floor(Math.min(region.width, region.height) / 10)))
    const searchRegion: Bounds = {
      x: region.x + margin,
      y: region.y + margin,
      width: region.width - margin * 2,
      height: region.height - margin * 2,
    }
    const overallTextBounds = findTextBounds(data, imageWidth, searchRegion, bgColor)

    if (debug) {
      console.log(`[OCR] Search margin: ${margin}`)
    }

    if (debug) {
      console.log(`[OCR] Overall text bounds:`, overallTextBounds)
    }

    // Get page-level confidence from Tesseract
    const pageConfidence = result.data.confidence || 0

    if (debug) {
      console.log(`[OCR] Page confidence: ${pageConfidence}`)
    }

    if (overallTextBounds && lines.length === 1) {
      // Single line text - use detected bounds
      // Font-size estimation: cap-height (uppercase) is ~70% of em-height
      // x-height (lowercase) is ~50% of em-height
      const hasUppercase = /[A-Z]/.test(lines[0])
      const hasDescenders = /[gjpqy]/.test(lines[0])
      let fontSize: number
      if (hasUppercase) {
        // Text height ≈ cap-height ≈ 70% of font-size, so font-size ≈ height / 0.7
        fontSize = Math.round(overallTextBounds.height / 0.7)
      } else if (hasDescenders) {
        // With descenders, height includes both x-height and descender
        fontSize = Math.round(overallTextBounds.height / 0.85)
      } else {
        // Lowercase without descenders: height ≈ x-height ≈ 50% of font-size
        fontSize = Math.round(overallTextBounds.height / 0.5)
      }
      // Clamp to reasonable range and round to common sizes
      fontSize = roundToCommonFontSize(fontSize)

      const textColor = detectTextColor(data, imageWidth, overallTextBounds, bgColor)

      // Detect font family and weight
      const fontFeatures = extractFontFeatures(data, imageWidth, overallTextBounds, {
        r: bgColor.r,
        g: bgColor.g,
        b: bgColor.b,
      })
      const fontFamily = detectFontFamily(fontFeatures, lines[0])
      const rawWeight = detectFontWeight(
        fontFeatures.weight || 0,
        fontSize,
        fontFeatures.strokeWidthMean
      )
      // Map to Mirror's weight values (light, normal, bold)
      const fontWeight =
        rawWeight === 'thin' || rawWeight === 'light'
          ? 'light'
          : rawWeight === 'bold' || rawWeight === 'semibold' || rawWeight === 'black'
            ? 'bold'
            : 'normal'

      texts.push({
        content: lines[0],
        bounds: overallTextBounds,
        fontSize,
        color: pixelToHex(textColor),
        confidence: pageConfidence,
        fontFamily: fontFamily !== 'sans' ? fontFamily : undefined, // sans is default
        fontWeight: fontWeight !== 'normal' ? fontWeight : undefined, // normal is default
      })
    } else if (overallTextBounds && lines.length > 1) {
      // Multiple lines - estimate bounds for each line
      const lineHeight = overallTextBounds.height / lines.length

      for (let i = 0; i < lines.length; i++) {
        const lineY = overallTextBounds.y + i * lineHeight
        const lineBounds: Bounds = {
          x: overallTextBounds.x,
          y: Math.round(lineY),
          width: overallTextBounds.width,
          height: Math.round(lineHeight),
        }

        // Find actual bounds for this line
        const actualLineBounds = findTextBounds(data, imageWidth, lineBounds, bgColor)

        if (actualLineBounds) {
          const hasUppercase = /[A-Z]/.test(lines[i])
          const hasDescenders = /[gjpqy]/.test(lines[i])
          let fontSize: number
          if (hasUppercase) {
            fontSize = Math.round(actualLineBounds.height / 0.7)
          } else if (hasDescenders) {
            fontSize = Math.round(actualLineBounds.height / 0.85)
          } else {
            fontSize = Math.round(actualLineBounds.height / 0.5)
          }
          fontSize = roundToCommonFontSize(fontSize)

          const textColor = detectTextColor(data, imageWidth, actualLineBounds, bgColor)

          // Detect font family and weight
          const fontFeatures = extractFontFeatures(data, imageWidth, actualLineBounds, {
            r: bgColor.r,
            g: bgColor.g,
            b: bgColor.b,
          })
          const fontFamily = detectFontFamily(fontFeatures, lines[i])
          const rawWeight = detectFontWeight(
            fontFeatures.weight || 0,
            fontSize,
            fontFeatures.strokeWidthMean
          )
          const fontWeight =
            rawWeight === 'thin' || rawWeight === 'light'
              ? 'light'
              : rawWeight === 'bold' || rawWeight === 'semibold' || rawWeight === 'black'
                ? 'bold'
                : 'normal'

          texts.push({
            content: lines[i],
            bounds: actualLineBounds,
            fontSize,
            color: pixelToHex(textColor),
            confidence: pageConfidence,
            fontFamily: fontFamily !== 'sans' ? fontFamily : undefined,
            fontWeight: fontWeight !== 'normal' ? fontWeight : undefined,
          })
        }
      }
    } else {
      // Fallback: use the entire region for the detected text
      const fontSize = estimateFontSizeFromRegion(region, detectedText)
      const textColor = detectTextColor(data, imageWidth, region, bgColor)

      // Detect font family and weight
      const fontFeatures = extractFontFeatures(data, imageWidth, region, {
        r: bgColor.r,
        g: bgColor.g,
        b: bgColor.b,
      })
      const fontFamily = detectFontFamily(fontFeatures, detectedText)
      const rawWeight = detectFontWeight(
        fontFeatures.weight || 0,
        fontSize,
        fontFeatures.strokeWidthMean
      )
      const fontWeight =
        rawWeight === 'thin' || rawWeight === 'light'
          ? 'light'
          : rawWeight === 'bold' || rawWeight === 'semibold' || rawWeight === 'black'
            ? 'bold'
            : 'normal'

      texts.push({
        content: detectedText,
        bounds: region,
        fontSize,
        color: pixelToHex(textColor),
        confidence: pageConfidence,
        fontFamily: fontFamily !== 'sans' ? fontFamily : undefined,
        fontWeight: fontWeight !== 'normal' ? fontWeight : undefined,
      })
    }

    // Merge words that are on the same line into phrases
    return mergeWordsIntoLines(texts)
  } catch {
    // OCR failed, return empty array
    return []
  }
}

/**
 * Find the actual bounding box of text (non-background pixels) within a region
 */
function findTextBounds(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel
): Bounds | null {
  let minX = region.x + region.width
  let minY = region.y + region.height
  let maxX = region.x - 1
  let maxY = region.y - 1

  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const pixel = getPixelAt(data, imageWidth, x, y)
      // Skip background-colored pixels (with tolerance for anti-aliasing)
      if (!pixelsEqual(pixel, bgColor, 30)) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  // No text found
  if (maxX < region.x || maxY < region.y) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

/**
 * Estimate font size from region height and text content
 */
function estimateFontSizeFromRegion(region: Bounds, text: string): number {
  const lines = text.split('\n').length
  const heightPerLine = region.height / lines
  const hasUppercase = /[A-Z]/.test(text)

  // Use same logic as main text detection
  let fontSize: number
  if (hasUppercase) {
    fontSize = Math.round(heightPerLine / 0.7)
  } else {
    fontSize = Math.round(heightPerLine / 0.5)
  }

  return roundToCommonFontSize(fontSize)
}

/**
 * Round font size to common values for better accuracy
 * Common font sizes: 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72
 */
function roundToCommonFontSize(size: number): number {
  const commonSizes = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96]

  // Find closest common size
  let closest = commonSizes[0]
  let minDiff = Math.abs(size - closest)

  for (const common of commonSizes) {
    const diff = Math.abs(size - common)
    if (diff < minDiff) {
      minDiff = diff
      closest = common
    }
  }

  // Only snap if within 2px of a common size
  if (minDiff <= 2) {
    return closest
  }

  return size
}

/**
 * Detect text color by finding the most common non-background color in the text region
 */
function detectTextColor(
  data: Uint8Array,
  imageWidth: number,
  bounds: Bounds,
  bgColor: Pixel
): Pixel {
  const colorCounts = new Map<string, { count: number; pixel: Pixel }>()

  // Sample pixels in the text region
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      const pixel = getPixelAt(data, imageWidth, x, y)

      // Skip background-colored pixels
      if (pixelsEqual(pixel, bgColor, 30)) continue

      const key = `${Math.round(pixel.r / 10)},${Math.round(pixel.g / 10)},${Math.round(pixel.b / 10)}`
      const existing = colorCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        colorCounts.set(key, { count: 1, pixel })
      }
    }
  }

  // Return most common non-background color
  let best: Pixel = { r: 0, g: 0, b: 0, a: 255 }
  let maxCount = 0
  for (const { count, pixel } of colorCounts.values()) {
    if (count > maxCount) {
      maxCount = count
      best = pixel
    }
  }

  return best
}

// =============================================================================
// Icon Detection
// =============================================================================

/**
 * Normalize icon size to common values
 * Icons typically come in standard sizes: 12, 16, 20, 24, 32, 48, 64
 */
function normalizeIconSize(size: number): number {
  const commonSizes = [12, 16, 20, 24, 32, 48, 64]

  // Find the closest common size
  let closest = commonSizes[0]
  let minDiff = Math.abs(size - closest)

  for (const common of commonSizes) {
    const diff = Math.abs(size - common)
    if (diff < minDiff) {
      minDiff = diff
      closest = common
    }
  }

  return closest
}

/**
 * Detect icons in a region
 * Icons are characterized by:
 * - Small, roughly square bounds (12-64px)
 * - Low ink density (0.05-0.25) - thin lines
 * - Single dominant color (monochrome)
 */
function detectIcons(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel,
  debug = false
): IconElement[] {
  const icons: IconElement[] = []

  if (debug) {
    console.log(
      `[Icon] Detecting in region: ${region.x},${region.y} ${region.width}x${region.height}`
    )
  }

  // Find potential icon regions (small, roughly square areas with content)
  const potentialIcons = findPotentialIconRegions(data, imageWidth, region, bgColor, debug)

  if (debug) {
    console.log(`[Icon] Found ${potentialIcons.length} potential icons`)
  }

  for (const iconBounds of potentialIcons) {
    // Validate icon characteristics
    const analysis = analyzeIconRegion(data, imageWidth, iconBounds, bgColor)

    if (debug) {
      console.log(
        `[Icon] Bounds: ${iconBounds.width}x${iconBounds.height}, density: ${analysis.inkDensity.toFixed(3)}, isIcon: ${analysis.isIcon}`
      )
    }

    if (analysis.isIcon) {
      // Calculate average size and normalize to common icon sizes
      // Icons have internal padding, so visible strokes are ~80% of declared size
      // Multiply by 1.25 to estimate the declared icon size
      const avgSize = (iconBounds.width + iconBounds.height) / 2
      const estimatedDeclaredSize = avgSize * 1.25
      const normalizedSize = normalizeIconSize(estimatedDeclaredSize)

      // Try to identify the icon using fingerprint matching
      let iconName: string | undefined
      if (analysis.fingerprint && isLibraryLoaded()) {
        const match = identifyIcon(analysis.fingerprint)
        // Only use the match if confidence is reasonable (> 50%)
        if (match.confidence > 50) {
          iconName = match.name
          if (debug) {
            console.log(
              `[Icon] Identified: ${match.name} (${match.confidence.toFixed(0)}% confidence)`
            )
          }
        }
      }

      icons.push({
        bounds: iconBounds,
        size: normalizedSize,
        color: analysis.color,
        name: iconName,
      })
    }
  }

  return icons
}

/**
 * Find potential icon regions by looking for small, isolated content areas
 * Handles multiple icons by scanning for separate content clusters
 */
function findPotentialIconRegions(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel,
  debug = false
): Bounds[] {
  const regions: Bounds[] = []

  // Scan for vertical gaps to separate horizontally arranged icons
  const verticalGaps: number[] = []
  for (let x = region.x; x < region.x + region.width; x++) {
    let isGap = true
    for (let y = region.y; y < region.y + region.height; y++) {
      const pixel = getPixelAt(data, imageWidth, x, y)
      if (!pixelsEqual(pixel, bgColor, 30)) {
        isGap = false
        break
      }
    }
    if (isGap) verticalGaps.push(x)
  }

  if (debug) {
    console.log(`[Icon] Vertical gaps: ${verticalGaps.length}`)
  }

  // Find content segments between gaps
  const segments = findContentSegments(verticalGaps, region.x, region.x + region.width)

  if (debug) {
    console.log(`[Icon] Segments: ${segments.length}`, segments)
  }

  for (const [startX, endX] of segments) {
    const segmentRegion: Bounds = {
      x: startX,
      y: region.y,
      width: endX - startX,
      height: region.height,
    }

    const contentBounds = findTextBounds(data, imageWidth, segmentRegion, bgColor)
    if (!contentBounds) continue

    const minSize = 12
    const maxSize = 64
    const width = contentBounds.width
    const height = contentBounds.height

    // Icons are typically small and roughly square
    const aspectRatio = Math.max(width, height) / Math.min(width, height)
    const isSquarish = aspectRatio <= 1.5 // Allow some flexibility
    const isSmallEnough = Math.max(width, height) <= maxSize
    const isLargeEnough = Math.min(width, height) >= minSize

    if (isSquarish && isSmallEnough && isLargeEnough) {
      regions.push(contentBounds)
    }
  }

  return regions
}

/**
 * Find content segments between gaps
 * Returns array of [start, end] positions
 * Minimum gap size of 8px to avoid false segmentation from anti-aliasing
 */
function findContentSegments(gaps: number[], start: number, end: number): [number, number][] {
  if (gaps.length === 0) return [[start, end]]

  // Create a simple array of "is gap" for each position
  const gapSet = new Set(gaps)

  // Find content segments by walking through and detecting transitions
  const segments: [number, number][] = []
  let inContent = false
  let contentStart = start

  // Minimum gap size to be considered a real separator (not anti-aliasing)
  const MIN_GAP_SIZE = 8

  for (let x = start; x < end; x++) {
    const isGap = gapSet.has(x)

    if (!isGap && !inContent) {
      // Start of content
      inContent = true
      contentStart = x
    } else if (isGap && inContent) {
      // End of content (start of gap)
      // Only end if gap is significant (check next few pixels)
      let gapLength = 0
      for (let gx = x; gx < end && gapSet.has(gx); gx++) {
        gapLength++
      }
      if (gapLength >= MIN_GAP_SIZE) {
        // Significant gap - end current segment
        segments.push([contentStart, x])
        inContent = false
      }
      // Skip the rest of the gap
      x += gapLength - 1
    }
  }

  // Handle final segment
  if (inContent) {
    segments.push([contentStart, end])
  }

  return segments.length > 0 ? segments : [[start, end]]
}

/**
 * Analyze a region to determine if it's likely an icon
 * Returns ink density, dominant color, fingerprint features, and whether it appears to be an icon
 */
function analyzeIconRegion(
  data: Uint8Array,
  imageWidth: number,
  bounds: Bounds,
  bgColor: Pixel
): { isIcon: boolean; inkDensity: number; color: string; fingerprint?: IconFingerprint } {
  let inkPixels = 0
  let totalPixels = 0
  let sumX = 0
  let sumY = 0
  const colorCounts = new Map<string, { count: number; pixel: Pixel }>()
  const inkMap: boolean[][] = []

  // Initialize ink map
  for (let row = 0; row < bounds.height; row++) {
    inkMap[row] = new Array(bounds.width).fill(false)
  }

  // Sample all pixels in the region
  for (let row = 0; row < bounds.height; row++) {
    for (let col = 0; col < bounds.width; col++) {
      const x = bounds.x + col
      const y = bounds.y + row
      const pixel = getPixelAt(data, imageWidth, x, y)
      totalPixels++

      // Skip background pixels
      if (pixelsEqual(pixel, bgColor, 30)) continue

      inkPixels++
      sumX += col
      sumY += row
      inkMap[row][col] = true

      // Group similar colors (quantize)
      const key = `${Math.round(pixel.r / 20)},${Math.round(pixel.g / 20)},${Math.round(pixel.b / 20)}`
      const existing = colorCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        colorCounts.set(key, { count: 1, pixel })
      }
    }
  }

  const inkDensity = totalPixels > 0 ? inkPixels / totalPixels : 0

  // Find dominant color
  let dominantColor: Pixel = { r: 0, g: 0, b: 0, a: 255 }
  let maxCount = 0
  for (const { count, pixel } of colorCounts.values()) {
    if (count > maxCount) {
      maxCount = count
      dominantColor = pixel
    }
  }

  // Check if it's monochrome (one dominant color makes up most of the ink)
  const dominantRatio = totalPixels > 0 ? maxCount / inkPixels : 0
  const isMonochrome = dominantRatio > 0.5 // Most ink is one color

  // Icon characteristics:
  // - Low to medium ink density (thin lines, not filled)
  // - Mostly monochrome
  // Icons typically have density between 0.05 and 0.55 (stroked shapes with some fill)
  const isLowDensity = inkDensity >= 0.05 && inkDensity <= 0.55

  const isIcon = isLowDensity && isMonochrome

  // Calculate fingerprint features for icon identification
  let fingerprint: IconFingerprint | undefined
  if (isIcon && inkPixels > 0) {
    // Center of mass
    const centerOfMassX = sumX / inkPixels / bounds.width
    const centerOfMassY = sumY / inkPixels / bounds.height

    // Calculate symmetry
    const horizontalSymmetry = calculateIconSymmetry(
      inkMap,
      bounds.width,
      bounds.height,
      'horizontal'
    )
    const verticalSymmetry = calculateIconSymmetry(inkMap, bounds.width, bounds.height, 'vertical')

    // Calculate edge ratio
    let edgePixels = 0
    for (let row = 0; row < bounds.height; row++) {
      for (let col = 0; col < bounds.width; col++) {
        if (!inkMap[row][col]) continue
        const hasNonInkNeighbor =
          (row > 0 && !inkMap[row - 1][col]) ||
          (row < bounds.height - 1 && !inkMap[row + 1][col]) ||
          (col > 0 && !inkMap[row][col - 1]) ||
          (col < bounds.width - 1 && !inkMap[row][col + 1])
        if (hasNonInkNeighbor) edgePixels++
      }
    }
    const edgeRatio = inkPixels > 0 ? edgePixels / inkPixels : 0

    fingerprint = {
      name: '',
      inkDensity,
      aspectRatio: bounds.width / bounds.height,
      centerOfMassX,
      centerOfMassY,
      horizontalSymmetry,
      verticalSymmetry,
      edgeRatio,
    }
  }

  return {
    isIcon,
    inkDensity,
    color: pixelToHex(dominantColor),
    fingerprint,
  }
}

/**
 * Calculate symmetry for icon fingerprinting
 */
function calculateIconSymmetry(
  inkMap: boolean[][],
  width: number,
  height: number,
  direction: 'horizontal' | 'vertical'
): number {
  let matches = 0
  let total = 0

  if (direction === 'horizontal') {
    const half = Math.floor(width / 2)
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < half; col++) {
        const mirrorCol = width - 1 - col
        const left = inkMap[row]?.[col] || false
        const right = inkMap[row]?.[mirrorCol] || false
        if (left || right) {
          total++
          if (left === right) matches++
        }
      }
    }
  } else {
    const half = Math.floor(height / 2)
    for (let row = 0; row < half; row++) {
      const mirrorRow = height - 1 - row
      for (let col = 0; col < width; col++) {
        const top = inkMap[row]?.[col] || false
        const bottom = inkMap[mirrorRow]?.[col] || false
        if (top || bottom) {
          total++
          if (top === bottom) matches++
        }
      }
    }
  }

  return total > 0 ? matches / total : 0
}

/**
 * Merge words that are on the same line into single text elements
 */
function mergeWordsIntoLines(texts: TextElement[]): TextElement[] {
  if (texts.length <= 1) return texts

  // Sort by Y position, then X position
  const sorted = [...texts].sort((a, b) => {
    const yDiff = a.bounds.y - b.bounds.y
    if (Math.abs(yDiff) < 10) return a.bounds.x - b.bounds.x
    return yDiff
  })

  const merged: TextElement[] = []
  let current: TextElement | null = null

  for (const text of sorted) {
    if (!current) {
      current = { ...text }
      continue
    }

    // Check if this word is on the same line (similar Y position)
    const sameLine = Math.abs(text.bounds.y - current.bounds.y) < current.bounds.height * 0.5

    if (sameLine) {
      // Merge into current line
      current.content += ' ' + text.content
      current.bounds.width = text.bounds.x + text.bounds.width - current.bounds.x
      current.confidence = Math.min(current.confidence, text.confidence)
    } else {
      // Start new line
      merged.push(current)
      current = { ...text }
    }
  }

  if (current) merged.push(current)

  return merged
}

// =============================================================================
// Analysis Functions
// =============================================================================

/**
 * Get background color from corners
 */
function getBackgroundColor(data: Uint8Array, width: number, height: number): Pixel {
  const corners = [
    getPixelAt(data, width, 0, 0),
    getPixelAt(data, width, width - 1, 0),
    getPixelAt(data, width, 0, height - 1),
    getPixelAt(data, width, width - 1, height - 1),
  ]

  const counts = new Map<string, { count: number; pixel: Pixel }>()
  for (const p of corners) {
    const key = `${p.r},${p.g},${p.b}`
    const existing = counts.get(key)
    if (existing) existing.count++
    else counts.set(key, { count: 1, pixel: p })
  }

  let best = corners[0]
  let maxCount = 0
  for (const { count, pixel } of counts.values()) {
    if (count > maxCount) {
      maxCount = count
      best = pixel
    }
  }
  return best
}

/**
 * Find bounding box of non-background pixels within a region
 */
function findBoundingBox(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel
): Bounds | null {
  let minX = region.x + region.width
  let minY = region.y + region.height
  let maxX = region.x - 1
  let maxY = region.y - 1

  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const pixel = getPixelAt(data, imageWidth, x, y)
      if (!pixelsEqual(pixel, bgColor)) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < region.x) return null

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/**
 * Get fill color by sampling at multiple depths from edges
 * Skips border pixels and finds the actual fill color
 */
function getColorAt(data: Uint8Array, imageWidth: number, bounds: Bounds): Pixel {
  const samples: Pixel[] = []
  const midX = bounds.x + Math.floor(bounds.width / 2)
  const midY = bounds.y + Math.floor(bounds.height / 2)

  // Sample at multiple depths: 4, 6, 8 pixels from edge
  // This skips typical borders (1-3px) and finds the fill
  const depths = [4, 6, 8]
  const maxDepth = Math.min(Math.floor(bounds.width / 4), Math.floor(bounds.height / 4), 10)

  for (const depth of depths) {
    if (depth > maxDepth) continue

    // Sample from middle of each edge at this depth
    samples.push(getPixelAt(data, imageWidth, midX, bounds.y + depth)) // Top
    samples.push(getPixelAt(data, imageWidth, midX, bounds.y + bounds.height - 1 - depth)) // Bottom
    samples.push(getPixelAt(data, imageWidth, bounds.x + depth, midY)) // Left
    samples.push(getPixelAt(data, imageWidth, bounds.x + bounds.width - 1 - depth, midY)) // Right
  }

  // Fallback: if rectangle is small, sample from closer to edge
  if (samples.length === 0) {
    const offset = Math.max(1, Math.floor(Math.min(bounds.width, bounds.height) / 4))
    samples.push(getPixelAt(data, imageWidth, midX, bounds.y + offset))
    samples.push(getPixelAt(data, imageWidth, midX, bounds.y + bounds.height - 1 - offset))
    samples.push(getPixelAt(data, imageWidth, bounds.x + offset, midY))
    samples.push(getPixelAt(data, imageWidth, bounds.x + bounds.width - 1 - offset, midY))
  }

  // Find most common color
  const counts = new Map<string, { count: number; pixel: Pixel }>()
  for (const p of samples) {
    const key = `${p.r},${p.g},${p.b}`
    const existing = counts.get(key)
    if (existing) existing.count++
    else counts.set(key, { count: 1, pixel: p })
  }

  let best = samples[0]
  let maxCount = 0
  for (const { count, pixel } of counts.values()) {
    if (count > maxCount) {
      maxCount = count
      best = pixel
    }
  }

  return best
}

/**
 * Detect alignment of child within parent bounds
 * Returns: center, tl, tc, tr, cl, cr, bl, bc, br, or undefined
 */
function detectAlignment(parent: Bounds, child: Bounds, tolerance = 3): string | undefined {
  // Calculate centers
  const parentCenterX = parent.x + parent.width / 2
  const parentCenterY = parent.y + parent.height / 2
  const childCenterX = child.x + child.width / 2
  const childCenterY = child.y + child.height / 2

  // Calculate offsets from center
  const offsetX = childCenterX - parentCenterX
  const offsetY = childCenterY - parentCenterY

  // Determine horizontal position
  const isLeft = child.x - parent.x <= tolerance
  const isRight = parent.x + parent.width - (child.x + child.width) <= tolerance
  const isCenterX = Math.abs(offsetX) <= tolerance

  // Determine vertical position
  const isTop = child.y - parent.y <= tolerance
  const isBottom = parent.y + parent.height - (child.y + child.height) <= tolerance
  const isCenterY = Math.abs(offsetY) <= tolerance

  // Map to Mirror alignment properties
  if (isCenterX && isCenterY) return 'center'
  if (isTop && isLeft) return 'tl'
  if (isTop && isCenterX) return 'tc'
  if (isTop && isRight) return 'tr'
  if (isCenterY && isLeft) return 'cl'
  if (isCenterY && isRight) return 'cr'
  if (isBottom && isLeft) return 'bl'
  if (isBottom && isCenterX) return 'bc'
  if (isBottom && isRight) return 'br'

  return undefined
}

/**
 * Detect border around a rectangle
 * Compares edge pixels with interior pixels
 * Accounts for rounded corners by sampling from middle of edges
 */
function detectBorder(
  data: Uint8Array,
  imageWidth: number,
  bounds: Bounds,
  fillColor: Pixel
): Border | undefined {
  // Sample from the MIDDLE of each edge to avoid rounded corners
  const midX = bounds.x + Math.floor(bounds.width / 2)
  const midY = bounds.y + Math.floor(bounds.height / 2)

  // Get edge pixels from middle of each edge
  const edgePixels: Pixel[] = [
    getPixelAt(data, imageWidth, midX, bounds.y), // Top middle
    getPixelAt(data, imageWidth, midX, bounds.y + bounds.height - 1), // Bottom middle
    getPixelAt(data, imageWidth, bounds.x, midY), // Left middle
    getPixelAt(data, imageWidth, bounds.x + bounds.width - 1, midY), // Right middle
  ]

  // Find most common edge color
  const counts = new Map<string, { count: number; pixel: Pixel }>()
  for (const p of edgePixels) {
    const key = `${p.r},${p.g},${p.b}`
    const existing = counts.get(key)
    if (existing) existing.count++
    else counts.set(key, { count: 1, pixel: p })
  }

  let borderPixel: Pixel | null = null
  let maxCount = 0
  for (const { count, pixel } of counts.values()) {
    if (count > maxCount) {
      maxCount = count
      borderPixel = pixel
    }
  }

  if (!borderPixel) return undefined

  // Check if edge color differs from fill color
  if (pixelsEqual(borderPixel, fillColor, 5)) {
    return undefined // No border, edge is same as fill
  }

  // Measure border width by walking inward from middle of top edge
  // This avoids the rounded corner area
  let borderWidth = 1
  const maxBorderWidth = Math.min(10, Math.floor(bounds.width / 4), Math.floor(bounds.height / 4))

  for (let w = 1; w < maxBorderWidth; w++) {
    // Walk straight down from middle of top edge
    const innerY = bounds.y + w
    const innerPixel = getPixelAt(data, imageWidth, midX, innerY)

    if (pixelsEqual(innerPixel, borderPixel, 5)) {
      borderWidth = w + 1
    } else {
      break
    }
  }

  return {
    width: borderWidth,
    color: pixelToHex(borderPixel),
  }
}

/**
 * Detect border-radius by measuring where fill/border color starts at corners
 * Returns estimated radius or undefined if no rounding
 */
function detectRadius(
  data: Uint8Array,
  imageWidth: number,
  bounds: Bounds,
  fillColor: Pixel,
  bgColor: Pixel,
  borderColor?: Pixel
): number | undefined {
  // The "visible edge color" is either border color (if present) or fill color
  const edgeColor = borderColor || fillColor

  // Sample the corner pixel
  const cornerPixel = getPixelAt(data, imageWidth, bounds.x, bounds.y)

  // If corner is same as edge/fill color, no rounding (sharp corner)
  if (pixelsEqual(cornerPixel, edgeColor, 10)) {
    return undefined
  }

  // Sample a pixel in the middle of the top edge for reference
  const midEdgeX = bounds.x + Math.floor(bounds.width / 2)
  const midEdgePixel = getPixelAt(data, imageWidth, midEdgeX, bounds.y)

  // If corner matches middle of edge, no rounding
  if (pixelsEqual(cornerPixel, midEdgePixel, 10)) {
    return undefined
  }

  const maxRadius = Math.min(30, Math.floor(bounds.width / 2), Math.floor(bounds.height / 2))

  // Walk along edge and find where the pure EDGE COLOR starts
  // The radius is the position where we first see solid edge color
  const findRadiusTop = (): number => {
    for (let d = 0; d <= maxRadius; d++) {
      const x = bounds.x + d
      const pixel = getPixelAt(data, imageWidth, x, bounds.y)

      // Is this pixel the solid edge/fill color?
      // Use very tight tolerance to detect SOLID color only, not anti-aliased
      if (pixelsEqual(pixel, edgeColor, 2)) {
        return d
      }
    }
    return 0
  }

  // Same for left edge
  const findRadiusLeft = (): number => {
    for (let d = 0; d <= maxRadius; d++) {
      const y = bounds.y + d
      const pixel = getPixelAt(data, imageWidth, bounds.x, y)

      if (pixelsEqual(pixel, edgeColor, 2)) {
        return d
      }
    }
    return 0
  }

  // Diagonal approach - find where fill color starts (with geometry correction)
  const findRadiusDiagonal = (): number => {
    for (let d = 0; d <= maxRadius; d++) {
      const x = bounds.x + d
      const y = bounds.y + d
      const pixel = getPixelAt(data, imageWidth, x, y)

      if (pixelsEqual(pixel, edgeColor, 2)) {
        // From debug data: at rad=8, diagonal hits solid at d=3
        // r ≈ 8, d ≈ 3, ratio ≈ 2.67
        // This is approximately: r = d + sqrt(d * r)
        // Or empirically: r ≈ d * 2.5 to 3
        return Math.round(d * 2.7)
      }
    }
    return 0
  }

  const topRadius = findRadiusTop()
  const leftRadius = findRadiusLeft()
  const diagRadius = findRadiusDiagonal()

  // Use the maximum of edge-based measurements
  const edgeMeasurements = [topRadius, leftRadius].filter(r => r > 0)

  if (edgeMeasurements.length > 0) {
    const measured = Math.max(...edgeMeasurements)

    // The bounding box starts at the first visible (anti-aliased) pixel,
    // not at the geometric corner. Add +1 to compensate.
    const result = measured + 1

    // Minimum threshold
    if (result < 3) {
      return undefined
    }

    return result
  }

  // Fall back to diagonal if edge measurements fail
  if (diagRadius >= 3) {
    return diagRadius
  }

  return undefined
}

/**
 * Expand child bounds to parent edges if child is at margin boundary
 * This corrects for the margin used during detection
 */
function expandToEdges(child: Bounds, parent: Bounds, margin: number): Bounds {
  const result = { ...child }
  const threshold = margin + 1

  // Left edge
  if (child.x - parent.x <= threshold) {
    const diff = child.x - parent.x
    result.x = parent.x
    result.width += diff
  }

  // Top edge
  if (child.y - parent.y <= threshold) {
    const diff = child.y - parent.y
    result.y = parent.y
    result.height += diff
  }

  // Right edge
  const childRight = child.x + child.width
  const parentRight = parent.x + parent.width
  if (parentRight - childRight <= threshold) {
    result.width += parentRight - childRight
  }

  // Bottom edge
  const childBottom = child.y + child.height
  const parentBottom = parent.y + parent.height
  if (parentBottom - childBottom <= threshold) {
    result.height += parentBottom - childBottom
  }

  return result
}

interface ChildrenResult {
  bounds: Bounds[]
  layout?: Layout
  isTextRegion?: boolean // If true, bounds contain text, not nested UI elements
}

/**
 * Find all separate rectangles within a region
 * Uses horizontal/vertical scanning to find gaps and segment into individuals
 * Also returns layout info (direction and gap)
 */
function findAllRectanglesInRegion(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel
): ChildrenResult {
  const rectangles: Bounds[] = []

  // First, find the overall bounding box
  const overallBounds = findBoundingBox(data, imageWidth, region, bgColor)
  if (!overallBounds) return { bounds: rectangles }

  // Scan for vertical gaps (columns that are all background)
  // Use higher tolerance (15) to handle anti-aliasing at edges
  const GAP_TOLERANCE = 15
  const verticalGaps: number[] = []
  for (let x = overallBounds.x; x < overallBounds.x + overallBounds.width; x++) {
    let isGap = true
    for (let y = overallBounds.y; y < overallBounds.y + overallBounds.height; y++) {
      const pixel = getPixelAt(data, imageWidth, x, y)
      if (!pixelsEqual(pixel, bgColor, GAP_TOLERANCE)) {
        isGap = false
        break
      }
    }
    if (isGap) verticalGaps.push(x)
  }

  // Scan for horizontal gaps (rows that are all background)
  const horizontalGaps: number[] = []
  for (let y = overallBounds.y; y < overallBounds.y + overallBounds.height; y++) {
    let isGap = true
    for (let x = overallBounds.x; x < overallBounds.x + overallBounds.width; x++) {
      const pixel = getPixelAt(data, imageWidth, x, y)
      if (!pixelsEqual(pixel, bgColor, GAP_TOLERANCE)) {
        isGap = false
        break
      }
    }
    if (isGap) horizontalGaps.push(y)
  }

  // Determine if layout is horizontal or vertical based on gaps
  // Use SEGMENTS (the areas between gaps) to determine if there are multiple children
  // Key insight: 1 gap group = 2 segments, 2 gap groups = 3 segments, etc.
  const horizontalSegments = findSegments(
    horizontalGaps,
    overallBounds.y,
    overallBounds.y + overallBounds.height
  )
  const verticalSegments = findSegments(
    verticalGaps,
    overallBounds.x,
    overallBounds.x + overallBounds.width
  )

  let layout: Layout | undefined

  // Priority: More segments = more children in that direction
  // If there are 2+ horizontal segments, it's a vertical layout (stacked children)
  // If there are 2+ vertical segments, it's a horizontal layout (side-by-side children)
  if (horizontalSegments.length >= 2 && horizontalSegments.length >= verticalSegments.length) {
    // Vertical layout - split by horizontal gaps
    for (const [startY, endY] of horizontalSegments) {
      const segmentRegion: Bounds = {
        x: overallBounds.x,
        y: startY,
        width: overallBounds.width,
        height: endY - startY,
      }
      const bounds = findBoundingBox(data, imageWidth, segmentRegion, bgColor)
      if (bounds && bounds.width > 2 && bounds.height > 2) {
        rectangles.push(bounds)
      }
    }

    // Calculate gap if we have multiple children
    if (rectangles.length > 1) {
      const gap = calculateGap(rectangles, 'ver')
      layout = { direction: 'ver', gap }
    }
  } else if (verticalSegments.length >= 2) {
    // Horizontal layout - split by vertical gaps
    for (const [startX, endX] of verticalSegments) {
      const segmentRegion: Bounds = {
        x: startX,
        y: overallBounds.y,
        width: endX - startX,
        height: overallBounds.height,
      }
      const bounds = findBoundingBox(data, imageWidth, segmentRegion, bgColor)
      if (bounds && bounds.width > 2 && bounds.height > 2) {
        rectangles.push(bounds)
      }
    }

    // Calculate gap if we have multiple children
    if (rectangles.length > 1) {
      const gap = calculateGap(rectangles, 'hor')
      layout = { direction: 'hor', gap }
    }
  }

  // TEXT HEURISTIC: If we found many small rectangles with tiny gaps,
  // it's probably anti-aliased text, not real UI elements.
  // In this case, treat the whole region as a single element (will be text-detected later)
  // Be CONSERVATIVE - only apply if ALL rectangles are very small (< 20px)
  if (rectangles.length >= 5 && layout && layout.gap <= 2) {
    // Count how many rectangles are "very small" (likely text character fragments)
    const verySmallRects = rectangles.filter(r => r.width < 20 && r.height < 20)
    const smallRatio = verySmallRects.length / rectangles.length

    // Only treat as text if almost all rectangles (>= 80%) are very small
    if (smallRatio >= 0.8) {
      return { bounds: [overallBounds], isTextRegion: true }
    }
  }

  if (rectangles.length === 0) {
    // No gaps found - check for adjacent elements with different colors
    // This handles the case where elements are directly touching (gap=0)
    const adjacentResult = findAdjacentRectangles(data, imageWidth, overallBounds, bgColor)

    if (adjacentResult.bounds.length > 1) {
      return adjacentResult
    }

    // Check for nested children (child with padding inside parent)
    const nestedResult = findNestedChildren(data, imageWidth, overallBounds, bgColor)
    if (nestedResult.bounds.length > 0) {
      return nestedResult
    }

    // Single element
    rectangles.push(overallBounds)
  }

  return { bounds: rectangles, layout }
}

/**
 * Find nested children within a region by detecting color boundaries
 * Handles cases where a child has padding inside its parent
 */
function findNestedChildren(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel
): ChildrenResult {
  const children: Bounds[] = []

  // Sample the center of the region to get the "inner" color
  const centerX = region.x + Math.floor(region.width / 2)
  const centerY = region.y + Math.floor(region.height / 2)
  const centerColor = getPixelAt(data, imageWidth, centerX, centerY)

  // If center color is same as background, no nested child
  if (pixelsEqual(centerColor, bgColor, 10)) {
    return { bounds: children }
  }

  // Find the bounds of the inner colored region
  // Scan inward from each edge to find where the color changes
  let innerLeft = region.x
  let innerRight = region.x + region.width - 1
  let innerTop = region.y
  let innerBottom = region.y + region.height - 1

  // Find left edge of inner region
  for (let x = region.x; x < centerX; x++) {
    const pixel = getPixelAt(data, imageWidth, x, centerY)
    if (pixelsEqual(pixel, centerColor, 15)) {
      innerLeft = x
      break
    }
  }

  // Find right edge of inner region
  for (let x = region.x + region.width - 1; x > centerX; x--) {
    const pixel = getPixelAt(data, imageWidth, x, centerY)
    if (pixelsEqual(pixel, centerColor, 15)) {
      innerRight = x
      break
    }
  }

  // Find top edge of inner region
  for (let y = region.y; y < centerY; y++) {
    const pixel = getPixelAt(data, imageWidth, centerX, y)
    if (pixelsEqual(pixel, centerColor, 15)) {
      innerTop = y
      break
    }
  }

  // Find bottom edge of inner region
  for (let y = region.y + region.height - 1; y > centerY; y--) {
    const pixel = getPixelAt(data, imageWidth, centerX, y)
    if (pixelsEqual(pixel, centerColor, 15)) {
      innerBottom = y
      break
    }
  }

  const innerBounds: Bounds = {
    x: innerLeft,
    y: innerTop,
    width: innerRight - innerLeft + 1,
    height: innerBottom - innerTop + 1,
  }

  // Only consider it a nested child if it's meaningfully smaller than parent
  const widthPadding = (region.width - innerBounds.width) / 2
  const heightPadding = (region.height - innerBounds.height) / 2

  if (widthPadding >= 3 || heightPadding >= 3) {
    // Found a nested child
    children.push(innerBounds)
  }

  return { bounds: children }
}

/**
 * Find adjacent rectangles by detecting color transitions
 * Used when there are no background-colored gaps
 */
function findAdjacentRectangles(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel
): ChildrenResult {
  const rectangles: Bounds[] = []

  // Sample the middle row to detect horizontal color transitions
  const midY = region.y + Math.floor(region.height / 2)
  const colors: { x: number; color: Pixel }[] = []

  for (let x = region.x; x < region.x + region.width; x++) {
    const pixel = getPixelAt(data, imageWidth, x, midY)
    if (!pixelsEqual(pixel, bgColor, 5)) {
      colors.push({ x, color: pixel })
    }
  }

  if (colors.length < 2) {
    return { bounds: [region] }
  }

  // Find color transition points
  const transitionPoints: number[] = []
  let currentColor = colors[0].color

  for (let i = 1; i < colors.length; i++) {
    if (!pixelsEqual(colors[i].color, currentColor, 10)) {
      transitionPoints.push(colors[i].x)
      currentColor = colors[i].color
    }
  }

  if (transitionPoints.length === 0) {
    return { bounds: [region] }
  }

  // Validate that this is truly adjacent elements, not a parent-child relationship
  // For adjacent elements: each segment should span the FULL height
  // For parent-child: the "child" color only appears in the middle

  // Check if the first color spans the full height at the start
  const firstColor = colors[0].color
  let isValidAdjacent = true

  // Check top and bottom of region at the start position
  const topPixel = getPixelAt(data, imageWidth, colors[0].x, region.y)
  const bottomPixel = getPixelAt(data, imageWidth, colors[0].x, region.y + region.height - 1)

  if (!pixelsEqual(topPixel, firstColor, 15) || !pixelsEqual(bottomPixel, firstColor, 15)) {
    // First color doesn't span full height - likely a parent with nested child
    isValidAdjacent = false
  }

  // Also check if any transition color spans full height
  if (isValidAdjacent && transitionPoints.length > 0) {
    for (const transX of transitionPoints) {
      const transColor = getPixelAt(data, imageWidth, transX, midY)
      const transTop = getPixelAt(data, imageWidth, transX, region.y)
      const transBottom = getPixelAt(data, imageWidth, transX, region.y + region.height - 1)

      if (!pixelsEqual(transTop, transColor, 15) || !pixelsEqual(transBottom, transColor, 15)) {
        // This color doesn't span full height - not valid adjacent
        isValidAdjacent = false
        break
      }
    }
  }

  if (!isValidAdjacent) {
    return { bounds: [region] }
  }

  // Split region at transition points
  let startX = region.x
  for (const transX of transitionPoints) {
    const segmentRegion: Bounds = {
      x: startX,
      y: region.y,
      width: transX - startX,
      height: region.height,
    }
    const bounds = findBoundingBox(data, imageWidth, segmentRegion, bgColor)
    if (bounds && bounds.width > 2 && bounds.height > 2) {
      rectangles.push(bounds)
    }
    startX = transX
  }

  // Last segment
  const lastRegion: Bounds = {
    x: startX,
    y: region.y,
    width: region.x + region.width - startX,
    height: region.height,
  }
  const lastBounds = findBoundingBox(data, imageWidth, lastRegion, bgColor)
  if (lastBounds && lastBounds.width > 2 && lastBounds.height > 2) {
    rectangles.push(lastBounds)
  }

  if (rectangles.length > 1) {
    return {
      bounds: rectangles,
      layout: { direction: 'hor', gap: 0 },
    }
  }

  return { bounds: [region] }
}

/**
 * Calculate padding from parent bounds to children bounds
 * Returns the minimum distance from each edge to the nearest child
 */
function calculatePadding(parent: Bounds, children: Bounds[]): Padding | undefined {
  if (children.length === 0) return undefined

  // Find the bounding box of all children
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const child of children) {
    minX = Math.min(minX, child.x)
    minY = Math.min(minY, child.y)
    maxX = Math.max(maxX, child.x + child.width)
    maxY = Math.max(maxY, child.y + child.height)
  }

  const top = minY - parent.y
  const left = minX - parent.x
  const right = parent.x + parent.width - maxX
  const bottom = parent.y + parent.height - maxY

  // Only return padding if there's meaningful space (> 2px tolerance)
  const minPadding = Math.min(top, right, bottom, left)
  if (minPadding < 3) return undefined

  return { top, right, bottom, left }
}

/**
 * Calculate gap between consecutive children
 */
function calculateGap(children: Bounds[], direction: 'hor' | 'ver'): number {
  if (children.length < 2) return 0

  // Sort children by position
  const sorted = [...children].sort((a, b) => {
    if (direction === 'hor') {
      return a.x - b.x
    } else {
      return a.y - b.y
    }
  })

  // Calculate gaps between consecutive children
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]

    if (direction === 'hor') {
      const gap = curr.x - (prev.x + prev.width)
      gaps.push(gap)
    } else {
      const gap = curr.y - (prev.y + prev.height)
      gaps.push(gap)
    }
  }

  // Use the most common gap (or average if all different)
  if (gaps.length === 0) return 0

  // For now, use the first gap (assumes consistent spacing)
  return Math.max(0, gaps[0])
}

/**
 * Count the number of separate gap groups (consecutive gap sequences)
 * For example: [1,2,3, 10,11,12, 20,21] has 3 gap groups
 * This helps distinguish between:
 * - 2 groups: single nested child with padding (gaps at edges)
 * - 3+ groups: multiple children with gaps between them
 */
function countGapGroups(gaps: number[]): number {
  if (gaps.length === 0) return 0
  if (gaps.length === 1) return 1

  let groups = 1
  for (let i = 1; i < gaps.length; i++) {
    // If there's a break in consecutive numbers, it's a new group
    if (gaps[i] - gaps[i - 1] > 1) {
      groups++
    }
  }

  return groups
}

/**
 * Find continuous segments between gaps
 */
function findSegments(gaps: number[], start: number, end: number): [number, number][] {
  if (gaps.length === 0) return [[start, end]]

  const segments: [number, number][] = []
  let segmentStart = start

  // Group consecutive gap positions
  let gapStart = -1
  let gapEnd = -1

  for (let i = 0; i < gaps.length; i++) {
    if (gapStart === -1) {
      gapStart = gaps[i]
      gapEnd = gaps[i]
    } else if (gaps[i] === gapEnd + 1) {
      gapEnd = gaps[i]
    } else {
      // End of a gap group
      if (segmentStart < gapStart) {
        segments.push([segmentStart, gapStart])
      }
      segmentStart = gapEnd + 1
      gapStart = gaps[i]
      gapEnd = gaps[i]
    }
  }

  // Handle last gap group
  if (gapStart !== -1 && segmentStart < gapStart) {
    segments.push([segmentStart, gapStart])
  }
  if (gapEnd !== -1 && gapEnd + 1 < end) {
    segments.push([gapEnd + 1, end])
  }

  // If no segments were created, return the full range
  if (segments.length === 0) {
    segments.push([start, end])
  }

  return segments
}

/**
 * Recursively find nested rectangles
 */
async function findNestedRectangles(
  data: Uint8Array,
  imageWidth: number,
  region: Bounds,
  bgColor: Pixel,
  buffer: Buffer,
  depth = 0,
  maxDepth = 10
): Promise<Rectangle | null> {
  if (depth > maxDepth) return null

  // Find outermost rectangle in this region
  const bounds = findBoundingBox(data, imageWidth, region, bgColor)
  if (!bounds) return null

  // Get fill color of this rectangle (from interior, not edge)
  const color = getColorAt(data, imageWidth, bounds)

  // Detect border
  const border = detectBorder(data, imageWidth, bounds, color)

  // Detect border-radius (pass border color if present)
  const borderPixel = border ? hexToPixel(border.color) : undefined
  const radius = detectRadius(data, imageWidth, bounds, color, bgColor, borderPixel)

  // Create rectangle node
  const rect: Rectangle = {
    bounds,
    color: pixelToHex(color),
    border,
    radius,
    children: [],
    texts: [],
    icons: [],
  }

  // Look for child rectangles inside this one
  const margin = 1
  if (bounds.width > margin * 2 + 2 && bounds.height > margin * 2 + 2) {
    const innerRegion: Bounds = {
      x: bounds.x + margin,
      y: bounds.y + margin,
      width: bounds.width - margin * 2,
      height: bounds.height - margin * 2,
    }

    // IMPORTANT: First try to find child rectangles, THEN check for text
    // This ensures we don't miss nested frames just because OCR detected some text

    // Find ALL children, not just one
    const childrenResult = findAllRectanglesInRegion(data, imageWidth, innerRegion, color)

    // If the region was identified as a text region, don't look for children
    // Just run OCR on the whole region
    if (childrenResult.isTextRegion && childrenResult.bounds.length === 1) {
      const textBound = childrenResult.bounds[0]
      const leafTexts = await detectTexts(buffer, textBound, color, data, imageWidth)
      rect.texts = leafTexts.filter(t => t.confidence >= 50)
      // Calculate padding from the text region
      const padding = calculatePadding(bounds, [textBound])
      if (padding) {
        rect.padding = padding
      }
      return rect
    }

    // Store layout info if multiple children
    if (childrenResult.layout) {
      rect.layout = childrenResult.layout
    }

    // Collect valid child bounds for padding calculation
    const validChildBounds: Bounds[] = []

    for (const childBound of childrenResult.bounds) {
      // For very small regions (likely text fragments), create a simple leaf node
      // Don't try to recursively find children in them
      const MIN_CHILD_SIZE = 30
      const isSmallRegion = childBound.width < MIN_CHILD_SIZE || childBound.height < MIN_CHILD_SIZE

      let childRect: Rectangle | null

      if (isSmallRegion) {
        // Create a simple leaf node for small regions
        const childColor = getPixelAt(data, imageWidth, childBound.x + 1, childBound.y + 1)
        childRect = {
          bounds: childBound,
          color: pixelToHex(childColor),
          children: [],
          texts: [],
          icons: [],
        }
        // Try to detect text in this small region
        const texts = await detectTexts(buffer, childBound, childColor, data, imageWidth)
        childRect.texts = texts.filter(t => t.confidence >= 50)
      } else {
        // Recursively process larger children
        childRect = await findNestedRectangles(
          data,
          imageWidth,
          childBound,
          color,
          buffer,
          depth + 1,
          maxDepth
        )
      }

      if (childRect) {
        // Expand child bounds back to parent edges if touching margin
        const expanded = expandToEdges(childRect.bounds, bounds, margin)
        childRect.bounds = expanded

        // Skip if child is just the fill area of a bordered parent
        const borderWidth = rect.border?.width || 0
        const expectedInnerWidth = bounds.width - borderWidth * 2
        const expectedInnerHeight = bounds.height - borderWidth * 2
        const isFillArea =
          pixelsEqual(
            childRect.color ? hexToPixel(childRect.color) : { r: 0, g: 0, b: 0, a: 255 },
            color,
            5
          ) ||
          (Math.abs(expanded.width - expectedInnerWidth) <= 4 &&
            Math.abs(expanded.height - expectedInnerHeight) <= 4 &&
            borderWidth > 0)

        if (!isFillArea) {
          rect.children.push(childRect)
          validChildBounds.push(expanded)
        }
      }
    }

    // Calculate padding after all children are processed
    if (validChildBounds.length > 0) {
      const padding = calculatePadding(bounds, validChildBounds)

      if (padding) {
        // If there's meaningful padding on all sides, use padding
        rect.padding = padding
      } else if (rect.children.length === 1) {
        // No uniform padding, detect alignment for single child
        rect.children[0].alignment = detectAlignment(bounds, validChildBounds[0])
      }
    }

    // Detect text - run OCR on ALL regions, not just leaf nodes
    // Text can exist alongside children (e.g., a card with title text and nested content)
    const allTexts = await detectTexts(buffer, bounds, color, data, imageWidth)
    rect.texts = allTexts.filter(t => t.confidence >= 50)

    // If no text found and no children, check for icons
    if (rect.texts.length === 0 && rect.children.length === 0) {
      rect.icons = detectIcons(data, imageWidth, bounds, color)
    }
  } else {
    // Small rectangle - might contain text or icons
    const smallTexts = await detectTexts(buffer, bounds, color, data, imageWidth)
    rect.texts = smallTexts.filter(t => t.confidence >= 50)

    // If no text found, check for icons
    if (rect.texts.length === 0) {
      rect.icons = detectIcons(data, imageWidth, bounds, color)
    }
  }

  return rect
}

// =============================================================================
// Code Generator
// =============================================================================

/**
 * Format padding for Mirror code output
 * Returns: "pad N" | "pad V H" | "pad T R B L" | ""
 */
function formatPadding(padding: Padding | undefined): string {
  if (!padding) return ''

  const { top, right, bottom, left } = padding

  // All equal: pad N
  if (top === right && right === bottom && bottom === left) {
    return `pad ${top}`
  }

  // Vertical/horizontal equal: pad V H
  if (top === bottom && left === right) {
    return `pad ${top} ${left}`
  }

  // All different: pad T R B L
  return `pad ${top} ${right} ${bottom} ${left}`
}

/**
 * Generate Mirror code from rectangle hierarchy
 */
function generateCode(rect: Rectangle, indent = 0): string {
  const prefix = '  '.repeat(indent)
  const { width, height } = rect.bounds
  const bg = rect.color
  const align = rect.alignment
  const border = rect.border
  const radius = rect.radius
  const padding = rect.padding
  const layout = rect.layout

  // Build property list
  let props = `w ${width}, h ${height}, bg ${bg}`

  if (border) {
    props += `, bor ${border.width}, boc ${border.color}`
  }

  if (radius) {
    props += `, rad ${radius}`
  }

  const padStr = formatPadding(padding)
  if (padStr) {
    props += `, ${padStr}`
  }

  if (align) {
    props += `, ${align}`
  }

  let code = `${prefix}Frame ${props}`

  // If we have multiple children with layout info, wrap them in a layout Frame
  if (rect.children.length > 1 && layout) {
    const childPrefix = '  '.repeat(indent + 1)

    // Build layout properties
    let layoutProps = ''
    if (layout.direction === 'hor') {
      layoutProps = 'hor'
    }
    if (layout.gap > 0) {
      layoutProps += layoutProps ? `, gap ${layout.gap}` : `gap ${layout.gap}`
    }

    if (layoutProps) {
      code += `\n${childPrefix}Frame ${layoutProps}`

      // Children are nested inside the layout frame
      for (const child of rect.children) {
        code += '\n' + generateCode(child, indent + 2)
      }
    } else {
      // No layout props needed, just output children directly
      for (const child of rect.children) {
        code += '\n' + generateCode(child, indent + 1)
      }
    }
  } else {
    // Single child or no layout - output children directly
    for (const child of rect.children) {
      code += '\n' + generateCode(child, indent + 1)
    }
  }

  // Output text elements
  for (const text of rect.texts) {
    const textPrefix = '  '.repeat(indent + 1)
    // Escape quotes in text content
    const content = text.content.replace(/"/g, '\\"')
    let textProps = `fs ${text.fontSize}, col ${text.color}`

    // Add font family if not sans (default)
    if (text.fontFamily) {
      textProps += `, font ${text.fontFamily}`
    }

    // Add weight if not normal (default)
    if (text.fontWeight) {
      textProps += `, weight ${text.fontWeight}`
    }

    code += `\n${textPrefix}Text "${content}", ${textProps}`
  }

  // Output icon elements
  for (const icon of rect.icons) {
    const iconPrefix = '  '.repeat(indent + 1)
    // Use placeholder name if not identified
    const iconName = icon.name || 'icon'
    code += `\n${iconPrefix}Icon "${iconName}", ic ${icon.color}, is ${icon.size}`
  }

  return code
}

// =============================================================================
// Analyzer Class
// =============================================================================

export class NestedRectangleAnalyzer implements ImageAnalyzer {
  name = 'NestedRectangleAnalyzer'
  version = '0.1.0'

  constructor() {
    // Load icon fingerprint library for icon recognition
    if (!isLibraryLoaded()) {
      loadIconLibraryFromFile()
    }
  }

  async analyze(image: RenderedImage): Promise<AnalysisResult> {
    const startTime = Date.now()

    const { data, width, height } = await getPixels(image.buffer)
    const bgColor = getBackgroundColor(data, width, height)
    const fullRegion: Bounds = { x: 0, y: 0, width, height }

    const rootRect = await findNestedRectangles(data, width, fullRegion, bgColor, image.buffer)

    if (!rootRect) {
      return {
        generatedCode: `Frame w ${width}, h ${height}, bg ${pixelToHex(bgColor)}`,
        confidence: 1.0,
        metadata: {
          analyzer: this.name,
          version: this.version,
          duration: Date.now() - startTime,
          elements: [],
        },
      }
    }

    const generatedCode = generateCode(rootRect)

    return {
      generatedCode,
      confidence: 1.0,
      metadata: {
        analyzer: this.name,
        version: this.version,
        duration: Date.now() - startTime,
        hierarchy: rootRect,
      },
    }
  }
}
