/**
 * Pattern Match — Component Extract Batch Replace
 *
 * Vitest tests for the pure functions in
 * studio/editor/extract/pattern-match.ts. Covers all 12 edge cases
 * from docs/concepts/batch-replace-on-extract.md plus the match-table
 * examples.
 */

import { describe, it, expect } from 'vitest'
import {
  canonicalize,
  linesMatch,
  propertiesMatch,
  findProjectMatches,
  findSegmentMatches,
} from '../../../studio/editor/extract/pattern-match'

// ---------------------------------------------------------------------------
// canonicalize — single-line classification
// ---------------------------------------------------------------------------

describe('canonicalize', () => {
  it('extracts element name + properties', () => {
    const c = canonicalize('Frame pad 16, bg #1a1a1a, rad 8')
    expect(c?.elementName).toBe('Frame')
    expect(c?.leadingString).toBeNull()
    expect(c?.properties.map(p => p.name).sort()).toEqual(['bg', 'pad', 'rad'])
  })

  it('extracts leading content string', () => {
    const c = canonicalize('Text "Hello", col white, fs 14')
    expect(c?.elementName).toBe('Text')
    expect(c?.leadingString).toBe('"Hello"')
  })

  it('returns null for definitions (Name:)', () => {
    expect(canonicalize('Btn: pad 10, bg #333')).toBeNull()
    expect(canonicalize('  Btn: pad 10')).toBeNull()
  })

  it('returns null for `as` definitions', () => {
    expect(canonicalize('PrimaryBtn as Btn: bg #2271C1')).toBeNull()
    expect(canonicalize('MyText as Text: fs 16')).toBeNull()
  })

  it('returns null for blank / comment / non-element lines', () => {
    expect(canonicalize('')).toBeNull()
    expect(canonicalize('   ')).toBeNull()
    expect(canonicalize('// just a comment')).toBeNull()
    expect(canonicalize('hor, gap 12')).toBeNull() // no PascalCase element
    expect(canonicalize('user:')).toBeNull() // not PascalCase, returns null
    expect(canonicalize('cardstyle: bg #1a1a1a, pad 16')).toBeNull()
  })

  it('strips inline comment before matching', () => {
    const c = canonicalize('Frame pad 16, bg #333  // outer card')
    expect(c?.properties.length).toBe(2)
  })

  it('sorts properties alphabetically by name', () => {
    const c = canonicalize('Frame rad 8, pad 16, bg #333')
    expect(c?.properties.map(p => p.name)).toEqual(['bg', 'pad', 'rad'])
  })

  it('classifies value tokens correctly', () => {
    const c = canonicalize('Frame pad 16, bg #2271C1, gap $space')
    const padVal = c?.properties.find(p => p.name === 'pad')!.values
    expect(padVal[0].kind).toBe('number')
    const bgVal = c?.properties.find(p => p.name === 'bg')!.values
    expect(bgVal[0].kind).toBe('hex')
    const gapVal = c?.properties.find(p => p.name === 'gap')!.values
    expect(gapVal[0].kind).toBe('token')
  })

  it('classifies named colors as keyword (not string)', () => {
    const c = canonicalize('Frame bg red, col white')
    const bgVal = c?.properties.find(p => p.name === 'bg')!.values
    expect(bgVal[0].kind).toBe('keyword')
    expect(bgVal[0].raw).toBe('red')
  })

  it('classifies rgba() as function', () => {
    const c = canonicalize('Frame bg rgba(0,0,0,0.5)')
    const bgVal = c?.properties.find(p => p.name === 'bg')!.values
    expect(bgVal[0].kind).toBe('function')
    expect(bgVal[0].raw).toBe('rgba(0,0,0,0.5)')
  })

  it('multi-token value: pad 12 24 → two number tokens', () => {
    const c = canonicalize('Frame pad 12 24')
    const padVal = c?.properties.find(p => p.name === 'pad')!.values
    expect(padVal.length).toBe(2)
    expect(padVal[0].raw).toBe('12')
    expect(padVal[1].raw).toBe('24')
  })

  it('handles standalone keyword properties (no value)', () => {
    const c = canonicalize('Frame hor, gap 12, hidden')
    const hor = c?.properties.find(p => p.name === 'hor')
    expect(hor?.values.length).toBe(0)
    const hidden = c?.properties.find(p => p.name === 'hidden')
    expect(hidden?.values.length).toBe(0)
  })

  it('positional bare values (no name) appear as null-named properties at end', () => {
    const c = canonicalize('Frame 100, 50, #333')
    expect(c?.properties.length).toBe(3)
    // All positional → all null-named, kept in appearance order
    expect(c?.properties.every(p => p.name === null)).toBe(true)
  })

  it('mixed: explicit + positional', () => {
    const c = canonicalize('Frame pad 16, 100, bg #333, 50')
    const named = c?.properties.filter(p => p.name !== null) ?? []
    const positional = c?.properties.filter(p => p.name === null) ?? []
    expect(named.map(p => p.name)).toEqual(['bg', 'pad'])
    expect(positional.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// linesMatch — pair comparison
// ---------------------------------------------------------------------------

describe('linesMatch — Match-Table from concept doc', () => {
  function match(a: string, b: string): boolean {
    const ca = canonicalize(a)
    const cb = canonicalize(b)
    if (!ca || !cb) return false
    return linesMatch(ca, cb)
  }

  it('Icon: same styling, different name → match', () => {
    expect(match('Icon "edit", ic #888, is 24', 'Icon "trash", ic #888, is 24')).toBe(true)
    expect(match('Icon "edit", ic #888, is 24', 'Icon "save", ic #888, is 24')).toBe(true)
  })

  it('Icon: hex differs → no match', () => {
    expect(match('Icon "edit", ic #888, is 24', 'Icon "edit", ic #fff, is 24')).toBe(false)
  })

  it('Icon: number differs → no match', () => {
    expect(match('Icon "edit", ic #888, is 24', 'Icon "edit", ic #888, is 32')).toBe(false)
  })

  it('Icon: token differs → no match', () => {
    expect(match('Icon "edit", ic $primary, is 24', 'Icon "edit", ic $danger, is 24')).toBe(false)
  })

  it('Button: leading string + same color → match', () => {
    expect(match('Button "Save", #2271C1', 'Button "Cancel", #2271C1')).toBe(true)
  })

  it('Button: leading string + different color → no match', () => {
    expect(match('Button "Save", #2271C1', 'Button "Delete", #ef4444')).toBe(false)
  })

  it('Image: src is string → may differ', () => {
    expect(match('Image src "a.jpg", w 200, h 100', 'Image src "b.jpg", w 200, h 100')).toBe(true)
  })

  it('Image: w differs → no match', () => {
    expect(match('Image src "a.jpg", w 200, h 100', 'Image src "a.jpg", w 300, h 100')).toBe(false)
  })

  it('Frame: identical → match', () => {
    expect(match('Frame pad 16, bg #1a1a1a, rad 8', 'Frame pad 16, bg #1a1a1a, rad 8')).toBe(true)
  })

  it('Frame: bg hex differs → no match', () => {
    expect(match('Frame pad 16, bg #1a1a1a, rad 8', 'Frame pad 16, bg #2271C1, rad 8')).toBe(false)
  })

  it('Frame: leading-string mismatch (one has, other not) → no match', () => {
    // Frame doesn't typically have leading content but syntactically possible
    expect(match('Frame pad 16', 'Frame "Hi", pad 16')).toBe(false)
  })

  it('different element names → strict linesMatch is false', () => {
    expect(match('Frame pad 16, bg #333', 'Btn pad 16, bg #333')).toBe(false)
  })
})

describe('propertiesMatch — element-name-agnostic for component-extract', () => {
  function pmatch(a: string, b: string): boolean {
    const ca = canonicalize(a)
    const cb = canonicalize(b)
    if (!ca || !cb) return false
    return propertiesMatch(ca, cb)
  }

  it('different element names but identical props → match (component-extract use case)', () => {
    expect(pmatch('Frame pad 16, bg #333', 'Btn pad 16, bg #333')).toBe(true)
    expect(pmatch('Frame pad 16, bg #333', 'Card pad 16, bg #333')).toBe(true)
  })

  it('properties differ → still no match', () => {
    expect(pmatch('Frame pad 16, bg #333', 'Btn pad 12, bg #333')).toBe(false)
  })

  it('leading-string presence still must match', () => {
    expect(pmatch('Text "Hi"', 'Frame "Hi"')).toBe(true) // both have leading string
    expect(pmatch('Text "Hi", col white', 'Frame col white')).toBe(false) // one has, other not
  })
})

describe('linesMatch — order independence + comments', () => {
  function match(a: string, b: string): boolean {
    return linesMatch(canonicalize(a)!, canonicalize(b)!)
  }

  it('property order independent', () => {
    expect(match('Frame bg #333, pad 16', 'Frame pad 16, bg #333')).toBe(true)
    expect(match('Frame rad 8, bg #333, pad 16', 'Frame pad 16, rad 8, bg #333')).toBe(true)
  })

  it('inline comments stripped', () => {
    expect(match('Frame pad 16  // comment A', 'Frame pad 16  // comment B')).toBe(true)
  })

  it('multi-token values: order matters within value', () => {
    expect(match('Frame pad 12 24', 'Frame pad 12 24')).toBe(true)
    expect(match('Frame pad 12 24', 'Frame pad 24 12')).toBe(false)
  })

  it('whitespace tolerance', () => {
    expect(match('Frame  pad   16', 'Frame pad 16')).toBe(true)
  })

  it('trailing comma tolerated', () => {
    expect(match('Frame pad 16,', 'Frame pad 16')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// findProjectMatches — end-to-end with synthetic project
// ---------------------------------------------------------------------------

describe('findProjectMatches', () => {
  it('finds matches in same and other files, skips target line', () => {
    const fileA = `Frame pad 16, bg #1a1a1a, rad 8
  Text "Alpha"

Frame pad 16, bg #1a1a1a, rad 8
  Text "Beta"`
    const fileB = `Frame pad 16, bg #1a1a1a, rad 8
  Text "Gamma"`
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a, rad 8',
      files: [
        { filename: 'a.mir', source: fileA },
        { filename: 'b.mir', source: fileB },
      ],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    // Expect line 4 in a.mir and line 1 in b.mir (target line 1 in a.mir skipped)
    expect(matches).toHaveLength(2)
    expect(matches[0]).toMatchObject({ filename: 'a.mir', lineNumber: 4 })
    expect(matches[1]).toMatchObject({ filename: 'b.mir', lineNumber: 1 })
  })

  it('skips lines that are already the new component', () => {
    const file = `Frame pad 16, bg #333, rad 8
Card pad 16, bg #333, rad 8
Frame pad 16, bg #333, rad 8`
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame pad 16, bg #333, rad 8',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    // Line 2 is already Card → skip. Line 3 is Frame → match.
    expect(matches).toHaveLength(1)
    expect(matches[0].lineNumber).toBe(3)
  })

  it('positional and explicit forms match (via positional-resolver normalization)', () => {
    const file = `Frame 100, 50, #333
Frame w 100, h 50, bg #333
Frame w 100, h 50, bg #333`
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame 100, 50, #333',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches.map(m => m.lineNumber)).toEqual([2, 3])
  })

  it('Icon variants: different names match, different sizes do not', () => {
    const file = `Icon "edit", ic #888, is 24
Icon "trash", ic #888, is 24
Icon "save", ic #888, is 32
Icon "edit", ic $primary, is 24`
    const matches = findProjectMatches({
      targetReferenceLine: 'Icon "edit", ic #888, is 24',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'MyIcon',
    })
    expect(matches.map(m => m.lineNumber)).toEqual([2])
  })

  it('returns empty array when target reference cannot be canonicalized', () => {
    const matches = findProjectMatches({
      targetReferenceLine: '// just a comment',
      files: [{ filename: 'a.mir', source: 'Frame pad 16' }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(0)
  })

  it('handles large project: no errors, deterministic order', () => {
    const file = Array.from({ length: 50 })
      .map((_, i) => (i % 2 === 0 ? 'Frame pad 16, bg #333' : 'Frame pad 8, bg #fff'))
      .join('\n')
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame pad 16, bg #333',
      files: [{ filename: 'big.mir', source: file }],
      targetFilename: 'big.mir',
      targetLineNumber: 1, // skip first
      componentName: 'Card',
    })
    // 25 lines have `Frame pad 16, bg #333`, target is line 1 → 24 matches
    expect(matches.length).toBe(24)
    // Should be in line order
    const lineNumbers = matches.map(m => m.lineNumber)
    expect(lineNumbers).toEqual([...lineNumbers].sort((a, b) => a - b))
  })

  it('skips definitions and slot lines automatically', () => {
    const file = `Card: pad 16, bg #1a1a1a, rad 8
  Title: col white
  Desc: col #888

Frame pad 16, bg #1a1a1a, rad 8
  Text "X"`
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a, rad 8',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 5,
      componentName: 'Card',
    })
    // The Card: definition line is skipped because `Name:` form returns null.
    // No other matches.
    expect(matches).toHaveLength(0)
  })

  it('skips strings with content like the matching value (false positive guard)', () => {
    const file = `Text "pad 16"
Frame pad 16, bg #333
Text "Frame pad 16, bg #333"`
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame pad 16, bg #333',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 2,
      componentName: 'Card',
    })
    // Text lines have a leading string, target Frame doesn't → no match.
    expect(matches).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Edge cases from concept doc (E1..E12)
// ---------------------------------------------------------------------------

describe('Concept-doc Edge Cases (E1..E12)', () => {
  function match(a: string, b: string): boolean {
    const ca = canonicalize(a)
    const cb = canonicalize(b)
    if (!ca || !cb) return false
    return linesMatch(ca, cb)
  }

  it('E1: positional vs explicit (canonicalized via resolver)', () => {
    // Note: linesMatch operates on already-canonicalized form. The resolver
    // is applied at the project-scan level (findProjectMatches). At
    // canonicalize-only level, positional vs explicit produce different
    // canonical structures (different property names).
    // Verify via findProjectMatches:
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame w 100, h 50, bg #333',
      files: [{ filename: 'a.mir', source: 'Frame 100, 50, #333' }],
      targetFilename: 'a.mir',
      targetLineNumber: 99,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(1)
  })

  it('E2: property order anders → match', () => {
    expect(match('Frame bg #333, pad 16', 'Frame pad 16, bg #333')).toBe(true)
  })

  it('E3: multi-token values (`pad 12 24`)', () => {
    expect(match('Frame pad 12 24', 'Frame pad 12 24')).toBe(true)
    expect(match('Frame pad 12 24', 'Frame pad 24 12')).toBe(false)
  })

  it('E4: tokens with different names → no match', () => {
    expect(match('Frame bg $primary', 'Frame bg $danger')).toBe(false)
  })

  it('E5: inline comments stripped before comparison', () => {
    expect(match('Frame pad 16  // a', 'Frame pad 16  // b')).toBe(true)
  })

  it('E6: whitespace variations normalized', () => {
    expect(match('Frame  pad   16', 'Frame pad 16')).toBe(true)
  })

  it('E7: leading-string mismatch → no match', () => {
    expect(match('Frame pad 16', 'Frame "X", pad 16')).toBe(false)
  })

  it('E8: both have leading string → match (string differs)', () => {
    expect(match('Text "Hi", col white', 'Text "Hello", col white')).toBe(true)
  })

  it('E10: target line in same file is skipped', () => {
    const matches = findProjectMatches({
      targetReferenceLine: 'Frame pad 16',
      files: [{ filename: 'a.mir', source: 'Frame pad 16\nFrame pad 16' }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches.map(m => m.lineNumber)).toEqual([2])
  })
})

// ---------------------------------------------------------------------------
// findSegmentMatches — token-extract batch (segment-level)
// ---------------------------------------------------------------------------

describe('findSegmentMatches', () => {
  it('matches `bg #2271C1` segments across lines / files, skips target', () => {
    const fileA = `Frame bg #2271C1, w 100
Btn pad 10, bg #2271C1, col white
Text col #2271C1`
    const fileB = `Card bg #2271C1, rad 8`
    const matches = findSegmentMatches({
      files: [
        { filename: 'a.mir', source: fileA },
        { filename: 'b.mir', source: fileB },
      ],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      targetProperty: 'bg',
      targetValue: '#2271C1',
    })
    // Target line skipped. col #2271C1 different property → no match.
    expect(matches).toHaveLength(2)
    expect(matches[0].filename).toBe('a.mir')
    expect(matches[0].lineNumber).toBe(2)
    expect(matches[1].filename).toBe('b.mir')
    expect(matches[1].lineNumber).toBe(1)
  })

  it('reports correct columnStart + length for inline replacements', () => {
    const file = `Btn pad 10, bg #2271C1, col white`
    const matches = findSegmentMatches({
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 99,
      targetProperty: 'bg',
      targetValue: '#2271C1',
    })
    expect(matches).toHaveLength(1)
    const m = matches[0]
    // segment "bg #2271C1" starts after "Btn pad 10, " (12 chars)
    expect(file.slice(m.columnStart, m.columnStart + m.length)).toBe('bg #2271C1')
  })

  it('does not match different property name', () => {
    const matches = findSegmentMatches({
      files: [{ filename: 'a.mir', source: `Text col #2271C1` }],
      targetFilename: 'a.mir',
      targetLineNumber: 99,
      targetProperty: 'bg',
      targetValue: '#2271C1',
    })
    expect(matches).toHaveLength(0)
  })

  it('does not match positional value (v1 limit)', () => {
    // `Frame #2271C1` is positional bg — but token-extract batch only
    // matches explicit property syntax. Positional is left alone.
    const matches = findSegmentMatches({
      files: [{ filename: 'a.mir', source: `Frame #2271C1, w 100` }],
      targetFilename: 'a.mir',
      targetLineNumber: 99,
      targetProperty: 'bg',
      targetValue: '#2271C1',
    })
    expect(matches).toHaveLength(0)
  })

  it('does not match similar but different values', () => {
    const matches = findSegmentMatches({
      files: [{ filename: 'a.mir', source: `Frame bg #2271C180, bg #2271C2` }],
      targetFilename: 'a.mir',
      targetLineNumber: 99,
      targetProperty: 'bg',
      targetValue: '#2271C1',
    })
    expect(matches).toHaveLength(0)
  })

  it('strips inline comments before matching', () => {
    const matches = findSegmentMatches({
      files: [{ filename: 'a.mir', source: `Frame bg #2271C1  // primary brand` }],
      targetFilename: 'a.mir',
      targetLineNumber: 99,
      targetProperty: 'bg',
      targetValue: '#2271C1',
    })
    expect(matches).toHaveLength(1)
  })

  it('matches multiple segments on same line', () => {
    // Edge case: same property twice (technically invalid Mirror but
    // we tolerate it for replace purposes)
    const matches = findSegmentMatches({
      files: [{ filename: 'a.mir', source: `Frame bg #2271C1, pad 10, bg #2271C1` }],
      targetFilename: 'a.mir',
      targetLineNumber: 99,
      targetProperty: 'bg',
      targetValue: '#2271C1',
    })
    expect(matches).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// findNearMatches — override mode for Component-Extract Phase C
// ---------------------------------------------------------------------------

import { findNearMatches } from '../../../studio/editor/extract/pattern-match'

describe('findNearMatches', () => {
  it('finds lines with one differing value (the override candidate)', () => {
    const file = `Frame pad 16, bg #1a1a1a, rad 8
Frame pad 16, bg #2271C1, rad 8
Frame pad 16, bg #ef4444, rad 8`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a, rad 8',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(2)
    expect(matches[0].overrides).toEqual([{ name: 'bg', rawValue: '#2271C1' }])
    expect(matches[1].overrides).toEqual([{ name: 'bg', rawValue: '#ef4444' }])
  })

  it('skips exact matches (those go through findProjectMatches)', () => {
    const file = `Frame pad 16, bg #1a1a1a
Frame pad 16, bg #1a1a1a`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(0)
  })

  it('skips lines with different property NAMES (not just values)', () => {
    const file = `Frame pad 16, bg #1a1a1a
Frame pad 16, col white`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(0)
  })

  it('respects max-diffs limit (3)', () => {
    // 4 differing values → not a near match
    const file = `Frame pad 16, bg #1a1a1a, rad 8, gap 12, col white
Frame pad 100, bg #ef4444, rad 99, gap 88, col black`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a, rad 8, gap 12, col white',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(0)
  })

  it('respects 2-diff threshold (still in)', () => {
    const file = `Frame pad 16, bg #1a1a1a, rad 8
Frame pad 16, bg #ef4444, rad 4`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a, rad 8',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(1)
    expect(matches[0].overrides.map(o => o.name).sort()).toEqual(['bg', 'rad'])
  })

  it('skips lines that are already the new component', () => {
    const file = `Frame pad 16, bg #1a1a1a, rad 8
Card pad 16, bg #ef4444, rad 8`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a, rad 8',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    // Card line is already this component → skip even with diff
    expect(matches).toHaveLength(0)
  })

  it('skips lines with positional bare values (too ambiguous)', () => {
    const file = `Frame pad 16, bg #1a1a1a
Frame 100, 50, #1a1a1a`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    // The second line has positional values which after resolver expand
    // to w/h/bg — different property NAME set than target → no match.
    expect(matches).toHaveLength(0)
  })

  it('numeric value differences also count', () => {
    const file = `Frame pad 16, bg #1a1a1a
Frame pad 24, bg #1a1a1a`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(1)
    expect(matches[0].overrides).toEqual([{ name: 'pad', rawValue: '24' }])
  })

  it('different element names but same shape are still near matches', () => {
    const file = `Frame pad 16, bg #1a1a1a
Btn pad 16, bg #ef4444`
    const matches = findNearMatches({
      targetReferenceLine: 'Frame pad 16, bg #1a1a1a',
      files: [{ filename: 'a.mir', source: file }],
      targetFilename: 'a.mir',
      targetLineNumber: 1,
      componentName: 'Card',
    })
    expect(matches).toHaveLength(1)
    expect(matches[0].overrides).toEqual([{ name: 'bg', rawValue: '#ef4444' }])
  })
})
