/**
 * Orchestrator Test V2
 *
 * Nutzt den vorhandenen NestedRectangleAnalyzer als Haupt-Tool.
 * Das LLM orchestriert dann die Interpretation und Regelableitung.
 */

import { ImageToMirrorTestRunner, createTestCase } from '../../runner'
import { NestedRectangleAnalyzer } from '../../analyzers/nested-rectangle-analyzer'
import * as path from 'path'

// =============================================================================
// Test Cases
// =============================================================================

interface TestCase {
  name: string
  inputCode: string
  expectedPatterns: string[]
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Zwei Buttons horizontal',
    inputCode: `Frame w 300, h 80, bg #f0f0f0, center
  Frame hor, gap 12
    Frame w 100, h 40, bg #e0e0e0, rad 6, center
      Text "Abbrechen"
    Frame w 100, h 40, bg #2271C1, rad 6, center
      Text "OK", col white`,
    expectedPatterns: ['hor', 'gap', 'rad'],
  },
  {
    name: 'Vertikale Liste',
    inputCode: `Frame w 200, h 160, bg #1a1a1a, pad 16, gap 8
  Text "Item 1", col white
  Text "Item 2", col white
  Text "Item 3", col white`,
    expectedPatterns: ['bg #1a1a1a'],
  },
  {
    name: 'Card mit Button',
    inputCode: `Frame w 220, h 140, bg #1a1a1a, pad 16, rad 12, gap 12
  Text "Titel", col white
  Frame w 80, h 32, bg #2271C1, rad 6, center
    Text "OK", col white`,
    expectedPatterns: ['rad', 'bg #1a1a1a', 'bg #2271c1'],
  },
]

// =============================================================================
// LLM Orchestration Simulation
// =============================================================================

interface ParsedElement {
  type: 'Frame' | 'Text' | 'Icon'
  props: Record<string, any>
  children: ParsedElement[]
  depth: number
}

