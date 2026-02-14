/**
 * Doc Tokens Tests
 */

import { describe, it, expect } from 'vitest'
import {
  DOC_TOKENS,
  getDocToken,
  isDocToken,
  docTokenToStyles,
  isBlockToken,
  isInlineToken
} from '../../parser/doc-tokens'

describe('doc-tokens', () => {
  describe('DOC_TOKENS', () => {
    it('contains heading tokens', () => {
      expect(DOC_TOKENS.h1).toBeDefined()
      expect(DOC_TOKENS.h2).toBeDefined()
      expect(DOC_TOKENS.h3).toBeDefined()
      expect(DOC_TOKENS.h4).toBeDefined()
    })

    it('contains text tokens', () => {
      expect(DOC_TOKENS.p).toBeDefined()
      expect(DOC_TOKENS.lead).toBeDefined()
    })

    it('contains inline tokens', () => {
      expect(DOC_TOKENS.b).toBeDefined()
      expect(DOC_TOKENS.i).toBeDefined()
      expect(DOC_TOKENS.code).toBeDefined()
      expect(DOC_TOKENS.link).toBeDefined()
    })

    it('h2 has correct default styles', () => {
      expect(DOC_TOKENS.h2.size).toBe(28)
      expect(DOC_TOKENS.h2.weight).toBe(500)
      expect(DOC_TOKENS.h2.col).toBe('#fff')
    })

    it('p has correct default styles', () => {
      expect(DOC_TOKENS.p.size).toBe(14)
      expect(DOC_TOKENS.p.col).toBe('#777')
      expect(DOC_TOKENS.p.line).toBe(1.7)
    })

    it('code has monospace font', () => {
      expect(DOC_TOKENS.code.font).toContain('monospace')
      expect(DOC_TOKENS.code.bg).toBe('#252525')
    })

    it('link has underline', () => {
      expect(DOC_TOKENS.link.underline).toBe(true)
      expect(DOC_TOKENS.link.cursor).toBe('pointer')
    })
  })

  describe('getDocToken', () => {
    it('returns token for known name', () => {
      const token = getDocToken('h2')
      expect(token).toBeDefined()
      expect(token!.size).toBe(28)
    })

    it('returns undefined for unknown name', () => {
      const token = getDocToken('unknown')
      expect(token).toBeUndefined()
    })
  })

  describe('isDocToken', () => {
    it('returns true for known tokens', () => {
      expect(isDocToken('h1')).toBe(true)
      expect(isDocToken('p')).toBe(true)
      expect(isDocToken('b')).toBe(true)
    })

    it('returns false for unknown tokens', () => {
      expect(isDocToken('unknown')).toBe(false)
      expect(isDocToken('custom')).toBe(false)
    })
  })

  describe('docTokenToStyles', () => {
    it('converts size to fontSize', () => {
      const styles = docTokenToStyles({ size: 28 })
      expect(styles.fontSize).toBe('28px')
    })

    it('converts weight to fontWeight', () => {
      const styles = docTokenToStyles({ weight: 600 })
      expect(styles.fontWeight).toBe('600')
    })

    it('converts col to color', () => {
      const styles = docTokenToStyles({ col: '#fff' })
      expect(styles.color).toBe('#fff')
    })

    it('converts bg to backgroundColor', () => {
      const styles = docTokenToStyles({ bg: '#252525' })
      expect(styles.backgroundColor).toBe('#252525')
    })

    it('converts italic to fontStyle', () => {
      const styles = docTokenToStyles({ italic: true })
      expect(styles.fontStyle).toBe('italic')
    })

    it('converts underline to textDecoration', () => {
      const styles = docTokenToStyles({ underline: true })
      expect(styles.textDecoration).toBe('underline')
    })

    it('converts margin shorthand', () => {
      const styles = docTokenToStyles({ mar: '48 0 16' })
      expect(styles.margin).toBe('48px 0px 16px')
    })

    it('converts padding shorthand', () => {
      const styles = docTokenToStyles({ pad: '2 6' })
      expect(styles.padding).toBe('2px 6px')
    })

    it('converts rad to borderRadius', () => {
      const styles = docTokenToStyles({ rad: 3 })
      expect(styles.borderRadius).toBe('3px')
    })

    it('handles full token definition', () => {
      const styles = docTokenToStyles(DOC_TOKENS.h2)
      expect(styles.fontSize).toBe('28px')
      expect(styles.fontWeight).toBe('500')
      expect(styles.color).toBe('#fff')
      expect(styles.margin).toBe('48px 0px 16px')
    })
  })

  describe('isBlockToken', () => {
    it('returns true for block tokens', () => {
      expect(isBlockToken('h1')).toBe(true)
      expect(isBlockToken('h2')).toBe(true)
      expect(isBlockToken('p')).toBe(true)
      expect(isBlockToken('lead')).toBe(true)
    })

    it('returns false for inline tokens', () => {
      expect(isBlockToken('b')).toBe(false)
      expect(isBlockToken('i')).toBe(false)
      expect(isBlockToken('code')).toBe(false)
    })
  })

  describe('isInlineToken', () => {
    it('returns true for inline tokens', () => {
      expect(isInlineToken('b')).toBe(true)
      expect(isInlineToken('bold')).toBe(true)
      expect(isInlineToken('i')).toBe(true)
      expect(isInlineToken('italic')).toBe(true)
      expect(isInlineToken('code')).toBe(true)
      expect(isInlineToken('link')).toBe(true)
    })

    it('returns false for block tokens', () => {
      expect(isInlineToken('h1')).toBe(false)
      expect(isInlineToken('p')).toBe(false)
    })
  })
})
