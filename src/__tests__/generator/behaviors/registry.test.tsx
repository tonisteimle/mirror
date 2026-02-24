import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BehaviorRegistryProvider } from '../../../generator/behaviors/registry'
import { useBehaviorRegistry } from '../../../generator/behaviors/registry-hooks'
import { BehaviorRegistryContext } from '../../../generator/behaviors/behavior-context'
import { useContext } from 'react'

// Hook to access raw context
function useRawBehaviorContext() {
  return useContext(BehaviorRegistryContext)
}

describe('BehaviorRegistryProvider', () => {
  describe('state management', () => {
    it('sets and gets component state', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.setState('dropdown-1', 'open')
      })

      expect(result.current?.states.get('dropdown-1')).toBe('open')
    })

    it('toggles between states', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      // Toggle from undefined to second state
      act(() => {
        result.current?.toggle('toggle-1', ['off', 'on'])
      })
      expect(result.current?.states.get('toggle-1')).toBe('on')

      // Toggle back
      act(() => {
        result.current?.toggle('toggle-1', ['off', 'on'])
      })
      expect(result.current?.states.get('toggle-1')).toBe('off')
    })
  })

  describe('highlight behavior', () => {
    it('highlights single item in container', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.highlight('item-2', 'menu-1')
      })

      expect(result.current?.highlightedItems.get('menu-1')).toBe('item-2')
    })

    it('highlights next item', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      // Register items first
      act(() => {
        result.current?.registerContainerItem('menu-1', 'item-1')
        result.current?.registerContainerItem('menu-1', 'item-2')
        result.current?.registerContainerItem('menu-1', 'item-3')
      })

      // Highlight first item
      act(() => {
        result.current?.highlight('item-1', 'menu-1')
      })

      // Highlight next
      act(() => {
        result.current?.highlightNext('menu-1')
      })

      expect(result.current?.highlightedItems.get('menu-1')).toBe('item-2')
    })

    it('highlights prev item', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      // Register items
      act(() => {
        result.current?.registerContainerItem('menu-1', 'item-1')
        result.current?.registerContainerItem('menu-1', 'item-2')
        result.current?.registerContainerItem('menu-1', 'item-3')
      })

      // Highlight last
      act(() => {
        result.current?.highlight('item-3', 'menu-1')
      })

      // Highlight prev
      act(() => {
        result.current?.highlightPrev('menu-1')
      })

      expect(result.current?.highlightedItems.get('menu-1')).toBe('item-2')
    })

    it('highlights first item', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('list-1', 'a')
        result.current?.registerContainerItem('list-1', 'b')
        result.current?.registerContainerItem('list-1', 'c')
      })

      act(() => {
        result.current?.highlightFirst('list-1')
      })

      expect(result.current?.highlightedItems.get('list-1')).toBe('a')
    })

    it('highlights last item', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('list-1', 'a')
        result.current?.registerContainerItem('list-1', 'b')
        result.current?.registerContainerItem('list-1', 'c')
      })

      act(() => {
        result.current?.highlightLast('list-1')
      })

      expect(result.current?.highlightedItems.get('list-1')).toBe('c')
    })

    it('highlights self and before (rating pattern)', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('rating', 'star-1')
        result.current?.registerContainerItem('rating', 'star-2')
        result.current?.registerContainerItem('rating', 'star-3')
        result.current?.registerContainerItem('rating', 'star-4')
        result.current?.registerContainerItem('rating', 'star-5')
      })

      act(() => {
        result.current?.highlightSelfAndBefore('star-3', 'rating')
      })

      const highlighted = result.current?.highlightedItemSets.get('rating')
      expect(highlighted?.has('star-1')).toBe(true)
      expect(highlighted?.has('star-2')).toBe(true)
      expect(highlighted?.has('star-3')).toBe(true)
      expect(highlighted?.has('star-4')).toBe(false)
      expect(highlighted?.has('star-5')).toBe(false)
    })

    it('clears highlights with highlightNone', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.highlight('item-1', 'menu')
      })

      act(() => {
        result.current?.highlightNone('menu')
      })

      expect(result.current?.highlightedItems.get('menu')).toBeUndefined()
    })
  })

  describe('select behavior', () => {
    it('selects single item', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.select('option-2', 'dropdown')
      })

      expect(result.current?.selectedItems.get('dropdown')).toBe('option-2')
    })

    it('selects highlighted item', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.highlight('option-3', 'dropdown')
      })

      act(() => {
        result.current?.selectHighlighted('dropdown')
      })

      expect(result.current?.selectedItems.get('dropdown')).toBe('option-3')
    })

    it('selects self and before (rating pattern)', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('rating', 'star-1')
        result.current?.registerContainerItem('rating', 'star-2')
        result.current?.registerContainerItem('rating', 'star-3')
      })

      act(() => {
        result.current?.selectSelfAndBefore('star-2', 'rating')
      })

      const selected = result.current?.selectedItemSets.get('rating')
      expect(selected?.has('star-1')).toBe(true)
      expect(selected?.has('star-2')).toBe(true)
      expect(selected?.has('star-3')).toBe(false)
    })

    it('clears selection with selectNone', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.select('item-1', 'list')
      })

      act(() => {
        result.current?.selectNone('list')
      })

      expect(result.current?.selectedItems.get('list')).toBeUndefined()
    })
  })

  describe('filter behavior', () => {
    it('sets filter query for container', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.filter('list', 'search term')
      })

      expect(result.current?.filterQueries.get('list')).toBe('search term')
    })
  })

  describe('container item registration', () => {
    it('registers items to container', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('menu', 'item-1')
        result.current?.registerContainerItem('menu', 'item-2')
      })

      expect(result.current?.containerItems.get('menu')).toEqual(['item-1', 'item-2'])
    })

    it('prevents duplicate registration', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('menu', 'item-1')
        result.current?.registerContainerItem('menu', 'item-1')
      })

      expect(result.current?.containerItems.get('menu')).toEqual(['item-1'])
    })

    it('unregisters items from container', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('menu', 'item-1')
        result.current?.registerContainerItem('menu', 'item-2')
      })

      act(() => {
        result.current?.unregisterContainerItem('menu', 'item-1')
      })

      expect(result.current?.containerItems.get('menu')).toEqual(['item-2'])
    })
  })

  describe('deactivate siblings', () => {
    it('deactivates all sibling items', () => {
      const { result } = renderHook(() => useRawBehaviorContext(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current?.registerContainerItem('tabs', 'tab-1')
        result.current?.registerContainerItem('tabs', 'tab-2')
        result.current?.registerContainerItem('tabs', 'tab-3')
      })

      // Activate all first
      act(() => {
        result.current?.setState('tab-1', 'active')
        result.current?.setState('tab-2', 'active')
        result.current?.setState('tab-3', 'active')
      })

      // Deactivate siblings of tab-2
      act(() => {
        result.current?.deactivateSiblings('tab-2', 'tabs')
      })

      expect(result.current?.states.get('tab-1')).toBe('inactive')
      expect(result.current?.states.get('tab-2')).toBe('active') // Should remain active
      expect(result.current?.states.get('tab-3')).toBe('inactive')
    })
  })
})
