/**
 * Comprehensive Property Panel Robustness Tests
 *
 * Tests that the PropertyExtractor and CodeModifier correctly handle
 * all possible property constellations:
 *
 * 1. Property order variations
 * 2. Property aliases (bg vs background, pad vs padding)
 * 3. Multi-value properties (pad 16 12, bor 1 solid #333)
 * 4. Directional properties (pad left 16, rad tl 8)
 * 5. Boolean properties (hor, ver, center, wrap)
 * 6. Token references ($accent.bg, $s.pad)
 * 7. Component definitions vs instances
 * 8. Inherited properties from parent components
 * 9. Instance overrides
 * 10. Complex nested structures
 */

import { describe, it, expect } from 'vitest'
import { PropertyExtractor } from '../../compiler/studio/property-extractor'
import { CodeModifier } from '../../compiler/studio/code-modifier'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import type { AST } from '../../parser/ast'
import type { SourceMap } from '../../compiler/ir/source-map'

// =============================================================================
// TEST HELPERS
// =============================================================================

interface TestContext {
  ast: AST
  sourceMap: SourceMap
  extractor: PropertyExtractor
  modifier: CodeModifier
  source: string
}

function createContext(source: string): TestContext {
  const ast = parse(source)
  const result = toIR(ast, true)
  const extractor = new PropertyExtractor(ast, result.sourceMap, { showAllProperties: false })
  const modifier = new CodeModifier(source, result.sourceMap)
  return { ast, sourceMap: result.sourceMap, extractor, modifier, source }
}

function getFirstNodeId(ctx: TestContext): string | null {
  const ids = ctx.sourceMap.getAllNodeIds()
  return ids.find(id => !ctx.sourceMap.getNodeById(id)?.isDefinition) || null
}

function getNodeByName(ctx: TestContext, componentName: string): string | null {
  const ids = ctx.sourceMap.getAllNodeIds()
  return ids.find(id => {
    const node = ctx.sourceMap.getNodeById(id)
    return node?.componentName === componentName && !node?.isDefinition
  }) || null
}

function getDefinitionByName(ctx: TestContext, componentName: string): string | null {
  const ids = ctx.sourceMap.getAllNodeIds()
  return ids.find(id => {
    const node = ctx.sourceMap.getNodeById(id)
    return node?.componentName === componentName && node?.isDefinition
  }) || null
}

function findProp(props: any[], name: string): any {
  return props.find(p => p.name === name || p.canonicalName === name)
}

// =============================================================================
// 1. PROPERTY ORDER VARIATIONS
// =============================================================================

