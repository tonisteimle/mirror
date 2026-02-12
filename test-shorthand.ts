import { parse } from './src/parser/parser'

const testCases = [
  {
    name: 'Definition with shorthand color',
    input: 'Tile: ver #3281d1 pad 20 rad 12 gap 8',
    checkRegistry: 'Tile',
  },
  {
    name: 'Inline shorthand color',
    input: 'Button #2271c1 pad 8 "Click"',
  },
  {
    name: 'Definition without colon',
    input: 'Tile ver #3281d1 pad 20',
  },
  {
    name: 'Definition then instance',
    input: `Tile: ver #3281d1 pad 20 rad 12 gap 8
Tile "Test"`,
  },
]

console.log('Testing shorthand color syntax:\n')

for (const tc of testCases) {
  const result = parse(tc.input)
  const errors = result.errors.filter(e => !e.startsWith('Warning:'))
  const node = result.nodes[0]

  console.log('Test:', tc.name)
  console.log('Input:', tc.input.split('\n')[0])

  // Check registry for definitions
  if (tc.checkRegistry) {
    const template = result.registry.get(tc.checkRegistry)
    console.log('Registry col:', template?.properties?.col)
    console.log('Registry props:', JSON.stringify(template?.properties))
  } else {
    console.log('Node col:', node?.properties?.col)
    console.log('Node props:', JSON.stringify(node?.properties))
  }

  if (errors.length > 0) {
    console.log('Errors:', errors)
  }
  console.log('')
}
