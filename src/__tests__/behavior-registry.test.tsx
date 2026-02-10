/**
 * Behavior Registry Tests
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BehaviorRegistryProvider, useBehaviorRegistry } from '../generator/behaviors/registry'

describe('BehaviorRegistry', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BehaviorRegistryProvider>{children}</BehaviorRegistryProvider>
  )

  it('should return closed as default state', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })
    expect(result.current.getState('test-component')).toBe('closed')
  })

  it('should set state correctly', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })

    act(() => {
      result.current.setState('dropdown1', 'open')
    })

    expect(result.current.getState('dropdown1')).toBe('open')
  })

  it('should toggle between states', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })

    // Initial state
    expect(result.current.getState('menu')).toBe('closed')

    // Toggle to open
    act(() => {
      result.current.toggle('menu')
    })
    expect(result.current.getState('menu')).toBe('open')

    // Toggle back to closed
    act(() => {
      result.current.toggle('menu')
    })
    expect(result.current.getState('menu')).toBe('closed')
  })

  it('should handle multiple components independently', () => {
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

  it('should return no-op registry without provider', () => {
    const { result } = renderHook(() => useBehaviorRegistry())

    // Should not throw, just return defaults
    expect(result.current.getState('anything')).toBe('closed')

    // These should be no-ops
    act(() => {
      result.current.setState('test', 'open')
      result.current.toggle('test')
    })

    // Still closed because no provider
    expect(result.current.getState('test')).toBe('closed')
  })

  it('should provide handler lookup', () => {
    const { result } = renderHook(() => useBehaviorRegistry(), { wrapper })

    const dropdownHandler = result.current.getHandler('Dropdown')
    expect(dropdownHandler).toBeDefined()
    expect(dropdownHandler?.name).toBe('Dropdown')

    const unknownHandler = result.current.getHandler('UnknownComponent')
    expect(unknownHandler).toBeUndefined()
  })
})
