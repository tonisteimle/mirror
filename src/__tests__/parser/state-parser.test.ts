/**
 * State Parser Tests
 *
 * Tests for state-related parsing functions:
 * - parseStateDefinition
 * - parseVariableDeclaration
 * - parseAction
 * - parseEventHandler
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'
import { createParserContext } from '../../parser/parser-context'
import {
  parseStateDefinition,
  parseVariableDeclaration,
  parseAction,
  parseEventHandler,
} from '../../parser/state-parser'

// Helper to create parser context from source code
function createContext(source: string) {
  const tokens = tokenize(source)
  return createParserContext(tokens, source)
}

describe('state-parser', () => {
  describe('parseStateDefinition', () => {
    it('returns null when not at STATE token', () => {
      const ctx = createContext('Box')
      expect(parseStateDefinition(ctx, 0)).toBeNull()
    })

    it('parses state with name', () => {
      const ctx = createContext('state open')
      const result = parseStateDefinition(ctx, 0)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('open')
    })

    it('parses state with properties', () => {
      const ctx = createContext('state hover\n  col #F00')
      const result = parseStateDefinition(ctx, 0)
      expect(result?.name).toBe('hover')
      expect(result?.properties.col).toBe('#F00')
    })

    it('parses state with multiple properties', () => {
      const ctx = createContext('state active\n  col #00F\n  opacity 50')
      const result = parseStateDefinition(ctx, 0)
      expect(result?.name).toBe('active')
      expect(result?.properties.col).toBe('#00F')
      expect(result?.properties.opacity).toBe(50)
    })

    it('stops parsing at less indented line', () => {
      const ctx = createContext('state open\n  opacity 1\nBox')
      const result = parseStateDefinition(ctx, 0)
      expect(result?.name).toBe('open')
      expect(result?.properties.opacity).toBe(1)
      // Should not consume the Box token
      expect(ctx.current()?.value).toBe('Box')
    })
  })

  describe('parseVariableDeclaration', () => {
    it('returns null when not at TOKEN_REF', () => {
      const ctx = createContext('Box')
      expect(parseVariableDeclaration(ctx)).toBeNull()
    })

    it('returns null when no assignment follows', () => {
      const ctx = createContext('$count')
      // Set up context so next is not ASSIGNMENT
      expect(parseVariableDeclaration(ctx)).toBeNull()
    })

    it('parses variable with number value', () => {
      const ctx = createContext('$count = 0')
      const result = parseVariableDeclaration(ctx)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('count')
      expect(result?.value).toBe(0)
    })

    it('parses variable with string value', () => {
      const ctx = createContext('$name = "test"')
      const result = parseVariableDeclaration(ctx)
      expect(result?.name).toBe('name')
      expect(result?.value).toBe('test')
    })

    it('records line number', () => {
      const ctx = createContext('$counter = 10')
      const result = parseVariableDeclaration(ctx)
      expect(result?.line).toBeDefined()
    })
  })

  describe('parseAction', () => {
    it('returns null for non-action token', () => {
      const ctx = createContext('Box')
      expect(parseAction(ctx)).toBeNull()
    })

    it('parses open action', () => {
      const ctx = createContext('open Menu')
      const result = parseAction(ctx)
      expect(result?.type).toBe('open')
      expect(result?.target).toBe('Menu')
    })

    it('parses close action', () => {
      const ctx = createContext('close Dialog')
      const result = parseAction(ctx)
      expect(result?.type).toBe('close')
      expect(result?.target).toBe('Dialog')
    })

    it('parses toggle action', () => {
      const ctx = createContext('toggle Sidebar')
      const result = parseAction(ctx)
      expect(result?.type).toBe('toggle')
      expect(result?.target).toBe('Sidebar')
    })

    it('parses change action with to state', () => {
      const ctx = createContext('change Tab to active')
      const result = parseAction(ctx)
      expect(result?.type).toBe('change')
      expect(result?.target).toBe('Tab')
      expect(result?.toState).toBe('active')
    })

    it('parses assign action with expression', () => {
      const ctx = createContext('assign $count to 5')
      const result = parseAction(ctx)
      expect(result?.type).toBe('assign')
      expect(result?.target).toBe('count')
      // Value is wrapped in expression object
      expect(result?.value).toEqual({ type: 'literal', value: 5 })
    })

    it('parses inline assignment $var = value', () => {
      const ctx = createContext('$count = 10')
      const result = parseAction(ctx)
      expect(result?.type).toBe('assign')
      expect(result?.target).toBe('count')
      // Value is wrapped in expression object
      expect(result?.value).toEqual({ type: 'literal', value: 10 })
    })

    it('parses open with position', () => {
      const ctx = createContext('open Dropdown below')
      const result = parseAction(ctx)
      expect(result?.type).toBe('open')
      expect(result?.target).toBe('Dropdown')
      expect(result?.position).toBe('below')
    })

    it('parses open with animation', () => {
      const ctx = createContext('open Modal fade')
      const result = parseAction(ctx)
      expect(result?.type).toBe('open')
      expect(result?.target).toBe('Modal')
      expect(result?.animation).toBe('fade')
    })

    it('parses open with animation and duration', () => {
      const ctx = createContext('open Panel slide-up 300')
      const result = parseAction(ctx)
      expect(result?.type).toBe('open')
      expect(result?.target).toBe('Panel')
      expect(result?.animation).toBe('slide-up')
      expect(result?.duration).toBe(300)
    })
  })

  describe('parseEventHandler', () => {
    it('returns null for non-event token', () => {
      const ctx = createContext('Box')
      expect(parseEventHandler(ctx, 0)).toBeNull()
    })

    it('parses onclick handler', () => {
      const ctx = createContext('onclick')
      const result = parseEventHandler(ctx, 0)
      expect(result?.event).toBe('onclick')
    })

    it('parses onhover handler', () => {
      const ctx = createContext('onhover')
      const result = parseEventHandler(ctx, 0)
      expect(result?.event).toBe('onhover')
    })

    it('parses handler with inline action', () => {
      const ctx = createContext('onclick toggle Menu')
      const result = parseEventHandler(ctx, 0)
      expect(result?.event).toBe('onclick')
      expect(result?.actions).toHaveLength(1)
      expect(result?.actions[0]).toHaveProperty('type', 'toggle')
    })

    it('parses handler with block actions', () => {
      const ctx = createContext('onclick\n  open Modal\n  close Sidebar')
      const result = parseEventHandler(ctx, 0)
      expect(result?.event).toBe('onclick')
      expect(result?.actions.length).toBeGreaterThanOrEqual(1)
    })

    it('stops at less indented line', () => {
      const ctx = createContext('onclick\n  toggle Menu\nBox')
      const result = parseEventHandler(ctx, 0)
      expect(result?.event).toBe('onclick')
      // Should not consume the Box token
      expect(ctx.current()?.value).toBe('Box')
    })

    it('records line number', () => {
      const ctx = createContext('onclick open Menu')
      const result = parseEventHandler(ctx, 0)
      expect(result?.line).toBeDefined()
    })
  })
})