function parseAnalyzerOutput(code: string): ParsedElement[] {
  const lines = code.split('\n').filter(l => l.trim())
  const elements: ParsedElement[] = []
  const stack: { element: ParsedElement; indent: number }[] = []

  for (const line of lines) {
    const indent = line.search(/\S/)
    const trimmed = line.trim()

    // Parse element type
    let type: 'Frame' | 'Text' | 'Icon' = 'Frame'
    if (trimmed.startsWith('Text')) type = 'Text'
    else if (trimmed.startsWith('Icon')) type = 'Icon'

    // Parse props
    const props: Record<string, any> = {}

    // Width/Height
    const wMatch = trimmed.match(/w\s+(\d+)/)
    const hMatch = trimmed.match(/h\s+(\d+)/)
    if (wMatch) props.w = parseInt(wMatch[1])
    if (hMatch) props.h = parseInt(hMatch[1])

    // Background
    const bgMatch = trimmed.match(/bg\s+(#[a-fA-F0-9]+)/)
    if (bgMatch) props.bg = bgMatch[1]

    // Color
    const colMatch = trimmed.match(/col\s+(#[a-fA-F0-9]+|white)/)
    if (colMatch) props.col = colMatch[1]

    // Radius
    const radMatch = trimmed.match(/rad\s+(\d+)/)
    if (radMatch) props.rad = parseInt(radMatch[1])

    // Padding
    const padMatch = trimmed.match(/pad\s+([\d\s]+)/)
    if (padMatch) props.pad = padMatch[1].trim()

    // Layout
    if (trimmed.includes('hor')) props.hor = true
    const gapMatch = trimmed.match(/gap\s+(\d+)/)
    if (gapMatch) props.gap = parseInt(gapMatch[1])

    // Border
    const borMatch = trimmed.match(/bor\s+(\d+)/)
    const bocMatch = trimmed.match(/boc\s+(#[a-fA-F0-9]+)/)
    if (borMatch) props.bor = parseInt(borMatch[1])
    if (bocMatch) props.boc = bocMatch[1]

    // Text content
    const textMatch = trimmed.match(/Text\s+"([^"]+)"/)
    if (textMatch) props.text = textMatch[1]

    const element: ParsedElement = { type, props, children: [], depth: indent / 2 }

    // Build tree
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (stack.length > 0) {
      stack[stack.length - 1].element.children.push(element)
    } else {
      elements.push(element)
    }

    stack.push({ element, indent })
  }

  return elements
}

/**
 * LLM Orchestration: Analysiert den Parser-Output und leitet Regeln ab
 */
function llmOrchestrate(elements: ParsedElement[]): { rules: string[]; insights: string[] } {
  const rules: string[] = []
  const insights: string[] = []

  // Sammle alle Werte
  const gaps: number[] = []
  const radii: number[] = []
  const colors: string[] = []
  const paddings: string[] = []

  function collect(el: ParsedElement) {
    if (el.props.gap) gaps.push(el.props.gap)
    if (el.props.rad) radii.push(el.props.rad)
    if (el.props.bg) colors.push(el.props.bg)
    if (el.props.pad) paddings.push(el.props.pad)
    el.children.forEach(collect)
  }
  elements.forEach(collect)

  // Analysiere Gaps
  const uniqueGaps = [...new Set(gaps)]
  if (uniqueGaps.length === 1) {
    rules.push(`gap.default: ${uniqueGaps[0]}`)
    insights.push(`Konsistenter Gap: ${uniqueGaps[0]}px`)
  } else if (uniqueGaps.length > 1) {
    insights.push(`Verschiedene Gaps: ${uniqueGaps.join(', ')}px`)
  }

  // Analysiere Radien
  const uniqueRadii = [...new Set(radii)]
  if (uniqueRadii.length === 1) {
    rules.push(`rad.default: ${uniqueRadii[0]}`)
    insights.push(`Konsistenter Radius: ${uniqueRadii[0]}px`)
  } else if (uniqueRadii.length > 1) {
    insights.push(`Radius-System: ${uniqueRadii.join(', ')}px`)
  }

  // Analysiere Farben
  const uniqueColors = [...new Set(colors.map(c => c.toLowerCase()))]
  if (uniqueColors.length <= 3) {
    insights.push(`Farbpalette: ${uniqueColors.join(', ')}`)
    uniqueColors.forEach((c, i) => {
      if (c !== '#ffffff' && c !== '#f0f0f0') {
        rules.push(`color.${i === 0 ? 'primary' : 'secondary'}.bg: ${c}`)
      }
    })
  }

  // Erkenne Layouts
  function detectLayouts(el: ParsedElement, path: string = '') {
    if (el.props.hor && el.children.length >= 2) {
      insights.push(`${path || 'Root'}: Horizontales Layout mit ${el.children.length} Kindern`)
    }
    el.children.forEach((child, i) => detectLayouts(child, `${path}/${el.type}[${i}]`))
  }
  elements.forEach((el, i) => detectLayouts(el, `[${i}]`))

  return { rules, insights }
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(60))
  console.log('ORCHESTRATOR TEST V2')
  console.log('LLM orchestriert über bestehenden Analyzer')
  console.log('='.repeat(60))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    {
      headless: true,
      verbose: false,
      saveScreenshots: true,
      outputDir: 'test-output/orchestrator-v2',
    },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TEST_CASES) {
      console.log(`\nTesting: ${test.name}`)
      console.log('-'.repeat(50))

      // 1. Render and analyze with existing analyzer
      const testCase = createTestCase(
        test.name.toLowerCase().replace(/\s+/g, '-'),
        test.name,
        test.inputCode
      )
      const result = await runner.runTest(testCase)
      const analyzerOutput = result.analysis?.generatedCode || ''

      console.log('  [Tool: NestedRectangleAnalyzer]')
      analyzerOutput.split('\n').forEach(l => console.log(`    ${l}`))

      // 2. LLM parst den Output
      console.log('\n  [LLM: Parse Struktur]')
      const elements = parseAnalyzerOutput(analyzerOutput)
      console.log(`    ${elements.length} Top-Level Elemente gefunden`)

      // 3. LLM leitet Regeln ab
      console.log('\n  [LLM: Orchestriere Analyse]')
      const { rules, insights } = llmOrchestrate(elements)

      if (insights.length > 0) {
        console.log('    Erkenntnisse:')
        insights.forEach(i => console.log(`      - ${i}`))
      }

      if (rules.length > 0) {
        console.log('    Abgeleitete Tokens:')
        rules.forEach(r => console.log(`      ${r}`))
      }

      // 4. Validate
      console.log('\n  [Validierung]')
      console.log('    Input:')
      test.inputCode.split('\n').forEach(l => console.log(`      ${l}`))
      console.log('    Output:')
      analyzerOutput.split('\n').forEach(l => console.log(`      ${l}`))

      let ok = true
      const issues: string[] = []

      for (const pattern of test.expectedPatterns) {
        if (!analyzerOutput.toLowerCase().includes(pattern.toLowerCase())) {
          ok = false
          issues.push(`"${pattern}" nicht gefunden`)
        }
      }

      if (ok) {
        console.log(`  ✅ PASSED`)
        passed++
      } else {
        console.log(`  ❌ FAILED`)
        issues.forEach(i => console.log(`     - ${i}`))
      }
    }
  } finally {
    await runner.stop()
  }

  console.log()
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
