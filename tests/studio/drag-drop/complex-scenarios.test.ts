/**
 * Complex Drag & Drop Scenarios
 *
 * Tests für:
 * - Verschachtelte UIs
 * - Element-Verschiebungen
 * - Zag-Komponenten (Dialog, Select, Tabs)
 */

import { describe, it, expect } from 'vitest'
import { CodeModifier } from '../../../compiler/studio/code-modifier'
import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'

/**
 * Helper: Erstellt CodeModifier und führt addChildWithTemplate aus
 */
function dropComponent(
  code: string,
  containerId: string,
  template: string,
  position?: number
): { success: boolean; newSource: string; error?: string } {
  const ast = parse(code)
  const { sourceMap } = toIR(ast, true)
  const modifier = new CodeModifier(code, sourceMap)
  return modifier.addChildWithTemplate(containerId, template, { position })
}

/**
 * Helper: Verschiebt ein Element (entfernt und fügt neu ein)
 */
function moveElement(
  code: string,
  sourceNodeId: string,
  targetContainerId: string,
  position: number
): { success: boolean; newSource: string } {
  const ast = parse(code)
  const { sourceMap } = toIR(ast, true)
  const modifier = new CodeModifier(code, sourceMap)

  // 1. Element-Code extrahieren aus SourceMap
  const sourceMapping = sourceMap.getNodeById(sourceNodeId)
  if (!sourceMapping) {
    return { success: false, newSource: code }
  }

  // SourceMap speichert position.line (1-basiert)
  const lines = code.split('\n')
  const lineIndex = sourceMapping.position.line - 1
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { success: false, newSource: code }
  }

  const elementLine = lines[lineIndex]
  const elementCode = elementLine.trim()

  // 2. Element entfernen
  const removeResult = modifier.removeNode(sourceNodeId)
  if (!removeResult.success) {
    return { success: false, newSource: code }
  }

  // 3. An neuer Position einfügen - neue SourceMap nach Entfernung
  const newAst = parse(removeResult.newSource)
  const { sourceMap: newSourceMap } = toIR(newAst, true)
  const newModifier = new CodeModifier(removeResult.newSource, newSourceMap)

  return newModifier.addChildWithTemplate(targetContainerId, elementCode, { position })
}

// =============================================================================
// VERSCHACHTELTE UIs
// =============================================================================

describe('Nested UI Structures', () => {
  it('should add component to deeply nested container (3 levels)', () => {
    const code = `Frame gap 16
  Frame gap 12, bg #1a1a1a
    Frame gap 8, bg #2a2a2a
      Text "Deep"`

    // node-1 = outer, node-2 = middle, node-3 = inner
    const result = dropComponent(code, 'node-3', 'Button "Add"')

    expect(result.success).toBe(true)
    // Button sollte mit 6 Spaces eingerückt sein (3 Ebenen)
    expect(result.newSource).toMatch(/\n {6}Button "Add"/)
  })

  it('should add to sibling container', () => {
    const code = `Frame gap 16
  Frame gap 8, bg #1a1a1a
    Text "Container 1"
  Frame gap 8, bg #2a2a2a
    Text "Container 2"`

    // Füge zu Container 2 (node-4 = zweiter inner Frame) hinzu
    const result = dropComponent(code, 'node-4', 'Icon "star"')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Icon "star"')

    // Icon sollte mit 4 Spaces eingerückt sein (gleiche Ebene wie "Container 2")
    expect(result.newSource).toMatch(/\n {4}Icon "star"/)
  })

  it('should maintain structure when adding to root', () => {
    const code = `Frame gap 16
  Frame gap 8
    Text "Nested"
  Text "Sibling"`

    // Füge zum Root (node-1) hinzu
    const result = dropComponent(code, 'node-1', 'Button "Root Level"')

    expect(result.success).toBe(true)
    // Button sollte mit 2 Spaces sein (direkt unter Root)
    expect(result.newSource).toMatch(/\n {2}Button "Root Level"/)
  })
})

// =============================================================================
// ELEMENT-VERSCHIEBUNG
// =============================================================================

