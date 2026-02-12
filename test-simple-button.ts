import { parse } from './src/parser/parser'

const testCode = `
$md-space: 12
$xl-space: 24
$primary-col: #5C33CF
$sm-rad: 8

Button: pad $md-space $xl-space bg $primary-col rad $sm-rad
`

console.log('Testing simple Button definition...\n')

const result = parse(testCode)

console.log('=== TOKENS ===')
for (const [name, value] of result.tokens) {
  console.log(`$${name}: ${JSON.stringify(value)}`)
}

console.log('\n=== BUTTON DEFINITION ===')
const buttonDef = result.registry.get('Button')
if (buttonDef) {
  console.log('Properties:', JSON.stringify(buttonDef.properties, null, 2))
} else {
  console.log('Button not found!')
}

console.log('\n=== ERRORS ===')
for (const err of result.errors || []) {
  console.log(err)
}
