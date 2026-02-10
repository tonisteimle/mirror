/**
 * Documentation Concepts Test Suite
 *
 * Tests all language features documented in concepts.html
 * Verifies DSL code translates correctly to React/CSS
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'
import { generateReactElement } from '../generator/react-generator'
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

function getProps(node: React.ReactNode): Record<string, unknown> {
  if (React.isValidElement(node)) {
    return node.props as Record<string, unknown>
  }
  return {}
}

function getChildren(node: React.ReactNode): React.ReactNode[] {
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children
    if (Array.isArray(children)) return children
    if (children) return [children]
  }
  return []
}

// Helper to extract text content from nested React elements
function getTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (node === null || node === undefined) return ''
  if (Array.isArray(node)) {
    return node.map(getTextContent).join('')
  }
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode }).children
    return getTextContent(children)
  }
  return ''
}

function generate(dsl: string): React.ReactNode {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)
  return Array.isArray(elements) ? elements[0] : elements
}

function generateAll(dsl: string): React.ReactNode[] {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)
  return Array.isArray(elements) ? elements : [elements]
}

// ============================================================================
// KONZEPT 1: Alles ist eine Komponente
// ============================================================================

describe('Konzept 1: Alles ist eine Komponente', () => {
  describe('Inline-Verwendung', () => {
    it('rendert eine Komponente mit Content', () => {
      const element = generate('Button "Click me"')
      const props = getProps(element)
      expect(props.className).toBe('Button')
      expect(getTextContent(element)).toContain('Click me')
    })

    it('rendert eine Komponente mit Properties', () => {
      const element = generate('Button pad 12 col #3B82F6 "Click"')
      const style = getStyle(element)
      expect(style.padding).toBe('12px')
      expect(style.backgroundColor).toBe('#3B82F6')
    })
  })

  describe('Explizite Definition mit :', () => {
    it('Definition mit : rendert nicht direkt', () => {
      const result = parse('Button: pad 12 col #3B82F6')
      // Keine Nodes zum Rendern, nur Registry
      expect(result.nodes.length).toBe(0)
      expect(result.registry.has('Button')).toBe(true)
    })

    it('Nach Definition ist Komponente wiederverwendbar', () => {
      const dsl = `Button: pad 12 col #3B82F6 rad 8

Button "Save"
Button "Cancel"
Button "Delete"`

      const result = parse(dsl)
      expect(result.nodes.length).toBe(3)

      const elements = generateAll(dsl)
      elements.forEach(el => {
        const style = getStyle(el)
        expect(style.padding).toBe('12px')
        expect(style.backgroundColor).toBe('#3B82F6')
        expect(style.borderRadius).toBe('8px')
      })
    })
  })
})

// ============================================================================
// KONZEPT 2: Einrückung = Struktur
// ============================================================================

describe('Konzept 2: Einrückung = Struktur', () => {
  it('2 Spaces = ein Level tiefer', () => {
    const dsl = `Card
  Title "Hello"
  Body "World"`

    const result = parse(dsl)
    expect(result.nodes[0].children.length).toBe(2)
    expect(result.nodes[0].children[0].name).toBe('Title')
    expect(result.nodes[0].children[1].name).toBe('Body')
  })

  it('Tiefe Verschachtelung', () => {
    const dsl = `App
  Header
    Logo
    Nav
  Main
    Sidebar
    Content
      Article
  Footer`

    const result = parse(dsl)
    const app = result.nodes[0]

    expect(app.children.length).toBe(3) // Header, Main, Footer
    expect(app.children[0].name).toBe('Header')
    expect(app.children[0].children.length).toBe(2) // Logo, Nav
    expect(app.children[1].name).toBe('Main')
    expect(app.children[1].children.length).toBe(2) // Sidebar, Content
    expect(app.children[1].children[1].children.length).toBe(1) // Article
  })

  it('Kinder werden zu React-Children', () => {
    const dsl = `Card
  Title "Hello"
  Body "World"`

    const element = generate(dsl)
    const children = getChildren(element)
    // Mindestens 2 Kinder (Title, Body)
    expect(children.length).toBeGreaterThanOrEqual(2)
  })
})

// ============================================================================
// KONZEPT 3: Typinferenz
// ============================================================================

describe('Konzept 3: Typinferenz', () => {
  describe('Zahlen → Pixel', () => {
    it('pad 12 → padding: 12px', () => {
      const element = generate('Box pad 12')
      expect(getStyle(element).padding).toBe('12px')
    })

    it('w 200 → width: 200px', () => {
      const element = generate('Box w 200')
      expect(getStyle(element).width).toBe('200px')
    })

    it('h 100 → height: 100px', () => {
      const element = generate('Box h 100')
      expect(getStyle(element).height).toBe('100px')
    })

    it('gap 16 → gap: 16px', () => {
      const element = generate('Box gap 16')
      expect(getStyle(element).gap).toBe('16px')
    })

    it('rad 8 → borderRadius: 8px', () => {
      const element = generate('Box rad 8')
      expect(getStyle(element).borderRadius).toBe('8px')
    })
  })

  describe('Hex → Farben', () => {
    it('bg #3B82F6 → backgroundColor', () => {
      const element = generate('Box col #3B82F6')
      expect(getStyle(element).backgroundColor).toBe('#3B82F6')
    })

    it('col #FFF → color (3-stellig)', () => {
      const element = generate('Text col #FFF')
      expect(getStyle(element).color).toBe('#FFF')
    })

    it('boc #33333380 → borderColor mit Alpha', () => {
      const element = generate('Box bor 1 boc #33333380')
      const style = getStyle(element)
      expect(style.borderColor).toBe('#33333380')
    })
  })

  describe('Strings → Text', () => {
    it('"Hello" → Textinhalt', () => {
      const element = generate('Label "Hello World"')
      expect(getTextContent(element)).toContain('Hello World')
    })
  })

  describe('Keywords → Boolean/Enum', () => {
    it('hor → flexDirection: row', () => {
      const element = generate('Box hor')
      expect(getStyle(element).flexDirection).toBe('row')
    })

    it('ver → flexDirection: column', () => {
      const element = generate('Box ver')
      expect(getStyle(element).flexDirection).toBe('column')
    })

    it('cen → zentriert', () => {
      const element = generate('Box hor cen')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('center')
    })
  })
})

// ============================================================================
// KONZEPT 4: Properties überschreiben
// ============================================================================

describe('Konzept 4: Properties überschreiben', () => {
  it('Spätere Properties gewinnen', () => {
    const dsl = `Button: pad 12 col #3B82F6

Button col #EF4444 "Delete"`

    const element = generate(dsl)
    const style = getStyle(element)
    expect(style.backgroundColor).toBe('#EF4444')
    expect(style.padding).toBe('12px') // Basis bleibt
  })

  it('Mehrere Properties überschreiben', () => {
    const dsl = `Button: pad 12 col #3B82F6 rad 8

Button pad 20 size 18 "Large"`

    const element = generate(dsl)
    const style = getStyle(element)
    expect(style.padding).toBe('20px')
    expect(style.fontSize).toBe('18px')
    expect(style.borderRadius).toBe('8px') // Nicht überschrieben
  })
})

// ============================================================================
// KONZEPT 5: Vererbung mit from
// ============================================================================

describe('Konzept 5: Vererbung mit from', () => {
  it('Erbt alle Properties der Basis', () => {
    const dsl = `Button: pad 12 bg #3B82F6 rad 8 col #FFF
DangerButton: from Button col #EF4444

DangerButton "Delete"`

    const result = parse(dsl)
    const dangerButton = result.registry.get('DangerButton')!

    // Inherited from Button
    expect(dangerButton.properties.pad).toBe(12)
    expect(dangerButton.properties.rad).toBe(8)
    expect(dangerButton.properties.bg).toBe('#3B82F6')
    // Overridden by DangerButton
    expect(dangerButton.properties.col).toBe('#EF4444')
  })

  it('Überschreibt nur angegebene Properties', () => {
    const dsl = `Button: pad 12 col #3B82F6 rad 8
SmallButton: from Button pad 8 size 12

SmallButton "Small"`

    const element = generate(dsl)
    const style = getStyle(element)
    expect(style.padding).toBe('8px')
    expect(style.fontSize).toBe('12px')
    expect(style.backgroundColor).toBe('#3B82F6') // Geerbt
    expect(style.borderRadius).toBe('8px') // Geerbt
  })

  it('Mehrfache Vererbung funktioniert', () => {
    const dsl = `Button: pad 12 col #3B82F6
DangerButton: from Button col #EF4444
SmallDangerButton: from DangerButton pad 8

SmallDangerButton "Tiny Danger"`

    const element = generate(dsl)
    const style = getStyle(element)
    expect(style.padding).toBe('8px')
    expect(style.backgroundColor).toBe('#EF4444')
  })
})

// ============================================================================
// KONZEPT 6: Referenzen mit $
// ============================================================================

describe('Konzept 6: Referenzen mit $', () => {
  describe('Design Tokens', () => {
    it('$tokenName referenziert Token-Wert', () => {
      const dsl = `$primary: #3B82F6

Button col $primary "Click"`

      const result = parse(dsl)
      expect(result.tokens.get('primary')).toBe('#3B82F6')

      const element = generate(dsl)
      const style = getStyle(element)
      expect(style.backgroundColor).toBe('#3B82F6')
    })

    it('Mehrere Tokens definieren und verwenden', () => {
      const dsl = `$primary: #3B82F6
$spacing: 16
$radius: 8

Button pad $spacing col $primary rad $radius "Click"`

      const element = generate(dsl)
      const style = getStyle(element)
      expect(style.padding).toBe('16px')
      expect(style.backgroundColor).toBe('#3B82F6')
      expect(style.borderRadius).toBe('8px')
    })
  })

  describe('Komponenten-Properties', () => {
    it('Component.property referenziert Property', () => {
      // Component property reference wird beim Instanzieren aufgelöst
      const dsl = `Card: rad 16 pad 20 col #2A2A3E
Button rad Card.rad col Card.col`

      const result = parse(dsl)
      const button = result.nodes[0]
      expect(button.properties.rad).toBe(16)
      expect(button.properties.col).toBe('#2A2A3E')
    })
  })
})

// ============================================================================
// KONZEPT 7: Layout
// ============================================================================

describe('Konzept 7: Layout', () => {
  describe('Richtung', () => {
    it('hor → horizontal (row)', () => {
      const element = generate('Nav hor gap 16')
      const style = getStyle(element)
      expect(style.display).toBe('flex')
      expect(style.flexDirection).toBe('row')
    })

    it('ver → vertikal (column)', () => {
      const element = generate('Sidebar ver gap 8')
      const style = getStyle(element)
      expect(style.display).toBe('flex')
      expect(style.flexDirection).toBe('column')
    })
  })

  describe('Ausrichtung - Horizontal Layout', () => {
    it('hor + hor-l → links ausgerichtet', () => {
      const element = generate('Box hor hor-l')
      expect(getStyle(element).justifyContent).toBe('flex-start')
    })

    it('hor + hor-cen → horizontal zentriert', () => {
      const element = generate('Box hor hor-cen')
      expect(getStyle(element).justifyContent).toBe('center')
    })

    it('hor + hor-r → rechts ausgerichtet', () => {
      const element = generate('Box hor hor-r')
      expect(getStyle(element).justifyContent).toBe('flex-end')
    })

    it('hor + ver-t → oben ausgerichtet', () => {
      const element = generate('Box hor ver-t')
      expect(getStyle(element).alignItems).toBe('flex-start')
    })

    it('hor + ver-cen → vertikal zentriert', () => {
      const element = generate('Box hor ver-cen')
      expect(getStyle(element).alignItems).toBe('center')
    })

    it('hor + ver-b → unten ausgerichtet', () => {
      const element = generate('Box hor ver-b')
      expect(getStyle(element).alignItems).toBe('flex-end')
    })
  })

  describe('Ausrichtung - Vertikal Layout', () => {
    it('ver + hor-l → links ausgerichtet', () => {
      const element = generate('Box ver hor-l')
      expect(getStyle(element).alignItems).toBe('flex-start')
    })

    it('ver + hor-cen → horizontal zentriert', () => {
      const element = generate('Box ver hor-cen')
      expect(getStyle(element).alignItems).toBe('center')
    })

    it('ver + hor-r → rechts ausgerichtet', () => {
      const element = generate('Box ver hor-r')
      expect(getStyle(element).alignItems).toBe('flex-end')
    })

    it('ver + ver-t → oben ausgerichtet', () => {
      const element = generate('Box ver ver-t')
      expect(getStyle(element).justifyContent).toBe('flex-start')
    })

    it('ver + ver-cen → vertikal zentriert', () => {
      const element = generate('Box ver ver-cen')
      expect(getStyle(element).justifyContent).toBe('center')
    })

    it('ver + ver-b → unten ausgerichtet', () => {
      const element = generate('Box ver ver-b')
      expect(getStyle(element).justifyContent).toBe('flex-end')
    })
  })

  describe('Beides zentrieren', () => {
    it('cen zentriert auf Hauptachse', () => {
      const element = generate('Box hor cen')
      expect(getStyle(element).justifyContent).toBe('center')
    })

    it('cen cen zentriert beide Achsen', () => {
      const element = generate('Box hor cen cen')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('center')
      expect(style.alignItems).toBe('center')
    })
  })

  describe('Verteilung', () => {
    it('between → space-between', () => {
      const element = generate('Header hor between')
      expect(getStyle(element).justifyContent).toBe('space-between')
    })
  })

  describe('Flex-Properties', () => {
    it('grow → flexGrow: 1', () => {
      const element = generate('Content grow')
      expect(getStyle(element).flexGrow).toBe(1)
    })

    it('wrap → flexWrap: wrap', () => {
      const element = generate('Grid hor wrap')
      expect(getStyle(element).flexWrap).toBe('wrap')
    })
  })
})

// ============================================================================
// KONZEPT 8: States
// ============================================================================

describe('Konzept 8: States', () => {
  it('Parsed States in Komponenten-Definition', () => {
    const dsl = `Toggle: w 52 h 28 rad 14
  state off
    col #333
  state on
    col #3B82F6`

    const result = parse(dsl)
    const toggle = result.registry.get('Toggle')!

    expect(toggle.states).toBeDefined()
    expect(toggle.states!.length).toBe(2)
    expect(toggle.states![0].name).toBe('off')
    expect(toggle.states![1].name).toBe('on')
  })

  it('States haben eigene Properties', () => {
    const dsl = `Tab: pad 12 rad 8
  state inactive
    bg transparent
    col #888
  state active
    bg #3B82F6
    col #FFF`

    const result = parse(dsl)
    const tab = result.registry.get('Tab')!

    const inactiveState = tab.states!.find(s => s.name === 'inactive')
    const activeState = tab.states!.find(s => s.name === 'active')

    expect(inactiveState!.properties.bg).toBe('transparent')
    expect(inactiveState!.properties.col).toBe('#888')
    expect(activeState!.properties.bg).toBe('#3B82F6')
    expect(activeState!.properties.col).toBe('#FFF')
  })
})

// ============================================================================
// KONZEPT 9: Events & Actions
// ============================================================================

describe('Konzept 9: Events & Actions', () => {
  describe('Events parsen', () => {
    it('onclick wird erkannt', () => {
      const dsl = `Button
  onclick toggle`
      const result = parse(dsl)
      expect(result.nodes[0].eventHandlers).toBeDefined()
      expect(result.nodes[0].eventHandlers!.length).toBeGreaterThan(0)
      expect(result.nodes[0].eventHandlers![0].event).toBe('onclick')
    })

    it('onchange wird erkannt', () => {
      const dsl = `Input
  onchange assign name to $event.value`
      const result = parse(dsl)
      expect(result.nodes[0].eventHandlers![0].event).toBe('onchange')
    })
  })

  describe('Actions parsen', () => {
    it('toggle Action', () => {
      const dsl = `Button
  onclick toggle`
      const result = parse(dsl)
      const action = result.nodes[0].eventHandlers![0].actions[0] as any
      expect(action.type).toBe('toggle')
    })

    it('open Action mit Target', () => {
      const dsl = `Button
  onclick open SettingsDialog`
      const result = parse(dsl)
      const action = result.nodes[0].eventHandlers![0].actions[0] as any
      expect(action.type).toBe('open')
      expect(action.target).toBe('SettingsDialog')
    })

    it('close Action mit Target', () => {
      const dsl = `Button
  onclick close Dialog`
      const result = parse(dsl)
      const action = result.nodes[0].eventHandlers![0].actions[0] as any
      expect(action.type).toBe('close')
      expect(action.target).toBe('Dialog')
    })

    it('page Action für Navigation', () => {
      const dsl = `NavItem
  onclick page Dashboard`
      const result = parse(dsl)
      const action = result.nodes[0].eventHandlers![0].actions[0] as any
      expect(action.type).toBe('page')
      expect(action.target).toBe('Dashboard')
    })

    it('assign Action mit Wert', () => {
      const dsl = `Button
  onclick assign count to 0`
      const result = parse(dsl)
      const action = result.nodes[0].eventHandlers![0].actions[0] as any
      expect(action.type).toBe('assign')
      expect(action.target).toBe('count')
    })

    it('assign Action mit Expression', () => {
      const dsl = `Button
  onclick assign count to $count + 1`
      const result = parse(dsl)
      const action = result.nodes[0].eventHandlers![0].actions[0] as any
      expect(action.type).toBe('assign')
      expect(action.target).toBe('count')
      expect(action.value.type).toBe('binary')
    })
  })
})

// ============================================================================
// KONZEPT 10: Konditionale Logik
// ============================================================================

describe('Konzept 10: Konditionale Logik', () => {
  describe('Bedingte Komponenten', () => {
    it('if-Block wird geparst', () => {
      const dsl = `Box
  if $isLoggedIn
    Avatar
  else
    Button "Login"`

      const result = parse(dsl)
      const conditional = result.nodes[0].children[0]
      expect(conditional.name).toBe('_conditional')
      expect(conditional.condition).toBeDefined()
      expect(conditional.condition?.name).toBe('isLoggedIn')
    })

    it('if/else hat then- und else-Children', () => {
      const dsl = `Box
  if $isLoggedIn
    Avatar
  else
    Button`

      const result = parse(dsl)
      const conditional = result.nodes[0].children[0]
      expect(conditional.children).toHaveLength(1) // Avatar
      expect(conditional.elseChildren).toHaveLength(1) // Button
    })
  })

  describe('Bedingte Properties', () => {
    it('if/else für Properties', () => {
      const dsl = `Button pad 12
  if $isActive
    col #3B82F6
  else
    col #6B7280`

      const result = parse(dsl)
      const button = result.nodes[0]
      expect(button.conditionalProperties).toBeDefined()
      expect(button.conditionalProperties).toHaveLength(1)
      expect(button.conditionalProperties![0].thenProperties.bg).toBe('#3B82F6')
      expect(button.conditionalProperties![0].elseProperties?.bg).toBe('#6B7280')
    })
  })
})

// ============================================================================
// KONZEPT 11: Iteratoren
// ============================================================================

describe('Konzept 11: Iteratoren', () => {
  it('each-Block wird geparst', () => {
    const dsl = `List
  each $task in $tasks
    TaskCard`

    const result = parse(dsl)
    const iterator = result.nodes[0].children[0]
    expect(iterator.name).toBe('_iterator')
    expect(iterator.iteration!.itemVar).toBe('task')
    expect(iterator.iteration!.collectionVar).toBe('tasks')
  })

  it('Iterator hat Children', () => {
    const dsl = `List
  each $task in $tasks
    TaskCard
      Title`

    const result = parse(dsl)
    const iterator = result.nodes[0].children[0]
    expect(iterator.children).toHaveLength(1)
    expect(iterator.children[0].name).toBe('TaskCard')
  })

  it('Nested property access in collection', () => {
    const dsl = `List
  each $item in $data.items
    Item`

    const result = parse(dsl)
    const iterator = result.nodes[0].children[0]
    expect(iterator.iteration!.collectionPath).toEqual(['data', 'items'])
  })
})

// ============================================================================
// KONZEPT 12: Slots
// ============================================================================

describe('Konzept 12: Slots', () => {
  it('Komponente mit Kind-Definitionen', () => {
    // Children WITHOUT colon become children of the component
    // Children WITH colon become separate component definitions
    const dsl = `Card: ver pad 24 gap 16
  Title size 20 weight 600
  Body size 14`

    const result = parse(dsl)
    const card = result.registry.get('Card')!

    expect(card.children.length).toBe(2)
    expect(card.children[0].name).toBe('Title')
    expect(card.children[1].name).toBe('Body')
  })

  it('Kinder werden bei Verwendung gefüllt', () => {
    const dsl = `Card: ver pad 24
  Title size 20
  Body size 14

Card
  Title "Projektname"
  Body "Beschreibung"`

    const result = parse(dsl)
    const cardInstance = result.nodes[0]

    expect(cardInstance.children.length).toBe(2)
  })
})

// ============================================================================
// KONZEPT 13: Datenbindung
// ============================================================================

describe('Konzept 13: Datenbindung', () => {
  it('Variable in Content wird geparst', () => {
    const result = parse('Counter $count')
    // Content kann String oder Array sein
    const node = result.nodes[0]
    expect(node.content || node.children).toBeDefined()
  })

  it('assign-Aktion parsed Variable und Wert', () => {
    const dsl = `Button
  onclick assign count to 0`
    const result = parse(dsl)
    const action = result.nodes[0].eventHandlers![0].actions[0] as any
    expect(action.target).toBe('count')
    expect(action.value.value).toBe(0)
  })

  it('assign mit Expression', () => {
    const dsl = `Button
  onclick assign count to $count + 1`
    const result = parse(dsl)
    const action = result.nodes[0].eventHandlers![0].actions[0] as any
    expect(action.target).toBe('count')
    expect(action.value.type).toBe('binary')
  })

  it('Variablen-Referenz in Bedingung', () => {
    const dsl = `Box
  if $count >= 10
    Badge "Maximum"`

    const result = parse(dsl)
    const conditional = result.nodes[0].children[0]
    expect(conditional.condition).toBeDefined()
  })
})

// ============================================================================
// KONZEPT 14: Content am Ende
// ============================================================================

describe('Konzept 14: Content am Ende', () => {
  it('Komponente Property Value "Content"', () => {
    const element = generate('Button pad 12 col #3B82F6 "Click"')
    expect(getTextContent(element)).toContain('Click')

    const style = getStyle(element)
    expect(style.padding).toBe('12px')
    expect(style.backgroundColor).toBe('#3B82F6')
  })

  it('Content wird geparst', () => {
    const result = parse('Greeting "Hallo"')
    const node = result.nodes[0]
    // Content goes to children as a _text node
    expect(node.children.length).toBeGreaterThan(0)
    expect(node.children[0].name).toBe('_text')
    expect(node.children[0].content).toBe('Hallo')
  })
})

// ============================================================================
// KONZEPT 15: Geltungsbereich
// ============================================================================

describe('Konzept 15: Geltungsbereich', () => {
  it('Tokens sind global verfügbar', () => {
    const dsl = `$primary: #3B82F6
$spacing: 16

Button col $primary pad $spacing "Click"
Card col $primary pad $spacing`

    const result = parse(dsl)
    expect(result.tokens.get('primary')).toBe('#3B82F6')
    expect(result.tokens.get('spacing')).toBe(16)

    // Beide Komponenten sollten die Tokens nutzen können
    expect(result.nodes[0].properties.col).toBe('#3B82F6')
    expect(result.nodes[1].properties.col).toBe('#3B82F6')
  })

  it('Iterator-Variable ist im Block definiert', () => {
    const dsl = `List
  each $task in $tasks
    Card`

    const result = parse(dsl)
    const iterator = result.nodes[0].children[0]
    // $task ist im Iterator definiert
    expect(iterator.iteration!.itemVar).toBe('task')
  })
})

// ============================================================================
// VOLLSTÄNDIGE BEISPIELE AUS DER DOKUMENTATION
// ============================================================================

describe('Vollständige Dokumentations-Beispiele', () => {
  describe('Dashboard-Layout', () => {
    const dashboardDSL = `$bg-dark: #111827
$bg-card: #1F2937
$primary: #3B82F6

Dashboard: hor full col $bg-dark

Sidebar: ver w 240 col $bg-card pad u-d 16
  Logo: hor ver-cen h 48 pad l-r 16
  Nav: ver gap 4 pad u 16
    NavItem: hor ver-cen h 40 pad l-r 16 rad 8 gap 12

Content: ver grow
  Header: hor between ver-cen h 64 pad l-r 24 col $bg-card
  Main: ver grow pad 24 gap 24`

    it('parst Dashboard mit allen Komponenten', () => {
      const result = parse(dashboardDSL)

      expect(result.registry.has('Dashboard')).toBe(true)
      expect(result.registry.has('Sidebar')).toBe(true)
      expect(result.registry.has('Content')).toBe(true)
      expect(result.registry.has('NavItem')).toBe(true)
    })

    it('Tokens werden korrekt aufgelöst', () => {
      const result = parse(dashboardDSL)

      // Tokens are stored in result.tokens
      expect(result.tokens.get('bg-dark')).toBe('#111827')
      expect(result.tokens.get('bg-card')).toBe('#1F2937')
      expect(result.tokens.get('primary')).toBe('#3B82F6')

      // Component definitions reference tokens (resolved at render time)
      const dashboard = result.registry.get('Dashboard')!
      expect(dashboard.properties.col).toBeDefined()

      const sidebar = result.registry.get('Sidebar')!
      expect(sidebar.properties.col).toBeDefined()
    })
  })

  describe('Button-Varianten', () => {
    const buttonDSL = `Button: pad 12 col #3B82F6 rad 8
DangerButton: from Button col #EF4444
GhostButton: from Button col transparent bor 1 boc #3B82F6
SmallButton: from Button pad 8 size 12

Button "Primary"
DangerButton "Delete"
GhostButton "Cancel"
SmallButton "Small"`

    it('Alle Varianten erben korrekt', () => {
      const result = parse(buttonDSL)

      const danger = result.registry.get('DangerButton')!
      expect(danger.properties.pad).toBe(12)
      expect(danger.properties.col).toBe('#EF4444')

      const ghost = result.registry.get('GhostButton')!
      expect(ghost.properties.col).toBe('transparent')
      expect(ghost.properties.bor).toBe(1)
      expect(ghost.properties.boc).toBe('#3B82F6')

      const small = result.registry.get('SmallButton')!
      expect(small.properties.pad).toBe(8)
      expect(small.properties.col).toBe('#3B82F6')
    })
  })

  describe('Card mit Slots', () => {
    // Children WITHOUT colon become children of the component
    const cardDSL = `Card: ver pad 24 gap 16 col #1E1E2E rad 12
  Header hor between ver-cen
  Title size 20 weight 600
  Body size 14 col #9CA3AF
  Actions hor gap 8 hor-r

Card
  Header
    Badge "New"
    Icon "more-vertical"
  Title "Projektname"
  Body "Beschreibung des Projekts..."
  Actions
    Button "Abbrechen"
    Button col #3B82F6 "Speichern"`

    it('Card-Struktur wird korrekt geparst', () => {
      const result = parse(cardDSL)

      const cardDef = result.registry.get('Card')!
      expect(cardDef.children.length).toBe(4)

      const cardInstance = result.nodes[0]
      expect(cardInstance.children.length).toBe(4)
    })
  })

  describe('Toggle mit States', () => {
    // Knob WITHOUT colon becomes a child
    const toggleDSL = `Toggle: w 52 h 28 rad 14 pad 2
  state off
    col #333
  state on
    col #3B82F6
  Knob w 24 h 24 rad 12 bg white

Toggle
  onclick toggle`

    it('Toggle hat States und Knob', () => {
      const result = parse(toggleDSL)

      const toggle = result.registry.get('Toggle')!
      expect(toggle.states!.length).toBe(2)
      expect(toggle.children[0].name).toBe('Knob')
    })

    it('Toggle-Instance hat onclick toggle', () => {
      const result = parse(toggleDSL)

      const instance = result.nodes[0]
      // Events are in eventHandlers array
      const handler = instance.eventHandlers![0]
      expect(handler.event).toBe('onclick')
      expect((handler.actions[0] as any).type).toBe('toggle')
    })
  })
})
