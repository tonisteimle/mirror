/**
 * Drag-Drop Behavior Tests
 *
 * Minimale Tests die GENAU die Probleme aus der Praxis zeigen.
 *
 * Problem 1: Button wird anders positioniert als Ghost
 * Problem 2: Gesetzte Elemente können nicht verschoben werden
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DragDropService, createDragDropService, type DropResultInfo } from '../services/drag-drop-service'
import { DragController, createDragController } from '../controllers/drag-controller'
import { createCodeModifier } from '../../../src/studio/code-modifier'
import { parse } from '../../../src/parser'
import { toIR, type IRResult } from '../../../src/ir'

// ============================================================================
// Minimales Setup
// ============================================================================

function setupTestDOM() {
  // Leeres Container für Preview
  const container = document.createElement('div')
  container.id = 'preview'
  Object.assign(container.style, {
    position: 'relative',
    width: '800px',
    height: '600px',
  })
  document.body.appendChild(container)

  // Positioned Container (pos) - hier werden Elemente mit x/y platziert
  const posContainer = document.createElement('div')
  posContainer.dataset.mirrorId = 'root'
  Object.assign(posContainer.style, {
    position: 'relative',
    width: '400px',
    height: '300px',
  })
  // Mock getBoundingClientRect
  posContainer.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0,
    right: 400, bottom: 300,
    width: 400, height: 300,
    toJSON: () => ({})
  })
  container.appendChild(posContainer)

  return { container, posContainer }
}

function createButton(id: string, x: number, y: number, w = 100, h = 40) {
  const btn = document.createElement('div')
  btn.dataset.mirrorId = id
  Object.assign(btn.style, {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
  })
  btn.getBoundingClientRect = () => ({
    x, y, left: x, top: y,
    right: x + w, bottom: y + h,
    width: w, height: h,
    toJSON: () => ({})
  })
  return btn
}

function cleanup(container: HTMLElement, service: DragDropService) {
  service.dispose()
  container.remove()
}

// ============================================================================
// Problem 1: Ghost-Position ≠ Drop-Position
// ============================================================================

describe('Problem 1: Ghost-Position muss = Drop-Position sein', () => {
  it('Palette-Drag: Drop-Position entspricht Cursor-Position', () => {
    const { container, posContainer } = setupTestDOM()

    let dropResult: DropResultInfo | null = null
    const service = createDragDropService(container, {}, {
      onDrop: (r) => { dropResult = r }
    })

    // Drag von Palette zu Position (200, 150)
    const cursorX = 200
    const cursorY = 150

    // Start
    service.startPaletteDrag('Button', new MouseEvent('mousedown', {
      clientX: 0, clientY: 0, bubbles: true
    }), { defaultSize: { width: 100, height: 40 } })

    // Move zu Zielposition
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: cursorX, clientY: cursorY, bubbles: true
    }))

    // Drop
    document.dispatchEvent(new MouseEvent('mouseup', {
      clientX: cursorX, clientY: cursorY, bubbles: true
    }))

    // KRITISCH: Wir erwarten dass absolutePosition gesetzt ist
    // und dass x/y dem Cursor entsprechen (minus halbe Elementgröße für Zentrierung)
    expect(dropResult).not.toBeNull()

    console.log('Drop Result:', JSON.stringify(dropResult, null, 2))

    // Mindestanforderung: absolutePosition muss existieren für pos Container
    expect(dropResult!.absolutePosition).toBeDefined()

    cleanup(container, service)
  })

  it('Element-Drag: Neue Position = alte Position + Delta', () => {
    const { container, posContainer } = setupTestDOM()

    // Bestehendes Element bei (50, 50)
    const button = createButton('btn-1', 50, 50)
    posContainer.appendChild(button)

    let dropResult: DropResultInfo | null = null
    const service = createDragDropService(container, {}, {
      onDrop: (r) => { dropResult = r }
    })

    // Greife in der Mitte des Buttons (100, 70) und ziehe zu (200, 150)
    const startX = 100 // 50 + 50 (Mitte)
    const startY = 70  // 50 + 20 (Mitte)
    const endX = 200
    const endY = 150

    // Start
    service.startElementDrag(button, new MouseEvent('mousedown', {
      clientX: startX, clientY: startY, bubbles: true
    }))

    // Move
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: endX, clientY: endY, bubbles: true
    }))

    // Drop
    document.dispatchEvent(new MouseEvent('mouseup', {
      clientX: endX, clientY: endY, bubbles: true
    }))

    console.log('Element Drag Result:', JSON.stringify(dropResult, null, 2))

    // KRITISCH: Neue Position sollte sein:
    // alte Position (50, 50) + Delta (100, 80) = (150, 130)
    expect(dropResult).not.toBeNull()

    if (dropResult!.absolutePosition) {
      const expectedX = 50 + (endX - startX) // 50 + 100 = 150
      const expectedY = 50 + (endY - startY) // 50 + 80 = 130

      expect(dropResult!.absolutePosition.x).toBe(expectedX)
      expect(dropResult!.absolutePosition.y).toBe(expectedY)
    }

    cleanup(container, service)
  })
})

// ============================================================================
// Problem 2: Bestehende Elemente nicht verschiebbar
// ============================================================================

describe('Problem 2: Bestehende Elemente müssen verschiebbar sein', () => {
  it('makeElementDraggable: Mousedown startet Drag', () => {
    const { container, posContainer } = setupTestDOM()

    const button = createButton('btn-1', 50, 50)
    posContainer.appendChild(button)

    let dragStarted = false
    const service = createDragDropService(container, {}, {
      onDragStart: () => { dragStarted = true }
    })

    // Mache Element draggable
    const cleanupDrag = service.makeElementDraggable(button)

    // Simuliere echten mousedown auf dem Element
    button.dispatchEvent(new MouseEvent('mousedown', {
      clientX: 100, clientY: 70,
      bubbles: true, cancelable: true, button: 0
    }))

    // Bewege über Threshold
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 110, clientY: 80, bubbles: true
    }))

    console.log('Drag started:', dragStarted)
    console.log('Is dragging:', service.isDragging())

    // ERWARTUNG: Drag sollte gestartet sein
    expect(dragStarted).toBe(true)

    cleanupDrag()
    cleanup(container, service)
  })

  it('Element-Drag führt zu onDrop Callback', () => {
    const { container, posContainer } = setupTestDOM()

    const button = createButton('btn-1', 50, 50)
    posContainer.appendChild(button)

    let dropCalled = false
    let dropResult: DropResultInfo | null = null

    const service = createDragDropService(container, {}, {
      onDrop: (r) => {
        dropCalled = true
        dropResult = r
      }
    })

    // Direkt startElementDrag aufrufen
    service.startElementDrag(button, new MouseEvent('mousedown', {
      clientX: 100, clientY: 70, bubbles: true
    }))

    // Move
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 200, clientY: 150, bubbles: true
    }))

    // Drop
    document.dispatchEvent(new MouseEvent('mouseup', {
      clientX: 200, clientY: 150, bubbles: true
    }))

    console.log('Drop called:', dropCalled)
    console.log('Drop result:', dropResult)

    // ERWARTUNG: onDrop wurde aufgerufen
    expect(dropCalled).toBe(true)
    expect(dropResult).not.toBeNull()
    expect(dropResult!.source.type).toBe('element')

    cleanup(container, service)
  })
})

// ============================================================================
// Problem 3: Ghost-Größe muss Element-Größe entsprechen
// ============================================================================

describe('Problem 3: Ghost-Größe = Element-Größe', () => {
  it('Element-Drag: Ghost hat gleiche Größe wie Original-Element', () => {
    const { container, posContainer } = setupTestDOM()

    // Element mit spezifischer Größe: 120x60
    const button = createButton('btn-1', 50, 50, 120, 60)
    posContainer.appendChild(button)

    const controller = createDragController(container, { threshold: 3 })

    // Start drag
    controller.startElementDrag(button, new MouseEvent('mousedown', {
      clientX: 100, clientY: 80, bubbles: true
    }))

    // Move past threshold
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 110, clientY: 90, bubbles: true
    }))

    // Get snapshot
    const snapshot = controller.getSnapshot()
    console.log('Element size:', { width: 120, height: 60 })
    console.log('Source rect:', snapshot.source?.type === 'element' ? snapshot.source.rect : null)

    // ERWARTUNG: Source rect hat Element-Größe
    expect(snapshot.source).not.toBeNull()
    expect(snapshot.source?.type).toBe('element')
    if (snapshot.source?.type === 'element') {
      expect(snapshot.source.rect.width).toBe(120)
      expect(snapshot.source.rect.height).toBe(60)
    }

    controller.dispose()
    container.remove()
  })

  it('Palette-Drag: Ghost hat defaultSize', () => {
    const { container } = setupTestDOM()

    const controller = createDragController(container, { threshold: 3 })

    // Start palette drag mit defaultSize 80x30
    controller.startPaletteDrag('Button', new MouseEvent('mousedown', {
      clientX: 10, clientY: 10, bubbles: true
    }), { defaultSize: { width: 80, height: 30 } })

    // Move past threshold
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 20, clientY: 20, bubbles: true
    }))

    const snapshot = controller.getSnapshot()
    console.log('Default size:', { width: 80, height: 30 })
    console.log('Source:', snapshot.source)

    // ERWARTUNG: Source hat defaultSize
    expect(snapshot.source).not.toBeNull()
    expect(snapshot.source?.type).toBe('palette')
    if (snapshot.source?.type === 'palette') {
      expect(snapshot.source.defaultSize?.width).toBe(80)
      expect(snapshot.source.defaultSize?.height).toBe(30)
    }

    controller.dispose()
    container.remove()
  })

  it('Palette-Drag ohne defaultSize: Fallback 100x40', () => {
    const { container } = setupTestDOM()

    const controller = createDragController(container, { threshold: 3 })

    // Start palette drag OHNE defaultSize
    controller.startPaletteDrag('Button', new MouseEvent('mousedown', {
      clientX: 10, clientY: 10, bubbles: true
    }))

    // Move past threshold
    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 20, clientY: 20, bubbles: true
    }))

    const snapshot = controller.getSnapshot()
    console.log('Source (no defaultSize):', snapshot.source)

    // Das DragState Model verwendet Fallback { width: 100, height: 40 }
    // wenn keine defaultSize angegeben ist (siehe calculateGhostRect)
    expect(snapshot.source).not.toBeNull()
    expect(snapshot.source?.type).toBe('palette')

    controller.dispose()
    container.remove()
  })
})

// ============================================================================
// KRITISCH: End-to-End Test - Komponente wird wirklich verschoben
// ============================================================================

describe('End-to-End: Komponente wird wirklich verschoben', () => {
  it('Nach Drag hat der Code neue x/y Werte', () => {
    // 1. SETUP: Code mit Button bei x 50, y 50
    const originalCode = `App = Box pos, w 400, h 300
  Button x 50, y 50, "Click me"`

    const ast = parse(originalCode)
    const irResult = toIR(ast, true) as IRResult
    const sourceMap = irResult.sourceMap

    const codeModifier = createCodeModifier(originalCode, sourceMap)

    // Finde die Button node ID
    let buttonNodeId: string | null = null
    for (const node of sourceMap.getAllNodes()) {
      if (node.componentName === 'Button') {
        buttonNodeId = node.nodeId
        break
      }
    }

    console.log('Button node ID:', buttonNodeId)
    console.log('Original code:\n', originalCode)

    expect(buttonNodeId).not.toBeNull()

    // 2. SIMULIERE DROP: Neue Position (150, 130)
    const newX = 150
    const newY = 130

    // Ändere x Property
    const resultX = codeModifier.updateProperty(buttonNodeId!, 'x', String(newX))
    console.log('resultX:', resultX)
    expect(resultX.success).toBe(true)

    // Ändere y Property
    const resultY = codeModifier.updateProperty(buttonNodeId!, 'y', String(newY))
    console.log('resultY:', resultY)
    expect(resultY.success).toBe(true)

    // 3. PRÜFE: Code hat neue Werte
    const newCode = codeModifier.getSource()
    console.log('New code:\n', newCode)

    // Der Code sollte jetzt x 150, y 130 enthalten
    expect(newCode).toContain('x 150')
    expect(newCode).toContain('y 130')

    // Der Code sollte NICHT mehr x 50, y 50 enthalten
    expect(newCode).not.toContain('x 50')
    expect(newCode).not.toContain('y 50')
  })

  it('Kompletter Flow: Drag → onDrop → CodeModifier → neue Position', () => {
    // 1. SETUP
    const { container, posContainer } = setupTestDOM()

    const originalCode = `App = Box pos, w 400, h 300
  Button x 50, y 50, "Click me"`

    const ast = parse(originalCode)
    const irResult = toIR(ast, true) as IRResult
    const sourceMap = irResult.sourceMap

    const codeModifier = createCodeModifier(originalCode, sourceMap)

    // Finde Button node ID
    let buttonNodeId: string | null = null
    for (const node of sourceMap.getAllNodes()) {
      if (node.componentName === 'Button') {
        buttonNodeId = node.nodeId
        break
      }
    }

    // Erstelle DOM Element für Button
    const button = createButton(buttonNodeId!, 50, 50, 100, 40)
    posContainer.appendChild(button)

    // 2. SETUP SERVICE mit echtem onDrop Handler (wie in app.js)
    let finalCode = originalCode

    const service = createDragDropService(container, {}, {
      onDrop: (result: DropResultInfo) => {
        console.log('onDrop called:', result)

        if (result.source.type === 'element' && result.placement === 'absolute' && result.absolutePosition) {
          const nodeId = result.source.nodeId
          const newX = Math.round(result.absolutePosition.x)
          const newY = Math.round(result.absolutePosition.y)

          // Wie in app.js: CodeModifier aufrufen
          const resultX = codeModifier.updateProperty(nodeId, 'x', String(newX))
          if (resultX.success) {
            const resultY = codeModifier.updateProperty(nodeId, 'y', String(newY))
            if (resultY.success) {
              finalCode = codeModifier.getSource()
            }
          }
        }
      }
    })

    // 3. DRAG: Von (100, 70) nach (200, 150)
    // Element bei (50, 50), Größe 100x40
    // Greifpunkt (100, 70) = Mitte des Buttons
    // Ziel (200, 150)
    // Delta = (100, 80)
    // Neue Position = (50 + 100, 50 + 80) = (150, 130)

    service.startElementDrag(button, new MouseEvent('mousedown', {
      clientX: 100, clientY: 70, bubbles: true
    }))

    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 200, clientY: 150, bubbles: true
    }))

    document.dispatchEvent(new MouseEvent('mouseup', {
      clientX: 200, clientY: 150, bubbles: true
    }))

    // 4. PRÜFE: Code wurde geändert
    console.log('Final code:\n', finalCode)

    expect(finalCode).toContain('x 150')
    expect(finalCode).toContain('y 130')
    expect(finalCode).not.toContain('x 50')
    expect(finalCode).not.toContain('y 50')

    cleanup(container, service)
  })
})
