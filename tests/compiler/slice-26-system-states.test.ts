// @vitest-environment jsdom
/**
 * Slice 26 — System-States regression suite.
 *
 * Audit: `docs/refactoring/05-slice-26-system-states.md`. The audit found
 * that the schema declares 13 system-states (system: true in
 * `compiler/schema/dsl.ts:386–398`), but the DOM emitter shipped with a
 * hardcoded 4-entry list, silently dropping 9 states. Slice 26 derives
 * `SYSTEM_STATES` from the schema and dispatches the correct selector form
 * per state.
 *
 * Locks (RT-1..RT-12 from the audit):
 *
 *   - RT-1   `hover:` emits `:hover, [data-hover="true"]`
 *   - RT-2   `focus:` emits `:focus, [data-focus="true"]`
 *   - RT-3   `active:` emits `:active, [data-active="true"]`
 *   - RT-4   `disabled:` emits `[disabled]` (attribute, not pseudo-class)
 *   - RT-5   `focus-visible:` emits `:focus-visible` (no programmatic fallback)
 *   - RT-6   `focus-within:` emits `:focus-within`
 *   - RT-7   `visited:` emits `:visited`
 *   - RT-8   `checked:` emits `:checked`
 *   - RT-9   `placeholder:` emits `::placeholder` (pseudo-element form)
 *   - RT-10  Schema-Drift-Schutz: emitter `SYSTEM_STATES` ≡ schema-system-states
 *   - RT-11  Multiple states co-exist (`hover` + `disabled` + `focus-visible`)
 *   - RT-12  Token-resolved property in advanced state (`focus-visible: bg $primary`)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { DSL } from '../../compiler/schema/dsl'

function compile(source: string): string {
  return generateDOM(parse(source))
}

/**
 * Extract the inline CSS-text block emitted by `_style.textContent = \`...\``.
 * Returns the raw CSS. Tests then assert against substrings/regexes.
 */
function extractCSS(js: string): string {
  const m = js.match(/_style\.textContent\s*=\s*`([\s\S]*?)`/)
  return m ? m[1] : ''
}

