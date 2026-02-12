import { readFileSync } from 'fs'
import { parse } from './src/parser/parser'
import { generateReactCode } from './src/generator/react-generator'

const code = readFileSync('./test-tutorial-final.mirror', 'utf-8')

console.log('=== PARSING TUTORIAL FINAL EXAMPLE ===\n')

const result = parse(code)

console.log('--- PARSE ERRORS ---')
if (result.errors.length === 0) {
  console.log('✅ No parse errors!\n')
} else {
  console.log('❌ Parse errors found:')
  result.errors.forEach((err, i) => {
    console.log(`  ${i + 1}. Line ${err.line}: ${err.message}`)
  })
  console.log()
}

console.log('--- PARSE WARNINGS ---')
if (result.warnings.length === 0) {
  console.log('✅ No warnings!\n')
} else {
  console.log('⚠️  Warnings:')
  result.warnings.forEach((warn, i) => {
    console.log(`  ${i + 1}. Line ${warn.line}: ${warn.message}`)
  })
  console.log()
}

console.log('--- AST STRUCTURE ---')
console.log(`Root nodes: ${result.nodes.length}`)
console.log(`Design tokens: ${result.designTokens.size}`)
console.log(`Component definitions: ${result.componentDefinitions.size}`)
console.log()

// List tokens
console.log('Tokens defined:')
for (const [name, value] of result.designTokens) {
  const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value)
  console.log(`  ${name}: ${valueStr}`)
}
console.log()

// List component definitions
console.log('Components defined:')
for (const [name] of result.componentDefinitions) {
  console.log(`  ${name}`)
}
console.log()

// Try to generate React
console.log('--- REACT GENERATION ---')
try {
  const reactOutput = generateReactCode(result.nodes)
  console.log('✅ React generated successfully!')
  console.log(`Output length: ${reactOutput.length} characters`)
  console.log()

  // Show first 2000 chars
  console.log('--- GENERATED REACT (first 2000 chars) ---')
  console.log(reactOutput.substring(0, 2000))
  console.log('...')
} catch (err) {
  console.log('❌ React generation failed:')
  console.log(err)
}
