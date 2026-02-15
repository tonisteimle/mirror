/**
 * Behavior Registry Tests
 *
 * Tests for behavior registry state management:
 * - State storage and retrieval
 * - Toggle functionality
 * - Handler lookup
 * - Provider context
 */

import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import {
  BehaviorRegistryProvider,
  useBehaviorRegistry,
  getBehaviorHandler,
} from '../../../generator/behaviors'

describe('behavior registry', () => {
  describe('getBehaviorHandler', () => {
    it('returns handler for FormField', () => {
      const handler = getBehaviorHandler('FormField')
      expect(handler).toBeDefined()
      expect(handler?.name).toBe('FormField')
    })

    it('returns handler for text (DocText)', () => {
      const handler = getBehaviorHandler('text')
      expect(handler).toBeDefined()
      expect(handler?.name).toBe('text')
    })

    it('returns handler for playground', () => {
      const handler = getBehaviorHandler('playground')
      expect(handler).toBeDefined()
      expect(handler?.name).toBe('playground')
    })

    it('returns handler for doc (DocWrapper)', () => {
      const handler = getBehaviorHandler('doc')
      expect(handler).toBeDefined()
      expect(handler?.name).toBe('doc')
    })

    it('returns undefined for unknown component', () => {
      const handler = getBehaviorHandler('UnknownComponent')
      expect(handler).toBeUndefined()
    })

    it('returns undefined for Box (non-library component)', () => {
      const handler = getBehaviorHandler('Box')
      expect(handler).toBeUndefined()
    })
  })

  describe('useBehaviorRegistry without provider', () => {
    it('returns no-op registry when not in provider', () => {
      const { result } = renderHook(() => useBehaviorRegistry())

      expect(result.current.getState('any-id')).toBe('closed')
      expect(() => result.current.setState('any-id', 'open')).not.toThrow()
      expect(() => result.current.toggle('any-id')).not.toThrow()
    })

    it('getHandler still works without provider', () => {
      const { result } = renderHook(() => useBehaviorRegistry())

      const handler = result.current.getHandler('FormField')
      expect(handler).toBeDefined()
    })
  })

  describe('useBehaviorRegistry with provider', () => {
    it('returns default state as closed', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      expect(result.current.getState('component1')).toBe('closed')
    })

    it('sets state correctly', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.setState('component1', 'open')
      })

      expect(result.current.getState('component1')).toBe('open')
    })

    it('manages multiple component states', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.setState('component1', 'open')
        result.current.setState('component2', 'closed')
        result.current.setState('component3', 'open')
      })

      expect(result.current.getState('component1')).toBe('open')
      expect(result.current.getState('component2')).toBe('closed')
      expect(result.current.getState('component3')).toBe('open')
    })

    it('updates existing state', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.setState('component1', 'open')
      })
      expect(result.current.getState('component1')).toBe('open')

      act(() => {
        result.current.setState('component1', 'closed')
      })
      expect(result.current.getState('component1')).toBe('closed')
    })

    it('toggle toggles between closed and open', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      // Default state returned by getState is 'closed' (but internally undefined)
      expect(result.current.getState('component1')).toBe('closed')

      // First toggle: undefined → 'open' (for hidden elements: becomes visible)
      act(() => {
        result.current.toggle('component1')
      })
      expect(result.current.getState('component1')).toBe('open')

      // Second toggle: 'open' → 'closed'
      act(() => {
        result.current.toggle('component1')
      })
      expect(result.current.getState('component1')).toBe('closed')

      // Third toggle: 'closed' → 'open'
      act(() => {
        result.current.toggle('component1')
      })
      expect(result.current.getState('component1')).toBe('open')
    })

    it('toggle works independently for multiple components', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      // First toggle on component1: undefined → 'open'
      act(() => {
        result.current.toggle('component1')
      })
      expect(result.current.getState('component1')).toBe('open')
      expect(result.current.getState('component2')).toBe('closed') // still default

      // Second toggle on component1: 'open' → 'closed'
      act(() => {
        result.current.toggle('component1')
      })
      expect(result.current.getState('component1')).toBe('closed')

      // First toggle on component2: undefined → 'open'
      act(() => {
        result.current.toggle('component2')
      })
      expect(result.current.getState('component1')).toBe('closed')
      expect(result.current.getState('component2')).toBe('open')
    })
  })

  describe('BehaviorRegistryProvider', () => {
    it('provides context to nested components', () => {
      function TestComponent() {
        const registry = useBehaviorRegistry()
        return (
          <div>
            <button onClick={() => registry.setState('test', 'open')}>Open</button>
            <span data-testid="state">{registry.getState('test')}</span>
          </div>
        )
      }

      render(
        <BehaviorRegistryProvider>
          <TestComponent />
        </BehaviorRegistryProvider>
      )

      expect(screen.getByTestId('state').textContent).toBe('closed')

      fireEvent.click(screen.getByText('Open'))

      expect(screen.getByTestId('state').textContent).toBe('open')
    })

    it('shares state between sibling components', () => {
      function StateReader() {
        const registry = useBehaviorRegistry()
        return <span data-testid="reader">{registry.getState('shared')}</span>
      }

      function StateWriter() {
        const registry = useBehaviorRegistry()
        return (
          <button onClick={() => registry.setState('shared', 'open')}>
            Open Shared
          </button>
        )
      }

      render(
        <BehaviorRegistryProvider>
          <StateReader />
          <StateWriter />
        </BehaviorRegistryProvider>
      )

      expect(screen.getByTestId('reader').textContent).toBe('closed')

      fireEvent.click(screen.getByText('Open Shared'))

      expect(screen.getByTestId('reader').textContent).toBe('open')
    })

    it('isolates state between different providers', () => {
      function TestComponent({ id }: { id: string }) {
        const registry = useBehaviorRegistry()
        return (
          <div>
            <button onClick={() => registry.setState('comp', 'open')}>
              Open {id}
            </button>
            <span data-testid={`state-${id}`}>{registry.getState('comp')}</span>
          </div>
        )
      }

      render(
        <>
          <BehaviorRegistryProvider>
            <TestComponent id="a" />
          </BehaviorRegistryProvider>
          <BehaviorRegistryProvider>
            <TestComponent id="b" />
          </BehaviorRegistryProvider>
        </>
      )

      expect(screen.getByTestId('state-a').textContent).toBe('closed')
      expect(screen.getByTestId('state-b').textContent).toBe('closed')

      fireEvent.click(screen.getByText('Open a'))

      expect(screen.getByTestId('state-a').textContent).toBe('open')
      expect(screen.getByTestId('state-b').textContent).toBe('closed')
    })
  })

  // ==========================================================================
  // Highlight Behavior
  // ==========================================================================
  describe('highlight behavior', () => {
    it('highlights an item in a container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.highlight('item-1', 'container')
      })

      expect(result.current.isItemHighlighted('item-1', 'container')).toBe(true)
      expect(result.current.isItemHighlighted('item-2', 'container')).toBe(false)
    })

    it('replaces previous highlight with new one', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.highlight('item-1', 'container')
      })
      expect(result.current.isItemHighlighted('item-1', 'container')).toBe(true)

      act(() => {
        result.current.highlight('item-2', 'container')
      })
      expect(result.current.isItemHighlighted('item-1', 'container')).toBe(false)
      expect(result.current.isItemHighlighted('item-2', 'container')).toBe(true)
    })

    it('highlights next item in container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      // Register items in container
      act(() => {
        result.current.registerContainerItem('container', 'item-1')
        result.current.registerContainerItem('container', 'item-2')
        result.current.registerContainerItem('container', 'item-3')
      })

      // Highlight first
      act(() => {
        result.current.highlightFirst('container')
      })
      expect(result.current.isItemHighlighted('item-1', 'container')).toBe(true)

      // Move to next
      act(() => {
        result.current.highlightNext('container')
      })
      expect(result.current.isItemHighlighted('item-2', 'container')).toBe(true)
    })

    it('highlights prev item in container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('container', 'item-1')
        result.current.registerContainerItem('container', 'item-2')
        result.current.registerContainerItem('container', 'item-3')
      })

      // Highlight last
      act(() => {
        result.current.highlightLast('container')
      })
      expect(result.current.isItemHighlighted('item-3', 'container')).toBe(true)

      // Move to prev
      act(() => {
        result.current.highlightPrev('container')
      })
      expect(result.current.isItemHighlighted('item-2', 'container')).toBe(true)
    })

    it('clears highlights with highlightNone', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.highlight('item-1', 'container')
      })
      expect(result.current.isItemHighlighted('item-1', 'container')).toBe(true)

      act(() => {
        result.current.highlightNone('container')
      })
      expect(result.current.isItemHighlighted('item-1', 'container')).toBe(false)
    })
  })

  // ==========================================================================
  // Select Behavior
  // ==========================================================================
  describe('select behavior', () => {
    it('selects an item in a container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.select('item-1', 'container')
      })

      expect(result.current.isItemSelected('item-1', 'container')).toBe(true)
      expect(result.current.isItemSelected('item-2', 'container')).toBe(false)
    })

    it('selects highlighted item', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.highlight('item-2', 'container')
      })

      act(() => {
        result.current.selectHighlighted('container')
      })

      expect(result.current.isItemSelected('item-2', 'container')).toBe(true)
    })

    it('clears selection with selectNone', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.select('item-1', 'container')
      })
      expect(result.current.isItemSelected('item-1', 'container')).toBe(true)

      act(() => {
        result.current.selectNone('container')
      })
      expect(result.current.isItemSelected('item-1', 'container')).toBe(false)
    })
  })

  // ==========================================================================
  // Filter Behavior
  // ==========================================================================
  describe('filter behavior', () => {
    it('sets filter query for container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.filter('searchResults', 'query')
      })

      expect(result.current.getFilterQuery('searchResults')).toBe('query')
    })

    it('returns empty string for unset filter', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      expect(result.current.getFilterQuery('unset')).toBe('')
    })

    it('updates filter query', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.filter('results', 'first')
      })
      expect(result.current.getFilterQuery('results')).toBe('first')

      act(() => {
        result.current.filter('results', 'second')
      })
      expect(result.current.getFilterQuery('results')).toBe('second')
    })
  })

  // ==========================================================================
  // Container Item Management
  // ==========================================================================
  describe('container item management', () => {
    it('registers items in container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('list', 'item-1')
        result.current.registerContainerItem('list', 'item-2')
      })

      // Verify by using highlight navigation
      act(() => {
        result.current.highlightFirst('list')
      })
      expect(result.current.isItemHighlighted('item-1', 'list')).toBe(true)

      act(() => {
        result.current.highlightLast('list')
      })
      expect(result.current.isItemHighlighted('item-2', 'list')).toBe(true)
    })

    it('does not duplicate items', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('list', 'item-1')
        result.current.registerContainerItem('list', 'item-1')
        result.current.registerContainerItem('list', 'item-2')
      })

      // Should only have 2 items, not 3
      act(() => {
        result.current.highlightFirst('list')
      })
      act(() => {
        result.current.highlightNext('list')
      })
      // Should be at last item (item-2) after one "next" from first
      expect(result.current.isItemHighlighted('item-2', 'list')).toBe(true)
    })

    it('unregisters items from container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('list', 'item-1')
        result.current.registerContainerItem('list', 'item-2')
      })

      act(() => {
        result.current.unregisterContainerItem('list', 'item-1')
      })

      // Highlight first should now be item-2
      act(() => {
        result.current.highlightFirst('list')
      })
      expect(result.current.isItemHighlighted('item-2', 'list')).toBe(true)
    })
  })

  // ==========================================================================
  // Multi-Item Selection (Rating Pattern)
  // ==========================================================================
  describe('multi-item behaviors', () => {
    it('highlights self and all items before', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('rating', 'star-1')
        result.current.registerContainerItem('rating', 'star-2')
        result.current.registerContainerItem('rating', 'star-3')
        result.current.registerContainerItem('rating', 'star-4')
        result.current.registerContainerItem('rating', 'star-5')
      })

      act(() => {
        result.current.highlightSelfAndBefore('star-3', 'rating')
      })

      // Stars 1, 2, 3 should be highlighted
      expect(result.current.isItemHighlighted('star-1', 'rating')).toBe(true)
      expect(result.current.isItemHighlighted('star-2', 'rating')).toBe(true)
      expect(result.current.isItemHighlighted('star-3', 'rating')).toBe(true)
      // Stars 4, 5 should not be highlighted
      expect(result.current.isItemHighlighted('star-4', 'rating')).toBe(false)
      expect(result.current.isItemHighlighted('star-5', 'rating')).toBe(false)
    })

    it('selects self and all items before', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('rating', 'star-1')
        result.current.registerContainerItem('rating', 'star-2')
        result.current.registerContainerItem('rating', 'star-3')
      })

      act(() => {
        result.current.selectSelfAndBefore('star-2', 'rating')
      })

      expect(result.current.isItemSelected('star-1', 'rating')).toBe(true)
      expect(result.current.isItemSelected('star-2', 'rating')).toBe(true)
      expect(result.current.isItemSelected('star-3', 'rating')).toBe(false)
    })

    it('highlights all items in container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('list', 'item-1')
        result.current.registerContainerItem('list', 'item-2')
        result.current.registerContainerItem('list', 'item-3')
      })

      act(() => {
        result.current.highlightAll('list')
      })

      expect(result.current.isItemHighlighted('item-1', 'list')).toBe(true)
      expect(result.current.isItemHighlighted('item-2', 'list')).toBe(true)
      expect(result.current.isItemHighlighted('item-3', 'list')).toBe(true)
    })

    it('selects all items in container', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('list', 'item-1')
        result.current.registerContainerItem('list', 'item-2')
      })

      act(() => {
        result.current.selectAll('list')
      })

      expect(result.current.isItemSelected('item-1', 'list')).toBe(true)
      expect(result.current.isItemSelected('item-2', 'list')).toBe(true)
    })
  })

  // ==========================================================================
  // Deactivate Siblings
  // ==========================================================================
  describe('deactivate siblings', () => {
    it('deactivates all siblings except specified item', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.registerContainerItem('tabs', 'tab-1')
        result.current.registerContainerItem('tabs', 'tab-2')
        result.current.registerContainerItem('tabs', 'tab-3')
      })

      // First activate all tabs
      act(() => {
        result.current.setState('tab-1', 'active')
        result.current.setState('tab-2', 'active')
        result.current.setState('tab-3', 'active')
      })

      // Deactivate siblings of tab-2
      act(() => {
        result.current.deactivateSiblings('tab-2', 'tabs')
      })

      // tab-2 should still have its state, siblings should be inactive
      expect(result.current.getState('tab-1')).toBe('inactive')
      expect(result.current.getState('tab-3')).toBe('inactive')
    })
  })
})
