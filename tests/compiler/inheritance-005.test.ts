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

})
