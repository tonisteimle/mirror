import { CodeModifier } from './src/studio/code-modifier'
import { parse } from './src/parser/parser'
import { toIR } from './src/ir'
import type { SemanticZone } from './src/studio/drop-zone-calculator'

// Test: Drop Button into empty Box with 'bot-right' zone
const source = `App bg #18181b, pad 20
  Box w 400, h 300, bg #27272a, rad 8`

// Parse and create sourceMap
const ast = parse(source)
const { sourceMap } = toIR(ast, true)

// Create CodeModifier
const modifier = new CodeModifier(source, sourceMap)

// Debug: Print sourceMap structure
console.log('SourceMap type:', typeof sourceMap)
console.log('SourceMap keys:', Object.keys(sourceMap))
console.log('SourceMap methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(sourceMap)))

// Get the Box node ID
const allNodes = sourceMap.getAllNodes()
console.log('All nodes count:', allNodes.length)
console.log('First node:', allNodes[0])

const boxNode = allNodes.find((n: any) => n.componentName === 'Box')
console.log('Box node:', boxNode)

if (!boxNode) {
  console.log('ERROR: Box node not found!')
  process.exit(1)
}

// Test insertWithWrapper with 'bot-right' zone
const result = modifier.insertWithWrapper(
  boxNode.nodeId,
  'Button',
  'bot-right' as SemanticZone,
  { textContent: 'Test' }
)

console.log('\n--- Result ---')
console.log('Success:', result.success)
console.log('Error:', result.error)
console.log('\n--- New Source ---')
console.log(result.newSource)

// Check if Box now has alignment properties
const boxLine = result.newSource.split('\n').find(l => l.includes('Box'))
console.log('\n--- Box Line ---')
console.log(boxLine)
console.log('Has "right":', boxLine?.includes('right'))
console.log('Has "bottom":', boxLine?.includes('bottom'))
