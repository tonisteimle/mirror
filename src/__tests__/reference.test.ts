/**
 * Reference Tests - Tests für alle Beispiele aus der Referenz in docs/reference.html
 * Prüft Parser für die komplette Syntax-Referenz.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

// ============================================================================
// ABSCHNITT 1: SYNTAX GRUNDLAGEN
// ============================================================================

describe('Referenz Abschnitt 1: Syntax Grundlagen', () => {
  describe('Zeilenstruktur', () => {
    it('ComponentName property value wird geparst', () => {
      const result = parse('Button pad 12 col #3B82F6')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Button')
      expect(result.nodes[0].properties.pad).toBe(12)
    })
  })

  describe('Einrückung', () => {
    it('Kinder werden mit 2 Spaces eingerückt', () => {
      const dsl = `Parent
  Child
    Grandchild`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Parent')
      expect(result.nodes[0].children[0].name).toBe('Child')
      expect(result.nodes[0].children[0].children[0].name).toBe('Grandchild')
    })
  })

  describe('Kommentare', () => {
    it('// Dies ist ein Kommentar', () => {
      const result = parse('// Dies ist ein Kommentar')
      expect(result.errors).toHaveLength(0)
    })

    it('Inline-Kommentar wird geparst', () => {
      const result = parse('Button col #FFF  // Inline-Kommentar')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Button')
    })
  })

  describe('Strings', () => {
    it('Button mit Text-Content wird geparst', () => {
      const result = parse('Button "Click me"')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Button')
    })

    it('Label mit Text-Content wird geparst', () => {
      const result = parse('Label "Hello World"')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Label')
    })
  })

  describe('Zahlen', () => {
    it('w 200 - Pixel', () => {
      const result = parse('Box w 200')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.w).toBe(200)
    })

    it('w 50% - Prozent wird geparst', () => {
      const result = parse('Box w 50%')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.w).toBeDefined()
    })

    it('pad 16 - Padding', () => {
      const result = parse('Box pad 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.pad).toBe(16)
    })
  })

  describe('Farben', () => {
    it('bg #3B82F6 - RGB', () => {
      const result = parse('Box col #3B82F6')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.col).toBe('#3B82F6')
    })

    it('bg #3B82F680 - RGBA', () => {
      const result = parse('Box col #3B82F680')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.col).toBe('#3B82F680')
    })

    it('col #FFF - Kurzform', () => {
      const result = parse('Text col #FFF')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.col).toBe('#FFF')
    })
  })

  describe('Komponenten-Namen', () => {
    it('Button - Großbuchstabe = Komponente', () => {
      const result = parse('Button col #FFF')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Button')
    })

    it('header - Kleinbuchstabe = Element', () => {
      const result = parse('header hor')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('header')
    })
  })
})

// ============================================================================
// ABSCHNITT 2: TOKENS & REFERENZEN
// ============================================================================

describe('Referenz Abschnitt 2: Tokens & Referenzen', () => {
  describe('Tokens (Design-Variablen)', () => {
    it('Token-Definition wird geparst', () => {
      const result = parse('$primary: #3B82F6')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.size).toBeGreaterThan(0)
    })

    it('Zahlen-Token wird geparst', () => {
      const result = parse('$spacing: 16')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.size).toBeGreaterThan(0)
    })

    it('String-Token wird geparst', () => {
      const result = parse('$font: "Inter"')
      expect(result.errors).toHaveLength(0)
      expect(result.tokens.size).toBeGreaterThan(0)
    })

    it('Token-Verwendung: col $primary', () => {
      const dsl = `$primary: #3B82F6
Button col $primary`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      const button = result.nodes.find(n => n.name === 'Button')
      expect(button).toBeDefined()
    })

    it('Token mit Kombination: $default-pad: l-r 4', () => {
      const dsl = `$default-pad: l-r 4

Box pad $default-pad`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      const box = result.nodes.find(n => n.name === 'Box')
      expect(box?.properties.pad_l).toBe(4)
      expect(box?.properties.pad_r).toBe(4)
    })

    it('Token mit mehreren Richtungen: $card-pad: l-r 8 u-d 4', () => {
      const dsl = `$card-pad: l-r 8 u-d 4

Card pad $card-pad`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      const card = result.nodes.find(n => n.name === 'Card')
      expect(card?.properties.pad_l).toBe(8)
      expect(card?.properties.pad_r).toBe(8)
      expect(card?.properties.pad_u).toBe(4)
      expect(card?.properties.pad_d).toBe(4)
    })

    it('Verschachtelte Tokens: $lg-pad verwendet $base', () => {
      const dsl = `$base: 8
$lg-pad: l-r $base

Box pad $lg-pad`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      const box = result.nodes.find(n => n.name === 'Box')
      expect(box?.properties.pad_l).toBe(8)
      expect(box?.properties.pad_r).toBe(8)
    })

    it('Token referenziert anderen Token: $size: $base', () => {
      const dsl = `$base: 16
$size: $base

Box w $size`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      const box = result.nodes.find(n => n.name === 'Box')
      expect(box?.properties.w).toBe(16)
    })

    it('Komplexes Design-System mit Token-Kombinationen', () => {
      const dsl = `$primary: #3B82F6
$spacing-sm: 4
$spacing-md: 8
$card-pad: l-r $spacing-md u-d $spacing-sm

Card pad $card-pad col $primary`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      const card = result.nodes.find(n => n.name === 'Card')
      expect(card?.properties.pad_l).toBe(8)
      expect(card?.properties.pad_r).toBe(8)
      expect(card?.properties.pad_u).toBe(4)
      expect(card?.properties.pad_d).toBe(4)
      expect(card?.properties.col).toBe('#3B82F6')
    })
  })

  describe('Komponenten-Property-Referenzen', () => {
    it('Card.rad - Referenz auf Komponenten-Property', () => {
      const dsl = `Card: rad 16 pad 20 col #2A2A3E
Button rad Card.rad`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('Card')).toBe(true)
    })

    it('Design-System-Pattern mit Referenzen', () => {
      const dsl = `Spacing: pad 16 gap 12
Radius: rad 8
Colors: col #1E1E2E`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('Spacing')).toBe(true)
      expect(result.registry.has('Radius')).toBe(true)
      expect(result.registry.has('Colors')).toBe(true)
    })
  })
})

// ============================================================================
// ABSCHNITT 3: PROPERTIES
// ============================================================================

describe('Referenz Abschnitt 3: Properties', () => {
  describe('Layout-Richtung', () => {
    it('hor - horizontales Layout', () => {
      const result = parse('Header hor')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.hor).toBe(true)
    })

    it('ver - vertikales Layout', () => {
      const result = parse('Sidebar ver')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.ver).toBe(true)
    })
  })

  describe('Ausrichtung', () => {
    it('hor-l - links ausrichten', () => {
      const result = parse('Box hor-l')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['hor-l']).toBe(true)
    })

    it('hor-cen - horizontal zentrieren', () => {
      const result = parse('Box hor-cen')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['hor-cen']).toBe(true)
    })

    it('hor-r - rechts ausrichten', () => {
      const result = parse('Box hor-r')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['hor-r']).toBe(true)
    })

    it('ver-t - oben ausrichten', () => {
      const result = parse('Box ver-t')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['ver-t']).toBe(true)
    })

    it('ver-cen - vertikal zentrieren', () => {
      const result = parse('Box ver-cen')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['ver-cen']).toBe(true)
    })

    it('ver-b - unten ausrichten', () => {
      const result = parse('Box ver-b')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['ver-b']).toBe(true)
    })

    it('between - gleichmäßig verteilen', () => {
      const result = parse('Box between')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.between).toBe(true)
    })
  })

  describe('Gap', () => {
    it('gap 16 - Abstand zwischen Kindern', () => {
      const result = parse('Box gap 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.gap).toBe(16)
    })
  })

  describe('Padding', () => {
    it('pad 16 - Alle Seiten', () => {
      const result = parse('Box pad 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.pad).toBe(16)
    })

    it('pad 16 12 - Vertikal, Horizontal', () => {
      const result = parse('Box pad 16 12')
      expect(result.errors).toHaveLength(0)
    })

    it('pad l 16 - Nur links', () => {
      const result = parse('Box pad l 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.pad_l).toBe(16)
    })

    it('pad r 16 - Nur rechts', () => {
      const result = parse('Box pad r 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.pad_r).toBe(16)
    })

    it('pad u 16 - Nur oben', () => {
      const result = parse('Box pad u 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.pad_u).toBe(16)
    })

    it('pad d 16 - Nur unten', () => {
      const result = parse('Box pad d 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.pad_d).toBe(16)
    })
  })

  describe('Margin', () => {
    it('mar 16 - Alle Seiten', () => {
      const result = parse('Box mar 16')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.mar).toBe(16)
    })
  })

  describe('Größen', () => {
    it('w 200 - Breite', () => {
      const result = parse('Box w 200')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.w).toBe(200)
    })

    it('h 48 - Höhe', () => {
      const result = parse('Box h 48')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.h).toBe(48)
    })

    it('minw 100 - Mindestbreite', () => {
      const result = parse('Box minw 100')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.minw).toBe(100)
    })

    it('maxw 500 - Maximalbreite', () => {
      const result = parse('Box maxw 500')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.maxw).toBe(500)
    })

    it('minh 50 - Mindesthöhe', () => {
      const result = parse('Box minh 50')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.minh).toBe(50)
    })

    it('maxh 300 - Maximalhöhe', () => {
      const result = parse('Box maxh 300')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.maxh).toBe(300)
    })

    it('full - 100% Breite und Höhe', () => {
      const result = parse('Container full')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.full).toBe(true)
    })

    it('grow - Flex grow', () => {
      const result = parse('Content grow')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.grow).toBe(true)
    })
  })

  describe('Farben', () => {
    it('bg #1A1A1A - Hintergrundfarbe', () => {
      const result = parse('Box col #1A1A1A')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.col).toBe('#1A1A1A')
    })

    it('col #FFFFFF - Textfarbe', () => {
      const result = parse('Text col #FFFFFF')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.col).toBe('#FFFFFF')
    })

    it('boc #333333 - Rahmenfarbe', () => {
      const result = parse('Box boc #333333')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.boc).toBe('#333333')
    })
  })

  describe('Rahmen', () => {
    it('bor 1 - Rahmenbreite alle', () => {
      const result = parse('Box bor 1')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.bor).toBe(1)
    })

    it('bor l 2 - Rahmenbreite links', () => {
      const result = parse('Box bor l 2')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.bor_l).toBe(2)
    })

    it('rad 8 - Eckenradius', () => {
      const result = parse('Box rad 8')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.rad).toBe(8)
    })

    it('rad 99 - Pill-Form', () => {
      const result = parse('Tag rad 99')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.rad).toBe(99)
    })
  })

  describe('Typografie', () => {
    it('size 14 - Schriftgröße', () => {
      const result = parse('Text size 14')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.size).toBe(14)
    })

    it('weight 600 - Schriftstärke', () => {
      const result = parse('Text weight 600')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.weight).toBe(600)
    })

    it('italic - Kursiv', () => {
      const result = parse('Text italic')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.italic).toBe(true)
    })

    it('underline - Unterstrichen', () => {
      const result = parse('Text underline')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.underline).toBe(true)
    })

    it('uppercase - Großbuchstaben', () => {
      const result = parse('Text uppercase')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.uppercase).toBe(true)
    })

    it('lowercase - Kleinbuchstaben', () => {
      const result = parse('Text lowercase')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.lowercase).toBe(true)
    })

    it('truncate - Mit Ellipsis abschneiden', () => {
      const result = parse('Text truncate')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.truncate).toBe(true)
    })
  })

  describe('Visuals', () => {
    it('z 100 - Z-Index', () => {
      const result = parse('Modal z 100')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties.z).toBe(100)
    })

    it('cursor pointer wird geparst', () => {
      const result = parse('Button cursor pointer')
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Bilder', () => {
    it('src "image.jpg" - Bildquelle wird geparst', () => {
      const result = parse('Image src "image.jpg"')
      expect(result.errors).toHaveLength(0)
    })

    it('alt "Beschreibung" - Alt-Text wird geparst', () => {
      const result = parse('Image alt "Beschreibung"')
      expect(result.errors).toHaveLength(0)
    })

    it('fit cover - Object fit wird geparst', () => {
      const result = parse('Image fit cover')
      expect(result.errors).toHaveLength(0)
    })

    it('Image komplett wird geparst', () => {
      const result = parse('Image src "photo.jpg" w 200 h 150 fit cover rad 8')
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Icons', () => {
    it('icon "search" wird geparst', () => {
      const result = parse('Icon icon "search"')
      expect(result.errors).toHaveLength(0)
    })

    it('icon "user" size 20 wird geparst', () => {
      const result = parse('Icon icon "user" size 20')
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Hover-States', () => {
    it('hover-col #333 - Hintergrund bei Hover', () => {
      const result = parse('Button hover-col #333')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['hover-col']).toBe('#333')
    })

    it('hover-col #FFF - Textfarbe bei Hover', () => {
      const result = parse('Button hover-col #FFF')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties['hover-col']).toBe('#FFF')
    })

    it('Button mit mehreren hover-States wird geparst', () => {
      const result = parse('Button col #333 hover-col #3B82F6 hover-col #FFF')
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Modifiers', () => {
    it('-primary - Primärer Stil wird geparst', () => {
      const result = parse('Button -primary')
      expect(result.errors).toHaveLength(0)
    })

    it('-outlined - Transparenter Hintergrund wird geparst', () => {
      const result = parse('Button -outlined')
      expect(result.errors).toHaveLength(0)
    })

    it('-disabled - Nicht klickbar wird geparst', () => {
      const result = parse('Button -disabled')
      expect(result.errors).toHaveLength(0)
    })
  })
})

// ============================================================================
// ABSCHNITT 4: KOMPONENTEN-DEFINITION
// ============================================================================

describe('Referenz Abschnitt 4: Komponenten-Definition', () => {
  describe('Komponenten definieren', () => {
    it('Button: - Definition mit Doppelpunkt', () => {
      const dsl = 'Button: hor hor-cen ver-cen h 40 pad l-r 16 rad 8 col #3B82F6'
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('Button')).toBe(true)
    })

    it('Komponenten-Verwendung', () => {
      const dsl = `Button: pad 12 col #3B82F6
Button "Click me"`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('Button')).toBe(true)
      const button = result.nodes.find(n => n.name === 'Button')
      expect(button).toBeDefined()
    })
  })

  describe('Vererbung', () => {
    it('from Parent - Komponente erweitern', () => {
      const dsl = `Button: pad 12 col #3B82F6 rad 8 col #FFF
DangerButton: from Button col #EF4444`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('Button')).toBe(true)
      expect(result.registry.has('DangerButton')).toBe(true)
    })

    it('GhostButton: from Button', () => {
      const dsl = `Button: pad 12 col #3B82F6
GhostButton: from Button bg transparent bor 1 boc #3B82F6 col #3B82F6`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('GhostButton')).toBe(true)
    })
  })

  describe('Komponenten mit Kindern (Slots)', () => {
    it('Card mit Slots wird geparst', () => {
      const dsl = `Card: ver pad 16 col #1E1E1E rad 12 gap 8`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('Card')).toBe(true)
    })
  })
})

// ============================================================================
// ABSCHNITT 5: INTERAKTIVITÄT
// ============================================================================

describe('Referenz Abschnitt 5: Interaktivität', () => {
  describe('States', () => {
    it('Toggle mit state off und state on', () => {
      const dsl = `Toggle: w 52 h 28 rad 14 pad 2
  state off
    col #333
  state on
    col #3B82F6`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      expect(result.registry.has('Toggle')).toBe(true)
      const toggle = result.registry.get('Toggle')!
      expect(toggle.states).toBeDefined()
      expect(toggle.states.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Events', () => {
    it('onclick toggle wird geparst', () => {
      const result = parse('Button onclick toggle')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Button')
    })

    it('onclick open SettingsDialog wird geparst', () => {
      const result = parse('Button onclick open SettingsDialog')
      expect(result.errors).toHaveLength(0)
    })

    it('onclick page Home wird geparst', () => {
      const result = parse('Button onclick page Home')
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Bedingte Anzeige', () => {
    it('if $isLoggedIn', () => {
      const dsl = `if $isLoggedIn
  Avatar`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
    })

    it('if/else', () => {
      const dsl = `if $isLoggedIn
  Avatar
else
  Button`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Bedingte Properties', () => {
    it('if $isActive then bg else bg wird geparst', () => {
      const result = parse('Button if $isActive then col #3B82F6 else col #333')
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Iteratoren', () => {
    it('each $task in $tasks', () => {
      const dsl = `each $task in $tasks
  TaskCard`
      const result = parse(dsl)
      expect(result.errors).toHaveLength(0)
      // Iterator creates a special node
      expect(result.nodes.length).toBeGreaterThan(0)
    })
  })

  describe('Event-Objekt-Zugriff', () => {
    it('onchange assign text to $event.value', () => {
      const result = parse('Input onchange assign text to $event.value')
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Expressions', () => {
    it('onclick assign count to $count + 1', () => {
      const result = parse('Button onclick assign count to $count + 1')
      expect(result.errors).toHaveLength(0)
    })
  })
})

// ============================================================================
// ABSCHNITT 6: LIBRARY-KOMPONENTEN
// ============================================================================

describe('Referenz Abschnitt 6: Library-Komponenten', () => {
  describe('Overlays', () => {
    it('Dropdown wird geparst', () => {
      const result = parse('Dropdown')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Dropdown')
    })

    it('Dialog wird geparst', () => {
      const result = parse('Dialog')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Dialog')
    })

    it('Tooltip wird geparst', () => {
      const result = parse('Tooltip')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Tooltip')
    })

    it('Popover wird geparst', () => {
      const result = parse('Popover')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Popover')
    })

    it('ContextMenu wird geparst', () => {
      const result = parse('ContextMenu')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('ContextMenu')
    })

    it('HoverCard wird geparst', () => {
      const result = parse('HoverCard')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('HoverCard')
    })
  })

  describe('Navigation', () => {
    it('Tabs wird geparst', () => {
      const result = parse('Tabs')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Tabs')
    })

    it('Accordion wird geparst', () => {
      const result = parse('Accordion')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Accordion')
    })

    it('Collapsible wird geparst', () => {
      const result = parse('Collapsible')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Collapsible')
    })
  })

  describe('Formular', () => {
    it('Input wird geparst', () => {
      const result = parse('Input')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Input')
    })

    it('Select wird geparst', () => {
      const result = parse('Select')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Select')
    })

    it('Checkbox wird geparst', () => {
      const result = parse('Checkbox')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Checkbox')
    })

    it('Switch wird geparst', () => {
      const result = parse('Switch')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Switch')
    })

    it('Slider wird geparst', () => {
      const result = parse('Slider')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Slider')
    })
  })

  describe('Feedback', () => {
    it('Toast wird geparst', () => {
      const result = parse('Toast')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Toast')
    })

    it('Progress wird geparst', () => {
      const result = parse('Progress')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Progress')
    })

    it('Avatar wird geparst', () => {
      const result = parse('Avatar')
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].name).toBe('Avatar')
    })
  })
})

// ============================================================================
// ABSCHNITT 7: SCHNELLREFERENZ
// ============================================================================

describe('Referenz Abschnitt 7: Schnellreferenz', () => {
  describe('Layout', () => {
    it('hor ver gap between wrap', () => {
      expect(parse('Box hor').errors).toHaveLength(0)
      expect(parse('Box ver').errors).toHaveLength(0)
      expect(parse('Box gap 16').errors).toHaveLength(0)
      expect(parse('Box between').errors).toHaveLength(0)
      expect(parse('Box wrap').errors).toHaveLength(0)
    })
  })

  describe('Align', () => {
    it('hor-l hor-cen hor-r ver-t ver-cen ver-b', () => {
      expect(parse('Box hor-l').errors).toHaveLength(0)
      expect(parse('Box hor-cen').errors).toHaveLength(0)
      expect(parse('Box hor-r').errors).toHaveLength(0)
      expect(parse('Box ver-t').errors).toHaveLength(0)
      expect(parse('Box ver-cen').errors).toHaveLength(0)
      expect(parse('Box ver-b').errors).toHaveLength(0)
    })
  })

  describe('Size', () => {
    it('w h minw maxw minh maxh full grow', () => {
      expect(parse('Box w 100').errors).toHaveLength(0)
      expect(parse('Box h 100').errors).toHaveLength(0)
      expect(parse('Box minw 100').errors).toHaveLength(0)
      expect(parse('Box maxw 100').errors).toHaveLength(0)
      expect(parse('Box minh 100').errors).toHaveLength(0)
      expect(parse('Box maxh 100').errors).toHaveLength(0)
      expect(parse('Box full').errors).toHaveLength(0)
      expect(parse('Box grow').errors).toHaveLength(0)
    })
  })

  describe('Color', () => {
    it('bg col boc', () => {
      expect(parse('Box col #FFF').errors).toHaveLength(0)
      expect(parse('Text col #000').errors).toHaveLength(0)
      expect(parse('Box boc #333').errors).toHaveLength(0)
    })
  })

  describe('Border', () => {
    it('bor rad', () => {
      expect(parse('Box bor 1').errors).toHaveLength(0)
      expect(parse('Box rad 8').errors).toHaveLength(0)
    })
  })

  describe('Type', () => {
    it('size weight italic underline uppercase lowercase truncate', () => {
      expect(parse('Text size 14').errors).toHaveLength(0)
      expect(parse('Text weight 600').errors).toHaveLength(0)
      expect(parse('Text italic').errors).toHaveLength(0)
      expect(parse('Text underline').errors).toHaveLength(0)
      expect(parse('Text uppercase').errors).toHaveLength(0)
      expect(parse('Text lowercase').errors).toHaveLength(0)
      expect(parse('Text truncate').errors).toHaveLength(0)
    })
  })

  describe('Visual', () => {
    it('z cursor', () => {
      expect(parse('Box z 100').errors).toHaveLength(0)
      expect(parse('Box cursor pointer').errors).toHaveLength(0)
    })
  })

  describe('Image', () => {
    it('src alt fit', () => {
      expect(parse('Image src "photo.jpg"').errors).toHaveLength(0)
      expect(parse('Image alt "Description"').errors).toHaveLength(0)
      expect(parse('Image fit cover').errors).toHaveLength(0)
    })
  })

  describe('Icon', () => {
    it('icon', () => {
      expect(parse('Icon icon "search"').errors).toHaveLength(0)
    })
  })

  describe('Hover', () => {
    it('hover-col hover-col hover-boc hover-bor hover-rad', () => {
      expect(parse('Box hover-col #333').errors).toHaveLength(0)
      expect(parse('Box hover-col #FFF').errors).toHaveLength(0)
      expect(parse('Box hover-boc #555').errors).toHaveLength(0)
      expect(parse('Box hover-bor 2').errors).toHaveLength(0)
      expect(parse('Box hover-rad 12').errors).toHaveLength(0)
    })
  })

  describe('Tokens', () => {
    it('$name: value', () => {
      expect(parse('$primary: #3B82F6').errors).toHaveLength(0)
    })
  })

  describe('Define', () => {
    it('Name: props', () => {
      expect(parse('Button: pad 12 col #3B82F6').errors).toHaveLength(0)
    })
  })

  describe('Inherit', () => {
    it('Name: from Parent', () => {
      const dsl = `Button: pad 12 col #3B82F6
DangerBtn: from Button col #EF4444`
      expect(parse(dsl).errors).toHaveLength(0)
    })
  })

  describe('State', () => {
    it('state name', () => {
      const dsl = `Toggle:
  state active
    col #3B82F6`
      expect(parse(dsl).errors).toHaveLength(0)
    })
  })

  describe('Events', () => {
    it('onclick onchange oninput onfocus onblur', () => {
      expect(parse('Button onclick toggle').errors).toHaveLength(0)
      expect(parse('Input onchange toggle').errors).toHaveLength(0)
      expect(parse('Input oninput toggle').errors).toHaveLength(0)
      expect(parse('Input onfocus toggle').errors).toHaveLength(0)
      expect(parse('Input onblur toggle').errors).toHaveLength(0)
    })
  })

  describe('Actions', () => {
    it('toggle | open X | close X | show X | hide X | page X', () => {
      expect(parse('Button onclick toggle').errors).toHaveLength(0)
      expect(parse('Button onclick open Dialog').errors).toHaveLength(0)
      expect(parse('Button onclick close Dialog').errors).toHaveLength(0)
      expect(parse('Button onclick show Tooltip').errors).toHaveLength(0)
      expect(parse('Button onclick hide Tooltip').errors).toHaveLength(0)
      expect(parse('Button onclick page Home').errors).toHaveLength(0)
    })
  })

  describe('Assign', () => {
    it('assign var to expr', () => {
      expect(parse('Button onclick assign count to $count + 1').errors).toHaveLength(0)
    })
  })

  describe('Condition', () => {
    it('if $cond', () => {
      const dsl = `if $isLoggedIn
  Avatar`
      expect(parse(dsl).errors).toHaveLength(0)
    })
  })

  describe('Else', () => {
    it('else', () => {
      const dsl = `if $isLoggedIn
  Avatar
else
  Button`
      expect(parse(dsl).errors).toHaveLength(0)
    })
  })

  describe('CondProp', () => {
    it('if $x then p v else', () => {
      expect(parse('Button if $active then col #3B82F6 else col #333').errors).toHaveLength(0)
    })
  })

  describe('Iterator', () => {
    it('each $x in $list', () => {
      const dsl = `each $task in $tasks
  TaskCard`
      expect(parse(dsl).errors).toHaveLength(0)
    })
  })
})
