import { parse } from './src/parser/parser'
import { MOON_TOKENS, MOON_COMPONENTS } from './src/templates/moon-library'

const testCode = `${MOON_TOKENS}

${MOON_COMPONENTS}

// Layout
Page
  Section
    Card
      H2 "Welcome"
      Row
        Button "Primary"
        ButtonSecondary "Secondary"
`

const result = parse(testCode)

console.log('=== BUTTON DEFINITION ===')
const buttonDef = result.registry.get('Button')
if (buttonDef) {
  console.log('Button properties:', JSON.stringify(buttonDef.properties, null, 2))
} else {
  console.log('Button not found in registry!')
}

console.log('\n=== BUTTONSECONDARY DEFINITION ===')
const buttonSecDef = result.registry.get('ButtonSecondary')
if (buttonSecDef) {
  console.log('ButtonSecondary properties:', JSON.stringify(buttonSecDef.properties, null, 2))
} else {
  console.log('ButtonSecondary not found in registry!')
}

console.log('\n=== LAYOUT NODES (Button instances) ===')
function findButtons(nodes: any[]): void {
  for (const node of nodes) {
    if (node.name === 'Button' || node.name === 'ButtonSecondary') {
      console.log(`${node.name}: ${JSON.stringify(node.properties)}`)
    }
    if (node.children) {
      findButtons(node.children)
    }
  }
}
findButtons(result.nodes)

console.log('\n=== ERRORS ===')
for (const err of result.errors || []) {
  console.log(err)
}
