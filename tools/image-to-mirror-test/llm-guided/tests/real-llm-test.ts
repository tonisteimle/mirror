/**
 * Real LLM Test - Uses actual Claude CLI for image analysis
 *
 * This test renders Mirror code to an image, then asks Claude to analyze it.
 */

import { ImageToMirrorTestRunner, createTestCase } from '../../runner'
import { NestedRectangleAnalyzer } from '../../analyzers/nested-rectangle-analyzer'
import { createClaudeCLI } from '../claude-cli'
import * as fs from 'fs'
import * as path from 'path'

// =============================================================================
// Test Cases
// =============================================================================

const TEST_CASES = [
  {
    name: 'Einzelner blauer Button',
    code: `Frame w 400, h 300, bg #f0f0f0, center
  Frame bg #2271C1, col white, pad 12 24, rad 6
    Text "Speichern"`,
    expectedDescription: /button|knopf/i,
    expectedText: 'Speichern',
  },
  {
    name: 'Outline Button',
    code: `Frame w 400, h 300, bg #f0f0f0, center
  Frame bg #ffffff, col #2271C1, pad 12 24, rad 6, bor 1, boc #2271C1
    Text "Abbrechen"`,
    expectedDescription: /button|knopf|outline|border/i,
    expectedText: 'Abbrechen',
  },
  {
    name: 'Zwei Buttons nebeneinander',
    code: `Frame w 400, h 300, bg #f0f0f0, center
  Frame hor, gap 12
    Frame bg #e0e0e0, col #333, pad 12 24, rad 6
      Text "Abbrechen"
    Frame bg #2271C1, col white, pad 12 24, rad 6
      Text "Speichern"`,
    expectedDescription: /zwei|two|buttons|knöpfe/i,
    expectedText: 'Speichern',
  },
]

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(60))
  console.log('REAL LLM TEST - Using Claude CLI')
  console.log('='.repeat(60))
  console.log()

  // Check if Claude CLI is available
  const claudeCli = createClaudeCLI({ verbose: true })
  const available = await claudeCli.isAvailable()

  if (!available) {
    console.log('❌ Claude CLI ist nicht verfügbar')
    console.log('   Installieren mit: npm install -g @anthropic-ai/claude-code')
    return false
  }

  console.log('✅ Claude CLI ist verfügbar')
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/real-llm' },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TEST_CASES) {
      console.log(`Testing: ${test.name}`)
      console.log('-'.repeat(40))

      // 1. Render Mirror code to image
      const testCase = createTestCase(
        test.name.toLowerCase().replace(/\s+/g, '-'),
        test.name,
        test.code
      )
      const result = await runner.runTest(testCase)

      // 2. Get the screenshot path
      const screenshotPath = path.join('test-output/real-llm', `${testCase.id}.png`)

      if (!fs.existsSync(screenshotPath)) {
        console.log(`  ❌ Screenshot nicht gefunden: ${screenshotPath}`)
        continue
      }

      console.log(`  📸 Screenshot: ${screenshotPath}`)

      // 3. Ask Claude to analyze the image
      console.log(`  🤖 Claude analysiert...`)
      const llmAnalysis = await claudeCli.analyzeFile(screenshotPath)

      console.log(`  LLM Beschreibung: "${llmAnalysis.description}"`)
      console.log(`  LLM Komponente: ${llmAnalysis.componentType || 'nicht erkannt'}`)
      console.log(`  LLM Elemente: ${llmAnalysis.elements.length}`)

      for (const el of llmAnalysis.elements) {
        console.log(`    - ${el.type}: "${el.text || el.description}" @ ${el.position}`)
      }

      // 4. Validate
      let ok = true
      const issues: string[] = []

      // Check description matches pattern
      if (test.expectedDescription && !test.expectedDescription.test(llmAnalysis.description)) {
        ok = false
        issues.push(`Beschreibung matcht nicht: "${llmAnalysis.description}"`)
      }

      // Check text was found
      if (test.expectedText) {
        const foundText = llmAnalysis.elements.some(e => e.text?.includes(test.expectedText))
        if (!foundText && !llmAnalysis.description.includes(test.expectedText)) {
          ok = false
          issues.push(`Text "${test.expectedText}" nicht erkannt`)
        }
      }

      // 5. Also show pixel analysis for comparison
      console.log(`  📐 Pixel-Analyse:`)
      result.analysis?.generatedCode.split('\n').forEach(l => {
        console.log(`    ${l}`)
      })

      if (ok) {
        console.log(`  ✅ PASSED`)
        passed++
      } else {
        console.log(`  ❌ FAILED`)
        issues.forEach(i => console.log(`     - ${i}`))
      }
      console.log()
    }
  } finally {
    await runner.stop()
  }

  console.log('='.repeat(60))
  console.log(`Ergebnis: ${passed}/${TEST_CASES.length} Tests bestanden`)
  console.log('='.repeat(60))

  return passed === TEST_CASES.length
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
