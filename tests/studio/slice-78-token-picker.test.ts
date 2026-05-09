/**
 * Slice 78 — Token-Picker regression suite.
 *
 * @vitest-environment jsdom
 *
 * Audit: `docs/refactoring/07-slice-78-token-picker.md`. The audit listed
 * six findings (B-1..B-6) and five in-scope V-decisions (V-1..V-5).
 *
 * Locks the contract:
 *
 *   - RT-1  parseTokens recognises property-sets (B-1)
 *   - RT-2  Mixed input — singles + sets — both classified correctly
 *   - RT-3  Set properties parsed field-by-field (name + value)
 *   - RT-4  Single-value chain `accent.bg: $primary` resolves to terminal hex (B-5)
 *   - RT-5  Picker renders sets in their own "Style Bundles" section (B-3)
 *   - RT-6  Set rows have no color-swatch + show property-bag preview text
 *   - RT-7  Filter with `context.property = 'bg'` hides property-sets
 *   - RT-8  Filter with no `context.property` shows property-sets
 *   - RT-9  Set token renders the picker-item with data-token-kind="set"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  parseTokens,
  TokenPicker,
  type TokenDefinition,
  type TokenContext,
} from '../../studio/pickers/token/index'

// jsdom doesn't implement scrollIntoView; the picker's keyboard-nav calls
// it on initial focus. Mock it once for all tests in this file.
Element.prototype.scrollIntoView = vi.fn()

describe('Slice 78 — Token-Picker', () => {
  // -------------------------------------------------------------------------
  // Parser
  // -------------------------------------------------------------------------

  describe('RT-1 — parseTokens recognises property-sets', () => {
    it('`cardstyle: bg #1a1a1a, pad 16, rad 8` is a single set token', () => {
      const tokens = parseTokens('cardstyle: bg #1a1a1a, pad 16, rad 8')
      expect(tokens).toHaveLength(1)
      const t = tokens[0]
      expect(t.name).toBe('$cardstyle')
      expect(t.kind).toBe('set')
      expect(t.properties).toBeDefined()
      expect(t.properties).toHaveLength(3)
    })

    it('typography set `heading: fs 24, weight bold, col white`', () => {
      const tokens = parseTokens('heading: fs 24, weight bold, col white')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].kind).toBe('set')
      expect(tokens[0].properties).toHaveLength(3)
    })

    it('single-segment body is NOT a set (regression: $text: hello world)', () => {
      const tokens = parseTokens('text: hello world')
      // Existing test pins this to be no-token (invalid scalar). Slice 78
      // must not regress that — sets require ≥2 comma-separated segments.
      expect(tokens).toEqual([])
    })
  })

  describe('RT-2 — Mixed singles and sets', () => {
    it('classifies both kinds in a single source', () => {
      const tokens = parseTokens(
        `primary.bg: #2271C1
cardstyle: bg #1a1a1a, pad 16, rad 8
heading: fs 24, col white`
      )
      expect(tokens).toHaveLength(3)
      const single = tokens.find(t => t.name === '$primary.bg')
      const card = tokens.find(t => t.name === '$cardstyle')
      const heading = tokens.find(t => t.name === '$heading')
      expect(single?.kind).toBe('single')
      expect(card?.kind).toBe('set')
      expect(heading?.kind).toBe('set')
    })
  })

  describe('RT-3 — Set property fields', () => {
    it('parses `bg #1a1a1a, pad 16, rad 8` into name+value pairs', () => {
      const tokens = parseTokens('cardstyle: bg #1a1a1a, pad 16, rad 8')
      const props = tokens[0].properties!
      expect(props[0]).toEqual({ name: 'bg', value: '#1a1a1a' })
      expect(props[1]).toEqual({ name: 'pad', value: '16' })
      expect(props[2]).toEqual({ name: 'rad', value: '8' })
    })

    it('multi-token values stay together: `pad 10 20`', () => {
      const tokens = parseTokens('btn: pad 10 20, rad 6')
      const props = tokens[0].properties!
      expect(props[0]).toEqual({ name: 'pad', value: '10 20' })
      expect(props[1]).toEqual({ name: 'rad', value: '6' })
    })

    it('preview text shows first 3 properties with `· ` separator', () => {
      const tokens = parseTokens('cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8')
      const t = tokens[0]
      expect(t.value).toBe('bg #1a1a1a · pad 16 · rad 8 · +1 more')
    })
  })

  // -------------------------------------------------------------------------
  // Chain-resolution
  // -------------------------------------------------------------------------

  describe('RT-4 — Chain-token resolution', () => {
    it('`accent.bg: $primary` resolves to the terminal hex', () => {
      const tokens = parseTokens(
        `primary.bg: #2271C1
accent.bg: $primary`
      )
      const accent = tokens.find(t => t.name === '$accent.bg')!
      expect(accent.value).toBe('#2271C1')
      expect(accent.type).toBe('color')
    })

    it('3-hop chain resolves all the way through', () => {
      const tokens = parseTokens(
        `primary.bg: #2271C1
accent.bg: $primary
deep.bg: $accent`
      )
      const deep = tokens.find(t => t.name === '$deep.bg')!
      expect(deep.value).toBe('#2271C1')
    })

    it('cycle terminates without crash', () => {
      const tokens = parseTokens(
        `a.bg: $b
b.bg: $a`
      )
      // No crash, both tokens kept (with whatever value they end up with —
      // the cycle prevents further resolution but doesn't drop the entries).
      expect(tokens).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // Picker render
  // -------------------------------------------------------------------------

  describe('RT-5/RT-6/RT-9 — Picker render', () => {
    let picker: TokenPicker
    let anchor: HTMLElement

    beforeEach(() => {
      anchor = document.createElement('div')
      anchor.style.position = 'fixed'
      anchor.style.left = '0px'
      anchor.style.top = '0px'
      document.body.appendChild(anchor)
    })

    afterEach(() => {
      picker?.hide()
      anchor.remove()
    })

    function makePicker(tokens: TokenDefinition[], context?: TokenContext) {
      picker = new TokenPicker({ tokens, context }, { onSelect: () => {} })
      picker.show(anchor)
      return picker.element!
    }

    it('RT-5 — sets render in a separate "Style Bundles" section', () => {
      const tokens = parseTokens(
        `primary.bg: #2271C1
cardstyle: bg #1a1a1a, pad 16, rad 8`
      )
      const root = makePicker(tokens)
      const header = root.querySelector('.token-picker-section-header')
      expect(header).not.toBeNull()
      expect(header!.textContent).toBe('Style Bundles')
    })

    it('RT-5 — section header is omitted when the picker only has sets', () => {
      const tokens = parseTokens('cardstyle: bg #1a1a1a, pad 16, rad 8')
      const root = makePicker(tokens)
      // No singles → no separator needed (the whole list is sets).
      expect(root.querySelector('.token-picker-section-header')).toBeNull()
      // The set is still rendered.
      expect(root.querySelector('[data-token="$cardstyle"]')).not.toBeNull()
    })

    it('RT-6 — set rows have no color-swatch even when the set contains bg', () => {
      const tokens = parseTokens('cardstyle: bg #1a1a1a, pad 16, rad 8')
      const root = makePicker(tokens)
      const row = root.querySelector('[data-token="$cardstyle"]')!
      expect(row.querySelector('.token-picker-preview')).toBeNull()
    })

    it('RT-6 — set value text is the property-bag preview', () => {
      const tokens = parseTokens('cardstyle: bg #1a1a1a, pad 16, rad 8')
      const root = makePicker(tokens)
      const value = root.querySelector('[data-token="$cardstyle"] .token-picker-value')!
      expect(value.textContent).toContain('bg #1a1a1a')
      expect(value.textContent).toContain('pad 16')
      expect(value.textContent).toContain('rad 8')
    })

    it('RT-9 — set rows carry data-token-kind="set"', () => {
      const tokens = parseTokens('cardstyle: bg #1a1a1a, pad 16, rad 8')
      const root = makePicker(tokens)
      const row = root.querySelector('[data-token="$cardstyle"]') as HTMLElement
      expect(row.getAttribute('data-token-kind')).toBe('set')
      expect(row.classList.contains('token-picker-item-set')).toBe(true)
    })

    it('RT-9 — single-value rows carry data-token-kind="single"', () => {
      const tokens = parseTokens('primary.bg: #2271C1')
      const root = makePicker(tokens)
      const row = root.querySelector('[data-token="$primary.bg"]') as HTMLElement
      expect(row.getAttribute('data-token-kind')).toBe('single')
      expect(row.classList.contains('token-picker-item-set')).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Context-filter
  // -------------------------------------------------------------------------

  describe('RT-7/RT-8 — Context-filter', () => {
    let picker: TokenPicker
    let anchor: HTMLElement

    beforeEach(() => {
      anchor = document.createElement('div')
      document.body.appendChild(anchor)
    })

    afterEach(() => {
      picker?.hide()
      anchor.remove()
    })

    it('RT-7 — `context.property = bg` hides property-sets', () => {
      const tokens = parseTokens(
        `primary.bg: #2271C1
cardstyle: bg #1a1a1a, pad 16, rad 8`
      )
      picker = new TokenPicker(
        { tokens, context: { property: 'bg', allowedTypes: ['color'] } },
        { onSelect: () => {} }
      )
      const filtered = picker.getFilteredTokens()
      expect(filtered.find(t => t.kind === 'set')).toBeUndefined()
      expect(filtered.find(t => t.name === '$primary.bg')).toBeDefined()
    })

    it('RT-8 — no `context.property` keeps both kinds', () => {
      const tokens = parseTokens(
        `primary.bg: #2271C1
cardstyle: bg #1a1a1a, pad 16, rad 8`
      )
      picker = new TokenPicker({ tokens }, { onSelect: () => {} })
      const filtered = picker.getFilteredTokens()
      expect(filtered.find(t => t.name === '$primary.bg')).toBeDefined()
      expect(filtered.find(t => t.name === '$cardstyle')).toBeDefined()
    })
  })
})