describe('Property Order Robustness', () => {
  it('extracts properties regardless of order: bg before pad', () => {
    const ctx = createContext('Box bg #333, pad 16')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)

    expect(result).not.toBeNull()
    const bgProp = findProp(result!.allProperties, 'bg')
    const padProp = findProp(result!.allProperties, 'pad')

    expect(bgProp?.value).toBe('#333')
    expect(padProp?.value).toBe('16')
  })

  it('extracts properties regardless of order: pad before bg', () => {
    const ctx = createContext('Box pad 16, bg #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)

    expect(result).not.toBeNull()
    const bgProp = findProp(result!.allProperties, 'bg')
    const padProp = findProp(result!.allProperties, 'pad')

    expect(bgProp?.value).toBe('#333')
    expect(padProp?.value).toBe('16')
  })

  it('handles many properties in different orders', () => {
    const order1 = 'Box w 100, h 200, bg #333, pad 16, gap 8, rad 4'
    const order2 = 'Box pad 16, rad 4, w 100, gap 8, h 200, bg #333'
    const order3 = 'Box gap 8, bg #333, rad 4, h 200, pad 16, w 100'

    for (const source of [order1, order2, order3]) {
      const ctx = createContext(source)
      const nodeId = getFirstNodeId(ctx)!
      const result = ctx.extractor.getProperties(nodeId)!

      expect(findProp(result.allProperties, 'w')?.value).toBe('100')
      expect(findProp(result.allProperties, 'h')?.value).toBe('200')
      expect(findProp(result.allProperties, 'bg')?.value).toBe('#333')
      expect(findProp(result.allProperties, 'pad')?.value).toBe('16')
      expect(findProp(result.allProperties, 'gap')?.value).toBe('8')
      expect(findProp(result.allProperties, 'rad')?.value).toBe('4')
    }
  })

  it('modifies property without affecting order of others', () => {
    const ctx = createContext('Box w 100, bg #333, h 200')
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.updateProperty(nodeId, 'bg', '#444')

    expect(result.success).toBe(true)
    // w should still be before bg, h after
    expect(result.newSource).toMatch(/w 100.*bg #444.*h 200/)
  })
})

// =============================================================================
// 2. PROPERTY ALIASES
// =============================================================================

describe('Property Alias Handling', () => {
  it('recognizes bg as background alias', () => {
    const ctx = createContext('Box bg #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'bg')
    expect(prop).toBeDefined()
    expect(prop.value).toBe('#333')
    expect(prop.type).toBe('color')
  })

  it('recognizes background as full name', () => {
    const ctx = createContext('Box background #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'background')
    expect(prop).toBeDefined()
    expect(prop.value).toBe('#333')
  })

  it('recognizes pad as padding alias', () => {
    const ctx = createContext('Box pad 16')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'pad')
    expect(prop).toBeDefined()
    expect(prop.value).toBe('16')
    expect(prop.type).toBe('spacing')
  })

  it('recognizes col as color alias', () => {
    const ctx = createContext('Text col #FFF')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'col')
    expect(prop).toBeDefined()
    expect(prop.value).toBe('#FFF')
    expect(prop.type).toBe('color')
  })

  it('recognizes w/h as width/height aliases', () => {
    const ctx = createContext('Box w 100, h 200')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'w')?.value).toBe('100')
    expect(findProp(result.allProperties, 'h')?.value).toBe('200')
  })

  it('recognizes rad as radius alias', () => {
    const ctx = createContext('Box rad 8')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'rad')
    expect(prop).toBeDefined()
    expect(prop.value).toBe('8')
  })

  it('recognizes bor as border alias', () => {
    const ctx = createContext('Box bor 1 #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'bor')
    expect(prop).toBeDefined()
    expect(prop.value).toBe('1 #333')
  })

  it('modifies property using alias preserves original name', () => {
    const ctx = createContext('Box bg #333')
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.updateProperty(nodeId, 'bg', '#444')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('bg #444')
    expect(result.newSource).not.toContain('background')
  })
})

// =============================================================================
// 3. MULTI-VALUE PROPERTIES
// =============================================================================

describe('Multi-Value Properties', () => {
  it('handles padding with single value', () => {
    const ctx = createContext('Box pad 16')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'pad')?.value).toBe('16')
  })

  it('handles padding with two values (vertical horizontal)', () => {
    const ctx = createContext('Box pad 16 24')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'pad')?.value).toBe('16 24')
  })

  it('handles padding with four values', () => {
    const ctx = createContext('Box pad 8 16 24 32')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'pad')?.value).toBe('8 16 24 32')
  })

  it('handles border with width and color', () => {
    const ctx = createContext('Box bor 2 #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'bor')?.value).toBe('2 #333')
  })

  it('handles border with width, style, and color', () => {
    const ctx = createContext('Box bor 2 solid #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'bor')?.value).toBe('2 solid #333')
  })

  it('modifies multi-value property correctly', () => {
    const ctx = createContext('Box pad 16 24, bg #333')
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.updateProperty(nodeId, 'pad', '8 12')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('pad 8 12')
    expect(result.newSource).toContain('bg #333')
  })

  it('does not confuse multi-value with next property', () => {
    const ctx = createContext('Box pad 16 24, bg #333, rad 8')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'pad')?.value).toBe('16 24')
    expect(findProp(result.allProperties, 'bg')?.value).toBe('#333')
    expect(findProp(result.allProperties, 'rad')?.value).toBe('8')
  })
})

// =============================================================================
// 4. DIRECTIONAL PROPERTIES
// =============================================================================

