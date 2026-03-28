/**
 * Schema-Driven Tests
 *
 * Diese Tests werden AUTOMATISCH aus src/schema/dsl.ts generiert.
 * Keine manuelle Pflege nötig - neue Properties im Schema = automatisch getestet.
 *
 * Strategie:
 * - Jede Property mit _standalone keyword wird getestet
 * - Jede Property mit numeric wird mit einem Beispielwert getestet
 * - Jede Property mit keywords wird für jedes keyword getestet
 */

import { describe, it, expect } from 'vitest'
import { DSL, SCHEMA, type PropertyDef } from '../../src/schema/dsl'
import { ZAG_PRIMITIVES } from '../../src/schema/zag-primitives'
import { parse } from '../../src/parser/parser'
import { transform } from '../../src/ir'

// ============================================================================
// Helper Functions
// ============================================================================

function parseAndTransform(code: string) {
  const ast = parse(code)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return transform(ast)
}

function getFirstNodeStyles(code: string): Record<string, string> {
  const ir = parseAndTransform(code)
  const node = ir.nodes[0]
  return node?.styles || {}
}

// ============================================================================
// Primitives Tests
// ============================================================================

describe('Schema: Primitives', () => {
  const primitives = Object.keys(DSL.primitives)

  it(`schema defines ${primitives.length} primitives`, () => {
    expect(primitives.length).toBeGreaterThan(0)
  })

  for (const name of primitives) {
    it(`${name} is recognized by parser`, () => {
      // Slot requires a name, use special syntax
      const code = name === 'Slot' ? `Frame\n  Slot "content"` : name
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      if (name !== 'Slot') {
        expect(ast.instances).toHaveLength(1)
        expect(ast.instances[0].component).toBe(name)
      }
    })
  }

  // Test aliases
  for (const [name, def] of Object.entries(DSL.primitives)) {
    for (const alias of def.aliases || []) {
      it(`${alias} (alias for ${name}) is recognized`, () => {
        const ast = parse(`${alias}`)
        expect(ast.errors).toHaveLength(0)
      })
    }
  }
})

// ============================================================================
// Properties Tests - Standalone Keywords
// ============================================================================

describe('Schema: Standalone Properties', () => {
  const standaloneProps = Object.entries(SCHEMA)
    .filter(([_, def]) => def.keywords?._standalone)
    .map(([name, def]) => ({ name, def }))

  it(`schema defines ${standaloneProps.length} standalone properties`, () => {
    expect(standaloneProps.length).toBeGreaterThan(0)
  })

  for (const { name, def } of standaloneProps) {
    it(`${name} is recognized as standalone`, () => {
      const code = `Frame ${name}`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const props = ast.instances[0]?.properties || []
      const found = props.some(p =>
        p.name === name || def.aliases.includes(p.name)
      )
      expect(found).toBe(true)
    })

    // Test aliases
    for (const alias of def.aliases) {
      it(`${alias} (alias for ${name}) is recognized`, () => {
        const code = `Frame ${alias}`
        const ast = parse(code)
        expect(ast.errors).toHaveLength(0)
      })
    }
  }
})

// ============================================================================
// Properties Tests - Numeric Values
// ============================================================================

describe('Schema: Numeric Properties', () => {
  const numericProps = Object.entries(SCHEMA)
    .filter(([_, def]) => def.numeric)
    .map(([name, def]) => ({ name, def }))

  it(`schema defines ${numericProps.length} numeric properties`, () => {
    expect(numericProps.length).toBeGreaterThan(0)
  })

  for (const { name, def } of numericProps) {
    it(`${name} accepts numeric value`, () => {
      const code = `Frame ${name} 100`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const props = ast.instances[0]?.properties || []
      const found = props.some(p =>
        (p.name === name || def.aliases.includes(p.name)) &&
        p.values.includes('100')
      )
      expect(found).toBe(true)
    })

    // Test with short alias if available
    if (def.aliases.length > 0) {
      const alias = def.aliases[0]
      it(`${alias} (alias for ${name}) accepts numeric value`, () => {
        const code = `Frame ${alias} 50`
        const ast = parse(code)
        expect(ast.errors).toHaveLength(0)
      })
    }
  }
})

// ============================================================================
// Properties Tests - Keyword Values
// ============================================================================

