/**
 * Step 0: Ein einzelnes Rechteck erkennen
 *
 * Ziel: Aus einem Screenshot ein farbiges Rechteck extrahieren
 * und als Mirror-Code reproduzieren.
 */

import { ImageToMirrorTestRunner, createTestCase } from '../runner'
import { RectangleAnalyzer } from '../analyzers/rectangle-analyzer'

// =============================================================================
// Test Definition
// =============================================================================

interface TestCase {
  name: string
  render: string
  expected: string
}

// Alle Tests verwenden weißen Canvas (#ffffff) damit nur das Element erkannt wird
const TESTS: TestCase[] = [
  {
    name: 'Rotes Quadrat 100x100',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 100, h 100, bg #ff0000`,
    expected: 'Frame w 100, h 100, bg #ff0000',
  },
  {
    name: 'Blaues Rechteck 200x50',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 50, bg #2271c1`,
    expected: 'Frame w 200, h 50, bg #2271c1',
  },
  {
    name: 'Grünes Quadrat 80x80',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 80, h 80, bg #10b981`,
    expected: 'Frame w 80, h 80, bg #10b981',
  },
  {
    name: 'Dunkles Rechteck 150x100',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 150, h 100, bg #1a1a1a`,
    expected: 'Frame w 150, h 100, bg #1a1a1a',
  },
]

// =============================================================================
// Test Utilities
// =============================================================================

function normalize(code: string): string {
  return code.replace(/\s+/g, ' ').trim().toLowerCase()
}

function matches(actual: string, expected: string): boolean {
  return normalize(actual) === normalize(expected)
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(50))
  console.log('STEP 0: Ein einzelnes Rechteck erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step0' },
    new RectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TESTS) {
      const result = await runner.runTest(
        createTestCase(test.name.toLowerCase().replace(/\s+/g, '-'), test.name, test.render)
      )

      const actual = result.analysis?.generatedCode || ''
      const ok = matches(actual, test.expected)

      console.log(ok ? `✅ ${test.name}` : `❌ ${test.name}`)
      console.log(`   ${actual}`)

      if (!ok) {
        console.log(`   Erwartet: ${test.expected}`)
      }

      if (ok) passed++
    }
  } finally {
    await runner.stop()
  }

  console.log()
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
