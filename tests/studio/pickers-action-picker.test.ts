// @vitest-environment jsdom
/**
 * Tests for studio/pickers/action/index.ts (ActionPicker, 0%, 388 LOC)
 *
 * Form-style picker for picking events + actions + (optional) targets.
 * Tests pin construction, render shape, key-selector visibility based
 * on event type, target-selector visibility based on action, value
 * mutation through select-changes, getValue/setValue serialization,
 * and Cancel/Add buttons.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ActionPicker,
  createActionPicker,
  type ActionPickerValue,
} from '../../studio/pickers/action'

let anchor: HTMLElement
let onSelect: ReturnType<typeof vi.fn>
let onCancel: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {}
  }
  anchor = document.createElement('button')
  document.body.appendChild(anchor)
  anchor.getBoundingClientRect = () =>
    ({ top: 0, left: 0, bottom: 20, right: 100, width: 100, height: 20 }) as DOMRect

  onSelect = vi.fn()
  onCancel = vi.fn()
})

// =============================================================================
// Construction + render
// =============================================================================

describe('ActionPicker — construction', () => {
  it('createActionPicker returns an ActionPicker with type "action"', () => {
    const p = createActionPicker({}, { onSelect })
    expect(p).toBeInstanceOf(ActionPicker)
    expect(p.pickerType).toBe('action')
  })

  it('default initial value is { event: "onclick", action: "toggle" }', () => {
    const p = createActionPicker({}, { onSelect })
    expect(p.getActionValue()).toEqual({ event: 'onclick', action: 'toggle' })
  })

  it('honors a custom initialValue', () => {
    const initial: ActionPickerValue = { event: 'onhover', action: 'show', target: 'Modal' }
    const p = createActionPicker({ initialValue: initial }, { onSelect })
    expect(p.getActionValue()).toEqual(initial)
  })
})

describe('ActionPicker — render', () => {
  it('renders a title, event selector, action selector, and buttons', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    expect(document.querySelector('.action-picker-title')).not.toBeNull()
    expect(document.querySelector('select[data-field="event"]')).not.toBeNull()
    expect(document.querySelector('select[data-field="action"]')).not.toBeNull()
    expect(document.querySelectorAll('.action-picker-btn').length).toBe(2)
  })

  it('event selector contains all DSL events', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const select = document.querySelector('select[data-field="event"]') as HTMLSelectElement
    const optionValues = Array.from(select.options).map(o => o.value)
    expect(optionValues).toContain('onclick')
    expect(optionValues).toContain('onhover')
    expect(optionValues).toContain('onkeydown')
    expect(optionValues).toContain('onfocus')
  })

  it('action selector groups options into Interaction/Visibility/Overlays/Navigation/Other', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const optgroups = document.querySelectorAll('select[data-field="action"] optgroup')
    const labels = Array.from(optgroups).map(g => g.getAttribute('label'))
    expect(labels).toContain('Interaction')
    expect(labels).toContain('Visibility')
    expect(labels).toContain('Overlays')
    expect(labels).toContain('Navigation')
    expect(labels).toContain('Other')
  })

  it('action options annotate "(...)" for actions that require a target', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const showOption = Array.from(
      document.querySelectorAll('select[data-field="action"] option')
    ).find(o => (o as HTMLOptionElement).value === 'show') as HTMLOptionElement
    expect(showOption?.textContent).toContain('(...)')

    const toggleOption = Array.from(
      document.querySelectorAll('select[data-field="action"] option')
    ).find(o => (o as HTMLOptionElement).value === 'toggle') as HTMLOptionElement
    // No-target actions get "()"
    expect(toggleOption?.textContent).toContain('()')
    expect(toggleOption?.textContent).not.toContain('(...)')
  })
})

// =============================================================================
// Conditional sections (key selector + target selector)
// =============================================================================

describe('ActionPicker — key selector', () => {
  it('is HIDDEN by default (event "onclick" does not accept keys)', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    expect(document.querySelector('select[data-field="key"]')).toBeNull()
  })

  it('appears when initialValue uses a key-accepting event (onkeydown)', () => {
    const p = createActionPicker(
      { animate: false, initialValue: { event: 'onkeydown', action: 'toggle' } },
      { onSelect }
    )
    p.show(anchor)
    expect(document.querySelector('select[data-field="key"]')).not.toBeNull()
  })

  it('appears DYNAMICALLY when user changes event to onkeydown', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    // No key selector initially.
    expect(document.querySelector('select[data-field="key"]')).toBeNull()

    const eventSelect = document.querySelector('select[data-field="event"]') as HTMLSelectElement
    eventSelect.value = 'onkeydown'
    eventSelect.dispatchEvent(new Event('change'))

    // Now key selector should be visible after re-render.
    expect(document.querySelector('select[data-field="key"]')).not.toBeNull()
  })

  it('changing key updates the value', () => {
    const p = createActionPicker(
      { animate: false, initialValue: { event: 'onkeydown', action: 'toggle' } },
      { onSelect }
    )
    p.show(anchor)
    const keySelect = document.querySelector('select[data-field="key"]') as HTMLSelectElement
    keySelect.value = 'enter'
    keySelect.dispatchEvent(new Event('change'))
    expect(p.getActionValue().key).toBe('enter')
  })

  it('changing event from onkeydown → onclick CLEARS the key', () => {
    const p = createActionPicker(
      { animate: false, initialValue: { event: 'onkeydown', action: 'toggle', key: 'enter' } },
      { onSelect }
    )
    p.show(anchor)
    expect(p.getActionValue().key).toBe('enter')

    const eventSelect = document.querySelector('select[data-field="event"]') as HTMLSelectElement
    eventSelect.value = 'onclick'
    eventSelect.dispatchEvent(new Event('change'))
    expect(p.getActionValue().key).toBeUndefined()
  })
})

describe('ActionPicker — target selector', () => {
  it('is HIDDEN when action does not require a target', () => {
    const p = createActionPicker(
      { animate: false, availableElements: ['Modal', 'Sidebar'] },
      { onSelect }
    )
    p.show(anchor)
    // toggle (default) does not require a target
    expect(document.querySelector('select[data-field="target"]')).toBeNull()
  })

  it('is HIDDEN when action requires a target but no availableElements', () => {
    const p = createActionPicker(
      {
        animate: false,
        initialValue: { event: 'onclick', action: 'show' },
        availableElements: [],
      },
      { onSelect }
    )
    p.show(anchor)
    expect(document.querySelector('select[data-field="target"]')).toBeNull()
  })

  it('is VISIBLE when action requires a target AND availableElements > 0', () => {
    const p = createActionPicker(
      {
        animate: false,
        initialValue: { event: 'onclick', action: 'show' },
        availableElements: ['Modal'],
      },
      { onSelect }
    )
    p.show(anchor)
    expect(document.querySelector('select[data-field="target"]')).not.toBeNull()
  })

  it('lists all availableElements in the target selector', () => {
    const p = createActionPicker(
      {
        animate: false,
        initialValue: { event: 'onclick', action: 'show' },
        availableElements: ['Modal', 'Sidebar', 'Dropdown'],
      },
      { onSelect }
    )
    p.show(anchor)
    const select = document.querySelector('select[data-field="target"]') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    // Empty option + 3 elements
    expect(values).toContain('Modal')
    expect(values).toContain('Sidebar')
    expect(values).toContain('Dropdown')
  })

  it('selecting a target updates the value', () => {
    const p = createActionPicker(
      {
        animate: false,
        initialValue: { event: 'onclick', action: 'show' },
        availableElements: ['Modal'],
      },
      { onSelect }
    )
    p.show(anchor)
    const sel = document.querySelector('select[data-field="target"]') as HTMLSelectElement
    sel.value = 'Modal'
    sel.dispatchEvent(new Event('change'))
    expect(p.getActionValue().target).toBe('Modal')
  })

  it('changing action CLEARS the target (avoids stale target)', () => {
    const p = createActionPicker(
      {
        animate: false,
        initialValue: { event: 'onclick', action: 'show', target: 'Modal' },
        availableElements: ['Modal', 'Sidebar'],
      },
      { onSelect }
    )
    p.show(anchor)
    expect(p.getActionValue().target).toBe('Modal')
    const actionSelect = document.querySelector('select[data-field="action"]') as HTMLSelectElement
    actionSelect.value = 'toggle'
    actionSelect.dispatchEvent(new Event('change'))
    expect(p.getActionValue().target).toBeUndefined()
  })
})

// =============================================================================
// Buttons — Cancel + Add
// =============================================================================

describe('ActionPicker — buttons', () => {
  it('Add fires onSelect with the current value and closes the picker', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const addBtn = document.querySelector('.action-picker-btn.primary') as HTMLElement
    addBtn.click()
    expect(onSelect).toHaveBeenCalledWith({ event: 'onclick', action: 'toggle' })
    expect(p.getIsOpen()).toBe(false)
  })

  it('Cancel fires onCancel and closes the picker (does NOT fire onSelect)', () => {
    const p = createActionPicker({ animate: false }, { onSelect, onCancel })
    p.show(anchor)
    const cancelBtn = document.querySelector('.action-picker-btn.cancel') as HTMLElement
    cancelBtn.click()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSelect).not.toHaveBeenCalled()
    expect(p.getIsOpen()).toBe(false)
  })
})

// =============================================================================
// getValue / setValue
// =============================================================================

describe('ActionPicker — getValue / setValue', () => {
  it('getValue returns JSON-serialized current value', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    const value = JSON.parse(p.getValue())
    expect(value).toEqual({ event: 'onclick', action: 'toggle' })
  })

  it('setValue with valid JSON updates the value + re-renders', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.setValue(JSON.stringify({ event: 'onhover', action: 'show', target: 'Modal' }))
    expect(p.getActionValue()).toEqual({ event: 'onhover', action: 'show', target: 'Modal' })
  })

  it('setValue with invalid JSON falls back to {event: "onclick", action: <input>}', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.setValue('not-json-just-an-action-name')
    expect(p.getActionValue()).toEqual({ event: 'onclick', action: 'not-json-just-an-action-name' })
  })

  it('setActionValue is a typed alternative to setValue', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.setActionValue({ event: 'onkeydown', action: 'toggle', key: 'space' })
    expect(p.getActionValue()).toEqual({
      event: 'onkeydown',
      action: 'toggle',
      key: 'space',
    })
  })
})

describe('ActionPicker — setAvailableElements', () => {
  it('updates the target selector live', () => {
    const p = createActionPicker(
      {
        animate: false,
        initialValue: { event: 'onclick', action: 'show' },
        availableElements: [],
      },
      { onSelect }
    )
    p.show(anchor)
    expect(document.querySelector('select[data-field="target"]')).toBeNull()

    p.setAvailableElements(['Modal'])

    expect(document.querySelector('select[data-field="target"]')).not.toBeNull()
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: changing event from key-event → non-key-event CLEARS key (catches drop of key=undefined)', () => {
    const p = createActionPicker(
      { animate: false, initialValue: { event: 'onkeydown', action: 'toggle', key: 'space' } },
      { onSelect }
    )
    p.show(anchor)
    const eventSelect = document.querySelector('select[data-field="event"]') as HTMLSelectElement
    eventSelect.value = 'onclick'
    eventSelect.dispatchEvent(new Event('change'))
    expect(p.getActionValue().key).toBeUndefined()
  })

  it('M2: changing action CLEARS target (catches drop of target=undefined)', () => {
    const p = createActionPicker(
      {
        animate: false,
        initialValue: { event: 'onclick', action: 'show', target: 'Modal' },
        availableElements: ['Modal'],
      },
      { onSelect }
    )
    p.show(anchor)
    const actionSelect = document.querySelector('select[data-field="action"]') as HTMLSelectElement
    actionSelect.value = 'toggle'
    actionSelect.dispatchEvent(new Event('change'))
    expect(p.getActionValue().target).toBeUndefined()
  })

  it('M3: setValue malformed-JSON fallback uses ORIGINAL string as action (catches silent-discard)', () => {
    const p = createActionPicker({ animate: false }, { onSelect })
    p.show(anchor)
    p.setValue('weird-input')
    expect(p.getActionValue().action).toBe('weird-input')
  })
})
