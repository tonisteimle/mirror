/**
 * Step 6: Gap und Layout-Richtung erkennen
 *
 * Ziel: Abstand zwischen Geschwistern messen und
 * Layout-Richtung (hor/ver) im generierten Code ausgeben.
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
    // 300x200 parent, 2 children 80x80 with gap 20 = 180x80 → pad 60
    name: 'Horizontal mit gap 20',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 300, h 200, bg #1a1a1a, center
    Frame hor, gap 20, center
      Frame w 80, h 80, bg #ff0000
      Frame w 80, h 80, bg #2271c1`,
    expected: `Frame w 300, h 200, bg #1a1a1a, pad 60
  Frame hor, gap 20
    Frame w 80, h 80, bg #ff0000
    Frame w 80, h 80, bg #2271c1`,
  },
  {
    // 300x200 parent, 3 children 60x60 with gap 10 = 200x60 → pad 70 50
    name: 'Horizontal mit gap 10',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 300, h 200, bg #1a1a1a, center
    Frame hor, gap 10, center
      Frame w 60, h 60, bg #ff0000
      Frame w 60, h 60, bg #10b981
      Frame w 60, h 60, bg #2271c1`,
    expected: `Frame w 300, h 200, bg #1a1a1a, pad 70 50
  Frame hor, gap 10
    Frame w 60, h 60, bg #ff0000
    Frame w 60, h 60, bg #10b981
    Frame w 60, h 60, bg #2271c1`,
  },
  {
    // 200x250 parent, 2 children 100x50 with gap 15 = 100x115
    // Asymmetric due to pixel rounding: pad 68 50 67 50
    name: 'Vertikal mit gap 15',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 250, bg #1a1a1a, center
    Frame gap 15, center
      Frame w 100, h 50, bg #ff0000
      Frame w 100, h 50, bg #2271c1`,
    expected: `Frame w 200, h 250, bg #1a1a1a, pad 68 50 67 50
  Frame gap 15
    Frame w 100, h 50, bg #ff0000
    Frame w 100, h 50, bg #2271c1`,
  },
  {
    // 300x200 parent, 2 children 80x80 no gap = 160x80 → pad 60 70
    name: 'Horizontal ohne gap (direkt aneinander)',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 300, h 200, bg #1a1a1a, center
    Frame hor, center
      Frame w 80, h 80, bg #ff0000
      Frame w 80, h 80, bg #2271c1`,
    expected: `Frame w 300, h 200, bg #1a1a1a, pad 60 70
  Frame hor
    Frame w 80, h 80, bg #ff0000
    Frame w 80, h 80, bg #2271c1`,
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
  console.log('STEP 6: Gap und Layout-Richtung erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step6' },
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
