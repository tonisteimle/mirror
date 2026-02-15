/**
 * DSL Schema Tests
 *
 * Tests for the DSL schema - the single source of truth
 * for all valid properties, events, actions, etc.
 */

import { describe, it, expect } from 'vitest'
import {
  DSL_SCHEMA,
  getAllProperties,
  getAllEvents,
  getAllActions,
  isValidProperty,
  isValidEvent,
  isValidAction,
  isValidTarget,
  isValidAnimation,
  isValidPosition,
  isValidDirection,
  isValidKeyword,
  isValidPrimitive,
  isValidOpacity,
  getPropertyCategory,
  getActionCategory,
} from '../../validation/dsl-schema'

// =============================================================================
// Schema Completeness Tests
// =============================================================================

describe('DSL Schema Completeness', () => {
  describe('Properties', () => {
    it('has all layout properties', () => {
      const layout = DSL_SCHEMA.properties.layout
      expect(layout.has('horizontal')).toBe(true)
      expect(layout.has('hor')).toBe(true)
      expect(layout.has('vertical')).toBe(true)
      expect(layout.has('ver')).toBe(true)
      expect(layout.has('gap')).toBe(true)
      expect(layout.has('between')).toBe(true)
      expect(layout.has('wrap')).toBe(true)
      expect(layout.has('grow')).toBe(true)
      expect(layout.has('fill')).toBe(true)
      expect(layout.has('stacked')).toBe(true)
      expect(layout.has('grid')).toBe(true)
    })

    it('has all alignment properties', () => {
      const alignment = DSL_SCHEMA.properties.alignment
      expect(alignment.has('horizontal-left')).toBe(true)
      expect(alignment.has('hor-l')).toBe(true)
      expect(alignment.has('horizontal-center')).toBe(true)
      expect(alignment.has('hor-cen')).toBe(true)
      expect(alignment.has('center')).toBe(true)
      expect(alignment.has('cen')).toBe(true)
    })

    it('has all sizing properties', () => {
      const sizing = DSL_SCHEMA.properties.sizing
      expect(sizing.has('width')).toBe(true)
      expect(sizing.has('w')).toBe(true)
      expect(sizing.has('height')).toBe(true)
      expect(sizing.has('h')).toBe(true)
      expect(sizing.has('min-width')).toBe(true)
      expect(sizing.has('minw')).toBe(true)
      expect(sizing.has('max-width')).toBe(true)
      expect(sizing.has('maxw')).toBe(true)
      expect(sizing.has('full')).toBe(true)
    })

    it('has all spacing properties', () => {
      const spacing = DSL_SCHEMA.properties.spacing
      expect(spacing.has('padding')).toBe(true)
      expect(spacing.has('p')).toBe(true)
      expect(spacing.has('pad')).toBe(true)
      expect(spacing.has('margin')).toBe(true)
      expect(spacing.has('m')).toBe(true)
      expect(spacing.has('mar')).toBe(true)
    })

    it('has all color properties', () => {
      const colors = DSL_SCHEMA.properties.colors
      expect(colors.has('background')).toBe(true)
      expect(colors.has('bg')).toBe(true)
      expect(colors.has('color')).toBe(true)
      expect(colors.has('col')).toBe(true)
      expect(colors.has('c')).toBe(true)
      expect(colors.has('border-color')).toBe(true)
      expect(colors.has('boc')).toBe(true)
    })

    it('has all border properties', () => {
      const border = DSL_SCHEMA.properties.border
      expect(border.has('border')).toBe(true)
      expect(border.has('bor')).toBe(true)
      expect(border.has('radius')).toBe(true)
      expect(border.has('rad')).toBe(true)
    })

    it('has all typography properties', () => {
      const typo = DSL_SCHEMA.properties.typography
      expect(typo.has('size')).toBe(true)
      expect(typo.has('weight')).toBe(true)
      expect(typo.has('font')).toBe(true)
      expect(typo.has('line')).toBe(true)
      expect(typo.has('align')).toBe(true)
      expect(typo.has('italic')).toBe(true)
      expect(typo.has('underline')).toBe(true)
      expect(typo.has('truncate')).toBe(true)
    })

    it('has all visual properties', () => {
      const visual = DSL_SCHEMA.properties.visual
      expect(visual.has('opacity')).toBe(true)
      expect(visual.has('opa')).toBe(true)
      expect(visual.has('o')).toBe(true)
      expect(visual.has('shadow')).toBe(true)
      expect(visual.has('cursor')).toBe(true)
      expect(visual.has('z')).toBe(true)
      expect(visual.has('hidden')).toBe(true)
      expect(visual.has('disabled')).toBe(true)
      expect(visual.has('rotate')).toBe(true)
      expect(visual.has('translate')).toBe(true)
    })

    it('has all hover properties', () => {
      const hover = DSL_SCHEMA.properties.hover
      expect(hover.has('hover-background')).toBe(true)
      expect(hover.has('hover-bg')).toBe(true)
      expect(hover.has('hover-color')).toBe(true)
      expect(hover.has('hover-col')).toBe(true)
      expect(hover.has('hover-scale')).toBe(true)
    })
  })

  describe('Events', () => {
    it('has all standard events', () => {
      expect(DSL_SCHEMA.events.has('onclick')).toBe(true)
      expect(DSL_SCHEMA.events.has('onclick-outside')).toBe(true)
      expect(DSL_SCHEMA.events.has('onhover')).toBe(true)
      expect(DSL_SCHEMA.events.has('onchange')).toBe(true)
      expect(DSL_SCHEMA.events.has('oninput')).toBe(true)
      expect(DSL_SCHEMA.events.has('onfocus')).toBe(true)
      expect(DSL_SCHEMA.events.has('onblur')).toBe(true)
      expect(DSL_SCHEMA.events.has('onkeydown')).toBe(true)
      expect(DSL_SCHEMA.events.has('onkeyup')).toBe(true)
      expect(DSL_SCHEMA.events.has('onload')).toBe(true)
    })

    it('has all segment events', () => {
      expect(DSL_SCHEMA.segmentEvents.has('onfill')).toBe(true)
      expect(DSL_SCHEMA.segmentEvents.has('oncomplete')).toBe(true)
      expect(DSL_SCHEMA.segmentEvents.has('onempty')).toBe(true)
    })
  })

  describe('Actions', () => {
    it('has all visibility actions', () => {
      expect(DSL_SCHEMA.actions.visibility.has('show')).toBe(true)
      expect(DSL_SCHEMA.actions.visibility.has('hide')).toBe(true)
      expect(DSL_SCHEMA.actions.visibility.has('toggle')).toBe(true)
      expect(DSL_SCHEMA.actions.visibility.has('open')).toBe(true)
      expect(DSL_SCHEMA.actions.visibility.has('close')).toBe(true)
    })

    it('has all state actions', () => {
      expect(DSL_SCHEMA.actions.state.has('change')).toBe(true)
      expect(DSL_SCHEMA.actions.state.has('toggle-state')).toBe(true)
      expect(DSL_SCHEMA.actions.state.has('activate')).toBe(true)
      expect(DSL_SCHEMA.actions.state.has('deactivate')).toBe(true)
      expect(DSL_SCHEMA.actions.state.has('deactivate-siblings')).toBe(true)
    })

    it('has all selection actions', () => {
      expect(DSL_SCHEMA.actions.selection.has('highlight')).toBe(true)
      expect(DSL_SCHEMA.actions.selection.has('select')).toBe(true)
      expect(DSL_SCHEMA.actions.selection.has('deselect')).toBe(true)
      expect(DSL_SCHEMA.actions.selection.has('clear-selection')).toBe(true)
      expect(DSL_SCHEMA.actions.selection.has('filter')).toBe(true)
    })

    it('has all navigation actions', () => {
      expect(DSL_SCHEMA.actions.navigation.has('page')).toBe(true)
      expect(DSL_SCHEMA.actions.navigation.has('assign')).toBe(true)
      expect(DSL_SCHEMA.actions.navigation.has('alert')).toBe(true)
    })

    it('has all form actions', () => {
      expect(DSL_SCHEMA.actions.form.has('focus')).toBe(true)
      expect(DSL_SCHEMA.actions.form.has('validate')).toBe(true)
      expect(DSL_SCHEMA.actions.form.has('reset')).toBe(true)
    })
  })

  describe('Targets', () => {
    it('has all targets', () => {
      expect(DSL_SCHEMA.targets.has('self')).toBe(true)
      expect(DSL_SCHEMA.targets.has('next')).toBe(true)
      expect(DSL_SCHEMA.targets.has('prev')).toBe(true)
      expect(DSL_SCHEMA.targets.has('first')).toBe(true)
      expect(DSL_SCHEMA.targets.has('last')).toBe(true)
      expect(DSL_SCHEMA.targets.has('first-empty')).toBe(true)
      expect(DSL_SCHEMA.targets.has('highlighted')).toBe(true)
      expect(DSL_SCHEMA.targets.has('selected')).toBe(true)
      expect(DSL_SCHEMA.targets.has('self-and-before')).toBe(true)
      expect(DSL_SCHEMA.targets.has('all')).toBe(true)
      expect(DSL_SCHEMA.targets.has('none')).toBe(true)
    })
  })

  describe('Animations', () => {
    it('has all animations', () => {
      expect(DSL_SCHEMA.animations.has('fade')).toBe(true)
      expect(DSL_SCHEMA.animations.has('scale')).toBe(true)
      expect(DSL_SCHEMA.animations.has('slide-up')).toBe(true)
      expect(DSL_SCHEMA.animations.has('slide-down')).toBe(true)
      expect(DSL_SCHEMA.animations.has('slide-left')).toBe(true)
      expect(DSL_SCHEMA.animations.has('slide-right')).toBe(true)
      expect(DSL_SCHEMA.animations.has('none')).toBe(true)
    })
  })

  describe('Key Modifiers', () => {
    it('has all key modifiers', () => {
      expect(DSL_SCHEMA.keyModifiers.has('escape')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('enter')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('tab')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('space')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('arrow-up')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('arrow-down')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('arrow-left')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('arrow-right')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('backspace')).toBe(true)
      expect(DSL_SCHEMA.keyModifiers.has('delete')).toBe(true)
    })
  })

  describe('Value Constraints', () => {
    it('has correct opacity range', () => {
      expect(DSL_SCHEMA.valueConstraints.opacity.min).toBe(0)
      expect(DSL_SCHEMA.valueConstraints.opacity.max).toBe(1)
    })

    it('has valid cursor values (no hyphens)', () => {
      const cursors = DSL_SCHEMA.valueConstraints.cursor
      expect(cursors.has('pointer')).toBe(true)
      expect(cursors.has('default')).toBe(true)
      expect(cursors.has('text')).toBe(true)
      expect(cursors.has('move')).toBe(true)
      expect(cursors.has('grab')).toBe(true)
      // NOT allowed (lexer splits on hyphens)
      expect(cursors.has('not-allowed')).toBe(false)
    })

    it('has valid shadow values', () => {
      const shadows = DSL_SCHEMA.valueConstraints.shadow
      expect(shadows.has('sm')).toBe(true)
      expect(shadows.has('md')).toBe(true)
      expect(shadows.has('lg')).toBe(true)
      expect(shadows.has('xl')).toBe(true)
    })
  })
})

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('DSL Schema Helpers', () => {
  describe('getAllProperties', () => {
    it('returns all properties as a flat set', () => {
      const all = getAllProperties()
      expect(all.size).toBeGreaterThan(50)
      expect(all.has('padding')).toBe(true)
      expect(all.has('background')).toBe(true)
      expect(all.has('opacity')).toBe(true)
    })
  })

  describe('getAllEvents', () => {
    it('returns all events including segment events', () => {
      const all = getAllEvents()
      expect(all.has('onclick')).toBe(true)
      expect(all.has('onfill')).toBe(true)
    })
  })

  describe('getAllActions', () => {
    it('returns all actions as a flat set', () => {
      const all = getAllActions()
      expect(all.has('show')).toBe(true)
      expect(all.has('page')).toBe(true)
      expect(all.has('validate')).toBe(true)
    })
  })

  describe('isValidProperty', () => {
    it('returns true for valid properties', () => {
      expect(isValidProperty('padding')).toBe(true)
      expect(isValidProperty('pad')).toBe(true)
      expect(isValidProperty('p')).toBe(true)
      expect(isValidProperty('background')).toBe(true)
      expect(isValidProperty('bg')).toBe(true)
    })

    it('returns false for invalid properties', () => {
      expect(isValidProperty('padd')).toBe(false)
      expect(isValidProperty('backgrnd')).toBe(false)
      expect(isValidProperty('xyz')).toBe(false)
    })
  })

  describe('isValidEvent', () => {
    it('returns true for valid events', () => {
      expect(isValidEvent('onclick')).toBe(true)
      expect(isValidEvent('onhover')).toBe(true)
      expect(isValidEvent('onfill')).toBe(true)
    })

    it('returns false for invalid events', () => {
      expect(isValidEvent('onclck')).toBe(false)
      expect(isValidEvent('onhver')).toBe(false)
    })
  })

  describe('isValidAction', () => {
    it('returns true for valid actions', () => {
      expect(isValidAction('show')).toBe(true)
      expect(isValidAction('hide')).toBe(true)
      expect(isValidAction('toggle')).toBe(true)
    })

    it('returns false for invalid actions', () => {
      expect(isValidAction('shwo')).toBe(false)
      expect(isValidAction('toogle')).toBe(false)
    })
  })

  describe('isValidTarget', () => {
    it('returns true for valid targets', () => {
      expect(isValidTarget('self')).toBe(true)
      expect(isValidTarget('next')).toBe(true)
      expect(isValidTarget('highlighted')).toBe(true)
    })

    it('returns false for invalid targets', () => {
      expect(isValidTarget('selff')).toBe(false)
      expect(isValidTarget('nextt')).toBe(false)
    })
  })

  describe('isValidOpacity', () => {
    it('returns true for valid opacity values (0-1)', () => {
      expect(isValidOpacity(0)).toBe(true)
      expect(isValidOpacity(0.5)).toBe(true)
      expect(isValidOpacity(1)).toBe(true)
    })

    it('returns false for invalid opacity values', () => {
      expect(isValidOpacity(-0.1)).toBe(false)
      expect(isValidOpacity(1.1)).toBe(false)
      expect(isValidOpacity(50)).toBe(false)  // Common LLM error!
      expect(isValidOpacity(100)).toBe(false)
    })
  })

  describe('getPropertyCategory', () => {
    it('returns correct category for properties', () => {
      expect(getPropertyCategory('padding')).toBe('spacing')
      expect(getPropertyCategory('background')).toBe('colors')
      expect(getPropertyCategory('horizontal')).toBe('layout')
      expect(getPropertyCategory('opacity')).toBe('visual')
    })

    it('returns null for unknown properties', () => {
      expect(getPropertyCategory('xyz')).toBe(null)
    })
  })

  describe('getActionCategory', () => {
    it('returns correct category for actions', () => {
      expect(getActionCategory('show')).toBe('visibility')
      expect(getActionCategory('activate')).toBe('state')
      expect(getActionCategory('select')).toBe('selection')
      expect(getActionCategory('page')).toBe('navigation')
      expect(getActionCategory('validate')).toBe('form')
    })

    it('returns null for unknown actions', () => {
      expect(getActionCategory('xyz')).toBe(null)
    })
  })
})

// =============================================================================
// Critical: No Color Confusion
// =============================================================================

describe('Color Property Distinction', () => {
  it('background and color are DIFFERENT properties', () => {
    const colors = DSL_SCHEMA.properties.colors

    // Both should exist
    expect(colors.has('background')).toBe(true)
    expect(colors.has('bg')).toBe(true)
    expect(colors.has('color')).toBe(true)
    expect(colors.has('col')).toBe(true)
    expect(colors.has('c')).toBe(true)

    // They should be in the SAME category (colors)
    expect(getPropertyCategory('background')).toBe('colors')
    expect(getPropertyCategory('bg')).toBe('colors')
    expect(getPropertyCategory('color')).toBe('colors')
    expect(getPropertyCategory('col')).toBe('colors')

    // But they are DIFFERENT properties (bg != col)
    // This is verified by them both existing in the set
  })
})
