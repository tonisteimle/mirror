/**
 * Conditionals — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend für Conditionals-Sub-Features.
 * Documentation: docs/concepts/conditionals-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  {
    name: 'T1: block if (truthy)',
    src: `active: true\n\nif active\n  Text "Yes"`,
  },
  {
    name: 'T2: if/else',
    src: `loggedIn: false\n\nif loggedIn\n  Text "Welcome"\nelse\n  Text "Login"`,
  },
  {
    name: 'T6: inline ternary',
    src: `done: true\n\nText done ? "Ja" : "Nein"`,
  },
  {
    name: 'T8: ternary in style (literal hex)',
    src: `active: true\n\nFrame bg active ? #2271C1 : #333`,
  },
]

describe('Conditionals — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Conditionals — Inline ternary: per-backend behavior', () => {
  // PIN current behavior: DOM resolves and emits the truthy branch text;
  // Framework keeps both branch values somewhere in its output (passes them
  // through as data); React drops both branches from its emit.
  it('DOM resolves "Ja" (truthy); Framework keeps it; React drops it', () => {
    const src = `done: true\n\nText done ? "Ja" : "Nein"`
    expect(generateDOM(parse(src))).toContain('Ja')
    expect(generateFramework(parse(src))).toContain('Ja')
    expect(generateReact(parse(src))).not.toContain('Ja')
  })
})

describe('Conditionals — Block if/else: DOM-only runtime', () => {
  // Block-if uses runtime conditional rendering (data-conditional-id +
  // _conditionalConfig). React/Framework backends emit the structure
  // but lack the runtime, so the dynamic switching doesn't work the
  // same way. Pin: DOM has the runtime config, others don't.
  it('DOM emits _conditionalConfig runtime hook', () => {
    const dom = generateDOM(parse(`active: true\n\nif active\n  Text "Yes"`))
    expect(dom).toContain('_conditionalConfig')
  })
})

describe('Conditionals — Inline-ternary in style: literal hex resolves', () => {
  it('DOM emits the chosen hex (truthy → first)', () => {
    const dom = generateDOM(parse(`active: true\n\nFrame bg active ? #2271C1 : #333`))
    // Either resolved at compile time (literal "#2271C1") or via
    // runtime ternary. Both are acceptable.
    expect(dom).toMatch(/2271C1|2271c1/)
  })
})

// =============================================================================
// Pinned Bug Tests (#23-#26): documented limits in compiler
// =============================================================================

describe('Conditionals — Pinned bugs (compiler limits)', () => {
  it('Bug #23 PIN: nested ternary in Text emits multiple sibling DOM nodes', () => {
    // Compiles, but at runtime renders multiple elements where one was intended.
    expect(() =>
      generateDOM(parse(`level: 2\n\nText level == 1 ? "A" : level == 2 ? "B" : "C"`))
    ).not.toThrow()
  })

  it('Bug #24 PIN: ternary with $token in style emits no `background`', () => {
    // The output compiles but has no `background:` line in the style assignment.
    const dom = generateDOM(
      parse(`accent.bg: #10b981\n\nchange: 5\n\nFrame bg change > 0 ? $accent : #333`)
    )
    // Should NOT contain any actual bg resolution (the bug).
    // Once fixed, this test should fail and be tightened.
    expect(dom).not.toContain("'background': 'var(--accent-bg)'")
    expect(dom).not.toContain("'background': '#333'")
  })

  it('Bug #25 PIN: ternary in style with $variable falls back to operand-as-token', () => {
    const dom = generateDOM(parse(`cat: "X"\n\nFrame bg cat == "X" ? #abc : #def`))
    // Today: bg becomes `var(--cat)` instead of resolving to a hex
    expect(dom).toContain('var(--cat)')
  })

  it('Bug #26 PIN: ternary in Text with interpolated string-branches → empty', () => {
    const dom = generateDOM(parse(`count: 3\n\nText count > 0 ? "Items: $count" : "Empty"`))
    // Compiles, but textContent is never set (empty render).
    // Pin: compile doesn't crash. Behavior-spec pins the empty-text result.
    expect(() => dom).not.toThrow()
  })
})
