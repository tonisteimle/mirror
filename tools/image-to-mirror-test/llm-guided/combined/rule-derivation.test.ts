/**
 * Unit Tests für Rule Derivation
 *
 * Testet die Regelableitung unabhängig vom Pixel-Analyzer
 */

import { deriveRules, analyzeAndCreateRules, type DerivedRule } from './index'
import type { MergedElement } from '../schema'

// =============================================================================
// Test Helpers
// =============================================================================

function createMergedElement(props: Partial<MergedElement>): MergedElement {
  return {
    type: 'Container',
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    ...props,
  }
}

// =============================================================================
// Tests
// =============================================================================

function testSpacingSystem() {
  console.log('\n📐 Test: Spacing System Detection')
  console.log('-'.repeat(40))

  // Structure with 4px grid values
  const element = createMergedElement({
    type: 'Container',
    gap: 16,
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
    borderRadius: 8,
    children: [
      createMergedElement({ gap: 8, borderRadius: 4 }),
      createMergedElement({ gap: 12, borderRadius: 8 }),
    ],
  })

  const measurements = deriveRules(element)
  const { rules, insights } = analyzeAndCreateRules(measurements)

  console.log('  Measurements:', {
    gaps: measurements.gaps,
    radii: measurements.radii,
    paddings: measurements.paddings,
  })

  console.log('  Insights:', insights)

  const spacingRule = rules.find(r => r.type === 'spacing')
  if (spacingRule) {
    console.log(`  ✅ Spacing system detected: ${spacingRule.value}px base`)
    return true
  } else {
    console.log('  ❌ No spacing system detected')
    return false
  }
}

function testTypographySystem() {
  console.log('\n📝 Test: Typography System Detection')
  console.log('-'.repeat(40))

  // Structure with multiple font sizes
  const element = createMergedElement({
    type: 'Container',
    children: [
      createMergedElement({ type: 'Text', fontSize: 32 }),
      createMergedElement({ type: 'Text', fontSize: 24 }),
      createMergedElement({ type: 'Text', fontSize: 16 }),
      createMergedElement({ type: 'Text', fontSize: 14 }),
      createMergedElement({ type: 'Text', fontSize: 12 }),
    ],
  })

  const measurements = deriveRules(element)
  const { rules, insights } = analyzeAndCreateRules(measurements)

  console.log('  Font sizes found:', measurements.fontSizes)
  console.log('  Insights:', insights)

  const fontSizeRules = rules.filter(r => r.type === 'fontSize')
  if (fontSizeRules.length >= 3) {
    console.log(`  ✅ Typography system detected: ${fontSizeRules.length} sizes`)
    fontSizeRules.forEach(r => console.log(`     ${r.name}: ${r.value}px`))
    return true
  } else {
    console.log(`  ❌ Only ${fontSizeRules.length} font sizes detected`)
    return false
  }
}

function testAccentColorDetection() {
  console.log('\n🎨 Test: Accent Color Detection')
  console.log('-'.repeat(40))

  // Structure with accent colors
  const element = createMergedElement({
    type: 'Container',
    backgroundColor: '#1a1a1a',
    children: [
      createMergedElement({ backgroundColor: '#333333' }),
      createMergedElement({ backgroundColor: '#2271C1' }), // Blue accent
      createMergedElement({ backgroundColor: '#ef4444' }), // Red accent
    ],
  })

  const measurements = deriveRules(element)
  const { rules, insights } = analyzeAndCreateRules(measurements)

  console.log('  Colors found:', measurements.colors)
  console.log('  Insights:', insights)

  const accentRule = rules.find(r => r.name === 'color.accent.bg')
  if (accentRule) {
    console.log(`  ✅ Accent color detected: ${accentRule.value}`)
    return true
  } else {
    console.log('  ❌ No accent color detected')
    return false
  }
}

function testConsistentGap() {
  console.log('\n📏 Test: Consistent Gap Detection')
  console.log('-'.repeat(40))

  // Structure with consistent gap
  const element = createMergedElement({
    type: 'Container',
    gap: 12,
    children: [
      createMergedElement({ gap: 12 }),
      createMergedElement({ gap: 12 }),
      createMergedElement({ gap: 12 }),
    ],
  })

  const measurements = deriveRules(element)
  const { rules, insights } = analyzeAndCreateRules(measurements)

  console.log('  Gaps found:', measurements.gaps)
  console.log('  Insights:', insights)

  const gapRule = rules.find(r => r.type === 'gap' && r.confidence === 'high')
  if (gapRule) {
    console.log(`  ✅ Consistent gap detected: ${gapRule.value}px (${gapRule.usageCount}x used)`)
    return true
  } else {
    console.log('  ❌ No consistent gap detected')
    return false
  }
}

