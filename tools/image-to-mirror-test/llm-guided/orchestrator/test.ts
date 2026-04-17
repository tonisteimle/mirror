/**
 * Orchestrator Test
 *
 * Demonstrates the LLM-as-orchestrator approach:
 * 1. Render Mirror code to image
 * 2. LLM systematically calls tools
 * 3. Build up analysis
 * 4. Generate Mirror code
 * 5. Compare with original
 */

import { ImageToMirrorTestRunner, createTestCase } from '../../runner'
import { NestedRectangleAnalyzer } from '../../analyzers/nested-rectangle-analyzer'
import * as path from 'path'
import * as fs from 'fs'
import { PNG } from 'pngjs'

import {
  ImageContext,
  findRegions,
  getColor,
  measureGap,
  analyzeLayout,
  measureBorderRadius,
  deriveRules,
  type Bounds,
  type Region,
} from './tools'

import { type AnalysisNode, generateMirrorFromNode } from './strategy'

// =============================================================================
// Test Cases
// =============================================================================

interface TestCase {
  name: string
  inputCode: string
  expectedPatterns: string[] // Patterns that should appear in output
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Zwei Buttons horizontal',
    inputCode: `Frame w 400, h 100, bg #f0f0f0, center
  Frame hor, gap 12
    Frame w 100, h 40, bg #e0e0e0, rad 6, center
      Text "Abbrechen", col #333333
    Frame w 100, h 40, bg #2271C1, rad 6, center
      Text "OK", col white`,
    expectedPatterns: ['hor', 'gap', 'rad', 'bg #2271c1', 'bg #e0e0e0'],
  },
  {
    name: 'Vertikale Liste',
    inputCode: `Frame w 200, h 200, bg #1a1a1a, pad 16, gap 8
  Text "Item 1", col white
  Text "Item 2", col white
  Text "Item 3", col white`,
    expectedPatterns: ['gap', 'bg #1a1a1a', 'col white'],
  },
  {
    name: 'Card mit Titel und Button',
    inputCode: `Frame w 250, h 150, bg #1a1a1a, pad 20, rad 12, gap 12
  Text "Titel", col white, fs 18
  Text "Beschreibung", col #888888
  Frame w 80, h 36, bg #2271C1, rad 6, center
    Text "Action", col white`,
    expectedPatterns: ['rad 12', 'gap', 'bg #1a1a1a', 'bg #2271c1'],
  },
]

// =============================================================================
// Orchestrator Simulation
// =============================================================================

/**
 * Simulates how the LLM would orchestrate the analysis
 */
