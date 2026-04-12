/**
 * Pattern Detector Tests
 * Feature 8: Auto-Layout Suggestions
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  detectLayoutPattern,
  type LayoutRect,
  type LayoutSuggestion,
} from '../../../../studio/visual/auto-layout/pattern-detector'

describe('detectLayoutPattern', () => {
  describe('horizontal-stack detection', () => {
    it('detects horizontally aligned elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 100, y: 50, width: 80, height: 40 }],
        ['c', { x: 200, y: 50, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.pattern).toBe('horizontal-stack')
      expect(result!.nodeIds).toHaveLength(3)
      expect(result!.confidence).toBeGreaterThan(0.6)
    })

    it('infers gap from spacing between elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 96, y: 50, width: 80, height: 40 }], // 16px gap
        ['c', { x: 192, y: 50, width: 80, height: 40 }], // 16px gap
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.inferredGap).toBe(16)
      expect(result!.preview).toBe('hor, gap 16')
    })

    it('rounds gap to 4px grid', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 90, y: 50, width: 80, height: 40 }], // 10px gap
        ['c', { x: 180, y: 50, width: 80, height: 40 }], // 10px gap
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      // 10px should round to 8px or 12px on 4px grid
      expect(result!.inferredGap % 4).toBe(0)
    })

    it('rejects overlapping elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 70, y: 50, width: 80, height: 40 }], // overlaps with a
        ['c', { x: 160, y: 50, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      // Should not detect as horizontal stack due to overlap
      if (result !== null) {
        expect(result.pattern).not.toBe('horizontal-stack')
      }
    })

    it('rejects elements not vertically aligned', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 100, y: 100, width: 80, height: 40 }], // too far off Y center
        ['c', { x: 200, y: 50, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      // Should not detect as horizontal stack due to misalignment
      if (result !== null && result.pattern === 'horizontal-stack') {
        expect(result.confidence).toBeLessThan(0.6)
      }
    })
  })

  describe('vertical-stack detection', () => {
    it('detects vertically aligned elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 50, y: 0, width: 100, height: 40 }],
        ['b', { x: 50, y: 56, width: 100, height: 40 }],
        ['c', { x: 50, y: 112, width: 100, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.pattern).toBe('vertical-stack')
      expect(result!.nodeIds).toHaveLength(3)
      expect(result!.confidence).toBeGreaterThan(0.6)
    })

    it('infers gap from spacing between elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 50, y: 0, width: 100, height: 40 }],
        ['b', { x: 50, y: 48, width: 100, height: 40 }], // 8px gap
        ['c', { x: 50, y: 96, width: 100, height: 40 }], // 8px gap
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.inferredGap).toBe(8)
      expect(result!.preview).toBe('ver, gap 8')
    })

    it('orders nodes by Y position', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['c', { x: 50, y: 112, width: 100, height: 40 }], // last
        ['a', { x: 50, y: 0, width: 100, height: 40 }],   // first
        ['b', { x: 50, y: 56, width: 100, height: 40 }],  // middle
      ])

      const result = detectLayoutPattern(['c', 'a', 'b'], layoutInfo)

      expect(result).not.toBeNull()
      // Should be ordered a, b, c
      expect(result!.nodeIds).toEqual(['a', 'b', 'c'])
    })
  })

  describe('grid detection', () => {
    it('detects 2x2 grid pattern', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 0, width: 80, height: 80 }],
        ['b', { x: 96, y: 0, width: 80, height: 80 }],
        ['c', { x: 0, y: 96, width: 80, height: 80 }],
        ['d', { x: 96, y: 96, width: 80, height: 80 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c', 'd'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.pattern).toBe('grid')
      expect(result!.gridColumns).toBe(2)
    })

    it('detects 3x2 grid pattern', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 0, width: 80, height: 80 }],
        ['b', { x: 96, y: 0, width: 80, height: 80 }],
        ['c', { x: 192, y: 0, width: 80, height: 80 }],
        ['d', { x: 0, y: 96, width: 80, height: 80 }],
        ['e', { x: 96, y: 96, width: 80, height: 80 }],
        ['f', { x: 192, y: 96, width: 80, height: 80 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c', 'd', 'e', 'f'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.pattern).toBe('grid')
      expect(result!.gridColumns).toBe(3)
    })

    it('infers gap from grid spacing', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 0, width: 80, height: 80 }],
        ['b', { x: 96, y: 0, width: 80, height: 80 }], // 16px gap
        ['c', { x: 0, y: 96, width: 80, height: 80 }], // 16px gap
        ['d', { x: 96, y: 96, width: 80, height: 80 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c', 'd'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.inferredGap).toBe(16)
    })
  })

  describe('edge cases', () => {
    it('returns null for single element', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 0, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a'], layoutInfo)

      expect(result).toBeNull()
    })

    it('returns null for empty array', () => {
      const layoutInfo = new Map<string, LayoutRect>()

      const result = detectLayoutPattern([], layoutInfo)

      expect(result).toBeNull()
    })

    it('returns null for missing layout info', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 0, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).toBeNull()
    })

    it('handles two elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 100, y: 50, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.pattern).toBe('horizontal-stack')
      expect(result!.nodeIds).toHaveLength(2)
    })
  })

  describe('confidence scores', () => {
    it('gives high confidence for perfectly aligned elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 96, y: 50, width: 80, height: 40 }],
        ['c', { x: 192, y: 50, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.confidence).toBeGreaterThan(0.8)
    })

    it('gives lower confidence for slightly misaligned elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 96, y: 55, width: 80, height: 40 }], // slightly off
        ['c', { x: 192, y: 52, width: 80, height: 40 }], // slightly off
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      // Should still detect but with lower confidence
      expect(result!.confidence).toBeGreaterThan(0.6)
      expect(result!.confidence).toBeLessThan(1.0)
    })

    it('respects minConfidence config', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 96, y: 70, width: 80, height: 40 }], // noticeably off
        ['c', { x: 192, y: 50, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo, {
        minConfidence: 0.9,
      })

      // Should return null if confidence is below threshold
      expect(result === null || result.confidence >= 0.9).toBe(true)
    })
  })

  describe('preference order', () => {
    it('prefers horizontal stack over grid for 2 elements', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 50, width: 80, height: 40 }],
        ['b', { x: 96, y: 50, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b'], layoutInfo)

      expect(result).not.toBeNull()
      expect(result!.pattern).toBe('horizontal-stack')
    })

    it('prefers higher confidence pattern when multiple match', () => {
      // Elements that could be either horizontal or part of a grid
      const layoutInfo = new Map<string, LayoutRect>([
        ['a', { x: 0, y: 0, width: 80, height: 40 }],
        ['b', { x: 96, y: 0, width: 80, height: 40 }],
        ['c', { x: 192, y: 0, width: 80, height: 40 }],
      ])

      const result = detectLayoutPattern(['a', 'b', 'c'], layoutInfo)

      expect(result).not.toBeNull()
      // Should prefer horizontal stack for a single row
      expect(result!.pattern).toBe('horizontal-stack')
    })
  })
})

describe('LayoutSuggestion type', () => {
  it('has correct structure', () => {
    const suggestion: LayoutSuggestion = {
      nodeIds: ['a', 'b', 'c'],
      pattern: 'horizontal-stack',
      confidence: 0.95,
      preview: 'hor, gap 16',
      inferredGap: 16,
    }

    expect(suggestion.pattern).toBe('horizontal-stack')
    expect(suggestion.nodeIds).toHaveLength(3)
    expect(suggestion.confidence).toBe(0.95)
    expect(suggestion.inferredGap).toBe(16)
    expect(suggestion.preview).toBe('hor, gap 16')
  })

  it('supports grid pattern with columns', () => {
    const suggestion: LayoutSuggestion = {
      nodeIds: ['a', 'b', 'c', 'd'],
      pattern: 'grid',
      confidence: 0.85,
      preview: 'grid 2, gap 8',
      inferredGap: 8,
      gridColumns: 2,
    }

    expect(suggestion.pattern).toBe('grid')
    expect(suggestion.gridColumns).toBe(2)
  })
})
