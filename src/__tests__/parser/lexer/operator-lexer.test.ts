/**
 * Operator Lexer Tests
 *
 * Unit tests for arithmetic and comparison operator parsing.
 * Tests parseArithmeticOperator(), parseComparisonOperator(), parseArithmeticMinus()
 */
import { describe, it, expect } from 'vitest'
import {
  parseArithmeticOperator,
  parseComparisonOperator,
  parseArithmeticMinus
} from '../../../parser/lexer/operator-lexer'
import { tokenize } from '../../../parser/lexer'

describe('operator-lexer', () => {
  // ==========================================================================
  // parseArithmeticOperator - +, *, /
  // ==========================================================================
  describe('parseArithmeticOperator', () => {
    describe('plus operator', () => {
      it('parses + operator', () => {
        const result = parseArithmeticOperator('+', 0, 0, 0)
        expect(result.token.type).toBe('ARITHMETIC')
        expect(result.token.value).toBe('+')
      })

      it('advances position by 1', () => {
        const result = parseArithmeticOperator('+', 5, 10, 0)
        expect(result.newPos).toBe(6)
        expect(result.newColumn).toBe(11)
      })

      it('records line number', () => {
        const result = parseArithmeticOperator('+', 0, 0, 3)
        expect(result.token.line).toBe(3)
      })

      it('records column', () => {
        const result = parseArithmeticOperator('+', 0, 15, 0)
        expect(result.token.column).toBe(15)
      })
    })

    describe('multiply operator', () => {
      it('parses * operator', () => {
        const result = parseArithmeticOperator('*', 0, 0, 0)
        expect(result.token.type).toBe('ARITHMETIC')
        expect(result.token.value).toBe('*')
      })
    })

    describe('divide operator', () => {
      it('parses / operator', () => {
        const result = parseArithmeticOperator('/', 0, 0, 0)
        expect(result.token.type).toBe('ARITHMETIC')
        expect(result.token.value).toBe('/')
      })
    })
  })

  // ==========================================================================
  // parseComparisonOperator - ==, !=, >=, <=, >, <, =
  // ==========================================================================
  describe('parseComparisonOperator', () => {
    describe('equality operators', () => {
      it('parses == operator', () => {
        const result = parseComparisonOperator('==', 0, 0, 0)
        expect(result).not.toBeNull()
        expect(result!.token.type).toBe('OPERATOR')
        expect(result!.token.value).toBe('==')
      })

      it('advances position by 2 for ==', () => {
        const result = parseComparisonOperator('==', 0, 0, 0)
        expect(result!.newPos).toBe(2)
        expect(result!.newColumn).toBe(2)
      })

      it('parses != operator', () => {
        const result = parseComparisonOperator('!=', 0, 0, 0)
        expect(result!.token.type).toBe('OPERATOR')
        expect(result!.token.value).toBe('!=')
      })

      it('advances position by 2 for !=', () => {
        const result = parseComparisonOperator('!=', 0, 0, 0)
        expect(result!.newPos).toBe(2)
      })
    })

    describe('comparison operators', () => {
      it('parses >= operator', () => {
        const result = parseComparisonOperator('>=', 0, 0, 0)
        expect(result!.token.value).toBe('>=')
      })

      it('parses <= operator', () => {
        const result = parseComparisonOperator('<=', 0, 0, 0)
        expect(result!.token.value).toBe('<=')
      })

      it('parses > operator', () => {
        const result = parseComparisonOperator('>5', 0, 0, 0)
        expect(result!.token.value).toBe('>')
        expect(result!.newPos).toBe(1)
      })

      it('parses < operator', () => {
        const result = parseComparisonOperator('<10', 0, 0, 0)
        expect(result!.token.value).toBe('<')
        expect(result!.newPos).toBe(1)
      })

      it('prefers >= over >', () => {
        const result = parseComparisonOperator('>=5', 0, 0, 0)
        expect(result!.token.value).toBe('>=')
        expect(result!.newPos).toBe(2)
      })

      it('prefers <= over <', () => {
        const result = parseComparisonOperator('<=10', 0, 0, 0)
        expect(result!.token.value).toBe('<=')
        expect(result!.newPos).toBe(2)
      })
    })

    describe('assignment operator', () => {
      it('parses single = as assignment', () => {
        const result = parseComparisonOperator('=value', 0, 0, 0)
        expect(result!.token.type).toBe('ASSIGNMENT')
        expect(result!.token.value).toBe('=')
      })

      it('advances position by 1 for =', () => {
        const result = parseComparisonOperator('=', 0, 0, 0)
        expect(result!.newPos).toBe(1)
      })
    })

    describe('non-operator characters', () => {
      it('returns null for non-operator character', () => {
        const result = parseComparisonOperator('abc', 0, 0, 0)
        expect(result).toBeNull()
      })

      it('returns null for standalone !', () => {
        const result = parseComparisonOperator('!abc', 0, 0, 0)
        expect(result).toBeNull() // ! without = is not a comparison operator
      })
    })

    describe('position tracking', () => {
      it('uses provided position', () => {
        const content = 'value == other'
        const pos = 6 // Position of first =
        const result = parseComparisonOperator(content, pos, pos, 0)
        expect(result!.token.value).toBe('==')
      })

      it('records column correctly', () => {
        const result = parseComparisonOperator('==', 0, 20, 0)
        expect(result!.token.column).toBe(20)
      })

      it('records line correctly', () => {
        const result = parseComparisonOperator('==', 0, 0, 5)
        expect(result!.token.line).toBe(5)
      })
    })
  })

  // ==========================================================================
  // parseArithmeticMinus - -
  // ==========================================================================
  describe('parseArithmeticMinus', () => {
    describe('valid arithmetic minus', () => {
      it('parses - followed by space', () => {
        const result = parseArithmeticMinus('- 5', 0, 0, 0)
        expect(result).not.toBeNull()
        expect(result!.token.type).toBe('ARITHMETIC')
        expect(result!.token.value).toBe('-')
      })

      it('parses - followed by number', () => {
        const result = parseArithmeticMinus('-5', 0, 0, 0)
        expect(result!.token.value).toBe('-')
      })

      it('parses - followed by $', () => {
        const result = parseArithmeticMinus('-$count', 0, 0, 0)
        expect(result!.token.value).toBe('-')
      })

      it('parses - at end of content', () => {
        const result = parseArithmeticMinus('-', 0, 0, 0)
        expect(result!.token.value).toBe('-')
      })

      it('advances position by 1', () => {
        const result = parseArithmeticMinus('- 5', 0, 0, 0)
        expect(result!.newPos).toBe(1)
        expect(result!.newColumn).toBe(1)
      })
    })

    describe('non-arithmetic minus', () => {
      it('returns null for hyphenated word', () => {
        const result = parseArithmeticMinus('-word', 0, 0, 0)
        expect(result).toBeNull()
      })

      it('returns null for hyphenated identifier', () => {
        const result = parseArithmeticMinus('-blue', 0, 0, 0)
        expect(result).toBeNull()
      })

      it('returns null for non-minus character', () => {
        const result = parseArithmeticMinus('+5', 0, 0, 0)
        expect(result).toBeNull()
      })
    })

    describe('position tracking', () => {
      it('uses provided position in content', () => {
        const content = '5 - 3'
        const pos = 2 // Position of -
        const result = parseArithmeticMinus(content, pos, pos, 0)
        expect(result!.token.value).toBe('-')
      })

      it('records column correctly', () => {
        const result = parseArithmeticMinus('- 5', 0, 10, 0)
        expect(result!.token.column).toBe(10)
      })

      it('records line correctly', () => {
        const result = parseArithmeticMinus('- 5', 0, 0, 7)
        expect(result!.token.line).toBe(7)
      })
    })
  })

  // ==========================================================================
  // Integration Tests via tokenize()
  // ==========================================================================
  describe('integration with tokenize', () => {
    describe('arithmetic expressions', () => {
      it('tokenizes addition expression', () => {
        const tokens = tokenize('assign $count to $count + 1')
        const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
        expect(arithmetic!.value).toBe('+')
      })

      it('tokenizes subtraction expression', () => {
        const tokens = tokenize('assign $count to $count - 1')
        const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
        expect(arithmetic!.value).toBe('-')
      })

      it('tokenizes multiplication expression', () => {
        const tokens = tokenize('assign $total to $price * $qty')
        const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
        expect(arithmetic!.value).toBe('*')
      })

      it('tokenizes division expression', () => {
        const tokens = tokenize('assign $avg to $total / $count')
        const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
        expect(arithmetic!.value).toBe('/')
      })

      it('tokenizes complex expression', () => {
        const tokens = tokenize('assign $result to $a + $b * $c')
        const arithmetics = tokens.filter(t => t.type === 'ARITHMETIC')
        expect(arithmetics).toHaveLength(2)
        expect(arithmetics.map(t => t.value)).toEqual(['+', '*'])
      })
    })

    describe('comparison expressions', () => {
      it('tokenizes equality comparison', () => {
        const tokens = tokenize('if $status == active')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('==')
      })

      it('tokenizes inequality comparison', () => {
        const tokens = tokenize('if $status != active')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('!=')
      })

      it('tokenizes greater than comparison', () => {
        const tokens = tokenize('if $count > 0')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('>')
      })

      it('tokenizes less than comparison', () => {
        const tokens = tokenize('if $count < 10')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('<')
      })

      it('tokenizes greater than or equal comparison', () => {
        const tokens = tokenize('if $count >= 5')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('>=')
      })

      it('tokenizes less than or equal comparison', () => {
        const tokens = tokenize('if $count <= 5')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('<=')
      })
    })

    describe('assignment expressions', () => {
      it('tokenizes property assignment', () => {
        const tokens = tokenize('Button.disabled = true')
        const assignment = tokens.find(t => t.type === 'ASSIGNMENT')
        expect(assignment!.value).toBe('=')
      })

      it('distinguishes assignment from comparison', () => {
        const code = 'if $a == $b then $a = $b'
        const tokens = tokenize(code)
        const operators = tokens.filter(t => t.type === 'OPERATOR')
        const assignments = tokens.filter(t => t.type === 'ASSIGNMENT')
        expect(operators).toHaveLength(1)
        expect(assignments).toHaveLength(1)
        expect(operators[0].value).toBe('==')
        expect(assignments[0].value).toBe('=')
      })
    })

    describe('conditional property expressions', () => {
      it('tokenizes conditional with comparison', () => {
        const tokens = tokenize('Badge if $count > 0 then bg #10B981 else bg #666')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('>')
      })

      it('tokenizes conditional with equality', () => {
        const tokens = tokenize('Box if $status == active then bg #3B82F6')
        const operator = tokens.find(t => t.type === 'OPERATOR')
        expect(operator!.value).toBe('==')
      })
    })

    describe('hyphenated identifiers vs minus', () => {
      it('does not treat hyphen in property name as minus', () => {
        const tokens = tokenize('Button hover-background #3B82F6')
        // Should have PROPERTY hover-background, not ARITHMETIC -
        const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
        expect(arithmetic).toBeUndefined()
      })

      it('does not treat hyphen in token suffix as minus', () => {
        const tokens = tokenize('$primary-color: #3B82F6')
        const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
        expect(arithmetic).toBeUndefined()
      })

      it('treats minus in expression as arithmetic', () => {
        const tokens = tokenize('$count - 1')
        const arithmetic = tokens.find(t => t.type === 'ARITHMETIC')
        expect(arithmetic!.value).toBe('-')
      })
    })
  })
})
