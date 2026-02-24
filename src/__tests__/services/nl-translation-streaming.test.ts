/**
 * NL Translation Service Tests
 *
 * Tests for the natural language to DSL translation service.
 * Focuses on shouldTranslate which is a pure function.
 *
 * Note: Streaming tests with live API are in the llm-e2e folder.
 */

import { describe, it, expect } from 'vitest'
import {
  shouldTranslate,
} from '../../services/nl-translation'

describe('NL Translation Service', () => {
  // ==========================================================================
  // shouldTranslate Detection
  // ==========================================================================

  describe('shouldTranslate', () => {
    describe('German Natural Language Detection', () => {
      it('should translate German descriptions', () => {
        expect(shouldTranslate('ein blauer button')).toBe(true)
        expect(shouldTranslate('toolbar mit icon buttons')).toBe(true)
        expect(shouldTranslate('navigation mit 3 items')).toBe(true)
        expect(shouldTranslate('eine karte mit titel')).toBe(true)
        expect(shouldTranslate('formular zum einloggen')).toBe(true)
      })

      it('should translate mixed German/English', () => {
        expect(shouldTranslate('button zum submit')).toBe(true)
        expect(shouldTranslate('header mit logo')).toBe(true)
        expect(shouldTranslate('card für user profile')).toBe(true)
      })

      it('should translate descriptive phrases', () => {
        expect(shouldTranslate('eine liste von items')).toBe(true)
        expect(shouldTranslate('sidebar mit menü')).toBe(true)
        expect(shouldTranslate('footer am unteren rand')).toBe(true)
      })
    })

    describe('Valid DSL Detection', () => {
      // Note: shouldTranslate now returns true for ALL non-empty, non-comment lines
      // when in LLM mode. DSL detection was removed to allow the LLM to process everything.
      it('should translate DSL code (user is in LLM mode)', () => {
        expect(shouldTranslate('Button background #3B82F6 "Click"')).toBe(true)
        expect(shouldTranslate('Box horizontal gap 16')).toBe(true)
        expect(shouldTranslate('Card: padding 16 radius 8')).toBe(true)
        expect(shouldTranslate('Input Email: "placeholder"')).toBe(true)
      })

      it('should translate component definitions (user is in LLM mode)', () => {
        expect(shouldTranslate('Card: vertical padding 16')).toBe(true)
        expect(shouldTranslate('Button: background #3B82F6')).toBe(true)
        expect(shouldTranslate('Header: horizontal between')).toBe(true)
      })

      it('should translate token definitions (user is in LLM mode)', () => {
        expect(shouldTranslate('$primary: #3B82F6')).toBe(true)
        expect(shouldTranslate('$spacing: 16')).toBe(true)
        expect(shouldTranslate('$bg-dark: #1E1E1E')).toBe(true)
        expect(shouldTranslate('$text-muted: #9CA3AF')).toBe(true)
      })

      it('should translate named instances (user is in LLM mode)', () => {
        expect(shouldTranslate('Button named SaveBtn "Save"')).toBe(true)
        expect(shouldTranslate('- Item named First "First"')).toBe(true)
        expect(shouldTranslate('Panel named Modal: hidden')).toBe(true)
      })

      it('should translate component usage with properties (user is in LLM mode)', () => {
        expect(shouldTranslate('Card padding 16 radius 8')).toBe(true)
        expect(shouldTranslate('Box vertical gap 8')).toBe(true)
        expect(shouldTranslate('Text size 14 color #666')).toBe(true)
      })
    })

    describe('Skip Cases', () => {
      it('should skip full-line comments', () => {
        expect(shouldTranslate('// This is a comment')).toBe(false)
        expect(shouldTranslate('  // Indented comment')).toBe(false)
      })

      it('should NOT skip lines with inline comments (LLM processes them)', () => {
        // Inline comments are not at the start, so they get translated
        expect(shouldTranslate('Box // inline comment')).toBe(true)
      })

      it('should skip section headers', () => {
        expect(shouldTranslate('--- Header ---')).toBe(false)
        expect(shouldTranslate('--- Einführung ---')).toBe(false)
        expect(shouldTranslate('--- Components ---')).toBe(false)
      })

      it('should skip empty lines', () => {
        expect(shouldTranslate('')).toBe(false)
        expect(shouldTranslate('   ')).toBe(false)
        expect(shouldTranslate('\t')).toBe(false)
        expect(shouldTranslate('\n')).toBe(false)
      })

      it('should translate events block keywords (LLM processes them)', () => {
        // In LLM mode, everything gets sent to LLM for processing
        expect(shouldTranslate('events')).toBe(true)
        expect(shouldTranslate('  SaveBtn onclick')).toBe(true)
      })

      it('should translate state definitions (LLM processes them)', () => {
        // In LLM mode, everything gets sent to LLM for processing
        expect(shouldTranslate('state hover')).toBe(true)
        expect(shouldTranslate('  state active')).toBe(true)
      })
    })

    describe('Edge Cases', () => {
      it('should handle short input that looks like NL', () => {
        // The implementation doesn't have a length check - short NL still translates
        expect(shouldTranslate('a')).toBe(true)  // Single letter triggers translation
        expect(shouldTranslate('ab')).toBe(true)  // Short text triggers translation
      })

      it('should translate all non-empty lines (user is in LLM mode)', () => {
        // In LLM mode, all valid lines are sent to the LLM
        expect(shouldTranslate('Box padding')).toBe(true)
        expect(shouldTranslate('Button "Click"')).toBe(true)
        expect(shouldTranslate('Card:')).toBe(true)
      })

      it('should translate standalone component names', () => {
        expect(shouldTranslate('Box')).toBe(true)
        expect(shouldTranslate('Button')).toBe(true)
        expect(shouldTranslate('Card')).toBe(true)
      })

      it('should handle numbers at start', () => {
        expect(shouldTranslate('3 buttons')).toBe(true)
        expect(shouldTranslate('2 spalten layout')).toBe(true)
      })
    })
  })

})
