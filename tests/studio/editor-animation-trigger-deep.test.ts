// @vitest-environment jsdom
/**
 * Tests for studio/editor/triggers/animation-trigger.ts — coverage gaps
 *
 * The existing test file covers parseAnimationFromLine, generateAnimationDSL,
 * data-management API, and trigger registration. It does NOT cover the
 * trigger config CALLBACKS (picker factory, onSelect, shouldActivate)
 * nor the editor-coupled `showAnimationPicker` / `insertAnimation` paths.
 *
 * These tests use minimal EditorView / TriggerContext mocks to drive the
 * callbacks directly — pinning behavior without spinning up CodeMirror.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createAnimationTriggerConfig,
  showAnimationPicker,
  setAnimationData,
  type AnimationData,
} from '../../studio/editor/triggers/animation-trigger'
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
})

// =============================================================================
// Test scaffolding — tiny EditorView / TriggerContext / ViewUpdate mocks
// =============================================================================

interface DispatchedTransaction {
  changes?: { from: number; to: number; insert: string }
  selection?: { anchor: number }
}

function makeMockEditorView() {
  const dispatched: DispatchedTransaction[] = []
  const focusCount = { value: 0 }
  const view = {
    dispatch: vi.fn((tr: DispatchedTransaction) => dispatched.push(tr)),
    focus: vi.fn(() => {
      focusCount.value++
    }),
    coordsAtPos: vi.fn(() => ({
      left: 100,
      top: 50,
      bottom: 60,
      right: 110,
    })),
  }
  return { view, dispatched, focusCount }
}

function makeContext(
  lineText: string,
  opts: { from?: number; to?: number; replaceRange?: { from: number; to: number } } = {}
) {
  const from = opts.from ?? 0
  const to = opts.to ?? lineText.length
  return {
    line: { text: lineText, from, to, number: 1 },
    cursorPos: from,
    replaceRange: opts.replaceRange,
  }
}

// =============================================================================
// createAnimationTriggerConfig — config shape
// =============================================================================

describe('createAnimationTriggerConfig — config shape', () => {
  it('exposes id, doubleClick trigger, picker factory, onSelect, shouldActivate, priority', () => {
    const cfg = createAnimationTriggerConfig()
    expect(cfg.id).toBe('animation')
    expect(cfg.trigger.type).toBe('doubleClick')
    expect(cfg.trigger.pattern).toBeInstanceOf(RegExp)
    expect(typeof cfg.picker).toBe('function')
    expect(typeof cfg.onSelect).toBe('function')
    expect(typeof cfg.shouldActivate).toBe('function')
    expect(cfg.priority).toBe(60)
    expect(cfg.keyboard?.orientation).toBe('vertical')
  })

  it('trigger.pattern matches "X as animation" lines (case insensitive)', () => {
    const { trigger } = createAnimationTriggerConfig()
    expect(trigger.pattern!.test('FadeUp as animation')).toBe(true)
    expect(trigger.pattern!.test('FadeUp AS Animation 0.5s loop')).toBe(true)
    expect(trigger.pattern!.test('FadeUp')).toBe(false)
  })
})

// =============================================================================
// shouldActivate
// =============================================================================

describe('createAnimationTriggerConfig — shouldActivate', () => {
  it('returns true and seeds animation data when line is parseable', () => {
    const cfg = createAnimationTriggerConfig()
    const ctx = makeContext('FadeUp as animation 0.5s ease-in')
    // The 1st/2nd args are unused by shouldActivate for the parse path —
    // only context.line.text is read.
    const ok = cfg.shouldActivate!({} as never, '', ctx as never)
    expect(ok).toBe(true)
  })

  it('returns false when line does not match the parser', () => {
    const cfg = createAnimationTriggerConfig()
    const ctx = makeContext('not an animation line')
    expect(cfg.shouldActivate!({} as never, '', ctx as never)).toBe(false)
  })
})

// =============================================================================
// onSelect — both branches (preset name + fallback)
// =============================================================================

describe('createAnimationTriggerConfig — onSelect', () => {
  it('writes a CodeMirror transaction with the generated DSL when value is given', () => {
    const cfg = createAnimationTriggerConfig()
    const { view, dispatched, focusCount } = makeMockEditorView()
    // Seed currentData via the public setter so onSelect has data to use.
    setAnimationData({
      name: 'Initial',
      easing: 'ease-out',
      duration: 0.3,
      tracks: [{ property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 }],
    })

    const ctx = makeContext('Initial as animation', {
      from: 0,
      to: 20,
      replaceRange: { from: 0, to: 20 },
    })
    cfg.onSelect!('FadeUp', ctx as never, view as never)

    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].changes?.insert).toContain('FadeUp')
    expect(dispatched[0].changes?.insert).toContain('as animation')
    expect(dispatched[0].changes?.from).toBe(0)
    expect(dispatched[0].changes?.to).toBe(20)
    // anchor = from + dsl.length
    expect(dispatched[0].selection?.anchor).toBe(dispatched[0].changes!.insert.length)
    expect(focusCount.value).toBe(1)
  })

  it('falls back to current data (no rename) when value is empty', () => {
    const cfg = createAnimationTriggerConfig()
    const { view, dispatched } = makeMockEditorView()
    setAnimationData({
      name: 'KeepMe',
      easing: 'linear',
      duration: 0.5,
      tracks: [{ property: 'opacity', startTime: 0, endTime: 0.5, fromValue: 0, toValue: 1 }],
    })
    const ctx = makeContext('KeepMe as animation', { replaceRange: { from: 5, to: 25 } })

    cfg.onSelect!('', ctx as never, view as never)

    expect(dispatched).toHaveLength(1)
    // The DSL preserves the existing name 'KeepMe'.
    expect(dispatched[0].changes?.insert.startsWith('KeepMe')).toBe(true)
    // Replace range is honored (not the line's from/to).
    expect(dispatched[0].changes?.from).toBe(5)
    expect(dispatched[0].changes?.to).toBe(25)
  })

  it('uses line.from / line.to when no replaceRange is set', () => {
    const cfg = createAnimationTriggerConfig()
    const { view, dispatched } = makeMockEditorView()
    setAnimationData({
      name: 'X',
      easing: 'ease-out',
      duration: 0.3,
      tracks: [{ property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 }],
    })
    // NO replaceRange in context
    const ctx = makeContext('X as animation', { from: 7, to: 21 })

    cfg.onSelect!('Pulse', ctx as never, view as never)

    expect(dispatched[0].changes?.from).toBe(7)
    expect(dispatched[0].changes?.to).toBe(21)
  })
})

// =============================================================================
// showAnimationPicker — uses TriggerManager + view.coordsAtPos
// =============================================================================

describe('showAnimationPicker', () => {
  it('aborts gracefully when coordsAtPos returns null', () => {
    const view = {
      coordsAtPos: vi.fn(() => null),
      dispatch: vi.fn(),
      focus: vi.fn(),
    }
    expect(() => showAnimationPicker('FadeUp as animation', 0, view as never)).not.toThrow()
  })

  it('seeds default animation data when the line is unparseable', () => {
    // Stub the trigger manager's showPicker to capture invocation.
    const showPickerSpy = vi.fn()
    const manager = getTriggerManager() as unknown as { showPicker: typeof showPickerSpy }
    manager.showPicker = showPickerSpy

    const view = {
      coordsAtPos: vi.fn(() => ({ left: 5, top: 10, bottom: 20, right: 15 })),
      dispatch: vi.fn(),
      focus: vi.fn(),
    }
    showAnimationPicker('garbage line', 7, view as never)
    expect(showPickerSpy).toHaveBeenCalledTimes(1)
    // Args: id, left, bottom + 4, lineStart, view, options
    const args = showPickerSpy.mock.calls[0]
    expect(args[0]).toBe('animation')
    expect(args[1]).toBe(5) // coords.left
    expect(args[2]).toBe(24) // coords.bottom + 4
    expect(args[3]).toBe(7) // lineStart
    expect(args[5].existingValue).toBe('garbage line')
  })

  it('uses parsed data when the line IS parseable', () => {
    const showPickerSpy = vi.fn()
    const manager = getTriggerManager() as unknown as { showPicker: typeof showPickerSpy }
    manager.showPicker = showPickerSpy

    const view = {
      coordsAtPos: vi.fn(() => ({ left: 0, top: 0, bottom: 0, right: 0 })),
      dispatch: vi.fn(),
      focus: vi.fn(),
    }
    showAnimationPicker('Pulse as animation 1s loop', 0, view as never)
    expect(showPickerSpy).toHaveBeenCalledOnce()
    // The lineStart and existingValue are forwarded.
    const opts = showPickerSpy.mock.calls[0][5]
    expect(opts.replaceRange.from).toBe(0)
    expect(opts.replaceRange.to).toBe(26) // length of 'Pulse as animation 1s loop'
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: parseAnimationFromLine is the gate — shouldActivate is FALSE when parse returns null', () => {
    // Catches a mutation that returns true unconditionally.
    const cfg = createAnimationTriggerConfig()
    expect(cfg.shouldActivate!({} as never, '', makeContext('garbage') as never)).toBe(false)
  })

  it('M2: onSelect dispatches BOTH changes AND selection (anchor at insert end)', () => {
    // Catches a mutation that drops the selection field.
    const cfg = createAnimationTriggerConfig()
    const { view, dispatched } = makeMockEditorView()
    setAnimationData({
      name: 'X',
      easing: 'ease-out',
      duration: 0.3,
      tracks: [{ property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 }],
    })
    cfg.onSelect!(
      'Y',
      makeContext('X as animation', {
        from: 0,
        to: 14,
        replaceRange: { from: 0, to: 14 },
      }) as never,
      view as never
    )
    const tr = dispatched[0]
    expect(tr.changes?.insert.length).toBeGreaterThan(0)
    expect(tr.selection?.anchor).toBe(tr.changes!.insert.length)
  })

  it('M3: onSelect calls view.focus() after dispatch (otherwise editor loses keyboard input)', () => {
    const cfg = createAnimationTriggerConfig()
    const { view, focusCount } = makeMockEditorView()
    setAnimationData({
      name: 'X',
      easing: 'ease-out',
      duration: 0.3,
      tracks: [{ property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 }],
    })
    cfg.onSelect!(
      'Y',
      makeContext('X as animation', { replaceRange: { from: 0, to: 14 } }) as never,
      view as never
    )
    expect(focusCount.value).toBe(1)
  })
})
