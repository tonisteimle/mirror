/**
 * DSL Action Tests
 *
 * Tests for action parsing:
 * - Visibility actions (show, hide, toggle)
 * - Overlay actions (open, close)
 * - State actions (change, activate, deactivate)
 * - Selection actions (highlight, select, deselect)
 * - Navigation actions (page)
 * - Assignment actions (assign)
 * - Form actions (validate, reset, filter, focus)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'

// ============================================
// Visibility Actions
// ============================================

describe('Visibility Actions', () => {
  describe('show', () => {
    it('parses show action', () => {
      const result = parse(`Button
  onclick show Panel`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('show')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Panel')
    })
  })

  describe('hide', () => {
    it('parses hide action', () => {
      const result = parse(`CloseButton
  onclick hide Modal`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('hide')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Modal')
    })
  })

  describe('toggle', () => {
    it('parses toggle action', () => {
      const result = parse(`Switch
  onclick toggle`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('toggle')
    })
  })
})

// ============================================
// Overlay Actions
// ============================================

describe('Overlay Actions', () => {
  describe('open', () => {
    it('parses open action', () => {
      const result = parse(`Button
  onclick open Dialog`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('open')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Dialog')
    })

    it('parses open with position', () => {
      const result = parse(`Button
  onclick open Menu below`)
      const action = result.nodes[0].eventHandlers[0].actions[0]
      expect(action.type).toBe('open')
      expect(action.position).toBe('below')
    })

    it('parses open with animation', () => {
      const result = parse(`Button
  onclick open Dialog center fade 200`)
      const action = result.nodes[0].eventHandlers[0].actions[0]
      expect(action.type).toBe('open')
      // 'center' is normalized to 'cen' by the normalizer
      expect(action.position).toBe('cen')
      expect(action.animation).toBe('fade')
      expect(action.duration).toBe(200)
    })

    // Note: 'center' is normalized to 'cen', so we map expected values
    it.each([
      ['below', 'below'],
      ['above', 'above'],
      ['left', 'left'],
      ['right', 'right'],
      ['center', 'cen']
    ])('parses position %s', (position, expected) => {
      const result = parse(`Button onclick open Menu ${position}`)
      expect(result.nodes[0].eventHandlers[0].actions[0].position).toBe(expected)
    })

    it.each(['fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right'])('parses animation %s', (animation) => {
      const result = parse(`Button onclick open Dialog center ${animation}`)
      expect(result.nodes[0].eventHandlers[0].actions[0].animation).toBe(animation)
    })
  })

  describe('close', () => {
    it('parses close action', () => {
      const result = parse(`Button
  onclick close`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('close')
    })

    it('parses close with target', () => {
      const result = parse(`Button
  onclick close Modal`)
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Modal')
    })

    it('parses close with animation', () => {
      const result = parse(`Button
  onclick close Modal fade 150`)
      const action = result.nodes[0].eventHandlers[0].actions[0]
      expect(action.animation).toBe('fade')
      expect(action.duration).toBe(150)
    })
  })
})

// ============================================
// State Actions
// ============================================

describe('State Actions', () => {
  describe('change', () => {
    it('parses change to state', () => {
      const result = parse(`Tab
  onclick change self to active`)
      const action = result.nodes[0].eventHandlers[0].actions[0]
      expect(action.type).toBe('change')
      expect(action.target).toBe('self')
      // Parser stores state as 'toState'
      expect(action.toState).toBe('active')
    })
  })

  describe('activate', () => {
    it('parses activate action', () => {
      const result = parse(`Tab
  onclick activate self`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('activate')
    })
  })

  describe('deactivate', () => {
    it('parses deactivate action', () => {
      const result = parse(`Tab
  onclick deactivate self`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('deactivate')
    })
  })

  describe('deactivate-siblings', () => {
    it('parses deactivate-siblings action', () => {
      const result = parse(`Tab
  onclick deactivate-siblings`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('deactivate-siblings')
    })
  })

  describe('toggle-state', () => {
    it('parses toggle-state action', () => {
      const result = parse(`Checkbox
  onclick toggle-state`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('toggle-state')
    })
  })
})

// ============================================
// Selection Actions
// ============================================

describe('Selection Actions', () => {
  describe('highlight', () => {
    it('parses highlight self', () => {
      const result = parse(`Item
  onhover highlight self`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('highlight')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('self')
    })

    it('parses highlight next', () => {
      const result = parse(`List
  onkeydown arrow-down highlight next`)
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('next')
    })

    it('parses highlight prev', () => {
      const result = parse(`List
  onkeydown arrow-up highlight prev`)
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('prev')
    })
  })

  describe('select', () => {
    it('parses select self', () => {
      const result = parse(`Option
  onclick select self`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('select')
    })

    it('parses select highlighted', () => {
      const result = parse(`Dropdown
  onkeydown enter select highlighted`)
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('highlighted')
    })
  })

  describe('deselect', () => {
    it('parses deselect self', () => {
      const result = parse(`Option
  onclick deselect self`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('deselect')
    })
  })

  describe('clear-selection', () => {
    it('parses clear-selection', () => {
      const result = parse(`Button
  onclick clear-selection`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('clear-selection')
    })
  })
})

// ============================================
// Navigation Actions
// ============================================

describe('Navigation Actions', () => {
  describe('page', () => {
    it('parses page action', () => {
      const result = parse(`NavLink
  onclick page Dashboard`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('page')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Dashboard')
    })
  })
})

// ============================================
// Assignment Actions
// ============================================

describe('Assignment Actions', () => {
  describe('assign', () => {
    it('parses assign to value', () => {
      const result = parse(`Button
  onclick assign $count to $count + 1`)
      const action = result.nodes[0].eventHandlers[0].actions[0]
      expect(action.type).toBe('assign')
      // Parser stores variable name in 'target' without the $ prefix
      expect(action.target).toBe('count')
    })

    it('parses assign to literal', () => {
      const result = parse(`Button
  onclick assign $active to true`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('assign')
    })
  })
})

// ============================================
// Form Actions
// ============================================

describe('Form Actions', () => {
  describe('filter', () => {
    it('parses filter action', () => {
      const result = parse(`SearchInput
  oninput filter Results`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('filter')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Results')
    })
  })

  describe('focus', () => {
    it('parses focus next', () => {
      const result = parse(`Input
  onfill focus next`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('focus')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('next')
    })
  })

  describe('validate', () => {
    it('parses validate action', () => {
      const result = parse(`SubmitButton
  onclick validate Form`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('validate')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Form')
    })
  })

  describe('reset', () => {
    it('parses reset action', () => {
      const result = parse(`ClearButton
  onclick reset Form`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('reset')
      expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe('Form')
    })
  })
})

// ============================================
// Target Keywords
// ============================================

describe('Target Keywords', () => {
  it.each(['self', 'next', 'prev', 'first', 'last', 'highlighted', 'selected'])('parses target %s', (target) => {
    const result = parse(`Item onclick select ${target}`)
    expect(result.nodes[0].eventHandlers[0].actions[0].target).toBe(target)
  })
})

// ============================================
// Multiple Actions (Comma Chain)
// ============================================

describe('Multiple Actions (Comma Chain)', () => {
  it('parses comma-chained actions', () => {
    const result = parse(`Option onclick select self, close Dropdown`)
    const actions = result.nodes[0].eventHandlers[0].actions
    expect(actions).toHaveLength(2)
    expect(actions[0].type).toBe('select')
    expect(actions[1].type).toBe('close')
  })

  it('parses multiple comma-chained actions', () => {
    const result = parse(`Item onclick highlight self, show Preview, assign $selected to self`)
    const actions = result.nodes[0].eventHandlers[0].actions
    expect(actions).toHaveLength(3)
  })
})
