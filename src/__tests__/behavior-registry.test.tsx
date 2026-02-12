/**
 * Behavior Registry Tests
 *
 * Testing the behavior registry hook and state management.
 */
import { describe, it, expect } from './kit'
import { renderHook, act } from '@testing-library/react'
import { BehaviorRegistryProvider, useBehaviorRegistry } from '../generator/behaviors/registry'

describe('BehaviorRegistry', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BehaviorRegistryProvider>{children}</BehaviorRegistryProvider>
  )

  it('returns closed as default state', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })
    expect(result.current.getState('test-component')).toBe('closed')
  })

  it('sets state correctly', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })
    act(() => {
      result.current.setState('dropdown1', 'open')
    })
    expect(result.current.getState('dropdown1')).toBe('open')
  })

  it('toggles between states', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })

    // Default state is 'closed' (but internally undefined)
    expect(result.current.getState('menu')).toBe('closed')

    // First toggle: undefined → 'open' (for hidden elements: becomes visible)
    act(() => {
      result.current.toggle('menu')
    })
    expect(result.current.getState('menu')).toBe('open')

    // Second toggle: 'open' → 'closed'
    act(() => {
      result.current.toggle('menu')
    })
    expect(result.current.getState('menu')).toBe('closed')

    // Third toggle: 'closed' → 'open'
    act(() => {
      result.current.toggle('menu')
    })
    expect(result.current.getState('menu')).toBe('open')
  })

  it('handles multiple components independently', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })

    act(() => {
      result.current.setState('dropdown1', 'open')
      result.current.setState('dropdown2', 'closed')
      result.current.setState('dialog1', 'open')
    })

    expect(result.current.getState('dropdown1')).toBe('open')
    expect(result.current.getState('dropdown2')).toBe('closed')
    expect(result.current.getState('dialog1')).toBe('open')
  })

  it('returns no-op registry without provider', () => {
    const { result } = renderHook(() => useBehaviorRegistry())

    expect(result.current.getState('anything')).toBe('closed')

    act(() => {
      result.current.setState('test', 'open')
      result.current.toggle('test')
    })

    expect(result.current.getState('test')).toBe('closed')
  })

  it('provides handler lookup', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })

    const dropdownHandler = result.current.getHandler('Dropdown')
    expect(dropdownHandler).toBeDefined()
    expect(dropdownHandler?.name).toBe('Dropdown')

    const unknownHandler = result.current.getHandler('UnknownComponent')
    expect(unknownHandler).toBeUndefined()
  })
})
