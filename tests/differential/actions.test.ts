/**
 * Actions — Differential Testing (Schicht 4)
 *
 * Documentation: docs/archive/concepts/actions-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'A1: increment', src: `count: 0\n\nButton "X", onclick increment(count)\nText "$count"` },
  { name: 'A3: toast', src: `Button "X", onclick toast("Hi")` },
  {
    name: 'A5: add to collection',
    src: `todos:\n  t1:\n    text: "X"\n\nButton "+", onclick add(todos, text: "New")`,
  },
  { name: 'A8: copy', src: `Button "X", onclick copy("Hi")` },
]

describe('Actions — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Actions — DOM emits action runtime calls', () => {
  it('increment uses setState/_state mutation', () => {
    const dom = generateDOM(parse(`count: 0\n\nButton "X", onclick increment(count)`))
    expect(dom).toMatch(/_state|setState|increment/)
  })

  it('toast emits a runtime toast call', () => {
    const dom = generateDOM(parse(`Button "X", onclick toast("Hi")`))
    // Either a runtime helper or inline logic
    expect(dom).toMatch(/toast|_runtime/)
  })

  it('add() collection mutation emits state change', () => {
    const dom = generateDOM(
      parse(`todos:\n  t1:\n    text: "X"\n\nButton "+", onclick add(todos, text: "New")`)
    )
    expect(dom).toMatch(/_state|setState/)
  })

  it('toggle(ElementName) toggles the named element visibility, not own state-machine', () => {
    // PIN: pre-2026-05-10 `toggle(Menu)` emitted
    // `_runtime.stateMachineToggle(buttonNode, ['Menu'])` — i.e. toggled
    // the *button's* state-machine between `default` and `'Menu'`. User
    // intent is „show/hide the Menu element". PascalCase argument is
    // the discriminator: PascalCase = element name → visibility-toggle,
    // lowercase = state name → cycle-state.
    const dom = generateDOM(
      parse(`Button "Toggle", toggle(Menu)\nFrame name Menu, hidden\n  Text "Hi"`)
    )
    // The button click handler resolves the named element and calls
    // `_runtime.toggle` (visibility helper, not stateMachineToggle).
    expect(dom).toMatch(/_runtime\.toggle\(_elements\['Menu'\]\)/)
    expect(dom).not.toMatch(/stateMachineToggle\([^,]+,\s*\['Menu'\]\)/)
  })

  it('toggle(stateName) keeps state-machine cycling for lowercase args', () => {
    // PIN: lowercase args stay state names — preserves multi-state
    // cycle semantics like `toggle(on, off)`.
    const dom = generateDOM(
      parse(
        `Btn: bg #333, toggle(on, off)\n  on:\n    bg #2271C1\n  off:\n    bg #333\n\nBtn "Click"`
      )
    )
    expect(dom).toMatch(/stateMachineToggle\([^,]+,\s*\['on', 'off'\]\)/)
  })
})