describe('Element Movement', () => {
  it('should reorder within same container', () => {
    const code = `Frame gap 8
  Text "First"
  Text "Second"
  Text "Third"`

    // Verschiebe "Third" an Position 0
    const result = moveElement(code, 'node-4', 'node-1', 0)

    expect(result.success).toBe(true)

    // Neue Reihenfolge: Third, First, Second
    const lines = result.newSource.split('\n')
    const textLines = lines.filter(l => l.includes('Text'))
    expect(textLines[0]).toContain('Third')
    expect(textLines[1]).toContain('First')
    expect(textLines[2]).toContain('Second')
  })

  it('should move between containers', () => {
    const code = `Frame gap 16
  Frame gap 8, name source
    Text "Move me"
    Text "Stay here"
  Frame gap 8, name target
    Text "Already here"`

    // Verschiebe "Move me" (node-3) zu target container (node-5)
    const result = moveElement(code, 'node-3', 'node-5', 1)

    expect(result.success).toBe(true)

    // "Move me" sollte jetzt im target container sein
    const lines = result.newSource.split('\n')

    // Source container sollte nur noch "Stay here" haben
    const stayIndex = lines.findIndex(l => l.includes('Stay here'))
    const moveIndex = lines.findIndex(l => l.includes('Move me'))
    const alreadyIndex = lines.findIndex(l => l.includes('Already here'))

    // "Move me" sollte nach "Already here" kommen (im target)
    expect(moveIndex).toBeGreaterThan(alreadyIndex)
  })
})

// =============================================================================
// ZAG-KOMPONENTEN
// =============================================================================

describe('Zag Components', () => {
  describe('Dialog', () => {
    const dialogTemplate = `Dialog
  Trigger:
    Button "Open", pad 12 24, bg #5BA8F5
  Backdrop: bg #00000080
  Content: w 400, bg #1e1e2e, rad 12, pad 24`

    it('should add Dialog with all slots', () => {
      const code = `Frame gap 8`
      const result = dropComponent(code, 'node-1', dialogTemplate)

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Dialog')
      expect(result.newSource).toContain('Trigger:')
      expect(result.newSource).toContain('Backdrop:')
      expect(result.newSource).toContain('Content:')
    })

    it('should maintain Dialog indentation in nested container', () => {
      const code = `Frame gap 16
  Frame gap 8, bg #1a1a1a`

      const result = dropComponent(code, 'node-2', dialogTemplate)

      expect(result.success).toBe(true)
      // Dialog sollte mit 4 Spaces sein
      expect(result.newSource).toMatch(/\n {4}Dialog/)
      // Trigger sollte mit 6 Spaces sein
      expect(result.newSource).toMatch(/\n {6}Trigger:/)
    })
  })

  describe('Select', () => {
    const selectTemplate = `Select placeholder "Choose..."
  Trigger: pad 12, bg #1e1e2e, rad 6
  Content: bg #2a2a3e, rad 8, pad 4
    Item "Option A"
    Item "Option B"
    Item "Option C"`

    it('should add Select with options', () => {
      const code = `Frame gap 8`
      const result = dropComponent(code, 'node-1', selectTemplate)

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Select placeholder "Choose..."')
      expect(result.newSource).toContain('Trigger:')
      expect(result.newSource).toContain('Content:')
      expect(result.newSource).toContain('Item "Option A"')
      expect(result.newSource).toContain('Item "Option B"')
      expect(result.newSource).toContain('Item "Option C"')
    })
  })

  describe('Tabs', () => {
    const tabsTemplate = `Tabs
  List: hor, gap 4, bg #1e1e2e, pad 4, rad 8
    Tab "Tab 1"
    Tab "Tab 2"
    Tab "Tab 3"
  Content: pad 16`

    it('should add Tabs with list and content', () => {
      const code = `Frame gap 8`
      const result = dropComponent(code, 'node-1', tabsTemplate)

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Tabs')
      expect(result.newSource).toContain('List:')
      expect(result.newSource).toContain('Tab "Tab 1"')
      expect(result.newSource).toContain('Content:')
    })
  })

  describe('Checkbox', () => {
    const checkboxTemplate = `Checkbox
  Control: w 20, h 20, bor 1 #555, rad 4
  Label: "Accept terms"`

    it('should add Checkbox with control and label', () => {
      const code = `Frame gap 8`
      const result = dropComponent(code, 'node-1', checkboxTemplate)

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Checkbox')
      expect(result.newSource).toContain('Control:')
      expect(result.newSource).toContain('Label:')
    })
  })

  describe('Switch', () => {
    const switchTemplate = `Switch
  Track: w 44, h 24, rad 12, bg #555
  Thumb: w 20, h 20, rad 10, bg #fff`

    it('should add Switch with track and thumb', () => {
      const code = `Frame gap 8`
      const result = dropComponent(code, 'node-1', switchTemplate)

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Switch')
      expect(result.newSource).toContain('Track:')
      expect(result.newSource).toContain('Thumb:')
    })
  })

  describe('RadioGroup', () => {
    const radioTemplate = `RadioGroup
  RadioItem "Option A"
  RadioItem "Option B"
  RadioItem "Option C"`

    it('should add RadioGroup with items', () => {
      const code = `Frame gap 8`
      const result = dropComponent(code, 'node-1', radioTemplate)

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('RadioGroup')
      expect(result.newSource).toContain('RadioItem "Option A"')
      expect(result.newSource).toContain('RadioItem "Option B"')
    })
  })
})

