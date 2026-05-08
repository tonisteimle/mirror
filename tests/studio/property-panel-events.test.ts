// @vitest-environment jsdom
/**
 * Tests for the property-panel "Events" surface (add/delete/change):
 *   - studio/panels/property/sections/events-section.ts (242 LOC, 0%)
 *   - studio/panels/property/event-listeners.ts        (174 LOC, 0%)
 *
 * The two files form one feature: the section renders the UI + dispatches
 * onPropertyChange callbacks; the listeners listen for `property-panel:*`
 * CustomEvents on `document` and forward to the active CodeModifier.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  EventsSection,
  createEventsSection,
} from '../../studio/panels/property/sections/events-section'
import type { SectionDependencies, SectionData } from '../../studio/panels/property/base/section'

// =============================================================================
// EventsSection — render shape + handlers
// =============================================================================

let deps: SectionDependencies
let onPropertyChange: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  onPropertyChange = vi.fn()
  deps = {
    escapeHtml: (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    getDisplayLabel: (n: string) => n,
    onPropertyChange,
    onToggleProperty: vi.fn(),
  }
})

const baseElement = {
  nodeId: 'n1',
  componentName: 'Button',
  isDefinition: false,
}

function renderSection(events: SectionData['events'] = []): { html: string; root: HTMLElement } {
  const section = createEventsSection(deps)
  const html = section.render({
    currentElement: baseElement,
    events,
  } as SectionData)
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return { html, root }
}

describe('EventsSection — construction', () => {
  it('createEventsSection returns an EventsSection', () => {
    expect(createEventsSection(deps)).toBeInstanceOf(EventsSection)
  })

  it('returns empty string when no currentElement is set', () => {
    const section = createEventsSection(deps)
    const html = section.render({} as SectionData)
    expect(html).toBe('')
  })
})

describe('EventsSection — render', () => {
  it('renders only the "Add event" row when events is empty', () => {
    const { root } = renderSection([])
    expect(root.querySelectorAll('.pp-event-row')).toHaveLength(0)
    expect(root.querySelector('.pp-add-event-select')).not.toBeNull()
  })

  it('renders one row per existing event', () => {
    const events = [
      { name: 'onclick', actions: [{ name: 'toggle', isFunctionCall: true }] },
      { name: 'onhover', actions: [{ name: 'show', isFunctionCall: true }] },
    ]
    const { root } = renderSection(events)
    expect(root.querySelectorAll('.pp-event-row')).toHaveLength(2)
  })

  it('shows label-from-registry when event is known', () => {
    const events = [{ name: 'onclick', actions: [] }]
    const { root } = renderSection(events)
    expect(root.querySelector('.pp-event-name')?.textContent).toBe('Click')
  })

  it('falls back to event-name without "on" prefix for unknown events', () => {
    const events = [{ name: 'onmysterious', actions: [] }]
    const { root } = renderSection(events)
    expect(root.querySelector('.pp-event-name')?.textContent).toBe('mysterious')
  })

  it('hides the Add row when ALL schema events are already present', async () => {
    // Pull the live schema list — adding events to the schema must not break this test.
    const { getAllEvents } = await import('../../compiler/schema/dsl')
    const events = getAllEvents().map(name => ({ name, actions: [] }))
    const { root } = renderSection(events)
    expect(root.querySelector('.pp-add-event-select')).toBeNull()
  })

  it('Add dropdown surfaces schema-driven events (not just the legacy 8)', () => {
    const { root } = renderSection([])
    const select = root.querySelector('.pp-add-event-select') as HTMLSelectElement
    const optionValues = Array.from(select.querySelectorAll('option')).map(o => o.value)
    // Beyond the legacy 8: keyboard + viewport + outside events from schema.
    expect(optionValues).toContain('onkeydown')
    expect(optionValues).toContain('onviewenter')
    expect(optionValues).toContain('onclick-outside')
  })

  it('placeholder for keyboard events HINTS at key syntax', () => {
    const events = [{ name: 'onkeydown', actions: [] }]
    const { root } = renderSection(events)
    const input = root.querySelector('.pp-event-action') as HTMLInputElement
    expect(input.placeholder).toContain('onkeydown')
  })

  it('Add dropdown excludes events that are ALREADY present', () => {
    const events = [{ name: 'onclick', actions: [] }]
    const { root } = renderSection(events)
    const select = root.querySelector('.pp-add-event-select') as HTMLSelectElement
    const optionValues = Array.from(select.querySelectorAll('option')).map(o => o.value)
    // Empty placeholder + 7 remaining (8 total minus onclick)
    expect(optionValues).toContain('')
    expect(optionValues).not.toContain('onclick')
    expect(optionValues).toContain('onhover')
  })

  it('renders datalist with COMMON_ACTIONS hints when there are events to add', () => {
    const { root } = renderSection([])
    expect(root.querySelector('#pp-action-hints')).not.toBeNull()
  })

  it('escapes the event-action input value via deps.escapeHtml', () => {
    const events = [
      { name: 'onclick', actions: [{ name: 'toggle', target: '<x>"', isFunctionCall: true }] },
    ]
    const { root } = renderSection(events)
    const input = root.querySelector('.pp-event-action') as HTMLInputElement
    // Browser parses HTML, so we read the deserialized value
    expect(input.value).toContain('toggle(<x>")')
  })
})

describe('EventsSection — formatActions (via render)', () => {
  it('function call with no args → name()', () => {
    const events = [{ name: 'onclick', actions: [{ name: 'toggle', isFunctionCall: true }] }]
    const { root } = renderSection(events)
    expect((root.querySelector('.pp-event-action') as HTMLInputElement).value).toBe('toggle()')
  })

  it('function call with target → name(target)', () => {
    const events = [
      { name: 'onclick', actions: [{ name: 'show', target: 'Menu', isFunctionCall: true }] },
    ]
    const { root } = renderSection(events)
    expect((root.querySelector('.pp-event-action') as HTMLInputElement).value).toBe('show(Menu)')
  })

  it('function call with target AND args → name(target, args)', () => {
    const events = [
      {
        name: 'onclick',
        actions: [{ name: 'set', target: 'count', arguments: ['10'], isFunctionCall: true }],
      },
    ]
    const { root } = renderSection(events)
    expect((root.querySelector('.pp-event-action') as HTMLInputElement).value).toBe(
      'set(count, 10)'
    )
  })

  it('function call with args only → name(args)', () => {
    const events = [
      {
        name: 'onclick',
        actions: [{ name: 'log', arguments: ['"hi"'], isFunctionCall: true }],
      },
    ]
    const { root } = renderSection(events)
    expect((root.querySelector('.pp-event-action') as HTMLInputElement).value).toBe('log("hi")')
  })

  it('legacy syntax (no parens) with target → name target', () => {
    const events = [
      { name: 'onclick', actions: [{ name: 'show', target: 'Menu', isFunctionCall: false }] },
    ]
    const { root } = renderSection(events)
    expect((root.querySelector('.pp-event-action') as HTMLInputElement).value).toBe('show Menu')
  })

  it('legacy syntax bare → just the name', () => {
    const events = [{ name: 'onclick', actions: [{ name: 'submit', isFunctionCall: false }] }]
    const { root } = renderSection(events)
    expect((root.querySelector('.pp-event-action') as HTMLInputElement).value).toBe('submit')
  })

  it('multiple actions are joined with ", "', () => {
    const events = [
      {
        name: 'onclick',
        actions: [
          { name: 'toggle', isFunctionCall: true },
          { name: 'show', target: 'Menu', isFunctionCall: true },
        ],
      },
    ]
    const { root } = renderSection(events)
    expect((root.querySelector('.pp-event-action') as HTMLInputElement).value).toBe(
      'toggle(), show(Menu)'
    )
  })
})

describe('EventsSection — handlers', () => {
  function getHandlers() {
    const section = createEventsSection(deps)
    return section.getHandlers()
  }

  it('input.pp-event-action change emits __EVENT_ACTION__', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    input.dataset.eventName = 'onclick'
    input.value = 'toggle()'
    handlers['input.pp-event-action'].change(new Event('change'), input)
    expect(onPropertyChange).toHaveBeenCalledWith(
      '__EVENT_ACTION__',
      JSON.stringify({ event: 'onclick', actions: 'toggle()' }),
      'input'
    )
  })

  it('input.pp-event-action change is a NO-OP when data-event-name is missing', () => {
    const handlers = getHandlers()
    const input = document.createElement('input')
    handlers['input.pp-event-action'].change(new Event('change'), input)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('select.pp-add-event-select change emits __ADD_EVENT__ with picked event name', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const option = document.createElement('option')
    option.value = 'onclick'
    select.appendChild(option)
    select.value = 'onclick'
    handlers['select.pp-add-event-select'].change(new Event('change'), select)
    expect(onPropertyChange).toHaveBeenCalledWith('__ADD_EVENT__', 'onclick', 'select')
  })

  it('select.pp-add-event-select RESETS its value to "" after dispatch', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const opt1 = document.createElement('option')
    opt1.value = ''
    const opt2 = document.createElement('option')
    opt2.value = 'onclick'
    select.append(opt1, opt2)
    select.value = 'onclick'
    handlers['select.pp-add-event-select'].change(new Event('change'), select)
    expect(select.value).toBe('')
  })

  it('select.pp-add-event-select with empty value is a NO-OP', () => {
    const handlers = getHandlers()
    const select = document.createElement('select')
    const opt = document.createElement('option')
    opt.value = ''
    select.appendChild(opt)
    select.value = ''
    handlers['select.pp-add-event-select'].change(new Event('change'), select)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('button.pp-event-delete click emits __DELETE_EVENT__ with event name', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    btn.dataset.deleteEvent = 'onclick'
    handlers['button.pp-event-delete'].click(new Event('click'), btn)
    expect(onPropertyChange).toHaveBeenCalledWith('__DELETE_EVENT__', 'onclick', 'button')
  })

  it('button.pp-event-delete click is a NO-OP when data-delete-event is missing', () => {
    const handlers = getHandlers()
    const btn = document.createElement('button')
    handlers['button.pp-event-delete'].click(new Event('click'), btn)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })
})

// =============================================================================
// event-listeners.ts — setupPropertyPanelEventListeners
// =============================================================================

// Mock the IconPicker singleton and CodeModifier surface used by the listeners.
const mockIconPicker = {
  loadLucideIcons: vi.fn(),
  showAt: vi.fn(),
  hide: vi.fn(),
}
const mockSetCallback = vi.fn()

vi.mock('../../studio/pickers/icon', () => ({
  getGlobalIconPicker: () => mockIconPicker,
  setGlobalIconPickerCallback: (cb: (name: string) => void) => mockSetCallback(cb),
}))

import {
  setupPropertyPanelEventListeners,
  setupPropertyPanelIconPicker,
  __resetPropertyPanelListenersForTests,
} from '../../studio/panels/property/event-listeners'
import type { CodeModifier } from '../../studio/code-modifier/code-modifier'

function makeCodeModifier(overrides: Partial<CodeModifier> = {}): CodeModifier {
  return {
    addEvent: vi.fn(() => ({ success: true, code: 'new code' })),
    removeEvent: vi.fn(() => ({ success: true, code: 'new code' })),
    updateEvent: vi.fn(() => ({ success: true, code: 'new code' })),
    setEventActions: vi.fn(() => ({ success: true, code: 'new code' })),
    ...overrides,
  } as unknown as CodeModifier
}

// listeners are registered ONCE (idempotent); we reset them between
// describes so each block can wire fresh deps.

describe('setupPropertyPanelEventListeners — add-event', () => {
  let onCodeChange: ReturnType<typeof vi.fn>
  let codeModifier: CodeModifier

  beforeEach(() => {
    __resetPropertyPanelListenersForTests()
    onCodeChange = vi.fn()
    codeModifier = makeCodeModifier()
    setupPropertyPanelEventListeners({
      getCodeModifier: () => codeModifier,
      onCodeChange,
    })
  })

  it('calls codeModifier.addEvent + onCodeChange on success', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', {
        detail: { nodeId: 'n1', eventName: 'onclick' },
      })
    )
    expect(codeModifier.addEvent).toHaveBeenCalledWith('n1', 'onclick', 'toggle')
    expect(onCodeChange).toHaveBeenCalledTimes(1)
  })

  it('NO codeModifier call when nodeId is missing', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', {
        detail: { eventName: 'onclick' },
      })
    )
    expect(codeModifier.addEvent).not.toHaveBeenCalled()
    expect(onCodeChange).not.toHaveBeenCalled()
  })

  it('NO codeModifier call when eventName is missing', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', { detail: { nodeId: 'n1' } })
    )
    expect(codeModifier.addEvent).not.toHaveBeenCalled()
  })

  it('NO codeModifier call when getCodeModifier returns null', () => {
    __resetPropertyPanelListenersForTests()
    const onCodeChange2 = vi.fn()
    setupPropertyPanelEventListeners({
      getCodeModifier: () => null,
      onCodeChange: onCodeChange2,
    })
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', {
        detail: { nodeId: 'fresh', eventName: 'onclick' },
      })
    )
    expect(onCodeChange2).not.toHaveBeenCalled()
  })

  it('does NOT call onCodeChange when codeModifier.addEvent returns failure (and notifies)', () => {
    __resetPropertyPanelListenersForTests()
    const failing = makeCodeModifier({
      addEvent: vi.fn(() => ({ success: false, error: 'no node', code: '' })) as unknown as never,
    })
    const cb = vi.fn()
    const notify = vi.fn()
    setupPropertyPanelEventListeners({
      getCodeModifier: () => failing,
      onCodeChange: cb,
      notify,
    })
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', {
        detail: { nodeId: 'fresh-fail', eventName: 'onclick' },
      })
    )
    expect(cb).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('error', expect.stringContaining('no node'))
  })

  it('idempotent: calling setupPropertyPanelEventListeners twice does NOT stack listeners', () => {
    __resetPropertyPanelListenersForTests()
    const cm = makeCodeModifier()
    const cb = vi.fn()
    setupPropertyPanelEventListeners({ getCodeModifier: () => cm, onCodeChange: cb })
    setupPropertyPanelEventListeners({ getCodeModifier: () => cm, onCodeChange: cb })
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', {
        detail: { nodeId: 'idem', eventName: 'onclick' },
      })
    )
    expect(cm.addEvent).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('detail can be undefined (uses {} fallback) without throwing', () => {
    expect(() => document.dispatchEvent(new CustomEvent('property-panel:add-event'))).not.toThrow()
  })
})

describe('setupPropertyPanelEventListeners — delete-event', () => {
  let onCodeChange: ReturnType<typeof vi.fn>
  let codeModifier: CodeModifier

  beforeEach(() => {
    __resetPropertyPanelListenersForTests()
    onCodeChange = vi.fn()
    codeModifier = makeCodeModifier()
    setupPropertyPanelEventListeners({
      getCodeModifier: () => codeModifier,
      onCodeChange,
    })
  })

  it('calls codeModifier.removeEvent on success', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:delete-event', {
        detail: { nodeId: 'n1', eventName: 'onclick' },
      })
    )
    expect(codeModifier.removeEvent).toHaveBeenCalledWith('n1', 'onclick')
    expect(onCodeChange).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onCodeChange on remove failure (and notifies)', () => {
    __resetPropertyPanelListenersForTests()
    const failing = makeCodeModifier({
      removeEvent: vi.fn(() => ({ success: false, error: 'x', code: '' })) as unknown as never,
    })
    const cb = vi.fn()
    const notify = vi.fn()
    setupPropertyPanelEventListeners({
      getCodeModifier: () => failing,
      onCodeChange: cb,
      notify,
    })
    document.dispatchEvent(
      new CustomEvent('property-panel:delete-event', {
        detail: { nodeId: 'del-fail', eventName: 'onclick' },
      })
    )
    expect(cb).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('error', expect.stringContaining('x'))
  })
})

describe('setupPropertyPanelEventListeners — event-change (multi-action)', () => {
  let onCodeChange: ReturnType<typeof vi.fn>
  let codeModifier: CodeModifier

  beforeEach(() => {
    __resetPropertyPanelListenersForTests()
    onCodeChange = vi.fn()
    codeModifier = makeCodeModifier()
    setupPropertyPanelEventListeners({
      getCodeModifier: () => codeModifier,
      onCodeChange,
    })
  })

  it('forwards a single-action chain verbatim', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: { nodeId: 'n1', eventName: 'onclick', actionsString: 'show(Menu)' },
      })
    )
    expect(codeModifier.setEventActions).toHaveBeenCalledWith('n1', 'onclick', 'show(Menu)')
  })

  it('forwards a MULTI-action chain verbatim', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: {
          nodeId: 'n1',
          eventName: 'onclick',
          actionsString: 'toggle(), show(Menu)',
        },
      })
    )
    expect(codeModifier.setEventActions).toHaveBeenCalledWith(
      'n1',
      'onclick',
      'toggle(), show(Menu)'
    )
  })

  it('appends "()" to bare names so the chain is well-formed', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: { nodeId: 'n1', eventName: 'onclick', actionsString: 'toggle, show(Menu)' },
      })
    )
    expect(codeModifier.setEventActions).toHaveBeenCalledWith(
      'n1',
      'onclick',
      'toggle(), show(Menu)'
    )
  })

  it('preserves commas INSIDE parens (no top-level split)', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: { nodeId: 'n1', eventName: 'onclick', actionsString: 'set(count, 10)' },
      })
    )
    expect(codeModifier.setEventActions).toHaveBeenCalledWith('n1', 'onclick', 'set(count, 10)')
  })

  it('defaults to "toggle()" when actionsString is empty', () => {
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: { nodeId: 'n1', eventName: 'onclick', actionsString: '' },
      })
    )
    expect(codeModifier.setEventActions).toHaveBeenCalledWith('n1', 'onclick', 'toggle()')
  })

  it('does NOT call onCodeChange when setEventActions fails (and notifies)', () => {
    __resetPropertyPanelListenersForTests()
    const failing = makeCodeModifier({
      setEventActions: vi.fn(() => ({ success: false, error: 'x', code: '' })) as unknown as never,
    })
    const cb = vi.fn()
    const notify = vi.fn()
    setupPropertyPanelEventListeners({
      getCodeModifier: () => failing,
      onCodeChange: cb,
      notify,
    })
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: { nodeId: 'change-fail', eventName: 'onclick', actionsString: 'toggle()' },
      })
    )
    expect(cb).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('error', expect.stringContaining('x'))
  })

  it('is a NO-OP when nodeId is missing', () => {
    __resetPropertyPanelListenersForTests()
    const cm = makeCodeModifier()
    const cb = vi.fn()
    setupPropertyPanelEventListeners({ getCodeModifier: () => cm, onCodeChange: cb })
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: { eventName: 'onclick', actionsString: 'toggle()' },
      })
    )
    expect(cm.setEventActions).not.toHaveBeenCalled()
    expect(cb).not.toHaveBeenCalled()
  })
})

// =============================================================================
// setupPropertyPanelIconPicker
// =============================================================================

describe('setupPropertyPanelIconPicker', () => {
  beforeEach(() => {
    __resetPropertyPanelListenersForTests()
    mockIconPicker.loadLucideIcons.mockClear()
    mockIconPicker.showAt.mockClear()
    mockIconPicker.hide.mockClear()
    mockSetCallback.mockClear()
    setupPropertyPanelIconPicker()
  })

  it('warns and exits when no onSelect is provided', () => {
    document.dispatchEvent(new CustomEvent('property-panel:open-icon-picker', { detail: {} }))
    expect(mockIconPicker.showAt).not.toHaveBeenCalled()
  })

  it('positions picker beside trigger button when one is in target chain', () => {
    const button = document.createElement('button')
    button.setAttribute('data-open-icon-picker', '')
    button.getBoundingClientRect = () =>
      ({ left: 100, top: 50, right: 132, bottom: 70, width: 32, height: 20 }) as DOMRect
    document.body.appendChild(button)

    button.dispatchEvent(
      new CustomEvent('property-panel:open-icon-picker', {
        detail: { onSelect: vi.fn() },
        bubbles: true,
      })
    )

    expect(mockIconPicker.loadLucideIcons).toHaveBeenCalled()
    expect(mockIconPicker.showAt).toHaveBeenCalledWith(100, 74) // bottom + 4
  })

  it('falls back to property-panel position when no trigger button is present', () => {
    const panel = document.createElement('div')
    panel.id = 'property-panel'
    panel.getBoundingClientRect = () =>
      ({ left: 200, top: 0, right: 400, bottom: 600, width: 200, height: 600 }) as DOMRect
    document.body.appendChild(panel)

    document.dispatchEvent(
      new CustomEvent('property-panel:open-icon-picker', {
        detail: { onSelect: vi.fn() },
      })
    )

    expect(mockIconPicker.showAt).toHaveBeenCalledWith(220, 100) // panel.left+20, panel.top+100
  })

  it('callback wired by the listener forwards icon name + hides picker', () => {
    const onSelect = vi.fn()
    document.dispatchEvent(
      new CustomEvent('property-panel:open-icon-picker', { detail: { onSelect } })
    )
    // The listener registered a callback via setGlobalIconPickerCallback —
    // grab it from the mock and invoke it.
    const wrapped = mockSetCallback.mock.calls[mockSetCallback.mock.calls.length - 1][0]
    wrapped('check')
    expect(onSelect).toHaveBeenCalledWith('check')
    expect(mockIconPicker.hide).toHaveBeenCalled()
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1 (events-section): select handler GUARDS against empty value', () => {
    // If the `if (eventName)` guard is dropped, an empty placeholder click
    // would still fire onPropertyChange('__ADD_EVENT__', '', 'select').
    const handlers = createEventsSection(deps).getHandlers()
    const select = document.createElement('select')
    const opt = document.createElement('option')
    opt.value = ''
    select.appendChild(opt)
    select.value = ''
    handlers['select.pp-add-event-select'].change(new Event('change'), select)
    expect(onPropertyChange).not.toHaveBeenCalled()
  })

  it('M2 (event-listeners): missing nodeId/eventName/codeModifier all SKIP the modifier call', () => {
    // If `||` becomes `&&`, only ALL-three-missing would skip — the cases below
    // (one-missing) would all still fire and crash on undefined.
    __resetPropertyPanelListenersForTests()
    const cm = makeCodeModifier()
    setupPropertyPanelEventListeners({ getCodeModifier: () => cm, onCodeChange: vi.fn() })
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', { detail: { nodeId: 'm2' /* no event */ } })
    )
    document.dispatchEvent(
      new CustomEvent('property-panel:add-event', {
        detail: { eventName: 'onclick' /* no node */ },
      })
    )
    // Before mutation: addEvent was never called. After mutation: would fire on both.
    expect(cm.addEvent).not.toHaveBeenCalled()
  })

  it('M3 (event-listeners): top-level comma split PRESERVES commas inside parens', () => {
    // If the depth check is dropped, `set(count, 10)` would split into
    // `['set(count', '10)']` and break.
    __resetPropertyPanelListenersForTests()
    const cm = makeCodeModifier()
    setupPropertyPanelEventListeners({ getCodeModifier: () => cm, onCodeChange: vi.fn() })
    document.dispatchEvent(
      new CustomEvent('property-panel:event-change', {
        detail: { nodeId: 'm3', eventName: 'onclick', actionsString: 'set(count, 10)' },
      })
    )
    expect(cm.setEventActions).toHaveBeenCalledWith('m3', 'onclick', 'set(count, 10)')
  })

  it('M4 (events-section): usedEvents Set DEDUPES the Add dropdown', () => {
    // If filter `!usedEvents.has(e.name)` is inverted, ONLY used events
    // would appear (or all would appear regardless).
    const events = [{ name: 'onclick', actions: [] }]
    const { root } = renderSection(events)
    const optionValues = Array.from(
      (root.querySelector('.pp-add-event-select') as HTMLSelectElement).querySelectorAll('option')
    ).map(o => o.value)
    expect(optionValues).not.toContain('onclick')
  })
})
