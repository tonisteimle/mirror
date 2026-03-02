/**
 * Event Handler Tests
 *
 * Comprehensive tests for all Mirror DSL event handlers and actions.
 * Verifies correct React event handler generation.
 */

import { describe, it, expect } from 'vitest'
import { exportReact } from '../../generator/export'

// =============================================================================
// Click Events
// =============================================================================

describe('Click Event Handlers', () => {
  describe('Show/Hide/Toggle', () => {
    it('generates onClick for show action', () => {
      const { tsx } = exportReact(`Button onclick show Panel "Show"
Panel hidden "Content"`)
      expect(tsx).toContain('onClick')
      expect(tsx).toMatch(/setPanel.*true|setPanelVisible.*true/)
    })

    it('generates onClick for hide action', () => {
      const { tsx } = exportReact(`Panel: pad 16
  Button onclick hide self "Hide"

Panel`)
      expect(tsx).toContain('onClick')
      expect(tsx).toMatch(/setPanel.*false|setPanelVisible.*false|set\w+Visible.*false/)
    })

    it('generates onClick for toggle action', () => {
      const { tsx } = exportReact(`Button onclick toggle Panel "Toggle"
Panel hidden "Content"`)
      expect(tsx).toContain('onClick')
      expect(tsx).toMatch(/prev\s*=>|!\w+Visible|!panel/)
    })

    it('handles multiple actions in one click', () => {
      const { tsx } = exportReact(`Button:
  onclick
    show Panel
    hide Other

Button "Do Both"
Panel hidden "Panel"
Other hidden "Other"`)
      expect(tsx).toContain('onClick')
      // Should have both actions in handler
      expect(tsx).toMatch(/setPanel|setPanelVisible/)
      expect(tsx).toMatch(/setOther|setOtherVisible/)
    })
  })


  describe('State Actions', () => {
    it('generates onClick for activate', () => {
      const { tsx } = exportReact(`Tab:
  state active
    bg #3B82F6
  onclick activate self

Tab "Tab 1"`)
      expect(tsx).toContain('onClick')
    })

    it('generates onClick for toggle-state', () => {
      const { tsx } = exportReact(`Toggle:
  state on
    bg #3B82F6
  state off
    bg #333
  onclick toggle-state

Toggle`)
      expect(tsx).toContain('onClick')
      // Should toggle between states
      expect(tsx).toMatch(/prev\s*=>|toggle|!/)
    })

    it('generates onClick for deactivate-siblings', () => {
      const { tsx } = exportReact(`Nav: hor
  Tab:
    state active
      bg #3B82F6
    onclick
      activate self
      deactivate-siblings

Nav
  - Tab "Home"
  - Tab "About"`)
      expect(tsx).toContain('onClick')
    })
  })

  describe('Selection Actions', () => {
    it('generates onClick for select', () => {
      const { tsx } = exportReact(`Item:
  state selected
    bg #3B82F6
  onclick select self

Item "Selectable"`)
      expect(tsx).toContain('onClick')
    })

    it('generates onClick for highlight', () => {
      const { tsx } = exportReact(`Item:
  state highlighted
    bg #333
  onclick highlight self

Item "Item"`)
      expect(tsx).toContain('onClick')
    })
  })

})

// =============================================================================
// Change Events
// =============================================================================

