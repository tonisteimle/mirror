import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'
import { parseAction } from '../../parser/state-parser'
import { createParserContext, type ParserContext } from '../../parser/parser-context'
import { propertiesToStyle } from '../../utils/style-converter'

describe('Overlay System', () => {
  describe('Lexer - Position Keywords', () => {
    it('tokenizes position keywords: below', () => {
      const tokens = tokenize('below')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'below' })
    })

    it('tokenizes position keywords: above', () => {
      const tokens = tokenize('above')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'above' })
    })

    it('tokenizes position keywords: left', () => {
      const tokens = tokenize('left')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'left' })
    })

    it('tokenizes position keywords: right', () => {
      const tokens = tokenize('right')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'right' })
    })

    it('tokenizes position keywords: center', () => {
      const tokens = tokenize('center')
      // Note: 'center' is tokenized as COMPONENT_NAME in the lexer
      // The parser handles it as a position keyword via isPositionKeyword()
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'center' })
    })

    it('tokenizes animation keywords', () => {
      const tokens = tokenize('slide-up')
      expect(tokens[0]).toMatchObject({ type: 'ANIMATION', value: 'slide-up' })

      const tokens2 = tokenize('slide-down')
      expect(tokens2[0]).toMatchObject({ type: 'ANIMATION', value: 'slide-down' })

      const tokens3 = tokenize('fade')
      expect(tokens3[0]).toMatchObject({ type: 'ANIMATION', value: 'fade' })

      const tokens4 = tokenize('scale')
      expect(tokens4[0]).toMatchObject({ type: 'ANIMATION', value: 'scale' })
    })

    it('tokenizes hidden property', () => {
      const tokens = tokenize('Box hidden')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Box' })
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'hidden' })
    })

    it('tokenizes visible property', () => {
      const tokens = tokenize('Box visible')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Box' })
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'visible' })
    })

    it('tokenizes opacity property', () => {
      const tokens = tokenize('Box opacity 0.5')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Box' })
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'opacity' })
      expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '0.5' })
    })

    it('tokenizes opa shorthand property', () => {
      const tokens = tokenize('Box opa 0.8')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Box' })
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'opa' })
      expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '0.8' })
    })
  })

  describe('Lexer - Open/Close Actions with Position', () => {
    it('tokenizes open action with target', () => {
      const tokens = tokenize('open Content')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'open' })
      expect(tokens[1]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Content' })
    })

    it('tokenizes open action with position', () => {
      const tokens = tokenize('open Content below')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'open' })
      expect(tokens[1]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Content' })
      expect(tokens[2]).toMatchObject({ type: 'COMPONENT_NAME', value: 'below' })
    })

    it('tokenizes open action with position and animation', () => {
      const tokens = tokenize('open Content below fade')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'open' })
      expect(tokens[1]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Content' })
      expect(tokens[2]).toMatchObject({ type: 'COMPONENT_NAME', value: 'below' })
      expect(tokens[3]).toMatchObject({ type: 'ANIMATION', value: 'fade' })
    })

    it('tokenizes open action with position, animation and duration', () => {
      const tokens = tokenize('open Content below slide-up 300')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'open' })
      expect(tokens[1]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Content' })
      expect(tokens[2]).toMatchObject({ type: 'COMPONENT_NAME', value: 'below' })
      expect(tokens[3]).toMatchObject({ type: 'ANIMATION', value: 'slide-up' })
      expect(tokens[4]).toMatchObject({ type: 'NUMBER', value: '300' })
    })

    it('tokenizes close action', () => {
      const tokens = tokenize('close Content')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'close' })
      expect(tokens[1]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Content' })
    })
  })

  describe('Parser - parseAction with Position', () => {
    function createContext(input: string): ParserContext {
      const tokens = tokenize(input)
      return createParserContext(tokens)
    }

    it('parses open action with target', () => {
      const ctx = createContext('open Dialog')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Dialog',
      })
    })

    it('parses open action with position below', () => {
      const ctx = createContext('open Content below')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Content',
        position: 'below',
      })
    })

    it('parses open action with position above', () => {
      const ctx = createContext('open Menu above')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Menu',
        position: 'above',
      })
    })

    it('parses open action with position center', () => {
      const ctx = createContext('open Dialog center')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Dialog',
        position: 'center',
      })
    })

    it('parses open action with position and animation', () => {
      const ctx = createContext('open Content below fade')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Content',
        position: 'below',
        animation: 'fade',
      })
    })

    it('parses open action with position, animation and duration', () => {
      const ctx = createContext('open Content below slide-up 300')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Content',
        position: 'below',
        animation: 'slide-up',
        duration: 300,
      })
    })

    it('parses open action with center position and fade animation', () => {
      const ctx = createContext('open Modal center fade 200')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Modal',
        position: 'center',
        animation: 'fade',
        duration: 200,
      })
    })

    it('parses close action with animation', () => {
      const ctx = createContext('close Content fade 150')
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'close',
        target: 'Content',
        animation: 'fade',
        duration: 150,
      })
    })
  })

  describe('Style Converter - hidden Property', () => {
    it('converts hidden: true to display: none', () => {
      const style = propertiesToStyle({ hidden: true }, false, 'Box')
      expect(style.display).toBe('none')
    })

    it('does not set display: none when hidden is false', () => {
      const style = propertiesToStyle({ hidden: false }, false, 'Box')
      expect(style.display).not.toBe('none')
    })

    it('hidden works with other properties', () => {
      const style = propertiesToStyle({
        hidden: true,
        bg: '#FFF',
        pad: 16
      }, false, 'Box')
      expect(style.display).toBe('none')
      expect(style.backgroundColor).toBe('#FFF')
      expect(style.padding).toBe('16px')
    })
  })

  describe('Style Converter - visible Property', () => {
    it('converts visible: true to display: flex', () => {
      const style = propertiesToStyle({ visible: true }, false, 'Box')
      expect(style.display).toBe('flex')
    })

    it('sets display none when visible is false', () => {
      const style = propertiesToStyle({ visible: false }, false, 'Box')
      expect(style.display).toBe('none')
    })
  })

  describe('Style Converter - opacity Property', () => {
    it('converts opacity to CSS opacity', () => {
      const style = propertiesToStyle({ opacity: 0.5 }, false, 'Box')
      expect(style.opacity).toBe(0.5)
    })

    it('converts opa shorthand to CSS opacity', () => {
      const style = propertiesToStyle({ opa: 0.8 }, false, 'Box')
      expect(style.opacity).toBe(0.8)
    })
  })

  describe('Full Dropdown DSL Syntax', () => {
    it('tokenizes complete dropdown trigger onclick', () => {
      const tokens = tokenize('onclick open DropdownContent below fade 200')
      expect(tokens[0]).toMatchObject({ type: 'EVENT', value: 'onclick' })
      expect(tokens[1]).toMatchObject({ type: 'COMPONENT_NAME', value: 'open' })
      expect(tokens[2]).toMatchObject({ type: 'COMPONENT_NAME', value: 'DropdownContent' })
      expect(tokens[3]).toMatchObject({ type: 'COMPONENT_NAME', value: 'below' })
      expect(tokens[4]).toMatchObject({ type: 'ANIMATION', value: 'fade' })
      expect(tokens[5]).toMatchObject({ type: 'NUMBER', value: '200' })
    })

    it('tokenizes content with hidden property', () => {
      const tokens = tokenize('Content hidden ver gap 8')
      expect(tokens[0]).toMatchObject({ type: 'COMPONENT_NAME', value: 'Content' })
      expect(tokens[1]).toMatchObject({ type: 'PROPERTY', value: 'hidden' })
      expect(tokens[2]).toMatchObject({ type: 'PROPERTY', value: 'ver' })
      expect(tokens[3]).toMatchObject({ type: 'PROPERTY', value: 'gap' })
      expect(tokens[4]).toMatchObject({ type: 'NUMBER', value: '8' })
    })
  })

  describe('Edge Cases', () => {
    it('open without position defaults to no position in action', () => {
      const ctx = createParserContext(tokenize('open Dialog'))
      const action = parseAction(ctx)
      expect(action?.position).toBeUndefined()
    })

    it('open with only animation (no position)', () => {
      const ctx = createParserContext(tokenize('open Dialog fade'))
      const action = parseAction(ctx)
      expect(action).toMatchObject({
        type: 'open',
        target: 'Dialog',
        animation: 'fade',
      })
      expect(action?.position).toBeUndefined()
    })

    it('all position keywords are valid', () => {
      const positions = ['below', 'above', 'left', 'right', 'center']
      for (const pos of positions) {
        const ctx = createParserContext(tokenize(`open Target ${pos}`))
        const action = parseAction(ctx)
        expect(action?.position).toBe(pos)
      }
    })

    it('all animation keywords are valid with positions', () => {
      const animations = ['fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right']
      for (const anim of animations) {
        const ctx = createParserContext(tokenize(`open Target below ${anim}`))
        const action = parseAction(ctx)
        expect(action?.animation).toBe(anim)
      }
    })
  })
})
