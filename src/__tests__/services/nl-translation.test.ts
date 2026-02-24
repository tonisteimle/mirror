/**
 * Tests for NL Translation Service
 *
 * Tests that the translation service properly uses tokens from context.
 */

import { describe, it, expect } from 'vitest'
import { shouldTranslate } from '../../services/nl-translation'
import { applyAllFixes, validateMirrorCode } from '../../lib/self-healing'

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
