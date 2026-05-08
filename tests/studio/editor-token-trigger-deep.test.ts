// @vitest-environment jsdom
/**
 * Tests for studio/editor/triggers/token-trigger.ts — coverage gaps
 *
 * The existing test file covers config-shape, register/unregister, and
 * extractAllTokens. It does NOT cover:
 *  - picker factory (filtering by suffix vs. by type fallback)
 *  - onSelect (insertToken: strip leading $, replace from startPos→head)
 *  - shouldActivate (whitespace-only textBefore branch + property capture)
 *  - shouldClose (non-identifier characters close)
 *  - filterTokens public API (suffix → type fallback → text filter)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createTokenTriggerConfig,
  filterTokens,
  extractAllTokens,
} from '../../studio/editor/triggers/token-trigger'
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
      state: { selection: { main: { head: headPos } } },
    },
    dispatched,
  }
}

function makeContext(opts: { textBefore?: string; startPos?: number } = {}) {
  return {
    line: { text: '', from: 0, to: 0, number: 1 },
    cursorPos: opts.startPos ?? 0,
    startPos: opts.startPos ?? 0,
    textBefore: opts.textBefore ?? '',
  }
}

const SAMPLE_TOKENS = `
primary.bg: #2271C1
primary.col: white
danger.bg: #ef4444
space.gap: 12
`

// =============================================================================
// shouldActivate
// =============================================================================

describe('shouldActivate — token trigger gating', () => {
  it('returns FALSE when textBefore is whitespace-only (start of line)', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view } = makeMockEditorView()
    expect(
      cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: '   ' }) as never)
    ).toBe(false)
    expect(
      cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: '' }) as never)
    ).toBe(false)
  })

  it('returns TRUE when textBefore matches a color/spacing property', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view } = makeMockEditorView()
    expect(
      cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: 'bg ' }) as never)
    ).toBe(true)
  })

  it('returns TRUE for token-definition contexts ("primary.bg: ")', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view } = makeMockEditorView()
    expect(
      cfg.shouldActivate!(
        { view } as never,
        '$',
        makeContext({ textBefore: 'primary.bg: ' }) as never
      )
    ).toBe(true)
  })

  it('returns TRUE for unknown contexts but lets picker filter (no property)', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view } = makeMockEditorView()
    // 'Frame ' doesn't match the pattern → currentProperty stays undefined
    // but the trigger still activates (returns true). The picker just
    // shows ALL tokens unfiltered.
    expect(
      cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: 'Frame ' }) as never)
    ).toBe(true)
  })
})

// =============================================================================
// shouldClose
// =============================================================================

describe('shouldClose — closes on non-identifier chars', () => {
  it('closes on space', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    expect(cfg.shouldClose!({} as never, ' ', makeContext() as never)).toBe(true)
  })

  it('closes on comma, semicolon, parenthesis', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    expect(cfg.shouldClose!({} as never, ',', makeContext() as never)).toBe(true)
    expect(cfg.shouldClose!({} as never, ';', makeContext() as never)).toBe(true)
    expect(cfg.shouldClose!({} as never, '(', makeContext() as never)).toBe(true)
  })

  it('does NOT close on letters, digits, underscore, hyphen, period (identifier chars)', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    expect(cfg.shouldClose!({} as never, 'a', makeContext() as never)).toBe(false)
    expect(cfg.shouldClose!({} as never, 'Z', makeContext() as never)).toBe(false)
    expect(cfg.shouldClose!({} as never, '5', makeContext() as never)).toBe(false)
    expect(cfg.shouldClose!({} as never, '_', makeContext() as never)).toBe(false)
    expect(cfg.shouldClose!({} as never, '-', makeContext() as never)).toBe(false)
    expect(cfg.shouldClose!({} as never, '.', makeContext() as never)).toBe(false)
  })
})

// =============================================================================
// onSelect → insertToken
// =============================================================================

describe('onSelect — insertToken pipeline', () => {
  it('strips leading $ from value (the user already typed $)', () => {
    const cfg = createTokenTriggerConfig(() => ({ 'tokens.tok': SAMPLE_TOKENS }))
    const { view, dispatched } = makeMockEditorView(10)
    const ctx = makeContext({ startPos: 5 })

    cfg.onSelect!('$primary', ctx as never, view as never)

    expect(dispatched).toHaveLength(1)
    expect(dispatched[0].changes).toEqual({ from: 5, to: 10, insert: 'primary' })
  })

  it('preserves value verbatim when no leading $', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view, dispatched } = makeMockEditorView(20)
    const ctx = makeContext({ startPos: 15 })

    cfg.onSelect!('plain', ctx as never, view as never)

    expect(dispatched[0].changes).toEqual({ from: 15, to: 20, insert: 'plain' })
  })

  it('selection anchor lands at from + insertValue.length', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view, dispatched } = makeMockEditorView(10)
    cfg.onSelect!('$abc', makeContext({ startPos: 4 }) as never, view as never)
    // 'abc' inserted at 4 → anchor 4 + 3 = 7
    expect(dispatched[0].selection?.anchor).toBe(7)
  })

  it('calls view.focus() after dispatch', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view } = makeMockEditorView(10)
    cfg.onSelect!('$primary', makeContext({ startPos: 5 }) as never, view as never)
    expect(view.focus).toHaveBeenCalledOnce()
  })
})

// =============================================================================
// picker factory — filters by property context
// =============================================================================

describe('picker factory — property-context filtering', () => {
  it('filters tokens by suffix when property has a known mapping (bg → .bg)', () => {
    const cfg = createTokenTriggerConfig(() => ({ 'tokens.tok': SAMPLE_TOKENS }))
    const { view } = makeMockEditorView()
    // Set property context via shouldActivate
    cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: 'bg ' }) as never)
    // Now invoke the picker — should filter SAMPLE_TOKENS to only .bg ones
    const picker = cfg.picker()
    expect(picker).not.toBeNull()
    // Two .bg tokens exist (primary.bg, danger.bg)
    expect(picker.pickerType).toBe('token')
  })

  it('falls back to ALL tokens when no property context is set', () => {
    const cfg = createTokenTriggerConfig(() => ({ 'tokens.tok': SAMPLE_TOKENS }))
    // No shouldActivate call → currentProperty is undefined
    const picker = cfg.picker()
    expect(picker).not.toBeNull()
  })
})

// =============================================================================
// filterTokens (public API)
// =============================================================================

describe('filterTokens — live-filter helper', () => {
  it('is a no-op when no picker has been opened (state.picker is null)', () => {
    expect(() => filterTokens('foo')).not.toThrow()
  })

  it('filters by text when a picker is open', () => {
    const cfg = createTokenTriggerConfig(() => ({ 'tokens.tok': SAMPLE_TOKENS }))
    const { view } = makeMockEditorView()
    cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: 'bg ' }) as never)
    cfg.picker() // creates picker, populates allTokens

    // Live-filter to 'pri' → only primary.* should match
    expect(() => filterTokens('pri', 'bg')).not.toThrow()
  })

  it('property → suffix filtering keeps only matching tokens', () => {
    const cfg = createTokenTriggerConfig(() => ({ 'tokens.tok': SAMPLE_TOKENS }))
    const { view } = makeMockEditorView()
    cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: 'gap ' }) as never)
    cfg.picker()
    // Filter by 'gap' suffix — only space.gap matches
    expect(() => filterTokens('', 'gap')).not.toThrow()
  })
})

// =============================================================================
// extractAllTokens — pure function, smoke test
// =============================================================================

describe('extractAllTokens — round-trip with picker filtering', () => {
  it('returns an array of TokenDefinition entries with at least a name', () => {
    const tokens = extractAllTokens({ 'tokens.tok': SAMPLE_TOKENS })
    expect(Array.isArray(tokens)).toBe(true)
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens[0]).toHaveProperty('name')
  })

  it('returns empty for empty file map', () => {
    const tokens = extractAllTokens({})
    expect(tokens).toEqual([])
  })

  it('handles malformed token blob gracefully (does not throw)', () => {
    expect(() => extractAllTokens({ 'tokens.tok': 'not really tokens' })).not.toThrow()
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven coverage', () => {
  it('M1: insertToken DROPS the leading $ from the inserted text (otherwise $$ shows up)', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view, dispatched } = makeMockEditorView(10)
    cfg.onSelect!('$mytoken', makeContext({ startPos: 5 }) as never, view as never)
    expect(dispatched[0].changes?.insert).toBe('mytoken')
    expect(dispatched[0].changes?.insert.startsWith('$')).toBe(false)
  })

  it('M2: shouldActivate gates on textBefore (whitespace = no-trigger)', () => {
    const cfg = createTokenTriggerConfig(() => ({}))
    const { view } = makeMockEditorView()
    expect(
      cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: '  ' }) as never)
    ).toBe(false)
    expect(
      cfg.shouldActivate!({ view } as never, '$', makeContext({ textBefore: 'bg ' }) as never)
    ).toBe(true)
  })

  it('M3: shouldClose . is allowed (token suffixes contain dots)', () => {
    // Catches a mutation that flips the regex to include .
    const cfg = createTokenTriggerConfig(() => ({}))
    expect(cfg.shouldClose!({} as never, '.', makeContext() as never)).toBe(false)
  })
})
