/**
 * DOM Backend Cross-Cutting (Thema 22)
 *
 * `compiler/backends/dom.ts` (~2094 LOC, 60% Coverage) ist der Orchestrator
 * für alle Sub-Emitters. Bestehende Tests fokussieren sich auf einzelne
 * Features (jeweils einer pro `describe`-Block in `backend-dom.test.ts`,
 * `backend-html-dom-output.test.ts`). Diese Datei deckt **Cross-Cutting-
 * Pfade** ab:
 *
 * - `dataFiles`-Option
 * - Empty / leeres Program
 * - Mehrere Features kombiniert (each + conditional + state + token + slot)
 * - DOM-Output-Format-Stabilität (gültiger JS-Code, keine Syntax-Fehler)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function compiles(src: string): string {
  const ast = parse(src)
  return generateDOM(ast)
}

// =============================================================================
// dataFiles-Option
// =============================================================================

describe('DOM Backend Cross-Cutting — dataFiles option', () => {
  it('compiles without dataFiles option (default)', () => {
    const out = compiles(`Frame
  Text "X"`)
    expect(out).toContain('createUI')
  })

  it('accepts an empty dataFiles array', () => {
    const ast = parse(`Frame`)
    const out = generateDOM(ast, { dataFiles: [] })
    expect(out).toContain('createUI')
  })

  it('accepts a dataFiles entry with entries array', () => {
    // DataFile shape: { filename, entries, methods, errors }
    const ast = parse(`Text "$user.name"`)
    const out = generateDOM(ast, {
      dataFiles: [
        {
          filename: 'users',
          entries: [],
          methods: [],
          errors: [],
        } as any,
      ],
    })
    // Compiles without throw — empty data file is a valid edge case
    expect(out).toContain('createUI')
  })
})

// =============================================================================
// Empty / Edge Cases
// =============================================================================

describe('DOM Backend Cross-Cutting — Empty/Edge inputs', () => {
  it('empty program produces a valid createUI() function', () => {
    const out = compiles('')
    expect(out).toContain('export function createUI')
    // The function must be syntactically closeable
    expect(out).toContain('return _root')
  })

  it('whitespace-only program produces valid output', () => {
    const out = compiles('   \n   \n   ')
    expect(out).toContain('createUI')
  })

  it('comment-only program produces valid output', () => {
    const out = compiles('// just a comment')
    expect(out).toContain('createUI')
  })
})

// =============================================================================
// Combined feature integration
// =============================================================================

describe('DOM Backend Cross-Cutting — Combined features', () => {
  it('each + conditional + token + state work together', () => {
    const out = compiles(`primary.bg: #2271C1

tasks:
  t1:
    title: "A"
    done: true
  t2:
    title: "B"
    done: false

flag: true

if flag
  each task in $tasks
    Frame pad 8, bg $primary
      Text task.title
      hover:
        bg #444`)

    // All four features should leave fingerprints in the output
    expect(out).toContain('createUI')
    expect(out).toContain('forEach') // each-loop
    expect(out).toContain('flag') // conditional
    expect(out).toContain('#2271C1') // token
  })

  it('component + slots + tokens + nested children compile together', () => {
    const out = compiles(`primary.bg: #2271C1

Card: bg $primary, pad 16, rad 8
  Title: fs 16, col white
  Footer: hor, gap 8

Card
  Title "Hello"
  Footer
    Button "OK"
    Button "Cancel"`)

    expect(out).toContain('createUI')
    expect(out).toContain('Hello')
    expect(out).toContain('OK')
    expect(out).toContain('Cancel')
  })

  it('chart + table + state coexist without crash', () => {
    const out = compiles(`tasks:
  t1:
    title: "A"
    val: 5
  t2:
    title: "B"
    val: 3

Bar $tasks, x "title", y "val", w 200, h 100

Table
  TableHeader
    Text "Task"
  each task in $tasks
    TableRow
      Text task.title`)

    expect(out).toContain('createUI')
    expect(out).toContain('_runtime.createChart')
    expect(out).toContain('TableRow')
  })
})

// =============================================================================
// Output format stability
// =============================================================================

describe('DOM Backend Cross-Cutting — Output format', () => {
  it('output is syntactically valid JavaScript (no parse errors)', () => {
    const out = compiles(`Frame gap 8
  Text "Hello"
  Button "OK", toggle()
    on:
      bg #2271C1`)

    // Strip "export" so we can wrap in a Function constructor
    const stripped = out.replace(/^export\s+function/gm, 'function')
    // Test by wrapping in a Function - throws SyntaxError if invalid
    expect(() => new Function(stripped + '\n;return createUI')).not.toThrow()
  })

  it('output includes well-formed createUI signature', () => {
    const out = compiles(`Text "X"`)
    expect(out).toMatch(/export\s+function\s+createUI\s*\(/)
  })

  it('multiple compile calls produce same output (deterministic)', () => {
    const src = `Frame gap 8
  Text "A"
  Text "B"`
    const a = compiles(src)
    const b = compiles(src)
    expect(a).toBe(b)
  })
})
