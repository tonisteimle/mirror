/**
 * Step 5: Mehrere Geschwister-Elemente erkennen
 *
 * Ziel: Mehrere Kinder auf gleicher Ebene erkennen und
 * Layout-Richtung (horizontal/vertikal) ableiten.
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
    // 300x200 parent, 2 children 80x80 with gap 20 = 180x80 group
    // Padding: (200-80)/2=60 vertical, (300-180)/2=60 horizontal → pad 60
    name: 'Zwei Kinder horizontal',
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
    // 350x200 parent, 3 children 60x60 with gap 15 = 210x60 group
    // Padding: (200-60)/2=70 vertical, (350-210)/2=70 horizontal → pad 70
    name: 'Drei Kinder horizontal',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 350, h 200, bg #1a1a1a, center
    Frame hor, gap 15, center
      Frame w 60, h 60, bg #ff0000
      Frame w 60, h 60, bg #10b981
      Frame w 60, h 60, bg #2271c1`,
    expected: `Frame w 350, h 200, bg #1a1a1a, pad 70
  Frame hor, gap 15
    Frame w 60, h 60, bg #ff0000
    Frame w 60, h 60, bg #10b981
    Frame w 60, h 60, bg #2271c1`,
  },
  {
    // 200x250 parent, 2 children 100x60 with gap 20 = 100x140 group
    // Padding: (250-140)/2=55 vertical, (200-100)/2=50 horizontal → pad 55 50
    name: 'Zwei Kinder vertikal',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 250, bg #1a1a1a, center
    Frame gap 20, center
      Frame w 100, h 60, bg #ff0000
      Frame w 100, h 60, bg #2271c1`,
    expected: `Frame w 200, h 250, bg #1a1a1a, pad 55 50
  Frame gap 20
    Frame w 100, h 60, bg #ff0000
    Frame w 100, h 60, bg #2271c1`,
  },
  {
    // 300x200 parent, children 50+100+70 + 2x10 gap = 240x80 group
    // Padding: (200-80)/2=60 vertical, (300-240)/2=30 horizontal → pad 60 30
    name: 'Unterschiedliche Größen',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 300, h 200, bg #333333, center
    Frame hor, gap 10, center
      Frame w 50, h 80, bg #ef4444
      Frame w 100, h 80, bg #f59e0b
      Frame w 70, h 80, bg #10b981`,
    expected: `Frame w 300, h 200, bg #333333, pad 60 30
  Frame hor, gap 10
    Frame w 50, h 80, bg #ef4444
    Frame w 100, h 80, bg #f59e0b
    Frame w 70, h 80, bg #10b981`,
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
  console.log('STEP 5: Mehrere Geschwister-Elemente erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step5' },
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
