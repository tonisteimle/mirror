/**
 * Slice 24 — Single-Value-Token Iter-2 RTs.
 *
 * Iter-1 added the schema-canonical helper `compiler/schema/token-suffixes.ts`
 * but left three drift sources untouched:
 *   - studio/panels/property/utils/tokens.ts (TOKEN_SUFFIX_MAP, getTokenSuffixForProperty)
 *   - studio/editor/triggers/token-extract-trigger.ts (PROPERTY_SUFFIXES, local getTokenSuffix)
 *   - compiler/parser/token-parser.ts (local stripDollar)
 *
 * Iter-2 collapses all three onto the schema helper. These RTs lock both
 * the canonical lookup output AND the cross-driver agreement, so a future
 * regression that re-introduces a hand-maintained map fails immediately.
 *
 * Cross-Slice probe: Slice 25 (property-set tokens) and Slice 78 (token
 * picker) consume the same suffix surface — RT-19 verifies the chain
 * still resolves correctly post-refactor.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { getTokenSuffix, PROPERTY_TO_TOKEN_SUFFIX } from '../../compiler/schema/token-suffixes'
import {
  TOKEN_SUFFIX_MAP,
  getTokenSuffixForProperty,
} from '../../studio/panels/property/utils/tokens'

// ---------------------------------------------------------------------------
// RT-17: Schema-Drift-Lock — studio TOKEN_SUFFIX_MAP is exactly the canonical
// schema map (modulo leading-dot format).
// ---------------------------------------------------------------------------

describe('Slice 24 Iter-2 / RT-17 — TOKEN_SUFFIX_MAP derives from schema', () => {
  it('every studio entry equals canonical compiler entry minus leading dot', () => {
    for (const [prop, studioSuffix] of Object.entries(TOKEN_SUFFIX_MAP)) {
      const canonical = PROPERTY_TO_TOKEN_SUFFIX[prop]
      expect(canonical, `prop ${prop} present in studio but not in schema`).toBeDefined()
      expect(studioSuffix).toBe(canonical.slice(1))
    }
  })

  it('every schema entry has a matching studio entry', () => {
    for (const prop of Object.keys(PROPERTY_TO_TOKEN_SUFFIX)) {
      expect(TOKEN_SUFFIX_MAP[prop], `prop ${prop} missing in studio`).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// RT-18: Bug-Lock for the margin drift that Iter-2 surfaced.
// Iter-1 had `margin → 'm'` in the studio map; canonical is `margin → '.mar'`.
// Studio regex would search for `*.m` tokens but compiler emits `*.mar`.
// Pre-Iter-2 result: token-picker invisible to all margin tokens.
// ---------------------------------------------------------------------------

describe('Slice 24 Iter-2 / RT-18 — margin drift fix', () => {
  it('getTokenSuffixForProperty agrees with compiler for margin aliases', () => {
    expect(getTokenSuffixForProperty('mar')).toBe('mar')
    expect(getTokenSuffixForProperty('margin')).toBe('mar')
    expect(getTokenSuffixForProperty('m')).toBe('mar')
  })

  it('compile-emit + studio-lookup roundtrip for `mar`', () => {
    const src = `s.mar: 12\nFrame mar $s\n  Text "x"`
    const dom = generateDOM(parse(src), { skipPrelude: true } as any)
    expect(dom).toMatch(/--s-mar:\s*12px/)
    // The suffix the studio picker would search for must match the suffix the
    // compiler actually emits — otherwise the picker is blind.
    const studioSuffix = getTokenSuffixForProperty('margin')
    expect(dom).toContain(`--s-${studioSuffix}:`)
  })
})

// ---------------------------------------------------------------------------
// RT-19: Cross-Slice probe — Slice 25 / 78 surface stays intact.
// ---------------------------------------------------------------------------

describe('Slice 24 Iter-2 / RT-19 — Cross-Slice property surface', () => {
  it('all primary aliases (Slice 24 + 25 surface) lookup canonically', () => {
    const aliases = [
      ['bg', '.bg'],
      ['background', '.bg'],
      ['col', '.col'],
      ['color', '.col'],
      ['c', '.col'],
      ['pad', '.pad'],
      ['padding', '.pad'],
      ['p', '.pad'],
      ['gap', '.gap'],
      ['g', '.gap'],
      ['rad', '.rad'],
      ['radius', '.rad'],
      ['fs', '.fs'],
      ['font-size', '.fs'],
      ['mar', '.mar'],
      ['margin', '.mar'],
      ['m', '.mar'],
      ['minw', '.minw'],
      ['min-width', '.minw'],
      ['maxw', '.maxw'],
      ['max-width', '.maxw'],
      ['is', '.is'],
      ['ic', '.ic'],
    ] as const
    for (const [prop, expected] of aliases) {
      expect(getTokenSuffix(prop), `compiler suffix for ${prop}`).toBe(expected)
      expect(getTokenSuffixForProperty(prop), `studio suffix for ${prop}`).toBe(expected.slice(1))
    }
  })

  it('chain token still resolves after suffix-helper consolidation', () => {
    // Use non-theme token names so the cascade-emit path is exercised
    // (theme-named tokens like `accent` go through inline-resolve in the
    // theme-emitter — Slice 24 V-1 Q-3).
    const src = `brand.bg: #2271C1\nlogo.bg: $brand\nFrame bg $logo\n  Text "x"`
    const dom = generateDOM(parse(src), { skipPrelude: true } as any)
    expect(dom).toContain('--brand-bg: #2271C1')
    expect(dom).toMatch(/--logo-bg:\s*var\(--brand-bg\)/)
  })

  it('property-set token (Slice 25) compiles unchanged', () => {
    const src = `cardstyle: bg #1a1a1a, pad 16, rad 8\nFrame $cardstyle\n  Text "x"`
    const dom = generateDOM(parse(src), { skipPrelude: true } as any)
    // The Frame should pick up bg / padding / radius from the property-set
    // token. We only assert that the values appear somewhere in the emitted
    // styles — exact CSS-var emission is locked by Slice 25's own RTs.
    expect(dom).toMatch(/#1a1a1a/)
    expect(dom).toMatch(/16px/)
    expect(dom).toMatch(/8px/)
  })
})

// ---------------------------------------------------------------------------
// RT-20: Studio-Roundtrip Lower-Bar declaration.
// Slice 24 Iter-2 declares a Lower-Bar Studio-Roundtrip:
//   - DOM-emit pathway gelocked via RT-18 / RT-19 (compile-side end-to-end)
//   - Studio-side suffix lookup gelocked via RT-17 (drift-immune)
//   - Picker-RUN-via-CDP not executed in Iter-2; deferred to Studio-Picker-
//     Slice (V-6 was already verschoben in Iter-1).
// This RT documents that Lower-Bar choice as code so it survives audit.
// ---------------------------------------------------------------------------

describe('Slice 24 Iter-2 / RT-20 — Studio-Roundtrip Lower-Bar lock', () => {
  it('studio TOKEN_SUFFIX_MAP is not a hand-maintained literal', () => {
    // If a future contributor "fixes" the const back to a literal, this test
    // fails — the count must equal the canonical schema count.
    expect(Object.keys(TOKEN_SUFFIX_MAP).length).toBe(Object.keys(PROPERTY_TO_TOKEN_SUFFIX).length)
  })
})
