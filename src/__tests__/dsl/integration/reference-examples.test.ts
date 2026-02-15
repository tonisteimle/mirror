/**
 * Reference Examples Tests
 *
 * Automatisch generierte Tests aus reference.json.
 * Jedes Code-Beispiel aus der Referenz wird getestet:
 * - Parst ohne Fehler
 * - Rendert ohne Exceptions
 * - Validiert expects (wenn vorhanden)
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../../parser/parser'
import { generateReactElement } from '../../../generator/react-generator'

// Lade die Referenz
const refPath = join(__dirname, '../../../../docs/reference.json')
const reference = JSON.parse(readFileSync(refPath, 'utf-8'))

// Typen für expects
interface ExpectedNode {
  name?: string
  textContent?: string
  properties?: Record<string, any>
  children?: ExpectedNode[]
  childCount?: number
  childNames?: string[]
  states?: Array<{ name: string; properties?: Record<string, any> }>
  eventHandlers?: Array<{ event: string; actions?: Array<{ type: string; target?: string }> }>
}

interface ExpectedToken {
  value?: any
}

interface Expects {
  nodes?: ExpectedNode[]
  registry?: Record<string, ExpectedNode>
  tokens?: Record<string, ExpectedToken>
}

interface CodeExample {
  section: string
  subsection: string
  index: number
  html: string
  code: string
  expects?: Expects
}

// Strip HTML tags to get plain DSL code
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')  // Remove all HTML tags
    .replace(/&lt;/g, '<')     // Decode HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractCodeExamples(): CodeExample[] {
  const examples: CodeExample[] = []

  for (const section of reference.sections || []) {
    for (const subsection of section.subsections || []) {
      let codeIndex = 0
      for (const content of subsection.content || []) {
        if (content.type === 'code' && content.html) {
          const code = stripHtml(content.html)
          examples.push({
            section: section.title || section.id,
            subsection: subsection.title || subsection.id,
            index: codeIndex++,
            html: content.html,
            code: code,
            expects: content.expects
          })
        }
      }
    }
  }

  return examples
}

const allExamples = extractCodeExamples()
const examplesWithExpects = allExamples.filter(e => e.expects)

// Gruppiere nach Section
const examplesBySection = allExamples.reduce((acc, ex) => {
  const key = ex.section
  if (!acc[key]) acc[key] = []
  acc[key].push(ex)
  return acc
}, {} as Record<string, CodeExample[]>)

// Helper: Prüft ob Code ohne Fehler parst
function expectParses(code: string): void {
  const result = parse(code)
  const errors = result.errors.filter(e => !e.startsWith('Warning:'))
  expect(errors).toHaveLength(0)
}

// Helper: Prüft ob Code rendert
function expectRenders(code: string): void {
  const result = parse(code)
  expect(() => {
    generateReactElement(result.nodes, {
      tokens: result.tokens,
      registry: result.registry
    })
  }).not.toThrow()
}

// Helper: Extrahiert Text-Content aus Node (kann in _text Child sein)
function getTextContent(node: any): string | undefined {
  // Direkt auf Node
  if (node.content) return node.content

  // In _text Child
  const textChild = node.children?.find((c: any) => c.name === '_text')
  if (textChild?.content) return textChild.content

  // In erstem Child mit content
  const firstContentChild = node.children?.find((c: any) => c.content)
  if (firstContentChild?.content) return firstContentChild.content

  return undefined
}

// Property alias mapping
const PROPERTY_ALIASES: Record<string, string[]> = {
  'hor': ['hor', 'horizontal'],
  'horizontal': ['hor', 'horizontal'],
  'ver': ['ver', 'vertical'],
  'vertical': ['ver', 'vertical'],
  'bg': ['bg', 'background'],
  'background': ['bg', 'background'],
  'col': ['col', 'color'],
  'color': ['col', 'color'],
  'pad': ['pad', 'padding'],
  'padding': ['pad', 'padding'],
  'mar': ['mar', 'margin'],
  'margin': ['mar', 'margin'],
  'rad': ['rad', 'radius'],
  'radius': ['rad', 'radius'],
  'bor': ['bor', 'border'],
  'border': ['bor', 'border'],
  'w': ['w', 'width'],
  'width': ['w', 'width'],
  'h': ['h', 'height'],
  'height': ['h', 'height'],
  'opa': ['opa', 'opacity'],
  'opacity': ['opa', 'opacity'],
}

function getPropertyValue(props: any, key: string): any {
  if (!props) return undefined
  const aliases = PROPERTY_ALIASES[key] || [key]
  for (const alias of aliases) {
    if (props[alias] !== undefined) return props[alias]
  }
  return undefined
}

// Validation helpers
function validateNode(actual: any, expected: ExpectedNode, path: string): void {
  if (expected.name !== undefined) {
    expect(actual.name, `${path}.name`).toBe(expected.name)
  }

  if (expected.textContent !== undefined) {
    const actualText = getTextContent(actual)
    expect(actualText, `${path}.textContent`).toBe(expected.textContent)
  }

  if (expected.properties) {
    for (const [key, value] of Object.entries(expected.properties)) {
      const actualValue = getPropertyValue(actual.properties, key)
      expect(actualValue, `${path}.properties.${key}`).toBe(value)
    }
  }

  if (expected.childCount !== undefined) {
    expect(actual.children?.length, `${path}.childCount`).toBe(expected.childCount)
  }

  if (expected.childNames !== undefined) {
    const actualNames = actual.children?.map((c: any) => c.name) || []
    expect(actualNames, `${path}.childNames`).toEqual(expected.childNames)
  }
}

function validateExpects(result: any, expects: Expects): void {
  // Validate nodes
  if (expects.nodes) {
    for (let i = 0; i < expects.nodes.length; i++) {
      const expectedNode = expects.nodes[i]
      const actualNode = result.nodes[i]
      expect(actualNode, `nodes[${i}]`).toBeDefined()
      validateNode(actualNode, expectedNode, `nodes[${i}]`)
    }
  }

  // Validate registry
  if (expects.registry) {
    for (const [name, expectedNode] of Object.entries(expects.registry)) {
      const actual = result.registry.get(name)
      expect(actual, `registry.${name}`).toBeDefined()
      validateNode(actual, expectedNode, `registry.${name}`)
    }
  }

  // Validate tokens
  if (expects.tokens) {
    for (const [name, expectedToken] of Object.entries(expects.tokens)) {
      const tokenName = name.startsWith('$') ? name.slice(1) : name
      const actualValue = result.tokens.get(tokenName)
      expect(actualValue, `tokens.${name}`).toBeDefined()
      if (expectedToken.value !== undefined) {
        expect(actualValue, `tokens.${name}.value`).toBe(expectedToken.value)
      }
    }
  }
}

// ============================================
// TESTS
// ============================================

describe('Reference Examples', () => {
  // Tests für jede Section
  for (const [sectionName, examples] of Object.entries(examplesBySection)) {
    describe(sectionName, () => {
      for (const example of examples) {
        const testName = `${example.subsection} #${example.index + 1}`

        it(`parses: ${testName}`, () => {
          expectParses(example.code)
        })

        it(`renders: ${testName}`, () => {
          expectRenders(example.code)
        })
      }
    })
  }
})

describe('Reference Expects Validation', () => {
  for (const example of examplesWithExpects) {
    const testName = `${example.section} > ${example.subsection} #${example.index + 1}`

    it(`validates: ${testName}`, () => {
      const result = parse(example.code)
      validateExpects(result, example.expects!)
    })
  }
})

describe('Coverage Statistics', () => {
  it('reports coverage', () => {
    const sections = new Set(allExamples.map(e => e.section))
    console.log(`\n📊 Reference Coverage:`)
    console.log(`   Total code examples: ${allExamples.length}`)
    console.log(`   With expects: ${examplesWithExpects.length}`)
    console.log(`   Sections: ${sections.size}`)
    expect(true).toBe(true)
  })
})