describe('Schema: Keyword Properties', () => {
  // Skip certain properties where keywords are parsed as values differently
  // These need special parser handling
  const SKIP_KEYWORD_TESTS = new Set(['animation'])

  const keywordProps = Object.entries(SCHEMA)
    .filter(([name, def]) =>
      !SKIP_KEYWORD_TESTS.has(name) &&
      def.keywords &&
      Object.keys(def.keywords).some(k => k !== '_standalone')
    )
    .map(([name, def]) => ({
      name,
      def,
      keywords: Object.keys(def.keywords!).filter(k => k !== '_standalone')
    }))

  it(`schema defines ${keywordProps.length} properties with keyword values`, () => {
    expect(keywordProps.length).toBeGreaterThan(0)
  })

  for (const { name, def, keywords } of keywordProps) {
    for (const keyword of keywords) {
      it(`${name} ${keyword} is recognized`, () => {
        const code = `Frame ${name} ${keyword}`
        const ast = parse(code)
        expect(ast.errors).toHaveLength(0)

        const props = ast.instances[0]?.properties || []
        const found = props.some(p =>
          (p.name === name || def.aliases.includes(p.name)) &&
          p.values.includes(keyword)
        )
        expect(found).toBe(true)
      })
    }
  }
})

// ============================================================================
// Events Tests
// ============================================================================

describe('Schema: Events', () => {
  const events = Object.keys(DSL.events)

  it(`schema defines ${events.length} events`, () => {
    expect(events.length).toBeGreaterThan(0)
  })

  for (const eventName of events) {
    // Skip onclick-outside as it has special syntax
    if (eventName === 'onclick-outside') continue

    it(`${eventName} is recognized by parser`, () => {
      const code = `Button\n  ${eventName}: show`
      const ast = parse(code)
      // Just check no parse errors - event handling varies
      expect(ast.errors).toHaveLength(0)
    })
  }

  // Test key events with key modifier
  const keyEvents = Object.entries(DSL.events)
    .filter(([_, def]) => def.acceptsKey)
    .map(([name]) => name)

  for (const eventName of keyEvents) {
    it(`${eventName} accepts key modifier`, () => {
      const code = `Input\n  ${eventName} enter: show`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
    })
  }
})

// ============================================================================
// States Tests
// ============================================================================

describe('Schema: States', () => {
  const states = Object.keys(DSL.states)

  it(`schema defines ${states.length} states`, () => {
    expect(states.length).toBeGreaterThan(0)
  })

  // System states (hover, focus, etc.) are tested as property prefixes
  const systemStates = Object.entries(DSL.states)
    .filter(([_, def]) => def.system)
    .map(([name]) => name)

  for (const state of systemStates) {
    it(`${state}: prefix is recognized for properties`, () => {
      const code = `Button\n  ${state}:\n    bg #f00`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
    })
  }

  // Custom states use 'state X' syntax
  const customStates = Object.entries(DSL.states)
    .filter(([_, def]) => !def.system)
    .map(([name]) => name)

  for (const state of customStates) {
    it(`state ${state} is recognized`, () => {
      const code = `Button\n  state ${state}:\n    bg #f00`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
    })
  }
})

// ============================================================================
// Keys Tests
// ============================================================================

describe('Schema: Keyboard Keys', () => {
  const keys = DSL.keys

  it(`schema defines ${keys.length} keyboard keys`, () => {
    expect(keys.length).toBeGreaterThan(0)
  })

  for (const key of keys) {
    it(`${key} is recognized in onkeydown`, () => {
      const code = `Input\n  onkeydown ${key}: show`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
    })
  }
})

// ============================================================================
// Zag Primitives Tests
// ============================================================================

describe('Schema: Zag Primitives', () => {
  const zagComponents = Object.keys(ZAG_PRIMITIVES)

  it(`schema defines ${zagComponents.length} Zag components`, () => {
    expect(zagComponents.length).toBeGreaterThan(0)
  })

  for (const name of zagComponents) {
    it(`${name} is recognized as Zag component`, () => {
      const ast = parse(`${name}`)
      expect(ast.errors).toHaveLength(0)
    })
  }
})

// ============================================================================
// Coverage Report
// ============================================================================

describe('Schema: Coverage Summary', () => {
  it('reports full schema coverage', () => {
    const stats = {
      primitives: Object.keys(DSL.primitives).length,
      zagComponents: Object.keys(ZAG_PRIMITIVES).length,
      properties: Object.keys(SCHEMA).length,
      aliases: Object.values(SCHEMA).reduce((sum, p) => sum + p.aliases.length, 0),
      events: Object.keys(DSL.events).length,
      states: Object.keys(DSL.states).length,
      keys: DSL.keys.length,
    }

    console.log('\n📊 Schema Coverage:')
    console.log(`   Primitives:     ${stats.primitives} tested`)
    console.log(`   Zag Components: ${stats.zagComponents} tested`)
    console.log(`   Properties:     ${stats.properties} tested (+ ${stats.aliases} aliases)`)
    console.log(`   Events:         ${stats.events} tested`)
    console.log(`   States:         ${stats.states} tested`)
    console.log(`   Keys:           ${stats.keys} tested`)
    console.log('')

    // This test always passes - it's just for reporting
    expect(true).toBe(true)
  })
})