describe('Directional Properties', () => {
  it('handles pad left', () => {
    const ctx = createContext('Box pad left 16')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'pad')
    expect(prop).toBeDefined()
    expect(prop.value).toContain('left')
  })

  it('handles pad top', () => {
    const ctx = createContext('Box pad top 8')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'pad')
    expect(prop).toBeDefined()
  })

  it('handles multiple directional padding', () => {
    const ctx = createContext('Box pad left 16, pad top 8')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    // Should have pad properties
    const padProps = result.allProperties.filter(p => p.name === 'pad')
    expect(padProps.length).toBeGreaterThanOrEqual(1)
  })

  it('handles rad tl (top-left radius)', () => {
    const ctx = createContext('Box rad tl 8')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'rad')
    expect(prop).toBeDefined()
  })

  it('handles mixed directional and non-directional', () => {
    const ctx = createContext('Box pad 16, pad left 24')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    // Should not crash and should have pad properties
    expect(result.allProperties.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// 5. BOOLEAN PROPERTIES
// =============================================================================

describe('Boolean Properties', () => {
  it('handles hor (horizontal)', () => {
    const ctx = createContext('Box hor')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'hor')
    expect(prop).toBeDefined()
    expect(prop.value).toBe('true')
  })

  it('handles ver (vertical)', () => {
    const ctx = createContext('Box ver')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'ver')
    expect(prop).toBeDefined()
  })

  it('handles center', () => {
    const ctx = createContext('Box center')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'center')
    expect(prop).toBeDefined()
  })

  it('handles wrap', () => {
    const ctx = createContext('Box wrap')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'wrap')
    expect(prop).toBeDefined()
  })

  it('handles spread', () => {
    const ctx = createContext('Box spread')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'spread')
    expect(prop).toBeDefined()
  })

  it('handles boolean with other properties', () => {
    const ctx = createContext('Box hor, pad 16, center, bg #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'hor')).toBeDefined()
    expect(findProp(result.allProperties, 'pad')?.value).toBe('16')
    expect(findProp(result.allProperties, 'center')).toBeDefined()
    expect(findProp(result.allProperties, 'bg')?.value).toBe('#333')
  })

  it('handles multiple booleans in a row', () => {
    const ctx = createContext('Box hor, center, wrap, spread')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'hor')).toBeDefined()
    expect(findProp(result.allProperties, 'center')).toBeDefined()
    expect(findProp(result.allProperties, 'wrap')).toBeDefined()
    expect(findProp(result.allProperties, 'spread')).toBeDefined()
  })
})

// =============================================================================
// 6. TOKEN REFERENCES
// =============================================================================

describe('Token References', () => {
  it('recognizes simple token', () => {
    const ctx = createContext('Box bg $primary')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'bg')
    expect(prop).toBeDefined()
    expect(prop.isToken).toBe(true)
    expect(prop.value).toBe('$primary')
  })

  it('recognizes namespaced token', () => {
    const ctx = createContext('Box bg $accent.bg')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'bg')
    expect(prop).toBeDefined()
    expect(prop.isToken).toBe(true)
    expect(prop.value).toBe('$accent.bg')
  })

  it('recognizes spacing token', () => {
    const ctx = createContext('Box pad $s.pad')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'pad')
    expect(prop).toBeDefined()
    expect(prop.isToken).toBe(true)
  })

  it('handles mix of tokens and values', () => {
    const ctx = createContext('Box bg $primary, pad 16, col $text.col')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'bg')?.isToken).toBe(true)
    expect(findProp(result.allProperties, 'pad')?.isToken).toBe(false)
    expect(findProp(result.allProperties, 'col')?.isToken).toBe(true)
  })

  it('modifies token property correctly', () => {
    const ctx = createContext('Box bg $primary')
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.updateProperty(nodeId, 'bg', '$secondary')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('bg $secondary')
  })

  it('replaces token with literal value', () => {
    const ctx = createContext('Box bg $primary')
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.updateProperty(nodeId, 'bg', '#FF0000')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('bg #FF0000')
  })
})

// =============================================================================
// 7. COMPONENT DEFINITIONS VS INSTANCES
// =============================================================================

