/**
 * Lexer Additional Coverage Tests
 *
 * Schließt Lücken aus tests/compiler/docs/themen/01-lexer.md (Bereich 3.2-3.10).
 * Diese Tests fixieren existierendes (oft ungetestetes) Verhalten — sie sind
 * keine Bug-Tests (die liegen in lexer-bugs.test.ts), sondern Regressions-
 * Schutz für Code-Pfade, die bisher nur theoretisch existierten.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, tokenizeWithErrors } from '../../compiler/parser/lexer'

function tokens(source: string) {
  return tokenize(source).filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
}

// ============================================================================
// HEX COLORS — extended coverage
// ============================================================================

describe('Lexer Additional: Hex Colors', () => {
  it('#fffG (3 hex + non-hex letter) → NUMBER "#fff" + IDENTIFIER "G"', () => {
    const result = tokens('#fffG')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'NUMBER', value: '#fff' })
    expect(result[1]).toMatchObject({ type: 'IDENTIFIER', value: 'G' })
  })

  it('# fff (hash with space then letters) → 1 NUMBER "#" + 1 IDENTIFIER + 1 error', () => {
    const result = tokenizeWithErrors('# fff')
    expect(result.errors.length).toBe(1)
    const nonStruct = result.tokens.filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
    expect(nonStruct[0]).toMatchObject({ type: 'NUMBER', value: '#' })
    expect(nonStruct[1]).toMatchObject({ type: 'IDENTIFIER', value: 'fff' })
  })

  it('#FFFFFF (uppercase, 6 digits) → no error', () => {
    const result = tokenizeWithErrors('#FFFFFF')
    expect(result.errors.length).toBe(0)
    const num = result.tokens.find(t => t.type === 'NUMBER')
    expect(num?.value).toBe('#FFFFFF')
  })

  it('#1 (1 hex digit) → error "expected 3, 4, 6, or 8"', () => {
    const result = tokenizeWithErrors('#1')
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].message).toContain('expected 3, 4, 6, or 8')
    expect(result.errors[0].message).toContain('got 1')
  })

  it('#0 (1 hex digit zero) → error', () => {
    const result = tokenizeWithErrors('#0')
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].message).toContain('got 1')
  })
})

// ============================================================================
// STRINGS — single quotes, mixed quotes
// ============================================================================

describe('Lexer Additional: Strings', () => {
  it("single-quote string 'hello'", () => {
    const result = tokens("'hello'")
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'STRING', value: 'hello' })
  })

  it("empty single-quote string ''", () => {
    const result = tokens("''")
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'STRING', value: '' })
  })

  it('mixed quotes: \'He said "hi"\' (double inside single)', () => {
    const result = tokens(`'He said "hi"'`)
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'STRING', value: 'He said "hi"' })
  })

  it('mixed quotes: "She said \'ok\'" (single inside double)', () => {
    const result = tokens(`"She said 'ok'"`)
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'STRING', value: "She said 'ok'" })
  })

  it("escaped single quote in single-quote string: 'don\\'t'", () => {
    // Source: 'don\'t' — der Lexer erkennt \' als Escape, weil quote==='
    const result = tokens(`'don\\'t'`)
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'STRING', value: "don't" })
  })

  it('literal newline escape \\n stays as two chars in value', () => {
    // Lexer interpretiert \n NICHT als newline, sondern behält die Zeichen \ und n.
    const result = tokens(`"line1\\nline2"`)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('line1\\nline2')
  })

  it('URL with double-slash inside string: "https://x.com"', () => {
    const result = tokens('"https://x.com"')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'STRING', value: 'https://x.com' })
  })
})

// ============================================================================
// IDENTIFIERS — Unicode, hyphens, $-prefix
// ============================================================================

describe('Lexer Additional: Identifiers', () => {
  it('Unicode identifier "Ümlaut"', () => {
    const result = tokens('Ümlaut')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: 'Ümlaut' })
  })

  it('CJK identifier "日本語"', () => {
    const result = tokens('日本語')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: '日本語' })
  })

  it('Unicode with hyphen "Üml-äut"', () => {
    const result = tokens('Üml-äut')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: 'Üml-äut' })
  })

  it('trailing hyphen "name-"', () => {
    const result = tokens('name-')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: 'name-' })
  })

  it('$my-var (dollar identifier with hyphen)', () => {
    const result = tokens('$my-var')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: '$my-var' })
  })

  it('$obj.prop.deep (nested dot access in $-identifier)', () => {
    const result = tokens('$obj.prop.deep')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: '$obj.prop.deep' })
  })

  it('$ alone (lone dollar)', () => {
    const result = tokens('$')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: '$' })
  })

  it('keyword "as" inside an identifier-context — keyword wins', () => {
    // Aktuelles Verhalten: Lexer ist kontextfrei, "as" ist immer AS.
    const result = tokens('bg as')
    expect(result[0]).toMatchObject({ type: 'IDENTIFIER', value: 'bg' })
    expect(result[1]).toMatchObject({ type: 'AS', value: 'as' })
  })
})

// ============================================================================
// INDENTATION — Tab-initial, mixed, irregular
// ============================================================================

describe('Lexer Additional: Indentation', () => {
  it('Tab as initial indentation: \\tFrame at file start', () => {
    const result = tokenizeWithErrors('\tFrame')
    expect(result.errors.length).toBe(0)
    const id = result.tokens.find(t => t.type === 'IDENTIFIER')
    expect(id?.value).toBe('Frame')
  })

  it('Mixed Tab+Space within initial indent', () => {
    // \t (=4) + 2 spaces = 6
    const result = tokenizeWithErrors('\t  Frame')
    expect(result.errors.length).toBe(0)
  })

  it('3-space inconsistency after 2-space unit emits warning', () => {
    // Erst 2 spaces (setzt unit=2), dann +3 (= 5 spaces, increment=3 ≠ 2)
    const source = 'A\n  B\n     C'
    const result = tokenizeWithErrors(source)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors[0].message).toContain('Inconsistent indentation')
  })

  it('comment line with 4-space indentation does not break 2-space context', () => {
    // Empty/comment lines are skipped — comment indent must not become unit.
    const source = `Card
  Child1
    // 4-space comment
  Child2`
    const result = tokenizeWithErrors(source)
    expect(result.errors.length).toBe(0)
  })

  it('Tab equals 4 spaces for indent level', () => {
    const tabSrc = 'A\n\tB'
    const spaceSrc = 'A\n    B'
    const tabIndents = tokenize(tabSrc).filter(t => t.type === 'INDENT').length
    const spaceIndents = tokenize(spaceSrc).filter(t => t.type === 'INDENT').length
    expect(tabIndents).toBe(spaceIndents)
  })
})

// ============================================================================
// SECTIONS — extended
// ============================================================================

describe('Lexer Additional: Sections', () => {
  it('"---" alone produces SECTION with empty name', () => {
    const result = tokens('---')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(1)
    expect(sections[0].value).toBe('')
  })

  it('"--- foo-bar ---" → SECTION "foo" (limitation: stops at first hyphen)', () => {
    // KNOWN LIMITATION: scanSection stops at the first '-' in the name.
    // Hyphens in section names are not supported — the rest gets eaten
    // by the trailing-dash skip. Documented here as current behavior.
    const result = tokens('--- foo-bar ---')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(1)
    expect(sections[0].value).toBe('foo')
  })

  it('"--Foo--" (no spaces) → SECTION "Foo"', () => {
    const result = tokens('--Foo--')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(1)
    expect(sections[0].value).toBe('Foo')
  })

  it('"---" then "--- Foo ---" on next line → 2 sections', () => {
    const result = tokens('---\n--- Foo ---')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(2)
    expect(sections[0].value).toBe('')
    expect(sections[1].value).toBe('Foo')
  })

  it('"---   ---" (whitespace-only name) → SECTION ""', () => {
    const result = tokens('---   ---')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(1)
    expect(sections[0].value).toBe('')
  })

  it('"--- Foo" without newline at EOF → SECTION "Foo"', () => {
    const result = tokens('--- Foo')
    const sections = result.filter(t => t.type === 'SECTION')
    expect(sections.length).toBe(1)
    expect(sections[0].value).toBe('Foo')
  })
})

// ============================================================================
// COMMENTS — extended
// ============================================================================

describe('Lexer Additional: Comments', () => {
  it('triple-slash "///" is treated as a comment (rest of line skipped)', () => {
    const result = tokens('/// triple slash')
    expect(result.length).toBe(0)
  })

  it('"/* block */" is NOT a block comment, splits into individual tokens', () => {
    // Lexer hat keine Block-Kommentare. /* zerlegt sich in / und *.
    const result = tokens('/* block */')
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(t => t.type === 'SLASH')).toBe(true)
    expect(result.some(t => t.type === 'STAR')).toBe(true)
    expect(result.some(t => t.type === 'IDENTIFIER' && t.value === 'block')).toBe(true)
  })

  it('// directly at EOF (no newline) → no tokens', () => {
    const result = tokens('// comment at end')
    expect(result.length).toBe(0)
  })

  it('URL in string with double-slash is preserved (already covered, regression)', () => {
    const result = tokens('"https://example.com/path"')
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('https://example.com/path')
  })
})

