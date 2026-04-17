/**
 * LLM-Guided Step 1.2: Button mit Icon
 *
 * Button mit Icon und Text.
 * LLM erkennt: "Ein Button mit Check-Icon und Text 'Bestätigen'"
 * Pixel-Analyse: Findet Button-Bounds, Icon-Position, Text
 * Output: Button mit Icon
 */

import { ImageToMirrorTestRunner, createTestCase } from '../../runner'
import { NestedRectangleAnalyzer } from '../../analyzers/nested-rectangle-analyzer'
import type { LLMAnalysis, DetectedElement } from '../types'

// =============================================================================
// Test Definition
// =============================================================================

const TEST_CASES = [
  {
    name: 'Button mit Check-Icon links',
    render: `Frame w 400, h 300, bg #f0f0f0, center
  Frame bg #2271C1, col white, pad 12 24, rad 6, hor, gap 8, ver-center
    Icon "check", ic white, is 16
    Text "Bestätigen"`,
    mockResponse: {
      description: "Ein blauer Button mit Check-Icon links und Text 'Bestätigen'",
      elements: [
        {
          type: 'button' as const,
          description: 'Button mit Icon und Text',
          position: 'center' as const,
          text: 'Bestätigen',
          children: [
            {
              type: 'icon' as const,
              description: 'Check-Icon',
              position: 'left' as const,
              iconName: 'check',
            },
            {
              type: 'text' as const,
              description: 'Button-Text',
              position: 'right' as const,
              text: 'Bestätigen',
            },
          ],
        },
      ],
      layout: { direction: 'horizontal' as const, gap: 'small' as const },
      componentType: 'Button',
    },
    expected: {
      componentType: 'Button',
      text: 'Bestätigen',
      hasIcon: true,
      iconName: 'check',
      hasBackgroundColor: true,
    },
  },
  {
    name: 'Button mit Plus-Icon rechts',
    render: `Frame w 400, h 300, bg #f0f0f0, center
  Frame bg #10b981, col white, pad 12 24, rad 6, hor, gap 8, ver-center
    Text "Hinzufügen"
    Icon "plus", ic white, is 16`,
    mockResponse: {
      description: "Ein grüner Button mit Text 'Hinzufügen' und Plus-Icon rechts",
      elements: [
        {
          type: 'button' as const,
          description: 'Button mit Text und Icon',
          position: 'center' as const,
          text: 'Hinzufügen',
          children: [
            {
              type: 'text' as const,
              description: 'Button-Text',
              position: 'left' as const,
              text: 'Hinzufügen',
            },
            {
              type: 'icon' as const,
              description: 'Plus-Icon',
              position: 'right' as const,
              iconName: 'plus',
            },
          ],
        },
      ],
      layout: { direction: 'horizontal' as const, gap: 'small' as const },
      componentType: 'Button',
    },
    expected: {
      componentType: 'Button',
      text: 'Hinzufügen',
      hasIcon: true,
      iconName: 'plus',
      hasBackgroundColor: true,
    },
  },
  {
    name: 'Icon-Only Button',
    render: `Frame w 400, h 300, bg #f0f0f0, center
  Frame w 40, h 40, bg #333, rad 8, center
    Icon "settings", ic white, is 20`,
    mockResponse: {
      description: 'Ein quadratischer Icon-Button mit Settings-Icon',
      elements: [
        {
          type: 'button' as const,
          description: 'Icon-only Button',
          position: 'center' as const,
          children: [
            {
              type: 'icon' as const,
              description: 'Settings-Icon',
              position: 'center' as const,
              iconName: 'settings',
            },
          ],
        },
      ],
      componentType: 'IconButton',
    },
    expected: {
      componentType: 'IconButton',
      hasIcon: true,
      iconName: 'settings',
      hasBackgroundColor: true,
    },
  },
]

// =============================================================================
// Analysis Flow
// =============================================================================

interface AnalysisResult {
  llmAnalysis: LLMAnalysis
  detectedElements: DetectedElement[]
  generatedCode: string
}

