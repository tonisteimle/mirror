/**
 * Hypothesis-Driven Bug Hunting — Tier 4: String-Injection in mehr Kontexten
 *
 * Pattern aus Tier 1+2: User-Strings mit `${...}` sind ein Bug-Hot-Spot,
 * sobald sie in Template-Literal-Kontext landen. Tier 1 hat textContent
 * abgedeckt. Diese Datei testet alle ANDEREN Stellen, wo User-Strings in
 * generierten Code wandern können.
 *
 * Strategie: ein Test pro Eingabe-Kanal. Für jeden prüfen wir:
 *   (a) Compile-Output ist valides JS (`new Function()` wirft nicht)
 *   (b) Bei Ausführung wird der Injection-Marker NICHT ausgeführt
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function compile(src: string): string {
  return generateDOM(parse(src))
}

/**
 * Compile + run in a sandbox. Returns:
 *  - validJS: parses without SyntaxError
 *  - executes: ran without throwing (mocks may catch errors though)
 *  - injected: true iff the injection marker was triggered at runtime
 */
function compileAndExecute(src: string): {
  validJS: boolean
  executes: boolean
  injected: boolean
  code: string
} {
  const code = compile(src)
  const stripped = code.replace(/^export\s+function/gm, 'function')
  let validJS = true
  let executes = false
  const result = { injected: false }
  try {
    const mockEl = (): any => ({
      style: {},
      dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      removeAttribute() {},
      getAttribute() {
        return null
      },
      appendChild() {},
      addEventListener() {},
      removeEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      textContent: '',
      innerHTML: '',
      children: [],
      hasAttribute() {
        return false
      },
    })
    const fakeDoc: any = {
      createElement: () => mockEl(),
      addEventListener() {},
      head: mockEl(),
      body: mockEl(),
    }
    const fakeWindow: any = { __injectionMarker: result }
    const fn = new Function('window', 'document', stripped + '\nreturn createUI();')
    fn(fakeWindow, fakeDoc)
    executes = true
  } catch (e: any) {
    if (e.name === 'SyntaxError') validJS = false
  }
  return { validJS, executes, injected: result.injected, code }
}

// =============================================================================
// H20 — Property values with ${...} in token reference
// =============================================================================

describe('H20 — Token VALUE with ${...} content', () => {
  it('token value contains ${...} — does not execute as JS', () => {
    const src = `evil.bg: "\${window.__injectionMarker.injected = true; ''}"

Frame bg $evil`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })
})

// =============================================================================
// H21 — bind variable name edge cases
// =============================================================================

describe('H21 — bind with edge variable names', () => {
  it('bind to deep dotted path compiles', () => {
    const r = compileAndExecute(`user:
  email: ""

Input bind user.email`)
    expect(r.validJS).toBe(true)
  })

  it('bind to non-existent variable does not crash compilation', () => {
    const r = compileAndExecute(`Input bind doesNotExist`)
    expect(r.validJS).toBe(true)
  })
})

// =============================================================================
// H22 — Conditional branch content with ${...}
// =============================================================================

describe('H22 — String content with ${...} inside if-block', () => {
  it('if-block Text "${injection}" is escaped', () => {
    const src = `flag: true

if flag
  Text "before \${window.__injectionMarker.injected = true; ''} after"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })

  it('else-block Text "${injection}" is escaped', () => {
    const src = `flag: false

if flag
  Text "ok"
else
  Text "got \${window.__injectionMarker.injected = true; ''} here"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })

  it('nested-if Text "${injection}" is escaped', () => {
    const src = `a: true
b: true

if a
  if b
    Text "deep \${window.__injectionMarker.injected = true; ''} here"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })
})

// =============================================================================
// H23 — Token definition with `${...}` in the value
// =============================================================================

describe('H23 — Token value with backtick-like content', () => {
  it('token value with literal backticks compiles', () => {
    const r = compileAndExecute(`label.text: "say \\\`hi\\\`"`)
    expect(r.validJS).toBe(true)
  })
})

// =============================================================================
// H24 — Inline event action with string argument containing ${...}
// =============================================================================

describe('H24 — Event action with ${...} string argument', () => {
  it('toast("${injection}") does not execute as JS', () => {
    // Note: We test by compile+execute; if `toast(...)` is called with a string
    // that gets put into a template literal, the ${...} inside would fire.
    const src = `Button "click", onclick toast("hi \${window.__injectionMarker.injected = true; ''} bye")`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    // NOTE: even if injected at compile-time, the event handler only runs on click.
    // We only verify validJS here. (Click-trigger tested elsewhere.)
  })
})

// =============================================================================
// H31 — href attribute with ${...}
// =============================================================================

describe('H31 — href with ${...} (URL injection)', () => {
  it('Link href "${injection}" does not execute', () => {
    const src = `Link "Click", href "javascript:\${window.__injectionMarker.injected = true; ''}"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })

  it('Link href stays literal (not interpolated)', () => {
    const src = `Link "C", href "https://example.com/?\${1+1}"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    // The ${1+1} should NOT be evaluated to "2" — it should stay as literal
    // string in the href attribute.
    expect(r.code).not.toContain("'https://example.com/?2'")
  })
})

// =============================================================================
// H32 — src attribute with ${...}
// =============================================================================

describe('H32 — src with ${...}', () => {
  it('Image src "${injection}" does not execute', () => {
    const src = `Image src "/img/\${window.__injectionMarker.injected = true; ''}.jpg"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })
})

// =============================================================================
// H33 — placeholder with ${...}
// =============================================================================

describe('H33 — placeholder with ${...}', () => {
  it('Input placeholder "${injection}" does not execute', () => {
    const src = `Input placeholder "type \${window.__injectionMarker.injected = true; ''} here"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })
})

// =============================================================================
// H34 — Each-loop with mixed string in template
// =============================================================================

describe('H34 — Each-loop Text with ${...} alongside loop var', () => {
  it('Text "$item.name + ${injection}" is escaped', () => {
    const src = `items:
  i1:
    name: "A"

each item in $items
  Text "got \$item.name and \${window.__injectionMarker.injected = true; ''} done"`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })
})

// =============================================================================
// H35 — Where clause with string comparison
// =============================================================================

describe('H35 — Where filter with string comparison', () => {
  it('where field == "${injection}" does not execute', () => {
    const src = `tasks:
  t1:
    label: "x"
    status: "open"

each task in $tasks where task.status == "\${window.__injectionMarker.injected = true; ''}"
  Text task.label`
    const r = compileAndExecute(src)
    expect(r.validJS).toBe(true)
    expect(r.injected).toBe(false)
  })
})
