/**
 * Lexer Number Suffix Tests
 *
 * Deckt die Tokenisierung von CSS-typischen Number-Suffixen ab:
 *   %  ·  s, ms  ·  vh, vw, vmin, vmax  ·  Aspect-Fraction (16/9)
 *
 * Diese Tests fixieren das Verhalten von consumeNumberSuffixes() —
 * vorher gab es zwar Code-Pfade dafür, aber kaum direkte Tests.
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../compiler/parser/lexer'

// Filter EOF/NEWLINE für übersichtlichere Assertions
function tokens(source: string) {
  return tokenize(source).filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
}

// Helper: Erwarte genau einen NUMBER-Token mit gegebenem Wert
function expectSingleNumber(source: string, expected: string) {
  const result = tokens(source)
  expect(result.length).toBe(1)
  expect(result[0].type).toBe('NUMBER')
  expect(result[0].value).toBe(expected)
}

// ============================================================================
// PERCENTAGE
// ============================================================================

describe('Lexer Number Suffix: Percentage', () => {
  it('50%', () => expectSingleNumber('50%', '50%'))
  it('100%', () => expectSingleNumber('100%', '100%'))
  it('0%', () => expectSingleNumber('0%', '0%'))
  it('0.5%', () => expectSingleNumber('0.5%', '0.5%'))
  it('1.5%', () => expectSingleNumber('1.5%', '1.5%'))
  it('-50%', () => expectSingleNumber('-50%', '-50%'))
  it('-0.5%', () => expectSingleNumber('-0.5%', '-0.5%'))
})

// ============================================================================
// TIME UNITS (s, ms)
// ============================================================================

describe('Lexer Number Suffix: Time units', () => {
  it('1s', () => expectSingleNumber('1s', '1s'))
  it('60s', () => expectSingleNumber('60s', '60s'))
  it('0.5s', () => expectSingleNumber('0.5s', '0.5s'))
  it('200ms', () => expectSingleNumber('200ms', '200ms'))
  it('500ms', () => expectSingleNumber('500ms', '500ms'))
  it('-0.5s', () => expectSingleNumber('-0.5s', '-0.5s'))
  it('-200ms', () => expectSingleNumber('-200ms', '-200ms'))

  // Word-boundary check: a unit is only consumed if NOT followed by a
  // letter/digit. This avoids surprising "partial" matches like
  // `100sec` → `100s` + `ec` (Old greedy behavior would silently glue
  // a wrong unit onto the number; new behavior keeps the whole identifier
  // visible so the user sees what they typed.)
  it('100sec does NOT consume "s" — unit followed by letter, returned as identifier', () => {
    const result = tokens('100sec')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '100' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'sec' })
  })

  it('100msec does NOT consume "ms" — unit followed by letter, returned as identifier', () => {
    const result = tokens('100msec')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '100' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'msec' })
  })
})

// ============================================================================
// VIEWPORT UNITS (vh, vw, vmin, vmax)
// ============================================================================

describe('Lexer Number Suffix: Viewport units', () => {
  it('100vh', () => expectSingleNumber('100vh', '100vh'))
  it('100vw', () => expectSingleNumber('100vw', '100vw'))
  it('50vmin', () => expectSingleNumber('50vmin', '50vmin'))
  it('50vmax', () => expectSingleNumber('50vmax', '50vmax'))
  it('0vh', () => expectSingleNumber('0vh', '0vh'))
  it('0.5vh', () => expectSingleNumber('0.5vh', '0.5vh'))

  it('-100vh (negative + suffix)', () => expectSingleNumber('-100vh', '-100vh'))
  it('-50vmin', () => expectSingleNumber('-50vmin', '-50vmin'))

  it('100v (no h/w/m suffix) splits as NUMBER + IDENTIFIER "v"', () => {
    const result = tokens('100v')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '100' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'v' })
  })

  it('100vmix (vm but neither vmin nor vmax) splits as NUMBER + IDENTIFIER "vmix"', () => {
    const result = tokens('100vmix')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '100' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'vmix' })
  })

  // Word-boundary check: `vh` followed by another letter (`p`) is
  // ambiguous garbage — refuse to consume `vh`, emit `100` + `vhpx` so
  // the user sees the bad token whole instead of getting `100vh px`.
  it('100vhpx does NOT consume "vh" — unit followed by letter, returned as identifier', () => {
    const result = tokens('100vhpx')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '100' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'vhpx' })
  })

  it('2vh1 does NOT consume "vh" — unit followed by digit, splits cleanly', () => {
    const result = tokens('2vh1')
    // No clean split — `vh1` is just an identifier that happens to have
    // a digit at the end. The lexer doesn't try to re-tokenize identifiers.
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '2' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'vh1' })
  })
})

// ============================================================================
// ASPECT RATIO FRACTION (16/9)
// ============================================================================

describe('Lexer Number Suffix: Aspect-ratio fraction', () => {
  it('16/9', () => expectSingleNumber('16/9', '16/9'))
  it('4/3', () => expectSingleNumber('4/3', '4/3'))
  it('1/1', () => expectSingleNumber('1/1', '1/1'))
  it('21/9', () => expectSingleNumber('21/9', '21/9'))
  it('16.5/9 (decimal numerator allowed)', () => expectSingleNumber('16.5/9', '16.5/9'))
  it('16/0 (lexer does not validate division-by-zero)', () => expectSingleNumber('16/0', '16/0'))

  it('16/-9 (negative denominator splits as 16, /, -9)', () => {
    // peekNext after / is '-', not digit → fraction NOT consumed in scanNumber
    const result = tokens('16/-9')
    expect(result.length).toBe(3)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '16' })
    expect(result[1]).toMatchObject({ type: 'SLASH', value: '/' })
    expect(result[2]).toMatchObject({ type: 'NUMBER', value: '-9' })
  })

  it('16/abc (non-digit denominator splits as 16, /, identifier)', () => {
    const result = tokens('16/abc')
    expect(result.length).toBe(3)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '16' })
    expect(result[1]).toMatchObject({ type: 'SLASH', value: '/' })
    expect(result[2]).toMatchObject({ type: 'IDENTIFIER', value: 'abc' })
  })
})

// ============================================================================
// SUFFIX COMBINATIONS
// ============================================================================
//
// Aktuelles Verhalten: alle vier Suffix-Slots (%, s/ms, viewport, fraction)
// sind unabhängig, d.h. theoretisch konsumiert der Lexer ALLE in dieser
// Reihenfolge falls sie hintereinander kommen. Das ist Implementierungs-
// Detail und sollte hier dokumentiert werden.

describe('Lexer Number Suffix: Combinations', () => {
  it('100% (just percent)', () => expectSingleNumber('100%', '100%'))
  it('100s (just seconds)', () => expectSingleNumber('100s', '100s'))

  it('100%s (percent + s consumed in same number token)', () => {
    // Documents current behavior: independent if-blocks consume both.
    expectSingleNumber('100%s', '100%s')
  })

  it('100sms — word-boundary refuses "s" (followed by letter), whole identifier returned', () => {
    // Word-boundary check: `s` is rejected because `m` follows; then the
    // unit table can't match `sms` either. Result: `100` + `sms` so the
    // user sees the unintended unit whole.
    const result = tokens('100sms')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '100' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'sms' })
  })
})

// ============================================================================
// NON-SUPPORTED NOTATIONS (Documentation)
// ============================================================================
//
// Der Lexer unterstützt KEIN scientific (1e10), Hex-Number-Literal (0xff)
// oder Binary-Literal (0b101). Hier dokumentieren wir das aktuelle Verhalten.

describe('Lexer Number Suffix: Non-supported notations', () => {
  it('1e10 splits as NUMBER + IDENTIFIER (no scientific notation)', () => {
    const result = tokens('1e10')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '1' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'e10' })
  })

  it('0xff splits as NUMBER + IDENTIFIER (no hex literal)', () => {
    const result = tokens('0xff')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '0' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'xff' })
  })

  it('0b101 splits as NUMBER + IDENTIFIER (no binary literal)', () => {
    const result = tokens('0b101')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '0' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'b101' })
  })
})
