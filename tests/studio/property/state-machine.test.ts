/**
 * Property Panel State Machine Unit Tests
 *
 * Tests for the pure state machine without side effects.
 * Verifies all state transitions are deterministic.
 */

import { describe, it, expect } from 'vitest'
import {
  transition,
  createInitialState,
  isEmpty,
  isLoading,
  isNotFound,
  isShowing,
  isPendingUpdate,
  getCurrentElement,
  getCurrentNodeId,
  type PanelState,
  type PanelEvent,
  type ShowingState,
  type LoadingState,
  type PendingUpdateState,
} from '../../../studio/panels/property/state-machine'
import type { ExtractedElement } from '../../../compiler/studio/property-extractor'

// ============================================
// Test Helpers
// ============================================

function createMockElement(
  nodeId: string,
  componentName: string = 'Frame'
): ExtractedElement {
  return {
    nodeId,
    componentName,
    isDefinition: false,
    isTemplateInstance: false,
    allProperties: [],
    categories: [],
  }
}

function createShowingState(
  element: ExtractedElement,
  isInPositionedContainer = false
): ShowingState {
  return {
    type: 'showing',
    element,
    expandedSections: new Set(['layout', 'sizing', 'spacing', 'border', 'color', 'typography', 'behavior']),
    isInPositionedContainer,
  }
}

// ============================================
// Initial State
// ============================================

describe('Initial State', () => {
  it('should create empty initial state', () => {
    const state = createInitialState()

    expect(state.type).toBe('empty')
    expect(isEmpty(state)).toBe(true)
  })
})

// ============================================
// SELECT Event
// ============================================

describe('SELECT Event', () => {
  it('should transition from empty to loading when selecting a node', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'SELECT', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.state.type).toBe('loading')
    expect((result.state as LoadingState).nodeId).toBe('node-1')
  })

  it('should emit LOAD_ELEMENT effect on select (no RENDER - loading is synchronous)', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'SELECT', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-1' })
    // LOAD_ELEMENT is synchronous, so RENDER comes from ELEMENT_LOADED/NOT_FOUND
    expect(result.effects).not.toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })

  it('should transition to empty when selecting null', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'SELECT', nodeId: null }

    const result = transition(state, event)

    expect(result.state.type).toBe('empty')
  })

  it('should emit RENDER effect when deselecting', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'SELECT', nodeId: null }

    const result = transition(state, event)

    expect(result.effects).toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })
})

// ============================================
// ELEMENT_LOADED Event
// ============================================

describe('ELEMENT_LOADED Event', () => {
  it('should transition from loading to showing', () => {
    const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
    const element = createMockElement('node-1')
    const event: PanelEvent = {
      type: 'ELEMENT_LOADED',
      element,
      isInPositionedContainer: false,
    }

    const result = transition(state, event)

    expect(result.state.type).toBe('showing')
    expect((result.state as ShowingState).element).toBe(element)
  })

  it('should set isInPositionedContainer in showing state', () => {
    const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
    const element = createMockElement('node-1')
    const event: PanelEvent = {
      type: 'ELEMENT_LOADED',
      element,
      isInPositionedContainer: true,
    }

    const result = transition(state, event)

    expect((result.state as ShowingState).isInPositionedContainer).toBe(true)
  })

  it('should have default expanded sections', () => {
    const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
    const element = createMockElement('node-1')
    const event: PanelEvent = {
      type: 'ELEMENT_LOADED',
      element,
      isInPositionedContainer: false,
    }

    const result = transition(state, event)

    const showingState = result.state as ShowingState
    expect(showingState.expandedSections.has('layout')).toBe(true)
    expect(showingState.expandedSections.has('sizing')).toBe(true)
    expect(showingState.expandedSections.has('color')).toBe(true)
  })

  it('should emit RENDER effect', () => {
    const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
    const element = createMockElement('node-1')
    const event: PanelEvent = {
      type: 'ELEMENT_LOADED',
      element,
      isInPositionedContainer: false,
    }

    const result = transition(state, event)

    expect(result.effects).toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })

  it('should ignore ELEMENT_LOADED when not in loading state', () => {
    const state = createInitialState()
    const element = createMockElement('node-1')
    const event: PanelEvent = {
      type: 'ELEMENT_LOADED',
      element,
      isInPositionedContainer: false,
    }

    const result = transition(state, event)

    expect(result.state.type).toBe('empty')
    expect(result.effects).toHaveLength(0)
  })
})

