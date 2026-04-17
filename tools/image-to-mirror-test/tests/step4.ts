/**
 * Step 4: Border-Radius erkennen
 *
 * Ziel: Abgerundete Ecken erkennen und als rad im Mirror-Code ausgeben.
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
    // 200x150 parent, 100x80 child → pad 35 50
    name: 'Radius 8px',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, center
    Frame w 100, h 80, bg #333333, rad 8`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 35 50
  Frame w 100, h 80, bg #333333, rad 8`,
  },
  {
    name: 'Radius 4px',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, center
    Frame w 100, h 80, bg #2271c1, rad 4`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 35 50
  Frame w 100, h 80, bg #2271c1, rad 4`,
  },
  {
    // 200x150 parent, 120x90 child → pad 30 40
    name: 'Radius 12px',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #e0e0e0, center
    Frame w 120, h 90, bg #10b981, rad 12`,
    expected: `Frame w 200, h 150, bg #e0e0e0, pad 30 40
  Frame w 120, h 90, bg #10b981, rad 12`,
  },
  {
    name: 'Kein Radius',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, center
    Frame w 100, h 80, bg #ff0000`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 35 50
  Frame w 100, h 80, bg #ff0000`,
  },
  {
    name: 'Radius mit Border',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, center
    Frame w 100, h 80, bg #333333, bor 2, boc #ffffff, rad 8`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 35 50
  Frame w 100, h 80, bg #333333, bor 2, boc #ffffff, rad 8`,
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
  console.log('STEP 4: Border-Radius erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step4' },
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