function testRadiusSystem() {
  console.log('\n⭕ Test: Radius System Detection')
  console.log('-'.repeat(40))

  // Structure with two-level radius system
  const element = createMergedElement({
    type: 'Container',
    borderRadius: 12,
    children: [
      createMergedElement({ borderRadius: 6 }),
      createMergedElement({ borderRadius: 6 }),
      createMergedElement({ borderRadius: 12 }),
    ],
  })

  const measurements = deriveRules(element)
  const { rules, insights } = analyzeAndCreateRules(measurements)

  console.log('  Radii found:', measurements.radii)
  console.log('  Insights:', insights)

  const radiusRules = rules.filter(r => r.type === 'radius')
  if (radiusRules.length === 2) {
    console.log(
      `  ✅ Radius system detected: ${radiusRules.map(r => `${r.name}=${r.value}`).join(', ')}`
    )
    return true
  } else {
    console.log(`  ❌ Expected 2 radius rules, got ${radiusRules.length}`)
    return false
  }
}

function testComplexStructure() {
  console.log('\n🏗️  Test: Complex Structure (Card with Form)')
  console.log('-'.repeat(40))

  // Complex structure: Card with form elements
  const element = createMergedElement({
    type: 'Card',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
    gap: 16,
    children: [
      // Title
      createMergedElement({ type: 'Text', fontSize: 24, color: '#ffffff' }),
      // Form fields
      createMergedElement({
        type: 'Container',
        gap: 8,
        children: [
          createMergedElement({ type: 'Text', fontSize: 12, color: '#888888' }),
          createMergedElement({
            type: 'Input',
            backgroundColor: '#2a2a2a',
            borderRadius: 4,
            padding: { top: 8, right: 12, bottom: 8, left: 12 },
          }),
        ],
      }),
      createMergedElement({
        type: 'Container',
        gap: 8,
        children: [
          createMergedElement({ type: 'Text', fontSize: 12, color: '#888888' }),
          createMergedElement({
            type: 'Input',
            backgroundColor: '#2a2a2a',
            borderRadius: 4,
            padding: { top: 8, right: 12, bottom: 8, left: 12 },
          }),
        ],
      }),
      // Button
      createMergedElement({
        type: 'Button',
        backgroundColor: '#2271C1',
        borderRadius: 8,
        fontSize: 14,
      }),
    ],
  })

  const measurements = deriveRules(element)
  const { rules, insights } = analyzeAndCreateRules(measurements)

  console.log('  Measurements:')
  console.log(`    Gaps: ${measurements.gaps}`)
  console.log(`    Radii: ${measurements.radii}`)
  console.log(`    Colors: ${measurements.colors}`)
  console.log(`    FontSizes: ${measurements.fontSizes}`)
  console.log(`    Paddings: ${measurements.paddings}`)

  console.log('  Insights:', insights)

  console.log('  Rules:')
  rules.forEach(r => console.log(`    ${r.name}: ${r.value} (${r.confidence}, ${r.usageCount}x)`))

  // Check expectations
  const checks = [
    { name: 'Has spacing system', pass: rules.some(r => r.type === 'spacing') },
    { name: 'Has radius rules', pass: rules.filter(r => r.type === 'radius').length >= 2 },
    { name: 'Has color rules', pass: rules.filter(r => r.type === 'color').length >= 1 },
    { name: 'Has font size rules', pass: rules.filter(r => r.type === 'fontSize').length >= 2 },
    { name: 'Has accent color', pass: rules.some(r => r.name === 'color.accent.bg') },
  ]

  let allPassed = true
  for (const check of checks) {
    console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`)
    if (!check.pass) allPassed = false
  }

  return allPassed
}

// =============================================================================
// Run Tests
// =============================================================================

async function run() {
  console.log('='.repeat(60))
  console.log('RULE DERIVATION UNIT TESTS')
  console.log('Testing rule derivation logic independently')
  console.log('='.repeat(60))

  const results = [
    testSpacingSystem(),
    testTypographySystem(),
    testAccentColorDetection(),
    testConsistentGap(),
    testRadiusSystem(),
    testComplexStructure(),
  ]

  const passed = results.filter(r => r).length
  const total = results.length

  console.log()
  console.log('='.repeat(60))
  console.log(`Results: ${passed}/${total} tests passed`)
  console.log('='.repeat(60))

  return passed === total
}

run()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
