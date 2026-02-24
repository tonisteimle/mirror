/**
 * Post-Processor Unit Tests
 *
 * Tests the comprehensive error correction capabilities
 */

import { describe, it, expect } from 'vitest'
import { postProcess } from './post-processor'

describe('Post-Processor', () => {
  describe('Component Typo Corrections', () => {
    it('corrects Buttn to Button', () => {
      const result = postProcess('Buttn bg #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
      expect(result.wasModified).toBe(true)
    })

    it('corrects Crad to Card', () => {
      const result = postProcess('Crad pad 16')
      expect(result.processed).toBe('Card pad 16')
    })

    it('corrects lowercase component names', () => {
      const result = postProcess('button bg #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })

    it('corrects HTML elements to Mirror', () => {
      const result = postProcess('Div pad 16')
      expect(result.processed).toBe('Box pad 16')
    })
  })

  describe('Property Typo Corrections', () => {
    it('corrects backgrund to bg', () => {
      const result = postProcess('Button backgrund #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })

    it('corrects paddng to pad', () => {
      const result = postProcess('Card paddng 16')
      expect(result.processed).toBe('Card pad 16')
    })

    it('corrects German keywords', () => {
      const result = postProcess('Button hintergrund #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })
  })

  describe('CSS to Mirror Conversion', () => {
    it('removes px suffix', () => {
      const result = postProcess('Card pad 16px')
      expect(result.processed).toBe('Card pad 16')
    })

    it('converts background-color: to bg', () => {
      const result = postProcess('Button background-color: #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })

    it('converts font-size: to fs', () => {
      const result = postProcess('Text font-size: 24')
      expect(result.processed).toBe('Text fs 24')
    })

    it('removes CSS colons after properties', () => {
      const result = postProcess('Button bg: #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })
  })

  describe('Value Corrections', () => {
    it('adds missing # to hex colors', () => {
      const result = postProcess('Button bg 3B82F6')
      expect(result.processed).toBe('Button bg #3B82F6')
    })

    it('converts rgb() to hex', () => {
      const result = postProcess('Box bg rgb(59, 130, 246)')
      expect(result.processed).toMatch(/bg #[0-9a-f]{6}/i)
    })

    it('converts rem to number', () => {
      const result = postProcess('Card pad 1rem')
      expect(result.processed).toBe('Card pad 16')
    })

    it('converts 100% to full', () => {
      const result = postProcess('Box width 100%')
      expect(result.processed).toBe('Box width full')
    })
  })

  describe('Structural Fixes', () => {
    it('removes curly braces', () => {
      const result = postProcess('Button { bg #333 }')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })

    it('replaces semicolons (converts to spaces or commas)', () => {
      const result = postProcess('Card bg #333; pad 16;')
      // Semicolons should be removed; result may or may not have commas
      expect(result.processed).not.toContain(';')
      expect(result.processed).toContain('bg #333')
      expect(result.processed).toContain('pad 16')
    })

    it('converts HTML tags to Mirror', () => {
      const result = postProcess('<div>Hello</div>')
      expect(result.processed).toBe('Box "Hello"')
    })
  })

  describe('Quote Fixes', () => {
    it('converts single quotes to double quotes', () => {
      const result = postProcess("Button 'Click me'")
      expect(result.processed).toBe('Button "Click me"')
    })

    it('converts backticks to double quotes', () => {
      const result = postProcess('Button `Click me`')
      expect(result.processed).toBe('Button "Click me"')
    })
  })

  describe('Complex Multi-Error Cases', () => {
    it('fixes multiple errors at once', () => {
      const result = postProcess('buttn background-color: 3B82F6; padding: 16px;')
      // Should fix: buttn→Button, background-color:→bg, add #, padding:→pad, remove px
      expect(result.processed).toContain('Button')
      expect(result.processed).toContain('bg')
      expect(result.processed).toContain('#3B82F6')
      expect(result.processed).toContain('pad')
      expect(result.processed).toContain('16')
      expect(result.processed).not.toContain('px')
      expect(result.processed).not.toContain(';')
    })

    it('fixes nested components with errors', () => {
      const result = postProcess('Crad pad 16px\n  Buttn bg: #333')
      expect(result.processed).toContain('Card pad 16')
      expect(result.processed).toContain('Button bg #333')
    })
  })

  describe('Indentation Normalization', () => {
    it('normalizes 4-space to 2-space indentation', () => {
      const result = postProcess('Card\n    Button "Click"')
      expect(result.processed).toBe('Card\n  Button "Click"')
    })

    it('converts tabs to 2-space', () => {
      const result = postProcess('Card\n\tButton "Click"')
      expect(result.processed).toBe('Card\n  Button "Click"')
    })
  })

  describe('Color Name Conversion', () => {
    it('converts basic color names to hex', () => {
      const result = postProcess('Button bg red')
      // Self-healing uses CSS standard red, post-processor may use Tailwind
      expect(result.processed).toMatch(/Button bg #[A-Fa-f0-9]{6}/)
    })

    it('converts Tailwind colors to hex', () => {
      const result = postProcess('Button bg blue-500')
      expect(result.processed).toBe('Button bg #3B82F6')
    })

    it('converts German color names', () => {
      const result = postProcess('Button bg blau')
      expect(result.processed).toMatch(/Button bg #[A-Fa-f0-9]{6}/)
    })
  })

  describe('Fuzzy Component Matching', () => {
    it('matches Buton to Button', () => {
      const result = postProcess('Buton bg #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })

    it('matches Togle to Toggle', () => {
      const result = postProcess('Togle')
      expect(result.processed).toBe('Toggle')
    })
  })

  describe('German Keyword Conversion', () => {
    it('converts hintergrund to bg', () => {
      const result = postProcess('Button hintergrund #333')
      // Note: #333 is expanded to #333333 by the self-healing system
      expect(result.processed).toBe('Button bg #333333')
    })

    it('converts abstand to pad', () => {
      const result = postProcess('Card abstand 16')
      expect(result.processed).toBe('Card pad 16')
    })
  })
})