describe('Slice 26 — System-States', () => {
  // ---------------------------------------------------------------------
  // RT-1..RT-3 — interactive states emit pseudo-class + programmatic fallback
  // ---------------------------------------------------------------------
  it('RT-1 — hover: emits :hover and [data-hover="true"]', () => {
    const css = extractCSS(compile(`Btn: bg #333\n  hover:\n    bg #444\nBtn "X"`))
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]:hover/)
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]\[data-hover="true"\]/)
  })

  it('RT-2 — focus: emits :focus and [data-focus="true"]', () => {
    const css = extractCSS(compile(`Btn: bg #333\n  focus:\n    bor 2, boc #2271C1\nBtn "X"`))
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]:focus/)
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]\[data-focus="true"\]/)
  })

  it('RT-3 — active: emits :active and [data-active="true"]', () => {
    const css = extractCSS(compile(`Btn: bg #333\n  active:\n    scale 0.98\nBtn "X"`))
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]:active/)
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]\[data-active="true"\]/)
  })

  // ---------------------------------------------------------------------
  // RT-4 — disabled uses the attribute selector, not :disabled
  // ---------------------------------------------------------------------
  it('RT-4 — disabled: emits [disabled] (attribute), no programmatic fallback', () => {
    const css = extractCSS(compile(`Btn: bg #333\n  disabled:\n    opacity 0.5\nBtn "X"`))
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]\[disabled\]/)
    // No programmatic fallback for disabled — the attribute *is* the trigger
    expect(css).not.toMatch(/\[data-mirror-id="[^"]+"\]\[data-disabled="true"\]/)
  })

  // ---------------------------------------------------------------------
  // RT-5..RT-8 — newly-emitted advanced pseudo-classes
  // ---------------------------------------------------------------------
  it('RT-5 — focus-visible: emits :focus-visible (no programmatic fallback)', () => {
    const css = extractCSS(
      compile(`Btn: bg #333\n  focus-visible:\n    bor 2, boc #2271C1\nBtn "X"`)
    )
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]:focus-visible/)
    expect(css).not.toMatch(/data-focus-visible="true"/)
  })

  it('RT-6 — focus-within: emits :focus-within', () => {
    const css = extractCSS(
      compile(`Card: bg #1a1a1a\n  focus-within:\n    bor 1, boc #2271C1\nCard`)
    )
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]:focus-within/)
  })

  it('RT-7 — visited: emits :visited', () => {
    const css = extractCSS(
      compile(`MyLink as Link: col #2271C1\n  visited:\n    col #888\nMyLink "Test"`)
    )
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]:visited/)
  })

  it('RT-8 — checked: emits :checked', () => {
    const css = extractCSS(
      compile(`MyCheck as Input: bg #333\n  checked:\n    bg #2271C1\nMyCheck`)
    )
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]:checked/)
  })

  // ---------------------------------------------------------------------
  // RT-9 — placeholder uses pseudo-element form (::placeholder)
  // ---------------------------------------------------------------------
  it('RT-9 — placeholder: emits ::placeholder (pseudo-element)', () => {
    const css = extractCSS(
      compile(`MyInput as Input: col white\n  placeholder:\n    col #888\nMyInput`)
    )
    expect(css).toMatch(/\[data-mirror-id="[^"]+"\]::placeholder/)
    // Not the pseudo-class form
    expect(css).not.toMatch(/\[data-mirror-id="[^"]+"\]:placeholder\b(?!-)/)
  })

  // ---------------------------------------------------------------------
  // RT-10 — drift guard against schema (no hardcoded list in emitter)
  // ---------------------------------------------------------------------
  it('RT-10 — every system: true state in the schema gets emitted', () => {
    // Construct a minimal Mirror snippet that uses each system-state once,
    // then assert the CSS mentions a selector for each. The component name
    // is unique per state so the selector match is unambiguous.
    const systemStates = Object.entries(DSL.states)
      .filter(([, def]) => (def as { system?: boolean }).system)
      .map(([name]) => name)
    expect(systemStates.length).toBeGreaterThanOrEqual(13)

    for (const state of systemStates) {
      // first-child / last-child / empty / placeholder-shown all need an
      // input-or-text-bearing primitive; Frame/Input/Text are all fine for
      // the parser. We only need the *emitter* to produce a selector.
      const src = `Probe as Frame: bg #333\n  ${state}:\n    opacity 0.5\nProbe`
      const css = extractCSS(compile(src))
      // Each state must produce at least one CSS rule referencing the
      // node — either as :state, [state], or ::state.
      expect(css, `state ${state} produced no CSS`).toMatch(
        new RegExp(`\\[data-mirror-id="[^"]+"\\](?::|\\[|::)${escapeRegex(state)}`)
      )
    }
  })

  // ---------------------------------------------------------------------
  // RT-11 — multiple states co-exist on one component
  // ---------------------------------------------------------------------
  it('RT-11 — hover + disabled + focus-visible co-exist on one node', () => {
    const css = extractCSS(
      compile(
        `Btn: bg #333\n  hover:\n    bg #444\n  disabled:\n    opacity 0.5\n  focus-visible:\n    bor 2\nBtn "X"`
      )
    )
    expect(css).toMatch(/:hover/)
    expect(css).toMatch(/\[disabled\]/)
    expect(css).toMatch(/:focus-visible/)
  })

  // ---------------------------------------------------------------------
  // RT-12 — token-resolved property in advanced state
  // ---------------------------------------------------------------------
  it('RT-12 — token resolves inside an advanced state body', () => {
    const css = extractCSS(
      compile(`primary.bg: #2271C1\nBtn: bg #333\n  focus-visible:\n    bg $primary\nBtn "X"`)
    )
    expect(css).toMatch(/:focus-visible/)
    expect(css).toMatch(/var\(--primary-bg\)/)
  })
})

// Local helper — escape state names that contain `-` (e.g., focus-visible)
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
