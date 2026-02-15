/**
 * Comprehensive tests for component-parser.ts
 * Covers: parsing basics, named instances, templates, inheritance,
 * inline slots, modifiers, properties, sugar, conditionals, events, children
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

// Helper to parse and get first node
function parseFirst(code: string) {
  const result = parse(code)
  return { node: result.nodes[0], result }
}

// Helper to check for no errors (excluding warnings)
function expectNoErrors(result: ReturnType<typeof parse>) {
  const errors = (result.errors || []).filter(
    (e: { severity?: string } | string) => typeof e === 'string' ? !e.includes('Warning') : e.severity !== 'warning'
  )
  expect(errors).toHaveLength(0)
}

// =============================================================================
// CATEGORY 1: Component Parsing Basics
// =============================================================================

describe('Component Parsing Basics', () => {
  it('parses simple component', () => {
    const { node, result } = parseFirst('Box')
    expectNoErrors(result)
    expect(node?.name).toBe('Box')
  })

  it('parses component with single property', () => {
    const { node, result } = parseFirst('Box pad 8')
    expectNoErrors(result)
    expect(node?.name).toBe('Box')
    expect(node?.properties?.pad).toBe(8)
  })

  it('parses component with multiple properties', () => {
    const { node, result } = parseFirst('Box pad 8 col #FF0000 rad 4')
    expectNoErrors(result)
    expect(node?.properties?.pad).toBe(8)
    expect(node?.properties?.col).toBe('#FF0000')
    expect(node?.properties?.rad).toBe(4)
  })

  it('parses component with string content', () => {
    const { node, result } = parseFirst('Button "Click me"')
    expectNoErrors(result)
    expect(node?.name).toBe('Button')
    // String content is stored in children[0].content (as _text node)
    expect(node?.children?.[0]?.content).toBe('Click me')
  })

  it('parses component with properties and string content', () => {
    const { node, result } = parseFirst('Button pad 12 col #3B82F6 "Submit"')
    expectNoErrors(result)
    expect(node?.properties?.pad).toBe(12)
    // String content is stored in children[0].content (as _text node)
    expect(node?.children?.[0]?.content).toBe('Submit')
  })

  it('normalizes lowercase element name to PascalCase', () => {
    const { node, result } = parseFirst('header hor')
    expectNoErrors(result)
    expect(node?.name).toBe('Header') // Normalizer converts to PascalCase
    expect(node?.properties?.hor).toBe(true)
  })

  it('parses component with dimension shorthand', () => {
    const { node, result } = parseFirst('Box 300 400')
    expectNoErrors(result)
    expect(node?.properties?.w).toBe(300)
    expect(node?.properties?.h).toBe(400)
  })

  it('parses component with single dimension shorthand', () => {
    const { node, result } = parseFirst('Card 200 pad 8')
    expectNoErrors(result)
    expect(node?.properties?.w).toBe(200)
    expect(node?.properties?.pad).toBe(8)
  })

  it('parses explicit definition with colon', () => {
    const { result } = parseFirst('Button: pad 12 col #3B82F6')
    expectNoErrors(result)
    expect(result.registry.has('Button')).toBe(true)
  })

  it('parses component with percentage value', () => {
    const { node, result } = parseFirst('Box w 50%')
    expectNoErrors(result)
    // Percentage is stored as string with % suffix
    expect(node?.properties?.w).toBe('50%')
  })

  it('parses component with full keyword', () => {
    const { node, result } = parseFirst('Box w full')
    expectNoErrors(result)
    expect(node?.properties?.w).toBe('full')
  })

  it('parses component with boolean property', () => {
    const { node, result } = parseFirst('Box hor ver-cen')
    expectNoErrors(result)
    expect(node?.properties?.hor).toBe(true)
    expect(node?.properties?.['ver-cen']).toBe(true)
  })
})

// =============================================================================
// CATEGORY 2: Named Instances
// =============================================================================

describe('Named Instances', () => {
  it('parses Input with instance name - name becomes instance name', () => {
    const { node, result } = parseFirst('Input EmailField "Email"')
    expectNoErrors(result)
    // Parser creates component with instance name, base type in _primitiveType
    expect(node?.name).toBe('EmailField')
    expect(node?.properties?._primitiveType).toBe('Input')
    expect(node?.properties?.placeholder).toBe('Email')
  })

  it('parses Image with instance name - name becomes instance name', () => {
    const { node, result } = parseFirst('Image Avatar "avatar.jpg" 48 48')
    expectNoErrors(result)
    // Instance name becomes the node name
    expect(node?.name).toBe('Avatar')
    expect(node?.properties?._primitiveType).toBe('Image')
    expect(node?.properties?.src).toBe('avatar.jpg')
  })

  it('parses Button with instance name and definition', () => {
    const { result } = parseFirst('Button Submit: pad 12 col #3B82F6 "Login"')
    expectNoErrors(result)
    expect(result.registry.has('Submit')).toBe(true)
  })

  it('parses Textarea with instance name - name becomes instance name', () => {
    const { node, result } = parseFirst('Textarea MessageField "Message" rows 5')
    expectNoErrors(result)
    // Instance name becomes the node name
    expect(node?.name).toBe('MessageField')
    expect(node?.properties?._primitiveType).toBe('Textarea')
  })

  it('parses Link with instance name - name becomes instance name', () => {
    const { node, result } = parseFirst('Link HomeLink "https://home.com"')
    expectNoErrors(result)
    // Instance name becomes the node name
    expect(node?.name).toBe('HomeLink')
    expect(node?.properties?._primitiveType).toBe('Link')
  })

  it('instance definition is registered and can be reused', () => {
    const result = parse(`Input Email: placeholder "Email"
Email`)
    expectNoErrors(result)
    // Template definition + instance usage = 1 node (just the usage)
    // Definition is registered, not added to nodes
    expect(result.registry.has('Email')).toBe(true)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.name).toBe('Email')
  })
})

// =============================================================================
// CATEGORY 3: Template Logic
// =============================================================================

describe('Template Logic', () => {
  it('registers explicit template definition', () => {
    const { result } = parseFirst('Card: ver pad 16 col #1E1E1E rad 12')
    expectNoErrors(result)
    expect(result.registry.has('Card')).toBe(true)
  })

  it('template can be instantiated - merges properties', () => {
    const result = parse(`Card: ver pad 16 rad 12
Card`)
    expectNoErrors(result)
    // Only 1 node: the instance (template def is registered, not emitted)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.name).toBe('Card')
    expect(result.nodes[0]?.properties?.rad).toBe(12)
  })

  it('instance overrides template properties', () => {
    const result = parse(`Card: pad 16 rad 8
Card pad 24`)
    expectNoErrors(result)
    // Only 1 node: the instance with merged + overridden properties
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.properties?.pad).toBe(24)
    expect(result.nodes[0]?.properties?.rad).toBe(8)
  })

  it('template with children is cloned', () => {
    const result = parse(`Card: ver pad 16
  Title: size 18
  Description: size 14

Card
  Title "Hello"`)
    expectNoErrors(result)
    // Only 1 node: the instance
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.children?.length).toBeGreaterThan(0)
  })

  it('scoped template registration', () => {
    const result = parse(`Card: ver
  Header: hor
Card
  Header col #FF0000`)
    expectNoErrors(result)
  })

  it('implicit template on first usage with properties', () => {
    const result = parse(`MyComponent pad 8 col #333
MyComponent`)
    // Both lines create nodes (no explicit : definition)
    expect(result.nodes).toHaveLength(2)
  })
})

// =============================================================================
// CATEGORY 4: Inheritance
// =============================================================================

describe('Inheritance', () => {
  it('parses from keyword for inheritance', () => {
    const result = parse(`Button: pad 12 col #3B82F6
DangerButton from Button: col #EF4444`)
    expectNoErrors(result)
    expect(result.registry.has('DangerButton')).toBe(true)
  })

  it('inherited component has base properties', () => {
    const result = parse(`Button: pad 12 rad 8
SmallButton from Button: pad 8

SmallButton`)
    expectNoErrors(result)
    // Only 1 node: the instance (definitions go to registry)
    expect(result.nodes).toHaveLength(1)
    const instance = result.nodes[0]
    expect(instance?.properties?.rad).toBe(8) // inherited
    expect(instance?.properties?.pad).toBe(8) // overridden
  })

  it('multiple levels of inheritance', () => {
    const result = parse(`Base: pad 8
Level1 from Base: col #333
Level2 from Level1: rad 4

Level2`)
    expectNoErrors(result)
    // Only 1 node: the instance
    expect(result.nodes).toHaveLength(1)
    const instance = result.nodes[0]
    expect(instance?.properties?.pad).toBe(8)
    expect(instance?.properties?.col).toBe('#333')
    expect(instance?.properties?.rad).toBe(4)
  })

  it('inheritance with children', () => {
    const result = parse(`Card: ver pad 16
  Title: size 18

SpecialCard from Card: col #333
  Title col #FFF`)
    expectNoErrors(result)
  })

  it('inherited component can be used as instance', () => {
    const result = parse(`Button: pad 12
GhostButton from Button: col transparent

GhostButton "Click"`)
    expectNoErrors(result)
    // Only 1 node: the instance
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]?.children?.[0]?.content).toBe('Click')
  })
})

// =============================================================================
// CATEGORY 5: Inline Slots
// =============================================================================

describe('Inline Slots', () => {
  it('parses inline child slot', () => {
    const result = parse(`Card: ver
  Title: size 18
  Description: size 14

Card Title "Hello"`)
    expectNoErrors(result)
  })

  it('parses multiple inline slots', () => {
    const result = parse(`Card: ver
  Title: size 18
  Description: size 14

Card Title "Hello" Description "World"`)
    expectNoErrors(result)
  })

  it('inline slot with properties', () => {
    const result = parse(`Card: ver
  Title: size 18

Card Title "Hello" col #FF0000`)
    expectNoErrors(result)
  })

  it('expanded slot syntax', () => {
    const result = parse(`Card: ver
  Title: size 18
  Actions: hor

Card
  Title "Welcome"
  Actions
    Button "Click"`)
    expectNoErrors(result)
  })

  it('flat access to nested slot', () => {
    const result = parse(`Header: hor
  Left: hor
    Logo: w 120

Header
  Logo col #FF0000`)
    expectNoErrors(result)
  })
})

// =============================================================================
// CATEGORY 6: Inline Properties
// =============================================================================

describe('Inline Properties', () => {
  it('parses color property', () => {
    const { node, result } = parseFirst('Box col #3B82F6')
    expectNoErrors(result)
    expect(node?.properties?.col).toBe('#3B82F6')
  })

  it('parses color with alpha', () => {
    const { node, result } = parseFirst('Box col #3B82F680')
    expectNoErrors(result)
    expect(node?.properties?.col).toBe('#3B82F680')
  })

  it('parses short hex color', () => {
    const { node, result } = parseFirst('Box col #FFF')
    expectNoErrors(result)
    expect(node?.properties?.col).toBe('#FFF')
  })

  it('parses token reference', () => {
    const { result } = parseFirst(`$primary: #3B82F6
Box col $primary`)
    expectNoErrors(result)
    expect(result.nodes[0]?.properties?.col).toBe('#3B82F6')
  })

  it('parses padding with direction', () => {
    const { node, result } = parseFirst('Box pad l 16')
    expectNoErrors(result)
    expect(node?.properties?.pad_l).toBe(16)
  })

  it('parses padding with l-r direction', () => {
    const { node, result } = parseFirst('Box pad l-r 16')
    expectNoErrors(result)
    expect(node?.properties?.pad_l).toBe(16)
    expect(node?.properties?.pad_r).toBe(16)
  })

  it('parses border compound property', () => {
    const { node, result } = parseFirst('Card bor 1 solid #333')
    expectNoErrors(result)
    expect(node?.properties?.bor_width).toBe(1)
  })

  it('parses radius with 4 values', () => {
    const { node, result } = parseFirst('Card rad 8 8 0 0')
    expectNoErrors(result)
    expect(node?.properties?.rad_tl).toBe(8)
    expect(node?.properties?.rad_tr).toBe(8)
    expect(node?.properties?.rad_br).toBe(0)
    expect(node?.properties?.rad_bl).toBe(0)
  })

  it('parses string property value', () => {
    const { node, result } = parseFirst('Box font "Inter"')
    expectNoErrors(result)
    expect(node?.properties?.font).toBe('Inter')
  })

  it('parses shadow property as boolean flag', () => {
    // Note: shadow with quoted string is treated as boolean flag
    // Complex shadow values should use the style system
    const { node, result } = parseFirst('Card shadow')
    expectNoErrors(result)
    expect(node?.properties?.shadow).toBe(true)
  })
})

// =============================================================================
// CATEGORY 8: Sugar System
// =============================================================================

describe('Sugar System', () => {
  it('Image string becomes src', () => {
    const { node, result } = parseFirst('Image "photo.jpg"')
    expectNoErrors(result)
    expect(node?.properties?.src).toBe('photo.jpg')
  })

  it('Image with dimensions after string', () => {
    const { node, result } = parseFirst('Image "photo.jpg" 200 150')
    expectNoErrors(result)
    expect(node?.properties?.src).toBe('photo.jpg')
    expect(node?.properties?.w).toBe(200)
    expect(node?.properties?.h).toBe(150)
  })

  it('Input string becomes placeholder', () => {
    const { node, result } = parseFirst('Input "Enter email..."')
    expectNoErrors(result)
    expect(node?.properties?.placeholder).toBe('Enter email...')
  })

  it('Link string becomes href', () => {
    const { node, result } = parseFirst('Link "https://example.com"')
    expectNoErrors(result)
    expect(node?.properties?.href).toBe('https://example.com')
  })

  it('Button string becomes text content', () => {
    const { node, result } = parseFirst('Button "Click"')
    expectNoErrors(result)
    // Text is stored in children[0].content (as _text node)
    expect(node?.children?.[0]?.content).toBe('Click')
  })

  it('first number becomes width', () => {
    const { node, result } = parseFirst('Box 300')
    expectNoErrors(result)
    expect(node?.properties?.w).toBe(300)
  })

  it('two numbers become width and height', () => {
    const { node, result } = parseFirst('Box 300 200')
    expectNoErrors(result)
    expect(node?.properties?.w).toBe(300)
    expect(node?.properties?.h).toBe(200)
  })
})

// =============================================================================
// CATEGORY 9: Inline Conditionals
// =============================================================================

describe('Inline Conditionals', () => {
  it('parses simple inline conditional', () => {
    const result = parse(`$active: true
Button if $active then col #3B82F6 else col #333`)
    expectNoErrors(result)
    expect(result.nodes[0]?.conditionalProperties).toBeDefined()
  })

  it('parses conditional with multiple then properties', () => {
    const result = parse(`$selected: true
Card if $selected then col #3B82F6 bor 2 else col #1A1A1A bor 0`)
    expectNoErrors(result)
  })

  it('parses conditional with comparison operator', () => {
    const result = parse(`$count: 5
Button if $count > 0 then opacity 1 else opacity 0.5`)
    expectNoErrors(result)
  })

  it('parses conditional with and operator', () => {
    const result = parse(`$count: 5
$enabled: true
Button if $count > 0 and $enabled then opacity 1 else opacity 0.5`)
    expectNoErrors(result)
  })

  it('parses conditional with or operator', () => {
    const result = parse(`$a: true
$b: false
Box if $a or $b then col #00FF00 else col #FF0000`)
    expectNoErrors(result)
  })
})

// =============================================================================
// CATEGORY 10: Event Handlers
// =============================================================================

describe('Event Handlers', () => {
  it('parses onclick toggle', () => {
    const { node: _node, result } = parseFirst('Button onclick toggle "Toggle"')
    expectNoErrors(result)
    expect(_node?.eventHandlers?.length).toBeGreaterThan(0)
  })

  it('parses onclick open with target', () => {
    const { node, result } = parseFirst('Button onclick open Dialog "Open"')
    expectNoErrors(result)
    expect(node?.eventHandlers?.[0]?.actions?.[0]?.type).toBe('open')
  })

  it('parses onclick close', () => {
    const { result } = parseFirst('Button onclick close "Cancel"')
    expectNoErrors(result)
  })

  it('parses onclick with animation', () => {
    const { result } = parseFirst('Button onclick open Dialog slide-up 300 "Open"')
    expectNoErrors(result)
  })

  it('parses onclick page navigation', () => {
    const { node, result } = parseFirst('Button onclick page Home "Go Home"')
    expectNoErrors(result)
    expect(node?.eventHandlers?.[0]?.actions?.[0]?.type).toBe('page')
  })

  it('parses onclick assign', () => {
    const result = parse(`$count: 0
Button onclick assign $count to $count + 1 "+"`)
    expectNoErrors(result)
  })

  it('parses onclick show', () => {
    const { result } = parseFirst('Button onclick show Tooltip "Info"')
    expectNoErrors(result)
  })

  it('parses onclick hide', () => {
    const { result } = parseFirst('Button onclick hide Tooltip "Hide"')
    expectNoErrors(result)
  })

  it('parses conditional action', () => {
    const result = parse(`$isLoggedIn: true
Button onclick if $isLoggedIn page Dashboard else open LoginDialog "Go"`)
    expectNoErrors(result)
  })

  it('parses onchange event', () => {
    const result = parse(`$text: ""
Input onchange assign $text to $event.value "Enter text"`)
    expectNoErrors(result)
  })
})

// =============================================================================
// CATEGORY 11: Child Components
// =============================================================================

describe('Child Components', () => {
  it('parses child component', () => {
    const result = parse(`Box
  Card`)
    expectNoErrors(result)
    expect(result.nodes[0]?.children).toHaveLength(1)
    expect(result.nodes[0]?.children?.[0]?.name).toBe('Card')
  })

  it('parses multiple children', () => {
    const result = parse(`Box ver gap 8
  Card
  Card
  Card`)
    expectNoErrors(result)
    expect(result.nodes[0]?.children).toHaveLength(3)
  })

  it('parses nested children', () => {
    const result = parse(`Box
  Card
    Title "Hello"`)
    expectNoErrors(result)
    expect(result.nodes[0]?.children?.[0]?.children).toHaveLength(1)
  })

  it('parses list items with dash prefix', () => {
    const result = parse(`Menu: ver
  Item: pad 8

Menu
  - Item "One"
  - Item "Two"
  - Item "Three"`)
    expectNoErrors(result)
  })

  it('parses child with properties', () => {
    const result = parse(`Box
  Card pad 16 col #333`)
    expectNoErrors(result)
    expect(result.nodes[0]?.children?.[0]?.properties?.pad).toBe(16)
  })

  it('parses string child content', () => {
    const result = parse(`Box
  "Hello World"`)
    expectNoErrors(result)
    // String children are stored with content property (as _text node)
    expect(result.nodes[0]?.children?.[0]?.content).toBe('Hello World')
  })

  it('child modifies template slot', () => {
    const result = parse(`Card: ver
  Title: size 18

Card
  Title "Custom Title" col #FF0000`)
    expectNoErrors(result)
  })
})

// =============================================================================
// CATEGORY 12: Edge Cases & Error Handling
// =============================================================================

describe('Edge Cases & Error Handling', () => {
  it('handles empty component', () => {
    const { node } = parseFirst('Box')
    expect(node?.name).toBe('Box')
  })

  it('handles deeply nested structure', () => {
    const result = parse(`Box
  Card
    Header
      Title "Deep"`)
    expectNoErrors(result)
  })

  it('handles component with all features', () => {
    const result = parse(`$active: true
Button: pad 12 col #3B82F6 rad 8
Button if $active then opacity 1 else opacity 0.5 onclick toggle "Full Featured"`)
    expectNoErrors(result)
  })

  it('handles multiple token definitions', () => {
    const result = parse(`$primary: #3B82F6
$secondary: #64748B
$spacing: 16
$radius: 8

Card col $primary pad $spacing rad $radius`)
    expectNoErrors(result)
    expect(result.nodes[0]?.properties?.col).toBe('#3B82F6')
    expect(result.nodes[0]?.properties?.pad).toBe(16)
    expect(result.nodes[0]?.properties?.rad).toBe(8)
  })

  it('component dot notation creates scoped instance name', () => {
    // Button Card.rad: Button is base type, Card.rad becomes instance name
    const result = parse(`Card: rad 16 col #2A2A3E
Button Card.rad`)
    expectNoErrors(result)
    // Card.rad becomes the node name (instance name)
    expect(result.nodes[0]?.name).toBe('Card.rad')
    expect(result.nodes[0]?.properties?._primitiveType).toBe('Button')
  })

  it('handles inline comments', () => {
    const result = parse(`Box pad 8 // This is a comment
Card col #333 // Another comment`)
    expectNoErrors(result)
    expect(result.nodes).toHaveLength(2)
  })

  it('handles mixed content', () => {
    const result = parse(`Box ver gap 8
  "Text content"
  Card
  "More text"`)
    expectNoErrors(result)
  })

  it('undefined tokens result in omitted property', () => {
    const result = parse('Box col $undefined')
    // Parser drops properties with undefined token values
    expect(result.nodes[0]?.properties?.col).toBeUndefined()
  })

  it('handles state definitions', () => {
    const result = parse(`Toggle: w 52 h 28
  state off
    col #333
  state on
    col #3B82F6`)
    expectNoErrors(result)
    // States are stored in the registry entry, not on the node
    const toggleDef = result.registry.get('Toggle')
    expect(toggleDef?.states).toBeDefined()
    expect(toggleDef?.states).toHaveLength(2)
    expect(toggleDef?.states?.[0]?.name).toBe('off')
    expect(toggleDef?.states?.[1]?.name).toBe('on')
  })

  it('handles animation in child', () => {
    const result = parse(`Box icon "loader"
  animate spin 1000`)
    expectNoErrors(result)
  })
})

// =============================================================================
// CATEGORY 13: Block Conditionals
// =============================================================================

describe('Block Conditionals', () => {
  it('parses simple if block', () => {
    const result = parse(`$show: true
Box
  if $show
    Card`)
    expectNoErrors(result)
  })

  it('parses if-else block', () => {
    const result = parse(`$loggedIn: false
Box
  if $loggedIn
    Avatar
  else
    Button "Login"`)
    expectNoErrors(result)
  })

  it('parses nested if blocks', () => {
    const result = parse(`$user: true
$admin: true
Box
  if $user
    if $admin
      AdminPanel
    else
      UserPanel`)
    expectNoErrors(result)
  })

  it('parses if with and operator', () => {
    const result = parse(`$a: true
$b: true
Box
  if $a and $b
    Text "Both true"`)
    expectNoErrors(result)
  })

  it('parses if with or operator', () => {
    const result = parse(`$a: true
$b: false
Box
  if $a or $b
    Text "At least one"`)
    expectNoErrors(result)
  })
})

// =============================================================================
// CATEGORY 14: Iterators
// =============================================================================

describe('Iterators', () => {
  it('parses each loop', () => {
    const result = parse(`$items: []
Box
  each $item in $items
    Card`)
    expectNoErrors(result)
  })

  it('parses each with property access', () => {
    const result = parse(`$tasks: []
Box
  each $task in $tasks
    Card
      Label $task.title`)
    expectNoErrors(result)
  })

  it('parses nested each loops', () => {
    const result = parse(`$categories: []
Box
  each $cat in $categories
    Section
      each $item in $cat.items
        Item`)
    expectNoErrors(result)
  })
})
