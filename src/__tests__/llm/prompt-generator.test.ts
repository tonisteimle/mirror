/**
 * Tests for LLM Prompt Generator
 *
 * Verifies that prompts are correctly generated from reference.json
 */

import { describe, it, expect } from 'vitest'
import {
  generateLayoutSection,
  generateColorSection,
  generateEventsSection,
  generateActionsSection,
  generateSystemStatesSection,
  generateBehaviorStatesSection,
  generateQuickReference,
  REFERENCE_VERSION,
} from '../../lib/llm/prompt-generator'

describe('Prompt Generator', () => {
  describe('generateLayoutSection', () => {
    it('includes horizontal property', () => {
      const section = generateLayoutSection()
      expect(section).toContain('horizontal')
      expect(section).toContain('hor')
    })

    it('includes vertical property', () => {
      const section = generateLayoutSection()
      expect(section).toContain('vertical')
      expect(section).toContain('ver')
    })

    it('includes gap property', () => {
      const section = generateLayoutSection()
      expect(section).toContain('gap')
    })

    it('supports list format', () => {
      const section = generateLayoutSection('list')
      expect(section).toContain('- ')
    })
  })

  describe('generateColorSection', () => {
    it('includes background property', () => {
      const section = generateColorSection()
      expect(section).toContain('background')
      expect(section).toContain('bg')
    })

    it('includes color property', () => {
      const section = generateColorSection()
      expect(section).toContain('color')
    })
  })

  describe('generateEventsSection', () => {
    it('includes onclick', () => {
      const section = generateEventsSection()
      expect(section).toContain('onclick')
    })

    it('includes onhover', () => {
      const section = generateEventsSection()
      expect(section).toContain('onhover')
    })
  })

  describe('generateActionsSection', () => {
    it('includes toggle action', () => {
      const section = generateActionsSection()
      expect(section).toContain('toggle')
    })

    it('includes show/hide actions', () => {
      const section = generateActionsSection()
      expect(section).toContain('show')
      expect(section).toContain('hide')
    })
  })

  describe('generateSystemStatesSection', () => {
    it('includes hover state', () => {
      const states = generateSystemStatesSection()
      expect(states).toContain('hover')
    })

    it('includes focus state', () => {
      const states = generateSystemStatesSection()
      expect(states).toContain('focus')
    })
  })

  describe('generateBehaviorStatesSection', () => {
    it('includes selected state', () => {
      const states = generateBehaviorStatesSection()
      expect(states).toContain('selected')
    })

    it('includes expanded state', () => {
      const states = generateBehaviorStatesSection()
      expect(states).toContain('expanded')
    })
  })

  describe('generateQuickReference', () => {
    it('returns non-empty string', () => {
      const ref = generateQuickReference()
      expect(ref.length).toBeGreaterThan(100)
    })

    it('includes syntax section', () => {
      const ref = generateQuickReference()
      expect(ref).toContain('SYNTAX')
    })

    it('includes layout section', () => {
      const ref = generateQuickReference()
      expect(ref).toContain('LAYOUT')
    })
  })

  describe('REFERENCE_VERSION', () => {
    it('is defined', () => {
      expect(REFERENCE_VERSION).toBeDefined()
    })

    it('is a valid version string', () => {
      expect(REFERENCE_VERSION).toMatch(/^\d+\.\d+/)
    })
  })
})
