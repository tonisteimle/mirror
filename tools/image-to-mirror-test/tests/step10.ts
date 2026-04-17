/**
 * Step 10: Border-Radius erkennen
 *
 * Ziel: Abgerundete Ecken erkennen und als rad Property ausgeben.
 * Radius wird durch Analyse der Eckpixel erkannt:
 * - Scharfe Ecken haben Farbwechsel direkt an der Ecke
 * - Runde Ecken haben einen graduellen Übergang
 */

import { ImageToMirrorTestRunner, createTestCase } from '../runner'
import { NestedRectangleAnalyzer } from '../analyzers/nested-rectangle-analyzer'

// =============================================================================
// Test Definition
// =============================================================================

interface TestCase {
  name: string
  render: string
  expectedRadius: number | null // null = no radius expected
}

const TESTS: TestCase[] = [
  {
    // Sharp corners (no radius)
    name: 'Scharfe Ecken',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 100, h 80, bg #2271C1`,
    expectedRadius: null,
  },
  {
    // Small radius
    name: 'Kleiner Radius',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 100, h 80, bg #2271C1, rad 4`,
    expectedRadius: 4,
  },
  {
    // Medium radius
    name: 'Mittlerer Radius',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 100, h 80, bg #2271C1, rad 8`,
    expectedRadius: 8,
  },
  {
    // Large radius
    name: 'Grosser Radius',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 100, h 80, bg #2271C1, rad 16`,
    expectedRadius: 16,
  },
  {
    // Full round (pill shape)
    name: 'Pill-Form',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 120, h 40, bg #2271C1, rad 20`,
    expectedRadius: 20,
  },
]

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Extract radius from generated code
 */
function extractRadius(code: string): number | null {
  // Look for rad property in the inner frame (not the outer container)
  const lines = code.split('\n')
  for (const line of lines) {
    // Skip outer frames (usually w 400 or similar)
    if (line.includes('w 400') || line.includes('w 300')) continue

    const match = line.match(/rad\s+(\d+)/)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  return null
}

/**
 * Check if radius matches expectation
 * Allows tolerance of ±2 for small variations
 */
function radiusMatches(
  actual: number | null,
  expected: number | null
): { ok: boolean; message: string } {
  if (expected === null) {
    if (actual === null || actual === 0) {
      return { ok: true, message: 'No radius as expected' }
    }
    return { ok: false, message: `Expected no radius, got rad ${actual}` }
  }

  if (actual === null) {
    return { ok: false, message: `Expected rad ${expected}, got none` }
  }

  const tolerance = Math.max(2, expected * 0.25) // 25% tolerance or min 2px
  if (Math.abs(actual - expected) <= tolerance) {
    return { ok: true, message: `Radius ${actual} matches expected ${expected}` }
  }

  return { ok: false, message: `Expected rad ${expected}, got rad ${actual}` }
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(50))
  console.log('STEP 10: Border-Radius erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step10' },
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
      const actualRadius = extractRadius(actual)
      const check = radiusMatches(actualRadius, test.expectedRadius)

      console.log(check.ok ? `✅ ${test.name}` : `❌ ${test.name}`)
      console.log('   Erkannt:')
      actual.split('\n').forEach(line => console.log(`     ${line}`))

      if (!check.ok) {
        console.log(`   Problem: ${check.message}`)
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