async function analyzeWithLLM(
  runner: ImageToMirrorTestRunner,
  mirrorCode: string,
  mockResponse: LLMAnalysis
): Promise<AnalysisResult> {
  // 1. Render the Mirror code to an image
  const testCase = createTestCase('llm-test', 'LLM Test', mirrorCode)
  const result = await runner.runTest(testCase)

  // 2. Use mock LLM analysis
  const llmAnalysis = mockResponse

  // 3. Get pixel analysis
  const pixelAnalysis = result.analysis!

  // DEBUG: Show what pixel analyzer found
  console.log(
    `  [DEBUG] Pixel-Analyse:\n${pixelAnalysis.generatedCode
      .split('\n')
      .map(l => '    ' + l)
      .join('\n')}`
  )

  // 4. Parse pixel analysis to find elements
  const detectedElements: DetectedElement[] = []
  const code = pixelAnalysis.generatedCode
  const lines = code.split('\n')

  // Look for Icon elements in the pixel analysis
  let foundIcon: { name?: string; color?: string; size?: number } | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Check for Icon line
    const iconMatch = trimmed.match(/Icon\s+"([^"]+)"/)
    if (iconMatch) {
      foundIcon = { name: iconMatch[1] }
      const icMatch = trimmed.match(/ic\s+(#[a-fA-F0-9]+|white|black)/)
      if (icMatch) foundIcon.color = icMatch[1]
      const isMatch = trimmed.match(/is\s+(\d+)/)
      if (isMatch) foundIcon.size = parseInt(isMatch[1])
    }
  }

  // 5. Generate code based on LLM component type
  let generatedCode = ''

  if (llmAnalysis.componentType === 'Button' || llmAnalysis.componentType === 'IconButton') {
    // Parse button properties from pixel analysis
    let buttonLine = ''
    let textLine = ''
    let iconLine = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('Frame') && !trimmed.includes('bg #f0f0f0')) {
        if (!buttonLine) buttonLine = trimmed
      }
      if (trimmed.startsWith('Text')) {
        textLine = trimmed
      }
      if (trimmed.startsWith('Icon')) {
        iconLine = trimmed
      }
    }

    // Extract text
    let text = ''
    const textMatch = textLine.match(/Text\s+"([^"]+)"/)
    if (textMatch) {
      text = textMatch[1]
    } else if (llmAnalysis.elements[0]?.text) {
      text = llmAnalysis.elements[0].text
    }

    // Extract icon
    let iconName = ''
    const iconNameMatch = iconLine.match(/Icon\s+"([^"]+)"/)
    if (iconNameMatch) {
      iconName = iconNameMatch[1]
    } else if (foundIcon?.name) {
      iconName = foundIcon.name
    } else {
      // Get from LLM analysis
      const children = llmAnalysis.elements[0]?.children
      if (children) {
        const iconChild = children.find(c => c.type === 'icon')
        if (iconChild?.iconName) {
          iconName = iconChild.iconName
        }
      }
    }

    // Extract button style
    const bgMatch = buttonLine.match(/bg\s+(#[a-fA-F0-9]+)/)
    const radMatch = buttonLine.match(/rad\s+(\d+)/)

    // Build code
    if (llmAnalysis.componentType === 'IconButton') {
      // Icon-only button
      let props = `"${iconName}"`
      if (bgMatch) props += `, bg ${bgMatch[1]}`
      if (radMatch) props += `, rad ${radMatch[1]}`
      generatedCode = `IconButton ${props}`
    } else {
      // Button with icon and text
      let props = text ? `"${text}"` : '""'
      if (bgMatch) props += `, bg ${bgMatch[1]}`
      if (radMatch) props += `, rad ${radMatch[1]}`
      if (iconName) {
        // Determine icon position from LLM analysis
        const children = llmAnalysis.elements[0]?.children
        const iconPosition = children?.find(c => c.type === 'icon')?.position || 'left'
        if (iconPosition === 'left') {
          props += `, icon-left "${iconName}"`
        } else {
          props += `, icon-right "${iconName}"`
        }
      }
      generatedCode = `Button ${props}`
    }
  } else {
    generatedCode = pixelAnalysis.generatedCode
  }

  // Add found icon to detected elements
  if (foundIcon) {
    detectedElements.push({
      type: 'icon',
      bounds: { x: 0, y: 0, width: foundIcon.size || 16, height: foundIcon.size || 16 },
      text: foundIcon.name,
    })
  }

  return {
    llmAnalysis,
    detectedElements,
    generatedCode,
  }
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(60))
  console.log('LLM-GUIDED STEP 1.2: Button mit Icon')
  console.log('='.repeat(60))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    { headless: true, verbose: false, saveScreenshots: true, outputDir: 'test-output/llm-step1-2' },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TEST_CASES) {
      console.log(`Testing: ${test.name}`)

      const result = await analyzeWithLLM(runner, test.render, test.mockResponse)

      console.log(`  LLM sagt: "${result.llmAnalysis.description}"`)
      console.log(`  Komponente: ${result.llmAnalysis.componentType}`)
      console.log(`  Generiert: ${result.generatedCode}`)

      // Validate
      let ok = true
      const issues: string[] = []

      if (
        test.expected.componentType &&
        result.llmAnalysis.componentType !== test.expected.componentType
      ) {
        ok = false
        issues.push(
          `Erwartet componentType ${test.expected.componentType}, bekommen ${result.llmAnalysis.componentType}`
        )
      }

      if (test.expected.text && !result.generatedCode.includes(test.expected.text)) {
        ok = false
        issues.push(`Text '${test.expected.text}' nicht gefunden`)
      }

      if (test.expected.hasIcon && !result.generatedCode.includes('icon')) {
        // Check if it's an IconButton (which has the icon name as the main param)
        if (test.expected.iconName && !result.generatedCode.includes(test.expected.iconName)) {
          ok = false
          issues.push('Kein Icon gefunden')
        }
      }

      if (test.expected.iconName && !result.generatedCode.includes(test.expected.iconName)) {
        ok = false
        issues.push(`Icon '${test.expected.iconName}' nicht gefunden`)
      }

      if (test.expected.hasBackgroundColor && !result.generatedCode.includes('bg #')) {
        ok = false
        issues.push('Keine Hintergrundfarbe gefunden')
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
