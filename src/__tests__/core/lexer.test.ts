import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'

describe('Lexer', () => {
  describe('Basic Tokens', () => {
    it('tokenizes component names', () => {
      const tokens = tokenize('Button')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Button' })
    })

    it('tokenizes component definitions (with colon)', () => {
      const tokens = tokenize('Button: pad 8')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_DEF', value: 'Button' })
    })

    it('tokenizes properties', () => {
      const tokens = tokenize('Button pad 8 col #FFF')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Button' })
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'pad' })
      expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '8' })
      expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'col' })
      expect(tokens[4]).toMatchObject({ type: 'COLOR', value: '#FFF' })
    })

    it('tokenizes strings', () => {
      const tokens = tokenize('Button "Click me"')
      expect(tokens[1]).toMatchObject({ type: 'STRING', value: 'Click me' })
    })

    it('tokenizes directions', () => {
      const tokens = tokenize('Button pad l r 8')
      expect(tokens[2]).toMatchObject({ type: 'DIRECTION', value: 'l' })
      expect(tokens[3]).toMatchObject({ type: 'DIRECTION', value: 'r' })
    })
  })

  describe('Layout Properties', () => {
    it('tokenizes hor and ver', () => {
      const tokens = tokenize('Container hor')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'hor' })

      const tokens2 = tokenize('Container ver')
      expect(tokens2[1]).toMatchObject({ type: 'PROPERTY', value: 'ver' })
    })

    it('tokenizes gap, between, wrap, grow', () => {
      const tokens = tokenize('List ver gap 16 between wrap grow')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'ver' })
      expect(tokens[2]).toMatchObject({ type: 'PROPERTY', value: 'gap' })
      expect(tokens[3]).toMatchObject({ type: 'NUMBER', value: '16' })
      expect(tokens[4]).toMatchObject({ type: 'PROPERTY', value: 'between' })
      expect(tokens[5]).toMatchObject({ type: 'PROPERTY', value: 'wrap' })
      expect(tokens[6]).toMatchObject({ type: 'PROPERTY', value: 'grow' })
    })
  })

  describe('Alignment Properties', () => {
    it('tokenizes hor-l, hor-cen, hor-r', () => {
      const tokens = tokenize('Box hor-l')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'hor-l' })

      const tokens2 = tokenize('Box hor-cen')
      expect(tokens2[1]).toMatchObject({ type: 'PROPERTY', value: 'hor-cen' })

      const tokens3 = tokenize('Box hor-r')
      expect(tokens3[1]).toMatchObject({ type: 'PROPERTY', value: 'hor-r' })
    })

    it('tokenizes ver-t, ver-cen, ver-b', () => {
      const tokens = tokenize('Box ver-t')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'ver-t' })

      const tokens2 = tokenize('Box ver-cen')
      expect(tokens2[1]).toMatchObject({ type: 'PROPERTY', value: 'ver-cen' })

      const tokens3 = tokenize('Box ver-b')
      expect(tokens3[1]).toMatchObject({ type: 'PROPERTY', value: 'ver-b' })
    })
  })

  describe('Keywords', () => {
    it('tokenizes "from" keyword', () => {
      const tokens = tokenize('DangerButton from Button')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'DangerButton' })
      expect(tokens[1]).toMatchObject({ type: 'KEYWORD', value: 'from' })
      expect(tokens[2]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Button' })
    })

    it('tokenizes "from" in component definition', () => {
      const tokens = tokenize('DangerButton: from Button col #EF4444')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_DEF', value: 'DangerButton' })
      expect(tokens[1]).toMatchObject({ type: 'KEYWORD', value: 'from' })
      expect(tokens[2]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Button' })
      expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'col' })
    })
  })

  describe('Icons', () => {
    it('tokenizes icon property', () => {
      const tokens = tokenize('Button icon "star"')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'icon' })
      expect(tokens[2]).toMatchObject({ type: 'STRING', value: 'star' })
    })
  })

  describe('Sizing Properties', () => {
    it('tokenizes w, h, full', () => {
      const tokens = tokenize('Box w 200 h 100 full')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'w' })
      expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '200' })
      expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'h' })
      expect(tokens[4]).toMatchObject({ type: 'NUMBER', value: '100' })
      expect(tokens[5]).toMatchObject({ type: 'PROPERTY', value: 'full' })
    })

    it('tokenizes minw, maxw, minh, maxh', () => {
      const tokens = tokenize('Box minw 100 maxw 500 minh 50 maxh 300')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'minw' })
      expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'maxw' })
      expect(tokens[5]).toMatchObject({ type: 'PROPERTY', value: 'minh' })
      expect(tokens[7]).toMatchObject({ type: 'PROPERTY', value: 'maxh' })
    })
  })

  describe('Border Properties', () => {
    it('tokenizes rad, border, boc', () => {
      const tokens = tokenize('Card rad 8 border 1 boc #333')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'rad' })
      expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'border' })
      expect(tokens[5]).toMatchObject({ type: 'PROPERTY', value: 'boc' })
    })
  })

  describe('Typography Properties', () => {
    it('tokenizes size, weight, font', () => {
      const tokens = tokenize('Text size 16 weight 600 font "Inter"')
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'size' })
      expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'weight' })
      expect(tokens[5]).toMatchObject({ type: 'PROPERTY', value: 'font' })
      expect(tokens[6]).toMatchObject({ type: 'STRING', value: 'Inter' })
    })
  })

  describe('Indentation', () => {
    it('tokenizes indented children', () => {
      const tokens = tokenize('Parent\n  Child')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Parent' })
      expect(tokens[1]).toMatchObject({ type: 'NEWLINE' })
      expect(tokens[2]).toMatchObject({ type: 'INDENT', value: '2' })
      expect(tokens[3]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Child' })
    })
  })
})
