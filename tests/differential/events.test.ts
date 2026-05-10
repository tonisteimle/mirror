/**
 * Events — Differential Testing (Schicht 4)
 *
 * Documentation: docs/archive/concepts/events-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'EV1: onclick', src: `Button "X", onclick toast("Hi")` },
  { name: 'EV2: onhover', src: `Frame onhover toast("X")\n  Text "X"` },
  { name: 'EV3: onfocus', src: `Input onfocus toast("F")` },
  { name: 'EV5: onkey enter', src: `Input onkeydown(enter) toast("Y")` },
]

describe('Events — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Events — DOM emits addEventListener calls', () => {
  it("onclick → addEventListener('click', …)", () => {
    const dom = generateDOM(parse(`Button "X", onclick toast("Hi")`))
    expect(dom).toContain("addEventListener('click'")
  })

  it("onhover → addEventListener('mouseenter', …)", () => {
    const dom = generateDOM(parse(`Frame onhover toast("X")\n  Text "X"`))
    expect(dom).toContain("addEventListener('mouseenter'")
  })

  it('onkeydown(enter) → keydown listener with enter-filter', () => {
    const dom = generateDOM(parse(`Input onkeydown(enter) toast("Y")`))
    expect(dom).toContain("addEventListener('keydown'")
    expect(dom).toMatch(/['"]Enter['"]/)
  })
})

// =============================================================================
// React event handlers — pure browser-API wiring (no Mirror runtime needed)
// =============================================================================

describe('Events — React emits inline JSX event handlers', () => {
  // PIN: side-effect-only actions (toast/copy/openUrl/back/forward/scroll)
  // translate to plain browser APIs in React. State-mutating actions
  // (increment/set/toggle) emit a no-op comment until the React state
  // runtime lands — generated code stays syntactically valid either way.

  it('onclick toast → onClick={() => { window.alert(...) }}', () => {
    const react = generateReact(parse(`Button "X", onclick toast("Hi")`))
    expect(react).toMatch(/onClick=\{\(\)\s*=>\s*\{\s*window\.alert\("Hi"\)\s*\}\}/)
  })

  it('onclick copy → navigator.clipboard.writeText', () => {
    const react = generateReact(parse(`Button "X", onclick copy("Hello")`))
    expect(react).toContain('navigator.clipboard?.writeText("Hello")')
  })

  it('onclick openUrl → window.open with _blank tab', () => {
    const react = generateReact(parse(`Button "X", onclick openUrl("https://example.com")`))
    expect(react).toContain(`window.open("https://example.com", '_blank')`)
  })

  it("onhover → onMouseEnter (Mirror's mouseenter mapping)", () => {
    const react = generateReact(parse(`Frame onhover toast("X")\n  Text "X"`))
    expect(react).toMatch(/onMouseEnter=\{\(\)\s*=>/)
  })

  it('onkeydown(enter) → onKeyDown with e.key === "Enter" filter', () => {
    const react = generateReact(parse(`Input onkeydown(enter) toast("Y")`))
    expect(react).toMatch(/onKeyDown=\{\(e\)\s*=>/)
    expect(react).toContain('e.key === "Enter"')
  })

  it('multiple onkeydown bindings coalesce into a single onKeyDown handler', () => {
    const src = `Input onkeydown(enter) toast("E")\n  onkeydown(escape) toast("X")`
    const react = generateReact(parse(src))
    // Only one onKeyDown attribute on the element.
    const matches = react.match(/onKeyDown=/g) ?? []
    expect(matches.length).toBe(1)
    // Both key-filter branches present.
    expect(react).toContain('e.key === "Enter"')
    expect(react).toContain('e.key === "Escape"')
  })

  it('unsupported actions emit a no-op comment, not garbage', () => {
    // `increment` needs a React state runtime — until that lands, the
    // generated handler must still be valid JS, not a parse error.
    const react = generateReact(parse(`count: 0\n\nButton "X", onclick increment(count)`))
    expect(react).toMatch(/onClick=\{\(\)\s*=>\s*\{[^}]*increment[^}]*\}\}/)
    expect(
      () => new Function(`(${react.match(/onClick=\{([^}]+\})\}/)?.[1] || '() => {}'})`)
    ).not.toThrow()
  })
})
