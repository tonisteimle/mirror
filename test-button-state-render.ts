import { parse } from './src/parser/parser'
import { propertiesToStyle } from './src/utils/style-converter'

const code = `Button col #2271c1 pad 12 24 rad 8 "Hover me"
  state hover
    col #1d5ba0
  state active
    col #174a83`

const result = parse(code)
console.log('Parse result:')
console.log('  errors:', result.errors)
console.log('  nodes:', result.nodes.length)

if (result.nodes.length > 0) {
  const node = result.nodes[0]
  console.log('\nNode:')
  console.log('  name:', JSON.stringify(node.name))
  console.log('  properties:', JSON.stringify(node.properties))
  console.log('  states:', node.states?.length || 0)
  
  if (node.states && node.states.length > 0) {
    for (const state of node.states) {
      console.log(`\n  State "${state.name}":`)
      console.log('    properties:', JSON.stringify(state.properties))
      
      // Test how propertiesToStyle handles these properties
      const stateStyle = propertiesToStyle(state.properties, node.children.length > 0, node.name)
      console.log('    propertiesToStyle result:', JSON.stringify(stateStyle))
      console.log('    backgroundColor:', stateStyle.backgroundColor)
      console.log('    color:', stateStyle.color)
    }
  }
  
  if (node.children && node.children.length > 0) {
    console.log('\n  Children:', node.children.length)
    for (const child of node.children) {
      console.log('    child name:', JSON.stringify(child.name))
    }
  }
}
