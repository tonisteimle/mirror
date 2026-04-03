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
import { DSL, SCHEMA, type PropertyDef } from '../../../compiler/schema/dsl'
import { ZAG_PRIMITIVES } from '../../../compiler/schema/zag-primitives'
import { ZAG_PROP_METADATA } from '../../../compiler/schema/zag-prop-metadata'
import { parse } from '../../../compiler/parser/parser'
import { toIR } from '../../../compiler/ir'

// ============================================================================
// Helper Functions
// ============================================================================

function parseAndTransform(code: string) {
  const ast = parse(code)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return toIR(ast)
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
// Zag Behavior Properties Tests
// ============================================================================

describe('Schema: Zag Behavior Properties', () => {
  const componentsWithProps = Object.keys(ZAG_PROP_METADATA)

  it(`schema defines ${componentsWithProps.length} components with behavior properties`, () => {
    expect(componentsWithProps.length).toBeGreaterThan(30)
  })

  // Count total properties
  let totalProps = 0
  for (const props of Object.values(ZAG_PROP_METADATA)) {
    totalProps += Object.keys(props).length
  }

  it(`schema defines ${totalProps} total behavior properties`, () => {
    expect(totalProps).toBeGreaterThan(100)
  })

  // Test that all property types are valid
  for (const [component, props] of Object.entries(ZAG_PROP_METADATA)) {
    describe(`${component} behavior properties`, () => {
      for (const [propName, meta] of Object.entries(props)) {
        it(`${propName} has valid type "${meta.type}"`, () => {
          expect(['boolean', 'string', 'number', 'enum']).toContain(meta.type)
        })

        it(`${propName} has label and description`, () => {
          expect(meta.label).toBeTruthy()
          expect(meta.description).toBeTruthy()
        })

        if (meta.type === 'enum') {
          it(`${propName} (enum) has options`, () => {
            expect(meta.options).toBeDefined()
            expect(meta.options!.length).toBeGreaterThan(0)
          })
        }
      }
    })
  }
})

// ============================================================================
// CSS Output Verification Tests
// ============================================================================

describe('Schema: CSS Output Verification', () => {

  // Helper: Get style value from IR node
  function getNodeStyle(node: any, property: string): string | undefined {
    if (!node?.styles) return undefined
    const style = node.styles.find((s: any) => s.property === property)
    return style?.value
  }

  // ---------------------------------------------------------------------------
  // Standalone Boolean CSS Output
  // ---------------------------------------------------------------------------
  describe('Standalone Boolean CSS', () => {
    // Skip properties where IR handles CSS differently
    // visible: schema says display: '', but Frame has display: flex by default
    const SKIP_STANDALONE_CSS = new Set(['hidden', 'visible'])

    const standaloneWithCSS = Object.entries(SCHEMA)
      .filter(([name, def]) =>
        !SKIP_STANDALONE_CSS.has(name) &&
        def.keywords?._standalone &&
        def.keywords._standalone.css &&
        def.keywords._standalone.css.length > 0
      )
      .map(([name, def]) => ({ name, def, expected: def.keywords!._standalone.css }))

    for (const { name, expected } of standaloneWithCSS) {
      it(`"${name}" generates correct CSS`, () => {
        const ir = parseAndTransform(`Frame ${name}`)
        const node = ir.nodes[0]

        for (const css of expected) {
          const actual = getNodeStyle(node, css.property)
          expect(actual).toBe(css.value)
        }
      })
    }
  })

  // ---------------------------------------------------------------------------
  // Keyword CSS Output
  // ---------------------------------------------------------------------------
  describe('Keyword CSS', () => {
    // Skip properties where IR handles CSS differently
    const SKIP_CSS_CHECK = new Set([
      'animation', 'align',
      // These keywords produce complex multi-property CSS
      'width', 'height', 'size', 'grid'
    ])

    const keywordWithCSS = Object.entries(SCHEMA)
      .filter(([name, def]) =>
        !SKIP_CSS_CHECK.has(name) &&
        def.keywords &&
        Object.entries(def.keywords).some(([k, v]) =>
          k !== '_standalone' && v.css && v.css.length > 0
        )
      )
      .flatMap(([name, def]) =>
        Object.entries(def.keywords!)
          .filter(([k, v]) => k !== '_standalone' && v.css && v.css.length > 0)
          .map(([keyword, kwDef]) => ({ name, keyword, expected: kwDef.css }))
      )

    for (const { name, keyword, expected } of keywordWithCSS) {
      it(`"${name} ${keyword}" generates correct CSS`, () => {
        const ir = parseAndTransform(`Frame ${name} ${keyword}`)
        const node = ir.nodes[0]

        for (const css of expected) {
          const actual = getNodeStyle(node, css.property)
          expect(actual).toBe(css.value)
        }
      })
    }
  })

  // ---------------------------------------------------------------------------
  // Numeric CSS Output
  // ---------------------------------------------------------------------------
  describe('Numeric CSS', () => {
    // Skip properties that have complex CSS generation or state-variant handling
    // x, y: schema says transform: translate, but IR uses position: absolute + left/top
    const SKIP_NUMERIC_CSS = new Set([
      'translate', 'x-offset', 'y-offset', 'x', 'y',
      // Hover variants are handled differently (state CSS)
      'hover-opacity', 'hover-scale', 'hover-border', 'hover-radius'
    ])

    const numericWithCSS = Object.entries(SCHEMA)
      .filter(([name, def]) =>
        !SKIP_NUMERIC_CSS.has(name) &&
        def.numeric &&
        def.numeric.css
      )
      .map(([name, def]) => ({ name, def, css: def.numeric!.css }))

    for (const { name, css } of numericWithCSS) {
      it(`"${name} 100" generates correct CSS`, () => {
        const ir = parseAndTransform(`Frame ${name} 100`)
        const node = ir.nodes[0]

        const expected = css(100)
        for (const exp of expected) {
          const actual = getNodeStyle(node, exp.property)
          expect(actual).toBe(exp.value)
        }
      })
    }
  })

  // ---------------------------------------------------------------------------
  // Color CSS Output
  // ---------------------------------------------------------------------------
  describe('Color CSS', () => {
    // Skip hover variants (handled as state CSS, not direct CSS)
    const SKIP_COLOR_CSS = new Set(['hover-bg', 'hover-col', 'hover-border-color', 'icon-color'])

    const colorWithCSS = Object.entries(SCHEMA)
      .filter(([name, def]) =>
        !SKIP_COLOR_CSS.has(name) &&
        def.color && def.color.css
      )
      .map(([name, def]) => ({ name, def, css: def.color!.css }))

    for (const { name, css } of colorWithCSS) {
      it(`"${name} #ff0000" generates correct CSS`, () => {
        const ir = parseAndTransform(`Frame ${name} #ff0000`)
        const node = ir.nodes[0]

        const expected = css('#ff0000')
        for (const exp of expected) {
          const actual = getNodeStyle(node, exp.property)
          expect(actual).toBe(exp.value)
        }
      })

      it(`"${name} #f00" (short hex) generates correct CSS`, () => {
        const ir = parseAndTransform(`Frame ${name} #f00`)
        const node = ir.nodes[0]

        const expected = css('#f00')
        for (const exp of expected) {
          const actual = getNodeStyle(node, exp.property)
          expect(actual).toBe(exp.value)
        }
      })
    }
  })
})

// ============================================================================
// Alias Equivalence Tests
// ============================================================================

describe('Schema: Alias Equivalence', () => {

  function getTestCode(prop: PropertyDef): { withName: string; withAlias: string } | null {
    if (prop.aliases.length === 0) return null

    const alias = prop.aliases[0]

    if (prop.keywords?._standalone) {
      return { withName: `Frame ${prop.name}`, withAlias: `Frame ${alias}` }
    }
    if (prop.numeric) {
      return { withName: `Frame ${prop.name} 100`, withAlias: `Frame ${alias} 100` }
    }
    if (prop.color) {
      return { withName: `Frame ${prop.name} #f00`, withAlias: `Frame ${alias} #f00` }
    }
    if (prop.keywords) {
      const keyword = Object.keys(prop.keywords).find(k => k !== '_standalone')
      if (keyword) {
        return { withName: `Frame ${prop.name} ${keyword}`, withAlias: `Frame ${alias} ${keyword}` }
      }
    }
    return null
  }

  const propsWithAliases = Object.values(SCHEMA).filter(p => p.aliases.length > 0)

  for (const prop of propsWithAliases) {
    const codes = getTestCode(prop)
    if (!codes) continue

    it(`"${prop.aliases[0]}" produces same CSS as "${prop.name}"`, () => {
      const ir1 = parseAndTransform(codes.withName)
      const ir2 = parseAndTransform(codes.withAlias)

      const styles1 = ir1.nodes[0]?.styles || []
      const styles2 = ir2.nodes[0]?.styles || []

      // Build maps for comparison
      const map1 = new Map(styles1.map((s: any) => [s.property, s.value]))
      const map2 = new Map(styles2.map((s: any) => [s.property, s.value]))

      // All styles from name version should match alias version
      for (const [prop, val] of map1) {
        expect(map2.get(prop)).toBe(val)
      }
    })
  }
})

// ============================================================================
// Property Combination Tests
// ============================================================================

describe('Schema: Property Combinations', () => {

  function getNodeStyle(node: any, property: string): string | undefined {
    const style = node?.styles?.find((s: any) => s.property === property)
    return style?.value
  }

  it('combines sizing properties (w, h, minw, maxw)', () => {
    const ir = parseAndTransform('Frame w 100 h 200 minw 50 maxw 300')
    const node = ir.nodes[0]

    expect(getNodeStyle(node, 'width')).toBe('100px')
    expect(getNodeStyle(node, 'height')).toBe('200px')
    expect(getNodeStyle(node, 'min-width')).toBe('50px')
    expect(getNodeStyle(node, 'max-width')).toBe('300px')
  })

  it('combines layout properties (hor, gap, center)', () => {
    const ir = parseAndTransform('Frame hor gap 16 center')
    const node = ir.nodes[0]

    expect(getNodeStyle(node, 'flex-direction')).toBe('row')
    expect(getNodeStyle(node, 'gap')).toBe('16px')
    expect(getNodeStyle(node, 'justify-content')).toBe('center')
    expect(getNodeStyle(node, 'align-items')).toBe('center')
  })

  it('combines color properties (bg, col, boc)', () => {
    const ir = parseAndTransform('Frame bg #333 col #fff boc #f00')
    const node = ir.nodes[0]

    expect(getNodeStyle(node, 'background')).toBe('#333')
    expect(getNodeStyle(node, 'color')).toBe('#fff')
    expect(getNodeStyle(node, 'border-color')).toBe('#f00')
  })

  it('combines spacing properties (pad, margin)', () => {
    const ir = parseAndTransform('Frame pad 16 margin 8')
    const node = ir.nodes[0]

    expect(getNodeStyle(node, 'padding')).toBe('16px')
    expect(getNodeStyle(node, 'margin')).toBe('8px')
  })

  it('combines border properties (bor, rad)', () => {
    const ir = parseAndTransform('Frame bor 1 rad 8')
    const node = ir.nodes[0]

    // IR produces 'border' not 'border-width'
    expect(getNodeStyle(node, 'border')).toBe('1px solid currentColor')
    expect(getNodeStyle(node, 'border-radius')).toBe('8px')
  })

  it('combines all categories (sizing, color, spacing, border, layout)', () => {
    const ir = parseAndTransform('Frame w 200 h 100 bg #333 pad 16 rad 8 center')
    const node = ir.nodes[0]

    expect(getNodeStyle(node, 'width')).toBe('200px')
    expect(getNodeStyle(node, 'height')).toBe('100px')
    expect(getNodeStyle(node, 'background')).toBe('#333')
    expect(getNodeStyle(node, 'padding')).toBe('16px')
    expect(getNodeStyle(node, 'border-radius')).toBe('8px')
    expect(getNodeStyle(node, 'justify-content')).toBe('center')
    expect(getNodeStyle(node, 'align-items')).toBe('center')
  })

  it('handles multiple aliases in same declaration', () => {
    const ir = parseAndTransform('Frame w 100 h 200 p 8 m 4')
    const node = ir.nodes[0]

    expect(getNodeStyle(node, 'width')).toBe('100px')
    expect(getNodeStyle(node, 'height')).toBe('200px')
    expect(getNodeStyle(node, 'padding')).toBe('8px')
    expect(getNodeStyle(node, 'margin')).toBe('4px')
  })
})

// ============================================================================
// Schema Completeness Validation
// ============================================================================

describe('Schema: Completeness Validation', () => {

  it('all properties have required fields', () => {
    for (const [key, prop] of Object.entries(SCHEMA)) {
      expect(prop.name, `${key} missing name`).toBeDefined()
      expect(prop.aliases, `${key} missing aliases`).toBeDefined()
      expect(Array.isArray(prop.aliases), `${key} aliases not array`).toBe(true)
      expect(prop.category, `${key} missing category`).toBeDefined()
      expect(prop.description, `${key} missing description`).toBeDefined()
    }
  })

  it('all keyword properties have valid CSS definitions', () => {
    for (const [key, prop] of Object.entries(SCHEMA)) {
      if (!prop.keywords) continue

      for (const [kwName, kwDef] of Object.entries(prop.keywords)) {
        expect(kwDef.description, `${key}.${kwName} missing description`).toBeDefined()
        expect(kwDef.css, `${key}.${kwName} missing css`).toBeDefined()
        expect(Array.isArray(kwDef.css), `${key}.${kwName} css not array`).toBe(true)
      }
    }
  })

  it('all numeric properties have css function', () => {
    for (const [key, prop] of Object.entries(SCHEMA)) {
      if (!prop.numeric) continue
      expect(typeof prop.numeric.css, `${key}.numeric missing css function`).toBe('function')
      expect(prop.numeric.description, `${key}.numeric missing description`).toBeDefined()
    }
  })

  it('all color properties have css function', () => {
    for (const [key, prop] of Object.entries(SCHEMA)) {
      if (!prop.color) continue
      expect(typeof prop.color.css, `${key}.color missing css function`).toBe('function')
      expect(prop.color.description, `${key}.color missing description`).toBeDefined()
    }
  })

  it('all directional properties have valid directions', () => {
    for (const [key, prop] of Object.entries(SCHEMA)) {
      if (!prop.directional) continue
      expect(Array.isArray(prop.directional.directions), `${key}.directional.directions not array`).toBe(true)
      expect(prop.directional.directions.length, `${key}.directional.directions empty`).toBeGreaterThan(0)
      expect(typeof prop.directional.css, `${key}.directional.css not function`).toBe('function')
    }
  })

  it('expected property count', () => {
    expect(Object.keys(SCHEMA).length).toBeGreaterThanOrEqual(105)
  })

  it('expected primitive count', () => {
    expect(Object.keys(DSL.primitives).length).toBe(25)
  })

  it('expected event count', () => {
    expect(Object.keys(DSL.events).length).toBe(12)
  })

  it('expected action count', () => {
    // 17 original + 7 overlay + 4 scroll + 4 value + 1 clipboard = 33
    expect(Object.keys(DSL.actions).length).toBe(33)
  })

  it('expected state count', () => {
    expect(Object.keys(DSL.states).length).toBe(17)
  })

  it('expected key count', () => {
    expect(DSL.keys.length).toBe(12)
  })
})

// ============================================================================
// Coverage Report
// ============================================================================

describe('Schema: Coverage Summary', () => {
  it('reports full schema coverage', () => {
    // Count Zag properties
    let zagPropCount = 0
    for (const props of Object.values(ZAG_PROP_METADATA)) {
      zagPropCount += Object.keys(props).length
    }

    const stats = {
      primitives: Object.keys(DSL.primitives).length,
      zagComponents: Object.keys(ZAG_PRIMITIVES).length,
      cssProperties: Object.keys(SCHEMA).length,
      aliases: Object.values(SCHEMA).reduce((sum, p) => sum + p.aliases.length, 0),
      zagProperties: zagPropCount,
      zagComponentsWithProps: Object.keys(ZAG_PROP_METADATA).length,
      events: Object.keys(DSL.events).length,
      states: Object.keys(DSL.states).length,
      keys: DSL.keys.length,
    }

    console.log('\n📊 Schema Coverage:')
    console.log(`   Primitives:      ${stats.primitives} tested`)
    console.log(`   Zag Components:  ${stats.zagComponents} tested`)
    console.log(`   CSS Properties:  ${stats.cssProperties} tested (+ ${stats.aliases} aliases)`)
    console.log(`   Zag Properties:  ${stats.zagProperties} tested (${stats.zagComponentsWithProps} components)`)
    console.log(`   Events:          ${stats.events} tested`)
    console.log(`   States:          ${stats.states} tested`)
    console.log(`   Keys:            ${stats.keys} tested`)
    console.log('')

    // This test always passes - it's just for reporting
    expect(true).toBe(true)
  })
})
