/**
 * Fuzz: Full Pipeline (Thema 19)
 *
 * Bestehende `fuzz.test.ts` deckt Lexer + Validator gegen Crashes ab
 * (454 generierte Tests). Dieses File schließt die Lücke: **IR-
 * Transformation und DOM-Generation** dürfen ebenfalls niemals throwen,
 * wenn der Parser einen syntaktisch validen AST liefert.
 *
 * Strategie: Valid Mirror-Snippets erzeugen (mit Mutationen) und durch
 * die volle Pipeline schicken: parse → toIR → generateDOM. Wenn Parse
 * keine Errors liefert, müssen IR und DOM ohne Exception laufen.
 *
 * Skala: 1000 random Inputs pro Test-Block, deterministisch via seed.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

// ===========================================================================
// Deterministic random
// ===========================================================================

let seed = 24680
function rng(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
function ri(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}
function pick<T>(arr: T[]): T {
  return arr[ri(0, arr.length - 1)]
}

// Ensures the full pipeline never throws on valid-parsed input
function runPipeline(src: string): { parseErrors: number; threw: boolean; error?: any } {
  let ast: ReturnType<typeof parse>
  try {
    ast = parse(src)
  } catch (e) {
    return { parseErrors: -1, threw: true, error: e }
  }
  // Skip inputs the parser rejected — fuzz-on-invalid is fuzz.test.ts territory
  if (ast.errors.length > 0) return { parseErrors: ast.errors.length, threw: false }

  try {
    const ir = toIR(ast, true)
    generateDOM(ast)
    expect(ir).toBeTruthy()
    return { parseErrors: 0, threw: false }
  } catch (e) {
    return { parseErrors: 0, threw: true, error: e }
  }
}

// ===========================================================================
// Pool: Valid Mirror snippets
// ===========================================================================

const PRIMITIVES = ['Frame', 'Text', 'Button', 'Input', 'Image', 'Icon', 'Link']
const PROPS_NUM = ['w', 'h', 'pad', 'mar', 'gap', 'fs', 'rad', 'bor']
const PROPS_COLOR = ['bg', 'col', 'boc']
const PROPS_LAYOUT = ['hor', 'ver', 'center', 'spread', 'wrap']
const COLORS = ['#fff', '#000', '#2271C1', '#ef4444', 'white', 'black']
const STRINGS = ['"Hello"', '"World"', '"Test"', '"x"', '""', '"über"']

function genElement(depth: number = 0, maxDepth: number = 3): string {
  const indent = '  '.repeat(depth)
  const prim = pick(PRIMITIVES)
  const parts: string[] = [prim]
  if (prim === 'Text' || prim === 'Button' || prim === 'Link') {
    parts.push(' ' + pick(STRINGS))
  }
  // 0–3 properties
  const propCount = ri(0, 3)
  const usedProps = new Set<string>()
  for (let i = 0; i < propCount; i++) {
    const ptype = ri(0, 2)
    let pname: string
    let pval: string
    if (ptype === 0) {
      pname = pick(PROPS_NUM)
      pval = ' ' + ri(0, 200)
    } else if (ptype === 1) {
      pname = pick(PROPS_COLOR)
      pval = ' ' + pick(COLORS)
    } else {
      pname = pick(PROPS_LAYOUT)
      pval = ''
    }
    if (usedProps.has(pname)) continue
    usedProps.add(pname)
    parts.push(', ' + pname + pval)
  }
  let result = indent + parts.join('')
  // 0–3 children if prim is a container
  if (depth < maxDepth && prim === 'Frame') {
    const childCount = ri(0, 3)
    for (let i = 0; i < childCount; i++) {
      result += '\n' + genElement(depth + 1, maxDepth)
    }
  }
  return result
}

function genComponent(): string {
  const name = pick(['Btn', 'Card', 'Box', 'Custom'])
  return `${name}: pad ${ri(0, 30)}, bg ${pick(COLORS)}\n${genElement(0, 1)}`
}

function genTokens(): string {
  const tokenName = pick(['primary', 'danger', 'card', 'space'])
  const suffix = pick(['bg', 'col', 'rad'])
  const value = suffix === 'rad' ? ri(0, 20).toString() : pick(COLORS)
  return `${tokenName}.${suffix}: ${value}`
}

function genState(): string {
  const state = pick(['hover', 'active', 'focus', 'disabled'])
  return `Button "X"\n  ${state}:\n    bg ${pick(COLORS)}`
}

function genEach(): string {
  return `items:
  a:
    title: "A"
  b:
    title: "B"

each item in $items
  Text item.title`
}

function genConditional(): string {
  return `flag: ${pick(['true', 'false'])}

if flag
  Text "yes"
else
  Text "no"`
}

// ===========================================================================
// Fuzz tests
// ===========================================================================

describe('Fuzz Pipeline — Random valid elements', () => {
  it('1000 random valid element snippets pass parse → IR → DOM without throw', () => {
    seed = 24680
    let parsed = 0
    let pipelineErrors = 0
    for (let i = 0; i < 1000; i++) {
      const src = genElement(0, 3)
      const r = runPipeline(src)
      if (r.parseErrors === 0) parsed++
      if (r.threw) {
        pipelineErrors++
        // First error: log for debug, then fail
        throw new Error(
          `Pipeline crashed on input #${i}:\n${src}\n\nError: ${(r.error as Error)?.message}`
        )
      }
    }
    // At least 80% should parse successfully (mutations might break syntax)
    expect(parsed).toBeGreaterThan(800)
    expect(pipelineErrors).toBe(0)
  })
})

describe('Fuzz Pipeline — Random component definitions', () => {
  it('500 random component definitions never crash IR/DOM', () => {
    seed = 13579
    for (let i = 0; i < 500; i++) {
      const src = genComponent()
      const r = runPipeline(src)
      if (r.threw) {
        throw new Error(
          `Pipeline crashed on input #${i}:\n${src}\n\nError: ${(r.error as Error)?.message}`
        )
      }
    }
  })
})

describe('Fuzz Pipeline — Random token definitions', () => {
  it('500 random token definitions never crash IR/DOM', () => {
    seed = 99887
    for (let i = 0; i < 500; i++) {
      const src = genTokens() + '\n' + genElement(0, 1)
      const r = runPipeline(src)
      if (r.threw) {
        throw new Error(
          `Pipeline crashed on input #${i}:\n${src}\n\nError: ${(r.error as Error)?.message}`
        )
      }
    }
  })
})

describe('Fuzz Pipeline — States, each, conditionals', () => {
  it('200 random state-blocks compile through full pipeline', () => {
    seed = 11111
    for (let i = 0; i < 200; i++) {
      const r = runPipeline(genState())
      expect(r.threw).toBe(false)
    }
  })

  it('200 each-loops compile through full pipeline', () => {
    seed = 22222
    for (let i = 0; i < 200; i++) {
      const r = runPipeline(genEach())
      expect(r.threw).toBe(false)
    }
  })

  it('200 conditionals compile through full pipeline', () => {
    seed = 33333
    for (let i = 0; i < 200; i++) {
      const r = runPipeline(genConditional())
      expect(r.threw).toBe(false)
    }
  })
})

// ===========================================================================
// Extreme structures
// ===========================================================================

describe('Fuzz Pipeline — Extreme structures', () => {
  it('deep nesting (20 levels) does not crash IR/DOM', () => {
    let src = ''
    for (let depth = 0; depth < 20; depth++) {
      src += '  '.repeat(depth) + 'Frame\n'
    }
    src += '  '.repeat(20) + 'Text "leaf"'
    const r = runPipeline(src)
    expect(r.threw).toBe(false)
  })

  it('very wide structure (50 siblings) does not crash IR/DOM', () => {
    let src = 'Frame\n'
    for (let i = 0; i < 50; i++) {
      src += `  Text "child-${i}"\n`
    }
    const r = runPipeline(src)
    expect(r.threw).toBe(false)
  })

  it('long Text content (10000 chars) does not crash IR/DOM', () => {
    const longStr = 'a'.repeat(10000)
    const src = `Text "${longStr}"`
    const r = runPipeline(src)
    expect(r.threw).toBe(false)
  })

  it('many properties on single element (30 props) does not crash IR/DOM', () => {
    const propBuf: string[] = ['Frame']
    for (let i = 0; i < 30; i++) {
      propBuf.push(`pad ${i % 100}`)
    }
    // dedup pad — only the last wins. Use varied properties:
    const src = `Frame w 100, h 100, bg #2271C1, col white, pad 12, mar 8, gap 4, rad 6,
  fs 14, weight 500, opacity 0.9, hidden, scroll, clip, hor, center,
  spread, wrap, grow, shrink, w 200`
    const r = runPipeline(src)
    expect(r.threw).toBe(false)
  })

  it('unicode in strings does not crash IR/DOM', () => {
    const samples = [
      'Text "über"',
      'Text "🎉🎊🎈"',
      'Text "中文"',
      'Text "العربية"',
      'Text "ниже"',
      'Text "ç̃ã̃ñ̃õ̃ñ̃"',
    ]
    for (const src of samples) {
      const r = runPipeline(src)
      expect(r.threw).toBe(false)
    }
  })
})

// ===========================================================================
// Regressions
// ===========================================================================

describe('Fuzz Pipeline — Regression cases', () => {
  it('mixed each + if + state does not crash', () => {
    const src = `tasks:
  t1:
    title: "A"
    done: true
  t2:
    title: "B"
    done: false

flag: true

if flag
  each task in $tasks
    Frame pad 8
      Text task.title
      hover:
        bg #333`
    const r = runPipeline(src)
    expect(r.threw).toBe(false)
  })

  it('component with nested slots + tokens + states does not crash', () => {
    const src = `primary.bg: #2271C1

Card: bg $primary, pad 16, rad 8
  Title: fs 16, col white
  Footer: hor, gap 8

Card
  Title "X"
  Footer
    Button "OK"
      hover:
        bg #444`
    const r = runPipeline(src)
    expect(r.threw).toBe(false)
  })
})
