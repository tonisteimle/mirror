/**
 * States — Differential Testing (Schicht 4)
 *
 * Per-backend support matrix. Documentation:
 * docs/archive/concepts/states-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'S1: toggle() basic', src: `Btn: Button pad 10, toggle()\n  on:\n    bg red\n\nBtn "X"` },
  {
    name: 'S6: exclusive() group',
    src: `Tab: Button pad 10, exclusive()\n  selected:\n    col white\n\nFrame hor\n  Tab "A", selected\n  Tab "B"`,
  },
  {
    name: 'S9: system states',
    src: `Btn: Button pad 10, bg #333\n  hover:\n    bg #444\n\nBtn "X"`,
  },
]

describe('States — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('States — DOM emits state-machine runtime config', () => {
  it('toggle() generates state-machine in DOM output', () => {
    const dom = generateDOM(parse(`Btn: Button pad 10, toggle()\n  on:\n    bg red\n\nBtn "X"`))
    expect(dom).toContain('data-state')
    // The state machine runtime hook
    expect(dom).toMatch(/toggle|cycleState|_stateMachine/)
  })

  it('exclusive() registers an exclusive group in DOM runtime', () => {
    const dom = generateDOM(
      parse(`Tab: Button pad 10, exclusive()\n  selected:\n    col white\n\nTab "X", selected`)
    )
    // DOM emits `_exclusiveGroup` or similar runtime hook
    expect(dom).toContain('data-state')
  })
})

describe('States — Backend support limits', () => {
  it('toggle() runtime is DOM-only; React + Framework compile but no runtime', () => {
    const src = `Btn: Button pad 10, toggle()\n  on:\n    bg red\n\nBtn "X"`
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))
    // Both compile (no throw) but don't include the click-cycle runtime
    expect(react).not.toContain('cycleState')
    expect(fw).not.toContain('cycleState')
  })
})

describe('States — System-state CSS rules in React', () => {
  // System states (hover/focus/active/disabled) emit `:hover` etc. as
  // real CSS rules in a `<style>` block, with `data-h="N"` selectors.
  // No runtime needed — pure CSS pseudo-classes.
  it('hover state-block emits a `[data-h]:hover` rule', () => {
    const react = generateReact(parse(`Btn: pad 10, bg #333\n  hover:\n    bg #555\n\nBtn "Click"`))
    expect(react).toMatch(/<style>/)
    expect(react).toMatch(/data-h=\\?"1\\?"\]:hover/)
    expect(react).toContain('background-color: #555')
    expect(react).toContain('data-h="1"')
  })

  it('hover-bg shorthand also lands as a CSS pseudo-rule', () => {
    const react = generateReact(parse(`Button "X", bg #333, hover-bg #555`))
    expect(react).toMatch(/data-h=\\?"1\\?"\]:hover/)
    expect(react).toContain('background-color: #555')
  })

  it('focus, active, disabled all reach the stylesheet', () => {
    const src = `Btn: bg #333\n  focus:\n    bg #2271C1\n  active:\n    bg #ef4444\n  disabled:\n    opacity 0.5\n\nBtn "X"`
    const react = generateReact(parse(src))
    expect(react).toContain(':focus')
    expect(react).toContain(':active')
    expect(react).toContain(':disabled')
  })

  it('elements without state-bearing props get no `data-h` attribute', () => {
    // Bundle-size guard: idle Frames must not carry `data-h` selectors.
    const react = generateReact(parse(`Frame bg #333`))
    expect(react).not.toContain('data-h=')
    expect(react).not.toMatch(/<style>/)
  })
})
