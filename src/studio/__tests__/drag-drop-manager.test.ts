/**
 * Comprehensive Tests for DragDropManager
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DragDropManager,
  createDragDropManager,
  makeDraggable,
  makeCanvasElementDraggable,
  type DragData,
  type DropResult,
  type DropCallback,
} from '../drag-drop-manager'

// ===========================================
// TEST HELPERS
// ===========================================

// Mock elementFromPoint since jsdom doesn't implement it
let mockElementAtPoint: HTMLElement | null = null

function setupElementFromPointMock() {
  // @ts-ignore - jsdom doesn't have this
  document.elementFromPoint = vi.fn(() => mockElementAtPoint)
}

function setMockElementAtPoint(element: HTMLElement | null) {
  mockElementAtPoint = element
}

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.style.position = 'relative'
  container.style.width = '400px'
  container.style.height = '400px'
  document.body.appendChild(container)
  return container
}

function createNodeElement(nodeId: string, name?: string): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', nodeId)
  if (name) {
    element.dataset.mirrorName = name
  }
  return element
}

function createDragEvent(type: string, data?: { dataTransfer?: Partial<DataTransfer> }): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent

  const mockDataTransfer: Partial<DataTransfer> = {
    types: data?.dataTransfer?.types || ['application/mirror-component'],
    getData: vi.fn((format: string) => {
      if (format === 'application/mirror-component' || format === 'text/plain') {
        return JSON.stringify({ componentName: 'Button' })
      }
      return ''
    }),
    setData: vi.fn(),
    setDragImage: vi.fn(),
    dropEffect: 'copy',
    effectAllowed: 'copy',
    ...data?.dataTransfer,
  }

  Object.defineProperty(event, 'dataTransfer', {
    value: mockDataTransfer,
    writable: false,
  })

  Object.defineProperty(event, 'clientX', { value: 50, writable: true })
  Object.defineProperty(event, 'clientY', { value: 50, writable: true })
  Object.defineProperty(event, 'relatedTarget', { value: null, writable: true })

  return event
}

// ===========================================
// DRAG DROP MANAGER CLASS
// ===========================================

describe('DragDropManager', () => {
  let container: HTMLElement
  let manager: DragDropManager

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
    manager = new DragDropManager(container)
  })

  afterEach(() => {
    manager.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  describe('Construction', () => {
    it('should create with container', () => {
      expect(manager).toBeDefined()
    })

    it('should accept options', () => {
      const onDrop = vi.fn()
      const onDragEnter = vi.fn()
      const customManager = new DragDropManager(container, {
        dataType: 'custom/type',
        onDrop,
        onDragEnter,
      })
      expect(customManager).toBeDefined()
      customManager.dispose()
    })

    it('should attach event listeners on construction', () => {
      const addEventListenerSpy = vi.spyOn(container, 'addEventListener')

      const newManager = new DragDropManager(container)

      expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragenter', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragleave', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function))

      newManager.dispose()
    })
  })

  describe('setCodeModifier', () => {
    it('should set code modifier from source and sourceMap', () => {
      // This requires a valid SourceMap - testing that it doesn't throw
      expect(() => {
        // Create a minimal mock sourceMap
        const mockSourceMap = {
          getNodeById: vi.fn(),
          getAllNodeIds: vi.fn().mockReturnValue([]),
        }
        manager.setCodeModifier('Box pad 10', mockSourceMap as any)
      }).not.toThrow()
    })
  })

  describe('Event Handling - dragenter', () => {
    it('should call onDragEnter callback', () => {
      const onDragEnter = vi.fn()
      const customManager = new DragDropManager(container, { onDragEnter })

      const event = createDragEvent('dragenter')
      container.dispatchEvent(event)

      expect(onDragEnter).toHaveBeenCalled()

      customManager.dispose()
    })

    it('should not trigger multiple times while dragging', () => {
      const onDragEnter = vi.fn()
      const customManager = new DragDropManager(container, { onDragEnter })

      container.dispatchEvent(createDragEvent('dragenter'))
      container.dispatchEvent(createDragEvent('dragenter'))

      expect(onDragEnter).toHaveBeenCalledTimes(1)

      customManager.dispose()
    })
  })

  describe('Event Handling - dragleave', () => {
    it('should call onDragLeave when leaving container', () => {
      const onDragLeave = vi.fn()
      const customManager = new DragDropManager(container, { onDragLeave })

      // First enter
      container.dispatchEvent(createDragEvent('dragenter'))

      // Then leave
      const leaveEvent = createDragEvent('dragleave')
      Object.defineProperty(leaveEvent, 'relatedTarget', { value: document.body })
      container.dispatchEvent(leaveEvent)

      expect(onDragLeave).toHaveBeenCalled()

      customManager.dispose()
    })

    it('should not call onDragLeave when moving within container', () => {
      const onDragLeave = vi.fn()
      const customManager = new DragDropManager(container, { onDragLeave })

      const child = document.createElement('div')
      container.appendChild(child)

      container.dispatchEvent(createDragEvent('dragenter'))

      const leaveEvent = createDragEvent('dragleave')
      Object.defineProperty(leaveEvent, 'relatedTarget', { value: child })
      container.dispatchEvent(leaveEvent)

      expect(onDragLeave).not.toHaveBeenCalled()

      customManager.dispose()
    })
  })

  describe('Event Handling - dragover', () => {
    it('should call onDragOver callback', () => {
      const onDragOver = vi.fn()
      const customManager = new DragDropManager(container, { onDragOver })

      const event = createDragEvent('dragover')
      container.dispatchEvent(event)

      expect(onDragOver).toHaveBeenCalled()

      customManager.dispose()
    })

    it('should prevent default for valid drags', () => {
      const event = createDragEvent('dragover')
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      container.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Event Handling - drop', () => {
    it('should call onDrop callback on drop', () => {
      const onDrop = vi.fn()
      const customManager = new DragDropManager(container, { onDrop })

      const event = createDragEvent('drop')
      container.dispatchEvent(event)

      expect(onDrop).toHaveBeenCalled()

      customManager.dispose()
    })

    it('should report error when no CodeModifier and no drop zone', () => {
      const onDrop = vi.fn<[DropResult], void>()
      const customManager = new DragDropManager(container, { onDrop })

      const event = createDragEvent('drop')
      container.dispatchEvent(event)

      // When there's no drop zone but we have drag data, we try to find root
      // Since no CodeModifier is set, we get this error first
      expect(onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'CodeModifier not initialized. Call setCodeModifier first.',
        })
      )

      customManager.dispose()
    })

    it('should prevent default', () => {
      const event = createDragEvent('drop')
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      container.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('setDragSource', () => {
    it('should set and clear drag source', () => {
      manager.setDragSource('node-1')
      // Internal state, not directly testable, but shouldn't throw
      expect(() => manager.setDragSource(undefined)).not.toThrow()
    })
  })

  describe('getCurrentDropZone', () => {
    it('should return null when no active drag', () => {
      expect(manager.getCurrentDropZone()).toBeNull()
    })
  })

  describe('ensureIndicators', () => {
    it('should not throw when called', () => {
      expect(() => manager.ensureIndicators()).not.toThrow()
    })
  })

  describe('attach/detach', () => {
    it('should detach event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener')

      manager.detach()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragenter', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('dragleave', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function))
    })

    it('should reattach event listeners', () => {
      manager.detach()

      const addEventListenerSpy = vi.spyOn(container, 'addEventListener')
      manager.attach()

      expect(addEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function))
    })
  })

  describe('dispose', () => {
    it('should clean up all resources', () => {
      const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener')

      manager.dispose()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })
  })
})

// ===========================================
// FACTORY FUNCTION
// ===========================================

describe('createDragDropManager', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should create DragDropManager instance', () => {
    const manager = createDragDropManager(container)
    expect(manager).toBeInstanceOf(DragDropManager)
    manager.dispose()
  })

  it('should pass options', () => {
    const onDrop = vi.fn()
    const manager = createDragDropManager(container, { onDrop })
    expect(manager).toBeDefined()
    manager.dispose()
  })
})

// ===========================================
// MAKE DRAGGABLE HELPER
// ===========================================

describe('makeDraggable', () => {
  let element: HTMLElement

  beforeEach(() => {
    element = document.createElement('div')
    document.body.appendChild(element)
  })

  afterEach(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
  })

  it('should make element draggable', () => {
    makeDraggable(element, { componentName: 'Button' })
    expect(element.draggable).toBe(true)
  })

  it('should set drag data on dragstart', () => {
    makeDraggable(element, { componentName: 'Button', properties: 'bg #FF0000' })

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
      'application/mirror-component',
      expect.stringContaining('Button')
    )
    expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
      'text/plain',
      expect.any(String)
    )
  })

  it('should use custom data type', () => {
    makeDraggable(element, { componentName: 'Box' }, 'custom/type')

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
      'custom/type',
      expect.any(String)
    )
  })

  it('should set effectAllowed to copy', () => {
    makeDraggable(element, { componentName: 'Button' })

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(event.dataTransfer?.effectAllowed).toBe('copy')
  })
})

// ===========================================
// MAKE CANVAS ELEMENT DRAGGABLE HELPER
// ===========================================

describe('makeCanvasElementDraggable', () => {
  let container: HTMLElement
  let element: HTMLElement
  let manager: DragDropManager

  beforeEach(() => {
    container = createContainer()
    element = createNodeElement('node-1', 'Button')
    container.appendChild(element)
    manager = new DragDropManager(container)
  })

  afterEach(() => {
    manager.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should make element draggable', () => {
    makeCanvasElementDraggable(element, 'node-1', manager)
    expect(element.draggable).toBe(true)
  })

  it('should return cleanup function', () => {
    const cleanup = makeCanvasElementDraggable(element, 'node-1', manager)
    expect(typeof cleanup).toBe('function')

    cleanup()
    expect(element.draggable).toBe(false)
  })

  it('should set move data on dragstart', () => {
    makeCanvasElementDraggable(element, 'node-1', manager)

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(event.dataTransfer?.setData).toHaveBeenCalledWith(
      'application/mirror-move',
      'node-1'
    )
  })

  it('should set effectAllowed to move', () => {
    makeCanvasElementDraggable(element, 'node-1', manager)

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(event.dataTransfer?.effectAllowed).toBe('move')
  })

  it('should stop propagation on dragstart', () => {
    makeCanvasElementDraggable(element, 'node-1', manager)

    const event = createDragEvent('dragstart')
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

    element.dispatchEvent(event)

    expect(stopPropagationSpy).toHaveBeenCalled()
  })

  it('should set drag source on manager', () => {
    const setDragSourceSpy = vi.spyOn(manager, 'setDragSource')
    makeCanvasElementDraggable(element, 'node-1', manager)

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(setDragSourceSpy).toHaveBeenCalledWith('node-1')
  })

  it('should clear drag source on dragend', () => {
    const setDragSourceSpy = vi.spyOn(manager, 'setDragSource')
    makeCanvasElementDraggable(element, 'node-1', manager)

    const event = createDragEvent('dragend')
    element.dispatchEvent(event)

    expect(setDragSourceSpy).toHaveBeenCalledWith(undefined)
  })

  it('should apply visual styles during drag', () => {
    makeCanvasElementDraggable(element, 'node-1', manager)

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(element.style.opacity).toBe('0.4')
    expect(element.style.outline).toContain('dashed')
  })

  it('should restore styles on dragend', () => {
    makeCanvasElementDraggable(element, 'node-1', manager)

    element.dispatchEvent(createDragEvent('dragstart'))
    element.dispatchEvent(createDragEvent('dragend'))

    expect(element.style.opacity).toBe('')
    expect(element.style.outline).toBe('')
  })

  it('should use transparent drag image', () => {
    makeCanvasElementDraggable(element, 'node-1', manager)

    const event = createDragEvent('dragstart')
    element.dispatchEvent(event)

    expect(event.dataTransfer?.setDragImage).toHaveBeenCalled()
  })
})

// ===========================================
// DRAG DATA INTERFACE
// ===========================================

describe('DragData Interface', () => {
  it('should support basic component data', () => {
    const data: DragData = {
      componentName: 'Button',
    }
    expect(data.componentName).toBe('Button')
  })

  it('should support all optional fields', () => {
    const data: DragData = {
      componentName: 'Button',
      properties: 'bg #FF0000, pad 10',
      textContent: 'Click me',
      sourceNodeId: 'node-1',
      isMove: true,
    }

    expect(data.properties).toBe('bg #FF0000, pad 10')
    expect(data.textContent).toBe('Click me')
    expect(data.sourceNodeId).toBe('node-1')
    expect(data.isMove).toBe(true)
  })
})

// ===========================================
// DROP RESULT INTERFACE
// ===========================================

describe('DropResult Interface', () => {
  it('should represent successful drop', () => {
    const result: DropResult = {
      success: true,
      dropZone: {
        targetId: 'box-1',
        placement: 'inside',
        element: document.createElement('div'),
        parentId: 'box-1',
      },
      modification: {
        success: true,
        newSource: 'Box pad 10\n  Button',
        change: { from: 10, to: 10, insert: '\n  Button' },
      },
    }

    expect(result.success).toBe(true)
    expect(result.dropZone?.targetId).toBe('box-1')
    expect(result.modification?.newSource).toContain('Button')
  })

  it('should represent failed drop', () => {
    const result: DropResult = {
      success: false,
      dropZone: null,
      modification: null,
      error: 'No valid drop zone',
    }

    expect(result.success).toBe(false)
    expect(result.error).toBe('No valid drop zone')
  })
})

// ===========================================
// INTEGRATION SCENARIOS
// ===========================================

describe('Integration Scenarios', () => {
  let container: HTMLElement
  let manager: DragDropManager

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
  })

  afterEach(() => {
    if (manager) {
      manager.dispose()
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('Scenario: Drag component from library', () => {
    const onDrop = vi.fn<[DropResult], void>()
    manager = new DragDropManager(container, { onDrop })

    // Simulate drag from library
    const libraryItem = document.createElement('div')
    makeDraggable(libraryItem, { componentName: 'Card', properties: 'pad 20' })

    // Simulate dragenter -> dragover -> drop sequence
    container.dispatchEvent(createDragEvent('dragenter'))
    container.dispatchEvent(createDragEvent('dragover'))
    container.dispatchEvent(createDragEvent('drop'))

    expect(onDrop).toHaveBeenCalled()
  })

  it('Scenario: Move element within canvas', () => {
    const onDrop = vi.fn()
    const onDragEnter = vi.fn()
    const onDragLeave = vi.fn()

    manager = new DragDropManager(container, { onDrop, onDragEnter, onDragLeave })

    const element = createNodeElement('node-1', 'Button')
    container.appendChild(element)

    const cleanup = makeCanvasElementDraggable(element, 'node-1', manager)

    // Simulate drag start
    element.dispatchEvent(createDragEvent('dragstart'))

    // Simulate drag over container
    container.dispatchEvent(createDragEvent('dragenter'))
    container.dispatchEvent(createDragEvent('dragover'))

    expect(onDragEnter).toHaveBeenCalled()

    cleanup()
  })

  it('Scenario: Full drag-drop lifecycle with callbacks', () => {
    const callbacks = {
      onDragEnter: vi.fn(),
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
    }

    manager = new DragDropManager(container, callbacks)

    // Enter
    container.dispatchEvent(createDragEvent('dragenter'))
    expect(callbacks.onDragEnter).toHaveBeenCalledTimes(1)

    // Over
    container.dispatchEvent(createDragEvent('dragover'))
    expect(callbacks.onDragOver).toHaveBeenCalled()

    // Drop
    container.dispatchEvent(createDragEvent('drop'))
    expect(callbacks.onDrop).toHaveBeenCalled()

    // After drop, entering again should work
    container.dispatchEvent(createDragEvent('dragenter'))
    expect(callbacks.onDragEnter).toHaveBeenCalledTimes(2)
  })
})

// ===========================================
// SOURCEMAP VALIDATION
// ===========================================

describe('SourceMap Validation', () => {
  let container: HTMLElement
  let manager: DragDropManager

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
  })

  afterEach(() => {
    if (manager) {
      manager.dispose()
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should fail when SourceMap root node not in DOM', () => {
    const onDrop = vi.fn<[DropResult], void>()
    manager = new DragDropManager(container, { onDrop })

    // Create a target element
    const target = createNodeElement('box-1', 'Box')
    container.appendChild(target)
    setMockElementAtPoint(target)

    // Create a SourceMap with a root that doesn't exist in DOM
    const mockSourceMap = {
      getNodeById: vi.fn().mockReturnValue({
        nodeId: 'box-1',
        componentName: 'Box',
        line: 1,
        column: 1,
        startOffset: 0,
        endOffset: 10,
      }),
      getAllNodeIds: vi.fn().mockReturnValue(['root-missing', 'box-1']),
      getMainRoot: vi.fn().mockReturnValue({
        nodeId: 'root-missing', // This ID doesn't exist in DOM
        componentName: 'App',
      }),
    }

    manager.setCodeModifier('App\n  Box pad 10', mockSourceMap as any)

    // Simulate drop
    container.dispatchEvent(createDragEvent('dragenter'))
    container.dispatchEvent(createDragEvent('dragover'))
    container.dispatchEvent(createDragEvent('drop'))

    // Should fail with stale SourceMap error
    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('stale'),
      })
    )
  })

  it('should fail when source node not in DOM for move operation', () => {
    const onDrop = vi.fn<[DropResult], void>()
    manager = new DragDropManager(container, { onDrop })

    // Create root and target elements
    const root = createNodeElement('root-1', 'App')
    const target = createNodeElement('box-1', 'Box')
    container.appendChild(root)
    container.appendChild(target)
    setMockElementAtPoint(target)

    const mockSourceMap = {
      getNodeById: vi.fn().mockReturnValue({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 2, column: 3 },
      }),
      getAllNodeIds: vi.fn().mockReturnValue(['root-1', 'box-1']),
      getMainRoot: vi.fn().mockReturnValue({
        nodeId: 'root-1',
        componentName: 'App',
      }),
      getChildren: vi.fn().mockReturnValue([]),
    }

    manager.setCodeModifier('App\n  Box', mockSourceMap as any)

    // Create a move drag event with a source that doesn't exist
    const dropEvent = createDragEvent('drop', {
      dataTransfer: {
        types: ['application/mirror-component', 'application/mirror-move'],
        getData: vi.fn((format: string) => {
          if (format === 'application/mirror-component' || format === 'text/plain') {
            return JSON.stringify({
              componentName: 'Button',
              sourceNodeId: 'ghost-node', // This node doesn't exist!
              isMove: true,
            })
          }
          return ''
        }),
      },
    })

    // Simulate drag and drop
    container.dispatchEvent(createDragEvent('dragenter'))
    container.dispatchEvent(createDragEvent('dragover'))
    container.dispatchEvent(dropEvent)

    // Should fail because source node not in DOM
    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('ghost-node'),
      })
    )
  })

  it('should fail when target node not in DOM', () => {
    const onDrop = vi.fn<[DropResult], void>()
    manager = new DragDropManager(container, { onDrop })

    // Create root element but NOT the target
    const root = createNodeElement('root-1', 'App')
    container.appendChild(root)

    // Point to a non-existent element
    const phantomTarget = createNodeElement('phantom-target', 'Box')
    setMockElementAtPoint(phantomTarget) // Not in container!

    const mockSourceMap = {
      getNodeById: vi.fn().mockReturnValue({
        nodeId: 'phantom-target',
        componentName: 'Box',
      }),
      getAllNodeIds: vi.fn().mockReturnValue(['root-1', 'phantom-target']),
      getMainRoot: vi.fn().mockReturnValue({
        nodeId: 'root-1',
        componentName: 'App',
      }),
    }

    manager.setCodeModifier('App\n  Box pad 10', mockSourceMap as any)

    // Add phantom to container temporarily for elementFromPoint
    container.appendChild(phantomTarget)

    // Simulate dragover to set up drop zone
    container.dispatchEvent(createDragEvent('dragover'))

    // Now remove the phantom before drop
    container.removeChild(phantomTarget)

    // Simulate drop - target no longer in DOM
    container.dispatchEvent(createDragEvent('drop'))

    // Should fail because target not in DOM
    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('not found in DOM'),
      })
    )
  })
})

// ===========================================
// EMPTY CANVAS HANDLING
// ===========================================

describe('Empty Canvas Handling', () => {
  let container: HTMLElement
  let manager: DragDropManager

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
  })

  afterEach(() => {
    if (manager) {
      manager.dispose()
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should fail gracefully when no root element exists', () => {
    const onDrop = vi.fn<[DropResult], void>()
    manager = new DragDropManager(container, { onDrop })

    // SourceMap with NO root
    const mockSourceMap = {
      getNodeById: vi.fn().mockReturnValue(null),
      getAllNodeIds: vi.fn().mockReturnValue([]),
      getMainRoot: vi.fn().mockReturnValue(null), // No root!
    }

    manager.setCodeModifier('', mockSourceMap as any)

    // Simulate drop on empty canvas (no element at point)
    container.dispatchEvent(createDragEvent('dragenter'))
    container.dispatchEvent(createDragEvent('drop'))

    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('No valid drop zone'),
      })
    )
  })

  it('should use root element fallback when drop zone is null but root exists', () => {
    const onDrop = vi.fn<[DropResult], void>()
    // Disable smart sizing to avoid needing full SourceMap mock
    manager = new DragDropManager(container, { onDrop, enableSmartSizing: false })

    // Create root element in container
    const root = createNodeElement('app-root', 'App')
    container.appendChild(root)

    // Full node mapping structure with position
    const appNodeMapping = {
      nodeId: 'app-root',
      componentName: 'App',
      position: { line: 1, column: 1 },
      startOffset: 0,
      endOffset: 3, // 'App' length
    }

    // SourceMap with root - include all methods needed
    const mockSourceMap = {
      getNodeById: vi.fn().mockReturnValue(appNodeMapping),
      getAllNodeIds: vi.fn().mockReturnValue(['app-root']),
      getMainRoot: vi.fn().mockReturnValue(appNodeMapping),
      getChildren: vi.fn().mockReturnValue([]),
    }

    manager.setCodeModifier('App', mockSourceMap as any)

    // Simulate drop but elementFromPoint returns null (empty area)
    setMockElementAtPoint(null)
    container.dispatchEvent(createDragEvent('dragenter'))
    container.dispatchEvent(createDragEvent('drop'))

    // Should use fallback and attempt to insert into root
    expect(onDrop).toHaveBeenCalled()
    const result = onDrop.mock.calls[0][0]

    // The synthetic drop zone should have been used
    expect(result.dropZone).not.toBeNull()
    expect(result.dropZone?.targetId).toBe('app-root')
    expect(result.dropZone?.placement).toBe('inside')
  })
})
