/**
 * Integration Tests: Full Document Parsing
 *
 * Tests parsing of complete Mirror documents
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'

// ============================================================================
// MINIMAL DOCUMENTS
// ============================================================================

describe('Integration: Minimal Documents', () => {
  it('parses empty document', () => {
    const ast = parse('')
    expect(ast.type).toBe('Program')
    expect(ast.tokens).toEqual([])
    expect(ast.components).toEqual([])
    expect(ast.instances).toEqual([])
  })

  it('parses whitespace-only document', () => {
    const ast = parse('   \n\n   ')
    expect(ast.tokens).toEqual([])
    expect(ast.components).toEqual([])
    expect(ast.instances).toEqual([])
  })

  it('parses comment-only document', () => {
    const ast = parse('// This is a comment\n// Another comment')
    expect(ast.tokens).toEqual([])
    expect(ast.components).toEqual([])
    expect(ast.instances).toEqual([])
  })

  it('parses single token', () => {
    const ast = parse('primary: color = #FFF')
    expect(ast.tokens.length).toBe(1)
  })

  it('parses single component', () => {
    const ast = parse('Card as frame:')
    expect(ast.components.length).toBe(1)
  })

  it('parses single instance', () => {
    const ast = parse('Button "Click"')
    expect(ast.instances.length).toBe(1)
  })
})

// ============================================================================
// TOKENS ONLY
// ============================================================================

describe('Integration: Tokens Only', () => {
  it('parses multiple tokens', () => {
    const ast = parse(`primary: color = #3B82F6
secondary: color = #64748B
text: color = #E4E4E7
muted: color = #71717A

sm: size = 4
md: size = 8
lg: size = 16
xl: size = 24`)
    expect(ast.tokens.length).toBe(8)
  })

  it('parses tokens with section headers', () => {
    const ast = parse(`--- Colors ---
primary: color = #3B82F6
secondary: color = #64748B

--- Spacing ---
sm: size = 4
lg: size = 16`)
    expect(ast.tokens.length).toBe(4)
  })
})

// ============================================================================
// COMPONENTS ONLY
// ============================================================================

describe('Integration: Components Only', () => {
  it('parses multiple components', () => {
    const ast = parse(`Card as frame:
  pad 16

Button as button:
  pad 8

Text as text:
  col white`)
    expect(ast.components.length).toBe(3)
  })

  it('parses components with inheritance', () => {
    const ast = parse(`Button as button:
  pad 8

DangerButton extends Button:
  bg danger

GhostButton extends Button:
  bg transparent`)
    expect(ast.components.length).toBe(3)
    expect(ast.components[0].primitive).toBe('button')
    expect(ast.components[1].extends).toBe('Button')
    expect(ast.components[2].extends).toBe('Button')
  })
})

// ============================================================================
// INSTANCES ONLY
// ============================================================================

describe('Integration: Instances Only', () => {
  it('parses multiple top-level instances', () => {
    const ast = parse(`Header
  Logo
  Nav

Content
  Main
  Sidebar

Footer
  Copyright`)
    expect(ast.instances.length).toBe(3)
  })

  it('parses deeply nested instances', () => {
    const ast = parse(`App
  Layout
    Header
      Nav
        Item "Home"
        Item "About"
        Item "Contact"
    Main
      Content
        Article
          Title "Welcome"
          Body "Hello World"`)
    expect(ast.instances.length).toBe(1)
    expect(ast.instances[0].children.length).toBe(1)
  })
})

// ============================================================================
// MIXED CONTENT
// ============================================================================

describe('Integration: Mixed Content', () => {
  it('parses tokens + components + instances', () => {
    const ast = parse(`// Tokens
primary: color = #3B82F6

// Components
Card as frame:
  pad 16

// Instances
Card
  Text "Hello"`)
    expect(ast.tokens.length).toBe(1)
    expect(ast.components.length).toBe(1)
    expect(ast.instances.length).toBe(1)
  })

  it('parses realistic button system', () => {
    const ast = parse(`// Colors
primary: color = #3B82F6
danger: color = #EF4444
white: color = #FFFFFF

// Button base
Button as button:
  pad 8 16
  bg primary
  col white
  rad 4
  cursor pointer
  hover:
    bg #2563EB

// Variants
DangerButton extends Button:
  bg danger
  hover:
    bg #DC2626

GhostButton extends Button:
  bg transparent
  col primary
  bor 1 primary

// Usage
Button "Save"
DangerButton "Delete"
GhostButton "Cancel"`)

    expect(ast.tokens.length).toBe(3)
    expect(ast.components.length).toBe(3)
    expect(ast.instances.length).toBe(3)
  })
})

// ============================================================================
// REALISTIC EXAMPLES
// ============================================================================

describe('Integration: Realistic Examples', () => {
  it('parses card component', () => {
    const ast = parse(`Card as frame:
  pad 24
  bg surface
  rad 8
  shadow md

  Title as text:
    font-size 20
    weight bold

  Content as frame:
    pad 16 0

Card
  Title "Welcome"
  Content
    Text "This is the card content"
    Button "OK"`)

    expect(ast.components.length).toBe(1)
    expect(ast.instances.length).toBe(1)
  })

  it('parses form with inputs', () => {
    const ast = parse(`Input as input:
  w full
  pad 12
  bg surface
  rad 4
  bor 1 muted
  focus:
    bor 1 primary

Form as frame:
  ver
  gap 16

Form
  Input named emailInput "Email"
  Input named passwordInput "Password"
  Button "Submit"`)

    expect(ast.components.length).toBe(2)
    expect(ast.instances.length).toBe(1)
    expect(ast.instances[0].children.length).toBe(3)
  })

  it('parses dropdown with keyboard', () => {
    const ast = parse(`Dropdown as frame:
  bg surface
  rad 4
  shadow lg

  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select

Item as frame:
  pad 8 12
  cursor pointer
  highlighted:
    bg hover
  selected:
    bg primary`)

    expect(ast.components.length).toBe(2)
    const dropdown = ast.components.find(c => c.name === 'Dropdown')
    expect(dropdown?.events.length).toBe(4)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Integration: Edge Cases', () => {
  it('handles excessive whitespace', () => {
    const ast = parse(`

Card as frame:


  pad 16



Button "Click"


`)
    expect(ast.components.length).toBe(1)
    expect(ast.instances.length).toBe(1)
  })

  it('handles mixed indentation styles', () => {
    const ast = parse(`Card as frame:
  pad 16
    bg surface`)
    expect(ast.components.length).toBe(1)
  })

  it('handles many siblings', () => {
    const source = `List\n` + Array(50).fill('  Item "x"').join('\n')
    const ast = parse(source)
    expect(ast.instances[0].children.length).toBe(50)
  })
})