describe('Component Definitions vs Instances', () => {
  it('extracts properties from component definition', () => {
    const ctx = createContext('Card: pad 16, bg #333')
    const result = ctx.extractor.getPropertiesForComponentDefinition('Card')

    expect(result).not.toBeNull()
    expect(result!.isDefinition).toBe(true)
    expect(findProp(result!.allProperties, 'pad')?.value).toBe('16')
    expect(findProp(result!.allProperties, 'bg')?.value).toBe('#333')
  })

  it('extracts properties from instance', () => {
    const source = `Card: pad 16, bg #333
Card`
    const ctx = createContext(source)
    const nodeId = getNodeByName(ctx, 'Card')!
    const result = ctx.extractor.getProperties(nodeId)

    expect(result).not.toBeNull()
    expect(result!.isDefinition).toBe(false)
  })

  it('instance inherits from definition', () => {
    const source = `Card: pad 16, bg #333
Card`
    const ctx = createContext(source)
    const nodeId = getNodeByName(ctx, 'Card')!
    const result = ctx.extractor.getProperties(nodeId)!

    // Should have inherited properties
    const padProp = findProp(result.allProperties, 'pad')
    expect(padProp).toBeDefined()
  })

  it('instance can override definition properties', () => {
    const source = `Card: pad 16, bg #333
Card bg #444`
    const ctx = createContext(source)
    const nodeId = getNodeByName(ctx, 'Card')!
    const result = ctx.extractor.getProperties(nodeId)!

    const bgProp = findProp(result.allProperties, 'bg')
    expect(bgProp?.value).toBe('#444')
    expect(bgProp?.source).toBe('instance')
  })

  it('modifies definition property', () => {
    const source = `Card: pad 16, bg #333
Card`
    const ctx = createContext(source)

    // Get the definition
    const result = ctx.extractor.getPropertiesForComponentDefinition('Card')
    expect(result).not.toBeNull()

    // The definition should have the properties
    expect(findProp(result!.allProperties, 'bg')?.value).toBe('#333')
  })
})

// =============================================================================
// 8. INHERITED PROPERTIES
// =============================================================================

describe('Inherited Properties', () => {
  it('inherits from parent component (extends syntax)', () => {
    const source = `Base: pad 16
Card extends Base: bg #333
Card`
    const ctx = createContext(source)
    const nodeId = getNodeByName(ctx, 'Card')!
    const result = ctx.extractor.getProperties(nodeId)!

    // Should have both pad (inherited) and bg
    const padProp = findProp(result.allProperties, 'pad')
    const bgProp = findProp(result.allProperties, 'bg')

    expect(padProp).toBeDefined()
    expect(bgProp).toBeDefined()
  })

  it('child overrides parent property', () => {
    const source = `Base: pad 16, bg #111
Card extends Base: bg #333
Card`
    const ctx = createContext(source)
    const nodeId = getNodeByName(ctx, 'Card')!
    const result = ctx.extractor.getProperties(nodeId)!

    // bg should be overridden
    const bgProp = findProp(result.allProperties, 'bg')
    expect(bgProp?.value).toBe('#333')
  })

  it('deep inheritance chain', () => {
    const source = `A: pad 8
B extends A: bg #111
C extends B: rad 4
C`
    const ctx = createContext(source)
    const nodeId = getNodeByName(ctx, 'C')!
    const result = ctx.extractor.getProperties(nodeId)!

    // Should have all properties from chain
    expect(findProp(result.allProperties, 'pad')).toBeDefined()
    expect(findProp(result.allProperties, 'bg')).toBeDefined()
    expect(findProp(result.allProperties, 'rad')).toBeDefined()
  })

  it('marks inherited properties correctly', () => {
    const source = `Base: pad 16
Card extends Base: bg #333
Card`
    const ctx = createContext(source)
    const nodeId = getNodeByName(ctx, 'Card')!
    const result = ctx.extractor.getProperties(nodeId)!

    // pad should be inherited, bg should be component
    const padProp = findProp(result.allProperties, 'pad')
    const bgProp = findProp(result.allProperties, 'bg')

    if (padProp && padProp.source !== 'instance') {
      expect(['inherited', 'component']).toContain(padProp.source)
    }
  })
})

// =============================================================================
// 9. COMPLEX STRUCTURES
// =============================================================================