// ============================================
// ELEMENT_NOT_FOUND Event
// ============================================

describe('ELEMENT_NOT_FOUND Event', () => {
  it('should transition from loading to not-found', () => {
    const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
    const event: PanelEvent = { type: 'ELEMENT_NOT_FOUND', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.state.type).toBe('not-found')
    expect(isNotFound(result.state)).toBe(true)
  })

  it('should emit RENDER effect', () => {
    const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
    const event: PanelEvent = { type: 'ELEMENT_NOT_FOUND', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })

  it('should ignore ELEMENT_NOT_FOUND when not in loading state', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'ELEMENT_NOT_FOUND', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.state.type).toBe('empty')
    expect(result.effects).toHaveLength(0)
  })
})

// ============================================
// PROPERTY_CHANGE Event
// ============================================

describe('PROPERTY_CHANGE Event', () => {
  it('should emit APPLY_CHANGE and NOTIFY_CHANGE effects in showing state', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'PROPERTY_CHANGE', name: 'bg', value: '#ff0000' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'bg', value: '#ff0000', action: 'set' },
    })
    expect(result.effects).toContainEqual({
      type: 'NOTIFY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'bg', value: '#ff0000', action: 'set' },
    })
  })

  it('should not change state on property change', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'PROPERTY_CHANGE', name: 'bg', value: '#ff0000' }

    const result = transition(state, event)

    expect(result.state).toBe(state)
  })

  it('should ignore property change when not in showing state', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'PROPERTY_CHANGE', name: 'bg', value: '#ff0000' }

    const result = transition(state, event)

    expect(result.effects).toHaveLength(0)
  })
})

// ============================================
// PROPERTY_REMOVE Event
// ============================================

describe('PROPERTY_REMOVE Event', () => {
  it('should emit APPLY_CHANGE with remove action', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'PROPERTY_REMOVE', name: 'bg' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'bg', value: '', action: 'remove' },
    })
  })

  it('should ignore when not in showing state', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'PROPERTY_REMOVE', name: 'bg' }

    const result = transition(state, event)

    expect(result.effects).toHaveLength(0)
  })
})

// ============================================
// PROPERTY_TOGGLE Event
// ============================================

describe('PROPERTY_TOGGLE Event', () => {
  it('should emit APPLY_CHANGE with toggle action when enabling', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'PROPERTY_TOGGLE', name: 'hor', enabled: true }

    const result = transition(state, event)

    expect(result.effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'hor', value: 'true', action: 'toggle' },
    })
  })

  it('should emit APPLY_CHANGE with toggle action when disabling', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'PROPERTY_TOGGLE', name: 'hor', enabled: false }

    const result = transition(state, event)

    expect(result.effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'hor', value: 'false', action: 'toggle' },
    })
  })
})

// ============================================
// SECTION_TOGGLE Event
// ============================================

describe('SECTION_TOGGLE Event', () => {
  it('should collapse expanded section', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    expect(state.expandedSections.has('layout')).toBe(true)

    const event: PanelEvent = { type: 'SECTION_TOGGLE', sectionName: 'layout' }
    const result = transition(state, event)

    expect((result.state as ShowingState).expandedSections.has('layout')).toBe(false)
  })

  it('should expand collapsed section', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    state.expandedSections.delete('layout')

    const event: PanelEvent = { type: 'SECTION_TOGGLE', sectionName: 'layout' }
    const result = transition(state, event)

    expect((result.state as ShowingState).expandedSections.has('layout')).toBe(true)
  })

  it('should emit RENDER effect', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'SECTION_TOGGLE', sectionName: 'layout' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })

  it('should ignore when not in showing state', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'SECTION_TOGGLE', sectionName: 'layout' }

    const result = transition(state, event)

    expect(result.effects).toHaveLength(0)
  })
})

