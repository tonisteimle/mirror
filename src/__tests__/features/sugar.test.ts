/**
 * Sugar Handlers Test Suite
 *
 * Tests for the sugar syntax handling system.
 * Verifies that implicit property assignments work correctly.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

// Helper to filter out warnings from errors array
function getErrors(result: ReturnType<typeof parse>) {
  return (result.errors || []).filter(
    (e: string) => !e.startsWith('Warning:')
  )
}

describe('Sugar Handlers', () => {
  describe('Dimension Handler', () => {
    it('assigns first number to w', () => {
      const result = parse('Box 300')
      expect(result.nodes[0].properties.w).toBe(300)
    })

    it('assigns second number to h', () => {
      const result = parse('Box 300 400')
      expect(result.nodes[0].properties.w).toBe(300)
      expect(result.nodes[0].properties.h).toBe(400)
    })

    it('warns on orphan number when w and h are set', () => {
      const result = parse('Box w 300 h 400 500')
      expect(result.errors.some(e => e.includes('Orphan number'))).toBe(true)
    })

    it('works with other properties between dimensions', () => {
      // Note: pad followed by numbers uses CSS shorthand, so use col instead
      const result = parse('Box 300 col #FFF 400')
      expect(result.nodes[0].properties.w).toBe(300)
      expect(result.nodes[0].properties.col).toBe('#FFF')
      expect(result.nodes[0].properties.h).toBe(400)
    })
  })

  describe('Color Handler', () => {
    it('assigns color to bg property for containers', () => {
      const result = parse('Box #FF0000')
      // Box is a container, shorthand color becomes bg (background)
      expect(result.nodes[0].properties.bg).toBe('#FF0000')
    })

    it('assigns color to col property for text components', () => {
      const result = parse('Text #FF0000')
      // Text is a text component, shorthand color becomes col (text color)
      expect(result.nodes[0].properties.col).toBe('#FF0000')
    })

    it('handles 3-digit hex colors', () => {
      const result = parse('Box #FFF')
      expect(result.nodes[0].properties.bg).toBe('#FFF')
    })

    it('handles colors with alpha', () => {
      const result = parse('Box #FF000080')
      expect(result.nodes[0].properties.bg).toBe('#FF000080')
    })
  })

  describe('String Handler - Image', () => {
    it('assigns string to src for Image', () => {
      const result = parse('Image "photo.jpg"')
      expect(result.nodes[0].properties.src).toBe('photo.jpg')
    })

    it('assigns following numbers to w and h for Image', () => {
      const result = parse('Image "photo.jpg" 300 400')
      expect(result.nodes[0].properties.src).toBe('photo.jpg')
      expect(result.nodes[0].properties.w).toBe(300)
      expect(result.nodes[0].properties.h).toBe(400)
    })

    it('works with component ending in Image', () => {
      const result = parse('ProfileImage "avatar.png"')
      expect(result.nodes[0].properties.src).toBe('avatar.png')
    })
  })

  describe('String Handler - Input', () => {
    it('assigns string to placeholder for Input', () => {
      const result = parse('Input "Enter email"')
      expect(result.nodes[0].properties.placeholder).toBe('Enter email')
    })

    it('works with named Input instances', () => {
      const result = parse('Input Email "Enter email"')
      expect(result.nodes[0].properties.placeholder).toBe('Enter email')
    })

    it('works with component ending in Input', () => {
      const result = parse('SearchInput "Search..."')
      expect(result.nodes[0].properties.placeholder).toBe('Search...')
    })
  })

  describe('String Handler - Textarea', () => {
    it('assigns string to placeholder for Textarea', () => {
      const result = parse('Textarea "Enter description"')
      expect(result.nodes[0].properties.placeholder).toBe('Enter description')
    })
  })

  describe('String Handler - Link', () => {
    it('assigns string to text content for Link (not href)', () => {
      const result = parse('Link "Click here"')
      // String becomes visible text content, not href (consistent with Button)
      expect(result.nodes[0].children[0]?.content).toBe('Click here')
    })

    it('explicit href property sets the URL', () => {
      const result = parse('Link href "https://example.com" "Click here"')
      expect(result.nodes[0].properties.href).toBe('https://example.com')
      expect(result.nodes[0].children[0]?.content).toBe('Click here')
    })
  })

  describe('String Handler - Item/Option', () => {
    it('assigns string to content for Item', () => {
      const result = parse('Item "Option 1"')
      expect(result.nodes[0].content).toBe('Option 1')
    })

    it('assigns string to content for Option', () => {
      const result = parse('Option "Choice A"')
      expect(result.nodes[0].content).toBe('Choice A')
    })
  })

  describe('String Handler - Default (Text Child)', () => {
    it('creates _text child for regular components', () => {
      const result = parse('Button "Click me"')
      expect(result.nodes[0].children).toHaveLength(1)
      expect(result.nodes[0].children[0].name).toBe('_text')
      expect(result.nodes[0].children[0].content).toBe('Click me')
    })

    it('creates _text child for Box', () => {
      const result = parse('Box "Hello World"')
      expect(result.nodes[0].children).toHaveLength(1)
      expect(result.nodes[0].children[0].name).toBe('_text')
      expect(result.nodes[0].children[0].content).toBe('Hello World')
    })

    it('parses properties after string as text properties', () => {
      const result = parse('Box "Hello" size 18 weight 600')
      const textNode = result.nodes[0].children[0]
      expect(textNode.properties.size).toBe(18)
      expect(textNode.properties.weight).toBe(600)
    })
  })

  describe('Token Handler', () => {
    it('infers pad from token name suffix', () => {
      const dsl = `$default-pad: 16
Box $default-pad`
      const result = parse(dsl)
      expect(result.nodes[0].properties.pad).toBe(16)
    })

    it('infers col from token name suffix', () => {
      const dsl = `$primary-col: #3B82F6
Box $primary-col`
      const result = parse(dsl)
      expect(result.nodes[0].properties.col).toBe('#3B82F6')
    })

    it('infers col from color value (value-based inference)', () => {
      const dsl = `$primary: #3B82F6
Box $primary`
      const result = parse(dsl)
      expect(result.nodes[0].properties.col).toBe('#3B82F6')
      expect(getErrors(result)).toHaveLength(0)
    })

    it('infers rad from token name suffix', () => {
      const dsl = `$card-rad: 8
Box $card-rad`
      const result = parse(dsl)
      expect(result.nodes[0].properties.rad).toBe(8)
    })

    it('expands token sequences for pad', () => {
      const dsl = `$card-pad: l-r 16 u-d 8
Box $card-pad`
      const result = parse(dsl)
      expect(result.nodes[0].properties.pad_l).toBe(16)
      expect(result.nodes[0].properties.pad_r).toBe(16)
      expect(result.nodes[0].properties.pad_u).toBe(8)
      expect(result.nodes[0].properties.pad_d).toBe(8)
    })

    it('warns on undefined token', () => {
      const result = parse('Box $undefined-token')
      expect(result.errors.some(e => e.includes('not defined'))).toBe(true)
    })

    it('does not warn on iterator variable tokens', () => {
      const result = parse('Box $item.name')
      // Iterator variables with dots should not produce warnings
      expect(result.errors.filter(e => e.includes('not defined'))).toHaveLength(0)
    })
  })

  describe('Component Type Matching', () => {
    it('detects Image by _primitiveType', () => {
      // Image MyPhoto should set _primitiveType
      const result = parse('Image MyPhoto "photo.jpg"')
      expect(result.nodes[0].properties._primitiveType).toBe('Image')
      expect(result.nodes[0].properties.src).toBe('photo.jpg')
    })

    it('detects Input by _primitiveType', () => {
      const result = parse('Input Email "email@example.com"')
      expect(result.nodes[0].properties._primitiveType).toBe('Input')
      expect(result.nodes[0].properties.placeholder).toBe('email@example.com')
    })

    it('detects component ending with Image', () => {
      const result = parse('AvatarImage "avatar.png"')
      expect(result.nodes[0].properties.src).toBe('avatar.png')
    })

    it('detects component ending with Input', () => {
      const result = parse('EmailInput "Enter email"')
      expect(result.nodes[0].properties.placeholder).toBe('Enter email')
    })
  })

  describe('Sugar Registry Priority', () => {
    it('specific handlers run before default handler', () => {
      // Image-specific handler should run, not default string handler
      const result = parse('Image "photo.jpg"')
      expect(result.nodes[0].properties.src).toBe('photo.jpg')
      expect(result.nodes[0].children).toHaveLength(0) // No _text child
    })

    it('default string handler runs for non-special components', () => {
      const result = parse('Card "Title"')
      expect(result.nodes[0].children).toHaveLength(1)
      expect(result.nodes[0].children[0].name).toBe('_text')
    })
  })
})
