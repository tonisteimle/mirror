/**
 * Step 1: Zwei verschachtelte Rechtecke erkennen
 *
 * Ziel: Hierarchie (Parent/Child) aus Geometrie ableiten
 * und hierarchischen Mirror-Code generieren.
 */

import { ImageToMirrorTestRunner, createTestCase } from '../runner'
import { NestedRectangleAnalyzer } from '../analyzers/nested-rectangle-analyzer'

// =============================================================================
// Test Definition
// =============================================================================

interface TestCase {
  name: string
  render: string
  expected: string
}

const TESTS: TestCase[] = [
  {
    // 200x150 parent, 100x80 child centered
    // Padding: (150-80)/2=35 vertical, (200-100)/2=50 horizontal
    name: 'Einfache Verschachtelung',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, center
    Frame w 100, h 80, bg #ff0000`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 35 50
  Frame w 100, h 80, bg #ff0000`,
  },
  {
    // Level 1: 300x200 parent, 200x120 child → pad 40 50
    // Level 2: 200x120 parent, 100x60 child → pad 30 50
    name: 'Drei Ebenen',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 300, h 200, bg #333333, center
    Frame w 200, h 120, bg #666666, center
      Frame w 100, h 60, bg #2271c1`,
    expected: `Frame w 300, h 200, bg #333333, pad 40 50
  Frame w 200, h 120, bg #666666, pad 30 50
    Frame w 100, h 60, bg #2271c1`,
  },
  {
    // 400x300 parent, 50x50 child centered
    // Padding: (300-50)/2=125 vertical, (400-50)/2=175 horizontal
    name: 'Große Außen, kleine Innen',
    render: `Frame w 500, h 400, bg #ffffff, center
  Frame w 400, h 300, bg #1a1a1a, center
    Frame w 50, h 50, bg #10b981`,
    expected: `Frame w 400, h 300, bg #1a1a1a, pad 125 175
  Frame w 50, h 50, bg #10b981`,
  },
]

// =============================================================================
// Test Utilities
// =============================================================================

function normalize(code: string): string {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' | ')
    .toLowerCase()
}

function matches(actual: string, expected: string): boolean {
  return normalize(actual) === normalize(expected)
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(50))
  console.log('STEP 1: Verschachtelte Rechtecke erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step1' },
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
      const ok = matches(actual, test.expected)

      console.log(ok ? `✅ ${test.name}` : `❌ ${test.name}`)
      console.log('   Erkannt:')
      actual.split('\n').forEach(line => console.log(`     ${line}`))

      if (!ok) {
        console.log('   Erwartet:')
        test.expected.split('\n').forEach(line => console.log(`     ${line}`))
      }

      if (ok) passed++
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
