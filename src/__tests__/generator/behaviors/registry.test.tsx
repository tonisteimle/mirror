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
} from '../../../generator/behaviors/registry'

describe('behavior registry', () => {
  describe('getBehaviorHandler', () => {
    it('returns handler for known component', () => {
      const handler = getBehaviorHandler('Dropdown')
      expect(handler).toBeDefined()
      expect(handler?.name).toBe('Dropdown')
    })

    it('returns handler for Dialog', () => {
      const handler = getBehaviorHandler('Dialog')
      expect(handler).toBeDefined()
      expect(handler?.name).toBe('Dialog')
    })

    it('returns handler for Tabs', () => {
      const handler = getBehaviorHandler('Tabs')
      expect(handler).toBeDefined()
      expect(handler?.name).toBe('Tabs')
    })

    it('returns handler for Accordion', () => {
      const handler = getBehaviorHandler('Accordion')
      expect(handler).toBeDefined()
    })

    it('returns handler for Select', () => {
      const handler = getBehaviorHandler('Select')
      expect(handler).toBeDefined()
    })

    it('returns handler for Popover', () => {
      const handler = getBehaviorHandler('Popover')
      expect(handler).toBeDefined()
    })

    it('returns handler for Tooltip', () => {
      const handler = getBehaviorHandler('Tooltip')
      expect(handler).toBeDefined()
    })

    it('returns handler for Switch', () => {
      const handler = getBehaviorHandler('Switch')
      expect(handler).toBeDefined()
    })

    it('returns handler for Checkbox', () => {
      const handler = getBehaviorHandler('Checkbox')
      expect(handler).toBeDefined()
    })

    it('returns handler for Slider', () => {
      const handler = getBehaviorHandler('Slider')
      expect(handler).toBeDefined()
    })

    it('returns handler for Progress', () => {
      const handler = getBehaviorHandler('Progress')
      expect(handler).toBeDefined()
    })

    it('returns handler for Avatar', () => {
      const handler = getBehaviorHandler('Avatar')
      expect(handler).toBeDefined()
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

      const handler = result.current.getHandler('Dropdown')
      expect(handler).toBeDefined()
    })
  })

  describe('useBehaviorRegistry with provider', () => {
    it('returns default state as closed', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      expect(result.current.getState('dropdown1')).toBe('closed')
    })

    it('sets state correctly', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.setState('dropdown1', 'open')
      })

      expect(result.current.getState('dropdown1')).toBe('open')
    })

    it('manages multiple component states', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.setState('dropdown1', 'open')
        result.current.setState('dialog1', 'closed')
        result.current.setState('accordion1', 'open')
      })

      expect(result.current.getState('dropdown1')).toBe('open')
      expect(result.current.getState('dialog1')).toBe('closed')
      expect(result.current.getState('accordion1')).toBe('open')
    })

    it('updates existing state', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      act(() => {
        result.current.setState('dropdown1', 'open')
      })
      expect(result.current.getState('dropdown1')).toBe('open')

      act(() => {
        result.current.setState('dropdown1', 'closed')
      })
      expect(result.current.getState('dropdown1')).toBe('closed')
    })

    it('toggle toggles between closed and open', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      // Default state returned by getState is 'closed' (but internally undefined)
      expect(result.current.getState('dropdown1')).toBe('closed')

      // First toggle: undefined → 'open' (for hidden elements: becomes visible)
      act(() => {
        result.current.toggle('dropdown1')
      })
      expect(result.current.getState('dropdown1')).toBe('open')

      // Second toggle: 'open' → 'closed'
      act(() => {
        result.current.toggle('dropdown1')
      })
      expect(result.current.getState('dropdown1')).toBe('closed')

      // Third toggle: 'closed' → 'open'
      act(() => {
        result.current.toggle('dropdown1')
      })
      expect(result.current.getState('dropdown1')).toBe('open')
    })

    it('toggle works independently for multiple components', () => {
      const { result } = renderHook(() => useBehaviorRegistry(), {
        wrapper: BehaviorRegistryProvider,
      })

      // First toggle on dropdown1: undefined → 'open'
      act(() => {
        result.current.toggle('dropdown1')
      })
      expect(result.current.getState('dropdown1')).toBe('open')
      expect(result.current.getState('dropdown2')).toBe('closed') // still default

      // Second toggle on dropdown1: 'open' → 'closed'
      act(() => {
        result.current.toggle('dropdown1')
      })
      expect(result.current.getState('dropdown1')).toBe('closed')

      // First toggle on dropdown2: undefined → 'open'
      act(() => {
        result.current.toggle('dropdown2')
      })
      expect(result.current.getState('dropdown1')).toBe('closed')
      expect(result.current.getState('dropdown2')).toBe('open')
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
})
