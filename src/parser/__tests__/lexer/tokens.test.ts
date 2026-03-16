/**
 * Lexer Token Tests
 *
 * Tests all token types with edge cases.
 */

import { describe, it, expect } from 'vitest'
import { tokenize, Token, TokenType } from '../../lexer'

// Helper: Get tokens without EOF
function tokens(source: string): Token[] {
  return tokenize(source).filter(t => t.type !== 'EOF' && t.type !== 'NEWLINE')
}

// Helper: Assert token sequence
function expectTokens(source: string, expected: Array<[TokenType, string?]>) {
  const result = tokens(source)
  expect(result.length).toBe(expected.length)
  expected.forEach(([type, value], i) => {
    expect(result[i].type).toBe(type)
    if (value !== undefined) {
      expect(result[i].value).toBe(value)
    }
  })
}

// ============================================================================
// IDENTIFIER TESTS
// ============================================================================

describe('Lexer: IDENTIFIER', () => {
  it('parses simple name', () => {
    expectTokens('Button', [['IDENTIFIER', 'Button']])
  })

  it('parses lowercase name', () => {
    expectTokens('button', [['IDENTIFIER', 'button']])
  })

  it('parses name with underscore', () => {
    expectTokens('my_button', [['IDENTIFIER', 'my_button']])
  })

  it('parses name with hyphen', () => {
    expectTokens('my-button', [['IDENTIFIER', 'my-button']])
  })

  it('parses name with numbers', () => {
    expectTokens('button2', [['IDENTIFIER', 'button2']])
  })

  it('parses underscore only', () => {
    expectTokens('_', [['IDENTIFIER', '_']])
  })

  it('parses name starting with underscore', () => {
    expectTokens('_private', [['IDENTIFIER', '_private']])
  })

  it('parses multiple identifiers', () => {
    expectTokens('Button Card Text', [
      ['IDENTIFIER', 'Button'],
      ['IDENTIFIER', 'Card'],
      ['IDENTIFIER', 'Text'],
    ])
  })

  it('parses CamelCase', () => {
    expectTokens('MyButton', [['IDENTIFIER', 'MyButton']])
  })

  it('parses UPPERCASE', () => {
    expectTokens('BUTTON', [['IDENTIFIER', 'BUTTON']])
  })

  it('parses mixed case with numbers and hyphens', () => {
    expectTokens('my-Button2-Test', [['IDENTIFIER', 'my-Button2-Test']])
  })
})

// ============================================================================
// STRING TESTS
// ============================================================================

describe('Lexer: STRING', () => {
  it('parses simple string', () => {
    expectTokens('"Hello"', [['STRING', 'Hello']])
  })

  it('parses empty string', () => {
    expectTokens('""', [['STRING', '']])
  })

  it('parses string with spaces', () => {
    expectTokens('"Hello World"', [['STRING', 'Hello World']])
  })

  it('parses string with escaped quote', () => {
    expectTokens('"Say \\"Hi\\""', [['STRING', 'Say "Hi"']])
  })

  it('parses string with special characters', () => {
    expectTokens('"Hëllo Wörld"', [['STRING', 'Hëllo Wörld']])
  })

  it('parses string with unicode emoji', () => {
    expectTokens('"🎉 Party"', [['STRING', '🎉 Party']])
  })

  it('parses multiple strings', () => {
    expectTokens('"Hello" "World"', [
      ['STRING', 'Hello'],
      ['STRING', 'World'],
    ])
  })

  it('parses string with numbers', () => {
    expectTokens('"Item 123"', [['STRING', 'Item 123']])
  })

  it('parses string with punctuation', () => {
    expectTokens('"Hello, World!"', [['STRING', 'Hello, World!']])
  })

  it('parses very long string', () => {
    const longText = 'a'.repeat(1000)
    expectTokens(`"${longText}"`, [['STRING', longText]])
  })
})

// ============================================================================
// NUMBER TESTS
// ============================================================================

describe('Lexer: NUMBER', () => {
  it('parses integer', () => {
    expectTokens('42', [['NUMBER', '42']])
  })

  it('parses zero', () => {
    expectTokens('0', [['NUMBER', '0']])
  })

  it('parses float', () => {
    expectTokens('3.14', [['NUMBER', '3.14']])
  })

  it('parses large number', () => {
    expectTokens('999999', [['NUMBER', '999999']])
  })

  it('parses hex color 3 digits', () => {
    expectTokens('#FFF', [['NUMBER', '#FFF']])
  })

  it('parses hex color 6 digits', () => {
    expectTokens('#3B82F6', [['NUMBER', '#3B82F6']])
  })

  it('parses hex color 8 digits (with alpha)', () => {
    expectTokens('#3B82F6FF', [['NUMBER', '#3B82F6FF']])
  })

  it('parses hex lowercase', () => {
    expectTokens('#abc', [['NUMBER', '#abc']])
  })

  it('parses hex mixed case', () => {
    expectTokens('#AbC123', [['NUMBER', '#AbC123']])
  })

  it('parses multiple numbers', () => {
    expectTokens('10 20 30', [
      ['NUMBER', '10'],
      ['NUMBER', '20'],
      ['NUMBER', '30'],
    ])
  })

  it('parses number with decimal places', () => {
    expectTokens('0.5', [['NUMBER', '0.5']])
  })

  it('parses number sequence for padding', () => {
    expectTokens('8 16', [
      ['NUMBER', '8'],
      ['NUMBER', '16'],
    ])
  })
})

