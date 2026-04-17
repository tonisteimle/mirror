/**
 * Step 9: Icons erkennen
 *
 * Ziel: Icon-Elemente erkennen und als Icon im Mirror-Code ausgeben.
 * Icons sind charakterisiert durch:
 * - Quadratische oder nahezu quadratische Bounds
 * - Typische Größen: 16, 20, 24, 32px
 * - Niedriger Ink-Density (dünne Linien)
 * - Monochrom (eine Farbe)
 */

import { ImageToMirrorTestRunner, createTestCase } from '../runner'
import { NestedRectangleAnalyzer } from '../analyzers/nested-rectangle-analyzer'

// =============================================================================
// Test Definition
// =============================================================================

interface TestCase {
  name: string
  render: string
  // Expected structure (icon names and exact colors may vary)
  expectedIconCount: number
  expectedIconSize: number | number[] // single size or array for multiple icons
}

const TESTS: TestCase[] = [
  {
    // Simple icon - using circle icon which is simple shape
    name: 'Einfaches Icon',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 120, h 120, bg #1a1a1a, center
    Icon "circle", ic #10b981, is 48`,
    expectedIconCount: 1,
    expectedIconSize: 48,
  },
  {
    // Icon with different size
    name: 'Icon gross',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 120, h 120, bg #1a1a1a, center
    Icon "heart", ic #ef4444, is 48`,
    expectedIconCount: 1,
    expectedIconSize: 48,
  },
  {
    // Multiple icons
    name: 'Mehrere Icons',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 60, bg #1a1a1a, hor, center, gap 16
    Icon "home", ic #888888, is 24
    Icon "settings", ic #888888, is 24
    Icon "user", ic #888888, is 24`,
    expectedIconCount: 3,
    expectedIconSize: 24,
  },
]

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Extract icon info from generated code
 */
function extractIcons(code: string): { count: number; sizes: number[] } {
  const iconRegex = /Icon\s+"[^"]+",\s+ic\s+#[a-fA-F0-9]+,\s+is\s+(\d+)/g
  const icons: number[] = []
  let match: RegExpExecArray | null

  while ((match = iconRegex.exec(code)) !== null) {
    icons.push(parseInt(match[1], 10))
  }

  return {
    count: icons.length,
    sizes: icons,
  }
}

/**
 * Check if icons match expectations
 */
function iconsMatch(
  actual: string,
  expectedCount: number,
  expectedSize: number | number[]
): { ok: boolean; message: string } {
  const icons = extractIcons(actual)

  if (icons.count !== expectedCount) {
    return {
      ok: false,
      message: `Expected ${expectedCount} icons, got ${icons.count}`,
    }
  }

  const expectedSizes = Array.isArray(expectedSize)
    ? expectedSize
    : Array(expectedCount).fill(expectedSize)

  for (let i = 0; i < icons.sizes.length; i++) {
    // Allow size to be within 1 step of expected (e.g., 20 matches 24 is too far, but 24 matches 24)
    const sizeDiff = Math.abs(icons.sizes[i] - expectedSizes[i])
    if (sizeDiff > 8) {
      // Allow some tolerance for size normalization
      return {
        ok: false,
        message: `Icon ${i + 1}: expected size ${expectedSizes[i]}, got ${icons.sizes[i]}`,
      }
    }
  }

  return { ok: true, message: 'All icons match' }
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(50))
  console.log('STEP 9: Icons erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step9' },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TESTS) {
      const result = await runner.runTest(
        createTestCase(test.name.toLowerCase().replace(/\s+/g, '-'), test.name, test.render)
      )

      const actual = result.analysis?.generatedCode || ''
      const check = iconsMatch(actual, test.expectedIconCount, test.expectedIconSize)

      console.log(check.ok ? `✅ ${test.name}` : `❌ ${test.name}`)
      console.log('   Erkannt:')
      actual.split('\n').forEach(line => console.log(`     ${line}`))

      if (!check.ok) {
        console.log(`   Problem: ${check.message}`)
        console.log(
          `   Erwartet: ${test.expectedIconCount} Icon(s) mit Größe ${Array.isArray(test.expectedIconSize) ? test.expectedIconSize.join(', ') : test.expectedIconSize}`
        )
      }

      if (check.ok) passed++
      console.log()
    }
  } finally {
    await runner.stop()
  }

  console.log('='.repeat(50))
  console.log(`Ergebnis: ${passed}/${TESTS.length} Tests bestanden`)
  console.log('='.repeat(50))

  return passed === TESTS.length
}

// =============================================================================
// Entry Point
// =============================================================================

run()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
