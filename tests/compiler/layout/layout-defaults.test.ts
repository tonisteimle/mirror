/**
 * Layout Defaults Unit Tests
 *
 * Tests the Single Source of Truth for layout defaults.
 * These tests ensure the constants and helper functions work correctly.
 */

import { describe, it, expect } from 'vitest'
import {
  NON_CONTAINER_PRIMITIVES,
  isContainer,
  FLEX_DEFAULTS,
  CONTAINER_DEFAULTS,
  NINE_ZONE,
  CENTER_ALIGNMENT,
  getFlexDefaults,
  getNineZoneAlignment,
  isNineZonePosition,
} from '../../../compiler/schema/layout-defaults'

// =============================================================================
// PRIMITIVE CLASSIFICATION
// =============================================================================

describe('Layout Defaults: Primitive Classification', () => {
  describe('NON_CONTAINER_PRIMITIVES', () => {
    it('contains all leaf elements', () => {
      const expected = [
        'text', 'span', 'input', 'textarea', 'button',
        'img', 'image', 'icon', 'label', 'link', 'a',
        'option', 'divider', 'hr', 'spacer',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'checkbox', 'radio', 'slot', 'zagslot'
      ]
      for (const elem of expected) {
        expect(NON_CONTAINER_PRIMITIVES.has(elem), `${elem} should be non-container`).toBe(true)
      }
    })

    it('does not contain container elements', () => {
      const containers = ['frame', 'box', 'div', 'section', 'header', 'footer', 'nav', 'main']
      for (const elem of containers) {
        expect(NON_CONTAINER_PRIMITIVES.has(elem), `${elem} should not be in non-container set`).toBe(false)
      }
    })
  })

  describe('isContainer()', () => {
    it('returns false for leaf elements', () => {
      expect(isContainer('text')).toBe(false)
      expect(isContainer('button')).toBe(false)
      expect(isContainer('input')).toBe(false)
      expect(isContainer('icon')).toBe(false)
      expect(isContainer('img')).toBe(false)
    })

    it('returns true for container elements', () => {
      expect(isContainer('frame')).toBe(true)
      expect(isContainer('box')).toBe(true)
      expect(isContainer('div')).toBe(true)
      expect(isContainer('section')).toBe(true)
    })

    it('is case-insensitive', () => {
      expect(isContainer('TEXT')).toBe(false)
      expect(isContainer('Text')).toBe(false)
      expect(isContainer('FRAME')).toBe(true)
      expect(isContainer('Frame')).toBe(true)
    })

    it('handles empty string', () => {
      expect(isContainer('')).toBe(true) // empty is not in the set
    })
  })
})

// =============================================================================
// FLEX DEFAULTS - SYMMETRY
// =============================================================================

describe('Layout Defaults: Flex Defaults', () => {
  describe('FLEX_DEFAULTS symmetry', () => {
    it('column and row have same alignItems (CRITICAL)', () => {
      // This is the main fix - both directions should have flex-start
      expect(FLEX_DEFAULTS.column.alignItems).toBe('flex-start')
      expect(FLEX_DEFAULTS.row.alignItems).toBe('flex-start')
      expect(FLEX_DEFAULTS.column.alignItems).toBe(FLEX_DEFAULTS.row.alignItems)
    })

    it('column has flex-direction: column', () => {
      expect(FLEX_DEFAULTS.column.flexDirection).toBe('column')
    })

    it('row has flex-direction: row', () => {
      expect(FLEX_DEFAULTS.row.flexDirection).toBe('row')
    })

    it('both have display: flex', () => {
      expect(FLEX_DEFAULTS.column.display).toBe('flex')
      expect(FLEX_DEFAULTS.row.display).toBe('flex')
    })
  })

  describe('CONTAINER_DEFAULTS', () => {
    it('uses column as default direction', () => {
      expect(CONTAINER_DEFAULTS.flexDirection).toBe('column')
    })

    it('uses flex-start as default alignment', () => {
      expect(CONTAINER_DEFAULTS.alignItems).toBe('flex-start')
    })

    it('uses fit-content as default width', () => {
      expect(CONTAINER_DEFAULTS.width).toBe('fit-content')
    })
  })

  describe('getFlexDefaults()', () => {
    it('returns column defaults by default', () => {
      const defaults = getFlexDefaults()
      expect(defaults.flexDirection).toBe('column')
    })

    it('returns column defaults when specified', () => {
      const defaults = getFlexDefaults('column')
      expect(defaults.flexDirection).toBe('column')
    })

    it('returns row defaults when specified', () => {
      const defaults = getFlexDefaults('row')
      expect(defaults.flexDirection).toBe('row')
    })
  })
})

