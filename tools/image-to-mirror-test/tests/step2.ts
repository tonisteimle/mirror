/**
 * Step 2: Zentrierung und Alignment erkennen
 *
 * Ziel: Aus Position des Kindes im Parent das Alignment ableiten
 * und im Mirror-Code ausgeben (center, tl, tr, bl, br, etc.)
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
    // Centered child with padding: outputs pad instead of alignment
    // Padding: (150-80)/2=35 vertical, (200-100)/2=50 horizontal
    name: 'Zentriert',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, center
    Frame w 100, h 80, bg #ff0000`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 35 50
  Frame w 100, h 80, bg #ff0000`,
  },
  {
    name: 'Oben-Links (tl)',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, tl
    Frame w 80, h 60, bg #2271c1`,
    expected: `Frame w 200, h 150, bg #1a1a1a
  Frame w 80, h 60, bg #2271c1, tl`,
  },
  {
    name: 'Unten-Rechts (br)',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, br
    Frame w 80, h 60, bg #10b981`,
    expected: `Frame w 200, h 150, bg #1a1a1a
  Frame w 80, h 60, bg #10b981, br`,
  },
  {
    name: 'Oben-Mitte (tc)',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #333333, tc
    Frame w 100, h 40, bg #f59e0b`,
    expected: `Frame w 200, h 150, bg #333333
  Frame w 100, h 40, bg #f59e0b, tc`,
  },
  {
    name: 'Unten-Mitte (bc)',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #333333, bc
    Frame w 100, h 40, bg #ef4444`,
    expected: `Frame w 200, h 150, bg #333333
  Frame w 100, h 40, bg #ef4444, bc`,
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
  console.log('STEP 2: Alignment erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step2' },
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
