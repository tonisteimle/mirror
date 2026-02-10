/**
 * Evaluators Tests
 *
 * Tests for expression and condition evaluation utilities:
 * - Nested value access
 * - Event value extraction
 * - Condition evaluation
 * - Expression evaluation
 */

import { describe, it, expect } from 'vitest'
import {
  getNestedValue,
  getEventValue,
  evaluateCondition,
  evaluateExpression,
} from '../../../generator/utils/evaluators'
import {
  varCondition,
  notCondition,
  andCondition,
  orCondition,
  compareCondition,
} from '../../kit/ast-builders'
import type { Expression } from '../../../parser/types'
import type { SyntheticEvent } from 'react'

// Helper to create mock events
function createMockEvent(overrides: Partial<SyntheticEvent> = {}): SyntheticEvent {
  return {
    target: { value: '', checked: false },
    currentTarget: null as unknown as EventTarget,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    nativeEvent: {} as Event,
    preventDefault: () => {},
    stopPropagation: () => {},
    persist: () => {},
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    timeStamp: Date.now(),
    type: 'change',
    ...overrides,
  } as SyntheticEvent
}

describe('evaluators', () => {
  describe('getNestedValue', () => {
    it('returns value for single key path', () => {
      const obj = { name: 'John' }
      expect(getNestedValue(obj, ['name'])).toBe('John')
    })

    it('returns value for nested path', () => {
      const obj = { user: { profile: { name: 'Jane' } } }
      expect(getNestedValue(obj, ['user', 'profile', 'name'])).toBe('Jane')
    })

    it('returns undefined for missing key', () => {
      const obj = { a: 1 }
      expect(getNestedValue(obj, ['b'])).toBeUndefined()
    })

    it('returns undefined for missing nested key', () => {
      const obj = { user: { name: 'Test' } }
      expect(getNestedValue(obj, ['user', 'profile', 'name'])).toBeUndefined()
    })

    it('handles null in path', () => {
      const obj = { user: null }
      expect(getNestedValue(obj, ['user', 'name'])).toBeUndefined()
    })

    it('handles undefined in path', () => {
      const obj = { user: undefined }
      expect(getNestedValue(obj, ['user', 'name'])).toBeUndefined()
    })

    it('returns whole object for empty path', () => {
      const obj = { a: 1, b: 2 }
      expect(getNestedValue(obj, [])).toEqual({ a: 1, b: 2 })
    })

    it('handles array values', () => {
      const obj = { items: [1, 2, 3] }
      expect(getNestedValue(obj, ['items'])).toEqual([1, 2, 3])
    })

    it('handles deeply nested paths', () => {
      const obj = { a: { b: { c: { d: { e: 'deep' } } } } }
      expect(getNestedValue(obj, ['a', 'b', 'c', 'd', 'e'])).toBe('deep')
    })
  })

  describe('getEventValue', () => {
    it('returns event for empty path', () => {
      const event = createMockEvent()
      expect(getEventValue(event, [])).toBe(event)
    })

    it('returns target.value for "value" shortcut', () => {
      const event = createMockEvent({
        target: { value: 'test input', checked: false } as EventTarget,
      })
      expect(getEventValue(event, ['value'])).toBe('test input')
    })

    it('returns target.checked for "checked" shortcut', () => {
      const event = createMockEvent({
        target: { value: '', checked: true } as EventTarget,
      })
      expect(getEventValue(event, ['checked'])).toBe(true)
    })

    it('navigates through event properties', () => {
      const event = createMockEvent({
        type: 'click',
      })
      expect(getEventValue(event, ['type'])).toBe('click')
    })

    it('returns undefined for missing path', () => {
      const event = createMockEvent()
      expect(getEventValue(event, ['nonexistent', 'path'])).toBeUndefined()
    })
  })

  describe('evaluateCondition', () => {
    describe('var conditions', () => {
      it('returns true for truthy variable', () => {
        expect(evaluateCondition(varCondition('isActive'), { isActive: true })).toBe(true)
      })

      it('returns false for falsy variable', () => {
        expect(evaluateCondition(varCondition('isActive'), { isActive: false })).toBe(false)
      })

      it('returns false for undefined variable', () => {
        expect(evaluateCondition(varCondition('missing'), {})).toBe(false)
      })

      it('returns true for truthy value (non-boolean)', () => {
        expect(evaluateCondition(varCondition('count'), { count: 5 })).toBe(true)
      })

      it('returns false for zero', () => {
        expect(evaluateCondition(varCondition('count'), { count: 0 })).toBe(false)
      })

      it('returns true for non-empty string', () => {
        expect(evaluateCondition(varCondition('name'), { name: 'test' })).toBe(true)
      })

      it('returns false for empty string', () => {
        expect(evaluateCondition(varCondition('name'), { name: '' })).toBe(false)
      })

      it('supports dot notation paths', () => {
        expect(evaluateCondition(varCondition('user.isAdmin'), {
          user: { isAdmin: true }
        })).toBe(true)
      })
    })

    describe('not conditions', () => {
      it('negates true to false', () => {
        expect(evaluateCondition(notCondition(varCondition('isActive')), { isActive: true })).toBe(false)
      })

      it('negates false to true', () => {
        expect(evaluateCondition(notCondition(varCondition('isActive')), { isActive: false })).toBe(true)
      })

      it('handles undefined as false (negated to true)', () => {
        expect(evaluateCondition(notCondition(varCondition('missing')), {})).toBe(true)
      })
    })

    describe('and conditions', () => {
      it('returns true when both are true', () => {
        const condition = andCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: true, b: true })).toBe(true)
      })

      it('returns false when first is false', () => {
        const condition = andCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: false, b: true })).toBe(false)
      })

      it('returns false when second is false', () => {
        const condition = andCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: true, b: false })).toBe(false)
      })

      it('returns false when both are false', () => {
        const condition = andCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: false, b: false })).toBe(false)
      })
    })

    describe('or conditions', () => {
      it('returns true when both are true', () => {
        const condition = orCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: true, b: true })).toBe(true)
      })

      it('returns true when first is true', () => {
        const condition = orCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: true, b: false })).toBe(true)
      })

      it('returns true when second is true', () => {
        const condition = orCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: false, b: true })).toBe(true)
      })

      it('returns false when both are false', () => {
        const condition = orCondition(varCondition('a'), varCondition('b'))
        expect(evaluateCondition(condition, { a: false, b: false })).toBe(false)
      })
    })

    describe('comparison conditions', () => {
      it('evaluates == correctly', () => {
        const condition = compareCondition(varCondition('status'), '==', 'active')
        expect(evaluateCondition(condition, { status: 'active' })).toBe(true)
        expect(evaluateCondition(condition, { status: 'inactive' })).toBe(false)
      })

      it('evaluates != correctly', () => {
        const condition = compareCondition(varCondition('status'), '!=', 'active')
        expect(evaluateCondition(condition, { status: 'inactive' })).toBe(true)
        expect(evaluateCondition(condition, { status: 'active' })).toBe(false)
      })

      it('evaluates > correctly', () => {
        const condition = compareCondition(varCondition('count'), '>', 5)
        expect(evaluateCondition(condition, { count: 10 })).toBe(true)
        expect(evaluateCondition(condition, { count: 5 })).toBe(false)
        expect(evaluateCondition(condition, { count: 3 })).toBe(false)
      })

      it('evaluates < correctly', () => {
        const condition = compareCondition(varCondition('count'), '<', 5)
        expect(evaluateCondition(condition, { count: 3 })).toBe(true)
        expect(evaluateCondition(condition, { count: 5 })).toBe(false)
        expect(evaluateCondition(condition, { count: 10 })).toBe(false)
      })

      it('evaluates >= correctly', () => {
        const condition = compareCondition(varCondition('count'), '>=', 5)
        expect(evaluateCondition(condition, { count: 5 })).toBe(true)
        expect(evaluateCondition(condition, { count: 10 })).toBe(true)
        expect(evaluateCondition(condition, { count: 3 })).toBe(false)
      })

      it('evaluates <= correctly', () => {
        const condition = compareCondition(varCondition('count'), '<=', 5)
        expect(evaluateCondition(condition, { count: 5 })).toBe(true)
        expect(evaluateCondition(condition, { count: 3 })).toBe(true)
        expect(evaluateCondition(condition, { count: 10 })).toBe(false)
      })
    })

    describe('complex conditions', () => {
      it('handles nested and/or', () => {
        const condition = andCondition(
          orCondition(varCondition('a'), varCondition('b')),
          varCondition('c')
        )
        expect(evaluateCondition(condition, { a: true, b: false, c: true })).toBe(true)
        expect(evaluateCondition(condition, { a: false, b: false, c: true })).toBe(false)
      })

      it('handles not with and', () => {
        const condition = andCondition(
          notCondition(varCondition('isDisabled')),
          varCondition('isActive')
        )
        expect(evaluateCondition(condition, { isDisabled: false, isActive: true })).toBe(true)
        expect(evaluateCondition(condition, { isDisabled: true, isActive: true })).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('returns false for unknown condition type', () => {
        const unknownCondition = { type: 'unknown' } as any
        expect(evaluateCondition(unknownCondition, {})).toBe(false)
      })

      it('returns false for comparison with unknown operator', () => {
        const badComparison = {
          type: 'comparison' as const,
          left: varCondition('x'),
          operator: '~=' as any,
          value: 5,
        }
        expect(evaluateCondition(badComparison, { x: 5 })).toBe(false)
      })
    })
  })

  describe('evaluateExpression', () => {
    describe('literal expressions', () => {
      it('returns string literal', () => {
        const expr: Expression = { type: 'literal', value: 'hello' }
        expect(evaluateExpression(expr, {})).toBe('hello')
      })

      it('returns number literal', () => {
        const expr: Expression = { type: 'literal', value: 42 }
        expect(evaluateExpression(expr, {})).toBe(42)
      })

      it('returns boolean literal', () => {
        const expr: Expression = { type: 'literal', value: true }
        expect(evaluateExpression(expr, {})).toBe(true)
      })
    })

    describe('variable expressions', () => {
      it('returns variable value', () => {
        const expr: Expression = { type: 'variable', name: 'count' }
        expect(evaluateExpression(expr, { count: 10 })).toBe(10)
      })

      it('returns undefined for missing variable', () => {
        const expr: Expression = { type: 'variable', name: 'missing' }
        expect(evaluateExpression(expr, {})).toBeUndefined()
      })

      it('returns event when name is "event"', () => {
        const expr: Expression = { type: 'variable', name: 'event' }
        const event = createMockEvent()
        expect(evaluateExpression(expr, {}, event)).toBe(event)
      })
    })

    describe('property_access expressions', () => {
      it('returns nested property value', () => {
        const expr: Expression = { type: 'property_access', path: ['user', 'name'] }
        expect(evaluateExpression(expr, { user: { name: 'John' } })).toBe('John')
      })

      it('returns event value for event path', () => {
        const expr: Expression = { type: 'property_access', path: ['event', 'value'] }
        const event = createMockEvent({
          target: { value: 'typed text', checked: false } as EventTarget,
        })
        expect(evaluateExpression(expr, {}, event)).toBe('typed text')
      })

      it('returns undefined for missing path', () => {
        const expr: Expression = { type: 'property_access', path: ['missing', 'path'] }
        expect(evaluateExpression(expr, {})).toBeUndefined()
      })
    })

    describe('binary expressions', () => {
      it('adds two numbers', () => {
        const expr: Expression = {
          type: 'binary',
          operator: '+',
          left: { type: 'literal', value: 5 },
          right: { type: 'literal', value: 3 },
        }
        expect(evaluateExpression(expr, {})).toBe(8)
      })

      it('subtracts two numbers', () => {
        const expr: Expression = {
          type: 'binary',
          operator: '-',
          left: { type: 'literal', value: 10 },
          right: { type: 'literal', value: 4 },
        }
        expect(evaluateExpression(expr, {})).toBe(6)
      })

      it('multiplies two numbers', () => {
        const expr: Expression = {
          type: 'binary',
          operator: '*',
          left: { type: 'literal', value: 6 },
          right: { type: 'literal', value: 7 },
        }
        expect(evaluateExpression(expr, {})).toBe(42)
      })

      it('divides two numbers', () => {
        const expr: Expression = {
          type: 'binary',
          operator: '/',
          left: { type: 'literal', value: 20 },
          right: { type: 'literal', value: 4 },
        }
        expect(evaluateExpression(expr, {})).toBe(5)
      })

      it('returns 0 for division by zero', () => {
        const expr: Expression = {
          type: 'binary',
          operator: '/',
          left: { type: 'literal', value: 10 },
          right: { type: 'literal', value: 0 },
        }
        expect(evaluateExpression(expr, {})).toBe(0)
      })

      it('uses variables in binary operations', () => {
        const expr: Expression = {
          type: 'binary',
          operator: '+',
          left: { type: 'variable', name: 'a' },
          right: { type: 'variable', name: 'b' },
        }
        expect(evaluateExpression(expr, { a: 15, b: 25 })).toBe(40)
      })

      it('returns 0 for unknown operator', () => {
        const expr: Expression = {
          type: 'binary',
          operator: '%' as any,
          left: { type: 'literal', value: 10 },
          right: { type: 'literal', value: 3 },
        }
        expect(evaluateExpression(expr, {})).toBe(0)
      })
    })

    describe('edge cases', () => {
      it('returns undefined for unknown expression type', () => {
        const expr = { type: 'unknown' } as any
        expect(evaluateExpression(expr, {})).toBeUndefined()
      })
    })
  })
})
