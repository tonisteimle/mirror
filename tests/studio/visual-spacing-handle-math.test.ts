/**
 * Spacing-Handle Math — pure unit tests for the helpers shared by
 * padding/margin/gap managers. First chunk of test-debt repayment for
 * the visual subsystem (previously browser-only coverage).
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSpacingDelta,
  spacingPropertiesForMode,
  spacingDragLabel,
  spacingModeFromModifiers,
  type SpacingHandleSide,
} from '../../studio/visual/spacing-handle-math'

const SIDES: SpacingHandleSide[] = ['top', 'right', 'bottom', 'left']

describe('calculateSpacingDelta — inward (padding)', () => {
  // Padding handles grow when dragged toward the centre of the element.
  it('top handle: dragging down (mouseY > startY) increases padding', () => {
    expect(calculateSpacingDelta('top', 'inward', 100, 100, 100, 130)).toBe(30)
  })

  it('top handle: dragging up (mouseY < startY) decreases padding', () => {
    expect(calculateSpacingDelta('top', 'inward', 100, 100, 100, 70)).toBe(-30)
  })

  it('bottom handle: dragging up (mouseY < startY) increases padding', () => {
    expect(calculateSpacingDelta('bottom', 'inward', 100, 100, 100, 70)).toBe(30)
  })

  it('left handle: dragging right (mouseX > startX) increases padding', () => {
    expect(calculateSpacingDelta('left', 'inward', 100, 100, 130, 100)).toBe(30)
  })

  it('right handle: dragging left (mouseX < startX) increases padding', () => {
    expect(calculateSpacingDelta('right', 'inward', 100, 100, 70, 100)).toBe(30)
  })

  it('zero movement → zero delta', () => {
    for (const side of SIDES) {
      expect(calculateSpacingDelta(side, 'inward', 100, 100, 100, 100)).toBe(0)
    }
  })
})

describe('calculateSpacingDelta — outward (margin)', () => {
  // Margin handles grow when dragged AWAY from the element — opposite
  // polarity from padding for every side.
  it('top handle: dragging up (mouseY < startY) increases margin', () => {
    expect(calculateSpacingDelta('top', 'outward', 100, 100, 100, 70)).toBe(30)
  })

  it('top handle: dragging down decreases margin', () => {
    expect(calculateSpacingDelta('top', 'outward', 100, 100, 100, 130)).toBe(-30)
  })

  it('bottom handle: dragging down increases margin', () => {
    expect(calculateSpacingDelta('bottom', 'outward', 100, 100, 100, 130)).toBe(30)
  })

  it('left handle: dragging left increases margin', () => {
    expect(calculateSpacingDelta('left', 'outward', 100, 100, 70, 100)).toBe(30)
  })

  it('right handle: dragging right increases margin', () => {
    expect(calculateSpacingDelta('right', 'outward', 100, 100, 130, 100)).toBe(30)
  })

  it('inward and outward are mirror-image polarities', () => {
    for (const side of SIDES) {
      const inward = calculateSpacingDelta(side, 'inward', 100, 100, 130, 130)
      const outward = calculateSpacingDelta(side, 'outward', 100, 100, 130, 130)
      expect(inward).toBe(-outward)
    }
  })
})

describe('spacingPropertiesForMode', () => {
  it('mode=single returns just the handle side', () => {
    expect(spacingPropertiesForMode('padding', 'single', 'top')).toEqual(['padding-top'])
    expect(spacingPropertiesForMode('margin', 'single', 'right')).toEqual(['margin-right'])
  })

  it('mode=all returns all four sides', () => {
    expect(spacingPropertiesForMode('padding', 'all', 'top')).toEqual([
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
    ])
  })

  it('mode=axis on top/bottom handle returns vertical pair', () => {
    expect(spacingPropertiesForMode('padding', 'axis', 'top')).toEqual([
      'padding-top',
      'padding-bottom',
    ])
    expect(spacingPropertiesForMode('padding', 'axis', 'bottom')).toEqual([
      'padding-top',
      'padding-bottom',
    ])
  })

  it('mode=axis on left/right handle returns horizontal pair', () => {
    expect(spacingPropertiesForMode('margin', 'axis', 'left')).toEqual([
      'margin-left',
      'margin-right',
    ])
    expect(spacingPropertiesForMode('margin', 'axis', 'right')).toEqual([
      'margin-left',
      'margin-right',
    ])
  })

  it('mode=all is symmetric across handle (handle is ignored)', () => {
    const fromTop = spacingPropertiesForMode('padding', 'all', 'top')
    for (const side of SIDES) {
      expect(spacingPropertiesForMode('padding', 'all', side)).toEqual(fromTop)
    }
  })
})

describe('spacingDragLabel', () => {
  it('mode=all → bare prefix', () => {
    expect(spacingDragLabel('pad', 'all', 'top')).toBe('pad')
    expect(spacingDragLabel('mar', 'all', 'left')).toBe('mar')
  })

  it('mode=axis on vertical handle → -y suffix', () => {
    expect(spacingDragLabel('pad', 'axis', 'top')).toBe('pad-y')
    expect(spacingDragLabel('pad', 'axis', 'bottom')).toBe('pad-y')
    expect(spacingDragLabel('mar', 'axis', 'top')).toBe('mar-y')
  })

  it('mode=axis on horizontal handle → -x suffix', () => {
    expect(spacingDragLabel('pad', 'axis', 'left')).toBe('pad-x')
    expect(spacingDragLabel('pad', 'axis', 'right')).toBe('pad-x')
    expect(spacingDragLabel('mar', 'axis', 'right')).toBe('mar-x')
  })

  it('mode=single → first letter of side', () => {
    expect(spacingDragLabel('pad', 'single', 'top')).toBe('pad-t')
    expect(spacingDragLabel('pad', 'single', 'right')).toBe('pad-r')
    expect(spacingDragLabel('pad', 'single', 'bottom')).toBe('pad-b')
    expect(spacingDragLabel('pad', 'single', 'left')).toBe('pad-l')
    expect(spacingDragLabel('mar', 'single', 'top')).toBe('mar-t')
  })
})

describe('spacingModeFromModifiers', () => {
  it('Shift → all', () => {
    expect(spacingModeFromModifiers({ shift: true })).toBe('all')
  })

  it('Alt → axis', () => {
    expect(spacingModeFromModifiers({ alt: true })).toBe('axis')
  })

  it('no modifiers → single', () => {
    expect(spacingModeFromModifiers({})).toBe('single')
  })

  it('Shift wins over Alt when both held', () => {
    expect(spacingModeFromModifiers({ shift: true, alt: true })).toBe('all')
  })
})
