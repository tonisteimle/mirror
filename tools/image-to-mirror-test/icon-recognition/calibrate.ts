/**
 * Icon Fingerprint Calibration
 *
 * Renders Lucide icons and extracts fingerprints to build a recognition library.
 * Run with: npx tsx tools/image-to-mirror-test/icon-recognition/calibrate.ts
 */

import { ImageToMirrorTestRunner, createTestCase } from '../runner'
import { extractIconFeatures, type IconFingerprint } from './index'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Common Lucide Icons (most frequently used in UI)
// =============================================================================

const LUCIDE_ICONS = [
  // Navigation
  'home',
  'menu',
  'x',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chevron-down',
  'arrow-left',
  'arrow-right',
  'arrow-up',
  'arrow-down',

  // Actions
  'check',
  'plus',
  'minus',
  'search',
  'settings',
  'edit',
  'trash',
  'copy',
  'save',
  'download',
  'upload',
  'refresh-cw',
  'external-link',

  // User & Auth
  'user',
  'users',
  'log-in',
  'log-out',
  'lock',
  'unlock',
  'key',

  // Communication
  'mail',
  'message-circle',
  'phone',
  'bell',
  'send',

  // Media
  'image',
  'camera',
  'video',
  'music',
  'play',
  'pause',
  'volume-2',

  // Files
  'file',
  'folder',
  'file-text',
  'clipboard',

  // Status
  'check-circle',
  'x-circle',
  'alert-circle',
  'alert-triangle',
  'info',
  'help-circle',

  // Shapes
  'circle',
  'square',
  'heart',
  'star',
  'flag',
  'bookmark',

  // Data
  'calendar',
  'clock',
  'map-pin',
  'link',
  'eye',
  'eye-off',

  // Layout
  'grid',
  'list',
  'layout',
  'sidebar',
  'maximize',
  'minimize',

  // Misc
  'sun',
  'moon',
  'cloud',
  'zap',
  'wifi',
  'bluetooth',
  'battery',
  'cpu',
  'database',
  'server',
  'code',
  'terminal',
  'git-branch',
  'github',
]

// =============================================================================
// Calibration
// =============================================================================

interface PixelData {
  data: Uint8Array
  width: number
  height: number
}

async function getPixels(buffer: Buffer): Promise<PixelData> {
  const { Jimp } = await import('jimp')
  const image = await Jimp.read(buffer)
  return {
    data: new Uint8Array(image.bitmap.data),
    width: image.width,
    height: image.height,
  }
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Find the dark frame (#1a1a1a) in the screenshot
 * The Studio has a white background, so we need to find the dark frame first.
 */
function findDarkFrame(data: Uint8Array, width: number, height: number): Bounds | null {
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  // Find pixels that are dark (#1a1a1a = rgb(26, 26, 26))
  // Allow some tolerance for anti-aliasing
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // Check if this is a dark pixel (close to #1a1a1a)
      if (r < 50 && g < 50 && b < 50) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

/**
 * Find the bounds of the icon (white pixels) within the dark frame
 */
function findIconBoundsInFrame(
  data: Uint8Array,
  imageWidth: number,
  frameBounds: Bounds
): Bounds | null {
  let minX = frameBounds.width
  let minY = frameBounds.height
  let maxX = 0
  let maxY = 0

  // Find bright pixels within the frame bounds
  for (let row = 0; row < frameBounds.height; row++) {
    for (let col = 0; col < frameBounds.width; col++) {
      const x = frameBounds.x + col
      const y = frameBounds.y + row
      const idx = (y * imageWidth + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // Bright pixels are the icon strokes (white)
      if (r > 200 && g > 200 && b > 200) {
        minX = Math.min(minX, col)
        minY = Math.min(minY, row)
        maxX = Math.max(maxX, col)
        maxY = Math.max(maxY, row)
      }
    }
  }

  if (maxX < minX || maxY < minY) return null

  return {
    x: frameBounds.x + minX,
    y: frameBounds.y + minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

/**
 * Extract icon features for calibration
 * In calibration, icons are white on dark background
 *
 * Key insight: Icons are rendered with anti-aliasing. We need a threshold
 * that captures the actual stroke pixels without including too much anti-aliasing.
 * Pure white strokes are r=255, background is r=26, so r > 128 should separate them.
 */
function extractIconFeaturesForCalibration(
  data: Uint8Array,
  imageWidth: number,
  bounds: Bounds,
  debug = false
): IconFingerprint {
  const { x, y, width, height } = bounds
  const totalPixels = width * height

  let inkPixels = 0
  let sumX = 0
  let sumY = 0
  const inkMap: boolean[][] = []

  // Sample some pixels for debugging
  if (debug) {
    console.log(`  Bounds: ${width}x${height} at (${x}, ${y})`)
    // Sample center pixel
    const centerRow = Math.floor(height / 2)
    const centerCol = Math.floor(width / 2)
    const idx = ((y + centerRow) * imageWidth + (x + centerCol)) * 4
    console.log(`  Center pixel: rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})`)
  }

  // Initialize ink map
  for (let row = 0; row < height; row++) {
    inkMap[row] = []
    for (let col = 0; col < width; col++) {
      inkMap[row][col] = false
    }
  }

  // Find bright pixels (the icon strokes)
  // Use threshold > 128 to separate white strokes from dark background
  // This is midpoint between bg (#1a1a1a = 26) and white (#ffffff = 255)
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = ((y + row) * imageWidth + (x + col)) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      // Bright pixels are ink (icon strokes are white)
      // Using 128 threshold to capture strokes but not background
      const isBright = r > 128 && g > 128 && b > 128

      if (isBright) {
        inkPixels++
        sumX += col
        sumY += row
        inkMap[row][col] = true
      }
    }
  }

  if (debug) {
    console.log(
      `  Ink pixels: ${inkPixels}/${totalPixels} (${((inkPixels / totalPixels) * 100).toFixed(1)}%)`
    )
  }

  const inkDensity = inkPixels / totalPixels
  const aspectRatio = width / height
  const centerOfMassX = inkPixels > 0 ? sumX / inkPixels / width : 0.5
  const centerOfMassY = inkPixels > 0 ? sumY / inkPixels / height : 0.5

  // Calculate symmetry
  const horizontalSymmetry = calculateSymmetry(inkMap, width, height, 'horizontal')
  const verticalSymmetry = calculateSymmetry(inkMap, width, height, 'vertical')

  // Calculate edge ratio
  let edgePixels = 0
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!inkMap[row][col]) continue
      const hasNonInkNeighbor =
        (row > 0 && !inkMap[row - 1][col]) ||
        (row < height - 1 && !inkMap[row + 1][col]) ||
        (col > 0 && !inkMap[row][col - 1]) ||
        (col < width - 1 && !inkMap[row][col + 1])
      if (hasNonInkNeighbor) edgePixels++
    }
  }
  const edgeRatio = inkPixels > 0 ? edgePixels / inkPixels : 0

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

function calculateSymmetry(
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
        const left = inkMap[row][col]
        const right = inkMap[row][mirrorCol]
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
        const top = inkMap[row][col]
        const bottom = inkMap[mirrorRow][col]
        if (top || bottom) {
          total++
          if (top === bottom) matches++
        }
      }
    }
  }

  return total > 0 ? matches / total : 0
}

