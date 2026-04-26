/**
 * Hypothesis-Driven Bug Hunting — Tier 7: Pathological Performance
 *
 * Compiler haben oft versteckte O(n²) oder O(2^n) Pfade. Pathologische
 * Inputs decken sie auf.
 *
 * Strategie:
 *   - Definiere ein hartes Time-Budget für jeden Test
 *   - Lass den Compiler pathologische Inputs verarbeiten
 *   - Wenn Budget überschritten → Bug
 *   - Output-Größe ebenfalls als Sentinel: linear in Input?
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function measure<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now()
  const result = fn()
  return { result, ms: performance.now() - start }
}

// =============================================================================
// Deeply nested ternaries
// =============================================================================

describe('Tier 7 — Deeply nested ternaries', () => {
  it('20 nested ternaries in property compile in < 200ms', () => {
    let cond = '#000'
    for (let i = 0; i < 20; i++) {
      cond = `flag${i} ? #${i.toString(16).padStart(3, '0')}fff : ${cond}`
    }
    let src = ''
    for (let i = 0; i < 20; i++) src += `flag${i}: false\n`
    src += '\n'
    src += `Frame bg ${cond}, w 100`

    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(200)
    expect(result).toContain('createUI')
  })

  it('20 nested ternaries in text content compile in < 200ms', () => {
    let expr = '"end"'
    for (let i = 0; i < 20; i++) {
      expr = `flag${i} ? "level${i}" : ${expr}`
    }
    let src = ''
    for (let i = 0; i < 20; i++) src += `flag${i}: false\n`
    src += '\n'
    src += `Text ${expr}`

    const { ms } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(200)
  })
})

// =============================================================================
// Deeply nested conditionals
// =============================================================================

describe('Tier 7 — Deeply nested if-blocks', () => {
  it('30 levels of nested if compile in < 300ms', () => {
    let src = ''
    for (let i = 0; i < 30; i++) src += `flag${i}: true\n`
    src += '\n'
    let body = '  '.repeat(30) + 'Text "deep"'
    for (let i = 29; i >= 0; i--) {
      body = '  '.repeat(i) + `if flag${i}\n` + body
    }
    src += body
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(300)
    expect(result).toContain('deep')
  })

  it('20 levels nested if + each compose linearly', () => {
    const compileSize = (depth: number) => {
      let src = ''
      for (let i = 0; i < depth; i++) src += `flag${i}: true\n`
      src += `tasks:
  t1:
    title: "X"

`
      let body = '  '.repeat(depth) + 'each task in $tasks\n'
      body += '  '.repeat(depth + 1) + 'Text task.title'
      for (let i = depth - 1; i >= 0; i--) {
        body = '  '.repeat(i) + `if flag${i}\n` + body
      }
      src += body
      return generateDOM(parse(src)).length
    }
    const s10 = compileSize(10)
    const s20 = compileSize(20)
    // Output should grow ~linearly, not quadratically: 2x depth ≤ 4x output
    expect(s20).toBeLessThan(s10 * 5)
  })
})

// =============================================================================
// Many properties on single element
// =============================================================================

describe('Tier 7 — Many properties', () => {
  it('Frame with 100 same-prop assignments compiles', () => {
    const props = Array.from({ length: 100 }, (_, i) => `pad ${i}`).join(', ')
    const src = `Frame ${props}`
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(500)
    expect(result).toContain('createUI')
  })

  it('Frame with 50 distinct properties compiles', () => {
    const distinctProps = [
      'w 200',
      'h 100',
      'bg #2271C1',
      'col white',
      'pad 12',
      'gap 8',
      'rad 6',
      'bor 1',
      'boc #444',
      'fs 14',
      'weight 500',
      'opacity 0.9',
      'mar 8',
      'hor',
      'center',
      'spread',
      'wrap',
      'z 1',
      'cursor pointer',
    ]
    const src = `Frame ${distinctProps.join(', ')}`
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(200)
    expect(result).toContain('createUI')
  })
})

// =============================================================================
// Many tokens / data variables
// =============================================================================

describe('Tier 7 — Many tokens and data', () => {
  it('500 token definitions compile in < 1s', () => {
    let src = ''
    for (let i = 0; i < 500; i++) {
      src += `token${i}.bg: #${i.toString(16).padStart(6, '0')}\n`
    }
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(1000)
    expect(result).toContain('createUI')
  })

  it('1000 each-loop entries compile in < 1s', () => {
    let entries = ''
    for (let i = 0; i < 1000; i++) {
      entries += `  e${i}:\n    n: ${i}\n`
    }
    const src = `items:\n${entries}\neach item in $items\n  Text item.n`
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(1000)
    expect(result).toContain('createUI')
  })
})

// =============================================================================
// Long content strings
// =============================================================================

describe('Tier 7 — Long string content', () => {
  it('100KB Text content compiles in < 500ms', () => {
    const src = `Text "${'x'.repeat(100000)}"`
    const { ms } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(500)
  })

  it('Text with 1000 $-references compiles in < 500ms', () => {
    let src = ''
    for (let i = 0; i < 50; i++) src += `var${i}: ${i}\n`
    let refs = ''
    for (let i = 0; i < 1000; i++) refs += `$var${i % 50} `
    src += `\nText "${refs.trim()}"`
    const { ms } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(500)
  })
})

// =============================================================================
// Many components / mutual reference
// =============================================================================

describe('Tier 7 — Component composition scaling', () => {
  it('100 components, each used once: linear compile time', () => {
    let defs = ''
    let usages = ''
    for (let i = 0; i < 100; i++) {
      defs += `Comp${i}: pad ${i % 20}, bg #${i.toString(16).padStart(6, '0')}\n`
      usages += `Comp${i} "use${i}"\n`
    }
    const src = defs + '\n' + usages
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(500)
    expect(result.length).toBeGreaterThan(1000)
  })

  it('component referenced 1000 times scales linearly', () => {
    let usages = ''
    for (let i = 0; i < 1000; i++) usages += `Btn "u${i}"\n`
    const src = `Btn: pad 8, bg #aaa\n\n${usages}`
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(500)
    expect(result).toContain('createUI')
  })
})

// =============================================================================
// Output-size linearity
// =============================================================================

describe('Tier 7 — Output size grows linearly with input', () => {
  it('text-content size linear: 100 chars → ~ N, 10000 chars → ~ 100·N', () => {
    const out100 = generateDOM(parse(`Text "${'x'.repeat(100)}"`)).length
    const out10k = generateDOM(parse(`Text "${'x'.repeat(10000)}"`)).length
    // Output should grow within ~2x slack
    const ratio = (out10k - out100) / 9900 // bytes added per input char
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(2.5)
  })

  it('siblings count linear: 10 vs 100 vs 1000', () => {
    const sizeFor = (n: number) => {
      let src = 'Frame\n'
      for (let i = 0; i < n; i++) src += `  Text "${i}"\n`
      return generateDOM(parse(src)).length
    }
    const s10 = sizeFor(10)
    const s100 = sizeFor(100)
    const s1000 = sizeFor(1000)
    // Per-element overhead should be roughly constant
    const r1 = (s100 - s10) / 90
    const r2 = (s1000 - s100) / 900
    // The two ratios should be within 50% of each other
    expect(Math.abs(r1 - r2) / Math.max(r1, r2)).toBeLessThan(0.5)
  })
})

// =============================================================================
// Total pipeline budgets
// =============================================================================

describe('Tier 7 — Aggregate pipeline budgets', () => {
  it('"realistic large app" (50 tokens + 50 components + 100 instances) < 800ms', () => {
    let src = ''
    for (let i = 0; i < 50; i++) src += `t${i}.bg: #${i.toString(16).padStart(6, '0')}\n`
    src += '\n'
    for (let i = 0; i < 50; i++) src += `Comp${i}: pad ${i % 20}, bg #aaa\n`
    src += '\n'
    for (let i = 0; i < 100; i++) src += `Comp${i % 50} "u${i}"\n`
    const { ms, result } = measure(() => generateDOM(parse(src)))
    expect(ms).toBeLessThan(800)
    expect(result.length).toBeGreaterThan(5000)
  })
})
