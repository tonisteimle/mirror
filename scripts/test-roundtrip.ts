/**
 * Round-Trip Test: Mirror → React → Mirror
 *
 * The converted Mirror should be equivalent to the original.
 */

import { parse, generateReact } from '../src/index'
import { convertToMirrorCode } from '../src/converters/react-to-mirror'

const ORIGINAL_MIRROR = `
// Tokens
$bg.app: #09090B
$bg.surface: #18181B
$bg.card: #27272A
$col.text: #E4E4E7
$col.muted: #71717A
$primary: #3B82F6

// Components
Heading: col $col.text, weight bold, font-size 18
Body: col $col.text, font-size 13
Muted: col $col.muted, font-size 12

Card: pad 16, bg $bg.card, rad 8, gap 12

Button: pad 8 16, bg $primary, col white, rad 6, cursor pointer

// App
App hor, w full, h full, bg $bg.app

  Sidebar w 240, h full, bg $bg.surface, pad 16, gap 12
    Heading "Navigation"
    Button "Action"

  Main w full, pad 24, gap 16
    Heading "Dashboard"
    Card
      Body "Welcome to the app"
      Muted "Last updated: today"
`

console.log('=' .repeat(70))
console.log('ROUND-TRIP TEST: Mirror → React → Mirror')
console.log('=' .repeat(70))

// Step 1: Original Mirror
console.log('\n--- STEP 1: Original Mirror ---')
console.log(ORIGINAL_MIRROR.trim())

// Step 2: Parse and generate React
console.log('\n--- STEP 2: Generated React ---')
const ast = parse(ORIGINAL_MIRROR)
const reactCode = generateReact(ast)
console.log(reactCode)

// Step 3: Convert back to Mirror
console.log('\n--- STEP 3: Converted back to Mirror ---')
const convertedMirror = convertToMirrorCode(reactCode)
console.log(convertedMirror)

// Step 4: Compare
console.log('\n--- COMPARISON ---')
const originalLines = ORIGINAL_MIRROR.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('//'))
const convertedLines = convertedMirror.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'))

console.log(`Original lines: ${originalLines.length}`)
console.log(`Converted lines: ${convertedLines.length}`)

// Parse both to compare structure
const originalAst = parse(ORIGINAL_MIRROR)
const convertedAst = parse(convertedMirror)

console.log(`\nOriginal AST:`)
console.log(`  Tokens: ${originalAst.tokens.length}`)
console.log(`  Components: ${originalAst.components.length}`)
console.log(`  Instances: ${originalAst.instances.length}`)

console.log(`\nConverted AST:`)
console.log(`  Tokens: ${convertedAst.tokens.length}`)
console.log(`  Components: ${convertedAst.components.length}`)
console.log(`  Instances: ${convertedAst.instances.length}`)