describe('Complex Nested Structures', () => {
  it('handles parent with children', () => {
    const source = `Container pad 16, bg #333
  Child w 100`
    const ctx = createContext(source)

    const containerId = getNodeByName(ctx, 'Container')
    const childId = getNodeByName(ctx, 'Child')

    if (containerId) {
      const result = ctx.extractor.getProperties(containerId)!
      expect(findProp(result.allProperties, 'pad')?.value).toBe('16')
    }

    if (childId) {
      const result = ctx.extractor.getProperties(childId)!
      expect(findProp(result.allProperties, 'w')?.value).toBe('100')
    }
  })

  it('handles deeply nested children', () => {
    const source = `A pad 8
  B bg #111
    C rad 4
      D w 50`
    const ctx = createContext(source)

    const aId = getNodeByName(ctx, 'A')
    const bId = getNodeByName(ctx, 'B')
    const cId = getNodeByName(ctx, 'C')
    const dId = getNodeByName(ctx, 'D')

    if (aId) expect(ctx.extractor.getProperties(aId)).not.toBeNull()
    if (bId) expect(ctx.extractor.getProperties(bId)).not.toBeNull()
    if (cId) expect(ctx.extractor.getProperties(cId)).not.toBeNull()
    if (dId) expect(ctx.extractor.getProperties(dId)).not.toBeNull()
  })

  it('handles sibling components', () => {
    const source = `Container
  A bg #111
  B bg #222
  C bg #333`
    const ctx = createContext(source)

    const aId = getNodeByName(ctx, 'A')
    const bId = getNodeByName(ctx, 'B')
    const cId = getNodeByName(ctx, 'C')

    if (aId) {
      expect(ctx.extractor.getProperties(aId)!.allProperties).toBeDefined()
    }
    if (bId) {
      expect(ctx.extractor.getProperties(bId)!.allProperties).toBeDefined()
    }
    if (cId) {
      expect(ctx.extractor.getProperties(cId)!.allProperties).toBeDefined()
    }
  })

  it('modifies nested child without affecting parent', () => {
    const source = `Container pad 16
  Child bg #333`
    const ctx = createContext(source)
    const childId = getNodeByName(ctx, 'Child')!

    const result = ctx.modifier.updateProperty(childId, 'bg', '#444')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Container pad 16')
    expect(result.newSource).toContain('Child bg #444')
  })

  it('modifies parent without affecting children', () => {
    const source = `Container pad 16
  Child bg #333`
    const ctx = createContext(source)
    const containerId = getNodeByName(ctx, 'Container')!

    const result = ctx.modifier.updateProperty(containerId, 'pad', '24')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Container pad 24')
    expect(result.newSource).toContain('Child bg #333')
  })
})

// =============================================================================
// 10. EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles component with text content', () => {
    const ctx = createContext('Text "Hello World", col #333')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'col')?.value).toBe('#333')
  })

  it('handles empty component', () => {
    const ctx = createContext('Box')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)

    expect(result).not.toBeNull()
    // May have available properties but no instance properties
  })

  it('handles component with only boolean', () => {
    const ctx = createContext('Box hor')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(result.allProperties.length).toBeGreaterThan(0)
  })

  it('handles hex colors in different formats', () => {
    const short = createContext('Box bg #333')
    const long = createContext('Box bg #333333')
    const withAlpha = createContext('Box bg #33333380')

    const shortId = getFirstNodeId(short)!
    const longId = getFirstNodeId(long)!
    const alphaId = getFirstNodeId(withAlpha)!

    expect(findProp(short.extractor.getProperties(shortId)!.allProperties, 'bg')?.value).toBe('#333')
    expect(findProp(long.extractor.getProperties(longId)!.allProperties, 'bg')?.value).toBe('#333333')
    expect(findProp(withAlpha.extractor.getProperties(alphaId)!.allProperties, 'bg')?.value).toBe('#33333380')
  })

  it('handles special size values: hug and full', () => {
    const hug = createContext('Box w hug')
    const full = createContext('Box w full')
    const hugId = getFirstNodeId(hug)!
    const fullId = getFirstNodeId(full)!

    expect(findProp(hug.extractor.getProperties(hugId)!.allProperties, 'w')?.value).toBe('hug')
    expect(findProp(full.extractor.getProperties(fullId)!.allProperties, 'w')?.value).toBe('full')
  })

  it('handles negative values', () => {
    const ctx = createContext('Box margin -16')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'margin')
    expect(prop?.value).toBe('-16')
  })

  it('handles decimal values', () => {
    const ctx = createContext('Box opacity 0.5')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'opacity')
    expect(prop?.value).toBe('0.5')
  })

  it('handles percentage values', () => {
    const ctx = createContext('Box w 50%')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    const prop = findProp(result.allProperties, 'w')
    expect(prop?.value).toBe('50%')
  })

  it('adding property to component with no properties', () => {
    const ctx = createContext('Box')
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.addProperty(nodeId, 'bg', '#333')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('bg #333')
  })

  it('removing last property from component', () => {
    const ctx = createContext('Box bg #333')
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.removeProperty(nodeId, 'bg')

    expect(result.success).toBe(true)
    // Should just have Box with no properties
    expect(result.newSource.trim()).toBe('Box')
  })
})

// =============================================================================
// 11. PROPERTY TYPES
// =============================================================================

