/**
 * Property Panel State Machine Tests
 *
 * Tests for the pure state machine - no DOM, no side effects.
 * All tests are synchronous and deterministic.
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
  type PendingUpdateState,
} from '../../../studio/panels/property/state-machine'
import type { ExtractedElement } from '../../../compiler/studio/property-extractor'

// ============================================
// Test Fixtures
// ============================================

const mockElement: ExtractedElement = {
  nodeId: 'node-1',
  componentName: 'Frame',
  instanceName: undefined,
  isDefinition: false,
  isTemplateInstance: false,
  allProperties: [
    { name: 'bg', value: '#1a1a1a', hasValue: true, source: 'instance', category: 'color' },
    { name: 'pad', value: '16', hasValue: true, source: 'instance', category: 'spacing' },
  ],
  categories: [
    { name: 'color', properties: [{ name: 'bg', value: '#1a1a1a', hasValue: true, source: 'instance', category: 'color' }] },
    { name: 'spacing', properties: [{ name: 'pad', value: '16', hasValue: true, source: 'instance', category: 'spacing' }] },
  ],
}

const mockElement2: ExtractedElement = {
  ...mockElement,
  nodeId: 'node-2',
  componentName: 'Button',
}

// ============================================
// Initial State
// ============================================

describe('State Machine: Initial State', () => {
  it('starts in empty state', () => {
    const state = createInitialState()
    expect(state.type).toBe('empty')
    expect(isEmpty(state)).toBe(true)
  })
})

// ============================================
// State Transitions: empty
// ============================================

describe('State Machine: empty', () => {
  const emptyState = createInitialState()

  it('transitions to loading on SELECT with nodeId', () => {
    const event: PanelEvent = { type: 'SELECT', nodeId: 'node-1' }

    const { state, effects } = transition(emptyState, event)

    expect(state.type).toBe('loading')
    expect(isLoading(state)).toBe(true)
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('node-1')
    }
    expect(effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-1' })
    // LOAD_ELEMENT is synchronous, so no RENDER until element is loaded/not found
    expect(effects).not.toContainEqual(expect.objectContaining({ type: 'RENDER' }))
  })

  it('stays empty on SELECT with null', () => {
    const event: PanelEvent = { type: 'SELECT', nodeId: null }

    const { state, effects } = transition(emptyState, event)

    expect(state.type).toBe('empty')
    expect(effects).toContainEqual({ type: 'RENDER', state: { type: 'empty' } })
  })

  it('transitions to loading on DEFINITION_SELECTED', () => {
    const event: PanelEvent = { type: 'DEFINITION_SELECTED', componentName: 'MyComponent' }

    const { state, effects } = transition(emptyState, event)

    expect(state.type).toBe('loading')
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('def:MyComponent')
    }
    expect(effects).toContainEqual({ type: 'LOAD_DEFINITION', componentName: 'MyComponent' })
  })

  it('ignores irrelevant events', () => {
    const events: PanelEvent[] = [
      { type: 'ELEMENT_LOADED', element: mockElement, isInPositionedContainer: false },
      { type: 'PROPERTY_CHANGE', name: 'bg', value: '#fff' },
      { type: 'PROPERTY_REMOVE', name: 'bg' },
      { type: 'COMPILE_START' },
      { type: 'COMPILE_END' },
    ]

    for (const event of events) {
      const { state } = transition(emptyState, event)
      expect(state.type).toBe('empty')
    }
  })
})

// ============================================
// State Transitions: loading
// ============================================

describe('State Machine: loading', () => {
  const loadingState: PanelState = { type: 'loading', nodeId: 'node-1' }

  it('transitions to showing on ELEMENT_LOADED', () => {
    const event: PanelEvent = {
      type: 'ELEMENT_LOADED',
      element: mockElement,
      isInPositionedContainer: false,
    }

    const { state, effects } = transition(loadingState, event)

    expect(state.type).toBe('showing')
    expect(isShowing(state)).toBe(true)
    if (state.type === 'showing') {
      expect(state.element).toEqual(mockElement)
      expect(state.isInPositionedContainer).toBe(false)
      expect(state.expandedSections).toBeDefined()
    }
    expect(effects).toContainEqual({ type: 'RENDER', state })
  })

  it('transitions to not-found on ELEMENT_NOT_FOUND', () => {
    const event: PanelEvent = { type: 'ELEMENT_NOT_FOUND', nodeId: 'node-1' }

    const { state, effects } = transition(loadingState, event)

    expect(state.type).toBe('not-found')
    expect(isNotFound(state)).toBe(true)
    if (state.type === 'not-found') {
      expect(state.nodeId).toBe('node-1')
    }
    expect(effects).toContainEqual({ type: 'RENDER', state })
  })

  it('transitions to pending-update on COMPILE_START', () => {
    const event: PanelEvent = { type: 'COMPILE_START' }

    const { state } = transition(loadingState, event)

    expect(state.type).toBe('pending-update')
    expect(isPendingUpdate(state)).toBe(true)
    if (state.type === 'pending-update') {
      expect(state.pendingNodeId).toBe('node-1')
      expect(state.previousElement).toBeNull()
    }
  })

  it('transitions to new loading on SELECT with different nodeId', () => {
    const event: PanelEvent = { type: 'SELECT', nodeId: 'node-2' }

    const { state, effects } = transition(loadingState, event)

    expect(state.type).toBe('loading')
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('node-2')
    }
    expect(effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-2' })
  })
})

// ============================================
// State Transitions: not-found
// ============================================

describe('State Machine: not-found', () => {
  const notFoundState: PanelState = { type: 'not-found', nodeId: 'node-1' }

  it('transitions to loading on SELECT with new nodeId', () => {
    const event: PanelEvent = { type: 'SELECT', nodeId: 'node-2' }

    const { state, effects } = transition(notFoundState, event)

    expect(state.type).toBe('loading')
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('node-2')
    }
    expect(effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-2' })
  })

  it('transitions to empty on SELECT with null', () => {
    const event: PanelEvent = { type: 'SELECT', nodeId: null }

    const { state } = transition(notFoundState, event)

    expect(state.type).toBe('empty')
  })
})

// ============================================
// State Transitions: showing
// ============================================

describe('State Machine: showing', () => {
  const showingState: ShowingState = {
    type: 'showing',
    element: mockElement,
    expandedSections: new Set(['color', 'spacing']),
    isInPositionedContainer: false,
  }

  it('generates APPLY_CHANGE and NOTIFY_CHANGE on PROPERTY_CHANGE', () => {
    const event: PanelEvent = { type: 'PROPERTY_CHANGE', name: 'bg', value: '#fff' }

    const { state, effects } = transition(showingState, event)

    // State should remain unchanged (will refresh after compile)
    expect(state.type).toBe('showing')
    expect(effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'bg', value: '#fff', action: 'set' },
    })
    expect(effects).toContainEqual({
      type: 'NOTIFY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'bg', value: '#fff', action: 'set' },
    })
  })

  it('generates effects on PROPERTY_REMOVE', () => {
    const event: PanelEvent = { type: 'PROPERTY_REMOVE', name: 'bg' }

    const { state, effects } = transition(showingState, event)

    expect(state.type).toBe('showing')
    expect(effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'bg', value: '', action: 'remove' },
    })
  })

  it('generates effects on PROPERTY_TOGGLE', () => {
    const event: PanelEvent = { type: 'PROPERTY_TOGGLE', name: 'hidden', enabled: true }

    const { state, effects } = transition(showingState, event)

    expect(state.type).toBe('showing')
    expect(effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'hidden', value: 'true', action: 'toggle' },
    })
  })

  it('toggles section on SECTION_TOGGLE', () => {
    const event: PanelEvent = { type: 'SECTION_TOGGLE', sectionName: 'color' }

    const { state, effects } = transition(showingState, event)

    expect(state.type).toBe('showing')
    if (state.type === 'showing') {
      expect(state.expandedSections.has('color')).toBe(false)
      expect(state.expandedSections.has('spacing')).toBe(true)
    }
    expect(effects).toContainEqual({ type: 'RENDER', state })
  })

  it('expands collapsed section on SECTION_TOGGLE', () => {
    const stateWithCollapsed: ShowingState = {
      ...showingState,
      expandedSections: new Set(['spacing']), // color is not expanded
    }

    const event: PanelEvent = { type: 'SECTION_TOGGLE', sectionName: 'color' }

    const { state } = transition(stateWithCollapsed, event)

    if (state.type === 'showing') {
      expect(state.expandedSections.has('color')).toBe(true)
    }
  })

  it('transitions to pending-update on COMPILE_START', () => {
    const event: PanelEvent = { type: 'COMPILE_START' }

    const { state } = transition(showingState, event)

    expect(state.type).toBe('pending-update')
    if (state.type === 'pending-update') {
      expect(state.pendingNodeId).toBe('node-1')
      expect(state.previousElement).toEqual(mockElement)
    }
  })

  it('transitions to not-found on SELECTION_INVALIDATED for current element', () => {
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'node-1' }

    const { state, effects } = transition(showingState, event)

    expect(state.type).toBe('not-found')
    if (state.type === 'not-found') {
      expect(state.nodeId).toBe('node-1')
    }
    expect(effects).toContainEqual({ type: 'RENDER', state })
  })

  it('ignores SELECTION_INVALIDATED for different element', () => {
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'other-node' }

    const { state } = transition(showingState, event)

    expect(state.type).toBe('showing')
  })

  it('transitions to loading on SELECT with different nodeId', () => {
    const event: PanelEvent = { type: 'SELECT', nodeId: 'node-2' }

    const { state, effects } = transition(showingState, event)

    expect(state.type).toBe('loading')
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('node-2')
    }
    expect(effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-2' })
  })

  it('transitions to empty on SELECT with null', () => {
    const event: PanelEvent = { type: 'SELECT', nodeId: null }

    const { state } = transition(showingState, event)

    expect(state.type).toBe('empty')
  })
})

// ============================================
// State Transitions: pending-update
// ============================================

describe('State Machine: pending-update', () => {
  const pendingState: PendingUpdateState = {
    type: 'pending-update',
    pendingNodeId: 'node-1',
    previousElement: mockElement,
  }

  it('transitions to loading on COMPILE_END', () => {
    const event: PanelEvent = { type: 'COMPILE_END' }

    const { state, effects } = transition(pendingState, event)

    expect(state.type).toBe('loading')
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('node-1')
    }
    expect(effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-1' })
  })

  it('transitions to not-found on SELECTION_INVALIDATED for pending element', () => {
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'node-1' }

    const { state, effects } = transition(pendingState, event)

    expect(state.type).toBe('not-found')
    if (state.type === 'not-found') {
      expect(state.nodeId).toBe('node-1')
    }
    expect(effects).toContainEqual({ type: 'RENDER', state })
  })

  it('ignores SELECTION_INVALIDATED for different element', () => {
    const event: PanelEvent = { type: 'SELECTION_INVALIDATED', nodeId: 'other-node' }

    const { state } = transition(pendingState, event)

    expect(state.type).toBe('pending-update')
  })

  it('ignores property changes', () => {
    const event: PanelEvent = { type: 'PROPERTY_CHANGE', name: 'bg', value: '#fff' }

    const { state, effects } = transition(pendingState, event)

    expect(state.type).toBe('pending-update')
    expect(effects).toHaveLength(0)
  })
})

// ============================================
// State Queries
// ============================================

describe('State Queries', () => {
  const emptyState = createInitialState()
  const loadingState: PanelState = { type: 'loading', nodeId: 'node-1' }
  const notFoundState: PanelState = { type: 'not-found', nodeId: 'node-1' }
  const showingState: ShowingState = {
    type: 'showing',
    element: mockElement,
    expandedSections: new Set(['color']),
    isInPositionedContainer: false,
  }
  const pendingState: PendingUpdateState = {
    type: 'pending-update',
    pendingNodeId: 'node-1',
    previousElement: mockElement,
  }

  describe('isEmpty', () => {
    it('returns true only for empty state', () => {
      expect(isEmpty(emptyState)).toBe(true)
      expect(isEmpty(loadingState)).toBe(false)
      expect(isEmpty(notFoundState)).toBe(false)
      expect(isEmpty(showingState)).toBe(false)
      expect(isEmpty(pendingState)).toBe(false)
    })
  })

  describe('isLoading', () => {
    it('returns true only for loading state', () => {
      expect(isLoading(emptyState)).toBe(false)
      expect(isLoading(loadingState)).toBe(true)
      expect(isLoading(notFoundState)).toBe(false)
      expect(isLoading(showingState)).toBe(false)
      expect(isLoading(pendingState)).toBe(false)
    })
  })

  describe('isNotFound', () => {
    it('returns true only for not-found state', () => {
      expect(isNotFound(emptyState)).toBe(false)
      expect(isNotFound(loadingState)).toBe(false)
      expect(isNotFound(notFoundState)).toBe(true)
      expect(isNotFound(showingState)).toBe(false)
      expect(isNotFound(pendingState)).toBe(false)
    })
  })

  describe('isShowing', () => {
    it('returns true only for showing state', () => {
      expect(isShowing(emptyState)).toBe(false)
      expect(isShowing(loadingState)).toBe(false)
      expect(isShowing(notFoundState)).toBe(false)
      expect(isShowing(showingState)).toBe(true)
      expect(isShowing(pendingState)).toBe(false)
    })
  })

  describe('isPendingUpdate', () => {
    it('returns true only for pending-update state', () => {
      expect(isPendingUpdate(emptyState)).toBe(false)
      expect(isPendingUpdate(loadingState)).toBe(false)
      expect(isPendingUpdate(notFoundState)).toBe(false)
      expect(isPendingUpdate(showingState)).toBe(false)
      expect(isPendingUpdate(pendingState)).toBe(true)
    })
  })

  describe('getCurrentElement', () => {
    it('returns element for showing state', () => {
      expect(getCurrentElement(showingState)).toEqual(mockElement)
    })

    it('returns previousElement for pending-update state', () => {
      expect(getCurrentElement(pendingState)).toEqual(mockElement)
    })

    it('returns null for pending-update without previous element', () => {
      const pendingNoPrev: PendingUpdateState = {
        type: 'pending-update',
        pendingNodeId: 'node-1',
        previousElement: null,
      }
      expect(getCurrentElement(pendingNoPrev)).toBeNull()
    })

    it('returns null for other states', () => {
      expect(getCurrentElement(emptyState)).toBeNull()
      expect(getCurrentElement(loadingState)).toBeNull()
      expect(getCurrentElement(notFoundState)).toBeNull()
    })
  })

  describe('getCurrentNodeId', () => {
    it('returns nodeId for loading state', () => {
      expect(getCurrentNodeId(loadingState)).toBe('node-1')
    })

    it('returns nodeId for not-found state', () => {
      expect(getCurrentNodeId(notFoundState)).toBe('node-1')
    })

    it('returns element nodeId for showing state', () => {
      expect(getCurrentNodeId(showingState)).toBe('node-1')
    })

    it('returns pendingNodeId for pending-update state', () => {
      expect(getCurrentNodeId(pendingState)).toBe('node-1')
    })

    it('returns null for empty state', () => {
      expect(getCurrentNodeId(emptyState)).toBeNull()
    })
  })
})

// ============================================
// Full Selection Sequence
// ============================================

describe('Full Selection Sequence', () => {
  it('completes a successful selection flow', () => {
    let state: PanelState = createInitialState()
    let effects: any[]

    // 1. Select an element
    ;({ state, effects } = transition(state, { type: 'SELECT', nodeId: 'node-1' }))
    expect(state.type).toBe('loading')
    expect(effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-1' })

    // 2. Element loaded
    ;({ state, effects } = transition(state, {
      type: 'ELEMENT_LOADED',
      element: mockElement,
      isInPositionedContainer: false,
    }))
    expect(state.type).toBe('showing')
    expect(getCurrentElement(state)).toEqual(mockElement)

    // 3. Change property
    ;({ state, effects } = transition(state, {
      type: 'PROPERTY_CHANGE',
      name: 'bg',
      value: '#fff',
    }))
    expect(effects).toContainEqual({
      type: 'APPLY_CHANGE',
      nodeId: 'node-1',
      change: { name: 'bg', value: '#fff', action: 'set' },
    })

    // 4. Compile starts
    ;({ state } = transition(state, { type: 'COMPILE_START' }))
    expect(state.type).toBe('pending-update')

    // 5. Compile ends, reload element
    ;({ state, effects } = transition(state, { type: 'COMPILE_END' }))
    expect(state.type).toBe('loading')
    expect(effects).toContainEqual({ type: 'LOAD_ELEMENT', nodeId: 'node-1' })
  })

  it('handles element not found', () => {
    let state: PanelState = createInitialState()

    // 1. Select an element
    ;({ state } = transition(state, { type: 'SELECT', nodeId: 'node-1' }))
    expect(state.type).toBe('loading')

    // 2. Element not found
    ;({ state } = transition(state, { type: 'ELEMENT_NOT_FOUND', nodeId: 'node-1' }))
    expect(state.type).toBe('not-found')
  })

  it('handles selection change while showing', () => {
    let state: PanelState = createInitialState()

    // Setup: Select and show first element
    ;({ state } = transition(state, { type: 'SELECT', nodeId: 'node-1' }))
    ;({ state } = transition(state, {
      type: 'ELEMENT_LOADED',
      element: mockElement,
      isInPositionedContainer: false,
    }))
    expect(state.type).toBe('showing')

    // Select different element
    ;({ state } = transition(state, { type: 'SELECT', nodeId: 'node-2' }))
    expect(state.type).toBe('loading')
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('node-2')
    }
  })

  it('handles selection invalidation during show', () => {
    let state: PanelState = createInitialState()

    // Setup: Select and show element
    ;({ state } = transition(state, { type: 'SELECT', nodeId: 'node-1' }))
    ;({ state } = transition(state, {
      type: 'ELEMENT_LOADED',
      element: mockElement,
      isInPositionedContainer: false,
    }))

    // Element deleted during compile
    ;({ state } = transition(state, { type: 'SELECTION_INVALIDATED', nodeId: 'node-1' }))
    expect(state.type).toBe('not-found')
  })

  it('handles clear selection', () => {
    let state: PanelState = createInitialState()

    // Setup: Select and show element
    ;({ state } = transition(state, { type: 'SELECT', nodeId: 'node-1' }))
    ;({ state } = transition(state, {
      type: 'ELEMENT_LOADED',
      element: mockElement,
      isInPositionedContainer: false,
    }))

    // Clear selection
    ;({ state } = transition(state, { type: 'SELECT', nodeId: null }))
    expect(state.type).toBe('empty')
  })
})

// ============================================
// Definition Selection
// ============================================

describe('Definition Selection', () => {
  it('loads definition on DEFINITION_SELECTED', () => {
    let state: PanelState = createInitialState()
    let effects: any[]

    ;({ state, effects } = transition(state, {
      type: 'DEFINITION_SELECTED',
      componentName: 'MyButton',
    }))

    expect(state.type).toBe('loading')
    if (state.type === 'loading') {
      expect(state.nodeId).toBe('def:MyButton')
    }
    expect(effects).toContainEqual({
      type: 'LOAD_DEFINITION',
      componentName: 'MyButton',
    })
  })
})
