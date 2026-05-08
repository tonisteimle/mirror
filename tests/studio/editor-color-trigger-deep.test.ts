// @vitest-environment jsdom
/**
 * Tests for studio/editor/triggers/color-trigger.ts — coverage gaps
 *
 * The existing test file covers config shape, regex patterns, navigation,
 * and trigger registration. It does NOT cover the GlobalColorPickerWrapper
 * (showAt, hide, isVisible, getElement, navigate/filter stubs), the
 * onSelect → insertColor pipeline, the shouldActivate / shouldClose
 * callbacks, or isHashTriggerActive.
 *
 * These tests use minimal EditorView / TriggerContext mocks to drive
 * those callbacks directly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createColorHashTriggerConfig,
  createColorDoubleClickTriggerConfig,
  isHashTriggerActive,
  setSelectedSwatchIndex,
  getSelectedSwatchIndex,
} from '../../studio/editor/triggers/color-trigger'
import {
  getTriggerManager,
  createTriggerManager,
  setTriggerManager,
} from '../../studio/editor/trigger-manager'

beforeEach(() => {
  setTriggerManager(createTriggerManager())
})

afterEach(() => {
  getTriggerManager().dispose()
  delete (window as any).showColorPicker
  delete (window as any).hideColorPicker
})

// =============================================================================
// Test scaffolding
// =============================================================================

interface DispatchedTransaction {
  changes?: { from: number; to: number; insert: string }
  selection?: { anchor: number }
}

function makeMockEditorView(headPos = 0) {
  const dispatched: DispatchedTransaction[] = []
  return {
    view: {
      dispatch: vi.fn((tr: DispatchedTransaction) => dispatched.push(tr)),
      focus: vi.fn(),
      coordsAtPos: vi.fn(() => ({ left: 100, top: 50, bottom: 60, right: 110 })),
      state: { selection: { main: { head: headPos } } },
    },
    dispatched,
  }
}

function makeContext(
  opts: {
    textBefore?: string
    startPos?: number
    replaceRange?: { from: number; to: number }
    existingValue?: string
    property?: string
  } = {}
) {
  return {
    line: { text: '', from: 0, to: 0, number: 1 },
    cursorPos: opts.startPos ?? 0,
    startPos: opts.startPos ?? 0,
    textBefore: opts.textBefore ?? '',
    replaceRange: opts.replaceRange,
    existingValue: opts.existingValue,
    property: opts.property,
  }
}

// =============================================================================
// Hash trigger — onSelect calls dispatch + focus, replaces from #
// =============================================================================

describe('hash trigger onSelect — insertColor with hash trigger', () => {
  it('replaces from startPos to head when no replaceRange is given', () => {
    const cfg = createColorHashTriggerConfig()
    const { view, dispatched } = makeMockEditorView(10)
    const ctx = makeContext({ startPos: 5 })

    cfg.onSelect!('#FF0000', ctx as never, view as never)

    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].changes).toEqual({ from: 5, to: 10, insert: '#FF0000' })
    expect(dispatched[0].selection?.anchor).toBe(5 + 7)
    expect(view.focus).toHaveBeenCalledOnce()
  })

  it('honors an explicit replaceRange (e.g. extending an existing token)', () => {
    const cfg = createColorHashTriggerConfig()
    const { view, dispatched } = makeMockEditorView()
    const ctx = makeContext({ startPos: 0, replaceRange: { from: 4, to: 11 } })

    cfg.onSelect!('#0F0', ctx as never, view as never)

    expect(dispatched[0].changes).toEqual({ from: 4, to: 11, insert: '#0F0' })
  })
})

describe('hash trigger shouldActivate', () => {
  it('returns true when textBefore matches the color-context pattern', () => {
    const cfg = createColorHashTriggerConfig()
    const { view } = makeMockEditorView()
    const update = { view } as never
    expect(cfg.shouldActivate!(update, '#', makeContext({ textBefore: 'bg ' }) as never)).toBe(true)
  })

  it('returns false when textBefore does NOT match', () => {
    const cfg = createColorHashTriggerConfig()
    const { view } = makeMockEditorView()
    expect(
      cfg.shouldActivate!({ view } as never, '#', makeContext({ textBefore: 'Frame ' }) as never)
    ).toBe(false)
  })

  it('matches token definitions (e.g. "primary.bg: ")', () => {
    const cfg = createColorHashTriggerConfig()
    const { view } = makeMockEditorView()
    expect(
      cfg.shouldActivate!(
        { view } as never,
        '#',
        makeContext({ textBefore: 'primary.bg: ' }) as never
      )
    ).toBe(true)
  })
})

describe('hash trigger shouldClose', () => {
  it('closes on newline', () => {
    const cfg = createColorHashTriggerConfig()
    expect(
      cfg.shouldClose!({} as never, '\n', makeContext({ textBefore: 'bg #FF' }) as never)
    ).toBe(true)
  })

  it('closes on comma', () => {
    const cfg = createColorHashTriggerConfig()
    expect(cfg.shouldClose!({} as never, ',', makeContext({ textBefore: 'bg #FF' }) as never)).toBe(
      true
    )
  })

  it('closes on space AFTER complete 6-digit hex', () => {
    const cfg = createColorHashTriggerConfig()
    expect(
      cfg.shouldClose!({} as never, ' ', makeContext({ textBefore: 'bg #FF0000' }) as never)
    ).toBe(true)
  })

  it('does NOT close on space when hex is too short (<6 digits)', () => {
    const cfg = createColorHashTriggerConfig()
    expect(cfg.shouldClose!({} as never, ' ', makeContext({ textBefore: 'bg #FF' }) as never)).toBe(
      false
    )
  })

  it('does NOT close on regular character input', () => {
    const cfg = createColorHashTriggerConfig()
    expect(cfg.shouldClose!({} as never, 'F', makeContext({ textBefore: 'bg #FF' }) as never)).toBe(
      false
    )
  })
})

// =============================================================================
// Double-click trigger
// =============================================================================

describe('double-click trigger onSelect — insertColor without hash trigger', () => {
  it('inserts at startPos when no replaceRange is given (insert at cursor)', () => {
    const cfg = createColorDoubleClickTriggerConfig()
    const { view, dispatched } = makeMockEditorView()
    const ctx = makeContext({ startPos: 14 })

    cfg.onSelect!('#0000FF', ctx as never, view as never)

    expect(dispatched[0].changes).toEqual({ from: 14, to: 14, insert: '#0000FF' })
  })

  it('replaces the existing hex when replaceRange is given', () => {
    const cfg = createColorDoubleClickTriggerConfig()
    const { view, dispatched } = makeMockEditorView()
    const ctx = makeContext({ startPos: 0, replaceRange: { from: 4, to: 11 } })

    cfg.onSelect!('#ABCDEF', ctx as never, view as never)

    expect(dispatched[0].changes).toEqual({ from: 4, to: 11, insert: '#ABCDEF' })
  })
})

// =============================================================================
// Picker factory — sets isHashTriggerActive flag
// =============================================================================

describe('picker factory toggles isHashTriggerActive', () => {
  it('hash-trigger picker sets isHashTriggerActive=true', () => {
    const cfg = createColorHashTriggerConfig()
    cfg.picker()
    expect(isHashTriggerActive()).toBe(true)
  })

  it('hash-trigger picker resets selectedIndex to 45 (default blue)', () => {
    const cfg = createColorHashTriggerConfig()
    setSelectedSwatchIndex(7)
    cfg.picker()
    expect(getSelectedSwatchIndex()).toBe(45)
  })

  it('double-click picker sets isHashTriggerActive=false', () => {
    createColorHashTriggerConfig().picker() // first → true
    expect(isHashTriggerActive()).toBe(true)
    createColorDoubleClickTriggerConfig().picker() // then → false
    expect(isHashTriggerActive()).toBe(false)
  })
})

// =============================================================================
// GlobalColorPickerWrapper
// =============================================================================

describe('GlobalColorPickerWrapper', () => {
  it('showAt forwards to window.showColorPicker with the right args', () => {
    const cfg = createColorHashTriggerConfig()
    const wrapper = cfg.picker() // creates GlobalColorPickerWrapper(true)

    // Seed the trigger manager state with a context.
    const manager = getTriggerManager()
    const { view } = makeMockEditorView(10)
    const ctx = makeContext({
      startPos: 4,
      property: 'bg',
      replaceRange: { from: 4, to: 11 },
    })
    // Fake the manager state — call shouldActivate to seed currentContext/View
    cfg.shouldActivate!({ view } as never, '#', ctx as never)
    ;(manager as unknown as { state: { context: typeof ctx } }).state = { context: ctx }

    const showColorPicker = vi.fn()
    ;(window as any).showColorPicker = showColorPicker

    wrapper.showAt(123, 456)

    expect(showColorPicker).toHaveBeenCalledOnce()
    const args = showColorPicker.mock.calls[0]
    expect(args[0]).toBe(123) // x
    expect(args[1]).toBe(456) // y
    expect(args[2]).toBe(4) // insertPos = startPos
    expect(args[3]).toEqual({ from: 4, to: 11 }) // replaceRange
    expect(args[5]).toBe(true) // isHashTrigger
    expect(args[6]).toBe(4) // hashStartPos
    expect(args[7]).toBe('bg') // property
    expect(args[8]).toBeNull() // callback (null)

    // After showAt, isVisible must be true.
    expect(wrapper.isVisible()).toBe(true)
  })

  it('showAt warns and is a no-op when window.showColorPicker is missing', () => {
    const cfg = createColorHashTriggerConfig()
    const wrapper = cfg.picker()
    // colorState.isOpen is module-level; ensure it starts false.
    wrapper.hide()

    const { view } = makeMockEditorView()
    const ctx = makeContext({ startPos: 0, property: 'col' })
    cfg.shouldActivate!({ view } as never, '#', ctx as never)
    ;(getTriggerManager() as unknown as { state: { context: typeof ctx } }).state = {
      context: ctx,
    }

    // No window.showColorPicker stub
    expect(() => wrapper.showAt(0, 0)).not.toThrow()
    // isVisible stays false because the global picker was never opened
    expect(wrapper.isVisible()).toBe(false)
  })

  it('showAt aborts gracefully when neither manager-state nor colorState has context', () => {
    const cfg = createColorDoubleClickTriggerConfig()
    const wrapper = cfg.picker()
    expect(() => wrapper.showAt(0, 0)).not.toThrow()
  })

  it('hide forwards to window.hideColorPicker and clears isOpen', () => {
    const cfg = createColorHashTriggerConfig()
    const wrapper = cfg.picker()

    const { view } = makeMockEditorView()
    const ctx = makeContext({ startPos: 0 })
    cfg.shouldActivate!({ view } as never, '#', ctx as never)
    ;(getTriggerManager() as unknown as { state: { context: typeof ctx } }).state = {
      context: ctx,
    }
    ;(window as any).showColorPicker = vi.fn()
    ;(window as any).hideColorPicker = vi.fn()
    wrapper.showAt(0, 0)
    expect(wrapper.isVisible()).toBe(true)

    wrapper.hide()
    expect((window as any).hideColorPicker).toHaveBeenCalledOnce()
    expect(wrapper.isVisible()).toBe(false)
  })

  it('hide is a safe no-op when window.hideColorPicker is missing', () => {
    const cfg = createColorHashTriggerConfig()
    const wrapper = cfg.picker()
    // Skip showAt — we just want to verify hide doesn't throw.
    expect(() => wrapper.hide()).not.toThrow()
  })

  it('getElement returns null when no .color-picker-popup is in the DOM', () => {
    const cfg = createColorHashTriggerConfig()
    const wrapper = cfg.picker()
    document.body.innerHTML = ''
    expect(wrapper.getElement()).toBeNull()
  })

  it('getElement returns the popup element when present', () => {
    const cfg = createColorHashTriggerConfig()
    const wrapper = cfg.picker()
    document.body.innerHTML = '<div class="color-picker-popup">popup</div>'
    expect(wrapper.getElement()).not.toBeNull()
  })

  it('getSelectedValue returns empty string (delegates to global picker)', () => {
    const wrapper = createColorHashTriggerConfig().picker()
    expect(wrapper.getSelectedValue()).toBe('')
  })

  it('navigate / filter are intentional no-ops (do not throw)', () => {
    const wrapper = createColorHashTriggerConfig().picker()
    expect(() => wrapper.navigate('up')).not.toThrow()
    expect(() => wrapper.navigate('down')).not.toThrow()
    expect(() => wrapper.navigate('left')).not.toThrow()
    expect(() => wrapper.navigate('right')).not.toThrow()
    expect(() => wrapper.filter('blue')).not.toThrow()
  })

  it('exposes pickerType="color"', () => {
    const wrapper = createColorHashTriggerConfig().picker() as unknown as {
      pickerType: string
    }
    expect(wrapper.pickerType).toBe('color')
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven coverage', () => {
  it('M1: shouldClose returns FALSE for non-newline non-comma chars when hex<6', () => {
    // Catches a mutation that reverses the && length>=6 guard.
    const cfg = createColorHashTriggerConfig()
    expect(cfg.shouldClose!({} as never, ' ', makeContext({ textBefore: 'bg #F' }) as never)).toBe(
      false
    )
  })

  it('M2: hash-trigger insertColor uses head as `to` (not startPos)', () => {
    // Catches a mutation that always uses startPos as `to`.
    const cfg = createColorHashTriggerConfig()
    const { view, dispatched } = makeMockEditorView(15)
    const ctx = makeContext({ startPos: 5 })
    cfg.onSelect!('#abc', ctx as never, view as never)
    // to MUST equal head (15), not startPos (5).
    expect(dispatched[0].changes?.to).toBe(15)
  })

  it('M3: double-click insertColor uses startPos for BOTH from and to', () => {
    // Catches a mutation that uses head/some other field for `to`.
    const cfg = createColorDoubleClickTriggerConfig()
    const { view, dispatched } = makeMockEditorView(99)
    const ctx = makeContext({ startPos: 7 })
    cfg.onSelect!('#000', ctx as never, view as never)
    expect(dispatched[0].changes?.from).toBe(7)
    expect(dispatched[0].changes?.to).toBe(7)
  })
})