describe('Change Event Handlers', () => {
  it('generates onChange for Input', () => {
    const { tsx } = exportReact(`$text: ""
Input onchange assign $text to $event.value "Type..."`)
    expect(tsx).toContain('onChange')
  })

  it('binds value to state', () => {
    const { tsx } = exportReact(`$email: ""
Input onchange assign $email to $event.value "Email"`)
    expect(tsx).toContain('value={')
    expect(tsx).toMatch(/value=\{.*email|value=\{.*text/i)
  })

  it('generates setter call', () => {
    const { tsx } = exportReact(`$name: ""
Input onchange assign $name to $event.value "Name"`)
    expect(tsx).toMatch(/setName|setText/)
    expect(tsx).toMatch(/e\.target\.value|event\.target\.value/)
  })

  it('handles multiple inputs with different variables', () => {
    const { tsx } = exportReact(`$email: ""
$password: ""
Input onchange assign $email to $event.value "Email"
Input onchange assign $password to $event.value "Password"`)
    expect((tsx.match(/onChange/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(tsx).toMatch(/setEmail|email/i)
    expect(tsx).toMatch(/setPassword|password/i)
  })

  it('generates onChange for Textarea', () => {
    const { tsx } = exportReact(`$message: ""
Textarea onchange assign $message to $event.value "Enter message"`)
    expect(tsx).toContain('onChange')
    expect(tsx).toContain('<textarea')
  })
})


// =============================================================================
// State Management
// =============================================================================

describe('State Management', () => {
  describe('Visibility States', () => {
    it('creates useState for hidden elements', () => {
      const { tsx } = exportReact(`Panel hidden "Content"`)
      expect(tsx).toContain('useState')
    })

    it('uses correct initial state for hidden', () => {
      const { tsx } = exportReact(`Panel hidden "Content"`)
      expect(tsx).toMatch(/useState\(false\)|useState\(.*false.*\)/)
    })

    it('uses conditional rendering', () => {
      const { tsx } = exportReact(`Button onclick toggle Panel "Toggle"
Panel hidden "Content"`)
      expect(tsx).toMatch(/\{.*&&|ternary|\?/)
    })
  })

  describe('Component States', () => {
    it('creates useState for state definitions', () => {
      const { tsx } = exportReact(`Toggle:
  state on
    bg #3B82F6
  state off
    bg #333

Toggle`)
      expect(tsx).toContain('useState')
    })

    it('uses first state as initial', () => {
      const { tsx } = exportReact(`Toggle:
  state on
    bg #3B82F6
  state off
    bg #333

Toggle`)
      expect(tsx).toMatch(/'on'|"on"|useState.*on/)
    })

    it('creates type union for states', () => {
      const { tsx } = exportReact(`Status:
  state pending
    bg #F59E0B
  state success
    bg #22C55E
  state error
    bg #EF4444

Status`)
      // Should have state type or union
      expect(tsx).toMatch(/'pending'|'success'|'error'|useState/)
    })
  })

  describe('Variables', () => {
    it('creates useState for writable variables', () => {
      const { tsx } = exportReact(`$count: 0
Button onclick assign $count to $count + 1 "Increment"
Text $count`)
      expect(tsx).toContain('useState')
    })
  })
})

// =============================================================================
// Event Target Handling
// =============================================================================

describe('Event Targets', () => {
  it('handles named target', () => {
    const { tsx } = exportReact(`Button onclick show SpecificPanel "Show"
Box named SpecificPanel hidden "Target Panel"`)
    expect(tsx).toMatch(/setSpecificPanel|SpecificPanel/)
  })
})

// =============================================================================
// Complex Event Scenarios
// =============================================================================

describe('Complex Event Scenarios', () => {
  it('handles form submission pattern', () => {
    const code = `$email: ""
$password: ""
$error: ""

Form: ver, gap 16
  Input onchange assign $email to $event.value "Email"
  Input onchange assign $password to $event.value "Password"
  Text col #EF4444 $error
  Button "Login"

Form`
    const { tsx } = exportReact(code)
    expect(tsx).toContain('useState')
    expect((tsx.match(/onChange/g) || []).length).toBeGreaterThanOrEqual(2)
  })

  it('handles accordion pattern', () => {
    const code = `Accordion:
  Section:
    Header:
      onclick toggle Content
    Content: hidden

Accordion
  Section
    Header "Section 1"
    Content "Content 1"
  Section
    Header "Section 2"
    Content "Content 2"`
    const { tsx } = exportReact(code)
    expect(tsx).toContain('onClick')
  })

  it('handles dropdown pattern', () => {
    const code = `Dropdown:
  Trigger:
    onclick toggle Menu
  Menu: hidden, ver
    Item:
      onclick
        select self
        close Menu

Dropdown
  Trigger "Select..."
  Menu
    - Item "Option A"
    - Item "Option B"
    - Item "Option C"`
    const { tsx } = exportReact(code)
    expect(tsx).toContain('onClick')
    expect(tsx).toContain('useState')
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles element without events', () => {
    const { tsx } = exportReact('Box pad 16 "Static"')
    expect(tsx).not.toContain('onClick')
    expect(tsx).not.toContain('onChange')
  })

  it('handles events on primitives', () => {
    const { tsx } = exportReact(`Button onclick show Panel "Click"
Panel hidden "Panel"`)
    expect(tsx).toContain('<button')
    expect(tsx).toContain('onClick')
  })

  it('handles events without action body', () => {
    // Events defined but no actions - should still compile
    const { tsx } = exportReact(`Button "No Action"`)
    expect(tsx).toContain('<button')
  })
})
