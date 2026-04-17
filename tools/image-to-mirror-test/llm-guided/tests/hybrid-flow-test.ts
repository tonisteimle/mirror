/**
 * Hybrid Flow Test
 *
 * Tests the full flow:
 * 1. Render Mirror code to image
 * 2. LLM provides semantic analysis (mocked for now)
 * 3. Pixel analyzer provides precise measurements
 * 4. Merger combines both
 * 5. Code generator outputs Mirror code
 */

import { ImageToMirrorTestRunner, createTestCase } from '../../runner'
import { NestedRectangleAnalyzer } from '../../analyzers/nested-rectangle-analyzer'
import type { SemanticAnalysis, PixelElement } from '../schema'
import { merge, generateMirrorCode } from '../merger'

// =============================================================================
// Test Cases
// =============================================================================

interface HybridTestCase {
  name: string
  inputCode: string
  semanticAnalysis: SemanticAnalysis
  expectedInOutput: string[]
}

const TEST_CASES: HybridTestCase[] = [
  {
    name: 'Einfacher Button',
    inputCode: `Frame w 400, h 300, bg #f0f0f0, center
  Frame bg #2271C1, col white, pad 12 24, rad 6
    Text "Speichern"`,
    semanticAnalysis: {
      description: 'Ein blauer Button mit Text "Speichern"',
      componentType: 'Button',
      layout: 'vertical',
      children: [
        {
          type: 'Button',
          role: 'action',
          text: 'Speichern',
          hints: { background: 'colored', rounded: true },
        },
      ],
    },
    expectedInOutput: ['Button', 'Speichern', 'bg', 'rad'],
  },
  {
    name: 'Zwei Buttons horizontal',
    inputCode: `Frame w 400, h 300, bg #f0f0f0, center
  Frame hor, gap 12
    Frame bg #e0e0e0, col #333333, pad 12 24, rad 6
      Text "Abbrechen"
    Frame bg #2271C1, col white, pad 12 24, rad 6
      Text "Speichern"`,
    semanticAnalysis: {
      description: 'Zwei Buttons nebeneinander: Abbrechen und Speichern',
      layout: 'horizontal',
      gap: 'medium',
      children: [
        {
          type: 'Button',
          role: 'cancel',
          text: 'Abbrechen',
          hints: { background: 'light', rounded: true },
        },
        {
          type: 'Button',
          role: 'submit',
          text: 'Speichern',
          hints: { background: 'colored', rounded: true },
        },
      ],
    },
    expectedInOutput: ['hor', 'gap', 'Abbrechen', 'Speichern'],
  },
  {
    name: 'Card mit Titel und Button',
    inputCode: `Frame w 400, h 300, bg #f0f0f0, center
  Frame w 250, bg #1a1a1a, pad 20, rad 12, gap 12
    Text "Card Title", col white, fs 18, weight bold
    Text "Eine Beschreibung.", col #888888, fs 14
    Frame bg #2271C1, col white, pad 10 20, rad 6, center
      Text "Action"`,
    semanticAnalysis: {
      description: 'Eine Card mit Titel, Beschreibung und Action-Button',
      componentType: 'Card',
      layout: 'vertical',
      gap: 'medium',
      children: [
        { type: 'Text', role: 'heading', text: 'Card Title' },
        { type: 'Text', role: 'description', text: 'Eine Beschreibung.' },
        { type: 'Button', role: 'action', text: 'Action' },
      ],
    },
    expectedInOutput: ['Card Title', 'Eine Beschreibung', 'Action', 'gap'],
  },
  {
    name: 'Form Field mit Label',
    inputCode: `Frame w 400, h 300, bg #f0f0f0, center
  Frame gap 4
    Text "Email", col #333333, fs 12
    Frame w 200, bg white, pad 8 12, bor 1, boc #cccccc, rad 4
      Text "name@example.com", col #999999, fs 14`,
    semanticAnalysis: {
      description: 'Ein Formularfeld mit Label "Email" und Eingabefeld',
      componentType: 'FormField',
      layout: 'vertical',
      gap: 'tiny',
      children: [
        { type: 'Text', role: 'label', text: 'Email' },
        { type: 'Input', inputType: 'email', placeholder: 'name@example.com' },
      ],
    },
    expectedInOutput: ['Email', 'Input', 'placeholder', 'bor'],
  },
]

// =============================================================================
// Pixel Analysis Adapter
// =============================================================================

/**
 * Convert analyzer output to PixelElement structure
 */
function parseAnalyzerOutput(code: string): PixelElement {
  const lines = code.split('\n')
  return parseLines(lines, 0).element
}