// =============================================================================
// 9-ZONE ALIGNMENT
// =============================================================================

describe('Layout Defaults: 9-Zone Alignment', () => {
  describe('NINE_ZONE completeness', () => {
    it('has all 9 positions', () => {
      const positions = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br']
      for (const pos of positions) {
        expect(NINE_ZONE[pos as keyof typeof NINE_ZONE], `${pos} should exist`).toBeDefined()
      }
    })
  })

  describe('NINE_ZONE values', () => {
    // Top row
    it('tl = top-left (flex-start, flex-start)', () => {
      expect(NINE_ZONE.tl).toEqual({ justify: 'flex-start', align: 'flex-start' })
    })

    it('tc = top-center (flex-start, center)', () => {
      expect(NINE_ZONE.tc).toEqual({ justify: 'flex-start', align: 'center' })
    })

    it('tr = top-right (flex-start, flex-end)', () => {
      expect(NINE_ZONE.tr).toEqual({ justify: 'flex-start', align: 'flex-end' })
    })

    // Middle row
    it('cl = center-left (center, flex-start)', () => {
      expect(NINE_ZONE.cl).toEqual({ justify: 'center', align: 'flex-start' })
    })

    it('center = center-center (center, center)', () => {
      expect(NINE_ZONE.center).toEqual({ justify: 'center', align: 'center' })
    })

    it('cr = center-right (center, flex-end)', () => {
      expect(NINE_ZONE.cr).toEqual({ justify: 'center', align: 'flex-end' })
    })

    // Bottom row
    it('bl = bottom-left (flex-end, flex-start)', () => {
      expect(NINE_ZONE.bl).toEqual({ justify: 'flex-end', align: 'flex-start' })
    })

    it('bc = bottom-center (flex-end, center)', () => {
      expect(NINE_ZONE.bc).toEqual({ justify: 'flex-end', align: 'center' })
    })

    it('br = bottom-right (flex-end, flex-end)', () => {
      expect(NINE_ZONE.br).toEqual({ justify: 'flex-end', align: 'flex-end' })
    })
  })

  describe('getNineZoneAlignment()', () => {
    it('returns correct values for center', () => {
      expect(getNineZoneAlignment('center')).toEqual({ justify: 'center', align: 'center' })
    })

    it('returns correct values for tl', () => {
      expect(getNineZoneAlignment('tl')).toEqual({ justify: 'flex-start', align: 'flex-start' })
    })
  })

  describe('isNineZonePosition()', () => {
    it('returns true for valid positions', () => {
      expect(isNineZonePosition('tl')).toBe(true)
      expect(isNineZonePosition('center')).toBe(true)
      expect(isNineZonePosition('br')).toBe(true)
    })

    it('returns false for invalid positions', () => {
      expect(isNineZonePosition('invalid')).toBe(false)
      expect(isNineZonePosition('left')).toBe(false)
      expect(isNineZonePosition('')).toBe(false)
    })
  })
})

// =============================================================================
// CENTER SEMANTICS
// =============================================================================

describe('Layout Defaults: Center Semantics', () => {
  describe('CENTER_ALIGNMENT unambiguity', () => {
    it('center = BOTH axes (CRITICAL)', () => {
      expect(CENTER_ALIGNMENT.center.justify).toBe('center')
      expect(CENTER_ALIGNMENT.center.align).toBe('center')
    })

    it('hor-center = horizontal only', () => {
      expect(CENTER_ALIGNMENT['hor-center'].justify).toBeNull()
      expect(CENTER_ALIGNMENT['hor-center'].align).toBe('center')
    })

    it('ver-center = vertical only', () => {
      expect(CENTER_ALIGNMENT['ver-center'].justify).toBe('center')
      expect(CENTER_ALIGNMENT['ver-center'].align).toBeNull()
    })
  })

  describe('CENTER_ALIGNMENT consistency', () => {
    it('center is same as NINE_ZONE.center', () => {
      expect(CENTER_ALIGNMENT.center.justify).toBe(NINE_ZONE.center.justify)
      expect(CENTER_ALIGNMENT.center.align).toBe(NINE_ZONE.center.align)
    })
  })
})
