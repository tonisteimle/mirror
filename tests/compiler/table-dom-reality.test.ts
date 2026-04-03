/**
 * Table DOM Backend Reality Check
 *
 * Prüft, welchen Code der DOM Backend für Table generiert.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function compileToDOM(source: string): string {
  const ast = parse(source)
  if (ast.errors.length > 0) {
    console.log('Parse errors:', ast.errors)
  }
  return generateDOM(ast)
}

describe('Table - DOM Backend Reality Check', () => {
  it('generates code for Table $tasks', () => {
    const code = compileToDOM(`Table $tasks`)

    console.log('Generated code:\n', code)

    // Was erwarten wir?
    // - mirror-table class
    // - Daten-Iteration über $tasks
    // - Header-Generierung
    // - Row-Generierung

    // Was bekommen wir wahrscheinlich?
    // - Generisches div mit compound styles
  })

  it('generates code for Table with Columns', () => {
    const code = compileToDOM(`
Table $tasks
  Column titel, w 250
  Column effort, suffix "h"
`)

    console.log('Generated code:\n', code)
  })

  it('generates code for Table with select()', () => {
    const code = compileToDOM(`Table $tasks, select()`)

    console.log('Generated code:\n', code)

    // Check for selection-related code
    const hasSelection = code.includes('selected') || code.includes('$selected')
    console.log('Has selection code?:', hasSelection)
  })

  it('generates code for Table with data', () => {
    const code = compileToDOM(`
$tasks: [
  { titel: "Review", effort: 8 }
]

Table $tasks
`)

    console.log('Generated code:\n', code)

    // Check for data iteration
    const hasIteration = code.includes('forEach') || code.includes('$tasks')
    console.log('Has data iteration?:', hasIteration)
  })
})

describe('Table - DOM Backend Gap Analysis', () => {
  it('documents expected vs actual output', () => {
    const source = `
$tasks: [
  { titel: "Review", effort: 8 },
  { titel: "Deploy", effort: 2 }
]

Table $tasks, select()
  Column titel, w 250
  Column effort, suffix "h"
`

    const code = compileToDOM(source)

    console.log('\n=== Expected Output (from plan) ===')
    console.log(`
const table1 = document.createElement('div')
table1.className = 'mirror-table'
let data1 = $get("tasks") || []
// Header generation
// Row iteration with forEach
// Selection handling
`)

    console.log('\n=== Actual Output ===')
    console.log(code)

    console.log('\n=== Missing Features ===')

    const missing = []
    if (!code.includes('mirror-table')) missing.push('mirror-table class')
    if (!code.includes('forEach')) missing.push('Data iteration')
    if (!code.includes('$get') && !code.includes('$tasks')) missing.push('Data source binding')
    if (!code.includes('selected') && !code.includes('$selected')) missing.push('Selection handling')
    if (!code.includes('sort')) missing.push('Sorting')
    if (!code.includes('filter')) missing.push('Filtering')

    console.log(missing.length > 0 ? missing.join(', ') : 'None!')

    expect(true).toBe(true) // Documentation test
  })
})