async function calibrate() {
  console.log('='.repeat(60))
  console.log('ICON FINGERPRINT CALIBRATION')
  console.log('='.repeat(60))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    {
      headless: true,
      verbose: false,
      saveScreenshots: true,
      outputDir: 'test-output/icon-calibration',
    },
    {
      name: 'IconCalibrator',
      version: '1.0',
      analyze: async () => ({ generatedCode: '', confidence: 0, metadata: {} }),
    }
  )

  const fingerprints: IconFingerprint[] = []
  let success = 0
  let failed = 0

  try {
    await runner.start()

    for (const iconName of LUCIDE_ICONS) {
      process.stdout.write(`  ${iconName.padEnd(20)}`)

      try {
        // Render icon in a simple frame
        const mirrorCode = `Frame w 100, h 100, bg #1a1a1a, center
  Icon "${iconName}", ic #ffffff, is 48`

        const result = await runner.runTest(
          createTestCase(`icon-${iconName}`, iconName, mirrorCode)
        )

        if (!result.image?.buffer) {
          console.log('❌ No image')
          failed++
          continue
        }

        // Get pixel data
        const { data, width, height } = await getPixels(result.image.buffer)

        // First find the dark frame in the Studio screenshot
        const frameBounds = findDarkFrame(data, width, height)

        if (!frameBounds || frameBounds.width < 50 || frameBounds.height < 50) {
          console.log(`❌ No dark frame found`)
          failed++
          continue
        }

        // Find icon bounds within the dark frame
        const bounds = findIconBoundsInFrame(data, width, frameBounds)

        if (!bounds || bounds.width < 10 || bounds.height < 10) {
          console.log(`❌ No icon bounds found in frame`)
          failed++
          continue
        }

        // Extract features - for icon fingerprinting, we're looking at bright pixels (the icon)
        // against the dark frame background
        // Debug first 3 icons to understand bounds and pixels
        const debugMode = success < 3
        const features = extractIconFeaturesForCalibration(data, width, bounds, debugMode)
        features.name = iconName

        // Validate features
        if (features.inkDensity < 0.01) {
          console.log(`❌ No ink (density: ${features.inkDensity.toFixed(3)})`)
          failed++
          continue
        }

        fingerprints.push(features)
        console.log(
          `✅ density: ${features.inkDensity.toFixed(3)}, ` +
            `sym: ${features.horizontalSymmetry.toFixed(2)}/${features.verticalSymmetry.toFixed(2)}, ` +
            `edge: ${features.edgeRatio.toFixed(2)}`
        )
        success++
      } catch (err) {
        console.log(`❌ Error: ${err}`)
        failed++
      }
    }
  } finally {
    await runner.stop()
  }

  console.log()
  console.log('='.repeat(60))
  console.log(`RESULTS: ${success} icons calibrated, ${failed} failed`)
  console.log('='.repeat(60))

  // Save fingerprints to JSON
  const outputPath = path.join(__dirname, 'icon-library.json')
  fs.writeFileSync(outputPath, JSON.stringify(fingerprints, null, 2))
  console.log(`\nSaved ${fingerprints.length} fingerprints to: ${outputPath}`)

  return success > 0
}

// =============================================================================
// Entry Point
// =============================================================================

calibrate()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