// ============================================================================
// KEYWORD TESTS
// ============================================================================

describe('Lexer: Keywords', () => {
  it('parses "as"', () => {
    expectTokens('as', [['AS', 'as']])
  })

  it('parses "extends"', () => {
    expectTokens('extends', [['EXTENDS', 'extends']])
  })

  it('parses "named"', () => {
    expectTokens('named', [['NAMED', 'named']])
  })

  it('parses "each"', () => {
    expectTokens('each', [['EACH', 'each']])
  })

  it('parses "in"', () => {
    expectTokens('in', [['IN', 'in']])
  })

  it('parses "if"', () => {
    expectTokens('if', [['IF', 'if']])
  })

  it('parses "else"', () => {
    expectTokens('else', [['ELSE', 'else']])
  })

  it('parses "where"', () => {
    expectTokens('where', [['WHERE', 'where']])
  })

  it('parses "data"', () => {
    expectTokens('data', [['DATA', 'data']])
  })

  it('parses "import" as identifier (not a reserved keyword)', () => {
    // Note: import is not currently a reserved keyword in Mirror
    expectTokens('import', [['IDENTIFIER', 'import']])
  })

  it('parses "keys"', () => {
    expectTokens('keys', [['KEYS', 'keys']])
  })

  it('treats uppercase AS as identifier, not keyword', () => {
    expectTokens('AS', [['IDENTIFIER', 'AS']])
  })

  it('treats "asset" as identifier (contains "as")', () => {
    expectTokens('asset', [['IDENTIFIER', 'asset']])
  })

  it('treats "as-is" as identifier (hyphenated)', () => {
    expectTokens('as-is', [['IDENTIFIER', 'as-is']])
  })

  it('treats "extend" as identifier (not "extends")', () => {
    expectTokens('extend', [['IDENTIFIER', 'extend']])
  })

  it('parses keyword sequence', () => {
    expectTokens('if each in', [
      ['IF', 'if'],
      ['EACH', 'each'],
      ['IN', 'in'],
    ])
  })

  it('parses "and"', () => {
    expectTokens('and', [['AND', 'and']])
  })

  it('parses "or"', () => {
    expectTokens('or', [['OR', 'or']])
  })

  it('parses "not"', () => {
    expectTokens('not', [['NOT', 'not']])
  })

  it('parses "then"', () => {
    expectTokens('then', [['THEN', 'then']])
  })
})

// ============================================================================
// COMPARISON OPERATOR TESTS
// ============================================================================

