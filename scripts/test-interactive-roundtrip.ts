/**
 * Round-Trip Test for Interactive Components
 *
 * Tests: Mirror (with events/states) → React → Mirror
 */

import { parse, generateReact } from '../src/index'
import { convertToMirrorCode } from '../src/converters/react-to-mirror'

const ORIGINAL_MIRROR = `
// Tokens
$bg.app: #09090B
$bg.surface: #18181B
$bg.card: #27272A
$bg.hover: #3F3F46
$col.text: #E4E4E7
$primary: #3B82F6

// Components
MenuItem: pad 12, bg $bg.surface, col $col.text, rad 6, cursor pointer
  hover
    bg $bg.hover
  state selected
    bg $primary
    col white
  onclick select self

Card: pad 16, bg $bg.card, rad 8
  hover
    bg $bg.hover

// App
App ver, w full, h full, bg $bg.app, pad 24, gap 16

  Menu ver, gap 4
    MenuItem "Dashboard"
    MenuItem "Settings"
`

console.log('=' .repeat(70))
console.log('INTERACTIVE ROUND-TRIP TEST')
console.log('=' .repeat(70))

// Step 1: Parse original Mirror
console.log('\n--- STEP 1: Original Mirror ---')
console.log(ORIGINAL_MIRROR.trim())

const ast = parse(ORIGINAL_MIRROR)
console.log('\nOriginal AST:')
console.log(`  Tokens: ${ast.tokens?.length || 0}`)
console.log(`  Components: ${ast.components?.length || 0}`)
for (const comp of ast.components || []) {
  console.log(`    - ${comp.name}: ${comp.states?.length || 0} states, ${comp.events?.length || 0} events`)
}

// Step 2: Generate React
console.log('\n--- STEP 2: Generated React ---')
const reactCode = generateReact(ast)
console.log(reactCode)

// Step 3: Convert back to Mirror
console.log('\n--- STEP 3: Converted Mirror ---')
const convertedMirror = convertToMirrorCode(reactCode)
console.log(convertedMirror)

// Step 4: Parse converted Mirror
console.log('\n--- STEP 4: Comparison ---')
try {
  const convertedAst = parse(convertedMirror)
  console.log('\nConverted AST:')
  console.log(`  Tokens: ${convertedAst.tokens?.length || 0}`)
  console.log(`  Components: ${convertedAst.components?.length || 0}`)
  for (const comp of convertedAst.components || []) {
    console.log(`    - ${comp.name}: ${comp.states?.length || 0} states, ${comp.events?.length || 0} events`)
  }

  // Compare
  const originalComponents = ast.components?.length || 0
  const convertedComponents = convertedAst.components?.length || 0

  console.log('\n--- RESULT ---')
  if (originalComponents === convertedComponents) {
    console.log('✓ Component count matches')
  } else {
    console.log(`✗ Component count mismatch: ${originalComponents} vs ${convertedComponents}`)
  }
} catch (e) {
  console.log('\n--- PARSE ERROR ---')
  console.log(e instanceof Error ? e.message : String(e))
}
