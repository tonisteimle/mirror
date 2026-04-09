/**
 * Schema-Driven Validator Tests
 *
 * These tests are automatically generated from the DSL schema.
 * They ensure that every element in the schema is properly validated.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { validate } from '../../compiler/validator/index'
import { clearRulesCache } from '../../compiler/validator/generator'
import { DSL, SCHEMA } from '../../compiler/schema/dsl'

// Properties with range restrictions - use valid test values
const PROPERTY_TEST_VALUES: Record<string, number> = {
  'opacity': 0.5,
  'opa': 0.5,
  'o': 0.5,
  'scale': 1.5,
  'hover-opacity': 0.8,
  'hover-opa': 0.8,
  'hover-o': 0.8,
  'hover-scale': 1.1,
}

// Primitives with required properties
const PRIMITIVE_REQUIRED_PROPS: Record<string, string> = {
  'Image': 'src "test.png"',
  'image': 'src "test.png"',
  'Img': 'src "test.png"',
  'img': 'src "test.png"',
  'Link': 'href "https://example.com"',
  'link': 'href "https://example.com"',
}

// Clear cache before tests to ensure fresh rules
beforeAll(() => {
  clearRulesCache()
})

describe('Schema-Driven: Primitives', () => {
  const primitiveNames = Object.keys(DSL.primitives)

  for (const name of primitiveNames) {
    it(`accepts primitive "${name}"`, () => {
      const requiredProps = PRIMITIVE_REQUIRED_PROPS[name] || ''
      const code = requiredProps ? `${name} ${requiredProps}, w 100` : `${name} w 100`
      const result = validate(code)
      expect(result.valid).toBe(true)
    })

    it(`accepts primitive "${name.toLowerCase()}" (lowercase)`, () => {
      const requiredProps = PRIMITIVE_REQUIRED_PROPS[name.toLowerCase()] || ''
      const code = requiredProps ? `${name.toLowerCase()} ${requiredProps}, w 100` : `${name.toLowerCase()} w 100`
      const result = validate(code)
      expect(result.valid).toBe(true)
    })
  }

  // Test aliases
  for (const [name, def] of Object.entries(DSL.primitives)) {
    if (def.aliases) {
      for (const alias of def.aliases) {
        it(`accepts primitive alias "${alias}" for "${name}"`, () => {
          const requiredProps = PRIMITIVE_REQUIRED_PROPS[alias] || ''
          const code = requiredProps ? `${alias} ${requiredProps}, w 100` : `${alias} w 100`
          const result = validate(code)
          expect(result.valid).toBe(true)
        })
      }
    }
  }
})

describe('Schema-Driven: Properties', () => {
  // Skip properties that have no testable features or need special handling
  const SKIP_PROPERTIES = new Set(['content', 'href', 'src', 'placeholder', 'text', 'type', 'name', 'value', 'animation'])

  for (const [propName, propDef] of Object.entries(SCHEMA)) {
    // Skip properties with no testable features
    const hasStandalone = propDef.keywords?._standalone
    const hasKeywords = propDef.keywords && Object.keys(propDef.keywords).some(k => k !== '_standalone')
    const hasNumeric = !!propDef.numeric
    const hasColor = !!propDef.color

    if (SKIP_PROPERTIES.has(propName)) continue
    if (!hasStandalone && !hasKeywords && !hasNumeric && !hasColor) continue

    describe(`Property: ${propName}`, () => {
      // Test property name
      if (hasStandalone) {
        it(`accepts standalone "${propName}"`, () => {
          const result = validate(`Box ${propName}`)
          expect(result.valid).toBe(true)
        })
      }

      // Test aliases
      for (const alias of propDef.aliases) {
        if (hasStandalone) {
          it(`accepts standalone alias "${alias}"`, () => {
            const result = validate(`Box ${alias}`)
            expect(result.valid).toBe(true)
          })
        }
      }

      // Test keyword values
      if (hasKeywords) {
        const keywords = Object.keys(propDef.keywords!).filter(k => k !== '_standalone')
        for (const keyword of keywords) {
          it(`accepts keyword "${keyword}"`, () => {
            const result = validate(`Box ${propName} ${keyword}`)
            expect(result.valid).toBe(true)
          })
        }
      }

      // Test numeric values
      if (propDef.numeric) {
        const testValue = PROPERTY_TEST_VALUES[propName] ?? 100
        it(`accepts numeric value`, () => {
          const result = validate(`Box ${propName} ${testValue}`)
          expect(result.valid).toBe(true)
        })

        // Test with alias
        if (propDef.aliases.length > 0) {
          const aliasTestValue = PROPERTY_TEST_VALUES[propDef.aliases[0]] ?? 100
          it(`accepts numeric value with alias "${propDef.aliases[0]}"`, () => {
            const result = validate(`Box ${propDef.aliases[0]} ${aliasTestValue}`)
            expect(result.valid).toBe(true)
          })
        }
      }

      // Test color values
      if (propDef.color) {
        it(`accepts color value`, () => {
          const result = validate(`Box ${propName} #FF5733`)
          expect(result.valid).toBe(true)
        })

        it(`accepts short color value`, () => {
          const result = validate(`Box ${propName} #F53`)
          expect(result.valid).toBe(true)
        })

        it(`accepts color with alpha`, () => {
          const result = validate(`Box ${propName} #FF573380`)
          expect(result.valid).toBe(true)
        })
      }

      // Test directional values
      if (propDef.directional) {
        for (const dir of propDef.directional.directions.slice(0, 3)) { // Test first 3
          it(`accepts direction "${dir}"`, () => {
            const result = validate(`Box ${propName} ${dir} 16`)
            expect(result.valid).toBe(true)
          })
        }
      }

      // Test token values
      if (propDef.token) {
        it(`accepts token value`, () => {
          const code = `testToken: 100\nBox ${propName} $testToken`
          const result = validate(code)
          expect(result.valid).toBe(true)
        })
      }
    })
  }
})

describe('Schema-Driven: Events', () => {
  // Events use function call syntax: onclick toggle(Target)
  for (const [eventName, eventDef] of Object.entries(DSL.events)) {
    it(`accepts event "${eventName}"`, () => {
      const code = `MyButton as Button:\n  ${eventName} toggle(Target)`
      const result = validate(code)
      expect(result.valid).toBe(true)
    })

    if (eventDef.acceptsKey) {
      it(`accepts event "${eventName}" with key modifier`, () => {
        // Keyboard events use colon after key: onkeydown enter: submit()
        const code = `MyInput as Input:\n  ${eventName} enter: submit()`
        const result = validate(code)
        expect(result.valid).toBe(true)
      })
    }
  }
})

describe('Schema-Driven: Actions', () => {
  // Actions use function call syntax: onclick actionName(Target)
  for (const [actionName, actionDef] of Object.entries(DSL.actions)) {
    it(`accepts action "${actionName}"`, () => {
      // If action has specific targets, use the first valid one
      // Otherwise use a generic target
      const target = actionDef.targets ? actionDef.targets[0] : 'Target'
      const code = `MyButton as Button:\n  onclick ${actionName}(${target})`
      const result = validate(code)
      expect(result.valid).toBe(true)
    })

    if (actionDef.targets) {
      for (const target of actionDef.targets) {
        it(`accepts action "${actionName}" with target "${target}"`, () => {
          const code = `MyButton as Button:\n  onclick ${actionName}(${target})`
          const result = validate(code)
          expect(result.valid).toBe(true)
        })
      }
    }
  }
})

describe('Schema-Driven: States', () => {
  // System states (hover, focus, active, disabled) can use syntax without colon
  // Other states need 'state' keyword or colon
  const systemStates = new Set(['hover', 'focus', 'active', 'disabled', 'filled'])

  for (const [stateName, stateDef] of Object.entries(DSL.states)) {
    it(`accepts state "${stateName}"`, () => {
      // Use appropriate syntax based on state type
      const syntax = systemStates.has(stateName)
        ? stateName  // hover\n  bg #444
        : `state ${stateName}`  // state selected\n  bg #444

      const code = `Card as Box:\n  w 100\n  ${syntax}\n    bg #444`
      const result = validate(code)
      // All defined states should be valid
      if (!result.valid) {
        console.log(`State "${stateName}" failed:`, result.errors)
      }
      expect(result.valid).toBe(true)
      // System states should not warn
      if (stateDef.system) {
        expect(result.warnings.filter(w => w.message.includes(stateName))).toHaveLength(0)
      }
    })
  }
})

describe('Schema-Driven: Keys', () => {
  for (const key of DSL.keys) {
    it(`accepts key "${key}"`, () => {
      const code = `MyInput as Input:\n  onkeydown ${key}: submit`
      const result = validate(code)
      expect(result.valid).toBe(true)
    })
  }
})

describe('Schema Coverage', () => {
  it('has primitives defined', () => {
    expect(Object.keys(DSL.primitives).length).toBeGreaterThan(10)
  })

  it('has properties defined', () => {
    expect(Object.keys(SCHEMA).length).toBeGreaterThan(30)
  })

  it('has events defined', () => {
    expect(Object.keys(DSL.events).length).toBeGreaterThan(5)
  })

  it('has actions defined', () => {
    expect(Object.keys(DSL.actions).length).toBeGreaterThan(5)
  })

  it('has states defined', () => {
    expect(Object.keys(DSL.states).length).toBeGreaterThan(5)
  })

  it('has keys defined', () => {
    expect(DSL.keys.length).toBeGreaterThan(5)
  })
})
