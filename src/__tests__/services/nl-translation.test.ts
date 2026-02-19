/**
 * Tests for NL Translation Service
 *
 * Tests that the translation service properly uses tokens from context.
 */

import { describe, it, expect } from 'vitest'
import { buildContext, shouldTranslate } from '../../services/nl-translation'
import { applyAllFixes, validateMirrorCode } from '../../lib/ai-selfhealing'

describe('NL Translation Service', () => {
  describe('shouldTranslate', () => {
    // Note: shouldTranslate now returns true for ALL non-empty, non-comment lines
    // when in LLM mode. The LLM processes everything including valid DSL.

    it('should translate natural language descriptions', () => {
      expect(shouldTranslate('toolbar mit icon buttons')).toBe(true)
      expect(shouldTranslate('ein blauer button')).toBe(true)
      expect(shouldTranslate('navigation mit 3 items')).toBe(true)
    })

    it('should translate DSL code (user is in LLM mode)', () => {
      expect(shouldTranslate('Button background #3B82F6 "Click"')).toBe(true)
      expect(shouldTranslate('Box horizontal gap 16')).toBe(true)
      expect(shouldTranslate('Card: padding 16 radius 8')).toBe(true)
    })

    it('should translate token definitions (user is in LLM mode)', () => {
      expect(shouldTranslate('$primary: #3B82F6')).toBe(true)
      expect(shouldTranslate('$spacing: 16')).toBe(true)
    })

    it('should skip comments and section headers', () => {
      expect(shouldTranslate('// This is a comment')).toBe(false)
      expect(shouldTranslate('--- Header ---')).toBe(false)
    })

    it('should skip empty lines', () => {
      expect(shouldTranslate('')).toBe(false)
      expect(shouldTranslate('   ')).toBe(false)
    })
  })

  describe('buildContext', () => {
    const tokensCode = `$primary: #3B82F6
$bg-dark: #1E1E2E
$spacing: 16
$rad 8`

    const layoutLines = [
      'Header horizontal between',
      '  Logo width 120',
      '  Nav horizontal gap 16',
      'toolbar mit buttons', // Line to translate (index 3)
      'Content vertical',
      '  Card padding 16',
      '  Footer',
    ]

    it('should include tokens in context', () => {
      const context = buildContext(layoutLines, 3, tokensCode)

      expect(context).toContain('Tokens:')
      expect(context).toContain('$primary: #3B82F6')
      expect(context).toContain('$spacing: 16')
    })

    it('should mark the target line with >>>', () => {
      const context = buildContext(layoutLines, 3, tokensCode)

      expect(context).toContain('>>> toolbar mit buttons')
    })

    it('should include surrounding context (±5 lines)', () => {
      const context = buildContext(layoutLines, 3, tokensCode)

      // Lines before
      expect(context).toContain('Header horizontal between')
      expect(context).toContain('Logo width 120')
      expect(context).toContain('Nav horizontal gap 16')

      // Lines after
      expect(context).toContain('Content vertical')
      expect(context).toContain('Card padding 16')
      expect(context).toContain('Footer')
    })

    it('should work without tokens', () => {
      const context = buildContext(layoutLines, 3)

      expect(context).not.toContain('Tokens:')
      expect(context).toContain('>>> toolbar mit buttons')
    })
  })

  describe('Token usage expectations', () => {
    // These are documentation tests showing expected LLM behavior

    it('documents expected prompt format', () => {
      const tokensCode = `$primary: #3B82F6
$bg-card: #2A2A3E
$spacing: 16
$rad 8`

      const lines = [
        'Header horizontal padding $spacing',
        'toolbar mit primary button',
        'Footer',
      ]

      const context = buildContext(lines, 1, tokensCode)

      // The context should clearly show:
      // 1. Available tokens
      // 2. Surrounding code using tokens
      // 3. The line to translate

      console.log('=== Expected prompt to LLM ===')
      console.log(context)
      console.log('=== Expected response ===')
      console.log('Toolbar horizontal gap $spacing padding $spacing background $bg-card radius $radius')
      console.log('  - Button background $primary icon "save"')

      expect(context).toContain('$primary')
      expect(context).toContain('$spacing')
    })
  })

  describe('Self-Healing Integration', () => {
    it('should fix missing $ prefix on token references', () => {
      // Simulate LLM output with common error: missing $ on token usage
      const llmOutput = `$primary: #3B82F6
$spacing: 16
Button background primary padding spacing "Click"`

      const fixed = applyAllFixes(llmOutput)

      // Should have added $ prefix to token references
      expect(fixed).toContain('background $primary')
      expect(fixed).toContain('padding $spacing')
    })

    it('should validate correct DSL code', () => {
      const validCode = 'Button background #3B82F6 padding 16 "Click"'
      const result = validateMirrorCode(validCode)

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect invalid DSL code', () => {
      // Missing component name, starts with property
      const invalidCode = 'background #3B82F6 padding 16'
      const result = validateMirrorCode(invalidCode)

      // Should have at least one issue
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should fix text on separate line', () => {
      const llmOutput = `Button background #3B82F6
  "Click me"`

      const fixed = applyAllFixes(llmOutput)

      // Should merge text onto component line
      expect(fixed).toBe('Button background #3B82F6 "Click me"')
    })
  })
})
