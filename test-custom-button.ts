import { parse } from './src/parser/parser'

const testCode = `
$primary-col: #5C33CF
$md-space: 12
$xl-space: 24
$sm-rad: 8

// My custom button (not using library name)
MyButton: pad $md-space $xl-space bg $primary-col rad $sm-rad col #FFF

// Layout
MyButton "Click me"
`

const result = parse(testCode)

console.log('=== MYBUTTON DEFINITION ===')
const def = result.registry.get('MyButton')
if (def) {
  console.log('Properties:', JSON.stringify(def.properties, null, 2))
} else {
  console.log('MyButton not found!')
}

console.log('\n=== LAYOUT NODE ===')
if (result.nodes[0]) {
  console.log('Node:', result.nodes[0].name)
  console.log('Properties:', JSON.stringify(result.nodes[0].properties, null, 2))
}

console.log('\n=== ERRORS ===')
for (const err of result.errors || []) {
  console.log(err)
}
