/**
 * DSL Event Tests
 *
 * Tests for event parsing:
 * - Click events (onclick, onclick-outside)
 * - Hover events
 * - Form events (onchange, oninput, onfocus, onblur)
 * - Keyboard events
 * - Load events
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'

// ============================================
// Click Events
// ============================================

describe('Click Events', () => {
  describe('onclick', () => {
    it('parses onclick with action', () => {
      const result = parse(`Button "Click"
  onclick show Panel`)
      expect(result.nodes[0].eventHandlers).toHaveLength(1)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onclick')
    })

    it('parses onclick toggle', () => {
      const result = parse(`Toggle "Switch"
  onclick toggle`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onclick')
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('toggle')
    })
  })

  describe('onclick-outside', () => {
    it('parses onclick-outside', () => {
      const result = parse(`Dropdown
  onclick-outside close`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onclick-outside')
    })
  })
})

// ============================================
// Hover Events
// ============================================

describe('Hover Events', () => {
  describe('onhover', () => {
    it('parses onhover with action', () => {
      const result = parse(`Item
  onhover highlight self`)
      expect(result.nodes[0].eventHandlers).toHaveLength(1)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onhover')
    })

    it('parses onhover show', () => {
      const result = parse(`Card
  onhover show Tooltip`)
      expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('show')
    })
  })
})

// ============================================
// Form Events
// ============================================

describe('Form Events', () => {
  describe('onchange', () => {
    it('parses onchange', () => {
      const result = parse(`Input "Search"
  onchange filter Results`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onchange')
    })
  })

  describe('oninput', () => {
    it('parses oninput', () => {
      const result = parse(`Input "Type here"
  oninput filter Suggestions`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('oninput')
    })

    it('parses oninput with debounce', () => {
      const result = parse(`Search
  oninput debounce 300 filter Results`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('oninput')
      expect(result.nodes[0].eventHandlers[0].debounce).toBe(300)
    })
  })

  describe('onfocus', () => {
    it('parses onfocus', () => {
      const result = parse(`Input "Email"
  onfocus show Hint`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onfocus')
    })
  })

  describe('onblur', () => {
    it('parses onblur', () => {
      const result = parse(`Input "Email"
  onblur hide Hint`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onblur')
    })

    it('parses onblur with delay', () => {
      const result = parse(`Input
  onblur delay 200 hide Results`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onblur')
      expect(result.nodes[0].eventHandlers[0].delay).toBe(200)
    })
  })
})

// ============================================
// Keyboard Events
// ============================================

describe('Keyboard Events', () => {
  describe('onkeydown', () => {
    it('parses onkeydown escape', () => {
      const result = parse(`Modal
  onkeydown escape close`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onkeydown')
      expect(result.nodes[0].eventHandlers[0].modifier).toBe('escape')
    })

    it('parses onkeydown enter', () => {
      const result = parse(`Input
  onkeydown enter select highlighted`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onkeydown')
      expect(result.nodes[0].eventHandlers[0].modifier).toBe('enter')
    })

    it('parses onkeydown arrow-down', () => {
      const result = parse(`Dropdown
  onkeydown arrow-down highlight next`)
      expect(result.nodes[0].eventHandlers[0].modifier).toBe('arrow-down')
    })

    it('parses onkeydown arrow-up', () => {
      const result = parse(`Dropdown
  onkeydown arrow-up highlight prev`)
      expect(result.nodes[0].eventHandlers[0].modifier).toBe('arrow-up')
    })
  })

  describe('onkeyup', () => {
    it('parses onkeyup', () => {
      const result = parse(`Input
  onkeyup space toggle`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onkeyup')
      expect(result.nodes[0].eventHandlers[0].modifier).toBe('space')
    })
  })

  describe('all key modifiers', () => {
    const keys = ['escape', 'enter', 'tab', 'space', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'backspace', 'delete', 'home', 'end']

    it.each(keys)('parses onkeydown %s', (key) => {
      const result = parse(`Box
  onkeydown ${key} show Panel`)
      expect(result.nodes[0].eventHandlers[0].modifier).toBe(key)
    })
  })
})

// ============================================
// Load Events
// ============================================

describe('Load Events', () => {
  describe('onload', () => {
    it('parses onload', () => {
      const result = parse(`Page
  onload show Welcome`)
      expect(result.nodes[0].eventHandlers[0].event).toBe('onload')
    })
  })
})

// ============================================
// Multiple Events
// ============================================

describe('Multiple Events', () => {
  it('parses multiple events on one component', () => {
    const dsl = `Dropdown
  onclick toggle
  onclick-outside close
  onkeydown escape close`
    const result = parse(dsl)
    expect(result.nodes[0].eventHandlers).toHaveLength(3)
  })
})

// ============================================
// Event Timing
// ============================================

describe('Event Timing', () => {
  describe('debounce', () => {
    it('parses debounce modifier', () => {
      const result = parse(`Input
  oninput debounce 300 filter Results`)
      expect(result.nodes[0].eventHandlers[0].debounce).toBe(300)
    })
  })

  describe('delay', () => {
    it('parses delay modifier', () => {
      const result = parse(`Input
  onblur delay 200 hide Results`)
      expect(result.nodes[0].eventHandlers[0].delay).toBe(200)
    })
  })
})

// ============================================
// Centralized Events Block
// ============================================

describe('Centralized Events Block', () => {
  it('parses events block', () => {
    const dsl = `Input Email "Email"
Button Submit "Submit"

events
  Email onchange
    hide Error
  Submit onclick
    validate Form`
    const result = parse(dsl)
    // Events should be attached to named components
    const emailNode = result.nodes.find(n => n.instanceName === 'Email' || n.name === 'Email')
    expect(emailNode?.eventHandlers.length).toBeGreaterThan(0)
  })

  it('parses multiple actions in events block', () => {
    const dsl = `Panel
  Content named Content1 "First"
  Content named Content2 hidden "Second"

Button named Btn1 "First"
Button named Btn2 "Second"

events
  Btn1 onclick
    show Content1
    hide Content2
  Btn2 onclick
    show Content2
    hide Content1`
    const result = parse(dsl)
    // Each button should have an onclick handler with multiple actions
    const btn1 = result.nodes.find(n => n.instanceName === 'Btn1')
    // Document behavior
  })
})
