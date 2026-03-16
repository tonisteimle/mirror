/**
 * Test Interactive Components: Events, States, Actions
 */

import { parse, generateReact } from '../src/index'

const INTERACTIVE_MIRROR = `
// Tokens
$bg.app: #09090B
$bg.surface: #18181B
$bg.card: #27272A
$bg.hover: #3F3F46
$col.text: #E4E4E7
$col.muted: #71717A
$primary: #3B82F6
$primary.hover: #2563EB

// Interactive Components
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

ToggleButton: pad 8 16, bg $bg.surface, col $col.text, rad 6, cursor pointer
  state on
    bg $primary
  onclick toggle self

// App
App ver, w full, h full, bg $bg.app, pad 24, gap 16

  Menu ver, gap 4
    MenuItem "Dashboard"
    MenuItem "Settings"
    MenuItem "Profile"

  Actions hor, gap 8
    ToggleButton "Dark Mode"
    Card
      Body "Hover over me"
`

console.log('=' .repeat(70))
console.log('INTERACTIVE COMPONENT TEST')
console.log('=' .repeat(70))

console.log('\n--- INPUT (Mirror with Events/States) ---')
console.log(INTERACTIVE_MIRROR.trim())

console.log('\n--- OUTPUT (React) ---')
const ast = parse(INTERACTIVE_MIRROR)
const reactCode = generateReact(ast)
console.log(reactCode)

// Verify AST structure
console.log('\n--- AST ANALYSIS ---')
console.log('Tokens:', ast.tokens?.length || 0)
console.log('Components:', ast.components?.length || 0)

for (const comp of ast.components || []) {
  console.log(`\n  ${comp.name}:`)
  console.log(`    Properties: ${comp.properties.length}`)
  console.log(`    States: ${comp.states?.length || 0}`)
  console.log(`    Events: ${comp.events?.length || 0}`)

  for (const state of comp.states || []) {
    console.log(`      - state ${state.name}: ${state.properties.map(p => p.name).join(', ')}`)
  }

  for (const event of comp.events || []) {
    console.log(`      - ${event.name}: ${event.actions.map(a => `${a.name} ${a.target}`).join(', ')}`)
  }
}
