/**
 * Font Calibration Script
 *
 * Rendert alle bekannten Fonts und berechnet deren Fingerprints.
 * Dient zur Kalibrierung und Verifikation des Systems.
 */

import { extractFontFeatures, detectFontWeight, detectFontFamily } from './index'

// We'll use the same browser rendering as the test runner
import { ImageToMirrorTestRunner, createTestCase } from '../runner'
import { NestedRectangleAnalyzer } from '../analyzers/nested-rectangle-analyzer'

// =============================================================================
// Font Samples
// =============================================================================

// Mirror DSL unterstützt: font sans, font serif, font mono
// Für spezifische Fonts müssten wir CSS direkt injizieren
//
// NOTE: Current detection capabilities:
// - mono: Detected via per-character width ratio (fixed-width chars)
// - serif: NOT reliably detected (disabled to avoid false positives)
// - sans: Default fallback
const FONT_SAMPLES = [
  { name: 'Sans (System)', mirror: 'font sans', family: 'sans' as const },
  { name: 'Serif (Georgia)', mirror: 'font serif', family: 'sans' as const }, // Expected: sans (serif detection disabled)
  { name: 'Mono', mirror: 'font mono', family: 'mono' as const },
]

// Test verschiedene Weights
// NOTE: Weight detection uses font-size normalized thresholds
// Calibrated at 48px, with normalization for smaller fonts
const WEIGHT_SAMPLES = [
  { name: 'Light', mirror: 'weight light', expected: 'light' },
  { name: 'Normal', mirror: 'weight normal', expected: 'normal' },
  { name: 'Bold', mirror: 'weight bold', expected: 'bold' },
]

const SAMPLE_TEXT = 'Hamburgefonts'
const FONT_SIZE = 48

// =============================================================================
// Main
// =============================================================================

async function analyzeScreenshot(
  screenshot: Buffer,
  label: string
): Promise<{
  features: ReturnType<typeof extractFontFeatures>
  bounds: { width: number; height: number }
} | null> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(screenshot)
  const data = new Uint8Array(image.bitmap.data)
  const width = image.width
  const height = image.height

  // Find text bounds (non-white pixels)
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // Non-white pixel
      if (r < 250 || g < 250 || b < 250) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX) return null

  const textBounds = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }

  const features = extractFontFeatures(data, width, textBounds, { r: 255, g: 255, b: 255 })

  return { features, bounds: textBounds }
}

async function calibrate() {
  console.log('='.repeat(50))
  console.log('Font Fingerprint Kalibrierung')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/fonts' },
    new NestedRectangleAnalyzer()
  )

  try {
    await runner.start()

    // Test Font Families
    console.log('📚 FONT FAMILIES')
    console.log('-'.repeat(40))

    for (const font of FONT_SAMPLES) {
      const mirrorCode = `Frame w 500, h 100, bg #ffffff, center
  Text "${SAMPLE_TEXT}", fs ${FONT_SIZE}, col #000000, ${font.mirror}`

      console.log(`   Testing: ${font.name}...`)

      const result = await runner.runTest(
        createTestCase(`font-${font.family}`, `Font: ${font.name}`, mirrorCode)
      )

      console.log(`   Screenshot: ${result.image?.buffer ? 'YES' : 'NO'}`)

      if (result.image?.buffer) {
        const analysis = await analyzeScreenshot(result.image.buffer, font.name)

        if (analysis) {
          const detectedFamily = detectFontFamily(analysis.features, SAMPLE_TEXT)

          console.log(`📝 ${font.name}`)
          console.log(`   Bounds: ${analysis.bounds.width}x${analysis.bounds.height}`)
          console.log(`   weight (ink density): ${analysis.features.weight?.toFixed(3)}`)
          console.log(`   widthRatio: ${analysis.features.widthRatio?.toFixed(3)}`)
          console.log(`   📊 Statistical features:`)
          console.log(`      strokeWidthMean: ${analysis.features.strokeWidthMean?.toFixed(2)}`)
          console.log(`      strokeWidthStdDev: ${analysis.features.strokeWidthStdDev?.toFixed(2)}`)
          console.log(
            `      strokeWidthVariance (CV): ${analysis.features.strokeWidthVariance?.toFixed(3)}`
          )
          console.log(`   Detected family: ${detectedFamily}`)
          console.log(
            `   ${detectedFamily === font.family ? '✅ Correct' : '❌ Wrong (expected ' + font.family + ')'}`
          )
          console.log()
        }
      }
    }

    // Test Font Weights
    console.log()
    console.log('⚖️  FONT WEIGHTS')
    console.log('-'.repeat(40))

    for (const weightSample of WEIGHT_SAMPLES) {
      const mirrorCode = `Frame w 500, h 100, bg #ffffff, center
  Text "${SAMPLE_TEXT}", fs ${FONT_SIZE}, col #000000, ${weightSample.mirror}`

      const result = await runner.runTest(
        createTestCase(
          `weight-${weightSample.name.toLowerCase()}`,
          `Weight: ${weightSample.name}`,
          mirrorCode
        )
      )

      if (result.image?.buffer) {
        const analysis = await analyzeScreenshot(result.image.buffer, weightSample.name)

        if (analysis) {
          const detectedWeight = detectFontWeight(analysis.features.weight || 0)

          const expectedWeight = weightSample.expected
          console.log(`📝 ${weightSample.name}`)
          console.log(`   Bounds: ${analysis.bounds.width}x${analysis.bounds.height}`)
          console.log(`   weight (ink density): ${analysis.features.weight?.toFixed(3)}`)
          console.log(`   Detected: ${detectedWeight}`)
          console.log(
            `   ${detectedWeight === expectedWeight ? '✅ Correct' : '⚠️  Detected as ' + detectedWeight + ' (expected: ' + expectedWeight + ')'}`
          )
          console.log()
        }
      }
    }
  } finally {
    await runner.stop()
  }

  console.log('='.repeat(50))
  console.log('Kalibrierung abgeschlossen')
  console.log('='.repeat(50))
}

calibrate().catch(console.error)
