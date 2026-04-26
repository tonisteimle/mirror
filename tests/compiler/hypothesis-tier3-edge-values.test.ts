/**
 * Hypothesis-Driven Bug Hunting — Tier 3: Edge Values
 *
 * Pathological inputs that test the compiler's robustness to user content:
 * - Special characters (quotes, backslashes, newlines, unicode)
 * - Numeric edges (0, negative, very large, decimal)
 * - Reference edges (undefined vars, deep paths, circular)
 * - Structural edges (deep nesting, many siblings, empty)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { renderWithRuntime } from './tutorial/test-utils'

function compile(src: string): string {
  return generateDOM(parse(src))
}

function compileAndRun(src: string): { code: string; valid: boolean } {
  const code = compile(src)
  const stripped = code.replace(/^export\s+function/gm, 'function')
  try {
    new Function(stripped)
    return { code, valid: true }
  } catch {
    return { code, valid: false }
  }
}

// =============================================================================
// H12 — Strings with special characters
// =============================================================================

describe('H12 — Special chars in strings', () => {
  it('text with double-quote escape', () => {
    const r = compileAndRun(`Text "say \\"hello\\""`)
    expect(r.valid).toBe(true)
  })

  it('text with backslash literal', () => {
    const r = compileAndRun(`Text "path\\\\file"`)
    expect(r.valid).toBe(true)
  })

  it('text with newline escape', () => {
    const r = compileAndRun(`Text "line1\\nline2"`)
    expect(r.valid).toBe(true)
  })

  it('text with tab escape', () => {
    const r = compileAndRun(`Text "col1\\tcol2"`)
    expect(r.valid).toBe(true)
  })

  it('text with unicode chars', () => {
    const r = compileAndRun(`Text "über 你好 🎉"`)
    expect(r.valid).toBe(true)
  })

  it('text with all kinds of quotes', () => {
    const r = compileAndRun(`Text "she said \\"hi\\" with 'air' quotes"`)
    expect(r.valid).toBe(true)
  })

  it('text with emoji ZWJ sequence', () => {
    const r = compileAndRun(`Text "👨‍👩‍👧‍👦"`)
    expect(r.valid).toBe(true)
  })

  it('text with right-to-left language (Arabic)', () => {
    const r = compileAndRun(`Text "العربية"`)
    expect(r.valid).toBe(true)
  })

  it('text with a single literal $ sign', () => {
    // "$$" is the documented escape for literal $
    const r = compileAndRun(`Text "Pay $$100 now"`)
    expect(r.valid).toBe(true)
  })

  it('text with template-literal-like syntax (XSS attempt)', () => {
    let xss = false
    const c = document.createElement('div')
    document.body.appendChild(c)
    try {
      const code = compile(`name: "x"

Text "before \${(()=>{xssFired=true; return ''})()} \$name"`)
      const stripped = code.replace(/^export\s+function/gm, 'function')
      const win: any = { xssFired: false }
      const fn = new Function('window', 'xssFired', stripped)
      fn(win, undefined)
      xss = win.xssFired === true
    } catch {
      // Compilation/run errors are acceptable; only XSS firing is the failure
    }
    expect(xss).toBe(false)
    c.remove()
  })
})

// =============================================================================
// H13 — Numeric edges
// =============================================================================

describe('H13 — Numeric edge values', () => {
  it('Frame w 0 compiles', () => {
    const r = compileAndRun(`Frame w 0, h 0`)
    expect(r.valid).toBe(true)
  })

  it('Frame with negative pad compiles', () => {
    const r = compileAndRun(`Frame pad -10`)
    expect(r.valid).toBe(true)
  })

  it('Frame with very large w compiles', () => {
    const r = compileAndRun(`Frame w 99999, h 99999`)
    expect(r.valid).toBe(true)
  })

  it('opacity with decimal compiles', () => {
    const r = compileAndRun(`Frame opacity 0.5`)
    expect(r.valid).toBe(true)
  })

  it('opacity 0 (fully transparent)', () => {
    const r = compileAndRun(`Frame opacity 0`)
    expect(r.valid).toBe(true)
  })

  it('opacity 1 (fully opaque)', () => {
    const r = compileAndRun(`Frame opacity 1`)
    expect(r.valid).toBe(true)
  })

  it('rotate negative angle', () => {
    const r = compileAndRun(`Frame rotate -45`)
    expect(r.valid).toBe(true)
  })

  it('z-index negative', () => {
    const r = compileAndRun(`Frame z -1`)
    expect(r.valid).toBe(true)
  })
})

// =============================================================================
// H14 — Reference edges
// =============================================================================

describe('H14 — Reference edges', () => {
  it('reference to undefined token is non-fatal', () => {
    const r = compileAndRun(`Frame bg $undefinedToken, w 100`)
    // Should compile (token reference may be passed through as-is)
    expect(r.valid).toBe(true)
  })

  it('reference to undefined data variable in Text', () => {
    const r = compileAndRun(`Text "hello \$missingVar"`)
    expect(r.valid).toBe(true)
  })

  it('deeply nested data reference (4 levels)', () => {
    const r = compileAndRun(`config:
  app:
    nav:
      title:
        text: "App"

Text "\$config.app.nav.title.text"`)
    expect(r.valid).toBe(true)
  })

  it('reference to non-existent path component crashes gracefully', () => {
    const r = compileAndRun(`config:
  a:
    b: "yes"

Text "\$config.x.y.z"`)
    // Compiles — runtime should return undefined, not crash
    expect(r.valid).toBe(true)
  })
})

// =============================================================================
// H15 — Structural edges
// =============================================================================

describe('H15 — Structural edges', () => {
  it('20-level deep nesting compiles', () => {
    let src = ''
    for (let i = 0; i < 20; i++) src += '  '.repeat(i) + 'Frame\n'
    src += '  '.repeat(20) + 'Text "deepest"'
    const r = compileAndRun(src)
    expect(r.valid).toBe(true)
  })

  it('100 siblings compile', () => {
    let src = 'Frame\n'
    for (let i = 0; i < 100; i++) src += `  Text "child-${i}"\n`
    const r = compileAndRun(src)
    expect(r.valid).toBe(true)
  })

  it('Frame with 30+ properties compiles', () => {
    const r = compileAndRun(
      `Frame w 200, h 100, bg #2271C1, col white, pad 12, gap 8, rad 6, bor 1, boc #444, fs 14, weight 500, opacity 0.9, z 1, mar 8, hor, center, spread, wrap, grow`
    )
    expect(r.valid).toBe(true)
  })

  it('component with 10+ slots compiles', () => {
    let src = `Card: pad 16\n`
    for (let i = 0; i < 10; i++) src += `  Slot${i}: fs 12\n`
    src += `\nCard\n`
    for (let i = 0; i < 10; i++) src += `  Slot${i} "value-${i}"\n`
    const r = compileAndRun(src)
    expect(r.valid).toBe(true)
  })
})

// =============================================================================
// H16 — Component naming edges
// =============================================================================

describe('H16 — Component naming edges', () => {
  it('component with single-letter name', () => {
    const r = compileAndRun(`X: pad 4

X "ok"`)
    expect(r.valid).toBe(true)
  })

  it('component with very long name', () => {
    const longName = 'My' + 'X'.repeat(50) + 'Component'
    const r = compileAndRun(`${longName}: pad 4

${longName} "ok"`)
    expect(r.valid).toBe(true)
  })

  it('two components with similar but distinct names', () => {
    const r = compileAndRun(`Btn: pad 8
Button2: pad 12

Btn "A"
Button2 "B"`)
    expect(r.valid).toBe(true)
  })
})

// =============================================================================
// H17 — Token name edges
// =============================================================================

describe('H17 — Token naming edges', () => {
  it('token with deep dot-path', () => {
    const r = compileAndRun(`theme.colors.primary.bg: #2271C1

Frame bg $theme.colors.primary`)
    expect(r.valid).toBe(true)
  })

  it('token with numeric suffix in name', () => {
    const r = compileAndRun(`gray100.bg: #fafafa
gray900.bg: #111

Frame bg $gray100`)
    expect(r.valid).toBe(true)
  })

  it('two tokens with same prefix', () => {
    const r = compileAndRun(`primary.bg: #2271C1
primary.col: white
primary.rad: 8

Frame bg $primary, col $primary, rad $primary`)
    expect(r.valid).toBe(true)
  })
})

// =============================================================================
// H18 — Empty / minimal Mirror programs
// =============================================================================

describe('H18 — Empty/minimal programs', () => {
  it('completely empty program compiles', () => {
    const r = compileAndRun(``)
    expect(r.valid).toBe(true)
  })

  it('only-whitespace program', () => {
    const r = compileAndRun(`   \n  \n   `)
    expect(r.valid).toBe(true)
  })

  it('only-comment program', () => {
    const r = compileAndRun(`// just a comment\n// and another`)
    expect(r.valid).toBe(true)
  })

  it('only-tokens program', () => {
    const r = compileAndRun(`primary.bg: #2271C1
secondary.bg: #999`)
    expect(r.valid).toBe(true)
  })

  it('only-component-defs program', () => {
    const r = compileAndRun(`Card: pad 16
Btn: pad 8`)
    expect(r.valid).toBe(true)
  })
})

// =============================================================================
// H19 — Same name in different scopes
// =============================================================================

describe('H19 — Same identifier across scopes', () => {
  it('component name shadowed by data variable', () => {
    const r = compileAndRun(`Btn: pad 8

btn: "click me"

Btn "use"`)
    expect(r.valid).toBe(true)
  })

  it('variable in each-loop shadows global with same name', () => {
    const r = compileAndRun(`task: "outer"
tasks:
  t1:
    title: "inner"

each task in $tasks
  Text task.title`)
    expect(r.valid).toBe(true)
  })
})
