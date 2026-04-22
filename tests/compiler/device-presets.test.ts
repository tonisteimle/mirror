/**
 * Device Presets Tests
 *
 * Tests for the device size presets feature:
 * - device mobile → w 375, h 812
 * - device tablet → w 768, h 1024
 * - device desktop → w 1440, h 900
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { toIR } from '../../compiler/ir/index'
import type { IR, IRNode } from '../../compiler/ir/types'

/**
 * Helper to find a style value in an IR node
 * Uses last match semantics (CSS: last wins)
 */
function findStyleValue(node: IRNode, property: string): string | undefined {
  // Filter to get all matching styles, then return the last one (CSS last-wins)
  const matches = node.styles.filter(s => s.property === property)
  return matches.length > 0 ? matches[matches.length - 1].value : undefined
}

/**
 * Helper to parse Mirror code to IR
 */
function parseToIR(code: string): IR {
  const ast = parse(code)
  return toIR(ast)
}

describe('Device Presets', () => {
  describe('Mobile preset', () => {
    test('device mobile expands to w 375 h 812', () => {
      const ir = parseToIR('Frame device mobile')
      const node = ir.nodes[0]

      expect(findStyleValue(node, 'width')).toBe('375px')
      expect(findStyleValue(node, 'height')).toBe('812px')
    })

    test('device mobile works with other properties', () => {
      const ir = parseToIR('Frame device mobile, bg #1a1a1a, pad 16')
      const node = ir.nodes[0]

      expect(findStyleValue(node, 'width')).toBe('375px')
      expect(findStyleValue(node, 'height')).toBe('812px')
      expect(findStyleValue(node, 'background')).toBe('#1a1a1a')
      expect(findStyleValue(node, 'padding')).toBe('16px')
    })
  })

  describe('Tablet preset', () => {
    test('device tablet expands to w 768 h 1024', () => {
      const ir = parseToIR('Frame device tablet')
      const node = ir.nodes[0]

      expect(findStyleValue(node, 'width')).toBe('768px')
      expect(findStyleValue(node, 'height')).toBe('1024px')
    })
  })

  describe('Desktop preset', () => {
    test('device desktop expands to w 1440 h 900', () => {
      const ir = parseToIR('Frame device desktop')
      const node = ir.nodes[0]

      expect(findStyleValue(node, 'width')).toBe('1440px')
      expect(findStyleValue(node, 'height')).toBe('900px')
    })
  })

  describe('Case insensitivity', () => {
    test('device MOBILE (uppercase) works', () => {
      const ir = parseToIR('Frame device MOBILE')
      const node = ir.nodes[0]

      expect(findStyleValue(node, 'width')).toBe('375px')
      expect(findStyleValue(node, 'height')).toBe('812px')
    })

    test('device Mobile (mixed case) works', () => {
      const ir = parseToIR('Frame device Mobile')
      const node = ir.nodes[0]

      expect(findStyleValue(node, 'width')).toBe('375px')
      expect(findStyleValue(node, 'height')).toBe('812px')
    })
  })

  describe('Device with children', () => {
    test('device preset preserves children', () => {
      const ir = parseToIR(`
Frame device mobile, gap 16
  Text "Hello"
  Button "Click"
`)
      const node = ir.nodes[0]

      expect(findStyleValue(node, 'width')).toBe('375px')
      expect(findStyleValue(node, 'height')).toBe('812px')
      expect(node.children).toHaveLength(2)
    })
  })

  describe('Unknown device', () => {
    test('unknown device value is ignored', () => {
      const ir = parseToIR('Frame device unknown')
      const node = ir.nodes[0]

      // Should not set width/height for unknown preset
      expect(findStyleValue(node, 'width')).toBeUndefined()
      expect(findStyleValue(node, 'height')).toBeUndefined()
    })
  })

  describe('Device overridden by explicit w/h', () => {
    test('explicit w after device wins (last wins)', () => {
      // Note: In the current implementation, device is expanded early,
      // so subsequent w/h properties would override it
      const ir = parseToIR('Frame device mobile, w 400')
      const node = ir.nodes[0]

      // device expands to w 375, h 812
      // then w 400 overrides the width
      expect(findStyleValue(node, 'width')).toBe('400px')
      expect(findStyleValue(node, 'height')).toBe('812px')
    })
  })
})