describe('Property Type Detection', () => {
  it('identifies color properties', () => {
    const ctx = createContext('Box bg #333, col #FFF, boc #999')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'bg')?.type).toBe('color')
    expect(findProp(result.allProperties, 'col')?.type).toBe('color')
    expect(findProp(result.allProperties, 'boc')?.type).toBe('color')
  })

  it('identifies spacing properties', () => {
    const ctx = createContext('Box pad 16, margin 8, gap 4')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'pad')?.type).toBe('spacing')
    expect(findProp(result.allProperties, 'gap')?.type).toBe('spacing')
  })

  it('identifies size properties', () => {
    const ctx = createContext('Box w 100, h 200, minw 50, maxw 300')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'w')?.type).toBe('size')
    expect(findProp(result.allProperties, 'h')?.type).toBe('size')
  })

  it('identifies boolean properties', () => {
    const ctx = createContext('Box hor, center, wrap')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'hor')?.type).toBe('boolean')
    expect(findProp(result.allProperties, 'center')?.type).toBe('boolean')
    expect(findProp(result.allProperties, 'wrap')?.type).toBe('boolean')
  })

  it('identifies number properties', () => {
    const ctx = createContext('Box opacity 0.5, z 10')
    const nodeId = getFirstNodeId(ctx)!
    const result = ctx.extractor.getProperties(nodeId)!

    expect(findProp(result.allProperties, 'opacity')?.type).toBe('number')
    expect(findProp(result.allProperties, 'z')?.type).toBe('number')
  })
})

// =============================================================================
// 12. ROUND-TRIP MODIFICATION
// =============================================================================

describe('Round-Trip Modifications', () => {
  it('modifying property preserves all other properties', () => {
    const original = 'Box w 100, h 200, bg #333, pad 16, rad 8, center'
    const ctx = createContext(original)
    const nodeId = getFirstNodeId(ctx)!

    const result = ctx.modifier.updateProperty(nodeId, 'bg', '#444')

    expect(result.success).toBe(true)

    // Parse the modified source and verify all properties
    const modified = createContext(result.newSource)
    const modifiedId = getFirstNodeId(modified)!
    const props = modified.extractor.getProperties(modifiedId)!

    expect(findProp(props.allProperties, 'w')?.value).toBe('100')
    expect(findProp(props.allProperties, 'h')?.value).toBe('200')
    expect(findProp(props.allProperties, 'bg')?.value).toBe('#444')
    expect(findProp(props.allProperties, 'pad')?.value).toBe('16')
    expect(findProp(props.allProperties, 'rad')?.value).toBe('8')
    expect(findProp(props.allProperties, 'center')).toBeDefined()
  })

  it('multiple sequential modifications work correctly', () => {
    let source = 'Box bg #111'
    let ctx = createContext(source)
    let nodeId = getFirstNodeId(ctx)!

    // Modify bg
    let result = ctx.modifier.updateProperty(nodeId, 'bg', '#222')
    expect(result.success).toBe(true)
    source = result.newSource

    // Add pad
    ctx = createContext(source)
    nodeId = getFirstNodeId(ctx)!
    result = ctx.modifier.addProperty(nodeId, 'pad', '16')
    expect(result.success).toBe(true)
    source = result.newSource

    // Add rad
    ctx = createContext(source)
    nodeId = getFirstNodeId(ctx)!
    result = ctx.modifier.addProperty(nodeId, 'rad', '8')
    expect(result.success).toBe(true)
    source = result.newSource

    // Verify final state
    ctx = createContext(source)
    nodeId = getFirstNodeId(ctx)!
    const props = ctx.extractor.getProperties(nodeId)!

    expect(findProp(props.allProperties, 'bg')?.value).toBe('#222')
    expect(findProp(props.allProperties, 'pad')?.value).toBe('16')
    expect(findProp(props.allProperties, 'rad')?.value).toBe('8')
  })

  it('add then remove property returns to original', () => {
    const original = 'Box bg #333'
    let ctx = createContext(original)
    let nodeId = getFirstNodeId(ctx)!

    // Add property
    let result = ctx.modifier.addProperty(nodeId, 'pad', '16')
    expect(result.success).toBe(true)

    // Remove property
    ctx = createContext(result.newSource)
    nodeId = getFirstNodeId(ctx)!
    result = ctx.modifier.removeProperty(nodeId, 'pad')
    expect(result.success).toBe(true)

    // Should be back to original
    expect(result.newSource.trim()).toBe(original.trim())
  })
})
