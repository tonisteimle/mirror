/**
 * Token Usage 013: Token-Verwendung testen
 *
 * ERKENNTNIS: Tokens werden zu CSS-Variablen (var(--name)) kompiliert.
 * Das ist KORREKT - ermöglicht Runtime-Theming.
 *
 * Getestet wird:
 * - Token → CSS Variable korrekt
 * - Token in verschachtelten Strukturen
 * - Token + Vererbung
 * - Token in States (BUG GEFUNDEN)
 */

import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

describe('Token Usage', () => {

  function getStyle(node: any, property: string): string | undefined {
    if (!node?.styles) return undefined
    const matches = node.styles.filter((s: any) => s.property === property)
    return matches.length > 0 ? matches[matches.length - 1].value : undefined
  }

  function getStateStyle(node: any, property: string, state: string): string | undefined {
    if (!node?.styles) return undefined
    const match = node.styles.find((s: any) => s.property === property && s.state === state)
    return match?.value
  }

  // ============================================================
  // 1. Token → CSS Variable (korrektes Verhalten)
  // ============================================================
  describe('Token → CSS Variable', () => {

    test('Farb-Token wird zu var(--name)', () => {
      const ir = toIR(parse(`
primary: #3B82F6

Frame bg primary
`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'background')).toBe('var(--primary)')
    })

    test('Size-Token wird zu var(--name)', () => {
      const ir = toIR(parse(`
sm: 8

Frame pad sm
`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'padding')).toBe('var(--sm)')
    })

    test('Token mit $ Prefix', () => {
      const ir = toIR(parse(`
primary: #3B82F6

Frame bg $primary
`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'background')).toBe('var(--primary)')
    })

    test('Token mit Bindestrich', () => {
      const ir = toIR(parse(`
primary-dark: #1E40AF

Frame bg primary-dark
`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'background')).toBe('var(--primary-dark)')
    })

  })

  // ============================================================
  // 2. Token in verschachtelten Strukturen
  // ============================================================
  describe('Token Verschachtelung', () => {

    test('Token in Kind-Element', () => {
      const ir = toIR(parse(`
primary: #3B82F6

Frame
  Frame bg primary
`))
      const child = ir.nodes[0].children[0]
      expect(getStyle(child, 'background')).toBe('var(--primary)')
    })

    test('Token 3 Ebenen tief', () => {
      const ir = toIR(parse(`
danger: #EF4444

Frame
  Frame
    Frame bg danger
`))
      const deepChild = ir.nodes[0].children[0].children[0]
      expect(getStyle(deepChild, 'background')).toBe('var(--danger)')
    })

    test('Mehrere Tokens in einem Element', () => {
      const ir = toIR(parse(`
primary: #3B82F6
sm: 8
md: 16

Frame bg primary pad sm gap md
`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'background')).toBe('var(--primary)')
      expect(getStyle(node, 'padding')).toBe('var(--sm)')
      expect(getStyle(node, 'gap')).toBe('var(--md)')
    })

  })

  // ============================================================
  // 3. Token + Vererbung
  // ============================================================
  describe('Token + Vererbung', () => {

    test('Token in Basis-Komponente', () => {
      const ir = toIR(parse(`
primary: #3B82F6

Card as Frame:
  bg primary
  pad 16

Card
`))
      const node = ir.nodes[0]

      expect(getStyle(node, 'background')).toBe('var(--primary)')
      expect(getStyle(node, 'padding')).toBe('16px')
    })

    test('Kind überschreibt Token mit anderem Token', () => {
      const ir = toIR(parse(`
primary: #3B82F6
danger: #EF4444

Card as Frame:
  bg primary

DangerCard extends Card:
  bg danger

DangerCard
`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'background')).toBe('var(--danger)')
    })

    test('Kind überschreibt Token mit Literal', () => {
      const ir = toIR(parse(`
primary: #3B82F6

Card as Frame:
  bg primary

GreenCard extends Card:
  bg #00FF00

GreenCard
`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'background')).toBe('#00FF00')
    })

  })

  // ============================================================
  // 4. Token Edge Cases
  // ============================================================
  describe('Token Edge Cases', () => {

    test('Token überschreibt Token auf gleicher Zeile: letzter gewinnt', () => {
      const ir = toIR(parse(`
red: #FF0000
blue: #0000FF

Frame bg red bg blue
`))
      const node = ir.nodes[0]
      expect(getStyle(node, 'background')).toBe('var(--blue)')
    })

    test('Undefinierter Token bleibt als String', () => {
      const ir = toIR(parse(`Frame bg undefinedToken`))
      const node = ir.nodes[0]
      const bg = getStyle(node, 'background')
      // Sollte NICHT crashen
      expect(ir.nodes.length).toBe(1)
      // Wert ist der Token-Name
      expect(bg).toBe('undefinedToken')
    })

  })

  // ============================================================
  // 5. BUGS: Token in States
  // ============================================================
  describe('Token in States (BUGS)', () => {

    test('Component-Definition + Instanz funktioniert', () => {
      // Component-Definitionen allein erzeugen keine IR-Nodes
      // Nur Instanzen der Definition werden gerendert
      const ir = toIR(parse(`
primary: #3B82F6

Button as button:
  bg primary

Button
`))
      // Die Instanz sollte einen Node erzeugen
      expect(ir.nodes.length).toBeGreaterThan(0)
      expect(ir.nodes[0].tag).toBe('button')
      // Token wird zu CSS-Variable
      const bg = ir.nodes[0].styles.find((s: any) => s.property === 'background')
      expect(bg?.value).toBe('var(--primary)')
    })

    test('Inline hover State wird erkannt', () => {
      const ir = toIR(parse(`
light: #93C5FD

Frame bg #333 hover: bg light
`))
      const node = ir.nodes[0]
      const hoverBg = getStateStyle(node, 'background', 'hover')
      console.log('Inline hover bg:', hoverBg)
      expect(hoverBg).toBe('var(--light)')
    })

    test('Block hover State wird erkannt', () => {
      // Block-Style States (mit Einrückung) funktionieren jetzt
      const ir = toIR(parse(`
light: #93C5FD

Frame bg #333
  hover:
    bg light
`))
      const node = ir.nodes[0]
      const hoverBg = getStateStyle(node, 'background', 'hover')
      console.log('Block hover bg:', hoverBg)
      expect(hoverBg).toBe('var(--light)')
    })

  })

})
