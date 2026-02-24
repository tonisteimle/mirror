/**
 * Fix Pipeline Integration Tests
 *
 * Tests for the full self-healing pipeline.
 */

import { describe, it, expect } from 'vitest'
import {
  applyAllFixes,
  getAllFixes,
  getFixesForPhase,
} from '../../lib/self-healing/fix-pipeline'

describe('Fix Pipeline', () => {
  describe('getAllFixes', () => {
    it('returns all registered fixes', () => {
      const fixes = getAllFixes()
      expect(fixes.length).toBeGreaterThan(20)
    })

    it('includes fixes from all phases', () => {
      const fixes = getAllFixes()
      const phases = new Set(fixes.map(f => f.phase))
      expect(phases).toContain('css-cleanup')
      expect(phases).toContain('color-value')
      expect(phases).toContain('token')
      expect(phases).toContain('typo')
      expect(phases).toContain('structural')
    })
  })

  describe('getFixesForPhase', () => {
    it('returns fixes for css-cleanup phase', () => {
      const fixes = getFixesForPhase('css-cleanup')
      expect(fixes.length).toBeGreaterThan(0)
      expect(fixes.every(f => f.phase === 'css-cleanup')).toBe(true)
    })

    it('returns fixes for token phase', () => {
      const fixes = getFixesForPhase('token')
      expect(fixes.length).toBeGreaterThan(0)
      expect(fixes.every(f => f.phase === 'token')).toBe(true)
    })
  })

  describe('applyAllFixes', () => {
    it('applies CSS fixes', () => {
      const code = 'Box padding: 16px !important'
      const result = applyAllFixes(code)
      expect(result).not.toContain('!important')
      expect(result).not.toContain('px')
      expect(result).not.toContain(':')
    })

    it('applies color fixes', () => {
      const code = 'Box bg rgba(255, 0, 0, 1) color white'
      const result = applyAllFixes(code)
      expect(result).toContain('#FF0000')
      expect(result).toContain('#FFFFFF')
    })

    it('applies token fixes', () => {
      const code = `$primary: #3B82F6
Box bg primary`
      const result = applyAllFixes(code)
      expect(result).toContain('bg $primary')
    })

    it('applies typo fixes', () => {
      const code = 'Button onlick toogle Menu'
      const result = applyAllFixes(code)
      expect(result).toContain('onclick')
      expect(result).toContain('toggle')
    })

    it('applies structural fixes', () => {
      const code = `Nav
  NavLink "Home"
  NavLink "About"`
      const result = applyAllFixes(code)
      expect(result).toContain('- NavLink')
    })

    it('handles complex LLM output', () => {
      const code = `$bg: #1E1E2E $text: #FFFFFF $accent: #3B82F6

Card: 300 200 radius 12

Card background bg color text
  Title
    "Welcome"
  Button onlick toogle Menu
    "Click me"

  Nav
    NavLink "Home"
    NavLink "About"
    NavLink "Contact"`

      const result = applyAllFixes(code)

      // Token fixes
      expect(result).toContain('$bg:')
      expect(result).toContain('$text:')

      // Should merge text
      expect(result).not.toMatch(/Title\s+\n\s+"Welcome"/)

      // Typo fixes
      expect(result).toContain('onclick')
      expect(result).toContain('toggle')

      // Duplicate element fix
      expect(result).toContain('- NavLink')
    })

    it('preserves valid code', () => {
      // Use code that won't be modified by structural fixes
      const code = `$primary: #3B82F6

Card: pad 16, bg $primary, rad 8
  Title:

Card
  Title "Welcome"`

      const result = applyAllFixes(code)

      // Should preserve structure
      expect(result).toContain('$primary: #3B82F6')
      expect(result).toContain('Card:')
      expect(result).toContain('Title:')
      expect(result).toContain('Title "Welcome"')
    })

    it('handles empty code', () => {
      expect(applyAllFixes('')).toBe('')
    })

    it('handles code with only comments', () => {
      const code = '// This is a comment'
      expect(applyAllFixes(code)).toBe(code)
    })
  })
})

describe('Fix Application Order', () => {
  it('applies CSS cleanup before color fixes', () => {
    // px suffix should be removed before color conversion
    const code = 'Box shadow 0 4px 8px rgba(0,0,0,0.3)'
    const result = applyAllFixes(code)
    expect(result).toBe('Box shadow md')
  })

  it('applies token fixes before structural fixes', () => {
    // Token prefix should be added before orphaned keyword fix
    const code = `$spacing: 16
Box
  gap
  spacing`
    const result = applyAllFixes(code)
    expect(result).toContain('$spacing')
  })
})
