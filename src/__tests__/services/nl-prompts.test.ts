/**
 * Tests for NL Translation Prompts
 *
 * Verifies that prompts are correctly structured and include key syntax.
 */

import { describe, it, expect } from 'vitest'
import { SYSTEM_PROMPT, DEEP_THINKING_PROMPT, QUICK_REFERENCE } from '../../services/nl-prompts'

describe('NL Translation Prompts', () => {
  describe('SYSTEM_PROMPT', () => {
    it('is a non-empty string', () => {
      expect(typeof SYSTEM_PROMPT).toBe('string')
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(100)
    })

    it('includes syntax section', () => {
      expect(SYSTEM_PROMPT).toContain('SYNTAX')
    })

    it('includes DRY principle', () => {
      expect(SYSTEM_PROMPT).toContain('DRY')
    })

    it('includes horizontal layout warning', () => {
      expect(SYSTEM_PROMPT).toContain('HORIZONTAL')
    })

    it('includes token usage', () => {
      expect(SYSTEM_PROMPT).toContain('TOKEN')
    })

    it('includes examples', () => {
      expect(SYSTEM_PROMPT).toContain('BEISPIELE')
    })
  })

  describe('DEEP_THINKING_PROMPT', () => {
    it('is a non-empty string', () => {
      expect(typeof DEEP_THINKING_PROMPT).toBe('string')
      expect(DEEP_THINKING_PROMPT.length).toBeGreaterThan(100)
    })

    it('includes properties section', () => {
      expect(DEEP_THINKING_PROMPT).toContain('PROPERTIES')
    })

    it('includes events section', () => {
      expect(DEEP_THINKING_PROMPT).toContain('EVENTS')
    })

    it('includes states section', () => {
      expect(DEEP_THINKING_PROMPT).toContain('STATES')
    })

    it('includes interactivity section', () => {
      expect(DEEP_THINKING_PROMPT).toContain('INTERAKTIVITÄT')
    })

    it('is longer than SYSTEM_PROMPT', () => {
      expect(DEEP_THINKING_PROMPT.length).toBeGreaterThan(SYSTEM_PROMPT.length)
    })
  })

  describe('QUICK_REFERENCE', () => {
    it('is a non-empty string', () => {
      expect(typeof QUICK_REFERENCE).toBe('string')
      expect(QUICK_REFERENCE.length).toBeGreaterThan(50)
    })

    it('includes key syntax elements', () => {
      expect(QUICK_REFERENCE).toContain('SYNTAX')
      expect(QUICK_REFERENCE).toContain('LAYOUT')
    })
  })
})