// ============================================================================
// OPERATORS — extended
// ============================================================================

describe('Lexer Additional: Operators', () => {
  it('"> =" with space → GT then EQUALS', () => {
    const result = tokens('> =')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'GT', value: '>' })
    expect(result[1]).toMatchObject({ type: 'EQUALS', value: '=' })
  })

  it('"====" → STRICT_EQUAL "===" + EQUALS "="', () => {
    const result = tokens('====')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'STRICT_EQUAL', value: '===' })
    expect(result[1]).toMatchObject({ type: 'EQUALS', value: '=' })
  })

  it('"!==" → STRICT_NOT_EQUAL', () => {
    const result = tokens('!==')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'STRICT_NOT_EQUAL', value: '!==' })
  })

  it('"+++" → three PLUS tokens', () => {
    const result = tokens('+++')
    expect(result.length).toBe(3)
    expect(result.every(t => t.type === 'PLUS')).toBe(true)
  })

  it('"*5" → STAR then NUMBER', () => {
    const result = tokens('*5')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'STAR', value: '*' })
    expect(result[1]).toMatchObject({ type: 'NUMBER', value: '5' })
  })

  it('"/5" → SLASH then NUMBER (not a comment)', () => {
    const result = tokens('/5')
    expect(result.length).toBe(2)
    expect(result[0]).toMatchObject({ type: 'SLASH', value: '/' })
    expect(result[1]).toMatchObject({ type: 'NUMBER', value: '5' })
  })
})

