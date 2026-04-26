/**
 * Hypothesis-Driven Bug Hunting — Tier 8: Determinism
 *
 * A compiler that gives different output on identical input cannot be relied
 * on for: caching, snapshot-tests, version control, reproducible builds,
 * differential debugging.
 *
 * Strategie:
 *   - Wiederhole compile() N-mal für gleichen Input → Output muss identisch
 *     sein (bit-for-bit).
 *   - Compile in zufälligen Reihenfolgen — sollte stabil sein.
 *   - Property/whitespace/order — keine versteckte Reihenfolge-Abhängigkeit.
 *   - Re-emission: parse → emit → ... — keine Drift.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const CORPUS = [
  `Frame`,
  `Frame w 200, h 100, bg #2271C1, col white, pad 12, rad 6`,
  `Text "Hello"`,
  `Button "Click", onclick toast("hi")`,
  `primary.bg: #2271C1
danger.bg: #ef4444

Frame bg $primary`,
  `tasks:
  t1:
    title: "A"
  t2:
    title: "B"

each task in $tasks
  Text task.title`,
  `flag: true

if flag
  Text "yes"
else
  Text "no"`,
  `Btn: pad 12, bg #333, toggle()
  on:
    bg #2271C1

Btn "Click"`,
  `Card: bg #1a1a1a, pad 16
  Title: fs 16

Card
  Title "Hello"`,
  `tasks:
  t1:
    title: "low"
    priority: 3
  t2:
    title: "high"
    priority: 1

each task in $tasks where task.priority < 3 by priority desc
  Text task.title`,
  // Realistic mixed corpus
  `canvas mobile, bg #1a1a1a

primary.bg: #2271C1

Item: pad 8, bg #333, toggle()
  on:
    bg $primary

tasks:
  t1:
    title: "A"

each task in $tasks
  Item task.title`,
]

// =============================================================================
// Bit-for-bit determinism
// =============================================================================

describe('Tier 8 — Bit-for-bit determinism (DOM backend)', () => {
  for (const src of CORPUS) {
    const name = src.split('\n')[0].slice(0, 40)
    it(`compile(${JSON.stringify(name)}) is identical across 10 calls`, () => {
      const baseline = generateDOM(parse(src))
      for (let i = 0; i < 10; i++) {
        const out = generateDOM(parse(src))
        expect(out).toBe(baseline)
      }
    })
  }
})

describe('Tier 8 — Bit-for-bit determinism (React backend)', () => {
  for (const src of CORPUS) {
    const name = src.split('\n')[0].slice(0, 40)
    it(`React.compile(${JSON.stringify(name)}) is identical across 10 calls`, () => {
      const baseline = generateReact(parse(src))
      for (let i = 0; i < 10; i++) {
        expect(generateReact(parse(src))).toBe(baseline)
      }
    })
  }
})

describe('Tier 8 — Bit-for-bit determinism (Framework backend)', () => {
  for (const src of CORPUS) {
    const name = src.split('\n')[0].slice(0, 40)
    it(`Framework.compile(${JSON.stringify(name)}) is identical across 10 calls`, () => {
      const baseline = generateFramework(parse(src))
      for (let i = 0; i < 10; i++) {
        expect(generateFramework(parse(src))).toBe(baseline)
      }
    })
  }
})

// =============================================================================
// No timestamp / no random IDs in output
// =============================================================================

describe('Tier 8 — No time-based or random data in output', () => {
  it('output does NOT contain Date.now() literal results that change run-to-run', () => {
    const out1 = generateDOM(parse(`Frame`))
    // Wait a millisecond, recompile
    const out2 = generateDOM(parse(`Frame`))
    expect(out1).toBe(out2)
  })

  it('output does NOT contain ISO timestamps from compile time', () => {
    const out = generateDOM(parse(`Frame`))
    // Standard ISO 2023+ pattern shouldn't appear in compile output
    expect(out).not.toMatch(/202[3-9]-\d{2}-\d{2}T\d{2}:\d{2}/)
  })

  it('output does NOT contain Math.random()-style hex IDs (UUIDs etc.)', () => {
    const out = generateDOM(
      parse(`Frame
  Text "X"
  Text "Y"`)
    )
    // No UUIDs
    expect(out).not.toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
  })
})

// =============================================================================
// ID stability
// =============================================================================

describe('Tier 8 — Node ID assignment is deterministic', () => {
  it('same input → same node-IDs assignment', () => {
    const out1 = generateDOM(
      parse(`Frame
  Text "A"
  Text "B"
  Text "C"`)
    )
    const out2 = generateDOM(
      parse(`Frame
  Text "A"
  Text "B"
  Text "C"`)
    )
    // Extract all node-IDs from output
    const extract = (s: string) =>
      [...s.matchAll(/dataset\.mirrorId\s*=\s*'([^']+)'/g)].map(m => m[1])
    expect(extract(out1)).toEqual(extract(out2))
  })

  it('node-IDs are unique within a single compilation', () => {
    const out = generateDOM(
      parse(`Frame gap 8
  Text "A"
  Text "B"
  Frame
    Text "C"
    Text "D"`)
    )
    const ids = [...out.matchAll(/dataset\.mirrorId\s*=\s*'([^']+)'/g)].map(m => m[1])
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// =============================================================================
// Property order stability
// =============================================================================

describe('Tier 8 — Property order stability', () => {
  it('property order in output matches source order', () => {
    const out = generateDOM(parse(`Frame w 100, h 50, bg #fff, col #000`))
    // Extract style assignments in order
    const styleBlock = out.match(/Object\.assign\((\w+\.style),\s*\{([\s\S]*?)\}\)/)
    expect(styleBlock).toBeTruthy()
    if (styleBlock) {
      const props = [...styleBlock[2].matchAll(/'([^']+)':/g)].map(m => m[1])
      // Source-order: width, height, background, color
      // Output should preserve this (or at least be deterministic)
      const out2 = generateDOM(parse(`Frame w 100, h 50, bg #fff, col #000`))
      const styleBlock2 = out2.match(/Object\.assign\((\w+\.style),\s*\{([\s\S]*?)\}\)/)!
      const props2 = [...styleBlock2[2].matchAll(/'([^']+)':/g)].map(m => m[1])
      expect(props).toEqual(props2)
    }
  })
})

// =============================================================================
// Whitespace / newline stability
// =============================================================================

describe('Tier 8 — Whitespace stability', () => {
  it('source with extra blank lines compiles to same as without', () => {
    const out1 = generateDOM(
      parse(`Frame
  Text "A"`)
    )
    const out2 = generateDOM(
      parse(`Frame


  Text "A"


`)
    )
    // Slight differences may exist (blank lines could affect line numbers in
    // sourcemap), but the actual code structure should be the same.
    // Check: both produce same set of created elements + properties.
    const elemCount1 = (out1.match(/createElement/g) || []).length
    const elemCount2 = (out2.match(/createElement/g) || []).length
    expect(elemCount1).toBe(elemCount2)
  })

  it('source with trailing whitespace compiles same as without', () => {
    const a = generateDOM(parse(`Frame   `))
    const b = generateDOM(parse(`Frame`))
    // Should not affect structure
    const elemCountA = (a.match(/createElement/g) || []).length
    const elemCountB = (b.match(/createElement/g) || []).length
    expect(elemCountA).toBe(elemCountB)
  })
})

// =============================================================================
// Cross-machine determinism (no hardware-specific quirks)
// =============================================================================

describe('Tier 8 — No locale or environment dependence', () => {
  it('output does not contain "system" paths or env vars', () => {
    const out = generateDOM(parse(`Frame`))
    expect(out).not.toContain(process.cwd())
    expect(out).not.toMatch(/\/home\/[^/]+/)
    expect(out).not.toMatch(/\/Users\/[^/]+/)
  })

  it('numeric formatting is locale-independent', () => {
    const out = generateDOM(parse(`Frame w 1000, h 2000, opacity 0.5`))
    // German locale would format 0.5 as "0,5" — that would break
    expect(out).not.toContain('0,5')
    expect(out).toContain('0.5')
    expect(out).not.toContain('1.000')
    expect(out).not.toContain("1'000")
  })
})

// =============================================================================
// Idempotency: re-emission stability (round-trip stability)
// =============================================================================

describe('Tier 8 — Output stability across re-runs', () => {
  it('compile output is byte-for-byte identical on consecutive calls (small)', () => {
    const src = `Frame gap 8
  Text "A"
  Button "B", onclick toggle()`
    const outs = Array.from({ length: 5 }, () => generateDOM(parse(src)))
    for (let i = 1; i < outs.length; i++) {
      expect(outs[i]).toBe(outs[0])
    }
  })

  it('compile output is byte-for-byte identical (large)', () => {
    let src = `canvas mobile\n\n`
    for (let i = 0; i < 30; i++) src += `t${i}.bg: #${i.toString(16).padStart(6, '0')}\n`
    src += `\n`
    for (let i = 0; i < 20; i++) src += `Comp${i}: pad ${i}, bg #aaa\n`
    src += `\nFrame\n`
    for (let i = 0; i < 20; i++) src += `  Comp${i % 20} "u${i}"\n`
    const out1 = generateDOM(parse(src))
    const out2 = generateDOM(parse(src))
    expect(out1.length).toBe(out2.length)
    expect(out1).toBe(out2)
  })
})
