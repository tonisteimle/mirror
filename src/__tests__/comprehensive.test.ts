/**
 * Comprehensive DSL Test Suite
 * Tests all features from script to HTML output
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../parser/lexer'
import { parse } from '../parser/parser'
import { generateReactElement, generateReactCode } from '../generator/react-generator'
import { ValidationService, cleanLLMOutput as _cleanLLMOutput, correctProperty, correctColor } from '../validation'
import { propsToString } from '../utils/dsl-serializer'
import React from 'react'

// ============================================================================
// Helper Functions
// ============================================================================

function getStyle(node: React.ReactNode): React.CSSProperties {
  if (React.isValidElement(node)) {
    return (node.props as { style?: React.CSSProperties }).style || {}
  }
  return {}
}

function generate(dsl: string): React.ReactNode {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)
  return Array.isArray(elements) ? elements[0] : elements
}

// ============================================================================
// LEXER TESTS - Extended
// ============================================================================

describe('Lexer - Extended', () => {
  describe('New Feature: cen property', () => {
    it('tokenizes cen as a property', () => {
      const tokens = tokenize('Button cen cen')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'cen' })
      expect(tokens[2]).toMatchObject({ type: 'PROPERTY', value: 'cen' })
    })
  })

  describe('Error Handling: Unterminated Strings', () => {
    it('generates ERROR token for unterminated string', () => {
      const tokens = tokenize('Button "unclosed')
      const errorToken = tokens.find(t => t.type === 'ERROR')
      expect(errorToken).toBeDefined()
      expect(errorToken?.value).toContain('Unterminated string')
    })

    it('continues tokenizing after unterminated string', () => {
      const tokens = tokenize('Button "unclosed\nText "valid"')
      const componentNames = tokens.filter(t => t.type === 'COMPONENT_NAME')
      expect(componentNames.length).toBe(2)
    })
  })

  describe('Direction Combos', () => {
    it('tokenizes l-r as direction', () => {
      const tokens = tokenize('Box pad l-r 16')
      expect(tokens[2]).toMatchObject({ type: 'DIRECTION', value: 'l-r' })
    })

    it('tokenizes u-d as direction', () => {
      const tokens = tokenize('Box pad u-d 16')
      expect(tokens[2]).toMatchObject({ type: 'DIRECTION', value: 'u-d' })
    })

    it('tokenizes complex combo u-d-l-r', () => {
      const tokens = tokenize('Box pad u-d-l-r 16')
      // This should be tokenized as a direction
      const dirToken = tokens.find(t => t.type === 'DIRECTION' && t.value === 'u-d-l-r')
      expect(dirToken).toBeDefined()
    })
  })

  describe('Hover Properties', () => {
    it('tokenizes hover-col', () => {
      const tokens = tokenize('Button hover-col #333')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'hover-col' })
    })

    it('tokenizes hover-col', () => {
      const tokens = tokenize('Button hover-col #FFF')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'hover-col' })
    })

    it('tokenizes hover-boc', () => {
      const tokens = tokenize('Button hover-boc #555')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'hover-boc' })
    })
  })

  describe('Token References', () => {
    it('tokenizes $tokenName', () => {
      const tokens = tokenize('Button col $primary')
      expect(tokens[2]).toMatchObject({ type: 'TOKEN_REF', value: 'primary' })
    })

    it('tokenizes inline token definition', () => {
      const tokens = tokenize('Box col #3B82F6:primary')
      expect(tokens[2]).toMatchObject({ type: 'COLOR', value: '#3B82F6' })
      expect(tokens[3]).toMatchObject({ type: 'TOKEN_DEF', value: 'primary' })
    })
  })

  describe('Modifiers', () => {
    it('tokenizes -primary modifier', () => {
      const tokens = tokenize('Button -primary')
      expect(tokens[1]).toMatchObject({ type: 'MODIFIER', value: '-primary' })
    })

    it('tokenizes multiple modifiers', () => {
      const tokens = tokenize('Button -primary -rounded -disabled')
      expect(tokens[1]).toMatchObject({ type: 'MODIFIER', value: '-primary' })
      expect(tokens[2]).toMatchObject({ type: 'MODIFIER', value: '-rounded' })
      expect(tokens[3]).toMatchObject({ type: 'MODIFIER', value: '-disabled' })
    })
  })

  describe('Complex Line Tokenization', () => {
    it('tokenizes complex component definition', () => {
      const tokens = tokenize('Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6 hover-col #2563EB "Click me"')

      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_DEF', value: 'Button' })
      expect(tokens.filter(t => t.type === 'PROPERTY').length).toBeGreaterThan(5)
      expect(tokens.find(t => t.type === 'STRING')?.value).toBe('Click me')
    })
  })
})

// ============================================================================
// PARSER TESTS - Extended
// ============================================================================

describe('Parser - Extended', () => {
  describe('Error Collection', () => {
    it('collects unterminated string errors', () => {
      const result = parse('Button "unclosed')
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Unterminated string')
    })

    it('generates orphan number warnings', () => {
      const result = parse('Button 42')
      const orphanWarning = result.errors.find(e => e.includes('Orphan number'))
      expect(orphanWarning).toBeDefined()
    })

    it('generates orphan color warnings', () => {
      const result = parse('Button #FFF')
      const orphanWarning = result.errors.find(e => e.includes('Orphan color'))
      expect(orphanWarning).toBeDefined()
    })
  })

  describe('cen Property', () => {
    it('parses cen cen as double centering', () => {
      const result = parse('Button cen cen')
      expect(result.nodes[0].properties.align_main).toBe('cen')
      expect(result.nodes[0].properties.align_cross).toBe('cen')
    })

    it('parses single cen as main axis centering', () => {
      const result = parse('Button cen')
      expect(result.nodes[0].properties.align_main).toBe('cen')
    })
  })

  describe('CSS Shorthand Padding/Margin', () => {
    it('parses pad with 2 values (vertical horizontal)', () => {
      const result = parse('Box: pad 16 8')
      const props = result.registry.get('Box')!.properties
      expect(props.pad_u).toBe(16)
      expect(props.pad_d).toBe(16)
      expect(props.pad_l).toBe(8)
      expect(props.pad_r).toBe(8)
    })

    it('parses pad with 4 values (top right bottom left)', () => {
      const result = parse('Box: pad 1 2 3 4')
      const props = result.registry.get('Box')!.properties
      expect(props.pad_u).toBe(1)
      expect(props.pad_r).toBe(2)
      expect(props.pad_d).toBe(3)
      expect(props.pad_l).toBe(4)
    })
  })

  describe('Complex Nested Structures', () => {
    it('parses deeply nested structure', () => {
      // Each component definition is separate - children are defined as indented children
      const dsl = `App: ver full

Header: hor between ver-cen h 60 pad l-r 24

Nav: hor gap 16

Card: ver pad 16 rad 8
  Title size 18 weight 600
  Body size 14

App
  Header
  Nav
  Card`

      const result = parse(dsl)
      expect(result.registry.has('App')).toBe(true)
      expect(result.registry.has('Header')).toBe(true)
      expect(result.registry.has('Nav')).toBe(true)
      expect(result.registry.has('Card')).toBe(true)

      // Card should have children in the template
      const card = result.registry.get('Card')!
      expect(card.children.length).toBe(2) // Title, Body
    })
  })

  describe('Template with Children Reuse', () => {
    it('clones children with new IDs on template reuse', () => {
      const result = parse(`Card: ver gap 8
  Title size 18
  Body size 14

Card
Card`)

      expect(result.nodes.length).toBe(2)

      // Each instance should have its own children with unique IDs
      const card1 = result.nodes[0]
      const card2 = result.nodes[1]

      expect(card1.children.length).toBe(2)
      expect(card2.children.length).toBe(2)

      // IDs should be different
      expect(card1.children[0].id).not.toBe(card2.children[0].id)
    })
  })

  describe('Design Tokens', () => {
    it('parses color with inline token definition syntax', () => {
      const result = parse(`Box: col #3B82F6:primary`)

      // The color should be parsed
      expect(result.registry.get('Box')!.properties.col).toBe('#3B82F6')
    })
  })
})

// ============================================================================
// GENERATOR TESTS - Extended
// ============================================================================

describe('Generator - Extended', () => {
  describe('Border Color with Directions', () => {
    it('bor_l with boc applies color to left border', () => {
      // Use definition + instance pattern
      const result = parse('Box: bor l 2 boc #FF0000\n\nBox')
      const elements = generateReactElement(result.nodes)
      const style = getStyle(Array.isArray(elements) ? elements[0] : elements)

      expect(style.borderLeft).toContain('#FF0000')
      expect(style.borderLeft).toContain('2px')
    })

    it('bor_r with boc applies color to right border', () => {
      const result = parse('Box: bor r 2 boc #00FF00\n\nBox')
      const elements = generateReactElement(result.nodes)
      const style = getStyle(Array.isArray(elements) ? elements[0] : elements)

      expect(style.borderRight).toContain('#00FF00')
    })

    it('bor_u with boc applies color to top border', () => {
      const result = parse('Box: bor u 2 boc #0000FF\n\nBox')
      const elements = generateReactElement(result.nodes)
      const style = getStyle(Array.isArray(elements) ? elements[0] : elements)

      expect(style.borderTop).toContain('#0000FF')
    })

    it('bor_d with boc applies color to bottom border', () => {
      const result = parse('Box: bor d 2 boc #FFFF00\n\nBox')
      const elements = generateReactElement(result.nodes)
      const style = getStyle(Array.isArray(elements) ? elements[0] : elements)

      expect(style.borderBottom).toContain('#FFFF00')
    })
  })

  describe('CSS Transitions for Hover', () => {
    it('hover properties are parsed correctly', () => {
      const result = parse('Button: hover-col #333\n\nButton')
      // hover-col should be stored as a property
      expect(result.nodes[0].properties['hover-col']).toBe('#333')
    })

    it('hover-col is parsed correctly', () => {
      const result = parse('Button: hover-col #FFF\n\nButton')
      expect(result.nodes[0].properties['hover-col']).toBe('#FFF')
    })

    it('hover-boc is parsed correctly', () => {
      const result = parse('Button: hover-boc #555\n\nButton')
      expect(result.nodes[0].properties['hover-boc']).toBe('#555')
    })

    it('does NOT add transition without hover properties', () => {
      const element = generate('Button col #333')
      const style = getStyle(element)
      expect(style.transition).toBeUndefined()
    })
  })

  describe('Flex Display Optimization', () => {
    it('adds flex display when hor is present', () => {
      const element = generate('Box hor')
      const style = getStyle(element)
      expect(style.display).toBe('flex')
    })

    it('adds flex display when ver is present', () => {
      const element = generate('Box ver')
      const style = getStyle(element)
      expect(style.display).toBe('flex')
    })

    it('adds flex display when gap is present', () => {
      const element = generate('Box gap 16')
      const style = getStyle(element)
      expect(style.display).toBe('flex')
    })

    it('adds flex display when element has children', () => {
      const dsl = `Box
  Child`
      const result = parse(dsl)
      const elements = generateReactElement(result.nodes)
      const style = getStyle(Array.isArray(elements) ? elements[0] : elements)
      expect(style.display).toBe('flex')
    })

    it('does NOT add flex for simple element without layout properties or children', () => {
      const element = generate('Text col #FFF "Hello"')
      const style = getStyle(element)
      // Without hor, ver, gap, between, wrap, grow, or children, flex is not added
      expect(style.display).toBeUndefined()
    })
  })

  describe('Alignment with cen', () => {
    it('cen cen centers both axes in hor layout', () => {
      const element = generate('Box hor cen cen')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('center')
      expect(style.alignItems).toBe('center')
    })

    it('cen cen centers both axes in ver layout', () => {
      const element = generate('Box ver cen cen')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('center')
      expect(style.alignItems).toBe('center')
    })
  })

  describe('Code Generation', () => {
    it('generates React code string', () => {
      // Use definition + instance pattern
      const result = parse('Button: pad 12 col #3B82F6 rad 8 "Click"\n\nButton')
      const code = generateReactCode(result.nodes)

      expect(code).toContain('<div')
      expect(code).toContain('className="Button"')
      expect(code).toContain('style=')
    })
  })
})

// ============================================================================
// VALIDATION TESTS - Extended
// ============================================================================

describe('Validation - Extended', () => {
  const validator = new ValidationService({ autoCorrect: true })

  describe('Direction Combo Handling in Layout', () => {
    it('removes l-r direction from layout', () => {
      const result = validator.validate(`--- COMPONENTS ---
Button: pad l-r 16

--- LAYOUT ---
Button pad l-r 16 "Click"`)

      expect(result.layout).not.toContain('l-r')
      expect(result.layout).toContain('Button')
      expect(result.layout).toContain('"Click"')
    })

    it('removes u-d direction from layout', () => {
      const result = validator.validate(`--- COMPONENTS ---
Box: pad u-d 8

--- LAYOUT ---
Box pad u-d 8`)

      expect(result.layout).not.toContain('u-d')
    })
  })

  describe('Property Corrections - Updated Mappings', () => {
    it('corrects wrap to wrap (flex-wrap)', () => {
      const result = correctProperty('flex-wrap')
      expect(result.corrected).toBe('wrap')
    })

    it('corrects grow to grow (flex-grow)', () => {
      const result = correctProperty('flex-grow')
      expect(result.corrected).toBe('grow')
    })

    it('does NOT incorrectly map justify-content (ambiguous)', () => {
      const result = correctProperty('justify-content')
      // Should not be auto-corrected to hor-cen since justify-content can be many values
      expect(result.corrected).not.toBe('hor-cen')
    })

    it('corrects common typos', () => {
      expect(correctProperty('centre').corrected).toBe('cen')
      expect(correctProperty('centered').corrected).toBe('cen')
      expect(correctProperty('horizonal').corrected).toBe('hor')
      expect(correctProperty('verticle').corrected).toBe('ver')
    })
  })

  describe('Color Validation', () => {
    it('accepts 3-char hex and expands', () => {
      const result = correctColor('#ABC')
      expect(result.corrected).toBe('#AABBCC')
    })

    it('converts named colors', () => {
      expect(correctColor('white').corrected).toBe('#FFFFFF')
      expect(correctColor('black').corrected).toBe('#000000')
      expect(correctColor('red').corrected).toBe('#FF0000')
      expect(correctColor('blue').corrected).toBe('#0000FF')
      // Note: implementation uses #00FF00 for green (CSS lime), not #008000 (CSS green)
      expect(correctColor('green').corrected).toBe('#00FF00')
    })

    it('handles transparent', () => {
      const result = correctColor('transparent')
      expect(result.isValid).toBe(true)
    })
  })
})

// ============================================================================
// DSL SERIALIZER TESTS
// ============================================================================

describe('DSL Serializer', () => {
  it('serializes basic properties', () => {
    const props = { pad: 16, bg: '#3B82F6', col: '#FFFFFF' }
    const result = propsToString(props)
    expect(result).toContain('pad 16')
    expect(result).toContain('bg #3B82F6')
    expect(result).toContain('col #FFFFFF')
  })

  it('serializes layout direction', () => {
    const props = { hor: true, gap: 8 }
    const result = propsToString(props)
    expect(result).toContain('hor')
    expect(result).toContain('gap 8')
  })

  it('serializes alignment properties', () => {
    const props = { 'hor-cen': true, 'ver-cen': true }
    const result = propsToString(props)
    expect(result).toContain('hor-cen')
    expect(result).toContain('ver-cen')
  })

  it('serializes directional padding', () => {
    const props = { pad_l: 8, pad_r: 8 }
    const result = propsToString(props)
    expect(result).toContain('pad l-r 8')
  })

  it('serializes hover properties', () => {
    const props = { 'hover-bg': '#333', 'hover-col': '#FFF' }
    const result = propsToString(props)
    expect(result).toContain('hover-bg #333')
    expect(result).toContain('hover-col #FFF')
  })

  it('serializes icon property', () => {
    const props = { icon: 'star' }
    const result = propsToString(props)
    expect(result).toContain('icon "star"')
  })
})

// ============================================================================
// END-TO-END COMPLEX EXAMPLES
// ============================================================================

describe('End-to-End Complex Examples', () => {
  describe('Login Form', () => {
    const loginFormDSL = `LoginForm: ver gap 16 pad 24 col #1F2937 rad 12 w 320
  Title size 24 weight 700 col #FFF
  Field: ver gap 4
    Label size 12 col #9CA3AF
    Input h 40 pad l-r 12 col #374151 rad 6 col #FFF bor 1 boc #4B5563
  Button: hor hor-cen ver-cen h 44 rad 8 col #3B82F6 hover-col #2563EB
  Link: hor hor-cen size 14 col #9CA3AF hover-col #FFF

LoginForm
  Title "Sign In"
  Field Label "Email" Input "email@example.com"
  Field Label "Password" Input "••••••••"
  Button "Sign In"
  Link "Forgot Password?"`

    it('parses login form correctly', () => {
      const result = parse(loginFormDSL)
      expect(result.registry.has('LoginForm')).toBe(true)
      expect(result.registry.has('Field')).toBe(true)
      expect(result.registry.has('Button')).toBe(true)
      expect(result.nodes.length).toBe(1)
    })

    it('generates login form with correct styles', () => {
      const result = parse(loginFormDSL)
      const elements = generateReactElement(result.nodes)
      const form = Array.isArray(elements) ? elements[0] : elements
      const style = getStyle(form)

      expect(style.padding).toBe('24px')
      expect(style.backgroundColor).toBe('#1F2937')
      expect(style.borderRadius).toBe('12px')
      expect(style.width).toBe('320px')
    })

    it('button has hover transition', () => {
      const result = parse(loginFormDSL)
      const buttonTemplate = result.registry.get('Button')!
      expect(buttonTemplate.properties['hover-col']).toBe('#2563EB')
    })
  })

  describe('Dashboard Layout', () => {
    const dashboardDSL = `Dashboard: hor full col #111827
  Sidebar: ver w 240 col #1F2937 pad u-d 16
    Logo: hor ver-cen h 48 pad l-r 16
      Icon size 24 col #3B82F6
      Text size 18 weight 700 col #FFF
    Nav: ver gap 4 pad u 16
      NavItem: hor ver-cen h 40 pad l-r 16 rad 8 gap 12 hover-col #374151
        Icon size 20 col #9CA3AF
        Label size 14 col #9CA3AF
  Content: ver grow
    Header: hor between ver-cen h 64 pad l-r 24 col #1F2937 bor d 1 boc #374151
      Title size 20 weight 600 col #FFF
      Actions: hor gap 8
        Button: hor hor-cen ver-cen h 36 pad l-r 12 rad 6 col #3B82F6 size 14
    Main: ver grow pad 24 gap 24
      Card: ver pad 16 col #1F2937 rad 12 gap 12
        CardHeader: hor between ver-cen
          CardTitle size 16 weight 600 col #FFF
          CardAction size 14 col #3B82F6
        CardBody size 14 col #9CA3AF`

    it('parses dashboard with all nested components', () => {
      const result = parse(dashboardDSL)

      expect(result.registry.has('Dashboard')).toBe(true)
      expect(result.registry.has('Sidebar')).toBe(true)
      expect(result.registry.has('Content')).toBe(true)
      expect(result.registry.has('NavItem')).toBe(true)
      expect(result.registry.has('Card')).toBe(true)
    })

    it('sidebar has correct width', () => {
      const result = parse(dashboardDSL)
      const sidebar = result.registry.get('Sidebar')!
      expect(sidebar.properties.w).toBe(240)
    })

    it('header has bottom border with color', () => {
      const result = parse(dashboardDSL)
      const header = result.registry.get('Header')!
      expect(header.properties.bor_d).toBe(1)
      expect(header.properties.boc).toBe('#374151')
    })
  })

  describe('Product Grid', () => {
    const productGridDSL = `ProductGrid: hor wrap gap 16 pad 16
  ProductCard: ver w 200 col #1F2937 rad 8 hover-col #374151
    Image: h 150 col #374151 rad u 8
    Info: ver pad 12 gap 8
      Name size 14 weight 500 col #FFF
      Price size 16 weight 700 col #10B981
      Rating: hor gap 4 ver-cen
        Star size 12 col #FBBF24
        Count size 12 col #6B7280

ProductGrid
  ProductCard
    Image
    Info Name "Product 1" Price "$99" Rating Star Count "4.5"
  ProductCard
    Image
    Info Name "Product 2" Price "$149" Rating Star Count "4.8"
  ProductCard
    Image
    Info Name "Product 3" Price "$79" Rating Star Count "4.2"`

    it('parses product grid with children', () => {
      const result = parse(productGridDSL)

      expect(result.registry.has('ProductGrid')).toBe(true)
      expect(result.registry.has('ProductCard')).toBe(true)

      const grid = result.nodes[0]
      expect(grid.children.length).toBe(3)
    })

    it('grid has wrap property', () => {
      const result = parse(productGridDSL)
      const grid = result.registry.get('ProductGrid')!
      expect(grid.properties.wrap).toBe(true)
    })

    it('product card has hover effect', () => {
      const result = parse(productGridDSL)
      const card = result.registry.get('ProductCard')!
      expect(card.properties['hover-col']).toBe('#374151')
    })
  })

  describe('Chat Interface', () => {
    const chatDSL = `Chat: ver full col #111827
  Messages: ver grow pad 16 gap 12
    MessageBubble: ver maxw 280 pad 12 rad 12
      Author size 12 weight 600
      Content size 14
      Time size 10 col #6B7280
    MyMessage: from MessageBubble col #3B82F6
    TheirMessage: from MessageBubble col #374151
  InputArea: hor gap 12 pad 16 col #1F2937 bor u 1 boc #374151
    Input: grow h 44 pad l-r 16 col #374151 rad 22 col #FFF
    SendButton: hor hor-cen ver-cen w 44 h 44 rad 22 col #3B82F6 hover-col #2563EB
      Icon col #FFF`

    it('parses chat interface', () => {
      const result = parse(chatDSL)

      expect(result.registry.has('Chat')).toBe(true)
      expect(result.registry.has('MyMessage')).toBe(true)
      expect(result.registry.has('TheirMessage')).toBe(true)
    })

    it('MyMessage inherits from MessageBubble', () => {
      const result = parse(chatDSL)
      const myMessage = result.registry.get('MyMessage')!

      // Inherited properties
      expect(myMessage.properties.maxw).toBe(280)
      expect(myMessage.properties.pad).toBe(12)
      expect(myMessage.properties.rad).toBe(12)

      // Overridden properties (col #3B82F6 is the bg color)
      expect(myMessage.properties.col).toBe('#3B82F6')
    })

    it('input area has top border', () => {
      const result = parse(chatDSL)
      const inputArea = result.registry.get('InputArea')!
      expect(inputArea.properties.bor_u).toBe(1)
      expect(inputArea.properties.boc).toBe('#374151')
    })
  })

  describe('Kanban Board', () => {
    const kanbanDSL = `Kanban: hor full pad 16 gap 16 col #111827
  Column: ver w 280 col #1F2937 rad 8
    ColumnHeader: hor between ver-cen pad 12
      ColumnTitle size 14 weight 600 col #FFF
      TaskCount: hor hor-cen ver-cen w 24 h 24 rad 12 col #374151 size 12 col #9CA3AF
    TaskList: ver gap 8 pad l-r 12 pad d 12
      Task: ver pad 12 col #374151 rad 6 gap 8 hover-col #4B5563
        TaskTitle size 14 col #FFF
        TaskMeta: hor between ver-cen
          Tags: hor gap 4
            Tag: pad l-r 8 pad u-d 2 rad 4 size 10 col #3B82F6
          Avatar w 24 h 24 rad 12 col #6B7280

Kanban
  Column ColumnHeader ColumnTitle "To Do" TaskCount "3"
  Column ColumnHeader ColumnTitle "In Progress" TaskCount "2"
  Column ColumnHeader ColumnTitle "Done" TaskCount "5"`

    it('parses kanban board', () => {
      const result = parse(kanbanDSL)

      expect(result.registry.has('Kanban')).toBe(true)
      expect(result.registry.has('Column')).toBe(true)
      expect(result.registry.has('Task')).toBe(true)
    })

    it('kanban has horizontal layout with gap', () => {
      const result = parse(kanbanDSL)
      const kanban = result.registry.get('Kanban')!
      expect(kanban.properties.hor).toBe(true)
      expect(kanban.properties.gap).toBe(16)
    })

    it('task has hover effect', () => {
      const result = parse(kanbanDSL)
      const task = result.registry.get('Task')!
      expect(task.properties['hover-col']).toBe('#4B5563')
    })
  })
})

// ============================================================================
// VALIDATION INTEGRATION TESTS
// ============================================================================

describe('Validation Integration', () => {
  const validator = new ValidationService({ autoCorrect: true })

  it('validates and corrects full LLM output', () => {
    const llmOutput = `Here's a beautiful button component:

\`\`\`
--- COMPONENTS ---
Button: padding 16 background #3B82F6 border-radius 8 color white

--- LAYOUT ---
Button padding 16 "Click me"
\`\`\`

This creates a primary button with hover effects.`

    const result = validator.validate(llmOutput)

    // Corrections should have been applied
    expect(result.corrections.length).toBeGreaterThan(0)

    // Components should have corrected properties
    expect(result.components).toContain('pad')
    expect(result.components).toContain('col')
    expect(result.components).toContain('rad')

    // Layout should not have properties
    expect(result.layout).not.toContain('padding')
    expect(result.layout).toContain('Button')
    expect(result.layout).toContain('"Click me"')
  })

  it('handles complex nested structure validation', () => {
    const input = `--- COMPONENTS ---
Card: ver padding 16 gap 8 background #1F2937 border-radius 8
  Title: fontsize 18 fontweight 600 color #FFFFFF
  Body: fontsize 14 color #9CA3AF

--- LAYOUT ---
Card
  Title "Hello"
  Body "World"`

    const result = validator.validate(input)

    // Should correct CSS properties to DSL
    expect(result.components).toContain('pad')
    expect(result.components).toContain('col')
    expect(result.components).toContain('rad')
    expect(result.components).toContain('size')
    expect(result.components).toContain('weight')
    expect(result.components).toContain('col')
  })
})
