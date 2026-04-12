/**
 * PropertyPanelController Unit Tests
 *
 * Tests for the port-based PropertyPanelController.
 *
 * Use Cases:
 * - UC-PP-01: Panel shows "empty" when nothing selected
 * - UC-PP-02: Panel loads properties on selection
 * - UC-PP-03: Panel shows "not found" when element deleted
 * - UC-PP-04: Panel waits for compile-end before update
 * - UC-PP-05: Property value change (debounced)
 * - UC-PP-06: Property removal
 * - UC-PP-07: Boolean property toggle
 * - UC-PP-08: Section expand/collapse
 * - UC-PP-09: Definition selection
 * - Controller lifecycle (init, dispose)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  PropertyPanelController,
  createPropertyPanelController,
} from '../../../studio/panels/property/controller'
import {
  createMockPorts,
  createMockElement,
  createMockProperty,
  type MockPropertyPanelPorts,
} from '../../../studio/panels/property/adapters/mock-adapters'
import type { PanelState } from '../../../studio/panels/property/state-machine'

// ============================================
// Test Setup
// ============================================

describe('PropertyPanelController', () => {
  let ports: MockPropertyPanelPorts
  let controller: PropertyPanelController
  let stateChanges: PanelState[]
  let propertyChanges: Array<{ nodeId: string; change: any }>

  beforeEach(() => {
    vi.useFakeTimers()
    ports = createMockPorts()
    stateChanges = []
    propertyChanges = []

    controller = createPropertyPanelController(ports, {
      debounceTime: 100,
      onStateChange: (state) => stateChanges.push(state),
      onPropertyChange: (nodeId, change) => propertyChanges.push({ nodeId, change }),
    })
  })

  afterEach(() => {
    controller.dispose()
    vi.useRealTimers()
  })

  // ============================================
  // UC-PP-01: Empty State
  // ============================================

  describe('UC-PP-01: Panel shows empty when nothing selected', () => {
    it('should start with empty state', () => {
      controller.init()

      expect(controller.getState().type).toBe('empty')
    })

    it('should notify state change on init', () => {
      controller.init()

      expect(stateChanges.length).toBe(1)
      expect(stateChanges[0].type).toBe('empty')
    })

    it('should return to empty when selection cleared', () => {
      // Setup: element selected
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      ports.selection._simulateSelect('node-1')

      controller.init()

      // Clear selection
      ports.selection._simulateSelect(null)

      expect(controller.getState().type).toBe('empty')
    })
  })

  // ============================================
  // UC-PP-02: Load Properties
  // ============================================

  describe('UC-PP-02: Panel loads properties on selection', () => {
    it('should load element when selected', () => {
      const element = createMockElement('node-1', 'Button', [
        createMockProperty('bg', '#ff0000'),
        createMockProperty('pad', '12'),
      ])
      ports.extraction._addElement('node-1', element)

      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.getState().type).toBe('showing')
      expect(controller.getCurrentElement()).toBe(element)
    })

    it('should skip rendering loading state (synchronous load)', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)

      controller.init()
      ports.selection._simulateSelect('node-1')

      // Loading state is not rendered because LOAD_ELEMENT is synchronous
      // Only 'showing' state should be rendered
      const loadingState = stateChanges.find(s => s.type === 'loading')
      expect(loadingState).toBeUndefined()

      // Final state should be 'showing'
      const showingState = stateChanges.find(s => s.type === 'showing')
      expect(showingState).toBeDefined()
    })

    it('should call extraction port', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)

      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(ports.extraction._state.getCalls).toContain('node-1')
    })

    it('should check layout container status', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      ports.layout._setInPositionedContainer('node-1', true)

      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.isInPositionedContainer()).toBe(true)
    })

    it('should handle initial selection on init', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      ports.selection.select('node-1') // Set before init

      controller.init()

      expect(controller.getState().type).toBe('showing')
    })
  })

  // ============================================
  // UC-PP-03: Element Not Found
  // ============================================

  describe('UC-PP-03: Panel shows not-found when element deleted', () => {
    it('should show not-found when element not in extraction', () => {
      controller.init()
      ports.selection._simulateSelect('nonexistent-node')

      expect(controller.getState().type).toBe('not-found')
    })

    it('should handle selection invalidation event', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)

      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.getState().type).toBe('showing')

      // Simulate element deletion
      ports.events._triggerSelectionInvalidated('node-1')

      expect(controller.getState().type).toBe('not-found')
    })

    it('should not affect state when different node invalidated', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)

      controller.init()
      ports.selection._simulateSelect('node-1')

      ports.events._triggerSelectionInvalidated('node-2')

      expect(controller.getState().type).toBe('showing')
    })
  })

  // ============================================
  // UC-PP-04: Compile Deferral
  // ============================================

  describe('UC-PP-04: Panel waits for compile-end before update', () => {
    it('should defer update during compilation', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      ports.events._setCompiling(true)

      controller.init()
      ports.selection._simulateSelect('node-1')

      // Should be in pending-update, not showing
      expect(controller.getState().type).toBe('pending-update')
    })

    it('should load element after compile completes', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      ports.events._setCompiling(true)

      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.getState().type).toBe('pending-update')

      // Compile finishes
      ports.events._setCompiling(false)
      ports.events._triggerCompileCompleted()

      expect(controller.getState().type).toBe('showing')
    })
  })

  // ============================================
  // UC-PP-05: Property Value Change
  // ============================================

  describe('UC-PP-05: Property value change (debounced)', () => {
    beforeEach(() => {
      const element = createMockElement('node-1', 'Frame', [
        createMockProperty('bg', '#000000'),
      ])
      ports.extraction._addElement('node-1', element)
      controller.init()
      ports.selection._simulateSelect('node-1')
    })

    it('should debounce rapid property changes', () => {
      controller.changeProperty('bg', '#ff0000')
      controller.changeProperty('bg', '#00ff00')
      controller.changeProperty('bg', '#0000ff')

      // Before debounce timeout
      expect(ports.modification._getModifications()).toHaveLength(0)

      // After debounce
      vi.advanceTimersByTime(100)

      // Only the last change should be applied
      const mods = ports.modification._getModifications()
      expect(mods).toHaveLength(1)
      expect(mods[0].value).toBe('#0000ff')
    })

    it('should call modification port with correct action', () => {
      controller.changeProperty('bg', '#ff0000')
      vi.advanceTimersByTime(100)

      const mods = ports.modification._getModifications()
      expect(mods[0]).toMatchObject({
        nodeId: 'node-1',
        type: 'set',
        name: 'bg',
        value: '#ff0000',
      })
    })

    it('should notify property change callback', () => {
      controller.changeProperty('bg', '#ff0000')
      vi.advanceTimersByTime(100)

      expect(propertyChanges).toHaveLength(1)
      expect(propertyChanges[0]).toMatchObject({
        nodeId: 'node-1',
        change: {
          name: 'bg',
          value: '#ff0000',
          action: 'set',
        },
      })
    })

    it('should debounce different properties independently', () => {
      controller.changeProperty('bg', '#ff0000')
      controller.changeProperty('pad', '20')

      vi.advanceTimersByTime(100)

      const mods = ports.modification._getModifications()
      expect(mods).toHaveLength(2)
      expect(mods.find(m => m.name === 'bg')?.value).toBe('#ff0000')
      expect(mods.find(m => m.name === 'pad')?.value).toBe('20')
    })
  })

  // ============================================
  // UC-PP-06: Property Removal
  // ============================================

  describe('UC-PP-06: Property removal', () => {
    beforeEach(() => {
      const element = createMockElement('node-1', 'Frame', [
        createMockProperty('bg', '#000000'),
      ])
      ports.extraction._addElement('node-1', element)
      controller.init()
      ports.selection._simulateSelect('node-1')
    })

    it('should call modification port with remove action', () => {
      controller.removeProperty('bg')

      const mods = ports.modification._getModifications()
      expect(mods).toHaveLength(1)
      expect(mods[0]).toMatchObject({
        nodeId: 'node-1',
        type: 'remove',
        name: 'bg',
      })
    })

    it('should remove immediately without debounce', () => {
      controller.removeProperty('bg')

      // Should be immediate, no need for timer
      expect(ports.modification._getModifications()).toHaveLength(1)
    })
  })

  // ============================================
  // UC-PP-07: Boolean Property Toggle
  // ============================================

  describe('UC-PP-07: Boolean property toggle', () => {
    beforeEach(() => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      controller.init()
      ports.selection._simulateSelect('node-1')
    })

    it('should toggle property on', () => {
      controller.toggleProperty('hor', true)

      const mods = ports.modification._getModifications()
      expect(mods).toHaveLength(1)
      expect(mods[0]).toMatchObject({
        nodeId: 'node-1',
        type: 'toggle',
        name: 'hor',
        enabled: true,
      })
    })

    it('should toggle property off', () => {
      controller.toggleProperty('hor', false)

      const mods = ports.modification._getModifications()
      expect(mods[0]).toMatchObject({
        type: 'toggle',
        name: 'hor',
        enabled: false,
      })
    })

    it('should toggle immediately without debounce', () => {
      controller.toggleProperty('wrap', true)

      expect(ports.modification._getModifications()).toHaveLength(1)
    })
  })

  // ============================================
  // UC-PP-08: Section Toggle
  // ============================================

  describe('UC-PP-08: Section expand/collapse', () => {
    beforeEach(() => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      controller.init()
      ports.selection._simulateSelect('node-1')
    })

    it('should toggle section state', () => {
      // Layout should be expanded by default
      const initialState = controller.getState()
      if (initialState.type !== 'showing') throw new Error('Expected showing state')
      expect(initialState.expandedSections.has('layout')).toBe(true)

      // Toggle to collapse
      controller.toggleSection('layout')

      const afterToggle = controller.getState()
      if (afterToggle.type !== 'showing') throw new Error('Expected showing state')
      expect(afterToggle.expandedSections.has('layout')).toBe(false)

      // Toggle to expand
      controller.toggleSection('layout')

      const afterSecondToggle = controller.getState()
      if (afterSecondToggle.type !== 'showing') throw new Error('Expected showing state')
      expect(afterSecondToggle.expandedSections.has('layout')).toBe(true)
    })

    it('should trigger state change callback', () => {
      const initialCount = stateChanges.length

      controller.toggleSection('layout')

      expect(stateChanges.length).toBe(initialCount + 1)
    })
  })

  // ============================================
  // UC-PP-09: Definition Selection
  // ============================================

  describe('UC-PP-09: Definition selection', () => {
    it('should load definition properties', () => {
      const definition = createMockElement('def:MyButton', 'MyButton', [
        createMockProperty('bg', '$primary'),
      ], { isDefinition: true })
      ports.extraction._addDefinition('MyButton', definition)

      controller.init()
      ports.events._triggerDefinitionSelected('MyButton')

      expect(controller.getState().type).toBe('showing')
      expect(controller.getCurrentElement()?.isDefinition).toBe(true)
    })

    it('should show not-found for missing definition', () => {
      controller.init()
      ports.events._triggerDefinitionSelected('NonexistentComponent')

      expect(controller.getState().type).toBe('not-found')
    })
  })

  // ============================================
  // Controller Lifecycle
  // ============================================

  describe('Controller Lifecycle', () => {
    describe('init', () => {
      it('should subscribe to selection changes', () => {
        controller.init()

        expect(ports.selection._listeners.size).toBeGreaterThan(0)
      })

      it('should subscribe to event port handlers', () => {
        controller.init()

        expect(ports.events._state.selectionInvalidatedHandlers.size).toBeGreaterThan(0)
        expect(ports.events._state.compileCompletedHandlers.size).toBeGreaterThan(0)
        expect(ports.events._state.definitionSelectedHandlers.size).toBeGreaterThan(0)
      })

      it('should throw if called after dispose', () => {
        controller.init()
        controller.dispose()

        expect(() => controller.init()).toThrow('Controller has been disposed')
      })
    })

    describe('dispose', () => {
      it('should unsubscribe from all ports', () => {
        controller.init()
        controller.dispose()

        expect(ports.selection._listeners.size).toBe(0)
        expect(ports.events._state.selectionInvalidatedHandlers.size).toBe(0)
      })

      it('should clear debounce timers', () => {
        const element = createMockElement('node-1', 'Frame')
        ports.extraction._addElement('node-1', element)
        controller.init()
        ports.selection._simulateSelect('node-1')

        // Start a debounced change
        controller.changeProperty('bg', '#ff0000')

        // Dispose before timer fires
        controller.dispose()
        vi.advanceTimersByTime(200)

        // Change should not be applied
        expect(ports.modification._getModifications()).toHaveLength(0)
      })

      it('should invalidate token cache', () => {
        controller.init()
        controller.dispose()

        expect(ports.tokens._state.cacheInvalidated).toBe(true)
      })

      it('should be idempotent', () => {
        controller.init()
        controller.dispose()
        controller.dispose() // Should not throw

        expect(ports.selection._listeners.size).toBe(0)
      })

      it('should ignore events after dispose', () => {
        const element = createMockElement('node-1', 'Frame')
        ports.extraction._addElement('node-1', element)
        controller.init()
        controller.dispose()

        const initialModCount = ports.modification._getModifications().length

        // Try to trigger events - should be ignored
        ports.selection._simulateSelect('node-1')
        ports.events._triggerCompileCompleted()

        // No new modifications
        expect(ports.modification._getModifications().length).toBe(initialModCount)
      })
    })

    describe('refresh', () => {
      it('should reload current element', () => {
        const element = createMockElement('node-1', 'Frame', [
          createMockProperty('bg', '#ff0000'),
        ])
        ports.extraction._addElement('node-1', element)
        controller.init()
        ports.selection._simulateSelect('node-1')

        const initialCalls = ports.extraction._state.getCalls.length

        controller.refresh()

        expect(ports.extraction._state.getCalls.length).toBe(initialCalls + 1)
      })

      it('should do nothing when no selection', () => {
        controller.init()

        const initialCalls = ports.extraction._state.getCalls.length
        controller.refresh()

        expect(ports.extraction._state.getCalls.length).toBe(initialCalls)
      })
    })
  })

  // ============================================
  // State Accessors
  // ============================================

  describe('State Accessors', () => {
    it('getCurrentElement should return null when empty', () => {
      controller.init()

      expect(controller.getCurrentElement()).toBeNull()
    })

    it('getCurrentElement should return element when showing', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.getCurrentElement()).toBe(element)
    })

    it('getCurrentNodeId should return null when empty', () => {
      controller.init()

      expect(controller.getCurrentNodeId()).toBeNull()
    })

    it('getCurrentNodeId should return nodeId when showing', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.getCurrentNodeId()).toBe('node-1')
    })

    it('isInPositionedContainer should return false when empty', () => {
      controller.init()

      expect(controller.isInPositionedContainer()).toBe(false)
    })

    it('isInPositionedContainer should reflect layout port', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      ports.layout._setInPositionedContainer('node-1', true)

      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.isInPositionedContainer()).toBe(true)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle rapid selection changes', () => {
      const element1 = createMockElement('node-1', 'Frame')
      const element2 = createMockElement('node-2', 'Button')
      ports.extraction._addElement('node-1', element1)
      ports.extraction._addElement('node-2', element2)

      controller.init()

      ports.selection._simulateSelect('node-1')
      ports.selection._simulateSelect('node-2')
      ports.selection._simulateSelect('node-1')
      ports.selection._simulateSelect('node-2')

      expect(controller.getCurrentNodeId()).toBe('node-2')
    })

    it('should handle selection during pending update', () => {
      const element1 = createMockElement('node-1', 'Frame')
      const element2 = createMockElement('node-2', 'Button')
      ports.extraction._addElement('node-1', element1)
      ports.extraction._addElement('node-2', element2)

      ports.events._setCompiling(true)
      controller.init()
      ports.selection._simulateSelect('node-1')

      expect(controller.getState().type).toBe('pending-update')

      // Select different node while pending
      ports.selection._simulateSelect('node-2')

      // Should update pending node
      expect(controller.getState().type).toBe('pending-update')
    })

    it('should handle property changes when not in showing state', () => {
      controller.init()

      // Should not throw when trying to change property in empty state
      controller.changeProperty('bg', '#ff0000')
      vi.advanceTimersByTime(100)

      // No modifications should be made
      expect(ports.modification._getModifications()).toHaveLength(0)
    })

    it('should handle concurrent debounces for same property', () => {
      const element = createMockElement('node-1', 'Frame')
      ports.extraction._addElement('node-1', element)
      controller.init()
      ports.selection._simulateSelect('node-1')

      // First change
      controller.changeProperty('bg', '#ff0000')

      // Wait partial time
      vi.advanceTimersByTime(50)

      // Second change should reset timer
      controller.changeProperty('bg', '#00ff00')

      // Wait partial time again
      vi.advanceTimersByTime(50)

      // Should not have fired yet
      expect(ports.modification._getModifications()).toHaveLength(0)

      // Complete the second timer
      vi.advanceTimersByTime(50)

      // Only the second change should be applied
      const mods = ports.modification._getModifications()
      expect(mods).toHaveLength(1)
      expect(mods[0].value).toBe('#00ff00')
    })
  })
})
