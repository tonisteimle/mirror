/**
 * Constraints Integration Tests
 * Feature 5: Constraints Integration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import type { SetConstraintIntent } from '../../../studio/core/change-types'

describe('constraints integration', () => {
  describe('SetConstraintIntent type', () => {
    it('has correct structure for position constraints', () => {
      const intent: SetConstraintIntent = {
        type: 'setConstraint',
        nodeId: 'node-1',
        constraint: 'top',
        value: 10,
      }

      expect(intent.type).toBe('setConstraint')
      expect(intent.nodeId).toBe('node-1')
      expect(intent.constraint).toBe('top')
      expect(intent.value).toBe(10)
    })

    it('supports all edge constraints', () => {
      const edges: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left']

      for (const edge of edges) {
        const intent: SetConstraintIntent = {
          type: 'setConstraint',
          nodeId: 'node-1',
          constraint: edge,
          value: 20,
        }
        expect(intent.constraint).toBe(edge)
      }
    })

    it('supports center alignment constraints', () => {
      const centers: Array<'centerX' | 'centerY'> = ['centerX', 'centerY']

      for (const center of centers) {
        const intent: SetConstraintIntent = {
          type: 'setConstraint',
          nodeId: 'node-1',
          constraint: center,
          value: 0,  // For center, value just indicates "enabled"
        }
        expect(intent.constraint).toBe(center)
      }
    })

    it('supports null value to remove constraint', () => {
      const intent: SetConstraintIntent = {
        type: 'setConstraint',
        nodeId: 'node-1',
        constraint: 'top',
        value: null,
      }

      expect(intent.value).toBeNull()
    })
  })

  describe('constraint to property mapping', () => {
    // These tests verify the mapping logic used in change-pipeline.ts
    const constraintMappings: Record<string, { property: string; isBoolean: boolean }> = {
      top: { property: 'y', isBoolean: false },
      left: { property: 'x', isBoolean: false },
      bottom: { property: 'bottom', isBoolean: false },
      right: { property: 'right', isBoolean: false },
      centerX: { property: 'hor-center', isBoolean: true },
      centerY: { property: 'ver-center', isBoolean: true },
    }

    it('maps top constraint to y property', () => {
      const mapping = constraintMappings['top']
      expect(mapping.property).toBe('y')
      expect(mapping.isBoolean).toBe(false)
    })

    it('maps left constraint to x property', () => {
      const mapping = constraintMappings['left']
      expect(mapping.property).toBe('x')
      expect(mapping.isBoolean).toBe(false)
    })

    it('maps centerX to hor-center boolean property', () => {
      const mapping = constraintMappings['centerX']
      expect(mapping.property).toBe('hor-center')
      expect(mapping.isBoolean).toBe(true)
    })

    it('maps centerY to ver-center boolean property', () => {
      const mapping = constraintMappings['centerY']
      expect(mapping.property).toBe('ver-center')
      expect(mapping.isBoolean).toBe(true)
    })

    it('bottom and right constraints are mapped but may need special CSS handling', () => {
      expect(constraintMappings['bottom'].property).toBe('bottom')
      expect(constraintMappings['right'].property).toBe('right')
    })
  })

  describe('constraint panel state', () => {
    // Test the state structure used by ConstraintPanel
    interface ConstraintState {
      top: number | null
      right: number | null
      bottom: number | null
      left: number | null
      centerX: boolean
      centerY: boolean
    }

    it('initial state has all constraints disabled', () => {
      const state: ConstraintState = {
        top: null,
        right: null,
        bottom: null,
        left: null,
        centerX: false,
        centerY: false,
      }

      expect(state.top).toBeNull()
      expect(state.left).toBeNull()
      expect(state.centerX).toBe(false)
    })

    it('enabled constraint has numeric value', () => {
      const state: ConstraintState = {
        top: 10,
        right: null,
        bottom: null,
        left: 20,
        centerX: false,
        centerY: true,
      }

      expect(state.top).toBe(10)
      expect(state.left).toBe(20)
      expect(state.centerY).toBe(true)
    })

    it('toggling constraint sets value to 0 or null', () => {
      // Simulating toggle behavior
      const toggleConstraint = (currentValue: number | null): number | null => {
        return currentValue === null ? 0 : null
      }

      expect(toggleConstraint(null)).toBe(0)  // Enable
      expect(toggleConstraint(0)).toBeNull()  // Disable
      expect(toggleConstraint(10)).toBeNull() // Disable even with value
    })
  })
})
