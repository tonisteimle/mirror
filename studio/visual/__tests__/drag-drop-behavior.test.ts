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
// Debug: Was kommt tatsächlich raus?
// ============================================================================

describe('Debug: Aktuelle Ausgaben verstehen', () => {
  it('Zeigt alle Felder von DropResultInfo', () => {
    const { container, posContainer } = setupTestDOM()

    let dropResult: DropResultInfo | null = null
    const service = createDragDropService(container, {}, {
      onDrop: (r) => { dropResult = r }
    })

    service.startPaletteDrag('Button', new MouseEvent('mousedown', {
      clientX: 10, clientY: 10, bubbles: true
    }))

    document.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 200, clientY: 150, bubbles: true
    }))

    document.dispatchEvent(new MouseEvent('mouseup', {
      clientX: 200, clientY: 150, bubbles: true
    }))

    console.log('\n=== DROP RESULT ===')
    console.log('source:', dropResult?.source)
    console.log('targetNodeId:', dropResult?.targetNodeId)
    console.log('placement:', dropResult?.placement)
    console.log('insertionIndex:', dropResult?.insertionIndex)
    console.log('absolutePosition:', dropResult?.absolutePosition)
    console.log('alignment:', dropResult?.alignment)
    console.log('isDuplicate:', dropResult?.isDuplicate)
    console.log('delta:', dropResult?.delta)
    console.log('===================\n')

    // Kein Assert - nur Debug Output
    expect(true).toBe(true)

    cleanup(container, service)
  })
})