// ============================================
// COMPILE_START Event
// ============================================

describe('COMPILE_START Event', () => {
  it('should transition from showing to pending-update', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'COMPILE_START' }

    const result = transition(state, event)

    expect(result.state.type).toBe('pending-update')
    expect((result.state as PendingUpdateState).pendingNodeId).toBe('node-1')
    expect((result.state as PendingUpdateState).previousElement).toBe(element)
  })

  it('should transition from loading to pending-update', () => {
    const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
    const event: PanelEvent = { type: 'COMPILE_START' }

    const result = transition(state, event)

    expect(result.state.type).toBe('pending-update')
    expect((result.state as PendingUpdateState).pendingNodeId).toBe('node-1')
    expect((result.state as PendingUpdateState).previousElement).toBeNull()
  })

  it('should ignore when in empty state', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'COMPILE_START' }

    const result = transition(state, event)

    expect(result.state.type).toBe('empty')
  })

  it('should not emit effects', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'COMPILE_START' }

    const result = transition(state, event)

    expect(result.effects).toHaveLength(0)
  })
})

// ============================================
// COMPILE_END Event
// ============================================

describe('COMPILE_END Event', () => {
  it('should transition from pending-update to loading', () => {
    const state: PendingUpdateState = {
      type: 'pending-update',
      pendingNodeId: 'node-1',
      previousElement: null,
    }
    const event: PanelEvent = { type: 'COMPILE_END' }

    const result = transition(state, event)

    expect(result.state.type).toBe('loading')
    expect((result.state as LoadingState).nodeId).toBe('node-1')
  })

  it('should emit LOAD_ELEMENT effect', () => {
    const state: PendingUpdateState = {
      type: 'pending-update',
      pendingNodeId: 'node-1',
      previousElement: null,
    }
    const event: PanelEvent = { type: 'COMPILE_END' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-1' })
  })

  it('should ignore when not in pending-update state', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'COMPILE_END' }

    const result = transition(state, event)

    expect(result.state.type).toBe('empty')
    expect(result.effects).toHaveLength(0)
  })
})

// ============================================
// SELECTION_INVALIDATED Event
// ============================================

describe('SELECTION_INVALIDATED Event', () => {
  it('should transition to not-found when showing invalidated element', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.state.type).toBe('not-found')
  })

  it('should ignore when invalidated node is different', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'node-2' }

    const result = transition(state, event)

    expect(result.state.type).toBe('showing')
  })

  it('should transition pending-update to not-found when pending node invalidated', () => {
    const state: PendingUpdateState = {
      type: 'pending-update',
      pendingNodeId: 'node-1',
      previousElement: null,
    }
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.state.type).toBe('not-found')
  })

  it('should emit RENDER effect on invalidation', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'node-1' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })
})

// ============================================
// DEFINITION_SELECTED Event
// ============================================

describe('DEFINITION_SELECTED Event', () => {
  it('should transition to loading with definition marker', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'DEFINITION_SELECTED', componentName: 'MyButton' }

    const result = transition(state, event)

    expect(result.state.type).toBe('loading')
    expect((result.state as LoadingState).nodeId).toBe('def:MyButton')
  })

  it('should emit LOAD_DEFINITION effect', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'DEFINITION_SELECTED', componentName: 'MyButton' }

    const result = transition(state, event)

    expect(result.effects).toContainEqual({ type: 'LOAD_DEFINITION', componentName: 'MyButton' })
  })

  it('should NOT emit RENDER effect (loading is synchronous)', () => {
    const state = createInitialState()
    const event: PanelEvent = { type: 'DEFINITION_SELECTED', componentName: 'MyButton' }

    const result = transition(state, event)

    // LOAD_DEFINITION is synchronous, so RENDER comes from ELEMENT_LOADED/NOT_FOUND
    expect(result.effects).not.toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })
})

