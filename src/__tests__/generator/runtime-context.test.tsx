/**
 * Runtime Context Tests
 *
 * Tests for RuntimeVariableProvider and useRuntimeVariables:
 * - Variable storage and retrieval
 * - Variable updates
 * - Context nesting
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import {
  RuntimeVariableProvider,
  useRuntimeVariables,
} from '../../generator/runtime-context'

describe('RuntimeVariableContext', () => {
  describe('useRuntimeVariables without provider', () => {
    it('returns empty variables object', () => {
      const { result } = renderHook(() => useRuntimeVariables())
      expect(result.current.variables).toEqual({})
    })

    it('setVariable is a no-op', () => {
      const { result } = renderHook(() => useRuntimeVariables())
      expect(() => result.current.setVariable('test', 'value')).not.toThrow()
    })
  })

  describe('RuntimeVariableProvider', () => {
    it('provides empty variables by default', () => {
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: RuntimeVariableProvider,
      })

      expect(result.current.variables).toEqual({})
    })

    it('provides initial variables', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeVariableProvider initialVariables={{ count: 5, name: 'test' }}>
          {children}
        </RuntimeVariableProvider>
      )

      const { result } = renderHook(() => useRuntimeVariables(), { wrapper })

      expect(result.current.variables.count).toBe(5)
      expect(result.current.variables.name).toBe('test')
    })

    it('setVariable updates a variable', () => {
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: RuntimeVariableProvider,
      })

      act(() => {
        result.current.setVariable('count', 10)
      })

      expect(result.current.variables.count).toBe(10)
    })

    it('setVariable adds new variables', () => {
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: RuntimeVariableProvider,
      })

      act(() => {
        result.current.setVariable('first', 1)
        result.current.setVariable('second', 2)
      })

      expect(result.current.variables.first).toBe(1)
      expect(result.current.variables.second).toBe(2)
    })

    it('setVariable updates existing variables', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeVariableProvider initialVariables={{ count: 0 }}>
          {children}
        </RuntimeVariableProvider>
      )

      const { result } = renderHook(() => useRuntimeVariables(), { wrapper })

      expect(result.current.variables.count).toBe(0)

      act(() => {
        result.current.setVariable('count', 42)
      })

      expect(result.current.variables.count).toBe(42)
    })

    it('preserves other variables when updating one', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeVariableProvider initialVariables={{ a: 1, b: 2, c: 3 }}>
          {children}
        </RuntimeVariableProvider>
      )

      const { result } = renderHook(() => useRuntimeVariables(), { wrapper })

      act(() => {
        result.current.setVariable('b', 20)
      })

      expect(result.current.variables.a).toBe(1)
      expect(result.current.variables.b).toBe(20)
      expect(result.current.variables.c).toBe(3)
    })
  })

  describe('component integration', () => {
    it('provides variables to child components', () => {
      function VariableDisplay() {
        const { variables } = useRuntimeVariables()
        return <span data-testid="value">{variables.message as string}</span>
      }

      render(
        <RuntimeVariableProvider initialVariables={{ message: 'Hello' }}>
          <VariableDisplay />
        </RuntimeVariableProvider>
      )

      expect(screen.getByTestId('value').textContent).toBe('Hello')
    })

    it('updates trigger re-renders', () => {
      function Counter() {
        const { variables, setVariable } = useRuntimeVariables()
        return (
          <div>
            <span data-testid="count">{variables.count as number}</span>
            <button onClick={() => setVariable('count', (variables.count as number) + 1)}>
              Increment
            </button>
          </div>
        )
      }

      render(
        <RuntimeVariableProvider initialVariables={{ count: 0 }}>
          <Counter />
        </RuntimeVariableProvider>
      )

      expect(screen.getByTestId('count').textContent).toBe('0')

      fireEvent.click(screen.getByText('Increment'))
      expect(screen.getByTestId('count').textContent).toBe('1')

      fireEvent.click(screen.getByText('Increment'))
      expect(screen.getByTestId('count').textContent).toBe('2')
    })

    it('shares state between sibling components', () => {
      function Reader() {
        const { variables } = useRuntimeVariables()
        return <span data-testid="reader">{variables.shared as string}</span>
      }

      function Writer() {
        const { setVariable } = useRuntimeVariables()
        return (
          <button onClick={() => setVariable('shared', 'updated')}>
            Update
          </button>
        )
      }

      render(
        <RuntimeVariableProvider initialVariables={{ shared: 'initial' }}>
          <Reader />
          <Writer />
        </RuntimeVariableProvider>
      )

      expect(screen.getByTestId('reader').textContent).toBe('initial')

      fireEvent.click(screen.getByText('Update'))

      expect(screen.getByTestId('reader').textContent).toBe('updated')
    })
  })

  describe('nested providers', () => {
    it('inner provider overrides outer values', () => {
      function Display() {
        const { variables } = useRuntimeVariables()
        return <span data-testid="value">{variables.item as string}</span>
      }

      render(
        <RuntimeVariableProvider initialVariables={{ item: 'outer' }}>
          <RuntimeVariableProvider initialVariables={{ item: 'inner' }}>
            <Display />
          </RuntimeVariableProvider>
        </RuntimeVariableProvider>
      )

      expect(screen.getByTestId('value').textContent).toBe('inner')
    })

    it('inner provider isolates state changes', () => {
      function Counter({ id }: { id: string }) {
        const { variables, setVariable } = useRuntimeVariables()
        return (
          <div>
            <span data-testid={`count-${id}`}>{variables.count as number}</span>
            <button onClick={() => setVariable('count', (variables.count as number) + 1)}>
              Inc {id}
            </button>
          </div>
        )
      }

      render(
        <RuntimeVariableProvider initialVariables={{ count: 0 }}>
          <Counter id="outer" />
          <RuntimeVariableProvider initialVariables={{ count: 100 }}>
            <Counter id="inner" />
          </RuntimeVariableProvider>
        </RuntimeVariableProvider>
      )

      expect(screen.getByTestId('count-outer').textContent).toBe('0')
      expect(screen.getByTestId('count-inner').textContent).toBe('100')

      fireEvent.click(screen.getByText('Inc inner'))

      expect(screen.getByTestId('count-outer').textContent).toBe('0')
      expect(screen.getByTestId('count-inner').textContent).toBe('101')
    })
  })

  describe('variable types', () => {
    it('supports string variables', () => {
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: ({ children }) => (
          <RuntimeVariableProvider initialVariables={{ name: 'test' }}>
            {children}
          </RuntimeVariableProvider>
        ),
      })

      expect(result.current.variables.name).toBe('test')
    })

    it('supports number variables', () => {
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: ({ children }) => (
          <RuntimeVariableProvider initialVariables={{ count: 42 }}>
            {children}
          </RuntimeVariableProvider>
        ),
      })

      expect(result.current.variables.count).toBe(42)
    })

    it('supports boolean variables', () => {
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: ({ children }) => (
          <RuntimeVariableProvider initialVariables={{ isActive: true }}>
            {children}
          </RuntimeVariableProvider>
        ),
      })

      expect(result.current.variables.isActive).toBe(true)
    })

    it('supports object variables', () => {
      const user = { name: 'John', age: 30 }
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: ({ children }) => (
          <RuntimeVariableProvider initialVariables={{ user }}>
            {children}
          </RuntimeVariableProvider>
        ),
      })

      expect(result.current.variables.user).toEqual({ name: 'John', age: 30 })
    })

    it('supports array variables', () => {
      const items = [1, 2, 3]
      const { result } = renderHook(() => useRuntimeVariables(), {
        wrapper: ({ children }) => (
          <RuntimeVariableProvider initialVariables={{ items }}>
            {children}
          </RuntimeVariableProvider>
        ),
      })

      expect(result.current.variables.items).toEqual([1, 2, 3])
    })
  })
})
