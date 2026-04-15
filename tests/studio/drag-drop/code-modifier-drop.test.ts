/**
 * CodeModifier Drop Test
 *
 * Testet ob CodeModifier.addChild korrekt Code einfügt.
 */

import { describe, it, expect } from 'vitest'
import { CodeModifier } from '../../../compiler/studio/code-modifier'
import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'

/**
 * Helper: Erstellt CodeModifier aus Mirror-Code
 */
function createModifier(code: string): CodeModifier {
  const ast = parse(code)
  const { sourceMap } = toIR(ast, true)
  return new CodeModifier(code, sourceMap)
}

describe('CodeModifier.addChild', () => {
  it('should add Button to empty Frame', () => {
    const code = `Frame gap 8`
    const modifier = createModifier(code)

    const result = modifier.addChild('node-1', 'Button "Click"')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Button "Click"')
    expect(result.newSource).toMatch(/Frame gap 8\n {2}Button "Click"/)
  })

  it('should add Text after existing child', () => {
    const code = `Frame gap 8
  Button "First"`
    const modifier = createModifier(code)

    const result = modifier.addChild('node-1', 'Text "Second"')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Text "Second"')
    // Text sollte nach Button kommen
    const lines = result.newSource.split('\n')
    const buttonIndex = lines.findIndex(l => l.includes('Button'))
    const textIndex = lines.findIndex(l => l.includes('Text'))
    expect(textIndex).toBeGreaterThan(buttonIndex)
  })

  it('should maintain correct indentation', () => {
    const code = `Frame gap 8
  Text "Existing"`
    const modifier = createModifier(code)

    const result = modifier.addChild('node-1', 'Icon "star"')

    expect(result.success).toBe(true)
    // Icon sollte mit 2 Spaces eingerückt sein
    expect(result.newSource).toMatch(/\n {2}Icon "star"/)
  })

  it('should add to nested container', () => {
    const code = `Frame gap 12
  Frame gap 8, bg #1a1a1a
    Text "Inner"`
    const modifier = createModifier(code)

    // Füge zum inneren Frame (node-2) hinzu
    const result = modifier.addChild('node-2', 'Button "Nested"')

    expect(result.success).toBe(true)
    // Button sollte mit 4 Spaces eingerückt sein (innerer Container)
    expect(result.newSource).toMatch(/\n {4}Button "Nested"/)
  })

  it('should insert at specific position', () => {
    const code = `Frame gap 8
  Text "First"
  Text "Third"`
    const modifier = createModifier(code)

    // Füge an Position 1 ein (zwischen First und Third)
    const result = modifier.addChild('node-1', 'Text "Second"', { position: 1 })

    expect(result.success).toBe(true)
    const lines = result.newSource.split('\n')
    const firstIndex = lines.findIndex(l => l.includes('First'))
    const secondIndex = lines.findIndex(l => l.includes('Second'))
    const thirdIndex = lines.findIndex(l => l.includes('Third'))

    expect(secondIndex).toBeGreaterThan(firstIndex)
    expect(secondIndex).toBeLessThan(thirdIndex)
  })
})

describe('CodeModifier.addChildWithTemplate', () => {
  it('should add multi-line template', () => {
    const code = `Frame gap 8`
    const modifier = createModifier(code)

    const template = `Dialog
  Trigger:
    Button "Open"
  Content: pad 24`

    const result = modifier.addChildWithTemplate('node-1', template)

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Dialog')
    expect(result.newSource).toContain('Trigger:')
    expect(result.newSource).toContain('Button "Open"')
  })

  it('should correctly indent multi-line template', () => {
    const code = `Frame gap 8`
    const modifier = createModifier(code)

    const template = `Checkbox
  Control: w 20, h 20
  Label: "Check me"`

    const result = modifier.addChildWithTemplate('node-1', template)

    expect(result.success).toBe(true)
    // Alle Zeilen sollten korrekt eingerückt sein
    const lines = result.newSource.split('\n')
    const checkboxLine = lines.find(l => l.includes('Checkbox'))
    const controlLine = lines.find(l => l.includes('Control:'))

    expect(checkboxLine).toMatch(/^ {2}Checkbox/) // 2 Spaces
    expect(controlLine).toMatch(/^ {4}Control/) // 4 Spaces
  })
})
