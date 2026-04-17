/**
 * Font Recognition via Fingerprinting
 *
 * Konzept: Berechne Features für bekannte Fonts und matche gegen unbekannte.
 */

// =============================================================================
// Types
// =============================================================================

export interface FontFingerprint {
  name: string
  family: 'sans' | 'serif' | 'mono'
  weight: number // 0-1, basierend auf Pixel-Dichte
  xHeightRatio: number // x-Höhe / Cap-Höhe
  widthRatio: number // Durchschnittliche Zeichenbreite / Höhe
  contrast: number // Variation in Strichdicke
  // Statistical features
  strokeWidthMean?: number // Mittlere Strichbreite
  strokeWidthStdDev?: number // Standardabweichung Strichbreite
  strokeWidthVariance?: number // Varianz (stdDev / mean) - normalisiert
}

export interface FontMatch {
  font: FontFingerprint
  distance: number
  confidence: number
}

// =============================================================================
// Known UI Fonts (Top 5)
// =============================================================================

export const KNOWN_FONTS: FontFingerprint[] = [
  {
    name: 'Inter',
    family: 'sans',
    weight: 0.45,
    xHeightRatio: 0.73,
    widthRatio: 0.55,
    contrast: 0.08,
  },
  {
    name: 'Roboto',
    family: 'sans',
    weight: 0.43,
    xHeightRatio: 0.71,
    widthRatio: 0.52,
    contrast: 0.1,
  },
  {
    name: 'Arial',
    family: 'sans',
    weight: 0.44,
    xHeightRatio: 0.72,
    widthRatio: 0.54,
    contrast: 0.05,
  },
  {
    name: 'Georgia',
    family: 'serif',
    weight: 0.42,
    xHeightRatio: 0.68,
    widthRatio: 0.58,
    contrast: 0.25,
  },
  {
    name: 'Monaco',
    family: 'mono',
    weight: 0.4,
    xHeightRatio: 0.7,
    widthRatio: 0.6,
    contrast: 0.03,
  },
]

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
 * Extract font features from pixel data
 */
export function extractFontFeatures(
  data: Uint8Array,
  imageWidth: number,
  textBounds: Bounds,
  bgColor: { r: number; g: number; b: number }
): Partial<FontFingerprint> {
  const { x, y, width, height } = textBounds

  // Count "ink" pixels (non-background)
  let inkPixels = 0
  const totalPixels = width * height

  // Track horizontal stroke widths for contrast calculation
  const strokeWidths: number[] = []

  for (let row = y; row < y + height; row++) {
    let currentStroke = 0

    for (let col = x; col < x + width; col++) {
      const idx = (row * imageWidth + col) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // Check if pixel is "ink" (not background)
      const isInk =
        Math.abs(r - bgColor.r) > 30 || Math.abs(g - bgColor.g) > 30 || Math.abs(b - bgColor.b) > 30

      if (isInk) {
        inkPixels++
        currentStroke++
      } else if (currentStroke > 0) {
        strokeWidths.push(currentStroke)
        currentStroke = 0
      }
    }

    if (currentStroke > 0) {
      strokeWidths.push(currentStroke)
    }
  }

  // Calculate weight (ink density)
  const weight = inkPixels / totalPixels

  // Statistical analysis of stroke widths
  let strokeWidthMean = 0
  let strokeWidthStdDev = 0
  let strokeWidthVariance = 0
  let contrast = 0

  if (strokeWidths.length > 1) {
    // Mean
    strokeWidthMean = strokeWidths.reduce((a, b) => a + b, 0) / strokeWidths.length

    // Standard deviation
    const sumSquaredDiffs = strokeWidths.reduce(
      (sum, w) => sum + Math.pow(w - strokeWidthMean, 2),
      0
    )
    strokeWidthStdDev = Math.sqrt(sumSquaredDiffs / strokeWidths.length)

    // Coefficient of variation (normalized variance)
    // This is more useful than raw variance because it's scale-independent
    strokeWidthVariance = strokeWidthMean > 0 ? strokeWidthStdDev / strokeWidthMean : 0

    // Contrast is the same as variance (kept for compatibility)
    contrast = strokeWidthVariance
  }

  // Width ratio
  const widthRatio = width / height

  return {
    weight: Math.min(1, Math.max(0, weight)),
    widthRatio,
    contrast: Math.min(1, Math.max(0, contrast)),
    strokeWidthMean,
    strokeWidthStdDev,
    strokeWidthVariance,
  }
}

// =============================================================================
// Font Matching
// =============================================================================

/**
 * Calculate distance between two font fingerprints
 */
function fingerprintDistance(a: Partial<FontFingerprint>, b: FontFingerprint): number {
  let distance = 0
  let factors = 0

  if (a.weight !== undefined) {
    distance += Math.pow(a.weight - b.weight, 2) * 2 // Weight is important
    factors++
  }

  if (a.widthRatio !== undefined) {
    distance += Math.pow(a.widthRatio - b.widthRatio, 2)
    factors++
  }

  if (a.contrast !== undefined) {
    distance += Math.pow(a.contrast - b.contrast, 2) * 1.5 // Contrast helps distinguish serif
    factors++
  }

  if (a.xHeightRatio !== undefined) {
    distance += Math.pow(a.xHeightRatio - b.xHeightRatio, 2)
    factors++
  }

  return factors > 0 ? Math.sqrt(distance / factors) : 1
}

