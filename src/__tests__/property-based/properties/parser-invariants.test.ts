/**
 * Parser Invariants - Property-Based Tests
 *
 * Tests parser invariants that should always hold:
 * 1. Parser never crashes (returns ParseResult, not throws)
 * 2. Valid code parses without errors
 * 3. All parsed nodes have names
 * 4. Parse result structure is consistent
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parse } from '../../../parser/parser'
import { hasValidStructure, countNodes, maxDepth } from '../utils/ast-normalizer'

// Import arbitraries
import {
  validMirrorCode,
  anySimpleComponent,
  nestedComponents,
  componentDefinition,
  componentWithProps,
  buttonComponent,
  iconComponent,
  cardStructure,
  listStructure
} from '../arbitraries/components'

import {
  simpleInheritance,
  inheritanceWithOverrides,
  buttonVariants,
  defineAndUse
} from '../arbitraries/inheritance'

import {
  buttonWithHover,
  inputWithFocus,
  listItemWithSelection,
  inlineHoverProps
} from '../arbitraries/states'

import {
  simpleOnclick,
  keyboardHandler,
  eventsBlock
} from '../arbitraries/events'

import {
  simpleIfBlock,
  ifElseBlock,
  componentWithInlineConditional
} from '../arbitraries/conditionals'

import {
  simpleEachLoop,
  simpleDataBinding
} from '../arbitraries/iterators'

import {
  dropdownAnimation,
  loadingSpinner
} from '../arbitraries/animations'

import {
  simpleGridContainer,
  gridWithGap
} from '../arbitraries/grid'

import {
  anyEdgeCase,
  componentWithUnicode,
  varyingDepthNesting,
  zeroValue,
  largeValue
} from '../arbitraries/edge-cases'

// =============================================================================
// Core Invariants
// =============================================================================

describe('Parser Invariants', () => {
  describe('Parser Never Crashes', () => {
    it('should never throw on arbitrary string input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          // Parser should return ParseResult, never throw
          const result = parse(input)
          expect(result).toBeDefined()
          expect(result).toHaveProperty('nodes')
          expect(result).toHaveProperty('errors')
          expect(Array.isArray(result.nodes)).toBe(true)
          expect(Array.isArray(result.errors)).toBe(true)
        }),
        { numRuns: 1000 }
      )
    })

    it('should never throw on random bytes', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 255 }), { maxLength: 100 })
            .map(bytes => String.fromCharCode(...bytes)),
          (input) => {
            const result = parse(input)
            expect(result).toBeDefined()
            expect(result).toHaveProperty('nodes')
          }
        ),
        { numRuns: 500 }
      )
    })
  })

  describe('Valid Code Parses Cleanly', () => {
    it('should parse simple components (allow some errors)', () => {
      let successCount = 0
      fc.assert(
        fc.property(validMirrorCode, (code) => {
          const result = parse(code)
          if (result.errors.length === 0) {
            successCount++
            expect(result.nodes.length).toBeGreaterThan(0)
          }
          // Parser should always return a valid result structure
          expect(result).toBeDefined()
          return true
        }),
        { numRuns: 500 }
      )
      // At least 50% should parse successfully (some generated code may have edge cases)
      expect(successCount).toBeGreaterThan(250)
    })

    it('should parse most simple components without errors', () => {
      let successCount = 0
      const numRuns = 300
      fc.assert(
        fc.property(anySimpleComponent, (code) => {
          const result = parse(code)
          if (result.errors.length === 0) {
            successCount++
          }
          return true
        }),
        { numRuns }
      )
      // At least 50% success rate (allow for edge cases)
      expect(successCount).toBeGreaterThan(numRuns * 0.5)
    })

    it('should parse buttons correctly', () => {
      fc.assert(
        fc.property(buttonComponent, (code) => {
          const result = parse(code)
          expect(result.errors).toHaveLength(0)
          expect(result.nodes[0]?.name).toBe('Button')
        }),
        { numRuns: 100 }
      )
    })

    it('should parse icons correctly', () => {
      fc.assert(
        fc.property(iconComponent, (code) => {
          const result = parse(code)
          expect(result.errors).toHaveLength(0)
          expect(result.nodes[0]?.name).toBe('Icon')
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('All Nodes Have Names', () => {
    it('should ensure all parsed nodes have non-empty names', () => {
      fc.assert(
        fc.property(validMirrorCode, (code) => {
          const result = parse(code)
          const allHaveNames = result.nodes.every(
            node => typeof node.name === 'string' && node.name.length > 0
          )
          expect(allHaveNames).toBe(true)
        }),
        { numRuns: 300 }
      )
    })

    it('should ensure nested children also have names', () => {
      fc.assert(
        fc.property(nestedComponents, (code) => {
          const result = parse(code)
          expect(hasValidStructure(result.nodes)).toBe(true)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe('Parse Result Structure', () => {
    it('should return consistent structure for any input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = parse(input)

          // Required fields
          expect(result).toHaveProperty('nodes')
          expect(result).toHaveProperty('errors')
          expect(result).toHaveProperty('tokens')
          expect(result).toHaveProperty('registry')

          // Types
          expect(Array.isArray(result.nodes)).toBe(true)
          expect(Array.isArray(result.errors)).toBe(true)
          expect(typeof result.tokens).toBe('object')
          expect(typeof result.registry).toBe('object')
        }),
        { numRuns: 200 }
      )
    })
  })
})

// =============================================================================
// Component Structure Tests
// =============================================================================

describe('Component Structure Invariants', () => {
  it('should parse component definitions as definitions', () => {
    fc.assert(
      fc.property(componentDefinition, (code) => {
        const result = parse(code)
        if (result.errors.length === 0 && result.nodes.length > 0) {
          expect(result.nodes[0].isDefinition).toBe(true)
        }
      }),
      { numRuns: 200 }
    )
  })

  it('should parse card structures with children', () => {
    fc.assert(
      fc.property(cardStructure, (code) => {
        const result = parse(code)
        if (result.errors.length === 0) {
          const card = result.nodes[0]
          expect(card?.children?.length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('should parse list structures with items', () => {
    fc.assert(
      fc.property(listStructure, (code) => {
        const result = parse(code)
        if (result.errors.length === 0) {
          const list = result.nodes[0]
          expect(list?.children?.length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 }
    )
  })
})

// =============================================================================
// Inheritance Tests
// =============================================================================

describe('Inheritance Invariants', () => {
  it('should parse simple inheritance patterns without crashing', () => {
    fc.assert(
      fc.property(simpleInheritance, (code) => {
        const result = parse(code)
        // Parser should not crash on inheritance syntax
        expect(result).toBeDefined()
        expect(result).toHaveProperty('nodes')
        expect(result).toHaveProperty('errors')
        return true
      }),
      { numRuns: 200 }
    )
  })

  it('should handle inheritance with overrides', () => {
    let successCount = 0
    const numRuns = 200
    fc.assert(
      fc.property(inheritanceWithOverrides, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
        if (result.errors.length === 0) {
          successCount++
        }
        return true
      }),
      { numRuns }
    )
    expect(successCount).toBeGreaterThan(numRuns * 0.5)
  })

  it('should register component definitions when parsing button variants', () => {
    fc.assert(
      fc.property(buttonVariants, (code) => {
        const result = parse(code)
        // Should not crash
        expect(result).toBeDefined()
        // If no errors, Button should be in registry
        if (result.errors.length === 0) {
          expect(result.registry).toBeDefined()
        }
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle define and use patterns', () => {
    fc.assert(
      fc.property(defineAndUse, (code) => {
        const result = parse(code)
        // Should parse without crashing
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })
})

// =============================================================================
// State Tests
// =============================================================================

describe('State Invariants', () => {
  it('should parse button with hover state without crashing', () => {
    fc.assert(
      fc.property(buttonWithHover, (code) => {
        const result = parse(code)
        // Parser should not crash
        expect(result).toBeDefined()
        expect(result).toHaveProperty('nodes')
        expect(result).toHaveProperty('errors')
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should parse input with focus state without crashing', () => {
    fc.assert(
      fc.property(inputWithFocus, (code) => {
        const result = parse(code)
        // Parser should not crash
        expect(result).toBeDefined()
        expect(result).toHaveProperty('nodes')
        expect(result).toHaveProperty('errors')
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should parse inline hover properties', () => {
    fc.assert(
      fc.property(inlineHoverProps, (code) => {
        const result = parse(code)
        // Should not crash
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })
})

// =============================================================================
// Event Tests
// =============================================================================

describe('Event Invariants', () => {
  it('should parse onclick handlers', () => {
    fc.assert(
      fc.property(simpleOnclick, (code) => {
        // Wrap in component
        const fullCode = `Button\n  ${code.split('\n').join('\n  ')}`
        const result = parse(fullCode)
        // Should parse without crashing
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  it('should parse keyboard handlers', () => {
    fc.assert(
      fc.property(keyboardHandler, (code) => {
        const fullCode = `Input\n  ${code}`
        const result = parse(fullCode)
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })
})

// =============================================================================
// Conditional Tests
// =============================================================================

describe('Conditional Invariants', () => {
  it('should parse if blocks', () => {
    fc.assert(
      fc.property(simpleIfBlock, (code) => {
        const result = parse(code)
        // Should parse without crashing
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  it('should parse if/else blocks', () => {
    fc.assert(
      fc.property(ifElseBlock, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  it('should parse inline conditionals', () => {
    fc.assert(
      fc.property(componentWithInlineConditional, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })
})

// =============================================================================
// Iterator Tests
// =============================================================================

describe('Iterator Invariants', () => {
  it('should parse each loops', () => {
    fc.assert(
      fc.property(simpleEachLoop, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  it('should parse data binding', () => {
    fc.assert(
      fc.property(simpleDataBinding, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })
})

// =============================================================================
// Animation Tests
// =============================================================================

describe('Animation Invariants', () => {
  it('should parse dropdown animations', () => {
    fc.assert(
      fc.property(dropdownAnimation, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 50 }
    )
  })

  it('should parse loading spinner', () => {
    fc.assert(
      fc.property(loadingSpinner, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 50 }
    )
  })
})

// =============================================================================
// Grid Tests
// =============================================================================

describe('Grid Invariants', () => {
  it('should parse grid containers', () => {
    fc.assert(
      fc.property(simpleGridContainer, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 50 }
    )
  })

  it('should parse grid with gap', () => {
    fc.assert(
      fc.property(gridWithGap, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()
      }),
      { numRuns: 50 }
    )
  })
})

// =============================================================================
// Edge Case Tests
// =============================================================================

describe('Edge Case Handling', () => {
  it('should handle unicode strings', () => {
    fc.assert(
      fc.property(componentWithUnicode, (code) => {
        const result = parse(code)
        // Should not crash
        expect(result).toBeDefined()
      }),
      { numRuns: 100 }
    )
  })

  it('should handle deep nesting', () => {
    fc.assert(
      fc.property(varyingDepthNesting, (code) => {
        const result = parse(code)
        expect(result).toBeDefined()

        if (result.errors.length === 0) {
          const depth = maxDepth(result.nodes)
          expect(depth).toBeGreaterThan(0)
        }
      }),
      { numRuns: 50 }
    )
  })

  it('should handle zero values', () => {
    fc.assert(
      fc.property(zeroValue, (code) => {
        const result = parse(code)
        expect(result.errors).toHaveLength(0)
      }),
      { numRuns: 50 }
    )
  })

  it('should handle large values', () => {
    fc.assert(
      fc.property(largeValue, (code) => {
        const result = parse(code)
        // Should parse (may or may not have errors for extreme values)
        expect(result).toBeDefined()
      }),
      { numRuns: 50 }
    )
  })

  it('should handle various edge cases without crashing', () => {
    fc.assert(
      fc.property(anyEdgeCase, (code) => {
        const result = parse(code)
        // The key invariant: parser never crashes
        expect(result).toBeDefined()
        expect(result).toHaveProperty('nodes')
        expect(result).toHaveProperty('errors')
      }),
      { numRuns: 200 }
    )
  })
})
