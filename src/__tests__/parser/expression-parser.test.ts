/**
 * Expression Parser Tests
 *
 * Tests for expression parsing:
 * - parseValue: literal values
 * - parseExpression: variables, arithmetic, property access
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'
import { createParserContext } from '../../parser/parser-context'
import { parseValue, parseExpression } from '../../parser/expression-parser'

// Helper to create parser context from source code
function createContext(source: string) {
  const tokens = tokenize(source)
  return createParserContext(tokens, source)
}

describe('expression-parser', () => {
  describe('parseValue', () => {
    it('returns null for empty context', () => {
      const ctx = createContext('')
      // Advance to EOF
      expect(parseValue(ctx)).toBeNull()
    })

    it('parses number value', () => {
      const ctx = createContext('42')
      expect(parseValue(ctx)).toBe(42)
    })

    it('parses string value', () => {
      const ctx = createContext('"hello"')
      expect(parseValue(ctx)).toBe('hello')
    })

    it('parses color value', () => {
      const ctx = createContext('#FF0000')
      expect(parseValue(ctx)).toBe('#FF0000')
    })

    it('parses true boolean', () => {
      const ctx = createContext('true')
      expect(parseValue(ctx)).toBe(true)
    })

    it('parses false boolean', () => {
      const ctx = createContext('false')
      expect(parseValue(ctx)).toBe(false)
    })

    it('returns component name as string', () => {
      const ctx = createContext('MyComponent')
      expect(parseValue(ctx)).toBe('MyComponent')
    })

    it('advances cursor after parsing', () => {
      const ctx = createContext('42 remaining')
      parseValue(ctx)
      expect(ctx.current()?.value).not.toBe('42')
    })
  })

  describe('parseExpression', () => {
    it('returns null for empty context', () => {
      const ctx = createContext('')
      expect(parseExpression(ctx)).toBeNull()
    })

    it('parses variable reference', () => {
      const ctx = createContext('$count')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('variable')
      expect((result as { name: string }).name).toBe('count')
    })

    it('parses property access', () => {
      const ctx = createContext('$user.name')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('property_access')
      expect((result as { path: string[] }).path).toEqual(['user', 'name'])
    })

    it('parses deep property access', () => {
      const ctx = createContext('$user.profile.avatar')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('property_access')
      expect((result as { path: string[] }).path).toEqual(['user', 'profile', 'avatar'])
    })

    it('parses literal number', () => {
      const ctx = createContext('100')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('literal')
      expect((result as { value: number }).value).toBe(100)
    })

    it('parses literal string', () => {
      const ctx = createContext('"test string"')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('literal')
      expect((result as { value: string }).value).toBe('test string')
    })

    it('parses true boolean', () => {
      const ctx = createContext('true')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('literal')
      expect((result as { value: boolean }).value).toBe(true)
    })

    it('parses false boolean', () => {
      const ctx = createContext('false')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('literal')
      expect((result as { value: boolean }).value).toBe(false)
    })

    it('parses addition expression', () => {
      const ctx = createContext('$count + 1')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('binary')
      const binary = result as { operator: string; left: unknown; right: unknown }
      expect(binary.operator).toBe('+')
    })

    it('parses subtraction expression', () => {
      const ctx = createContext('$total - 5')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('binary')
      const binary = result as { operator: string }
      expect(binary.operator).toBe('-')
    })

    it('parses multiplication expression', () => {
      const ctx = createContext('$price * 2')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('binary')
      const binary = result as { operator: string }
      expect(binary.operator).toBe('*')
    })

    it('parses division expression', () => {
      const ctx = createContext('$total / 4')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('binary')
      const binary = result as { operator: string }
      expect(binary.operator).toBe('/')
    })

    it('parses number arithmetic', () => {
      const ctx = createContext('10 + 5')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('binary')
      const binary = result as { operator: string; left: { value: number }; right: { value: number } }
      expect(binary.left.value).toBe(10)
      expect(binary.right.value).toBe(5)
    })

    it('parses component property access', () => {
      const ctx = createContext('Email.value')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('component_property')
      const prop = result as { componentName: string; propertyName: string }
      expect(prop.componentName).toBe('Email')
      expect(prop.propertyName).toBe('value')
    })

    it('parses component with nested property', () => {
      // The lexer tokenizes "Form.user" as a single COMPONENT_NAME token
      const ctx = createContext('Form.user')
      const result = parseExpression(ctx)
      expect(result?.type).toBe('component_property')
      const prop = result as { componentName: string; propertyName: string }
      expect(prop.componentName).toBe('Form')
      expect(prop.propertyName).toBe('user')
    })
  })
})