// ============================================
// Query Functions
// ============================================

describe('Query Functions', () => {
  describe('isEmpty', () => {
    it('should return true for empty state', () => {
      const state = createInitialState()
      expect(isEmpty(state)).toBe(true)
    })

    it('should return false for other states', () => {
      const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
      expect(isEmpty(state)).toBe(false)
    })
  })

  describe('isLoading', () => {
    it('should return true for loading state', () => {
      const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
      expect(isLoading(state)).toBe(true)
    })
  })

  describe('isNotFound', () => {
    it('should return true for not-found state', () => {
      const state = { type: 'not-found' as const, nodeId: 'node-1' }
      expect(isNotFound(state)).toBe(true)
    })
  })

  describe('isShowing', () => {
    it('should return true for showing state', () => {
      const element = createMockElement('node-1')
      const state = createShowingState(element)
      expect(isShowing(state)).toBe(true)
    })
  })

  describe('isPendingUpdate', () => {
    it('should return true for pending-update state', () => {
      const state: PendingUpdateState = {
        type: 'pending-update',
        pendingNodeId: 'node-1',
        previousElement: null,
      }
      expect(isPendingUpdate(state)).toBe(true)
    })
  })

  describe('getCurrentElement', () => {
    it('should return element from showing state', () => {
      const element = createMockElement('node-1')
      const state = createShowingState(element)
      expect(getCurrentElement(state)).toBe(element)
    })

    it('should return previousElement from pending-update state', () => {
      const element = createMockElement('node-1')
      const state: PendingUpdateState = {
        type: 'pending-update',
        pendingNodeId: 'node-1',
        previousElement: element,
      }
      expect(getCurrentElement(state)).toBe(element)
    })

    it('should return null for empty state', () => {
      const state = createInitialState()
      expect(getCurrentElement(state)).toBeNull()
    })
  })

  describe('getCurrentNodeId', () => {
    it('should return nodeId from loading state', () => {
      const state: LoadingState = { type: 'loading', nodeId: 'node-1' }
      expect(getCurrentNodeId(state)).toBe('node-1')
    })

    it('should return nodeId from showing state', () => {
      const element = createMockElement('node-1')
      const state = createShowingState(element)
      expect(getCurrentNodeId(state)).toBe('node-1')
    })

    it('should return pendingNodeId from pending-update state', () => {
      const state: PendingUpdateState = {
        type: 'pending-update',
        pendingNodeId: 'node-1',
        previousElement: null,
      }
      expect(getCurrentNodeId(state)).toBe('node-1')
    })

    it('should return nodeId from not-found state', () => {
      const state = { type: 'not-found' as const, nodeId: 'node-1' }
      expect(getCurrentNodeId(state)).toBe('node-1')
    })

    it('should return null for empty state', () => {
      const state = createInitialState()
      expect(getCurrentNodeId(state)).toBeNull()
    })
  })
})

// ============================================
// Determinism Tests
// ============================================

describe('State Machine Determinism', () => {
  it('should produce same result for same state and event', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const event: PanelEvent = { type: 'PROPERTY_CHANGE', name: 'bg', value: '#ff0000' }

    const result1 = transition(state, event)
    const result2 = transition(state, event)

    expect(result1.effects).toEqual(result2.effects)
  })

  it('should not mutate input state', () => {
    const element = createMockElement('node-1')
    const state = createShowingState(element)
    const originalExpanded = new Set(state.expandedSections)
    const event: PanelEvent = { type: 'SECTION_TOGGLE', sectionName: 'layout' }

    transition(state, event)

    expect(state.expandedSections).toEqual(originalExpanded)
  })
})