describe('Lexer: Comparison Operators', () => {
  it('parses greater than >', () => {
    expectTokens('a > b', [
      ['IDENTIFIER', 'a'],
      ['GT', '>'],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses less than <', () => {
    expectTokens('a < b', [
      ['IDENTIFIER', 'a'],
      ['LT', '<'],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses greater than or equal >=', () => {
    expectTokens('a >= b', [
      ['IDENTIFIER', 'a'],
      ['GTE', '>='],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses less than or equal <=', () => {
    expectTokens('a <= b', [
      ['IDENTIFIER', 'a'],
      ['LTE', '<='],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses not equal !=', () => {
    expectTokens('a != b', [
      ['IDENTIFIER', 'a'],
      ['NOT_EQUAL', '!='],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses bang alone !', () => {
    expectTokens('!a', [
      ['BANG', '!'],
      ['IDENTIFIER', 'a'],
    ])
  })

  it('parses equality == (single token)', () => {
    expectTokens('a == b', [
      ['IDENTIFIER', 'a'],
      ['EQUALS', '=='],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses strict equality ===', () => {
    expectTokens('a === b', [
      ['IDENTIFIER', 'a'],
      ['STRICT_EQUAL', '==='],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses && operator', () => {
    expectTokens('a && b', [
      ['IDENTIFIER', 'a'],
      ['AND_AND', '&&'],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses || operator', () => {
    expectTokens('a || b', [
      ['IDENTIFIER', 'a'],
      ['OR_OR', '||'],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses comparison with numbers', () => {
    expectTokens('count > 0', [
      ['IDENTIFIER', 'count'],
      ['GT', '>'],
      ['NUMBER', '0'],
    ])
  })

  it('parses comparison with strings', () => {
    expectTokens('status != "done"', [
      ['IDENTIFIER', 'status'],
      ['NOT_EQUAL', '!='],
      ['STRING', 'done'],
    ])
  })

  it('parses parentheses', () => {
    expectTokens('(a)', [
      ['LPAREN', '('],
      ['IDENTIFIER', 'a'],
      ['RPAREN', ')'],
    ])
  })

  it('parses nested parentheses', () => {
    expectTokens('(a or (b and c))', [
      ['LPAREN', '('],
      ['IDENTIFIER', 'a'],
      ['OR', 'or'],
      ['LPAREN', '('],
      ['IDENTIFIER', 'b'],
      ['AND', 'and'],
      ['IDENTIFIER', 'c'],
      ['RPAREN', ')'],
      ['RPAREN', ')'],
    ])
  })
})

// ============================================================================
// PUNCTUATION TESTS
// ============================================================================

describe('Lexer: Punctuation', () => {
  it('parses colon', () => {
    expectTokens(':', [['COLON', ':']])
  })

  it('parses comma', () => {
    expectTokens(',', [['COMMA', ',']])
  })

  it('parses semicolon', () => {
    expectTokens(';', [['SEMICOLON', ';']])
  })

  it('parses dot', () => {
    expectTokens('.', [['DOT', '.']])
  })

  it('parses equals', () => {
    expectTokens('=', [['EQUALS', '=']])
  })

  it('parses question mark', () => {
    expectTokens('?', [['QUESTION', '?']])
  })

  it('parses multiple punctuation', () => {
    expectTokens(': , ; . = ?', [
      ['COLON', ':'],
      ['COMMA', ','],
      ['SEMICOLON', ';'],
      ['DOT', '.'],
      ['EQUALS', '='],
      ['QUESTION', '?'],
    ])
  })

  it('skips unknown characters', () => {
    // @ is unknown and should be skipped
    expectTokens('a @ b', [
      ['IDENTIFIER', 'a'],
      ['IDENTIFIER', 'b'],
    ])
  })

  it('parses parentheses as tokens', () => {
    expectTokens('a ( b ) c', [
      ['IDENTIFIER', 'a'],
      ['LPAREN', '('],
      ['IDENTIFIER', 'b'],
      ['RPAREN', ')'],
      ['IDENTIFIER', 'c'],
    ])
  })
})

// ============================================================================
// COMBINED TOKEN TESTS
// ============================================================================

describe('Lexer: Combined Tokens', () => {
  it('parses token definition syntax', () => {
    expectTokens('primary: color = #3B82F6', [
      ['IDENTIFIER', 'primary'],
      ['COLON', ':'],
      ['IDENTIFIER', 'color'],
      ['EQUALS', '='],
      ['NUMBER', '#3B82F6'],
    ])
  })

  it('parses component definition syntax', () => {
    expectTokens('Card as frame:', [
      ['IDENTIFIER', 'Card'],
      ['AS', 'as'],
      ['IDENTIFIER', 'frame'],
      ['COLON', ':'],
    ])
  })

  it('parses inheritance syntax', () => {
    expectTokens('DangerButton extends Button:', [
      ['IDENTIFIER', 'DangerButton'],
      ['EXTENDS', 'extends'],
      ['IDENTIFIER', 'Button'],
      ['COLON', ':'],
    ])
  })

  it('parses named instance syntax', () => {
    expectTokens('Button named saveBtn "Save"', [
      ['IDENTIFIER', 'Button'],
      ['NAMED', 'named'],
      ['IDENTIFIER', 'saveBtn'],
      ['STRING', 'Save'],
    ])
  })

  it('parses property syntax', () => {
    expectTokens('pad 8, bg #FFF', [
      ['IDENTIFIER', 'pad'],
      ['NUMBER', '8'],
      ['COMMA', ','],
      ['IDENTIFIER', 'bg'],
      ['NUMBER', '#FFF'],
    ])
  })

  it('parses event syntax', () => {
    expectTokens('onclick toggle Menu', [
      ['IDENTIFIER', 'onclick'],
      ['IDENTIFIER', 'toggle'],
      ['IDENTIFIER', 'Menu'],
    ])
  })

  it('parses keyboard event syntax', () => {
    expectTokens('onkeydown escape: close', [
      ['IDENTIFIER', 'onkeydown'],
      ['IDENTIFIER', 'escape'],
      ['COLON', ':'],
      ['IDENTIFIER', 'close'],
    ])
  })

  it('parses iteration syntax', () => {
    expectTokens('each task in tasks', [
      ['EACH', 'each'],
      ['IDENTIFIER', 'task'],
      ['IN', 'in'],
      ['IDENTIFIER', 'tasks'],
    ])
  })

  it('parses conditional syntax', () => {
    expectTokens('if loggedIn', [
      ['IF', 'if'],
      ['IDENTIFIER', 'loggedIn'],
    ])
  })

  it('parses ternary syntax', () => {
    expectTokens('done ? "check" : "circle"', [
      ['IDENTIFIER', 'done'],
      ['QUESTION', '?'],
      ['STRING', 'check'],
      ['COLON', ':'],
      ['STRING', 'circle'],
    ])
  })

  it('parses dot access', () => {
    expectTokens('task.title', [
      ['IDENTIFIER', 'task'],
      ['DOT', '.'],
      ['IDENTIFIER', 'title'],
    ])
  })

  it('parses nested dot access', () => {
    expectTokens('user.profile.name', [
      ['IDENTIFIER', 'user'],
      ['DOT', '.'],
      ['IDENTIFIER', 'profile'],
      ['DOT', '.'],
      ['IDENTIFIER', 'name'],
    ])
  })
})
