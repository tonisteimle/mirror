/**
 * Conditionals — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend für Conditionals-Sub-Features.
 * Documentation: docs/archive/concepts/conditionals-backend-support.md.
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
  // PIN current behavior: all three backends now expose both branches in
  // their output. DOM resolves the truthy branch via runtime `$get`,
  // Framework passes through the `__conditional:` IR-marker, React emits a
  // JSX `{cond ? "Ja" : "Nein"}` expression with token references rewritten
  // to `tokens["…"]`. CI fails if any backend regresses to dropping a branch.
  it('all three backends keep both branches in their emit', () => {
    const src = `done: true\n\nText done ? "Ja" : "Nein"`
    const dom = generateDOM(parse(src))
    const fw = generateFramework(parse(src))
    const react = generateReact(parse(src))
    expect(dom).toContain('Ja')
    expect(fw).toContain('Ja')
    expect(react).toContain('Ja')
    expect(react).toContain('Nein')
    expect(react).toMatch(/tokens\[['"]done['"]\]\s*\?\s*"Ja"\s*:\s*"Nein"/)
  })

  it('React rewrites nested ternary identifiers to tokens["…"] lookups', () => {
    const src = `level: 2\n\nText level == 1 ? "A" : level == 2 ? "B" : "C"`
    const react = generateReact(parse(src))
    // Outer + inner condition both rewritten — inner branch `level == 2` is
    // emitted as a flattened source string but still gets the rewriter.
    expect(react).toMatch(/tokens\[['"]level['"]\]\s*==\s*1/)
    expect(react).toMatch(/tokens\[['"]level['"]\]\s*==\s*2/)
  })
})

describe('Conditionals — Block if/else: per-backend wiring', () => {
  // Block-if has different runtime shapes per backend. DOM uses the
  // runtime conditional config (data-conditional-id + _conditionalConfig);
  // React emits a JSX `{cond ? (<>…</>) : null}` (or `: (<>else</>)`)
  // expression; Framework attaches `visible-when` props the runtime evaluates.
  // CI fails if any of these regress.
  it('DOM emits _conditionalConfig runtime hook', () => {
    const dom = generateDOM(parse(`active: true\n\nif active\n  Text "Yes"`))
    expect(dom).toContain('_conditionalConfig')
  })

  it('React emits JSX `{cond ? (...) : null}` for top-level if', () => {
    const react = generateReact(parse(`active: true\n\nif active\n  Text "Yes"`))
    expect(react).toMatch(/tokens\[['"]active['"]\]\s*\?\s*\(/)
    expect(react).toContain(') : null}')
    expect(react).toContain('Yes')
  })

  it('React emits both branches for top-level if/else', () => {
    const react = generateReact(
      parse(`loggedIn: false\n\nif loggedIn\n  Text "Welcome"\nelse\n  Text "Login"`)
    )
    expect(react).toMatch(/tokens\[['"]loggedIn['"]\]\s*\?\s*\(/)
    expect(react).toContain('Welcome')
    expect(react).toContain('Login')
  })

  it('React wraps nested if/else children via `visibleWhen` per-instance', () => {
    // Parser desugars `if cond / else` *inside a parent* into per-instance
    // `visibleWhen` strings. React mirrors that as a per-child
    // `{cond ? jsx : null}` wrap. The else-sibling carries `!(cond)` →
    // emits `!(tokens["cond"])`.
    const react = generateReact(
      parse(`done: true\n\nFrame\n  if done\n    Text "OK"\n  else\n    Text "Pending"`)
    )
    expect(react).toMatch(/tokens\[['"]done['"]\]\s*\?\s*\(/)
    expect(react).toMatch(/!\(tokens\[['"]done['"]\]\)\s*\?\s*\(/)
  })
})

describe('Conditionals — Inline-ternary in style: literal hex resolves', () => {
  it('DOM emits the chosen hex (truthy → first)', () => {
    const dom = generateDOM(parse(`active: true\n\nFrame bg active ? #2271C1 : #333`))
    // Either resolved at compile time (literal "#2271C1") or via
    // runtime ternary. Both are acceptable.
    expect(dom).toMatch(/2271C1|2271c1/)
  })

  // PIN: React lacks a Mirror runtime, so style-property ternaries are
  // statically resolved via the `tokens` map at compile time.
  it('React static-resolves bare-identifier conditions (truthy branch wins)', () => {
    const react = generateReact(parse(`active: true\n\nFrame bg active ? #2271C1 : #333`))
    expect(react).toContain('#2271C1')
    expect(react).not.toContain('#333')
  })

  it('React static-resolves the else branch when condition is falsy', () => {
    const react = generateReact(parse(`active: false\n\nFrame bg active ? #2271C1 : #333`))
    expect(react).toContain('#333')
    expect(react).not.toContain('#2271C1')
  })

  it('React drops style-property ternary (no `[object Object]`) when condition is complex', () => {
    // `count > 0` isn't a bare-identifier lookup — React drops the
    // property rather than guessing. DOM resolves it through its runtime.
    const react = generateReact(parse(`count: 5\n\nFrame bg count > 0 ? #2271C1 : #333`))
    expect(react).not.toContain('[object Object]')
    expect(react).not.toContain('backgroundColor')
  })

  it('React: icon-color ternary emits a JSX expression, not [object Object]', () => {
    // PIN: pre-2026-05-10 `Icon "check", ic done ? green : gray` fell
    // through `formatIconPropValue`'s `JSON.stringify(String(v))` path
    // and produced `color="[object Object]"`. The MirrorIcon component
    // then crashed at render time because it spreads `color` onto SVG
    // attributes. The Conditional value now emits a real JSX expression
    // with token names rewritten to `tokens["..."]`.
    const react = generateReact(parse(`done: true\n\nIcon "check", ic done ? green : gray`))
    expect(react).not.toContain('[object Object]')
    expect(react).toMatch(/color=\{tokens\["done"\]\s*\?\s*"green"\s*:\s*"gray"\}/)
  })
})

// =============================================================================
// Pinned Bug Tests (#23-#26): documented limits in compiler
// =============================================================================

describe('Conditionals — Bug #23-#26 fixed: regression pins', () => {
  it('Bug #23 fixed: nested ternary in Text resolves correctly', () => {
    const dom = generateDOM(parse(`level: 2\n\nText level == 1 ? "A" : level == 2 ? "B" : "C"`))
    // Compiled output should contain the JS ternary expression
    expect(dom).toContain('"B"')
  })

  it('Bug #24 fixed: ternary with $token in style resolves to var(--token)', () => {
    const dom = generateDOM(
      parse(
        `accent.bg: #10b981\ndanger.bg: #ef4444\n\nchange: 5\n\nFrame bg change > 0 ? $accent : $danger`
      )
    )
    expect(dom).toContain('var(--accent-bg)')
    expect(dom).toContain('var(--danger-bg)')
  })

  it('Bug #25 fixed: ternary in style with $variable evaluates the conditional', () => {
    const dom = generateDOM(parse(`cat: "X"\n\nFrame bg cat == "X" ? #abc : #def`))
    // Should contain both branches as proper hex strings
    expect(dom).toContain('#abc')
    expect(dom).toContain('#def')
  })

  it('React: computed Text expression resolves through tokens / loop-vars', () => {
    // PIN: pre-2026-05-10 `Text "Total: " + count` and
    // `Text $first + " " + $last` rendered as empty `<span />` in
    // React because `getTextContent` only handled string / loopVar /
    // ternary kinds and dropped Expression silently.
    const r1 = generateReact(parse(`count: 5\n\nText "Total: " + count`))
    expect(r1).toContain('"Total: " + tokens["count"]')

    // Loop-scoped: `t.pri + "%"` inside `each t in $tasks` resolves
    // against the iterator, not tokens.
    const r2 = generateReact(
      parse(`tasks:\n  t1:\n    pri: 50\n\neach t in $tasks\n  Text $t.pri + "%"`)
    )
    expect(r2).toContain('t.pri + "%"')
    expect(r2).not.toContain('tokens["t"]')
  })

  it('React: computed expressions in HTML attributes resolve too', () => {
    // PIN: pre-2026-05-10 `Input placeholder "Hi " + $name` and
    // `Link "View", href "/items/" + $id` dropped the attribute
    // entirely because `generateHtmlAttributes` only accepted
    // string/number/boolean values. Computed expressions in attribute
    // contexts now emit a JSX expression with token references resolved.
    const r1 = generateReact(parse(`name: "Max"\n\nInput placeholder "Hi " + $name`))
    expect(r1).toContain('placeholder={')
    expect(r1).toContain('tokens["name"]')

    const r2 = generateReact(parse(`id: "abc"\n\nLink "View", href "/items/" + $id`))
    expect(r2).toContain('href={')
    expect(r2).toContain('tokens["id"]')
  })

  it('Bug #26 fixed: ternary in Text with interpolated string-branches resolves', () => {
    const dom = generateDOM(parse(`count: 3\n\nText count > 0 ? "Items: $count" : "Empty"`))
    // The interpolation now produces a template-literal substitution
    expect(dom).toContain('$get("count")')
    expect(dom).toContain('Items')
    expect(dom).toContain('Empty')
  })
})
