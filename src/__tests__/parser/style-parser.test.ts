/**
 * Style Parser Tests
 *
 * Tests for style-related parsing:
 * - Style groups: (hor cen gap 8)
 * - Style mixins: (hor cen gap 8):styleName
 * - CSS shorthand expansion for pad/mar (1-4 values)
 * - Directional properties (u, d, l, r)
 * - Applying mixins to nodes
 */

import { describe, it, expect } from 'vitest'
import { parseStyleGroup, applyMixin } from '../../parser/style-parser'
import {
  token,
  createContextFromTokens,
  createASTNode,
  createStyleMixin,
} from '../kit/ast-builders'

describe('style-parser', () => {
  describe('parseStyleGroup', () => {
    describe('simple properties', () => {
      it('parses property with number value', () => {
        const tokens = [
          token.property('gap'),
          token.number('8'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ gap: 8 })
      })

      it('parses property with color value', () => {
        const tokens = [
          token.property('bg'),
          token.color('#FF0000'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ bg: '#FF0000' })
      })

      it('parses boolean property', () => {
        const tokens = [
          token.property('wrap'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ wrap: true })
      })

      it('parses multiple properties', () => {
        const tokens = [
          token.property('gap'),
          token.number('8'),
          token.property('rad'),
          token.number('4'),
          token.property('bg'),
          token.color('#FFF'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          gap: 8,
          rad: 4,
          bg: '#FFF',
        })
      })
    })

    describe('hor/ver properties', () => {
      it('parses hor with main alignment', () => {
        const tokens = [
          token.property('hor'),
          token.direction('cen'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          hor: true,
          align_main: 'cen',
        })
      })

      it('parses ver with main alignment', () => {
        const tokens = [
          token.property('ver'),
          token.direction('cen'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          ver: true,
          align_main: 'cen',
        })
      })

      it('parses hor with main and cross alignment', () => {
        const tokens = [
          token.property('hor'),
          token.direction('cen'),
          token.direction('cen'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          hor: true,
          align_main: 'cen',
          align_cross: 'cen',
        })
      })

      it('parses hor with between alignment', () => {
        const tokens = [
          token.property('hor'),
          token.property('between'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          hor: true,
          align_main: 'between',
        })
      })

      it('parses hor-cen shorthand', () => {
        const tokens = [
          token.property('hor'),
          token.property('cen'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          hor: true,
          align_main: 'cen',
        })
      })
    })

    describe('cen property', () => {
      it('parses single cen as main alignment', () => {
        const tokens = [
          token.property('cen'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          align_main: 'cen',
        })
      })

      it('parses cen cen as both alignments', () => {
        const tokens = [
          token.property('cen'),
          token.property('cen'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          align_main: 'cen',
          align_cross: 'cen',
        })
      })
    })

    describe('padding with CSS shorthand', () => {
      it('parses pad with single value', () => {
        const tokens = [
          token.property('pad'),
          token.number('16'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ pad: 16 })
      })

      it('parses pad with 2 values (vertical, horizontal)', () => {
        const tokens = [
          token.property('pad'),
          token.number('10'),
          token.number('20'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          pad_u: 10,
          pad_d: 10,
          pad_l: 20,
          pad_r: 20,
        })
      })

      it('parses pad with 3 values (top, horizontal, bottom)', () => {
        const tokens = [
          token.property('pad'),
          token.number('10'),
          token.number('20'),
          token.number('30'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          pad_u: 10,
          pad_l: 20,
          pad_r: 20,
          pad_d: 30,
        })
      })

      it('parses pad with 4 values (top, right, bottom, left)', () => {
        const tokens = [
          token.property('pad'),
          token.number('10'),
          token.number('20'),
          token.number('30'),
          token.number('40'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          pad_u: 10,
          pad_r: 20,
          pad_d: 30,
          pad_l: 40,
        })
      })
    })

    describe('margin with CSS shorthand', () => {
      it('parses mar with single value', () => {
        const tokens = [
          token.property('mar'),
          token.number('8'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ mar: 8 })
      })

      it('parses mar with 2 values', () => {
        const tokens = [
          token.property('mar'),
          token.number('5'),
          token.number('10'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          mar_u: 5,
          mar_d: 5,
          mar_l: 10,
          mar_r: 10,
        })
      })
    })

    describe('directional properties', () => {
      it('parses pad with single direction', () => {
        const tokens = [
          token.property('pad'),
          token.direction('l'),
          token.number('16'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ pad_l: 16 })
      })

      it('parses pad with multiple directions', () => {
        const tokens = [
          token.property('pad'),
          token.direction('l-r'),
          token.number('16'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          pad_l: 16,
          pad_r: 16,
        })
      })

      it('parses mar with vertical directions', () => {
        const tokens = [
          token.property('mar'),
          token.direction('u-d'),
          token.number('8'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({
          mar_u: 8,
          mar_d: 8,
        })
      })

      it('parses bor with direction', () => {
        const tokens = [
          token.property('bor'),
          token.direction('d'),
          token.number('1'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ bor_d: 1 })
      })
    })

    describe('comma separators', () => {
      it('parses properties with comma separators', () => {
        const tokens = [
          token.property('gap'),
          token.number('8'),
          token.comma(),
          token.property('rad'),
          token.number('4'),
          token.parenClose(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ gap: 8, rad: 4 })
      })
    })

    describe('edge cases', () => {
      it('handles empty style group', () => {
        const tokens = [token.parenClose()]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result).toEqual({ properties: {} })
      })

      it('stops at newline', () => {
        const tokens = [
          token.property('gap'),
          token.number('8'),
          token.newline(),
          token.property('rad'),
          token.number('4'),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ gap: 8 })
      })

      it('stops at EOF', () => {
        const tokens = [
          token.property('gap'),
          token.number('8'),
          token.eof(),
        ]
        const ctx = createContextFromTokens(tokens)

        const result = parseStyleGroup(ctx)

        expect(result.properties).toEqual({ gap: 8 })
      })
    })
  })

  describe('applyMixin', () => {
    it('applies properties to node', () => {
      const node = createASTNode()
      const mixin = createStyleMixin({
        properties: { gap: 8, bg: '#FFF' },
      })

      applyMixin(node, mixin)

      expect(node.properties).toEqual({ gap: 8, bg: '#FFF' })
    })

    it('does not override existing properties', () => {
      const node = createASTNode({
        properties: { gap: 16 },
      })
      const mixin = createStyleMixin({
        properties: { gap: 8, bg: '#FFF' },
      })

      applyMixin(node, mixin)

      expect(node.properties).toEqual({ gap: 16, bg: '#FFF' })
    })

    it('handles empty mixin', () => {
      const node = createASTNode({
        properties: { w: 100 },
      })
      const mixin = createStyleMixin()

      applyMixin(node, mixin)

      expect(node.properties).toEqual({ w: 100 })
    })
  })
})