function parseLines(
  lines: string[],
  startIndex: number
): { element: PixelElement; endIndex: number } {
  const line = lines[startIndex].trim()
  const indent = lines[startIndex].search(/\S/)

  // Parse current line
  const element: PixelElement = {
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    children: [],
  }

  // Extract width/height
  const wMatch = line.match(/w\s+(\d+)/)
  const hMatch = line.match(/h\s+(\d+)/)
  if (wMatch) element.bounds.width = parseInt(wMatch[1])
  if (hMatch) element.bounds.height = parseInt(hMatch[1])

  // Extract background
  const bgMatch = line.match(/bg\s+(#[a-fA-F0-9]+)/)
  if (bgMatch) element.backgroundColor = bgMatch[1]

  // Extract color
  const colMatch = line.match(/col\s+(#[a-fA-F0-9]+|white|black)/)
  if (colMatch) {
    element.color =
      colMatch[1] === 'white' ? '#ffffff' : colMatch[1] === 'black' ? '#000000' : colMatch[1]
  }

  // Extract border
  const borMatch = line.match(/bor\s+(\d+)/)
  const bocMatch = line.match(/boc\s+(#[a-fA-F0-9]+)/)
  if (borMatch) element.borderWidth = parseInt(borMatch[1])
  if (bocMatch) element.borderColor = bocMatch[1]

  // Extract radius
  const radMatch = line.match(/rad\s+(\d+)/)
  if (radMatch) element.borderRadius = parseInt(radMatch[1])

  // Extract padding
  const padMatch = line.match(/pad\s+(\d+)(?:\s+(\d+))?(?:\s+(\d+))?(?:\s+(\d+))?/)
  if (padMatch) {
    const values = [padMatch[1], padMatch[2], padMatch[3], padMatch[4]].filter(Boolean).map(Number)
    if (values.length === 1) {
      element.padding = { top: values[0], right: values[0], bottom: values[0], left: values[0] }
    } else if (values.length === 2) {
      element.padding = { top: values[0], right: values[1], bottom: values[0], left: values[1] }
    } else if (values.length === 4) {
      element.padding = { top: values[0], right: values[1], bottom: values[2], left: values[3] }
    }
  }

  // Extract font size
  const fsMatch = line.match(/fs\s+(\d+)/)
  if (fsMatch) element.fontSize = parseInt(fsMatch[1])

  // Extract weight
  if (line.includes('weight bold')) element.fontWeight = 'bold'

  // Extract text
  const textMatch = line.match(/Text\s+"([^"]+)"/)
  if (textMatch) element.text = textMatch[1]

  // Extract icon
  const iconMatch = line.match(/Icon\s+"([^"]+)"/)
  if (iconMatch) element.iconName = iconMatch[1]

  // Parse children (lines with more indentation)
  let i = startIndex + 1
  while (i < lines.length) {
    const childIndent = lines[i].search(/\S/)
    if (childIndent === -1) {
      i++
      continue
    }
    if (childIndent <= indent) {
      break
    }

    const child = parseLines(lines, i)
    element.children!.push(child.element)
    i = child.endIndex + 1
  }

  return { element, endIndex: i - 1 }
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(60))
  console.log('HYBRID FLOW TEST')
  console.log('='.repeat(60))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/hybrid-flow' },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TEST_CASES) {
      console.log(`Testing: ${test.name}`)
      console.log('-'.repeat(40))

      // 1. Render and get pixel analysis
      const testCase = createTestCase(
        test.name.toLowerCase().replace(/\s+/g, '-'),
        test.name,
        test.inputCode
      )
      const result = await runner.runTest(testCase)
      const pixelCode = result.analysis?.generatedCode || ''

      console.log('  [Pixel Analysis]:')
      pixelCode.split('\n').forEach(l => console.log(`    ${l}`))

      // 2. Parse pixel output to structure
      const pixelElement = parseAnalyzerOutput(pixelCode)

      // 3. Merge with semantic analysis
      const merged = merge(test.semanticAnalysis, pixelElement, { verbose: false })

      // 4. Generate code
      const generatedCode = generateMirrorCode(merged)

      console.log('  [Generated Code]:')
      generatedCode.split('\n').forEach(l => console.log(`    ${l}`))

      // 5. Validate
      let ok = true
      const issues: string[] = []

      for (const expected of test.expectedInOutput) {
        if (!generatedCode.includes(expected)) {
          ok = false
          issues.push(`"${expected}" nicht gefunden`)
        }
      }

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
