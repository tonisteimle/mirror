/**
 * Comprehensive Tests for SelectionManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SelectionManager,
  getSelectionManager,
  resetSelectionManager,
  type SelectionListener,
  type BreadcrumbItem,
  type BreadcrumbListener,
} from '../../src/studio/selection-manager'

// ===========================================
// SELECTION MANAGER CLASS
// ===========================================

describe('SelectionManager', () => {
  let manager: SelectionManager

  beforeEach(() => {
    manager = new SelectionManager()
  })

  describe('Selection', () => {
    it('should start with no selection', () => {
      expect(manager.getSelection()).toBeNull()
    })

    it('should select a node', () => {
      manager.select('node-1')
      expect(manager.getSelection()).toBe('node-1')
    })

    it('should update selection', () => {
      manager.select('node-1')
      manager.select('node-2')
      expect(manager.getSelection()).toBe('node-2')
    })

    it('should clear selection with null', () => {
      manager.select('node-1')
      manager.select(null)
      expect(manager.getSelection()).toBeNull()
    })

    it('should clear selection with clearSelection()', () => {
      manager.select('node-1')
      manager.clearSelection()
      expect(manager.getSelection()).toBeNull()
    })

    it('should not notify if selecting same node', () => {
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.select('node-1')
      manager.select('node-1') // Same node

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('isSelected', () => {
    it('should return true for selected node', () => {
      manager.select('node-1')
      expect(manager.isSelected('node-1')).toBe(true)
    })

    it('should return false for unselected node', () => {
      manager.select('node-1')
      expect(manager.isSelected('node-2')).toBe(false)
    })

    it('should return false when no selection', () => {
      expect(manager.isSelected('node-1')).toBe(false)
    })
  })

  describe('Selection Listeners', () => {
    it('should notify listeners on selection change', () => {
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.select('node-1')

      expect(listener).toHaveBeenCalledWith('node-1', null)
    })

    it('should provide previous selection', () => {
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.select('node-1')
      manager.select('node-2')

      expect(listener).toHaveBeenLastCalledWith('node-2', 'node-1')
    })

    it('should support multiple listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      manager.subscribe(listener1)
      manager.subscribe(listener2)

      manager.select('node-1')

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('should unsubscribe correctly', () => {
      const listener = vi.fn()
      const unsubscribe = manager.subscribe(listener)

      manager.select('node-1')
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      manager.select('node-2')
      expect(listener).toHaveBeenCalledTimes(1) // Not called again
    })

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const goodListener = vi.fn()

      // Spy on console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      manager.subscribe(errorListener)
      manager.subscribe(goodListener)

      manager.select('node-1')

      // Good listener should still be called despite error in first
      expect(goodListener).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should track subscriber count', () => {
      expect(manager.subscriberCount).toBe(0)

      const unsub1 = manager.subscribe(() => {})
      expect(manager.subscriberCount).toBe(1)

      const unsub2 = manager.subscribe(() => {})
      expect(manager.subscriberCount).toBe(2)

      unsub1()
      expect(manager.subscriberCount).toBe(1)

      unsub2()
      expect(manager.subscriberCount).toBe(0)
    })
  })

  describe('Hover', () => {
    it('should start with no hover', () => {
      expect(manager.getHoveredNode()).toBeNull()
    })

    it('should set hover state', () => {
      manager.hover('node-1')
      expect(manager.getHoveredNode()).toBe('node-1')
    })

    it('should update hover state', () => {
      manager.hover('node-1')
      manager.hover('node-2')
      expect(manager.getHoveredNode()).toBe('node-2')
    })

    it('should clear hover with null', () => {
      manager.hover('node-1')
      manager.hover(null)
      expect(manager.getHoveredNode()).toBeNull()
    })

    it('should not notify if hovering same node', () => {
      const listener = vi.fn()
      manager.subscribeHover(listener)

      manager.hover('node-1')
      manager.hover('node-1') // Same node

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('Hover Listeners', () => {
    it('should notify hover listeners', () => {
      const listener = vi.fn()
      manager.subscribeHover(listener)

      manager.hover('node-1')

      expect(listener).toHaveBeenCalledWith('node-1', null)
    })

    it('should provide previous hovered node', () => {
      const listener = vi.fn()
      manager.subscribeHover(listener)

      manager.hover('node-1')
      manager.hover('node-2')

      expect(listener).toHaveBeenLastCalledWith('node-2', 'node-1')
    })

    it('should unsubscribe hover listener', () => {
      const listener = vi.fn()
      const unsubscribe = manager.subscribeHover(listener)

      manager.hover('node-1')
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      manager.hover('node-2')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should handle hover listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Hover listener error')
      })
      const goodListener = vi.fn()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      manager.subscribeHover(errorListener)
      manager.subscribeHover(goodListener)

      manager.hover('node-1')

      expect(goodListener).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Breadcrumb', () => {
    it('should start with empty breadcrumb', () => {
      expect(manager.getBreadcrumb()).toEqual([])
    })

    it('should set breadcrumb chain', () => {
      const chain: BreadcrumbItem[] = [
        { nodeId: 'root', name: 'Box' },
        { nodeId: 'node-1', name: 'Text' },
      ]

      manager.setBreadcrumb(chain)

      expect(manager.getBreadcrumb()).toEqual(chain)
    })

    it('should update breadcrumb', () => {
      const chain1: BreadcrumbItem[] = [{ nodeId: 'root', name: 'Box' }]
      const chain2: BreadcrumbItem[] = [
        { nodeId: 'root', name: 'Box' },
        { nodeId: 'node-1', name: 'Button' },
      ]

      manager.setBreadcrumb(chain1)
      manager.setBreadcrumb(chain2)

      expect(manager.getBreadcrumb()).toEqual(chain2)
    })
  })

  describe('Breadcrumb Listeners', () => {
    it('should notify breadcrumb listeners', () => {
      const listener = vi.fn()
      manager.subscribeBreadcrumb(listener)

      const chain: BreadcrumbItem[] = [{ nodeId: 'root', name: 'Box' }]
      manager.setBreadcrumb(chain)

      expect(listener).toHaveBeenCalledWith(chain)
    })

    it('should call listener immediately if breadcrumb exists', () => {
      const chain: BreadcrumbItem[] = [{ nodeId: 'root', name: 'Box' }]
      manager.setBreadcrumb(chain)

      const listener = vi.fn()
      manager.subscribeBreadcrumb(listener)

      // Called immediately with current breadcrumb
      expect(listener).toHaveBeenCalledWith(chain)
    })

    it('should not call listener immediately if breadcrumb empty', () => {
      const listener = vi.fn()
      manager.subscribeBreadcrumb(listener)

      // Not called because breadcrumb is empty
      expect(listener).not.toHaveBeenCalled()
    })

    it('should unsubscribe breadcrumb listener', () => {
      const listener = vi.fn()
      const unsubscribe = manager.subscribeBreadcrumb(listener)

      manager.setBreadcrumb([{ nodeId: 'root', name: 'Box' }])
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      manager.setBreadcrumb([{ nodeId: 'node-1', name: 'Text' }])
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should handle breadcrumb listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Breadcrumb listener error')
      })
      const goodListener = vi.fn()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      manager.subscribeBreadcrumb(errorListener)
      manager.subscribeBreadcrumb(goodListener)

      manager.setBreadcrumb([{ nodeId: 'root', name: 'Box' }])

      expect(goodListener).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Dispose', () => {
    it('should clear all state on dispose', () => {
      manager.select('node-1')
      manager.hover('node-2')
      manager.setBreadcrumb([{ nodeId: 'root', name: 'Box' }])
      manager.subscribe(() => {})
      manager.subscribeHover(() => {})
      manager.subscribeBreadcrumb(() => {})

      manager.dispose()

      expect(manager.getSelection()).toBeNull()
      expect(manager.getHoveredNode()).toBeNull()
      expect(manager.getBreadcrumb()).toEqual([])
      expect(manager.subscriberCount).toBe(0)
    })

    it('should not notify listeners after dispose', () => {
      const listener = vi.fn()
      manager.subscribe(listener)

      manager.dispose()

      // This shouldn't throw or call listeners
      manager.select('node-1')

      // Listener was cleared, so still only called 0 times
      expect(listener).not.toHaveBeenCalled()
    })
  })
})

// ===========================================
// SINGLETON FUNCTIONS
// ===========================================

describe('Singleton Functions', () => {
  beforeEach(() => {
    resetSelectionManager()
  })

  describe('getSelectionManager', () => {
    it('should return a SelectionManager instance', () => {
      const manager = getSelectionManager()
      expect(manager).toBeInstanceOf(SelectionManager)
    })

    it('should return same instance on multiple calls', () => {
      const manager1 = getSelectionManager()
      const manager2 = getSelectionManager()
      expect(manager1).toBe(manager2)
    })
  })

  describe('resetSelectionManager', () => {
    it('should dispose and reset singleton', () => {
      const manager1 = getSelectionManager()
      manager1.select('node-1')

      resetSelectionManager()

      const manager2 = getSelectionManager()
      expect(manager2).not.toBe(manager1)
      expect(manager2.getSelection()).toBeNull()
    })

    it('should handle reset when no instance exists', () => {
      // Should not throw
      expect(() => resetSelectionManager()).not.toThrow()
    })
  })
})

// ===========================================
// INTEGRATION SCENARIOS
// ===========================================

describe('Integration Scenarios', () => {
  let manager: SelectionManager

  beforeEach(() => {
    manager = new SelectionManager()
  })

  it('Scenario: Preview click updates selection and breadcrumb', () => {
    const selectionListener = vi.fn()
    const breadcrumbListener = vi.fn()

    manager.subscribe(selectionListener)
    manager.subscribeBreadcrumb(breadcrumbListener)

    // User clicks element in preview
    manager.select('btn-1')
    manager.setBreadcrumb([
      { nodeId: 'root', name: 'Box' },
      { nodeId: 'btn-1', name: 'Button' },
    ])

    expect(selectionListener).toHaveBeenCalledWith('btn-1', null)
    expect(breadcrumbListener).toHaveBeenCalled()
    expect(manager.isSelected('btn-1')).toBe(true)
  })

  it('Scenario: Hover preview while element selected', () => {
    const hoverListener = vi.fn()

    manager.subscribeHover(hoverListener)
    manager.select('btn-1')

    // User hovers over different element
    manager.hover('text-1')

    expect(manager.getSelection()).toBe('btn-1') // Selection unchanged
    expect(manager.getHoveredNode()).toBe('text-1')
    expect(hoverListener).toHaveBeenCalledWith('text-1', null)

    // User moves mouse away
    manager.hover(null)

    expect(manager.getSelection()).toBe('btn-1')
    expect(manager.getHoveredNode()).toBeNull()
  })

  it('Scenario: Multiple subscribers react to same selection', () => {
    const previewHighlighter = vi.fn()
    const propertyPanel = vi.fn()
    const editorSync = vi.fn()

    manager.subscribe(previewHighlighter)
    manager.subscribe(propertyPanel)
    manager.subscribe(editorSync)

    manager.select('node-5')

    expect(previewHighlighter).toHaveBeenCalledWith('node-5', null)
    expect(propertyPanel).toHaveBeenCalledWith('node-5', null)
    expect(editorSync).toHaveBeenCalledWith('node-5', null)
  })

  it('Scenario: Navigate breadcrumb to select parent', () => {
    manager.select('btn-1')
    manager.setBreadcrumb([
      { nodeId: 'root', name: 'Box' },
      { nodeId: 'container', name: 'Stack' },
      { nodeId: 'btn-1', name: 'Button' },
    ])

    // User clicks "Stack" in breadcrumb
    manager.select('container')
    manager.setBreadcrumb([
      { nodeId: 'root', name: 'Box' },
      { nodeId: 'container', name: 'Stack' },
    ])

    expect(manager.getSelection()).toBe('container')
    expect(manager.getBreadcrumb()).toHaveLength(2)
  })
})
