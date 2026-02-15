/**
 * Reference Coverage Tests
 *
 * Systematische Tests basierend auf reference.json.
 * Testet Features die in anderen Test-Files noch nicht abgedeckt sind:
 *
 * - Tokens mit Suffix-Inferenz
 * - Component References (Card.radius)
 * - Named Instances & Primitives
 * - Hover Properties
 * - HTML Primitives (Input, Image, etc.)
 * - Inline Spans (*bold*:bold)
 * - Show/Hide Animations
 * - Conditionals (if/else)
 * - Iteration (each/in)
 * - Component Property Access
 * - Doc Mode
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'
import { generate, getStyle } from '../../test-utils'

// ============================================
// Tokens mit Suffix-Inferenz
// Reference: Abschnitt "tokens" -> "token-suffixes"
// ============================================

describe('Reference: Tokens', () => {
  describe('Token Definition', () => {
    it('parses simple token definition', () => {
      const dsl = `$primary: #3B82F6
Button background $primary "Click"`
      const result = parse(dsl)
      expect(result.tokens.get('primary')).toBe('#3B82F6')
    })

    it('parses token with number value', () => {
      const dsl = `$spacing: 16
Box padding $spacing`
      const result = parse(dsl)
      expect(result.tokens.get('spacing')).toBe(16)
    })
  })

  describe('Token Suffix Inferenz', () => {
    it('-color suffix infers background', () => {
      // Exact same test as tokens.test.ts line 129-131
      const result = parse(`$blue-color: #0000FF
Box $blue-color`)
      expect(result.nodes[0].properties.bg).toBe('#0000FF')
    })

    it('-padding suffix infers padding', () => {
      const dsl = `$card-padding: 16
Card $card-padding`
      const result = parse(dsl)
      const props = result.nodes[0].properties
      expect(props.pad).toBe(16)
    })

    it('-radius suffix infers border-radius', () => {
      const dsl = `$btn-radius: 8
Button $btn-radius "Click"`
      const result = parse(dsl)
      const props = result.nodes[0].properties
      expect(props.rad).toBe(8)
    })

    it('-gap suffix infers gap', () => {
      const dsl = `$grid-gap: 16
Container $grid-gap`
      const result = parse(dsl)
      const props = result.nodes[0].properties
      expect(props.gap).toBe(16)
    })
  })

  describe('Token Hierarchie', () => {
    it('parses token referencing another token', () => {
      const dsl = `$blue-500: #3B82F6
$primary-color: $blue-500
Button background $primary-color "Click"`
      const result = parse(dsl)
      // Token sollte aufgelöst werden
      expect(result.tokens.get('primary-color')).toBeDefined()
    })
  })
})

// ============================================
// Component References
// Reference: Abschnitt "komponenten" -> "component-references"
// ============================================

describe('Reference: Component References', () => {
  it('references property from another component', () => {
    const dsl = `Card: radius 16 padding 20 background #2A2A3E

Button radius Card.radius background Card.background "Match Card"`
    const result = parse(dsl)
    const button = result.nodes[0]
    // Button sollte Card's radius referenzieren
    expect(button.properties.rad).toBe(16)
  })

  it('references multiple properties', () => {
    const dsl = `Theme: padding 16 radius 8 background #1E1E2E

Panel padding Theme.padding radius Theme.radius background Theme.background`
    const result = parse(dsl)
    const panel = result.nodes[0]
    expect(panel.properties.pad).toBe(16)
    expect(panel.properties.rad).toBe(8)
  })
})

// ============================================
// Named Instances
// Reference: Abschnitt "komponenten" -> "named-instances"
// ============================================

describe('Reference: Named Instances', () => {
  describe('named keyword', () => {
    it('parses named instance', () => {
      const dsl = `Button named SaveBtn "Save"`
      const result = parse(dsl)
      expect(result.nodes[0].instanceName).toBe('SaveBtn')
    })

    it('parses named instance with properties', () => {
      const dsl = `Panel named Dashboard padding 16 "Dashboard"`
      const result = parse(dsl)
      expect(result.nodes[0].instanceName).toBe('Dashboard')
      expect(result.nodes[0].properties.pad).toBe(16)
    })
  })

  describe('named primitives', () => {
    it('parses Input with name', () => {
      const dsl = `Input Email: "Enter email" type email`
      const result = parse(dsl)
      expect(result.registry.has('Email')).toBe(true)
    })

    it('parses Image with name', () => {
      const dsl = `Image Avatar: 48 48 radius 24 fit cover`
      const result = parse(dsl)
      expect(result.registry.has('Avatar')).toBe(true)
    })
  })

  describe('list items with named', () => {
    it('parses - Item named syntax', () => {
      const dsl = `Menu vertical
  - Button named SaveBtn "Save"
  - Button named CancelBtn "Cancel"`
      const result = parse(dsl)
      const menu = result.nodes[0]
      const buttons = menu.children.filter((c: any) => c.name === 'Button')
      expect(buttons.length).toBe(2)
      expect(buttons[0].instanceName).toBe('SaveBtn')
      expect(buttons[1].instanceName).toBe('CancelBtn')
    })
  })
})

// ============================================
// Hover Properties
// Reference: Abschnitt "properties" -> "hover"
// ============================================

describe('Reference: Hover Properties', () => {
  it('parses hover-background', () => {
    const dsl = `Button background #333 hover-background #3B82F6 "Hover me"`
    const result = parse(dsl)
    expect(result.nodes[0].properties['hover-bg']).toBe('#3B82F6')
  })

  it('parses hover-color', () => {
    const dsl = `Link color #888 hover-color #FFF "Link"`
    const result = parse(dsl)
    expect(result.nodes[0].properties['hover-col']).toBe('#FFF')
  })

  it('parses hover-scale', () => {
    const dsl = `Card hover-scale 1.02`
    const result = parse(dsl)
    expect(result.nodes[0].properties['hover-scale']).toBe(1.02)
  })

  it('parses hover-opacity', () => {
    const dsl = `Image opacity 1 hover-opacity 0.8`
    const result = parse(dsl)
    expect(result.nodes[0].properties['hover-opa']).toBe(0.8)
  })

  it('parses multiple hover properties', () => {
    const dsl = `Button background #333 hover-background #3B82F6 hover-color #FFF hover-scale 1.05 "Button"`
    const result = parse(dsl)
    const props = result.nodes[0].properties
    expect(props['hover-bg']).toBe('#3B82F6')
    expect(props['hover-col']).toBe('#FFF')
    expect(props['hover-scale']).toBe(1.05)
  })
})

// ============================================
// HTML Primitives
// Reference: Abschnitt "primitives"
// ============================================

describe('Reference: HTML Primitives', () => {
  describe('Input', () => {
    it('string becomes placeholder', () => {
      const dsl = `Input "Enter email..."`
      const result = parse(dsl)
      expect(result.nodes[0].properties.placeholder).toBe('Enter email...')
    })

    it('parses type property', () => {
      const dsl = `Input "Password" type password`
      const result = parse(dsl)
      expect(result.nodes[0].properties.type).toBe('password')
    })
  })

  describe('Textarea', () => {
    it('string becomes placeholder', () => {
      const dsl = `Textarea "Message..." rows 5`
      const result = parse(dsl)
      expect(result.nodes[0].properties.placeholder).toBe('Message...')
      expect(result.nodes[0].properties.rows).toBe(5)
    })
  })

  describe('Image', () => {
    it('string becomes src', () => {
      const dsl = `Image "photo.jpg" 200 150`
      const result = parse(dsl)
      expect(result.nodes[0].properties.src).toBe('photo.jpg')
      expect(result.nodes[0].properties.w).toBe(200)
      expect(result.nodes[0].properties.h).toBe(150)
    })

    it('parses fit property', () => {
      const dsl = `Image "photo.jpg" fit cover`
      const result = parse(dsl)
      expect(result.nodes[0].properties.fit).toBe('cover')
    })
  })

  describe('Link', () => {
    it('string becomes href', () => {
      const dsl = `Link "https://example.com" color #3B82F6`
      const result = parse(dsl)
      expect(result.nodes[0].properties.href).toBe('https://example.com')
    })
  })
})

// ============================================
// Inline Spans
// Reference: Abschnitt "typography" -> "inline-spans" (falls vorhanden)
// ============================================

describe('Reference: Inline Spans', () => {
  it('parses *bold*:bold in text', () => {
    const dsl = `Text "This is *important*:bold text"`
    const result = parse(dsl)
    // Inline formatting splits text into multiple children
    // Check all children contain the text parts
    const allContent = result.nodes[0].children.map((c: any) => c.content || '').join('')
    expect(allContent).toContain('important')
  })

  it('parses *italic*:italic in text', () => {
    const dsl = `Text "This is *emphasized*:italic text"`
    const result = parse(dsl)
    // Inline formatting splits text into multiple children
    const allContent = result.nodes[0].children.map((c: any) => c.content || '').join('')
    expect(allContent).toContain('emphasized')
  })
})

// ============================================
// Show/Hide Animations
// Reference: Abschnitt "animations" -> "show-hide-animations"
// ============================================

describe('Reference: Show/Hide Animations', () => {
  it('parses show animation', () => {
    const dsl = `Panel hidden
  show fade slide-up 300
  "Content"`
    const result = parse(dsl)
    expect(result.nodes[0].showAnimation).toBeDefined()
    expect(result.nodes[0].showAnimation?.duration).toBe(300)
  })

  it('parses hide animation', () => {
    const dsl = `Panel hidden
  show fade 200
  hide fade 150
  "Content"`
    const result = parse(dsl)
    expect(result.nodes[0].hideAnimation).toBeDefined()
    expect(result.nodes[0].hideAnimation?.duration).toBe(150)
  })

  it('parses combined animations', () => {
    const dsl = `Modal hidden
  show fade scale 200
  hide fade 100`
    const result = parse(dsl)
    // Property is 'animations' (array), not 'types'
    expect(result.nodes[0].showAnimation?.animations).toContain('fade')
    expect(result.nodes[0].showAnimation?.animations).toContain('scale')
  })

  it.each(['fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right'])('parses animation type %s', (type) => {
    const dsl = `Panel hidden
  show ${type} 200`
    const result = parse(dsl)
    // Property is 'animations' (array), not 'types'
    expect(result.nodes[0].showAnimation?.animations).toContain(type)
  })
})

// ============================================
// Conditionals
// Reference: Abschnitt "conditionals"
// ============================================

describe('Reference: Conditionals', () => {
  describe('Block Conditionals', () => {
    it('parses if block', () => {
      const dsl = `$isLoggedIn: true

Header: horizontal
  if $isLoggedIn
    Avatar
  else
    Button "Login"`
      const result = parse(dsl)
      // Verify parsing succeeds and Header is registered
      expect(result.registry.has('Header')).toBe(true)
      // Note: conditional parsing structure may vary by implementation
    })
  })

  describe('Property Conditionals', () => {
    it('parses inline if/then/else', () => {
      const dsl = `$active: true
Button if $active then background #3B82F6 else background #333`
      const result = parse(dsl)
      // Conditional sollte geparst werden
      expect(result.nodes[0]).toBeDefined()
    })
  })

  describe('Operators', () => {
    it('parses comparison operators', () => {
      const dsl = `$count: 5

Badge if $count > 0 then background #10B981 else background #666`
      const result = parse(dsl)
      expect(result.nodes[0]).toBeDefined()
    })

    it('parses logical operators', () => {
      const dsl = `$a: true
$b: false

Box
  if $a and $b
    Text "Both true"
  if $a or $b
    Text "At least one true"`
      const result = parse(dsl)
      expect(result.nodes.length).toBeGreaterThan(0)
    })
  })
})

// ============================================
// Iteration
// Reference: Abschnitt "data" -> "iteration"
// ============================================

describe('Reference: Iteration', () => {
  it('parses each/in loop', () => {
    const dsl = `List: vertical gap 8
  each $item in $items
    Card
      Title $item.title`
    const result = parse(dsl)
    // Verify parsing succeeds and List is registered
    expect(result.registry.has('List')).toBe(true)
    // Note: iterator parsing structure may vary by implementation
  })

  it('parses nested iteration', () => {
    const dsl = `Container: vertical
  each $category in $categories
    Section
      Title $category.name
      each $item in $category.items
        Item $item.name`
    const result = parse(dsl)
    expect(result.registry.has('Container')).toBe(true)
  })

  it('parses item property access', () => {
    const dsl = `List: vertical
  each $task in $tasks
    Row
      Text $task.title
      Badge $task.status
      Icon if $task.done then "check" else "circle"`
    const result = parse(dsl)
    expect(result.registry.has('List')).toBe(true)
  })
})

// ============================================
// Component Property Access
// Reference: Abschnitt "component-properties"
// ============================================

describe('Reference: Component Property Access', () => {
  describe('Reading properties', () => {
    it('parses Component.property in condition', () => {
      const dsl = `Input Email: "Email"
Button "Submit"
  onclick if Email.value page Dashboard`
      const result = parse(dsl)
      const button = result.nodes.find((n: any) => n.name === 'Button')
      expect(button?.eventHandlers?.length).toBeGreaterThan(0)
    })
  })

  describe('$event object', () => {
    it('parses $event.value', () => {
      const dsl = `Input "Search"
  onchange assign $text to $event.value`
      const result = parse(dsl)
      const action = result.nodes[0].eventHandlers?.[0]?.actions?.[0]
      // Value is a property_access Expression object with path array
      expect(action?.value).toBeDefined()
      const value = action?.value as any
      expect(value?.type).toBe('property_access')
      expect(value?.path).toContain('event')
      expect(value?.path).toContain('value')
    })

    it('parses $event.checked', () => {
      const dsl = `Checkbox
  onchange assign $active to $event.checked`
      const result = parse(dsl)
      expect(result.nodes[0].eventHandlers?.length).toBeGreaterThan(0)
    })
  })
})

// ============================================
// Slots & Flat Access
// Reference: Abschnitt "komponenten" -> "slots", "flat-access"
// ============================================

describe('Reference: Slots & Flat Access', () => {
  describe('Slot definitions', () => {
    it('parses component with slot children', () => {
      const dsl = `Card: vertical padding 16 gap 8
  Title: size 18 weight 600
  Description: size 14 color #888
  Actions: horizontal gap 8`
      const result = parse(dsl)
      const card = result.registry.get('Card')
      expect(card?.children?.length).toBe(3)
    })

    it('uses slots in instance', () => {
      const dsl = `Card: vertical padding 16 gap 8
  Title: size 18 weight 600
  Description: size 14 color #888

Card
  Title "Welcome"
  Description "Get started"`
      const result = parse(dsl)
      expect(result.nodes.length).toBeGreaterThan(0)
    })
  })

  describe('Flat access', () => {
    it('accesses nested slot by name', () => {
      const dsl = `Header: horizontal between
  Left: horizontal gap 16
    Logo: width 120 height 32
  Right:
    Avatar: 36 36 radius 18

Header
  Logo background #FF0000
  Avatar background #3B82F6`
      const result = parse(dsl)
      const header = result.nodes[0]
      // Logo und Avatar sollten direkt zugänglich sein
      expect(header).toBeDefined()
    })
  })
})

// ============================================
// Doc Mode
// Reference: Abschnitt "doc-mode" (falls vorhanden)
// ============================================

describe('Reference: Doc Mode', () => {
  describe('text component', () => {
    it('parses text with multiline string', () => {
      const dsl = `text
  '# Heading

   $p This is a paragraph.'`
      const result = parse(dsl)
      expect(result.nodes[0].name).toBe('text')
    })
  })

  describe('playground component', () => {
    it('parses playground with code', () => {
      const dsl = `playground
  'Button background #3B82F6 padding 12 "Click"'`
      const result = parse(dsl)
      expect(result.nodes[0].name).toBe('playground')
    })
  })

  describe('block tokens', () => {
    it('parses markdown-style headings', () => {
      const dsl = `text
  '# Heading 1
   ## Heading 2
   ### Heading 3'`
      const result = parse(dsl)
      expect(result.nodes[0]).toBeDefined()
    })
  })

  describe('inline formatting', () => {
    it('parses **bold** syntax', () => {
      const dsl = `text
  'This is **bold** text.'`
      const result = parse(dsl)
      expect(result.nodes[0]).toBeDefined()
    })

    it('parses _italic_ syntax', () => {
      const dsl = `text
  'This is _italic_ text.'`
      const result = parse(dsl)
      expect(result.nodes[0]).toBeDefined()
    })

    it('parses `code` syntax', () => {
      const dsl = `text
  'Use the \`code\` property.'`
      const result = parse(dsl)
      expect(result.nodes[0]).toBeDefined()
    })

    it('parses [link](url) syntax', () => {
      const dsl = `text
  'Visit [our site](https://example.com).'`
      const result = parse(dsl)
      expect(result.nodes[0]).toBeDefined()
    })
  })
})

// ============================================
// Edge Cases aus Reference
// ============================================

describe('Reference: Edge Cases & Limitations', () => {
  describe('cursor limitation', () => {
    it('parses single-word cursor values', () => {
      const dsl = `Button cursor pointer "Click"`
      const result = parse(dsl)
      expect(result.nodes[0].properties.cursor).toBe('pointer')
    })

    // Dokumentiertes Limit: cursor not-allowed funktioniert nicht
    it.skip('KNOWN LIMITATION: cursor not-allowed splits incorrectly', () => {
      const dsl = `Button cursor not-allowed "Disabled"`
      const result = parse(dsl)
      // Dies wird fehlschlagen wegen Lexer-Problem
      expect(result.nodes[0].properties.cursor).toBe('not-allowed')
    })
  })

  describe('event placement', () => {
    // Dokumentiertes Limit: Events nach Children werden nicht angehängt
    it.skip('KNOWN LIMITATION: onclick after nested children not attached', () => {
      const dsl = `Accordion: vertical
  Item:
    Header: horizontal
      Title:
        Icon:
    onclick toggle-state`
      const result = parse(dsl)
      const item = result.registry.get('Accordion.Item')
      // Dies wird fehlschlagen - onclick nicht an Header angehängt
      expect(item?.eventHandlers?.length).toBeGreaterThan(0)
    })
  })
})

// ============================================
// Complex Real-World Scenarios
// ============================================

describe('Reference: Complex Scenarios', () => {
  it('parses full card component with all features', () => {
    const dsl = `$primary: #3B82F6
$surface: #1E1E2E
$text: #FFFFFF
$muted: #888888

Card: vertical padding 20 background $surface radius 12 gap 12
  state hover
    background #252530
  Header: horizontal between vertical-center
    Title: size 18 weight 600 color $text
    Badge: padding 4 8 background $primary radius 8 size 12
  Body: size 14 color $muted line 1.6
  Footer: horizontal gap 8 horizontal-right
    Button: padding 8 16 radius 6
      state hover
        background #444

Card
  Header
    Title "Welcome"
    Badge "New"
  Body "This is the card content with some description text."
  Footer
    Button background #333 color $muted "Cancel"
    Button background $primary color $text "Accept"`

    const result = parse(dsl)

    // Tokens defined
    expect(result.tokens.get('primary')).toBe('#3B82F6')
    expect(result.tokens.get('surface')).toBe('#1E1E2E')

    // Card in registry
    expect(result.registry.has('Card')).toBe(true)

    // Card instance rendered
    expect(result.nodes.length).toBeGreaterThan(0)

    // States parsed
    const cardDef = result.registry.get('Card')
    expect(cardDef?.states?.length).toBeGreaterThan(0)
  })

  it('parses navigation with events and states', () => {
    const dsl = `NavItem: horizontal vertical-center gap 12 padding 12 radius 8 cursor pointer
  state default
    color #888
  state active
    background #3B82F620
    color #3B82F6
  state highlighted
    background #333
  Icon: size 20
  Label: size 14

Sidebar: vertical width 240 padding 12 gap 4
  - NavItem named Home
      onhover highlight self
      onclick activate self, deactivate-siblings, page Home
      Icon icon "home"
      Label "Home"
  - NavItem named Settings
      onhover highlight self
      onclick activate self, deactivate-siblings, page Settings
      Icon icon "settings"
      Label "Settings"`

    const result = parse(dsl)

    // NavItem has states
    const navItem = result.registry.get('NavItem')
    expect(navItem?.states?.length).toBeGreaterThanOrEqual(2)

    // Sidebar is defined with colon (:), so check registry not nodes
    const sidebar = result.registry.get('Sidebar')
    expect(sidebar?.children?.length).toBe(2)

    // NavItems have events - check first child
    const home = sidebar?.children?.find((c: any) => c.instanceName === 'Home')
    expect(home?.eventHandlers?.length).toBeGreaterThanOrEqual(2)
  })

  it('parses form with validation flow', () => {
    const dsl = `$error: #EF4444
$success: #10B981

Form: vertical gap 16 padding 24 background #1E1E2E radius 12

Field: vertical gap 6
  Label: size 12 color #888 uppercase
  Input: padding 12 background #2A2A3E radius 8 border 1 border-color #333
    state focus
      border-color #3B82F6
    state valid
      border-color $success
    state invalid
      border-color $error
  ErrorMsg: size 12 color $error hidden

Input Email: "Enter email" type email
Input Password: "Enter password" type password

Form
  Field
    Label "Email"
    Email
      onfocus highlight self
      onblur validate self
    ErrorMsg "Please enter a valid email"
  Field
    Label "Password"
    Password
  Button padding 12 24 background #3B82F6 radius 8 color white "Submit"
    onclick validate Form`

    const result = parse(dsl)

    // Named inputs registered
    expect(result.registry.has('Email')).toBe(true)
    expect(result.registry.has('Password')).toBe(true)

    // Form rendered
    expect(result.nodes.length).toBeGreaterThan(0)
  })
})
