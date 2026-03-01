/**
 * JSON Pipeline Tests
 *
 * Tests for the 4-stage JSON generation pipeline.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import {
  analyzeContext,
  applyConstraints,
  jsonToMirror,
  validateStructureJSON,
  validatePropertiesJSON,
  autoFixJSON,
} from '../../services/json-pipeline'
import type {
  StructureJSON,
  PropertiesJSON,
  FullComponent,
  AnalysisContext,
} from '../../services/json-pipeline'

// =============================================================================
// Test Data
// =============================================================================

const sampleTokensCode = `
$primary: #3B82F6
$primary.hover: #2563EB
$surface: #1E1E2E
$text: #E4E4E7
$md.pad: 12
$lg.pad: 16
$md.rad: 8
`

const sampleComponentsCode = `
Button:
  padding 12
  background $primary
  radius $md.rad
  hover
    background $primary.hover

Card:
  background $surface
  padding $lg.pad
  radius $md.rad
`

const sampleLayoutCode = `
Box horizontal
  Button "Click me"
`

// =============================================================================
// Stage 0: Analysis Tests
// =============================================================================

describe('Stage 0: Analysis', () => {
  test('extracts tokens correctly', () => {
    const context = analyzeContext('Eine Navigation', sampleTokensCode, '', '', 0)

    expect(context.tokens.length).toBeGreaterThan(0)
    expect(context.tokens.some(t => t.name === '$primary')).toBe(true)
    // Note: MirrorCodeIntelligence only extracts simple tokens, not compound ones like $md.pad
    expect(context.tokens.some(t => t.name === '$surface')).toBe(true)
  })

  test('extracts components correctly', () => {
    const context = analyzeContext('Ein Button', '', sampleComponentsCode, '', 0)

    expect(context.components.length).toBeGreaterThan(0)
    expect(context.components.some(c => c.name === 'Button')).toBe(true)
  })

  test('analyzes prompt for UI type', () => {
    const navContext = analyzeContext('Eine vertikale Navigation mit Icons', '', '', '', 0)
    expect(navContext.promptAnalysis.uiType).toBe('navigation')

    const buttonContext = analyzeContext('Ein blauer Button', '', '', '', 0)
    expect(buttonContext.promptAnalysis.uiType).toBe('button')

    const formContext = analyzeContext('Ein Login Formular', '', '', '', 0)
    expect(formContext.promptAnalysis.uiType).toBe('form')
  })

  test('detects required capabilities', () => {
    const navContext = analyzeContext('Navigation mit Icons und Hover-Effekten', '', '', '', 0)

    expect(navContext.promptAnalysis.capabilities.needsIcons).toBe(true)
    expect(navContext.promptAnalysis.capabilities.needsHover).toBe(true)
  })

  test('provides formatted context for LLM', () => {
    const context = analyzeContext('Eine Navigation', sampleTokensCode, '', '', 0)

    expect(context.formattedContext).toContain('TASK UNDERSTANDING')
    expect(context.formattedContext).toContain('NAVIGATION')
    expect(context.formattedContext).toContain('SUGGESTED STRUCTURE')
  })

  test('filters properties based on UI type', () => {
    const context = analyzeContext('Ein Button', '', '', '', 0)

    // Button should have cursor property (from button category)
    expect(context.validProperties.has('cursor')).toBe(true)
    // Essential properties should always be present
    expect(context.validProperties.has('padding')).toBe(true)
    expect(context.validProperties.has('background')).toBe(true)
  })

  test('filters states based on UI type', () => {
    const navContext = analyzeContext('Eine Navigation', '', '', '', 0)
    // Navigation should have selected state
    expect(navContext.validStates.has('selected')).toBe(true)

    const dropdownContext = analyzeContext('Ein Dropdown', '', '', '', 0)
    // Dropdown should have expanded state
    expect(dropdownContext.validStates.has('expanded')).toBe(true)
  })
})

// =============================================================================
// JSON Validation Tests
// =============================================================================

describe('JSON Validation', () => {
  test('validates valid structure JSON', () => {
    const json: StructureJSON = {
      components: [
        { type: 'Box', children: [{ type: 'Button', content: 'Click' }] },
      ],
    }

    const result = validateStructureJSON(json)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('rejects structure with missing type', () => {
    const json = {
      components: [{ content: 'test' }],
    }

    const result = validateStructureJSON(json)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('type'))).toBe(true)
  })

  test('warns about lowercase component type', () => {
    const json: StructureJSON = {
      components: [{ type: 'box' }],
    }

    const result = validateStructureJSON(json)
    expect(result.warnings.some(w => w.message.includes('uppercase'))).toBe(true)
  })

  test('validates valid properties JSON', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Button',
          properties: [
            { name: 'padding', value: 12 },
            { name: 'background', value: 'primary', isToken: true },
          ],
        },
      ],
    }

    const result = validatePropertiesJSON(json)
    expect(result.valid).toBe(true)
  })

  test('auto-fixes common issues', () => {
    const json = {
      components: [{ type: 'box' }],
    }

    const { fixed, fixes } = autoFixJSON(json)
    expect(fixes.length).toBeGreaterThan(0)
    expect((fixed as PropertiesJSON).components[0].type).toBe('Box')
  })
})

// =============================================================================
// Stage 3: Constraints Tests
// =============================================================================

describe('Stage 3: Constraints', () => {
  test('adds grow to horizontal children', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Box',
          properties: [{ name: 'horizontal', value: true }],
          children: [
            { type: 'Text', content: 'Hello' },
            { type: 'Text', content: 'World' },
          ],
        },
      ],
    }

    const result = applyConstraints(json)

    // Each child should now have grow
    for (const child of result.components[0].children || []) {
      expect(child.properties?.some(p => p.name === 'grow')).toBe(true)
    }
  })

  test('does not add grow to Icon components', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Box',
          properties: [{ name: 'horizontal', value: true }],
          children: [
            { type: 'Icon', content: 'home' },
            { type: 'Text', content: 'Label' },
          ],
        },
      ],
    }

    const result = applyConstraints(json)
    const children = result.components[0].children || []

    // Icon should NOT have grow
    const icon = children[0]
    expect(icon.properties?.some(p => p.name === 'grow')).toBeFalsy()

    // Text SHOULD have grow
    const text = children[1]
    expect(text.properties?.some(p => p.name === 'grow')).toBe(true)
  })

  test('does not add grow if width exists', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Box',
          properties: [{ name: 'horizontal', value: true }],
          children: [
            {
              type: 'Text',
              properties: [{ name: 'width', value: 100 }],
              content: 'Fixed',
            },
          ],
        },
      ],
    }

    const result = applyConstraints(json)
    const child = result.components[0].children?.[0]

    // Should have width but not grow
    expect(child?.properties?.some(p => p.name === 'width')).toBe(true)
    expect(child?.properties?.filter(p => p.name === 'grow')).toHaveLength(0)
  })

  test('normalizes token suffixes', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Box',
          properties: [
            { name: 'padding', value: 'md.pad', isToken: true },
            { name: 'gap', value: 'md.gap', isToken: true },
          ],
        },
      ],
    }

    const result = applyConstraints(json)
    const props = result.components[0].properties!

    // Token suffixes should be normalized (removed)
    expect(props.find(p => p.name === 'padding')?.value).toBe('md')
    expect(props.find(p => p.name === 'gap')?.value).toBe('md')
  })
})

// =============================================================================
// JSON to Mirror Conversion Tests
// =============================================================================

describe('JSON to Mirror Conversion', () => {
  test('converts simple component', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Button',
          content: 'Click me',
          properties: [{ name: 'padding', value: 12 }],
        },
      ],
    }

    const result = jsonToMirror(json)

    expect(result).toContain('Button')
    expect(result).toContain('"Click me"')
    expect(result).toContain('padding 12')
  })

  test('converts nested components', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Box',
          properties: [{ name: 'horizontal', value: true }],
          children: [
            { type: 'Text', content: 'Hello' },
            { type: 'Text', content: 'World' },
          ],
        },
      ],
    }

    const result = jsonToMirror(json)

    expect(result).toContain('Box')
    expect(result).toContain('horizontal')
    expect(result).toContain('Text "Hello"')
    expect(result).toContain('Text "World"')
  })

  test('converts token references', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Button',
          properties: [
            { name: 'background', value: 'primary', isToken: true },
          ],
        },
      ],
    }

    const result = jsonToMirror(json)

    expect(result).toContain('background $primary')
  })

  test('converts state blocks', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Button',
          states: [
            {
              name: 'hover',
              properties: [{ name: 'background', value: 'primary.hover', isToken: true }],
            },
          ],
        },
      ],
    }

    const result = jsonToMirror(json)

    expect(result).toContain('hover')
    expect(result).toContain('background $primary.hover')
  })

  test('converts event handlers', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Button',
          events: [
            {
              event: 'onclick',
              actions: ['toggle Menu', 'show Dropdown'],
            },
          ],
        },
      ],
    }

    const result = jsonToMirror(json)

    // Multiple actions should be comma-separated on one line
    expect(result).toContain('onclick: toggle Menu, show Dropdown')
  })

  test('converts definitions', () => {
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Button',
          name: 'PrimaryButton',
          isDefinition: true,
          properties: [
            { name: 'background', value: 'primary', isToken: true },
          ],
        },
      ],
    }

    const result = jsonToMirror(json)

    expect(result).toContain('PrimaryButton:')
    expect(result).toContain('background $primary')
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Pipeline Integration', () => {
  test('full pipeline: analysis → constraints → conversion', () => {
    // Analyze context with a card prompt
    const context = analyzeContext('Eine Card Komponente', sampleTokensCode, sampleComponentsCode, '', 0)
    expect(context.tokens.length).toBeGreaterThan(0)
    expect(context.promptAnalysis.uiType).toBe('card')

    // Create JSON
    const json: PropertiesJSON = {
      components: [
        {
          type: 'Card',
          properties: [
            { name: 'horizontal', value: true },
            { name: 'padding', value: 'lg.pad', isToken: true },
          ],
          children: [
            { type: 'Text', content: 'Title' },
            { type: 'Button', content: 'Action' },
          ],
        },
      ],
    }

    // Apply constraints
    const constrained = applyConstraints(json)

    // Children should have grow
    for (const child of constrained.components[0].children || []) {
      expect(child.properties?.some(p => p.name === 'grow')).toBe(true)
    }

    // Convert to Mirror
    const mirror = jsonToMirror(constrained)

    expect(mirror).toContain('Card')
    expect(mirror).toContain('horizontal')
    expect(mirror).toContain('padding $lg')
    expect(mirror).toContain('Text "Title"')
    expect(mirror).toContain('Button "Action"')
    expect(mirror).toContain('grow')
  })
})
