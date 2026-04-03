/**
 * Test API Core Tests
 *
 * Verifies that the Test API structure and types are correct.
 * For actual DOM interaction tests, see tests/e2e/test-api.spec.ts
 */

import { describe, it, expect } from 'vitest'
import { createTestAPI, type MirrorTestAPI, type StateMachineInfo } from '../../compiler/runtime/test-api'

// Mock runtime functions for unit testing
const mockRuntime = {
  transitionTo: vi.fn(),
  stateMachineToggle: vi.fn(),
  exclusiveTransition: vi.fn(),
}

import { vi } from 'vitest'

describe('Test API Structure', () => {
  let api: MirrorTestAPI

  beforeEach(() => {
    vi.clearAllMocks()
    api = createTestAPI(mockRuntime)
  })

  describe('API Interface', () => {
    it('should have all element access methods', () => {
      expect(typeof api.getElement).toBe('function')
      expect(typeof api.getAllElements).toBe('function')
      expect(typeof api.findByName).toBe('function')
    })

    it('should have all state inspection methods', () => {
      expect(typeof api.getState).toBe('function')
      expect(typeof api.getAvailableStates).toBe('function')
      expect(typeof api.getStyles).toBe('function')
      expect(typeof api.getBaseStyles).toBe('function')
    })

    it('should have all state manipulation methods', () => {
      expect(typeof api.setState).toBe('function')
      expect(typeof api.resetToBase).toBe('function')
    })

    it('should have all event simulation methods', () => {
      expect(typeof api.trigger).toBe('function')
      expect(typeof api.triggerKey).toBe('function')
    })

    it('should have all built-in function methods', () => {
      expect(typeof api.toggle).toBe('function')
      expect(typeof api.exclusive).toBe('function')
    })

    it('should have all visibility methods', () => {
      expect(typeof api.isVisible).toBe('function')
      expect(typeof api.isHidden).toBe('function')
      expect(typeof api.getVisibilityState).toBe('function')
    })

    it('should have all async helper methods', () => {
      expect(typeof api.waitForVisible).toBe('function')
      expect(typeof api.waitForHidden).toBe('function')
    })

    it('should have all debug methods', () => {
      expect(typeof api.logStateMachine).toBe('function')
      expect(typeof api.getStateMachineInfo).toBe('function')
    })
  })

  describe('Null Safety', () => {
    it('getState should return "default" for null element', () => {
      expect(api.getState(null as any)).toBe('default')
    })

    it('getAvailableStates should return ["default"] for null element', () => {
      expect(api.getAvailableStates(null as any)).toEqual(['default'])
    })

    it('getStyles should return empty object for null element', () => {
      expect(api.getStyles(null as any)).toEqual({})
    })

    it('getBaseStyles should return empty object for null element', () => {
      expect(api.getBaseStyles(null as any)).toEqual({})
    })

    it('setState should not throw for null element', () => {
      expect(() => api.setState(null as any, 'test')).not.toThrow()
    })

    it('resetToBase should not throw for null element', () => {
      expect(() => api.resetToBase(null as any)).not.toThrow()
    })

    it('trigger should not throw for null element', () => {
      expect(() => api.trigger(null as any, 'click')).not.toThrow()
    })

    it('triggerKey should not throw for null element', () => {
      expect(() => api.triggerKey(null as any, 'enter')).not.toThrow()
    })

    it('toggle should not throw for null element', () => {
      expect(() => api.toggle(null as any)).not.toThrow()
    })

    it('exclusive should not throw for null element', () => {
      expect(() => api.exclusive(null as any)).not.toThrow()
    })

    it('isVisible should return false for null element', () => {
      expect(api.isVisible(null as any)).toBe(false)
    })

    it('getVisibilityState should return hidden state for null element', () => {
      const state = api.getVisibilityState(null as any)
      expect(state.visible).toBe(false)
      expect(state.hidden).toBe(true)
    })

    it('getStateMachineInfo should return null for null element', () => {
      expect(api.getStateMachineInfo(null as any)).toBeNull()
    })
  })

  describe('Runtime Integration', () => {
    const mockElement = {
      _stateMachine: {
        current: 'default',
        initial: 'default',
        states: { default: {}, on: {} },
        transitions: [],
      },
    } as any

    it('setState should call runtime.transitionTo', () => {
      api.setState(mockElement, 'on')
      expect(mockRuntime.transitionTo).toHaveBeenCalledWith(mockElement, 'on')
    })

    it('resetToBase should call runtime.transitionTo with "default"', () => {
      api.resetToBase(mockElement)
      expect(mockRuntime.transitionTo).toHaveBeenCalledWith(mockElement, 'default')
    })

    it('toggle should call runtime.stateMachineToggle', () => {
      api.toggle(mockElement)
      expect(mockRuntime.stateMachineToggle).toHaveBeenCalledWith(mockElement, undefined)
    })

    it('toggle with states should call runtime.stateMachineToggle with states', () => {
      api.toggle(mockElement, ['a', 'b', 'c'])
      expect(mockRuntime.stateMachineToggle).toHaveBeenCalledWith(mockElement, ['a', 'b', 'c'])
    })

    it('exclusive should call runtime.exclusiveTransition', () => {
      api.exclusive(mockElement, 'active')
      expect(mockRuntime.exclusiveTransition).toHaveBeenCalledWith(mockElement, 'active')
    })

    it('exclusive without state should determine target state from state machine', () => {
      api.exclusive(mockElement)
      // Should find first non-default state ('on')
      expect(mockRuntime.exclusiveTransition).toHaveBeenCalledWith(mockElement, 'on')
    })
  })

  describe('State Machine Info', () => {
    it('should extract state machine info correctly', () => {
      const mockElement = {
        _stateMachine: {
          current: 'active',
          initial: 'default',
          states: {
            default: { styles: {} },
            active: { styles: { background: '#2563eb' } },
            disabled: { styles: { opacity: '0.5' } },
          },
          transitions: [
            { to: 'active', trigger: 'onclick' },
            { to: 'disabled', trigger: 'ondisable', key: 'escape' },
          ],
        },
      } as any

      const info = api.getStateMachineInfo(mockElement)

      expect(info).not.toBeNull()
      expect(info!.current).toBe('active')
      expect(info!.initial).toBe('default')
      expect(info!.states).toEqual(['default', 'active', 'disabled'])
      expect(info!.transitions).toHaveLength(2)
      expect(info!.transitions[0]).toEqual({ to: 'active', trigger: 'onclick', key: undefined, modifier: undefined })
      expect(info!.transitions[1]).toEqual({ to: 'disabled', trigger: 'ondisable', key: 'escape', modifier: undefined })
    })

    it('should return null for element without state machine', () => {
      const mockElement = {} as any
      expect(api.getStateMachineInfo(mockElement)).toBeNull()
    })
  })

  // Key Mapping tests require browser environment (KeyboardEvent)
  // See tests/e2e/test-api.spec.ts for browser-based tests
  describe.skip('Key Mapping (requires browser)', () => {
    it('should map keys correctly', () => {
      // Tested in E2E tests
    })
  })
})

describe('StateMachineInfo Type', () => {
  it('should have correct shape', () => {
    const info: StateMachineInfo = {
      current: 'active',
      initial: 'default',
      states: ['default', 'active'],
      transitions: [{ trigger: 'onclick', to: 'active' }],
    }

    expect(info.current).toBeDefined()
    expect(info.initial).toBeDefined()
    expect(info.states).toBeInstanceOf(Array)
    expect(info.transitions).toBeInstanceOf(Array)
  })
})
