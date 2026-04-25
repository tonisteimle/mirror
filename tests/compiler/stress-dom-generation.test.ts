/**
 * Stress: DOM Generation (Thema 20)
 *
 * Bestehende `stress-performance.test.ts` benchmarkt parse() + toIR()
 * mit Time-Assertions. **DOM-Generation** war nicht im Stress-Test.
 * Dieses File schließt die Lücke: gleiche Inputs durch volle Pipeline
 * inkl. `generateDOM` mit Performance-Budget.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function measure<T>(fn: () => T): { result: T; ms: number } {
  const start = performance.now()
  const result = fn()
  const ms = performance.now() - start
  return { result, ms }
}

function genInstances(count: number): string {
  return Array.from({ length: count }, (_, i) => `Frame pad ${i}\n  Text "${i}"`).join('\n')
}

function genComponents(count: number): string {
  return Array.from(
    { length: count },
    (_, i) => `Component${i} as Frame:\n  pad ${i + 1}\n  bg #${String(i).padStart(6, '0')}`
  ).join('\n\n')
}

function genTokens(count: number): string {
  return Array.from(
    { length: count },
    (_, i) => `token${i}.bg: #${String(i).padStart(6, '0')}`
  ).join('\n')
}

function genNested(depth: number): string {
  let out = 'Frame\n'
  for (let i = 0; i < depth; i++) out += '  '.repeat(i + 1) + 'Frame\n'
  return out
}

describe('Stress: DOM Generation — Performance Budgets', () => {
  it('generates DOM for 200 instances under 200ms', () => {
    const code = genInstances(200)
    const ast = parse(code)
    const { ms, result } = measure(() => generateDOM(ast))
    console.log(`DOM 200 instances: ${ms.toFixed(2)}ms (${result.length} chars)`)
    expect(ms).toBeLessThan(200)
    expect(result.length).toBeGreaterThan(0)
  })

  it('generates DOM for 500 instances under 400ms', () => {
    const code = genInstances(500)
    const ast = parse(code)
    const { ms } = measure(() => generateDOM(ast))
    console.log(`DOM 500 instances: ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(400)
  })

  it('generates DOM for 50 levels deep under 100ms', () => {
    const code = genNested(50)
    const ast = parse(code)
    const { ms } = measure(() => generateDOM(ast))
    console.log(`DOM 50 levels deep: ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(100)
  })

  it('generates DOM with 100 tokens + 100 components + 100 instances under 500ms', () => {
    const code = `${genTokens(100)}\n\n${genComponents(100)}\n\n${genInstances(100)}`
    const ast = parse(code)
    const { ms, result } = measure(() => generateDOM(ast))
    console.log(`DOM mixed (100/100/100): ${ms.toFixed(2)}ms (${result.length} chars)`)
    expect(ms).toBeLessThan(500)
  })

  it('full pipeline (parse + IR + DOM) for realistic doc under 800ms', () => {
    const code = `${genTokens(50)}\n\n${genComponents(50)}\n\n${genInstances(200)}`
    const { ms } = measure(() => {
      const ast = parse(code)
      return generateDOM(ast)
    })
    console.log(`Full pipeline (50/50/200): ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(800)
  })

  it('large each-loop with 100 entries compiles under 200ms', () => {
    let entries = ''
    for (let i = 0; i < 100; i++) {
      entries += `  e${i}:\n    title: "Entry ${i}"\n`
    }
    const code = `items:\n${entries}\neach item in $items\n  Frame pad 8\n    Text item.title`
    const ast = parse(code)
    const { ms } = measure(() => generateDOM(ast))
    console.log(`Each-loop 100 entries DOM: ${ms.toFixed(2)}ms`)
    expect(ms).toBeLessThan(200)
  })

  it('DOM output stays linear in input size (200 vs 100 instances ratio)', () => {
    const ast100 = parse(genInstances(100))
    const { ms: ms100 } = measure(() => generateDOM(ast100))
    const ast200 = parse(genInstances(200))
    const { ms: ms200 } = measure(() => generateDOM(ast200))
    const ratio = ms200 / Math.max(ms100, 1)
    console.log(
      `Linearity 100→200: ${ms100.toFixed(2)}ms → ${ms200.toFixed(2)}ms (ratio ${ratio.toFixed(2)}x)`
    )
    // Linear pipeline: 2x input ≤ ~3x time (allowance for noise)
    expect(ratio).toBeLessThan(4)
  })
})
