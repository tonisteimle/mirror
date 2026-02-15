/**
 * Tests for NL Translation Meta-Requests
 *
 * Tests the LLM's ability to handle meta-requests like
 * "generate tokens for a login app" - not just simple UI translations.
 *
 * These tests call the translation service directly (MVVM-style)
 * without needing the browser UI.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { buildContext, shouldTranslate } from '../../services/nl-translation'

// Mock API response for testing without actual API calls
const mockLLMResponse = (prompt: string): string => {
  // Simulate what the LLM should return for different inputs

  if (prompt.includes('generiere tokens für eine login')) {
    return `$primary: #3B82F6
$error: #EF4444
$success: #10B981
$bg: #1E1E2E
$bg-card: #2A2A3E
$text: #FFFFFF
$text-muted: #9CA3AF
$spacing: 16
$spacing-sm: 8
$radius: 8
$input-bg: #374151`
  }

  if (prompt.includes('erstelle ein login formular')) {
    return `Form vertical gap $spacing padding $spacing background $bg-card radius $radius
  Input placeholder "Email" type email
  Input placeholder "Passwort" type password
  Button background $primary width full "Anmelden"`
  }

  if (prompt.includes('button mit primary')) {
    return 'Button background $primary "Button"'
  }

  return prompt // fallback: return as-is
}

describe('NL Meta-Requests', () => {

  describe('shouldTranslate', () => {
    it('should translate meta-requests', () => {
      // Meta-requests should be translated
      expect(shouldTranslate('generiere tokens für eine login app')).toBe(true)
      expect(shouldTranslate('erstelle ein login formular')).toBe(true)
      expect(shouldTranslate('mach mir eine navbar')).toBe(true)
    })

    it('should translate UI descriptions', () => {
      expect(shouldTranslate('blauer button')).toBe(true)
      expect(shouldTranslate('card mit schatten')).toBe(true)
      expect(shouldTranslate('roter text')).toBe(true)
    })

    it('should NOT translate valid DSL', () => {
      expect(shouldTranslate('Button background #3B82F6 "Click"')).toBe(false)
      expect(shouldTranslate('Card padding 16 radius 8')).toBe(false)
      expect(shouldTranslate('$primary: #3B82F6')).toBe(false)
    })
  })

  describe('buildContext for meta-requests', () => {
    it('should include tokens in context for meta-requests', () => {
      const lines = ['generiere tokens für eine login app']
      const tokensCode = '$existing: #FF0000'

      const context = buildContext(lines, 0, tokensCode)

      expect(context).toContain('Tokens:')
      expect(context).toContain('$existing')
      expect(context).toContain('>>> generiere tokens')
    })

    it('should work without existing tokens', () => {
      const lines = ['generiere tokens für eine login app']

      const context = buildContext(lines, 0, '')

      expect(context).not.toContain('Tokens:')
      expect(context).toContain('>>> generiere tokens')
    })
  })

  describe('Expected LLM responses (mock)', () => {
    it('should generate tokens for login app', () => {
      const input = 'generiere tokens für eine login app'
      const response = mockLLMResponse(input)

      // Should contain semantic tokens for a login app
      expect(response).toContain('$primary')
      expect(response).toContain('$error') // for validation
      expect(response).toContain('$input-bg') // for input fields
      expect(response).toContain('$spacing')

      // Should be multiple lines
      const lines = response.split('\n')
      expect(lines.length).toBeGreaterThan(5)
    })

    it('should generate login form structure', () => {
      const input = 'erstelle ein login formular'
      const response = mockLLMResponse(input)

      // Should contain form structure
      expect(response).toContain('Form')
      expect(response).toContain('Input')
      expect(response).toContain('Button')
      expect(response).toContain('Email')
      expect(response).toContain('Passwort')

      // Should use tokens
      expect(response).toContain('$spacing')
      expect(response).toContain('$primary')
    })

    it('should still handle simple UI translations', () => {
      const input = 'button mit primary farbe'
      const response = mockLLMResponse(input)

      // Single line response
      expect(response).toBe('Button background $primary "Button"')
      expect(response.split('\n').length).toBe(1)
    })
  })

  describe('Prompt format verification', () => {
    it('documents the full prompt for token generation', () => {
      const lines = ['generiere tokens für eine dark mode login app']
      const context = buildContext(lines, 0, '')

      console.log('=== PROMPT FOR TOKEN GENERATION ===')
      console.log(context)
      console.log('===================================')

      // The prompt should clearly show this is a meta-request
      expect(context).toContain('generiere tokens')
    })

    it('documents the full prompt for form generation with existing tokens', () => {
      const tokensCode = `$primary: #3B82F6
$bg-card: #2A2A3E
$spacing: 16
$radius: 8`

      const lines = [
        'App vertical',
        '  erstelle ein login formular',
        '  Footer'
      ]

      const context = buildContext(lines, 1, tokensCode)

      console.log('=== PROMPT FOR FORM GENERATION ===')
      console.log(context)
      console.log('==================================')

      // Should have tokens AND context
      expect(context).toContain('$primary')
      expect(context).toContain('App vertical')
      // The >>> marker plus space, then the line with its 2-space indentation
      expect(context).toContain('>>>   erstelle ein login')
      expect(context).toContain('Footer')
    })
  })
})
