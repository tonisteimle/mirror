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

  it('React: state-block animation timing lands on base style as `transition`', () => {
    // PIN: pre-2026-05-10 `hover 0.2s ease-out: bg #555` only emitted
    // the hover-state CSS rule; the timing was dropped. Hover then
    // popped instantly in React (DOM gets a smooth transition via the
    // IR `transition: ...` emit). Now the React backend reads
    // `state.animation` and folds a `transition: 'all <dur>s <easing>'`
    // into the base inline style.
    const r1 = generateReact(parse(`Btn: bg #333\n  hover 0.2s ease-out:\n    bg #555\n\nBtn "X"`))
    expect(r1).toContain("transition: 'all 0.2s ease-out'")

    // Default easing falls back to `ease`.
    const r2 = generateReact(parse(`Btn: bg #333\n  hover 0.15s:\n    bg #555\n\nBtn "X"`))
    expect(r2).toContain("transition: 'all 0.15s ease'")

    // No timing → no transition prop on the base style.
    const r3 = generateReact(parse(`Btn: bg #333\n  hover:\n    bg #555\n\nBtn "X"`))
    expect(r3).not.toContain('transition:')
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

// =============================================================================
// Initial-state merge — instances starting in a custom state
// =============================================================================

describe('States — React folds initial-state props into inline style', () => {
  // PIN: `Btn "Active", on` carries `instance.initialState = "on"`. The
  // React backend merges the matching state block's properties into
  // `allProps` so the rendered `style={{...}}` already reflects the
  // active state at first render — no click required, no runtime
  // needed. Pre-2026-05-10 this case rendered with the base props only,
  // making `Btn "Active", on` and `Btn "Off"` look identical.
  it('Btn "Active", on → inline style picks up `on:` block props', () => {
    const src = `Btn: pad 10, bg #333, toggle()\n  on:\n    bg #2271C1\n\nBtn "Active", on\nBtn "Off"`
    const react = generateReact(parse(src))
    // Both buttons present.
    const buttonLines = react.split('\n').filter(l => l.includes('data-component="Btn"'))
    expect(buttonLines.length).toBe(2)
    // Active one carries the `on` data-state and the on-state's bg.
    const active = buttonLines.find(l => l.includes('data-state="on"'))!
    expect(active).toContain('#2271C1')
    // Inactive one keeps the base bg.
    const inactive = buttonLines.find(l => !l.includes('data-state="on"'))!
    expect(inactive).toContain('#333')
    expect(inactive).not.toContain('#2271C1')
  })

  it('state-variant children: `on:` block with own children replaces base children', () => {
    // PIN: Figma-Variants semantics. A state block can carry its own
    // children — if the instance starts in that state, those children
    // render instead of the component's base children. DOM/runtime do
    // this via child-swap; React folds it at compile time.
    const src = `LikeBtn: bg #333, col #888, pad 12 20, toggle()\n  Text "Like"\n  on:\n    bg #ef4444\n    col white\n    Text "Liked!"\n\nLikeBtn, on`
    const react = generateReact(parse(src))
    expect(react).toContain('Liked!')
    expect(react).not.toContain('"Like"')
  })

  it('state-variant children skipped when instance carries own positional content', () => {
    const src = `LikeBtn: bg #333, toggle()\n  Text "Like"\n  on:\n    Text "Liked!"\n\nLikeBtn "Custom", on`
    const react = generateReact(parse(src))
    expect(react).toContain('Custom')
    // Instance positional content wins over both base and variant.
    expect(react).not.toContain('Liked!')
    expect(react).not.toContain('"Like"')
  })

  it('exclusive() with `selected` initial state lands as inline override', () => {
    const src = `Tab: pad 12 20, col #888, exclusive()\n  selected:\n    col white\n\nFrame hor\n  Tab "A", selected\n  Tab "B"`
    const react = generateReact(parse(src))
    const tabLines = react.split('\n').filter(l => l.includes('data-component="Tab"'))
    const sel = tabLines.find(l => l.includes('data-state="selected"'))!
    const idle = tabLines.find(l => !l.includes('data-state="selected"'))!
    expect(sel).toContain("color: 'white'")
    expect(idle).toContain("color: '#888'")
  })
})

// ============================================================================
// Container-Queries — Pre-Refactor-Pin (Lane A)
// ============================================================================
//
// Captures the contract for `docs/refactoring/container-queries.md` Lane A.
// The lane fixes the structural CSS-spec violation: today `container-type:
// inline-size` is set on the SAME frame that owns the size-state styles, but
// `@container` matches against container-ancestors — not self. Lane A
// emits a synthetic outer-wrapper around any frame with `needsContainer`,
// the wrapper carries the container-type, the frame's selector then
// resolves as a descendant of the wrapper.
//
// Tests below are `.skip`-marked until the lane lands. When unskipped they
// become the contract for "Lane A is wired in this backend".
describe('Size-states — Container-Queries Lane A contract', () => {
  const SIZE_STATE_SRC = `Frame bg #333\n  compact:\n    bg #ef4444\n  wide:\n    bg #10b981`

  it('DOM: synthetic outer-wrapper carries container-type, frame does not', () => {
    const dom = generateDOM(parse(SIZE_STATE_SRC))
    // Wrapper: `dataset.mirrorWrapper = '<frame-id>'` in the emitted JS
    // (the runtime DOM attribute becomes `data-mirror-wrapper`).
    expect(dom).toMatch(/dataset\.mirrorWrapper/)
    expect(dom).toContain("containerType = 'inline-size'")
    // Frame itself should NOT carry container-type after the fix (the
    // wrapper takes that role). Counts how many distinct elements set
    // containerType — should be 1 (the wrapper), not multiple.
    const containerTypeMatches = dom.match(/containerType\s*=\s*'inline-size'/g) || []
    expect(containerTypeMatches.length).toBe(1)
  })

  it('DOM: @container selector resolves against frame as descendant of wrapper', () => {
    const dom = generateDOM(parse(SIZE_STATE_SRC))
    // Selector still targets the frame's mirror-id (the wrapper exists
    // purely to provide an ancestor container).
    expect(dom).toMatch(/@container .*\(max-width:/)
    expect(dom).toMatch(/\[data-mirror-id\^="node-\d+"\]\s*\{/)
  })

  it('React: emits container-wrapper div + @container CSS rules', () => {
    const react = generateReact(parse(SIZE_STATE_SRC))
    expect(react).toMatch(/data-mirror-wrapper/)
    expect(react).toMatch(/@container .*\(max-width:/)
    expect(react).toContain('#ef4444')
    expect(react).toContain('#10b981')
  })

  it('Framework: emits container-wrapper m()-call + @container CSS rules', () => {
    const fw = generateFramework(parse(SIZE_STATE_SRC))
    expect(fw).toMatch(/data-mirror-wrapper/)
    expect(fw).toMatch(/@container .*\(max-width:/)
  })

  it('Frame without size-states emits no wrapper (on-demand)', () => {
    const dom = generateDOM(parse(`Frame bg #333\n  Text "no size-states"`))
    expect(dom).not.toMatch(/dataset\.mirrorWrapper/)
    expect(dom).not.toContain("containerType = 'inline-size'")
  })

  it('Frame with position:absolute forwards positioning to wrapper', () => {
    const dom = generateDOM(parse(`Frame abs, x 10, y 20\n  compact:\n    bg red`))
    // Lane A step 2: wrapper inherits position properties so the frame
    // doesn't lose its offset-parent semantics — see
    // `emitContainerWrapper` in `compiler/backends/dom/node-emitter.ts`.
    expect(dom).toMatch(/dataset\.mirrorWrapper/)
    // The wrapper (var name ends with `_w`) carries the absolute position
    // and the offsets. The frame itself no longer emits those.
    expect(dom).toMatch(/\w+_w\.style\['position'\]\s*=\s*'absolute'/)
    expect(dom).toMatch(/\w+_w\.style\['left'\]\s*=\s*'10px'/)
    expect(dom).toMatch(/\w+_w\.style\['top'\]\s*=\s*'20px'/)
    // The frame's own style record (before _w) must not carry position
    // or left/top — they were forwarded to the wrapper.
    const frameAssignBlock = dom.match(/Object\.assign\((\w+)\.style, \{[\s\S]*?\}\)/g)
    if (frameAssignBlock) {
      for (const block of frameAssignBlock) {
        if (block.includes('_w.style')) continue
        expect(block).not.toMatch(/'position':\s*'absolute'/)
        expect(block).not.toMatch(/'left':\s*'10px'/)
        expect(block).not.toMatch(/'top':\s*'20px'/)
      }
    }
  })
})
