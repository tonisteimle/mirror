/**
 * Step 7: Padding erkennen
 *
 * Ziel: Abstand zwischen Parent-Kante und Kindern erkennen
 * und als padding im generierten Code ausgeben.
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
    name: 'Gleichmäßiges Padding 16',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, center
    Frame w 168, h 118, bg #ff0000, center`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 16
  Frame w 168, h 118, bg #ff0000`,
  },
  {
    name: 'Padding 20 mit Kind',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 240, h 180, bg #333333, center
    Frame w 200, h 140, bg #2271c1, center`,
    expected: `Frame w 240, h 180, bg #333333, pad 20
  Frame w 200, h 140, bg #2271c1`,
  },
  {
    name: 'Padding mit mehreren Kindern horizontal',
    // Visual result: 280x140 parent, children 60x60 with gap 20 = 140x60 content
    // Horizontal padding: (280-140)/2 = 70, Vertical: (140-60)/2 = 40
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 280, h 140, bg #1a1a1a, center
    Frame hor, gap 20, center
      Frame w 60, h 60, bg #ff0000
      Frame w 60, h 60, bg #2271c1`,
    expected: `Frame w 280, h 140, bg #1a1a1a, pad 40 70
  Frame hor, gap 20
    Frame w 60, h 60, bg #ff0000
    Frame w 60, h 60, bg #2271c1`,
  },
  {
    name: 'Asymmetrisches Padding vertikal-horizontal',
    // 200x160 parent, 160x100 child centered
    // Horizontal padding: (200-160)/2 = 20, Vertical: (160-100)/2 = 30
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 160, bg #1a1a1a, center
    Frame w 160, h 100, bg #10b981, center`,
    expected: `Frame w 200, h 160, bg #1a1a1a, pad 30 20
  Frame w 160, h 100, bg #10b981`,
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
  console.log('STEP 7: Padding erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step7' },
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
