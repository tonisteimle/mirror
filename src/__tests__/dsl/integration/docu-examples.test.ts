/**
 * Documentation Examples Tests
 *
 * Automatisch generierte Tests aus mirror-docu.json.
 * Jedes Code-Beispiel aus der Dokumentation wird getestet:
 * - Parst ohne Fehler
 * - Rendert ohne Exceptions
 * - Validiert expects (wenn vorhanden)
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../../parser/parser'
import { generateReactElement } from '../../../generator/react-generator'

// Lade die Dokumentation
const docuPath = join(__dirname, '../../../../docs/mirror-docu.json')
const docu = JSON.parse(readFileSync(docuPath, 'utf-8'))

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

interface Expects {
  nodes?: ExpectedNode[]
  registry?: Record<string, ExpectedNode>
}

interface CodeExample {
  section: string
  subsection: string
  index: number
  code: string
  expects?: Expects
}

function extractCodeExamples(): CodeExample[] {
  const examples: CodeExample[] = []

  for (const section of docu.sections || []) {
    for (const subsection of section.subsections || []) {
      let codeIndex = 0
      for (const content of subsection.content || []) {
        if (content.type === 'code' && content.code) {
          examples.push({
            section: section.title || section.id,
            subsection: subsection.title || subsection.id,
            index: codeIndex++,
            code: content.code,
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
  if (node.textContent) return node.textContent
  if (node.content) return node.content
  // In _text Child
  const textChild = node.children?.find((c: any) => c.name === '_text')
  if (textChild?.content) return textChild.content
  return undefined
}

// Property Alias Mapping (short → long und umgekehrt)
const PROPERTY_ALIASES: Record<string, string[]> = {
  'hor': ['hor', 'horizontal'],
  'horizontal': ['hor', 'horizontal'],
  'ver': ['ver', 'vertical'],
  'vertical': ['ver', 'vertical'],
  'bg': ['bg', 'background'],
  'background': ['bg', 'background'],
  'pad': ['pad', 'padding'],
  'padding': ['pad', 'padding'],
  'rad': ['rad', 'radius'],
  'radius': ['rad', 'radius'],
  'col': ['col', 'color'],
  'color': ['col', 'color'],
}

// Helper: Prüft ob Property existiert (mit Alias-Support)
function getPropertyValue(props: any, key: string): any {
  if (!props) return undefined
  const aliases = PROPERTY_ALIASES[key] || [key]
  for (const alias of aliases) {
    if (props[alias] !== undefined) return props[alias]
  }
  return undefined
}

// Helper: Validiert einen Node gegen erwartete Werte
function validateNode(actual: any, expected: ExpectedNode, path: string = 'node'): void {
  if (expected.name !== undefined) {
    expect(actual.name, `${path}.name`).toBe(expected.name)
  }

  if (expected.textContent !== undefined) {
    const actualText = getTextContent(actual)
    expect(actualText, `${path}.textContent`).toBe(expected.textContent)
  }

  if (expected.properties !== undefined) {
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

  if (expected.children !== undefined) {
    expect(actual.children?.length, `${path}.children.length`).toBeGreaterThanOrEqual(expected.children.length)
    for (let i = 0; i < expected.children.length; i++) {
      validateNode(actual.children[i], expected.children[i], `${path}.children[${i}]`)
    }
  }

  if (expected.states !== undefined) {
    expect(actual.states?.length, `${path}.states.length`).toBeGreaterThanOrEqual(expected.states.length)
    for (const expectedState of expected.states) {
      const actualState = actual.states?.find((s: any) => s.name === expectedState.name)
      expect(actualState, `${path}.states.${expectedState.name}`).toBeDefined()
      if (expectedState.properties) {
        for (const [key, value] of Object.entries(expectedState.properties)) {
          const actualValue = getPropertyValue(actualState.properties, key)
          expect(actualValue, `${path}.states.${expectedState.name}.properties.${key}`).toBe(value)
        }
      }
    }
  }

  if (expected.eventHandlers !== undefined) {
    expect(actual.eventHandlers?.length, `${path}.eventHandlers.length`).toBeGreaterThanOrEqual(expected.eventHandlers.length)
    for (const expectedHandler of expected.eventHandlers) {
      const actualHandler = actual.eventHandlers?.find((h: any) => h.event === expectedHandler.event)
      expect(actualHandler, `${path}.eventHandlers.${expectedHandler.event}`).toBeDefined()
      if (expectedHandler.actions) {
        for (let i = 0; i < expectedHandler.actions.length; i++) {
          const expectedAction = expectedHandler.actions[i]
          const actualAction = actualHandler.actions?.[i]
          expect(actualAction?.type, `${path}.eventHandlers.${expectedHandler.event}.actions[${i}].type`).toBe(expectedAction.type)
          if (expectedAction.target !== undefined) {
            expect(actualAction?.target, `${path}.eventHandlers.${expectedHandler.event}.actions[${i}].target`).toBe(expectedAction.target)
          }
        }
      }
    }
  }
}

// Helper: Validiert expects gegen Parse-Ergebnis
function validateExpects(code: string, expects: Expects): void {
  const result = parse(code)

  if (expects.nodes) {
    expect(result.nodes.length, 'nodes.length').toBeGreaterThanOrEqual(expects.nodes.length)
    for (let i = 0; i < expects.nodes.length; i++) {
      validateNode(result.nodes[i], expects.nodes[i], `nodes[${i}]`)
    }
  }

  if (expects.registry) {
    for (const [name, expectedNode] of Object.entries(expects.registry)) {
      const actual = result.registry.get(name)
      expect(actual, `registry.${name}`).toBeDefined()
      validateNode(actual, expectedNode, `registry.${name}`)
    }
  }
}

// Tests für alle Beispiele (parsen + rendern)
describe('Documentation Examples', () => {
  for (const [sectionName, examples] of Object.entries(examplesBySection)) {
    describe(sectionName, () => {
      for (const example of examples) {
        const testName = example.subsection
          ? `${example.subsection} #${example.index + 1}`
          : `Example #${example.index + 1}`

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

// Tests für expects-Validierung
describe('Documentation Expects Validation', () => {
  for (const example of examplesWithExpects) {
    const testName = example.subsection
      ? `${example.section} > ${example.subsection} #${example.index + 1}`
      : `${example.section} #${example.index + 1}`

    it(`validates: ${testName}`, () => {
      validateExpects(example.code, example.expects!)
    })
  }
})

// Statistik
describe('Coverage Statistics', () => {
  it('reports coverage', () => {
    console.log(`\n📊 Documentation Coverage:`)
    console.log(`   Total code examples: ${allExamples.length}`)
    console.log(`   With expects: ${examplesWithExpects.length}`)
    console.log(`   Sections: ${Object.keys(examplesBySection).length}`)
    expect(allExamples.length).toBeGreaterThan(0)
  })
})
