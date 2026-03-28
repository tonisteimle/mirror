/**
 * Tests for automatic property separation without commas
 *
 * The parser should recognize known property names and automatically
 * separate properties without requiring commas.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser/index'

// Helper to get properties from first child of first component
function getProps(code: string) {
  const ast = parse(code)
  if (ast.components.length === 0) return []
  const comp = ast.components[0]
  if (comp.children.length === 0) return comp.properties
  return comp.children[0].properties
}

// Helper to get property by name
function getProp(props: any[], name: string) {
  return props.find(p => p.name === name)
}

describe('Parser: Automatic Property Separation', () => {

  describe('Basic property separation', () => {
    it('separates h and bg without comma', () => {
      const props = getProps(`Test:\n  Box h 300 bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'h')?.values).toEqual(['300'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('separates w and col without comma', () => {
      const props = getProps(`Test:\n  Box w 200 col white`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'w')?.values).toEqual(['200'])
      expect(getProp(props, 'col')?.values).toEqual(['white'])
    })

    it('separates three properties without commas', () => {
      const props = getProps(`Test:\n  Box h 100 w 200 bg #444`)
      expect(props.length).toBe(3)
      expect(getProp(props, 'h')?.values).toEqual(['100'])
      expect(getProp(props, 'w')?.values).toEqual(['200'])
      expect(getProp(props, 'bg')?.values).toEqual(['#444'])
    })

    it('separates four properties without commas', () => {
      const props = getProps(`Test:\n  Box h 100 w 200 bg #444 rad 8`)
      expect(props.length).toBe(4)
      expect(getProp(props, 'h')?.values).toEqual(['100'])
      expect(getProp(props, 'w')?.values).toEqual(['200'])
      expect(getProp(props, 'bg')?.values).toEqual(['#444'])
      expect(getProp(props, 'rad')?.values).toEqual(['8'])
    })
  })

  describe('Multi-value properties', () => {
    it('keeps pad with two values together', () => {
      const props = getProps(`Test:\n  Box pad 8 16`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'pad')?.values).toEqual(['8', '16'])
    })

    it('keeps pad with four values together', () => {
      const props = getProps(`Test:\n  Box pad 8 16 8 16`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'pad')?.values).toEqual(['8', '16', '8', '16'])
    })

    it('separates pad from next property', () => {
      const props = getProps(`Test:\n  Box pad 8 16 bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'pad')?.values).toEqual(['8', '16'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('keeps bor with multiple values together', () => {
      const props = getProps(`Test:\n  Box bor 1 solid #333`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'bor')?.values).toEqual(['1', 'solid', '#333'])
    })

    it('separates bor from next property', () => {
      const props = getProps(`Test:\n  Box bor 1 solid #333 rad 8`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'bor')?.values).toEqual(['1', 'solid', '#333'])
      expect(getProp(props, 'rad')?.values).toEqual(['8'])
    })

    it('keeps margin with two values together', () => {
      const props = getProps(`Test:\n  Box margin 16 24 bg #fff`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'margin')?.values).toEqual(['16', '24'])
      expect(getProp(props, 'bg')?.values).toEqual(['#fff'])
    })
  })

  describe('Boolean properties', () => {
    it('parses single boolean property', () => {
      const props = getProps(`Test:\n  Box hor`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'hor')?.values).toEqual([true])
    })

    it('parses two boolean properties', () => {
      const props = getProps(`Test:\n  Box hor center`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'hor')?.values).toEqual([true])
      expect(getProp(props, 'center')?.values).toEqual([true])
    })

    it('parses three boolean properties', () => {
      const props = getProps(`Test:\n  Box hor center spread`)
      expect(props.length).toBe(3)
      expect(getProp(props, 'hor')?.values).toEqual([true])
      expect(getProp(props, 'center')?.values).toEqual([true])
      expect(getProp(props, 'spread')?.values).toEqual([true])
    })

    it('mixes boolean and value properties', () => {
      const props = getProps(`Test:\n  Box hor gap 16 center`)
      expect(props.length).toBe(3)
      expect(getProp(props, 'hor')?.values).toEqual([true])
      expect(getProp(props, 'gap')?.values).toEqual(['16'])
      expect(getProp(props, 'center')?.values).toEqual([true])
    })

    it('parses ver with gap', () => {
      const props = getProps(`Test:\n  Box ver gap 8`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'ver')?.values).toEqual([true])
      expect(getProp(props, 'gap')?.values).toEqual(['8'])
    })

    it('parses wrap and spread', () => {
      const props = getProps(`Test:\n  Box hor wrap spread`)
      expect(props.length).toBe(3)
      expect(getProp(props, 'hor')?.values).toEqual([true])
      expect(getProp(props, 'wrap')?.values).toEqual([true])
      expect(getProp(props, 'spread')?.values).toEqual([true])
    })
  })

  describe('Align property with position values', () => {
    it('keeps align with single value', () => {
      const props = getProps(`Test:\n  Box align center`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'align')?.values).toEqual(['center'])
    })

    it('keeps align with two values (top left)', () => {
      const props = getProps(`Test:\n  Box align top left`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'align')?.values).toEqual(['top', 'left'])
    })

    it('keeps align with two values (bottom right)', () => {
      const props = getProps(`Test:\n  Box align bottom right`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'align')?.values).toEqual(['bottom', 'right'])
    })

    it('separates align from following property', () => {
      const props = getProps(`Test:\n  Box align top left bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'align')?.values).toEqual(['top', 'left'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })
  })

  describe('Special values (full, hug)', () => {
    it('parses h full', () => {
      const props = getProps(`Test:\n  Box h full`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'h')?.values).toEqual(['full'])
    })

    it('parses w full', () => {
      const props = getProps(`Test:\n  Box w full`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'w')?.values).toEqual(['full'])
    })

    it('parses h hug', () => {
      const props = getProps(`Test:\n  Box h hug`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'h')?.values).toEqual(['hug'])
    })

    it('separates w full from bg', () => {
      const props = getProps(`Test:\n  Box w full bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'w')?.values).toEqual(['full'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('parses h full w full', () => {
      const props = getProps(`Test:\n  Box h full w full`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'h')?.values).toEqual(['full'])
      expect(getProp(props, 'w')?.values).toEqual(['full'])
    })
  })

  describe('Complex real-world examples', () => {
    it('parses card layout', () => {
      const props = getProps(`Test:\n  Box ver gap 16 pad 24 bg #1a1a23 rad 12`)
      expect(props.length).toBe(5)
      expect(getProp(props, 'ver')?.values).toEqual([true])
      expect(getProp(props, 'gap')?.values).toEqual(['16'])
      expect(getProp(props, 'pad')?.values).toEqual(['24'])
      expect(getProp(props, 'bg')?.values).toEqual(['#1a1a23'])
      expect(getProp(props, 'rad')?.values).toEqual(['12'])
    })

    it('parses button style', () => {
      const props = getProps(`Test:\n  Box hor center pad 12 24 bg #3B82F6 rad 8 col white`)
      expect(props.length).toBe(6)
      expect(getProp(props, 'hor')?.values).toEqual([true])
      expect(getProp(props, 'center')?.values).toEqual([true])
      expect(getProp(props, 'pad')?.values).toEqual(['12', '24'])
      expect(getProp(props, 'bg')?.values).toEqual(['#3B82F6'])
      expect(getProp(props, 'rad')?.values).toEqual(['8'])
      expect(getProp(props, 'col')?.values).toEqual(['white'])
    })

    it('parses sidebar layout', () => {
      const props = getProps(`Test:\n  Box ver w 250 h full bg #1a1a23 pad 16 gap 8`)
      expect(props.length).toBe(6)
      expect(getProp(props, 'ver')?.values).toEqual([true])
      expect(getProp(props, 'w')?.values).toEqual(['250'])
      expect(getProp(props, 'h')?.values).toEqual(['full'])
      expect(getProp(props, 'bg')?.values).toEqual(['#1a1a23'])
      expect(getProp(props, 'pad')?.values).toEqual(['16'])
      expect(getProp(props, 'gap')?.values).toEqual(['8'])
    })

    it('parses input field', () => {
      const props = getProps(`Test:\n  Box w full pad 12 bg #0a0a0f bor 1 solid #333 rad 8`)
      expect(props.length).toBe(5)
      expect(getProp(props, 'w')?.values).toEqual(['full'])
      expect(getProp(props, 'pad')?.values).toEqual(['12'])
      expect(getProp(props, 'bg')?.values).toEqual(['#0a0a0f'])
      expect(getProp(props, 'bor')?.values).toEqual(['1', 'solid', '#333'])
      expect(getProp(props, 'rad')?.values).toEqual(['8'])
    })

    it('parses avatar circle', () => {
      const props = getProps(`Test:\n  Box w 48 h 48 rad 24 bg #3B82F6 center`)
      expect(props.length).toBe(5)
      expect(getProp(props, 'w')?.values).toEqual(['48'])
      expect(getProp(props, 'h')?.values).toEqual(['48'])
      expect(getProp(props, 'rad')?.values).toEqual(['24'])
      expect(getProp(props, 'bg')?.values).toEqual(['#3B82F6'])
      expect(getProp(props, 'center')?.values).toEqual([true])
    })
  })

  describe('Shorthand variations', () => {
    it('parses p shorthand for padding', () => {
      const props = getProps(`Test:\n  Box p 16 bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'p')?.values).toEqual(['16'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('parses m shorthand for margin', () => {
      const props = getProps(`Test:\n  Box m 8 bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'm')?.values).toEqual(['8'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('parses g shorthand for gap', () => {
      const props = getProps(`Test:\n  Box hor g 16`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'hor')?.values).toEqual([true])
      expect(getProp(props, 'g')?.values).toEqual(['16'])
    })

    it('parses c shorthand for color', () => {
      const props = getProps(`Test:\n  Box c white bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'c')?.values).toEqual(['white'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('parses o shorthand for opacity', () => {
      const props = getProps(`Test:\n  Box bg #333 o 0.5`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
      expect(getProp(props, 'o')?.values).toEqual(['0.5'])
    })
  })

  describe('Min/Max sizing', () => {
    it('parses minw and maxw', () => {
      const props = getProps(`Test:\n  Box minw 200 maxw 800`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'minw')?.values).toEqual(['200'])
      expect(getProp(props, 'maxw')?.values).toEqual(['800'])
    })

    it('parses minh and maxh', () => {
      const props = getProps(`Test:\n  Box minh 100 maxh 500`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'minh')?.values).toEqual(['100'])
      expect(getProp(props, 'maxh')?.values).toEqual(['500'])
    })

    it('combines w full with maxw', () => {
      const props = getProps(`Test:\n  Box w full maxw 1200 pad 24`)
      expect(props.length).toBe(3)
      expect(getProp(props, 'w')?.values).toEqual(['full'])
      expect(getProp(props, 'maxw')?.values).toEqual(['1200'])
      expect(getProp(props, 'pad')?.values).toEqual(['24'])
    })
  })

  describe('Typography properties', () => {
    it('parses font-size', () => {
      const props = getProps(`Test:\n  Box font-size 18 col white`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'font-size')?.values).toEqual(['18'])
      expect(getProp(props, 'col')?.values).toEqual(['white'])
    })

    it('parses fs shorthand', () => {
      const props = getProps(`Test:\n  Box fs 24 weight bold`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'fs')?.values).toEqual(['24'])
      expect(getProp(props, 'weight')?.values).toEqual(['bold'])
    })

    it('parses weight', () => {
      const props = getProps(`Test:\n  Box weight bold col #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'weight')?.values).toEqual(['bold'])
      expect(getProp(props, 'col')?.values).toEqual(['#333'])
    })

    it('parses line height', () => {
      const props = getProps(`Test:\n  Box line 1.5 fs 16`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'line')?.values).toEqual(['1.5'])
      expect(getProp(props, 'fs')?.values).toEqual(['16'])
    })
  })

  describe('Visual properties', () => {
    it('parses shadow', () => {
      const props = getProps(`Test:\n  Box shadow lg bg #fff`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'shadow')?.values).toEqual(['lg'])
      expect(getProp(props, 'bg')?.values).toEqual(['#fff'])
    })

    it('parses z-index', () => {
      const props = getProps(`Test:\n  Box z 10 bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'z')?.values).toEqual(['10'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('parses cursor', () => {
      const props = getProps(`Test:\n  Box cursor pointer bg #3B82F6`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'cursor')?.values).toEqual(['pointer'])
      expect(getProp(props, 'bg')?.values).toEqual(['#3B82F6'])
    })

    it('parses opacity', () => {
      const props = getProps(`Test:\n  Box opacity 0.8 bg #333`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'opacity')?.values).toEqual(['0.8'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })
  })

  describe('Grid property', () => {
    it('parses grid with columns', () => {
      const props = getProps(`Test:\n  Box grid 3 gap 16`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'grid')?.values).toEqual(['3'])
      expect(getProp(props, 'gap')?.values).toEqual(['16'])
    })
  })

  describe('Scroll properties', () => {
    it('parses scroll-ver', () => {
      const props = getProps(`Test:\n  Box h 400 scroll-ver`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'h')?.values).toEqual(['400'])
      expect(getProp(props, 'scroll-ver')?.values).toEqual([true])
    })

    it('parses scroll-hor', () => {
      const props = getProps(`Test:\n  Box w full scroll-hor`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'w')?.values).toEqual(['full'])
      expect(getProp(props, 'scroll-hor')?.values).toEqual([true])
    })

    it('parses clip', () => {
      const props = getProps(`Test:\n  Box h 200 clip`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'h')?.values).toEqual(['200'])
      expect(getProp(props, 'clip')?.values).toEqual([true])
    })
  })

  describe('Backward compatibility with commas', () => {
    it('still works with commas', () => {
      const props = getProps(`Test:\n  Box h 300, bg #333, pad 16`)
      expect(props.length).toBe(3)
      expect(getProp(props, 'h')?.values).toEqual(['300'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
      expect(getProp(props, 'pad')?.values).toEqual(['16'])
    })

    it('works with mixed comma and no-comma', () => {
      const props = getProps(`Test:\n  Box h 300 bg #333, pad 16`)
      expect(props.length).toBe(3)
      expect(getProp(props, 'h')?.values).toEqual(['300'])
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
      expect(getProp(props, 'pad')?.values).toEqual(['16'])
    })
  })

  describe('Edge cases', () => {
    it('handles single property', () => {
      const props = getProps(`Test:\n  Box bg #333`)
      expect(props.length).toBe(1)
      expect(getProp(props, 'bg')?.values).toEqual(['#333'])
    })

    it('handles property with hex color', () => {
      const props = getProps(`Test:\n  Box bg #3B82F6 col #FFFFFF`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'bg')?.values).toEqual(['#3B82F6'])
      expect(getProp(props, 'col')?.values).toEqual(['#FFFFFF'])
    })

    it('handles rgb colors', () => {
      const props = getProps(`Test:\n  Box bg rgb(59,130,246)`)
      expect(props.length).toBe(1)
      // Note: rgb() might be parsed differently
    })

    it('handles named colors', () => {
      const props = getProps(`Test:\n  Box bg white col black`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'bg')?.values).toEqual(['white'])
      expect(getProp(props, 'col')?.values).toEqual(['black'])
    })

    it('handles decimal values', () => {
      const props = getProps(`Test:\n  Box opacity 0.5 line 1.6`)
      expect(props.length).toBe(2)
      expect(getProp(props, 'opacity')?.values).toEqual(['0.5'])
      expect(getProp(props, 'line')?.values).toEqual(['1.6'])
    })
  })
})
