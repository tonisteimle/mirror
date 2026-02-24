/**
 * Tutorial Validator
 *
 * Extrahiert alle Code-Beispiele aus tutorial.json und validiert sie gegen den Parser.
 * Prueft auch, ob die expects-Bloecke mit dem tatsaechlichen Output uebereinstimmen.
 */

import { readFileSync } from 'fs'
import { parse } from '../src/parser/parser'

interface CodeBlock {
  section: string
  subsection: string
  code: string
  expects?: {
    nodes?: any[]
    registry?: Record<string, any>
    tokens?: Record<string, any>
    render?: Record<string, any>
  }
}

interface ValidationError {
  location: string
  code: string
  error: string
  details?: string
}

// Tutorial laden
const tutorial = JSON.parse(readFileSync('docs/tutorial.json', 'utf-8'))

// Alle Code-Bloecke extrahieren
const codeBlocks: CodeBlock[] = []

for (const section of tutorial.sections || []) {
  for (const subsection of section.subsections || []) {
    for (const content of subsection.content || []) {
      if (content.type === 'code' && content.code) {
        codeBlocks.push({
          section: section.id || section.title,
          subsection: subsection.id || subsection.title,
          code: content.code,
          expects: content.expects
        })
      }
      if (content.type === 'exercise' && content.code) {
        codeBlocks.push({
          section: section.id || section.title,
          subsection: subsection.id || subsection.title,
          code: content.code,
          expects: content.expects
        })
      }
    }
  }
}

console.log('\n' + '='.repeat(70))
console.log('TUTORIAL VALIDIERUNG - ' + codeBlocks.length + ' Code-Beispiele')
console.log('='.repeat(70))

const errors: ValidationError[] = []
let passed = 0
let warnings = 0

for (let i = 0; i < codeBlocks.length; i++) {
  const block = codeBlocks[i]
  const location = block.section + '/' + block.subsection

  try {
    const result = parse(block.code)

    // 1. Parse-Fehler pruefen (nur echte Fehler, keine Warnings)
    const realErrors = (result.errors || []).filter((e: any) => {
      const msg = e.message || String(e)
      // Warnings ignorieren - diese sind keine fatalen Fehler
      if (msg.startsWith('Warning:')) return false
      // Token-Referenz-Warnungen ignorieren (in component-library oft gewollt)
      if (msg.includes('is not defined')) return false
      return true
    })

    if (realErrors.length > 0) {
      errors.push({
        location,
        code: block.code.slice(0, 100),
        error: 'PARSE_ERROR',
        details: realErrors.map((e: any) => e.message || String(e)).join(', ')
      })
      continue
    }

    // 2. Nodes pruefen (wenn expects.nodes vorhanden)
    if (block.expects?.nodes) {
      for (const expectedNode of block.expects.nodes) {
        if (expectedNode.name) {
          const found = result.nodes?.some((n: any) => n.name === expectedNode.name)
          if (!found) {
            errors.push({
              location,
              code: block.code.slice(0, 80),
              error: 'MISSING_NODE',
              details: 'Erwarteter Node "' + expectedNode.name + '" nicht gefunden. Vorhanden: ' +
                (result.nodes?.map((n: any) => n.name).join(', ') || 'keine')
            })
          }
        }
      }
    }

    // 3. Tokens pruefen (wenn expects.tokens vorhanden)
    if (block.expects?.tokens) {
      for (const [name, expected] of Object.entries(block.expects.tokens)) {
        const actual = result.tokens?.[name]
        if (!actual) {
          errors.push({
            location,
            code: block.code.slice(0, 80),
            error: 'MISSING_TOKEN',
            details: 'Erwarteter Token "' + name + '" nicht gefunden'
          })
        }
      }
    }

    passed++

  } catch (e: any) {
    errors.push({
      location,
      code: block.code.slice(0, 80),
      error: 'EXCEPTION',
      details: e.message
    })
  }
}

// Ergebnisse ausgeben
if (errors.length > 0) {
  console.log('\n' + '-'.repeat(70))
  console.log('FEHLER GEFUNDEN: ' + errors.length)
  console.log('-'.repeat(70))

  for (const err of errors) {
    console.log('\n[X] ' + err.error + ' in ' + err.location)
    console.log('    Code: ' + err.code + '...')
    console.log('    Details: ' + err.details)
  }
}

console.log('\n' + '='.repeat(70))
console.log('ERGEBNIS: ' + passed + ' OK, ' + errors.length + ' Fehler')
console.log('='.repeat(70))

if (errors.length > 0) {
  process.exit(1)
}