async function orchestrateAnalysis(
  imagePath: string
): Promise<{ node: AnalysisNode; rules: string[] }> {
  // Load image
  const ctx = new ImageContext()
  await ctx.load(imagePath)

  console.log(`    [LLM] Bild geladen: ${ctx.width}x${ctx.height}`)

  // PHASE 1: Find main regions
  console.log(`    [LLM] Phase 1: Hauptregionen finden...`)
  const mainRegions = findRegions(ctx)
  console.log(`    [Tool] findRegions() → ${mainRegions.length} Regionen gefunden`)

  if (mainRegions.length === 0) {
    console.log(`    [LLM] Keine Regionen gefunden, verwende gesamtes Bild`)
    return {
      node: {
        id: 'root',
        type: 'container',
        bounds: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      },
      rules: [],
    }
  }

  // Find the main container (largest region that's not the background)
  const bgColor = getColor(ctx, 0, 0).hex
  console.log(`    [Tool] getColor(0,0) → Hintergrund: ${bgColor}`)

  const contentRegions = mainRegions.filter(r => r.backgroundColor !== bgColor)
  console.log(`    [LLM] ${contentRegions.length} Content-Regionen (ohne Hintergrund)`)

  // PHASE 2: Analyze each content region
  const allMeasurements = { gaps: [] as number[], paddings: [] as number[], radii: [] as number[] }

  const analyzeRegion = (region: Region, depth = 0): AnalysisNode => {
    const indent = '      ' + '  '.repeat(depth)
    console.log(
      `${indent}[LLM] Analysiere Region ${region.id}: ${region.width}x${region.height} @ (${region.x},${region.y})`
    )

    // Get children
    const childRegions = findRegions(ctx, {
      x: region.x + 1,
      y: region.y + 1,
      width: region.width - 2,
      height: region.height - 2,
    })

    const innerRegions = childRegions.filter(
      r =>
        r.x > region.x &&
        r.y > region.y &&
        r.x + r.width < region.x + region.width &&
        r.y + r.height < region.y + region.height &&
        r.width < region.width - 4 &&
        r.height < region.height - 4
    )

    console.log(`${indent}[Tool] findRegions(inner) → ${innerRegions.length} Kinder`)

    // Measure border radius
    const radius = measureBorderRadius(ctx, region)
    if (radius > 0) {
      console.log(`${indent}[Tool] measureBorderRadius() → ${radius}px`)
      allMeasurements.radii.push(radius)
    }

    // Analyze layout if we have children
    const layoutInfo: { direction?: 'horizontal' | 'vertical'; gap?: number } = {}

    if (innerRegions.length >= 2) {
      const layout = analyzeLayout(innerRegions.map(r => r as Bounds))
      console.log(
        `${indent}[Tool] analyzeLayout() → ${layout.direction}, gap: ${layout.consistentGap}`
      )

      if (layout.direction !== 'unknown') {
        layoutInfo.direction = layout.direction
      }
      if (layout.consistentGap !== null) {
        layoutInfo.gap = layout.consistentGap
        allMeasurements.gaps.push(layout.consistentGap)
      }
    }

    // Build node
    const node: AnalysisNode = {
      id: region.id,
      type: innerRegions.length > 0 ? 'container' : region.height < 30 ? 'text' : 'container',
      bounds: region,
      backgroundColor: region.backgroundColor,
      borderRadius: radius > 0 ? radius : undefined,
      layout: layoutInfo.direction,
      gap: layoutInfo.gap,
    }

    // Recursively analyze children
    if (innerRegions.length > 0) {
      node.children = innerRegions.map(child => analyzeRegion(child, depth + 1))
    }

    return node
  }

  // Analyze the main content region
  const mainRegion = contentRegions.reduce((a, b) =>
    a.width * a.height > b.width * b.height ? a : b
  )

  const rootNode = analyzeRegion(mainRegion, 0)

  // PHASE 5: Derive rules
  console.log(`    [LLM] Phase 5: Regeln ableiten...`)
  const rules = deriveRules(allMeasurements)
  console.log(`    [Tool] deriveRules() → ${rules.length} Regeln`)
  rules.forEach(r => console.log(`      - ${r}`))

  return { node: rootNode, rules }
}

// =============================================================================
// Test Runner
// =============================================================================

async function run(): Promise<boolean> {
  console.log('='.repeat(60))
  console.log('ORCHESTRATOR TEST')
  console.log('LLM als Orchestrator, ruft Tools systematisch auf')
  console.log('='.repeat(60))
  console.log()

  const runner = new ImageToMirrorTestRunner(
    {
      headless: true,
      verbose: false,
      saveScreenshots: true,
      outputDir: 'test-output/orchestrator',
    },
    new NestedRectangleAnalyzer()
  )

  let passed = 0

  try {
    await runner.start()

    for (const test of TEST_CASES) {
      console.log(`\nTesting: ${test.name}`)
      console.log('-'.repeat(50))

      // 1. Render to image
      const testCase = createTestCase(
        test.name.toLowerCase().replace(/\s+/g, '-'),
        test.name,
        test.inputCode
      )
      await runner.runTest(testCase)

      const imagePath = path.join('test-output/orchestrator', `${testCase.id}.png`)

      if (!fs.existsSync(imagePath)) {
        console.log(`  ❌ Screenshot nicht gefunden: ${imagePath}`)
        continue
      }

      console.log(`  📸 Screenshot: ${imagePath}`)
      console.log(`  🤖 LLM orchestriert Analyse...`)
      console.log()

      // 2. Orchestrate analysis
      const { node, rules } = await orchestrateAnalysis(imagePath)

      // 3. Generate Mirror code
      console.log()
      console.log(`  📝 Generiere Mirror Code...`)
      const generatedCode = generateMirrorFromNode(node)

      console.log(`  [Input]:`)
      test.inputCode.split('\n').forEach(l => console.log(`    ${l}`))
      console.log(`  [Output]:`)
      generatedCode.split('\n').forEach(l => console.log(`    ${l}`))

      if (rules.length > 0) {
        console.log(`  [Regeln]:`)
        rules.forEach(r => console.log(`    ${r}`))
      }

      // 4. Check expected patterns
      let ok = true
      const issues: string[] = []

      for (const pattern of test.expectedPatterns) {
        if (!generatedCode.toLowerCase().includes(pattern.toLowerCase())) {
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
