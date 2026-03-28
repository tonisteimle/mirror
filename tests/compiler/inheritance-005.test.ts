/**
 * Aggressive Test 005: Vererbung (extends)
 *
 * Kritische Erkenntnis aus dem Code:
 * - Properties werden gemerged (Override gewinnt)
 * - Kinder werden ZUSAMMENGEFÜGT (nicht ersetzt!)
 */

import { parse } from '../../src/parser'
import { toIR } from '../../src/ir'

describe('Vererbung (extends)', () => {

  // Helper
  function getStyle(node: any, property: string): string | undefined {
    const style = node.styles.find((s: any) => s.property === property)
    return style?.value
  }

  // ============================================================
  // Test 5.1: Basis-Vererbung - Properties werden geerbt
  // ============================================================
  test('5.1: Properties werden geerbt', () => {
    const code = `
Button as button:
  pad 16
  bg #f00

DangerButton extends Button:
  col #fff
`
    const ast = parse(code)
    const ir = toIR(ast)

    // Suche DangerButton-Instanz (nicht Definition)
    // Da keine Instanz existiert, müssen wir eine erstellen
    const codeWithInstance = `
Button as button:
  pad 16
  bg #f00

DangerButton extends Button:
  col #fff

DangerButton
`
    const ast2 = parse(codeWithInstance)
    const ir2 = toIR(ast2)

    const instance = ir2.nodes[0]

    // Hat alle Properties: pad von Button, col von DangerButton
    expect(getStyle(instance, 'padding')).toBe('16px')
    expect(getStyle(instance, 'background')).toBe('#f00')
    expect(getStyle(instance, 'color')).toBe('#fff')
  })

  // ============================================================
  // Test 5.2: Property-Override - Kind überschreibt Eltern
  // ============================================================
  test('5.2: Property-Override', () => {
    const code = `
Button as button:
  bg #f00
  pad 16

BlueButton extends Button:
  bg #00f

BlueButton
`
    const ast = parse(code)
    const ir = toIR(ast)

    const instance = ir.nodes[0]

    // bg wurde überschrieben, pad geerbt
    expect(getStyle(instance, 'background')).toBe('#00f')
    expect(getStyle(instance, 'padding')).toBe('16px')
  })

  // ============================================================
  // Test 5.3: KRITISCH - Kinder werden zusammengefügt
  // ============================================================
  test('5.3: Kinder werden zusammengefügt (nicht ersetzt)', () => {
    const code = `
Card as Frame:
  Text "Von Base"

ExtendedCard extends Card:
  Text "Von Child"

ExtendedCard
`
    const ast = parse(code)
    const ir = toIR(ast)

    const instance = ir.nodes[0]

    // Laut Code: children: [...resolvedParent.children, ...component.children]
    // Also sollten BEIDE Texte da sein
    expect(instance.children.length).toBe(2)

    // Reihenfolge: erst Base, dann Child
    expect(instance.children[0].primitive).toBe('text')
    expect(instance.children[1].primitive).toBe('text')
  })

  // ============================================================
  // Test 5.4: Vererbungskette (3 Ebenen)
  // ============================================================
  test('5.4: Vererbungskette', () => {
    const code = `
Base as Frame:
  pad 8

Level1 extends Base:
  bg #f00

Level2 extends Level1:
  rad 4

Level2
`
    const ast = parse(code)
    const ir = toIR(ast)

    const instance = ir.nodes[0]

    // Alle Properties aus der Kette
    expect(getStyle(instance, 'padding')).toBe('8px')
    expect(getStyle(instance, 'background')).toBe('#f00')
    expect(getStyle(instance, 'border-radius')).toBe('4px')
  })

  // ============================================================
  // Test 5.5: Vererbung mit States (hover)
  // ============================================================
  test('5.5: Vererbung mit States', () => {
    const code = `
Button as button:
  bg #333
  hover-bg #555

DangerButton extends Button:
  bg #f00
  hover-bg #c00

DangerButton
`
    const ast = parse(code)
    const ir = toIR(ast)
    const instance = ir.nodes[0]

    // Base styles überschrieben
    expect(getStyle(instance, 'background')).toBe('#f00')

    // Hover styles überschrieben
    const hoverBg = instance.styles.find((s: any) => s.property === 'background' && s.state === 'hover')
    expect(hoverBg?.value).toBe('#c00')
  })

  // ============================================================
  // Test 5.7: Vererbungskette (4 Ebenen)
  // ============================================================
  test('5.7: Vererbungskette 4 Ebenen', () => {
    const code = `
A as Frame:
  pad 4

B extends A:
  bg #111

C extends B:
  rad 8

D extends C:
  col #fff

D
`
    const ast = parse(code)
    const ir = toIR(ast)
    const instance = ir.nodes[0]

    expect(getStyle(instance, 'padding')).toBe('4px')
    expect(getStyle(instance, 'background')).toBe('#111')
    expect(getStyle(instance, 'border-radius')).toBe('8px')
    expect(getStyle(instance, 'color')).toBe('#fff')
  })

  // ============================================================
  // Test 5.8: Mehrere Instanzen einer vererbten Komponente
  // ============================================================
  test('5.8: Mehrere Instanzen sind unabhängig', () => {
    const code = `
Card as Frame:
  pad 16
  bg #333

Card
Card bg #f00
Card bg #0f0
`
    const ast = parse(code)
    const ir = toIR(ast)

    expect(ir.nodes.length).toBe(3)

    // Erste Instanz: Original
    expect(getStyle(ir.nodes[0], 'background')).toBe('#333')

    // Zweite Instanz: Override rot
    expect(getStyle(ir.nodes[1], 'background')).toBe('#f00')

    // Dritte Instanz: Override grün
    expect(getStyle(ir.nodes[2], 'background')).toBe('#0f0')

    // Alle haben pad geerbt
    expect(getStyle(ir.nodes[0], 'padding')).toBe('16px')
    expect(getStyle(ir.nodes[1], 'padding')).toBe('16px')
    expect(getStyle(ir.nodes[2], 'padding')).toBe('16px')
  })

  // ============================================================
  // Test 5.9: Vererbung mit Kind-Styling
  // ============================================================
  test('5.9: Kinder in vererbter Komponente haben eigene Styles', () => {
    const code = `
Card as Frame:
  pad 16
  Text "Title" fs 20
  Text "Body" fs 14

Card
`
    const ast = parse(code)
    const ir = toIR(ast)
    const instance = ir.nodes[0]

    expect(instance.children.length).toBe(2)

    // Kinder haben ihre eigenen Styles
    expect(getStyle(instance.children[0], 'font-size')).toBe('20px')
    expect(getStyle(instance.children[1], 'font-size')).toBe('14px')
  })

  // ============================================================
  // Test 5.10: Vererbung + Layout-Properties
  // ============================================================
  test('5.10: Layout wird korrekt vererbt und überschrieben', () => {
    const code = `
VStack as Frame:
  ver
  gap 10
  center

HStack extends VStack:
  hor

HStack
`
    const ast = parse(code)
    const ir = toIR(ast)
    const instance = ir.nodes[0]

    // hor überschreibt ver
    expect(getStyle(instance, 'flex-direction')).toBe('row')
    // gap wird vererbt
    expect(getStyle(instance, 'gap')).toBe('10px')
  })

})
