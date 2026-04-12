/**
 * Measurement Calculator Tests
 * Feature 6: Measurement Overlays
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { calculateMeasurements } from '../../../../studio/visual/measurements/measurement-calculator'
import type { Rect } from '../../../../studio/visual/measurements/types'

describe('measurementCalculator', () => {
  describe('calculateMeasurements', () => {
    it('calculates distances to all container edges', () => {
      const selectedRect: Rect = { x: 20, y: 20, width: 60, height: 40 }
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 80 }
      const siblings = new Map<string, Rect>()

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect)

      // Should have 4 measurements (top, bottom, left, right)
      expect(measurements.length).toBe(4)

      // Find specific measurements
      const top = measurements.find(m => m.edge === 'top')
      const bottom = measurements.find(m => m.edge === 'bottom')
      const left = measurements.find(m => m.edge === 'left')
      const right = measurements.find(m => m.edge === 'right')

      expect(top?.distance).toBe(20) // 20 - 0
      expect(bottom?.distance).toBe(20) // 80 - 60
      expect(left?.distance).toBe(20) // 20 - 0
      expect(right?.distance).toBe(20) // 100 - 80
    })

    it('calculates horizontal gap between siblings', () => {
      const selectedRect: Rect = { x: 10, y: 20, width: 30, height: 40 }
      const containerRect: Rect = { x: 0, y: 0, width: 200, height: 100 }
      const siblings = new Map<string, Rect>([
        ['sibling-1', { x: 60, y: 20, width: 30, height: 40 }] // 20px gap to the right
      ])

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect)

      // Find the sibling measurement
      const siblingMeasurement = measurements.find(m => m.to === 'sibling-1')

      expect(siblingMeasurement).toBeDefined()
      expect(siblingMeasurement?.distance).toBe(20) // 60 - 40
      expect(siblingMeasurement?.direction).toBe('horizontal')
    })

    it('calculates vertical gap between siblings', () => {
      const selectedRect: Rect = { x: 10, y: 10, width: 40, height: 30 }
      const containerRect: Rect = { x: 0, y: 0, width: 200, height: 200 }
      const siblings = new Map<string, Rect>([
        ['sibling-1', { x: 10, y: 60, width: 40, height: 30 }] // 20px gap below
      ])

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect)

      // Find the sibling measurement
      const siblingMeasurement = measurements.find(m => m.to === 'sibling-1')

      expect(siblingMeasurement).toBeDefined()
      expect(siblingMeasurement?.distance).toBe(20) // 60 - 40
      expect(siblingMeasurement?.direction).toBe('vertical')
    })

    it('ignores measurements below minDistance', () => {
      const selectedRect: Rect = { x: 1, y: 1, width: 98, height: 78 }
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 80 }
      const siblings = new Map<string, Rect>()

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect, {
        minDistance: 5
      })

      // All edges have 1px distance, should be filtered out
      expect(measurements.length).toBe(0)
    })

    it('limits measurements to maxMeasurements', () => {
      const selectedRect: Rect = { x: 20, y: 20, width: 60, height: 40 }
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 80 }
      const siblings = new Map<string, Rect>([
        ['sibling-1', { x: 20, y: 70, width: 60, height: 20 }],
        ['sibling-2', { x: 20, y: 100, width: 60, height: 20 }],
      ])

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect, {
        maxMeasurements: 4
      })

      expect(measurements.length).toBeLessThanOrEqual(4)
    })

    it('handles element at edge of container', () => {
      const selectedRect: Rect = { x: 0, y: 0, width: 50, height: 50 }
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const siblings = new Map<string, Rect>()

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect)

      // Should only have bottom and right measurements (top and left are 0)
      const top = measurements.find(m => m.edge === 'top')
      const left = measurements.find(m => m.edge === 'left')

      expect(top).toBeUndefined()
      expect(left).toBeUndefined()
    })

    it('does not measure to self', () => {
      const selectedRect: Rect = { x: 20, y: 20, width: 40, height: 40 }
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const siblings = new Map<string, Rect>([
        ['box-1', selectedRect] // Same ID as selected
      ])

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect)

      // Should not include self-reference
      const selfMeasurement = measurements.find(m => m.to === 'box-1')
      expect(selfMeasurement).toBeUndefined()
    })

    it('includes correct label positions', () => {
      const selectedRect: Rect = { x: 20, y: 20, width: 60, height: 40 }
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 80 }
      const siblings = new Map<string, Rect>()

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect)

      const top = measurements.find(m => m.edge === 'top')
      expect(top?.labelPosition.x).toBe(50) // center of element horizontally
      expect(top?.labelPosition.y).toBe(10) // middle of top gap

      const left = measurements.find(m => m.edge === 'left')
      expect(left?.labelPosition.x).toBe(10) // middle of left gap
      expect(left?.labelPosition.y).toBe(40) // center of element vertically
    })

    it('sorts measurements by distance', () => {
      const selectedRect: Rect = { x: 10, y: 30, width: 40, height: 20 }
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const siblings = new Map<string, Rect>()

      const measurements = calculateMeasurements('box-1', selectedRect, siblings, containerRect)

      // Check that measurements are sorted by distance
      for (let i = 1; i < measurements.length; i++) {
        expect(measurements[i].distance).toBeGreaterThanOrEqual(measurements[i - 1].distance)
      }
    })
  })
})
