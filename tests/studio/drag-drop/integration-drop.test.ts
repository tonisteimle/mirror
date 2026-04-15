/**
 * Integration Drop Test
 *
 * Testet den kompletten Flow: DragController → Event → CodeModifier
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DragController, resetDragController } from '../../../studio/preview/drag/drag-controller'
import { CodeModifier } from '../../../compiler/studio/code-modifier'
import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'
import type { DragSource, DropTarget } from '../../../studio/preview/drag/types'

/**
 * Simuliert den kompletten Drop-Flow wie in app.js
 */
function simulateDropWithCodeModification(
  code: string,
  source: DragSource,
  target: DropTarget,
  componentCode: string
): { success: boolean; newSource: string } {
  // 1. Parse und erstelle SourceMap
  const ast = parse(code)
  const { sourceMap } = toIR(ast, true)

  // 2. Erstelle CodeModifier
  const modifier = new CodeModifier(code, sourceMap)

  // 3. Füge Kind hinzu (wie handleStudioDropNew in app.js)
  const result = modifier.addChildWithTemplate(target.containerId, componentCode, {
    position: target.insertionIndex,
  })

  return {
    success: result.success,
    newSource: result.newSource,
  }
}

describe('Integration: Drop Flow', () => {
  let controller: DragController

  beforeEach(() => {
    resetDragController()
    controller = new DragController()
  })

  afterEach(() => {
    controller.destroy()
  })

  describe('Palette → Code', () => {
    it('should add Button to empty Frame', async () => {
      const initialCode = `Frame gap 8`

      // Simuliere Drop
      const source: DragSource = { type: 'palette', componentName: 'Button' }
      const target: DropTarget = { containerId: 'node-1', insertionIndex: 0 }

      // Callback simuliert Code-Änderung
      let resultCode = ''
      controller.setCallbacks({
        onDrop: async (src, tgt) => {
          const result = simulateDropWithCodeModification(initialCode, src, tgt, 'Button "Click"')
          resultCode = result.newSource
        },
      })

      await controller.simulateDrop(source, target)

      expect(resultCode).toContain('Button "Click"')
      expect(resultCode).toMatch(/Frame gap 8\n {2}Button "Click"/)
    })

    it('should add Icon at position 0', async () => {
      const initialCode = `Frame gap 8
  Text "Existing"`

      const source: DragSource = { type: 'palette', componentName: 'Icon' }
      const target: DropTarget = { containerId: 'node-1', insertionIndex: 0 }

      let resultCode = ''
      controller.setCallbacks({
        onDrop: async (src, tgt) => {
          const result = simulateDropWithCodeModification(initialCode, src, tgt, 'Icon "star"')
          resultCode = result.newSource
        },
      })

      await controller.simulateDrop(source, target)

      // Icon sollte VOR Text eingefügt werden
      const lines = resultCode.split('\n')
      const iconIndex = lines.findIndex(l => l.includes('Icon'))
      const textIndex = lines.findIndex(l => l.includes('Text'))
      expect(iconIndex).toBeLessThan(textIndex)
    })

    it('should add Checkbox with slots', async () => {
      const initialCode = `Frame gap 8`

      const source: DragSource = { type: 'palette', componentName: 'Checkbox' }
      const target: DropTarget = { containerId: 'node-1', insertionIndex: 0 }

      let resultCode = ''
      controller.setCallbacks({
        onDrop: async (src, tgt) => {
          // Multi-line Template für Checkbox
          const template = `Checkbox
  Control: w 20, h 20
  Label: "Check me"`

          const result = simulateDropWithCodeModification(initialCode, src, tgt, template)
          resultCode = result.newSource
        },
      })

      await controller.simulateDrop(source, target)

      expect(resultCode).toContain('Checkbox')
      expect(resultCode).toContain('Control:')
      expect(resultCode).toContain('Label:')
    })
  })

  describe('Canvas Move → Code', () => {
    it('should move element to different position', async () => {
      const initialCode = `Frame gap 8
  Text "First"
  Text "Second"
  Text "Third"`

      // Verschiebe "Third" an Position 0 (vor "First")
      const source: DragSource = { type: 'canvas', nodeId: 'node-4' }
      const target: DropTarget = { containerId: 'node-1', insertionIndex: 0 }

      let dropCalled = false
      controller.setCallbacks({
        onDrop: async (src, tgt) => {
          dropCalled = true
          // Canvas-Move erfordert: 1. Element entfernen, 2. An neuer Position einfügen
          // Das ist komplexer und wird normalerweise von handleStudioDropNew gemacht
          expect(src.type).toBe('canvas')
          expect(src.nodeId).toBe('node-4')
          expect(tgt.insertionIndex).toBe(0)
        },
      })

      await controller.simulateDrop(source, target)

      expect(dropCalled).toBe(true)
    })
  })

  describe('Nested Containers', () => {
    it('should add to inner container', async () => {
      const initialCode = `Frame gap 12
  Frame gap 8, bg #1a1a1a
    Text "Inner"`

      // Füge Button zum inneren Frame (node-2) hinzu
      const source: DragSource = { type: 'palette', componentName: 'Button' }
      const target: DropTarget = { containerId: 'node-2', insertionIndex: 1 }

      let resultCode = ''
      controller.setCallbacks({
        onDrop: async (src, tgt) => {
          const result = simulateDropWithCodeModification(initialCode, src, tgt, 'Button "Nested"')
          resultCode = result.newSource
        },
      })

      await controller.simulateDrop(source, target)

      // Button sollte mit 4 Spaces eingerückt sein
      expect(resultCode).toMatch(/\n {4}Button "Nested"/)
    })
  })
})