/**
 * Find the best matching font from known fonts
 */
export function matchFont(features: Partial<FontFingerprint>): FontMatch {
  let bestMatch = KNOWN_FONTS[0]
  let bestDistance = Infinity

  for (const font of KNOWN_FONTS) {
    const distance = fingerprintDistance(features, font)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = font
    }
  }

  // Convert distance to confidence (0-100)
  // Distance 0 = 100% confidence, distance 0.5 = 0% confidence
  const confidence = Math.max(0, Math.min(100, (1 - bestDistance * 2) * 100))

  return {
    font: bestMatch,
    distance: bestDistance,
    confidence,
  }
}

/**
 * Detect font family category from features
 *
 * NOTE: Font family detection is difficult from pixel analysis alone.
 * Currently only detects monospace fonts reliably (fixed-width characters).
 * Serif vs sans detection is unreliable and disabled for now.
 *
 * @param features - Font features extracted from pixel analysis
 * @param textContent - Optional text content for per-character normalization
 */
export function detectFontFamily(
  features: Partial<FontFingerprint>,
  textContent?: string
): 'sans' | 'serif' | 'mono' {
  // Need at least 4 chars for reliable detection
  if (!textContent || textContent.length < 4 || features.widthRatio === undefined) {
    return 'sans'
  }

  // Per-character width ratio = total width / (height * char count)
  // Calibrated values:
  // - sans: ~0.54 per char
  // - serif: ~0.53 per char
  // - mono: ~0.59 per char (fixed width)
  const perCharRatio = features.widthRatio / textContent.length

  // Mono fonts have consistent wider characters
  // Use a higher threshold to avoid false positives with uppercase text
  // Uppercase letters like W, M are wide even in proportional fonts
  const hasUppercase = /[A-Z]/.test(textContent)
  const upperRatio = (textContent.match(/[A-Z]/g) || []).length / textContent.length

  // If mostly uppercase, the threshold needs to be higher
  // because uppercase letters are generally wider
  const monoThreshold = upperRatio > 0.5 ? 0.65 : 0.59

  if (perCharRatio > monoThreshold) {
    return 'mono'
  }

  return 'sans'
}

/**
 * Detect font weight category using multiple features
 *
 * Primary feature: ink density (weight)
 * Secondary feature: mean stroke width (strokeWidthMean)
 *
 * Calibrated values at 48px with "Hamburgefonts":
 * - Light:  inkDensity ~0.300, strokeWidthMean ~7.0
 * - Normal: inkDensity ~0.331, strokeWidthMean ~7.5
 * - Bold:   inkDensity ~0.430, strokeWidthMean ~8.5+
 *
 * @param inkDensity - Raw ink density (0-1)
 * @param fontSize - Optional font size for normalization
 * @param strokeWidthMean - Optional mean stroke width
 */
export function detectFontWeight(
  inkDensity: number,
  fontSize?: number,
  strokeWidthMean?: number
): 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'black' {
  // Normalize ink density by font size
  // Smaller fonts have higher relative ink density due to anti-aliasing
  // Reference: 48px font (calibration baseline)
  let normalizedDensity = inkDensity
  if (fontSize && fontSize > 0 && fontSize < 48) {
    const ratio = fontSize / 48
    const scaleFactor = 0.7 + ratio * 0.3
    normalizedDensity = inkDensity * scaleFactor
  }

  // Use stroke width mean as additional signal for weight
  // Normalized to font size if available
  let normalizedStrokeWidth = strokeWidthMean || 0
  if (strokeWidthMean && fontSize && fontSize > 0) {
    // Normalize stroke width relative to font size
    // At 48px, normal strokeWidthMean is ~7.5
    normalizedStrokeWidth = (strokeWidthMean / fontSize) * 48
  }

  // Combined detection using both features
  // Be conservative - only detect bold if BOTH signals agree
  // This avoids false positives for normal text
  const strokeWidthSuggestsBold = normalizedStrokeWidth > 9.0
  const densitySuggestsBold = normalizedDensity > 0.42

  // Only detect light if both signals are low
  const strokeWidthSuggestsLight = normalizedStrokeWidth < 6.5
  const densitySuggestsLight = normalizedDensity < 0.28

  // Light detection - both must agree
  if (strokeWidthSuggestsLight && densitySuggestsLight) {
    if (normalizedDensity < 0.22) return 'thin'
    return 'light'
  }

  // Bold detection - both should agree for high confidence
  if (strokeWidthSuggestsBold && densitySuggestsBold) {
    if (normalizedDensity > 0.55) return 'black'
    return 'bold'
  }

  // Semibold - weaker signal, needs higher thresholds
  if (normalizedDensity > 0.48 || (normalizedStrokeWidth > 10.0 && normalizedDensity > 0.4)) {
    return 'semibold'
  }

  // Default to normal
  return 'normal'
}
