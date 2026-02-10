/**
 * Condition Parser Tests
 *
 * Tests for conditional expression parsing:
 * - Simple variable checks
 * - Negation (not)
 * - Comparisons (==, !=, <, >, <=, >=)
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'
import { createParserContext } from '../../parser/parser-context'
import { parseCondition } from '../../parser/condition-parser'

// Helper to create parser context from source code
function createContext(source: string) {
  const tokens = tokenize(source)
  return createParserContext(tokens, source)
}

describe('condition-parser', () => {
  describe('parseCondition', () => {
    it('returns null for empty context', () => {
      const ctx = createContext('')
      expect(parseCondition(ctx)).toBeNull()
    })

    it('parses variable reference', () => {
      const ctx = createContext('$isLoggedIn')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('var')
      expect((result as { name: string }).name).toBe('isLoggedIn')
    })

    it('parses plain variable name', () => {
      const ctx = createContext('isActive')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('var')
      expect((result as { name: string }).name).toBe('isActive')
    })

    it('parses negation with not', () => {
      const ctx = createContext('not $isLoggedIn')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('not')
      const notExpr = result as { operand: { type: string; name: string } }
      expect(notExpr.operand.type).toBe('var')
      expect(notExpr.operand.name).toBe('isLoggedIn')
    })

    it('parses negation with plain name', () => {
      const ctx = createContext('not isActive')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('not')
      const notExpr = result as { operand: { type: string; name: string } }
      expect(notExpr.operand.type).toBe('var')
    })

    it('parses equality comparison', () => {
      const ctx = createContext('$status == "active"')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: string }
      expect(comp.operator).toBe('==')
      expect(comp.value).toBe('active')
    })

    it('parses inequality comparison', () => {
      const ctx = createContext('$count != 0')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: number }
      expect(comp.operator).toBe('!=')
      expect(comp.value).toBe(0)
    })

    it('parses greater than comparison', () => {
      const ctx = createContext('$count > 5')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: number }
      expect(comp.operator).toBe('>')
      expect(comp.value).toBe(5)
    })

    it('parses less than comparison', () => {
      const ctx = createContext('$age < 18')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: number }
      expect(comp.operator).toBe('<')
      expect(comp.value).toBe(18)
    })

    it('parses greater than or equal comparison', () => {
      const ctx = createContext('$score >= 50')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: number }
      expect(comp.operator).toBe('>=')
      expect(comp.value).toBe(50)
    })

    it('parses less than or equal comparison', () => {
      const ctx = createContext('$price <= 100')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: number }
      expect(comp.operator).toBe('<=')
      expect(comp.value).toBe(100)
    })

    it('parses comparison with color value', () => {
      const ctx = createContext('$color == #FF0000')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: string }
      expect(comp.value).toBe('#FF0000')
    })

    it('parses comparison with boolean true', () => {
      const ctx = createContext('$enabled == true')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: boolean }
      expect(comp.value).toBe(true)
    })

    it('parses comparison with boolean false', () => {
      const ctx = createContext('$disabled == false')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { operator: string; value: boolean }
      expect(comp.value).toBe(false)
    })

    it('parses plain name comparison', () => {
      const ctx = createContext('status == "done"')
      const result = parseCondition(ctx)
      expect(result?.type).toBe('comparison')
      const comp = result as { left: { name: string }; value: string }
      expect(comp.left.name).toBe('status')
      expect(comp.value).toBe('done')
    })

    it('includes left side in comparison', () => {
      const ctx = createContext('$count > 10')
      const result = parseCondition(ctx)
      const comp = result as { left: { type: string; name: string } }
      expect(comp.left.type).toBe('var')
      expect(comp.left.name).toBe('count')
    })

    it('returns null for not without operand', () => {
      const ctx = createContext('not')
      const result = parseCondition(ctx)
      expect(result).toBeNull()
    })
  })
})
