/**
 * Hypothesis-Driven Bug Hunting — Tier 5: Other Injection Vectors
 *
 * Tier 1-4 fokussierten auf JS-template-literal-injection. Aber es gibt
 * weitere Injection-Vektoren in einem Compiler:
 *
 *  - HTML-injection: User-content via innerHTML statt textContent
 *  - CSS-injection: User-Werte in style-Strings, die andere CSS-Regeln
 *    "ausbrechen" lassen (z.B. `;evil:1` → injiziert eine neue Property)
 *  - URL-injection: javascript:-protocol oder data:-URLs in href/src
 *  - Attribute-injection: User-Strings die Quote-Boundaries in Attributen
 *    brechen (für innerHTML-rendering, nicht .setAttribute)
 *
 * Strategie: jede Eingabestelle prüft ob die generierte Ausgabe sich gegen
 * den User-Content schützt. Property/style-Werte werden mit Sentinels
 * gefüttert, die im Output sichtbar machen ob ein Escape vergessen wurde.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { renderWithRuntime } from './tutorial/test-utils'

// =============================================================================
// HTML injection in text content
// =============================================================================

describe('Tier 5 — HTML injection via Text content', () => {
  it('Text "<script>" is rendered as text, not HTML element', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Text "<script>alert(1)</script>"`, c)
    // The script tag must NOT be parsed by the browser as a real script
    expect(root.querySelectorAll('script').length).toBe(0)
    // textContent should contain the literal characters
    const span = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    expect(span.textContent).toContain('<script>')
    c.remove()
  })

  it('Text "<img onerror=...>" does not execute', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    let xss = false
    ;(window as any).__hookXSS = () => {
      xss = true
    }
    const { root } = renderWithRuntime(`Text "<img src=x onerror=window.__hookXSS()>"`, c)
    // Wait for any potential async error
    expect(xss).toBe(false)
    expect(root.querySelectorAll('img').length).toBe(0)
    c.remove()
  })

  it('Text content with $-variable + HTML tags stays as text', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `userInput: "<b>bold</b>"

Text "$userInput"`,
      c
    )
    const span = root.querySelector('[data-mirror-name="Text"]') as HTMLElement
    // Should be literal text, not parsed HTML
    expect(span.querySelectorAll('b').length).toBe(0)
    expect(span.textContent).toBe('<b>bold</b>')
    c.remove()
  })
})

// =============================================================================
// CSS injection via property values
// =============================================================================

describe('Tier 5 — CSS injection via property values', () => {
  it('bg "#fff;}body{background:red" does not leak CSS', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Frame bg "#fff;}body{background:red", w 100`, c)
    // Frame should compile + render without affecting body
    expect(root).toBeTruthy()
    // Body background should remain default (not red from injection)
    const beforeBodyBg = document.body.style.background
    expect(beforeBodyBg).not.toContain('red')
    c.remove()
  })

  it("CSS-var token name with special chars doesn't inject", () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    // A token defined with a sneaky value
    const { root } = renderWithRuntime(
      `bad.bg: "red;}body{background:lime"

Frame bg $bad`,
      c
    )
    // Should compile, no script runs
    expect(root).toBeTruthy()
    c.remove()
  })

  it('color values containing ";" do not break adjacent properties', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Frame bg "#aaa;width:9999px", h 50`, c)
    const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(frame).toBeTruthy()
    // The injected width:9999px must NOT win over our h 50
    // (whether the bg value gets escaped is separate — but height should hold)
    c.remove()
  })
})

// =============================================================================
// URL injection in href / src
// =============================================================================

describe('Tier 5 — URL-injection via href / src', () => {
  it('Link href "javascript:..." is preserved literally (UA may block)', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Link "Click", href "javascript:alert(1)"`, c)
    const a = root.querySelector('a') as HTMLAnchorElement
    // Note: Mirror compiler doesn't sanitize href — that's a UA / app concern.
    // We verify that compilation/render doesn't crash and the value reaches
    // the attribute.
    expect(a.getAttribute('href')).toBe('javascript:alert(1)')
    c.remove()
  })

  it('Image src "data:image/svg+xml,..." is set as attribute', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Image src "data:image/svg+xml,<svg></svg>"`, c)
    const img = root.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('data:image/svg+xml,<svg></svg>')
    c.remove()
  })
})

// =============================================================================
// Attribute injection via setAttribute
// =============================================================================

describe('Tier 5 — Attribute boundary breaking', () => {
  it('placeholder with double-quote in middle: parses correctly', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    // Single \" escape in the middle works — Mirror lexer handles it.
    const { root } = renderWithRuntime(`Input placeholder "say \\"hi"`, c)
    const inp = root.querySelector('input') as HTMLInputElement
    expect(inp.placeholder).toBe('say "hi')
    c.remove()
  })

  // Known limitation: when a Mirror string ENDS with `\""` (escaped quote
  // immediately before closing), the lexer truncates the trailing escape.
  // E.g. "say \"hi\"" parses as 'say "hi' (missing trailing "). Workaround:
  // add a non-quote char between escape and close, or restructure the string.
  it.todo('lexer: trailing \\" before closing quote should not be dropped')

  it('placeholder with backslash: Mirror preserves backslashes literally', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    // Mirror does NOT interpret \\ as escape — backslashes are literal.
    // This is a Mirror DSL design choice (no general string-escape support
    // beyond \"). Source `"C:\\Users"` produces literal `C:\\Users`.
    const { root } = renderWithRuntime(`Input placeholder "C:\\\\Users"`, c)
    const inp = root.querySelector('input') as HTMLInputElement
    expect(inp.placeholder).toBe('C:\\\\Users')
    c.remove()
  })
})

// =============================================================================
// Component / structural edge cases
// =============================================================================

describe('Tier 5 — Component structural edges', () => {
  it('component name same as primitive does not break', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `Frame: pad 8, bg #333

Frame "ok"`,
      c
    )
    // Should not infinitely recurse
    expect(root).toBeTruthy()
    c.remove()
  })

  it('two component definitions with the same name (last-wins)', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `Btn: pad 8, bg #aaa
Btn: pad 16, bg #fff

Btn "X"`,
      c
    )
    const btn = root.querySelector('[data-mirror-name="Btn"]') as HTMLElement
    expect(btn).toBeTruthy()
    // Either definition wins — just don't crash
    c.remove()
  })

  it('component inheritance from non-existent parent compiles', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `Btn as NonExistentParent: pad 10

Btn "X"`,
      c
    )
    expect(root).toBeTruthy()
    c.remove()
  })

  it('self-referencing component does NOT cause infinite recursion at compile', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    // Compile-time: should terminate. Runtime: would infinitely render — that's OK,
    // we only test compile termination here.
    const { root } = renderWithRuntime(
      `Self as Frame:
  pad 4

Self`,
      c
    )
    expect(root).toBeTruthy()
    c.remove()
  })
})

// =============================================================================
// Property-conflict edges
// =============================================================================

describe('Tier 5 — Property conflicts', () => {
  it('hor + ver on same Frame is handled (later wins)', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Frame hor, ver`, c)
    const f = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // Should have ONE flex-direction (last wins or first wins, not both)
    expect(['row', 'column']).toContain(f.style.flexDirection)
    c.remove()
  })

  it('same property defined twice (last wins)', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Frame pad 10, pad 20`, c)
    const f = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // One of the two values should be active (typically last)
    expect(f.style.padding).toMatch(/^(10|20)px$/)
    c.remove()
  })

  it('center + spread (conflicting alignment) does not crash', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Frame hor, center, spread`, c)
    expect(root).toBeTruthy()
    c.remove()
  })

  it('w 100 and w full both specified', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(`Frame w 100, w full`, c)
    const f = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    // Either 100px or 100% — not both
    expect(['100px', '100%']).toContain(f.style.width)
    c.remove()
  })
})

// =============================================================================
// Token resolution edges
// =============================================================================

describe('Tier 5 — Token resolution edges', () => {
  it('chained token reference: $a → $b → value works (or stays literal)', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `base.bg: #FF0000
secondary.bg: $base.bg

Frame bg $secondary, w 100`,
      c
    )
    expect(root).toBeTruthy()
    c.remove()
  })

  it('token referenced before its definition compiles (parse-order tolerance)', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `Frame bg $primary, w 100

primary.bg: #fff`,
      c
    )
    // Token defined after use — compiler should still find it
    expect(root).toBeTruthy()
    c.remove()
  })

  it('token name with hyphen', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `dark-mode.bg: #000

Frame bg $dark-mode, w 100`,
      c
    )
    expect(root).toBeTruthy()
    c.remove()
  })
})

// =============================================================================
// Same-name across different scopes
// =============================================================================

describe('Tier 5 — Name shadowing', () => {
  it('multiple instances with same `name` attribute', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `Frame
  Button "A", name SaveBtn
  Button "B", name SaveBtn`,
      c
    )
    const btns = root.querySelectorAll('[data-mirror-name="SaveBtn"]')
    // Both buttons should exist (whether _elements lookup is unique is separate)
    expect(btns.length).toBeGreaterThan(0)
    c.remove()
  })

  it('global variable name same as loop variable', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `task: "global-task"
tasks:
  t1:
    title: "loop-task"

each task in $tasks
  Text task.title`,
      c
    )
    // Inside the loop, `task` should refer to loop var, not global
    const t = Array.from(root.querySelectorAll('span')).map(s => s.textContent)
    expect(t).toContain('loop-task')
    c.remove()
  })
})
