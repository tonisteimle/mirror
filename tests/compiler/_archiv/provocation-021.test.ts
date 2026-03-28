/**
 * Provocation Tests 021: Gezielte Bug-Suche
 *
 * Strategie: "Wie kann ich das kaputt machen?"
 * Wir testen schwierige Kombinationen und Grenzfälle.
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Provocation Tests', () => {

  function getStyle(node: any, property: string): string | undefined {
    const matches = node.styles.filter((s: any) => s.property === property && !s.state)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  function getStateStyle(node: any, property: string, state: string): string | undefined {
    const match = node.styles.find((s: any) => s.property === property && s.state === state)
    return match?.value
  }

  // ============================================================
  // 1. Negative Werte
  // ============================================================
  describe('Negative Werte', () => {

    test('margin -10 sollte -10px sein', () => {
      const ir = toIR(parse(`Frame margin -10`))
      const node = ir.nodes[0]
      console.log('margin -10:', getStyle(node, 'margin'))
      expect(getStyle(node, 'margin')).toBe('-10px')
    })

    test('x -50 sollte left: -50px sein', () => {
      const ir = toIR(parse(`Frame x -50`))
      const node = ir.nodes[0]
      console.log('x -50:', getStyle(node, 'left'))
      expect(getStyle(node, 'left')).toBe('-50px')
    })

    test('rotate -45 sollte rotate(-45deg) sein', () => {
      const ir = toIR(parse(`Frame rotate -45`))
      const node = ir.nodes[0]
      console.log('rotate -45:', getStyle(node, 'transform'))
      expect(getStyle(node, 'transform')).toBe('rotate(-45deg)')
    })

    test('translate -10 -20 sollte translate(-10px, -20px) sein', () => {
      const ir = toIR(parse(`Frame translate -10 -20`))
      const node = ir.nodes[0]
      console.log('translate -10 -20:', getStyle(node, 'transform'))
      expect(getStyle(node, 'transform')).toBe('translate(-10px, -20px)')
    })

  })

  // ============================================================
  // 2. Border Shortcuts
  // ============================================================
  describe('Border Shortcuts', () => {

    test('bor 1 #333 - shorthand mit Farbe', () => {
      const ir = toIR(parse(`Frame bor 1 #333`))
      const node = ir.nodes[0]
      console.log('bor 1 #333:', getStyle(node, 'border'))
      // Erwartet: "1px solid #333" oder ähnlich
      const border = getStyle(node, 'border')
      expect(border).toBeDefined()
      expect(border).toContain('1px')
      expect(border).toContain('#333')
    })

    test('bor 2 - nur Breite, ohne Farbe', () => {
      const ir = toIR(parse(`Frame bor 2`))
      const node = ir.nodes[0]
      console.log('bor 2:', getStyle(node, 'border'))
      const border = getStyle(node, 'border')
      expect(border).toBeDefined()
      expect(border).toContain('2px')
    })

    test('boc #f00 ohne bor - setzt border-color alleine?', () => {
      const ir = toIR(parse(`Frame boc #f00`))
      const node = ir.nodes[0]
      console.log('boc #f00:', getStyle(node, 'border-color'))
      expect(getStyle(node, 'border-color')).toBe('#f00')
    })

    test('rad tl 8 - einzelne Ecke', () => {
      const ir = toIR(parse(`Frame rad tl 8`))
      const node = ir.nodes[0]
      console.log('rad tl 8:', getStyle(node, 'border-top-left-radius'))
      expect(getStyle(node, 'border-top-left-radius')).toBe('8px')
    })

    test('rad t 8 - obere Kante (beide Ecken)', () => {
      const ir = toIR(parse(`Frame rad t 8`))
      const node = ir.nodes[0]
      console.log('rad t 8 tl:', getStyle(node, 'border-top-left-radius'))
      console.log('rad t 8 tr:', getStyle(node, 'border-top-right-radius'))
      expect(getStyle(node, 'border-top-left-radius')).toBe('8px')
      expect(getStyle(node, 'border-top-right-radius')).toBe('8px')
    })

  })

  // ============================================================
  // 3. Padding/Margin Partial Override
  // ============================================================
  describe('Partial Override', () => {

    test('pad 10 dann pad left 20 - überschreibt nur links?', () => {
      const ir = toIR(parse(`Frame pad 10 pad left 20`))
      const node = ir.nodes[0]
      console.log('pad styles:', node.styles.filter((s: any) => s.property.includes('padding')))
      // Erwartung unklar: Überschreibt pad left 20 das pad 10 komplett?
      // Oder nur padding-left?
    })

    test('margin 10 margin top 0 - top auf 0 setzen', () => {
      const ir = toIR(parse(`Frame margin 10 margin top 0`))
      const node = ir.nodes[0]
      console.log('margin styles:', node.styles.filter((s: any) => s.property.includes('margin')))
    })

  })

  // ============================================================
  // 4. Extreme Vererbung
  // ============================================================
  describe('Extreme Vererbung', () => {

    test('4 Ebenen: A extends B extends C extends D', () => {
      const ir = toIR(parse(`
D as Frame:
  bg #111
  gap 5

C extends D:
  bg #222
  pad 10

B extends C:
  bg #333
  w 200

A extends B:
  bg #444
  h 100

A
`))
      const node = ir.nodes[0]
      console.log('4-level inheritance:', {
        bg: getStyle(node, 'background'),
        gap: getStyle(node, 'gap'),
        pad: getStyle(node, 'padding'),
        w: getStyle(node, 'width'),
        h: getStyle(node, 'height'),
      })

      // A sollte alle Properties haben, mit überschriebenem bg
      expect(getStyle(node, 'background')).toBe('#444')
      expect(getStyle(node, 'gap')).toBe('5px')
      expect(getStyle(node, 'padding')).toBe('10px')
      expect(getStyle(node, 'width')).toBe('200px')
      expect(getStyle(node, 'height')).toBe('100px')
    })

    test('Vererbung mit Kind-Override', () => {
      const ir = toIR(parse(`
Parent as Frame:
  Text "Parent"

Child extends Parent:
  Text "Child"

Child
`))
      const node = ir.nodes[0]
      console.log('Child children count:', node.children.length)
      // Erwartet: 2 Texte (Parent + Child werden zusammengefügt)
      expect(node.children.length).toBe(2)
    })

  })

  // ============================================================
  // 5. Unmögliche Constraints
  // ============================================================
  describe('Unmögliche Constraints', () => {

    test('minw 200 maxw 100 - minw > maxw', () => {
      const ir = toIR(parse(`Frame minw 200 maxw 100`))
      const node = ir.nodes[0]
      console.log('minw > maxw:', {
        minw: getStyle(node, 'min-width'),
        maxw: getStyle(node, 'max-width'),
      })
      // Beide sollten gesetzt sein (Browser löst Konflikt)
      expect(getStyle(node, 'min-width')).toBe('200px')
      expect(getStyle(node, 'max-width')).toBe('100px')
    })

    test('w 100 w full w 50 - dreifach, letzter gewinnt', () => {
      const ir = toIR(parse(`Frame w 100 w full w 50`))
      const node = ir.nodes[0]
      console.log('w 100 w full w 50:', getStyle(node, 'width'))
      expect(getStyle(node, 'width')).toBe('50px')
    })

    test('h 0 - Höhe 0 erlaubt?', () => {
      const ir = toIR(parse(`Frame h 0`))
      const node = ir.nodes[0]
      console.log('h 0:', getStyle(node, 'height'))
      expect(getStyle(node, 'height')).toBe('0px')
    })

  })

  // ============================================================
  // 6. Position Extremfälle
  // ============================================================
  describe('Position Extremfälle', () => {

    test('pin alle 4 Seiten gleichzeitig', () => {
      const ir = toIR(parse(`
Frame pos
  Frame pin-left 10 pin-right 10 pin-top 10 pin-bottom 10
`))
      const child = ir.nodes[0].children[0]
      console.log('pin all 4:', {
        left: getStyle(child, 'left'),
        right: getStyle(child, 'right'),
        top: getStyle(child, 'top'),
        bottom: getStyle(child, 'bottom'),
      })
      expect(getStyle(child, 'left')).toBe('10px')
      expect(getStyle(child, 'right')).toBe('10px')
      expect(getStyle(child, 'top')).toBe('10px')
      expect(getStyle(child, 'bottom')).toBe('10px')
    })

    test('z 999 - sehr hoher z-index', () => {
      const ir = toIR(parse(`Frame z 999`))
      const node = ir.nodes[0]
      console.log('z 999:', getStyle(node, 'z-index'))
      expect(getStyle(node, 'z-index')).toBe('999')
    })

    test('fixed Position', () => {
      const ir = toIR(parse(`Frame fixed`))
      const node = ir.nodes[0]
      console.log('fixed:', getStyle(node, 'position'))
      expect(getStyle(node, 'position')).toBe('fixed')
    })

  })

  // ============================================================
  // 7. Font Edge Cases
  // ============================================================
  describe('Font Edge Cases', () => {

    test('weight 100 - numerisches Gewicht', () => {
      const ir = toIR(parse(`Text "Test" weight 100`))
      const node = ir.nodes[0]
      console.log('weight 100:', getStyle(node, 'font-weight'))
      expect(getStyle(node, 'font-weight')).toBe('100')
    })

    test('weight thin - Keyword', () => {
      const ir = toIR(parse(`Text "Test" weight thin`))
      const node = ir.nodes[0]
      console.log('weight thin:', getStyle(node, 'font-weight'))
      expect(getStyle(node, 'font-weight')).toBe('100')
    })

    test('font mono fs 14 - Kombination', () => {
      const ir = toIR(parse(`Text "Code" font mono fs 14`))
      const node = ir.nodes[0]
      console.log('font mono fs 14:', {
        font: getStyle(node, 'font-family'),
        size: getStyle(node, 'font-size'),
      })
      expect(getStyle(node, 'font-family')).toContain('mono')
      expect(getStyle(node, 'font-size')).toBe('14px')
    })

    test('line 1.5 - line-height', () => {
      const ir = toIR(parse(`Text "Test" line 1.5`))
      const node = ir.nodes[0]
      console.log('line 1.5:', getStyle(node, 'line-height'))
      expect(getStyle(node, 'line-height')).toBe('1.5')
    })

  })

  // ============================================================
  // 8. States mit mehreren Properties
  // ============================================================
  describe('States mit mehreren Properties', () => {

    test('hover-bg UND hover-col gleichzeitig', () => {
      const ir = toIR(parse(`Frame bg #fff col #000 hover-bg #000 hover-col #fff`))
      const node = ir.nodes[0]
      console.log('hover styles:', node.styles.filter((s: any) => s.state === 'hover'))

      expect(getStyle(node, 'background')).toBe('#fff')
      expect(getStyle(node, 'color')).toBe('#000')
      expect(getStateStyle(node, 'background', 'hover')).toBe('#000')
      expect(getStateStyle(node, 'color', 'hover')).toBe('#fff')
    })

    test('hover-scale - Transform in Hover', () => {
      const ir = toIR(parse(`Frame hover-scale 1.1`))
      const node = ir.nodes[0]
      console.log('hover-scale:', node.styles.filter((s: any) => s.state === 'hover'))
      // Transform in hover - funktioniert das?
      const hoverTransform = getStateStyle(node, 'transform', 'hover')
      console.log('hover transform:', hoverTransform)
    })

    test('hover-opacity', () => {
      const ir = toIR(parse(`Frame opacity 1 hover-opacity 0.5`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'opacity')).toBe('1')
      expect(getStateStyle(node, 'opacity', 'hover')).toBe('0.5')
    })

  })

  // ============================================================
  // 9. Events (falls implementiert)
  // ============================================================
  describe('Events', () => {

    test('onclick - wird geparst?', () => {
      const ast = parse(`Button "Click" onclick show Dialog`)
      console.log('onclick AST:', JSON.stringify(ast.instances[0].properties, null, 2))
      // Prüfen ob onclick als Property erkannt wird
    })

    // BUG FIXED: onkeydown enter: now works correctly
    test('onkeydown enter - Tastatur-Event', () => {
      const ast = parse(`Input onkeydown enter: submit`)
      const event = ast.instances[0].events?.[0]
      expect(event?.name).toBe('onkeydown')
      expect(event?.key).toBe('enter')
      expect(event?.actions[0]?.name).toBe('submit')
    })

  })

  // ============================================================
  // 10. Leere und minimale Fälle
  // ============================================================
  describe('Leere und Minimale Fälle', () => {

    test('Leerer Code', () => {
      const ir = toIR(parse(``))
      expect(ir.nodes.length).toBe(0)
    })

    test('Nur Whitespace', () => {
      const ir = toIR(parse(`

   `))
      expect(ir.nodes.length).toBe(0)
    })

    test('Nur Kommentar', () => {
      const ir = toIR(parse(`// Das ist ein Kommentar`))
      expect(ir.nodes.length).toBe(0)
    })

    test('Text mit leerem String', () => {
      const ir = toIR(parse(`Text ""`))
      const node = ir.nodes[0]
      // Content ist in properties als textContent
      const textContent = node.properties.find((p: any) => p.name === 'textContent')
      expect(textContent?.value).toBe('')
    })

  })

  // ============================================================
  // 11. Spezielle Zeichen
  // ============================================================
  describe('Spezielle Zeichen', () => {

    function getTextContent(node: any): string | undefined {
      const prop = node.properties.find((p: any) => p.name === 'textContent')
      return prop?.value
    }

    test('Text mit Anführungszeichen', () => {
      const ir = toIR(parse(`Text "Er sagte: \\"Hallo\\""`))
      const node = ir.nodes[0]
      console.log('escaped quotes:', getTextContent(node))
    })

    test('Text mit Umlauten', () => {
      const ir = toIR(parse(`Text "Größe: üblich"`))
      const node = ir.nodes[0]
      console.log('umlauts:', getTextContent(node))
      expect(getTextContent(node)).toBe('Größe: üblich')
    })

    test('Text mit Emoji', () => {
      const ir = toIR(parse(`Text "Hello 👋 World"`))
      const node = ir.nodes[0]
      console.log('emoji:', getTextContent(node))
      expect(getTextContent(node)).toBe('Hello 👋 World')
    })

  })

})
