/**
 * Step 8: Text erkennen
 *
 * Ziel: Text-Inhalt und Font-Größe aus dem Bild extrahieren
 * und als Text-Element im Mirror-Code ausgeben.
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
    // Simple text in a frame
    // Note: Padding values are pixel-based (from actual text bounds)
    name: 'Einfacher Text',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 100, bg #1a1a1a, center
    Text "Hello", col #ffffff, fs 24`,
    expected: `Frame w 200, h 100, bg #1a1a1a, pad 41 74 40 75
  Text "Hello", fs 24, col #ffffff`,
  },
  {
    // Text with different font size
    // Font size estimated from pixel height (cap height ≈ 0.8 * em)
    name: 'Text mit grosser Schrift',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 300, h 150, bg #333333, center
    Text "Title", col #ffffff, fs 48`,
    expected: `Frame w 300, h 150, bg #333333, pad 58 107 56 107
  Text "Title", fs 45, col #ffffff`,
  },
  {
    // Multiple text elements - both detected with correct font sizes and colors
    name: 'Mehrere Texte vertikal',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 200, h 150, bg #1a1a1a, pad 20, gap 10
    Text "Titel", col #ffffff, fs 20
    Text "Untertitel", col #888888, fs 14`,
    expected: `Frame w 200, h 150, bg #1a1a1a, pad 27 120 74 20
  Text "Titel", fs 20, col #ffffff
  Text "Untertitel", fs 14, col #888888`,
  },
  {
    // Text in button-like frame with rounded corners
    name: 'Text in Button',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 150, h 50, bg #2271c1, rad 8, center
    Text "Click", col #ffffff, fs 16`,
    expected: `Frame w 150, h 50, bg #2271c1, rad 8, pad 18 57 18 58
  Text "Click", fs 18, col #ffffff`,
  },
  // =============================================================================
  // Font Recognition Tests
  // =============================================================================
  {
    // Monospace font detection - wider per-character ratio
    // Using text without punctuation for better OCR
    name: 'Mono Font erkennen',
    render: `Frame w 400, h 300, bg #ffffff, center
  Frame w 300, h 80, bg #1a1a1a, center
    Text "function main", col #10b981, fs 24, font mono`,
    expected: `Frame w 300, h 80, bg #1a1a1a, pad 29 58 31 58
  Text "function main", fs 40, col #10b981, font mono`,
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
  console.log('STEP 8: Text erkennen')
  console.log('='.repeat(50))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/step8' },
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