// =============================================================================
// KOMPLEXE UI ZUSAMMENSTELLUNG
// =============================================================================

describe('Complex UI Assembly', () => {
  it('should build form with multiple Zag components', () => {
    let code = `Frame gap 16, pad 24, bg #1a1a1a, rad 12`

    // 1. Checkbox hinzufügen
    let result = dropComponent(
      code,
      'node-1',
      `Checkbox
  Control: w 20, h 20, bor 1 #555, rad 4
  Label: "Newsletter"`
    )
    expect(result.success).toBe(true)
    code = result.newSource

    // 2. Switch hinzufügen - neue SourceMap benötigt
    const ast2 = parse(code)
    const { sourceMap: sm2 } = toIR(ast2, true)
    const mod2 = new CodeModifier(code, sm2)
    result = mod2.addChildWithTemplate(
      'node-1',
      `Switch
  Track: w 44, h 24, rad 12, bg #555
  Thumb: w 20, h 20, rad 10, bg #fff`
    )
    expect(result.success).toBe(true)
    code = result.newSource

    // 3. Button hinzufügen
    const ast3 = parse(code)
    const { sourceMap: sm3 } = toIR(ast3, true)
    const mod3 = new CodeModifier(code, sm3)
    result = mod3.addChildWithTemplate('node-1', 'Button "Submit", bg #5BA8F5, col white')
    expect(result.success).toBe(true)

    // Finale Prüfung
    expect(result.newSource).toContain('Checkbox')
    expect(result.newSource).toContain('Switch')
    expect(result.newSource).toContain('Button "Submit"')
  })

  it('should build nested card layout', () => {
    let code = `Frame gap 24, pad 32`

    // Card 1 mit Dialog
    let result = dropComponent(
      code,
      'node-1',
      `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Card 1", fs 18, weight bold
  Dialog
    Trigger:
      Button "Open"
    Content: pad 24, bg #2a2a2a`
    )
    expect(result.success).toBe(true)
    code = result.newSource

    // Card 2 mit Select
    const ast2 = parse(code)
    const { sourceMap: sm2 } = toIR(ast2, true)
    const mod2 = new CodeModifier(code, sm2)
    result = mod2.addChildWithTemplate(
      'node-1',
      `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Card 2", fs 18, weight bold
  Select placeholder "Choose..."
    Trigger: pad 12
    Content: bg #2a2a2a
      Item "A"
      Item "B"`
    )
    expect(result.success).toBe(true)

    expect(result.newSource).toContain('Card 1')
    expect(result.newSource).toContain('Dialog')
    expect(result.newSource).toContain('Card 2')
    expect(result.newSource).toContain('Select')
  })
})
