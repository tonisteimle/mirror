/**
 * Lexer Bug Tests
 *
 * Konzentrierte Tests für vermutete Bugs aus tests/compiler/docs/themen/01-lexer.md.
 * Jeder Test prüft das *erwartete* Verhalten. Schlägt der Test fehl, ist der Bug bestätigt.
 *
 * Wenn ein Test grün ist: Verhalten war doch korrekt — Test bleibt als Regressionsschutz.
 * Wenn ein Test rot ist: Bug bestätigt — Lexer fixen, dann sollte der Test grün werden.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, tokenizeWithErrors } from '../../compiler/parser/lexer'

// ============================================================================
// O1: Lone '&' silently swallowed
// ============================================================================
//
// Hypothese: scanToken case '&' (Z. 299–304) advanced den & und prüft auf zweiten &.
// Wenn kein zweiter & folgt, wird KEIN Token und KEIN Error emittiert — das & wird
// einfach verschluckt.
//
// Erwartet: Entweder ein Token oder ein Error.

describe('Lexer Bug O1: Lone &', () => {
  it('does not silently swallow lone &', () => {
    const result = tokenizeWithErrors('a & b')
    const hasAmpToken = result.tokens.some(t => t.value === '&')
    const hasError = result.errors.length > 0
    expect(hasAmpToken || hasError).toBe(true)
  })

  it('preserves both surrounding identifiers when & is lone', () => {
    const result = tokenizeWithErrors('a & b')
    const ids = result.tokens.filter(t => t.type === 'IDENTIFIER').map(t => t.value)
    expect(ids).toEqual(['a', 'b'])
  })

  it('lone & at end of input is not silently swallowed', () => {
    const result = tokenizeWithErrors('a &')
    const hasAmpToken = result.tokens.some(t => t.value === '&')
    const hasError = result.errors.length > 0
    expect(hasAmpToken || hasError).toBe(true)
  })
})

// ============================================================================
// O2: Lone '|' silently swallowed
// ============================================================================
//
// Hypothese: gleicher Bug wie O1, scanToken case '|' (Z. 306–311).

describe('Lexer Bug O2: Lone |', () => {
  it('does not silently swallow lone |', () => {
    const result = tokenizeWithErrors('a | b')
    const hasPipeToken = result.tokens.some(t => t.value === '|')
    const hasError = result.errors.length > 0
    expect(hasPipeToken || hasError).toBe(true)
  })

  it('preserves both surrounding identifiers when | is lone', () => {
    const result = tokenizeWithErrors('a | b')
    const ids = result.tokens.filter(t => t.type === 'IDENTIFIER').map(t => t.value)
    expect(ids).toEqual(['a', 'b'])
  })

  it('lone | at end of input is not silently swallowed', () => {
    const result = tokenizeWithErrors('a |')
    const hasPipeToken = result.tokens.some(t => t.value === '|')
    const hasError = result.errors.length > 0
    expect(hasPipeToken || hasError).toBe(true)
  })
})

// ============================================================================
// SE2: Inline '--' triggers Section header
// ============================================================================
//
// Hypothese: scanToken Z. 195–198 prüft nicht auf Line-Kontext. Daher wird `Button -- Foo --`
// (mid-line) als IDENTIFIER 'Button' + SECTION 'Foo' tokenisiert. Das bricht Parser-Annahmen,
// weil Section-Header line-level sind.
//
// Erwartet: Inline `--` sollte NICHT als Section interpretiert werden.

describe('Lexer Bug SE2: Inline -- as section', () => {
  it('inline "Button -- Foo --" should NOT produce a SECTION token', () => {
    const result = tokenize('Button -- Foo --')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(0)
  })

  it('"a -- b" should preserve identifier "b"', () => {
    const result = tokenize('a -- b')
    const ids = result.filter(t => t.type === 'IDENTIFIER').map(t => t.value)
    expect(ids).toContain('a')
    expect(ids).toContain('b')
  })

  it('top-of-line "--- Name ---" remains a SECTION', () => {
    // Regression: stelle sicher, dass der Fix Line-Level-Sections nicht bricht
    const result = tokenize('--- Name ---')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(1)
    expect(sections[0].value).toBe('Name')
  })

  it('"--- Name ---" after a NEWLINE remains a SECTION', () => {
    const result = tokenize('Button\n--- Name ---')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(1)
    expect(sections[0].value).toBe('Name')
  })
})

// ============================================================================
// O7: '---5' (drei Minus + Zahl) triggert Section
// ============================================================================
//
// Hypothese: `---5` wird als SECTION '5' tokenisiert. Das ist ungewöhnlich, aber wenn der
// Source z.B. `Button ---5` enthält, wäre das fatal. Hier eigenständiger Line-Level-Test.
//
// Erwartet: `---5` sollte entweder als Section mit Name "5" akzeptiert werden (klar) oder
// als drei MINUS + NUMBER. Inline-Variante: niemals Section.

describe('Lexer Bug O7: ---5 inline triggers section', () => {
  it('inline "a ---5" should NOT produce SECTION', () => {
    const result = tokenize('a ---5')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(0)
  })
})

// ============================================================================
// N11: -100vh verliert Suffix
// ============================================================================
//
// Hypothese: scanNegativeNumber (Z. 626–634) hat keinen Suffix-Pfad. Bei `-100vh`
// wird nur `-100` als Number tokenisiert, `vh` wird zum eigenständigen Identifier.
//
// Erwartet: NUMBER '-100vh' (genau ein Token).

describe('Lexer Bug N11: Negative numbers with suffix', () => {
  it('-100vh should produce NUMBER "-100vh" (single token)', () => {
    const result = tokenize('-100vh').filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('NUMBER')
    expect(result[0].value).toBe('-100vh')
  })

  it('-50% should produce NUMBER "-50%"', () => {
    const result = tokenize('-50%').filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('NUMBER')
    expect(result[0].value).toBe('-50%')
  })

  it('-0.5s should produce NUMBER "-0.5s"', () => {
    const result = tokenize('-0.5s').filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('NUMBER')
    expect(result[0].value).toBe('-0.5s')
  })

  it('-200ms should produce NUMBER "-200ms"', () => {
    const result = tokenize('-200ms').filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('NUMBER')
    expect(result[0].value).toBe('-200ms')
  })

  it('-100 (no suffix) should still produce NUMBER "-100"', () => {
    // Regression
    const result = tokenize('-100').filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('NUMBER')
    expect(result[0].value).toBe('-100')
  })
})

// ============================================================================
// P1: Column-Tracking bei Tab
// ============================================================================
//
// Hypothese: advance() macht `column++` für jeden Char, auch für Tabs. handleIndentation
// rechnet Tabs zwar als 4 Spaces für Indentation, aber Column-Werte für Tokens nach Tab
// sind „visuell" falsch.
//
// Erwartet: Hier dokumentieren wir aktuelles Verhalten. Wenn die Implementation Tab=4
// für Spalten möchte, ist das ein eigener Fix. Im Moment: column-tracking ist
// char-index-basiert, nicht visuell.

describe('Lexer Bug P1: Tab column tracking', () => {
  it('documents that columns are character-index based, not visual', () => {
    // \tA → tab is 1 char. After tab + A: column = 3 (start at 1, +1 tab, +1 A).
    // Visually, A is at column 5 (4-space tab + 1).
    // Aktuell: column = 3 (char-based).
    const tokens = tokenize('\tA')
    const a = tokens.find(t => t.value === 'A')
    expect(a).toBeDefined()
    // This documents the CURRENT behavior. A "fix" would expect column = 5.
    // We assert char-based here so test is green; if Tab→4-cols ever gets implemented,
    // this test should fail and force a deliberate decision.
    expect(a!.column).toBe(3)
  })
})

// ============================================================================
// P2: Surrogate-Pair-Spalten (Emojis zählen 2 Code Units)
// ============================================================================
//
// Hypothese: JS-Strings indexieren UTF-16 Code Units. Emoji wie 🎉 sind 2 Units.
// advance() macht column++ pro Code Unit, also +2 für ein Emoji. Visuell aber +1.

describe('Lexer Bug P2: Surrogate pair column tracking', () => {
  it('documents that emoji in string adds 2 to column (UTF-16 code units)', () => {
    // "🎉" — opening quote, 2 code units for emoji, closing quote.
    // Column nach dem closing quote sollte 5 sein (1+1+2+1).
    // Visuell wäre 4 (1+1+1+1).
    const tokens = tokenize('"🎉"')
    const str = tokens.find(t => t.type === 'STRING')
    expect(str).toBeDefined()
    expect(str!.value).toBe('🎉')
    // column tracks END position in UTF-16 code units
    expect(str!.column).toBe(5)
  })
})