// ============================================================================
// ROBUSTHEIT & RECOVERY
// ============================================================================

describe('Lexer Additional: Robustness', () => {
  it('lone \\r (old Mac line ending) is normalized to \\n', () => {
    // Constructor normalisiert \r und \r\n zu \n.
    const result = tokenizeWithErrors('A\rB')
    const ids = result.tokens.filter(t => t.type === 'IDENTIFIER').map(t => t.value)
    expect(ids).toEqual(['A', 'B'])
    expect(result.errors.length).toBe(0)
  })

  it('UTF-8 BOM at file start triggers Unknown-character error', () => {
    // BOM (U+FEFF) ist Format-Klasse (Cf), nicht Letter — also Unknown.
    const result = tokenizeWithErrors('\uFEFF' + 'Frame')
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].message).toContain('Unexpected character')
  })

  it('smart quotes (U+201C/U+201D) are treated as Unknown chars', () => {
    const result = tokenizeWithErrors('\u201Chello\u201D')
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors[0].message).toContain('Unexpected character')
  })

  it('only line endings (\\n\\r\\n\\r\\n) produces only NEWLINEs', () => {
    const allTokens = tokenize('\n\r\n\r\n')
    const nonNewlineEof = allTokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF')
    expect(nonNewlineEof.length).toBe(0)
  })

  it('EOF mid-token after lone "=" → just EQUALS', () => {
    const result = tokens('=')
    expect(result.length).toBe(1)
    expect(result[0]).toMatchObject({ type: 'EQUALS', value: '=' })
  })

  it('unclosed string at EOF still emits a STRING token plus error', () => {
    const result = tokenizeWithErrors('"unclosed')
    expect(result.errors.length).toBe(1)
    const strings = result.tokens.filter(t => t.type === 'STRING')
    expect(strings.length).toBe(1)
  })
})

// ============================================================================
// POSITION — extended
// ============================================================================

describe('Lexer Additional: Position tracking', () => {
  it('NEWLINE token has correct line number', () => {
    const allTokens = tokenize('A\nB')
    const newlines = allTokens.filter(t => t.type === 'NEWLINE')
    // Erste NEWLINE markiert Zeilenende von Zeile 1 oder Beginn von Zeile 2.
    // Wichtig nur: Position ist gesetzt.
    expect(newlines.length).toBeGreaterThanOrEqual(1)
    expect(newlines[0].line).toBeGreaterThanOrEqual(1)
  })

  it('error after multi-line input has correct line', () => {
    // Lone & (jetzt Error) auf Zeile 3
    const result = tokenizeWithErrors('A\nB\nC & D')
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors[0].line).toBe(3)
  })
})
