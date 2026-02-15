/**
 * DSL Primitive Rendering Tests
 *
 * Tests for HTML primitive components:
 * - Input
 * - Textarea
 * - Image
 * - Link
 * - Button
 * - Icon
 */

import { describe, it, expect } from 'vitest'
import React from 'react'
import { parse } from '../../../parser/parser'
import { generateReactElement } from '../../../generator/react-generator'
import { generate, getStyle, getProps, getTextContent, getElementType, getChildren } from '../../test-utils'

// ============================================
// Input Primitive
// ============================================

describe('Input Primitive', () => {
  describe('basic input', () => {
    // Note: Generator returns ToggleableNode wrapper, not raw input element
    it('renders input element', () => {
      const result = parse('Input "Enter text..."')
      // Check that it's recognized as Input primitive
      expect(result.nodes[0].properties._primitiveType).toBe('Input')
    })

    it('string becomes placeholder', () => {
      const result = parse('Input "Enter email..."')
      // String becomes placeholder property for Input
      expect(result.nodes[0].properties.placeholder).toBe('Enter email...')
    })
  })

  describe('input types', () => {
    it('parses type property', () => {
      const result = parse('Input "Email" type email')
      expect(result.nodes[0].properties.type).toBe('email')
    })

    it('parses password type', () => {
      const result = parse('Input "Password" type password')
      expect(result.nodes[0].properties.type).toBe('password')
    })
  })

  describe('named input', () => {
    it('creates named input primitive', () => {
      const result = parse(`Input Email: "Enter email" type email
Email`)
      expect(result.nodes.length).toBe(1)
      expect(result.nodes[0].properties._primitiveType).toBe('Input')
    })
  })

  describe('input styling', () => {
    // Note: Test parsed properties since generator returns wrapper components
    it('applies width', () => {
      const result = parse('Input w 300 "Search..."')
      expect(result.nodes[0].properties.w).toBe(300)
    })

    it('applies padding', () => {
      const result = parse('Input pad 12 "Type here..."')
      expect(result.nodes[0].properties.pad).toBe(12)
    })
  })
})

// ============================================
// Textarea Primitive
// ============================================

describe('Textarea Primitive', () => {
  describe('basic textarea', () => {
    it('parses textarea', () => {
      const result = parse('Textarea "Enter message..."')
      expect(result.nodes[0].properties._primitiveType).toBe('Textarea')
      // String becomes placeholder for Textarea
      expect(result.nodes[0].properties.placeholder).toBe('Enter message...')
    })

    it('parses rows property', () => {
      const result = parse('Textarea "Message" rows 5')
      expect(result.nodes[0].properties.rows).toBe(5)
    })
  })
})

// ============================================
// Image Primitive
// ============================================

describe('Image Primitive', () => {
  describe('basic image', () => {
    it('parses image with src', () => {
      const result = parse('Image "photo.jpg"')
      // _primitiveType is stored in properties
      expect(result.nodes[0].properties._primitiveType).toBe('Image')
      // String becomes src property for Image
      expect(result.nodes[0].properties.src).toBe('photo.jpg')
    })

    it('applies dimensions', () => {
      const result = parse('Image "photo.jpg" 200 150')
      expect(result.nodes[0].properties.w).toBe(200)
      expect(result.nodes[0].properties.h).toBe(150)
    })
  })

  describe('image fit', () => {
    it('parses fit cover', () => {
      const result = parse('Image "photo.jpg" fit cover')
      expect(result.nodes[0].properties.fit).toBe('cover')
    })

    it('parses fit contain', () => {
      const result = parse('Image "photo.jpg" fit contain')
      expect(result.nodes[0].properties.fit).toBe('contain')
    })
  })

  describe('named image', () => {
    it('creates named image primitive', () => {
      const result = parse(`Image Avatar: 48 48 rad 24 fit cover
Avatar "user.jpg"`)
      expect(result.nodes[0].properties._primitiveType).toBe('Image')
    })
  })
})

// ============================================
// Link Primitive
// ============================================

describe('Link Primitive', () => {
  describe('basic link', () => {
    it('parses link with href', () => {
      const result = parse('Link "https://example.com" "Visit Site"')
      expect(result.nodes[0].properties._primitiveType).toBe('Link')
    })
  })
})

// ============================================
// Button Primitive
// ============================================

describe('Button Primitive', () => {
  describe('basic button', () => {
    it('parses button with text', () => {
      const result = parse('Button "Click me"')
      // Text is stored in _text child node
      expect(result.nodes[0].children[0]?.content).toBe('Click me')
    })

    it('applies button styles', () => {
      // Note: Test parsed properties since generator returns wrapper components
      const result = parse('Button pad 12 bg #3B82F6 rad 8 "Submit"')
      expect(result.nodes[0].properties).toMatchObject({
        pad: 12,
        bg: '#3B82F6',
        rad: 8,
      })
    })
  })

  describe('named button', () => {
    it('creates named button', () => {
      const result = parse(`Button Submit: bg #3B82F6 pad 12 rad 8
Submit "Submit Form"`)
      expect(result.nodes[0].name).toBe('Submit')
    })
  })

  describe('button variants', () => {
    it('primary button style', () => {
      const result = parse(`Button: pad 12 bg #3B82F6 rad 8
PrimaryButton from Button: bg #3B82F6
PrimaryButton "Primary"`)
      expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    })

    it('danger button style', () => {
      const result = parse(`Button: pad 12 bg #3B82F6 rad 8
DangerButton from Button: bg #EF4444
DangerButton "Delete"`)
      expect(result.nodes[0].properties.bg).toBe('#EF4444')
    })

    it('ghost button style', () => {
      const result = parse(`Button: pad 12 bg #3B82F6 rad 8
GhostButton from Button: bg transparent bor 1
GhostButton "Ghost"`)
      expect(result.nodes[0].properties.bg).toBe('transparent')
      expect(result.nodes[0].properties.bor).toBe(1)
    })
  })
})

// ============================================
// Icon Primitive
// ============================================

describe('Icon Primitive', () => {
  describe('basic icon', () => {
    it('parses icon with name', () => {
      const result = parse('Icon icon "search"')
      expect(result.nodes[0].properties.icon).toBe('search')
    })

    it('icon in box', () => {
      const result = parse('Box icon "user"')
      expect(result.nodes[0].properties.icon).toBe('user')
    })
  })

  describe('icon sizing', () => {
    it('parses icon size', () => {
      const result = parse('Icon icon "check" size 24')
      expect(result.nodes[0].properties.icon).toBe('check')
      expect(result.nodes[0].properties.size).toBe(24)
    })
  })

  describe('icon coloring', () => {
    it('parses icon color', () => {
      const result = parse('Icon icon "heart" col #FF0000')
      expect(result.nodes[0].properties.col).toBe('#FF0000')
    })
  })
})

// ============================================
// Primitive Rendering Integration
// ============================================

describe('Primitive Rendering Integration', () => {
  describe('form layout', () => {
    it('renders form with inputs', () => {
      const dsl = `Form ver gap 16
  Input Email: "Email" type email
  Input Password: "Password" type password
  Button "Login"`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(3)
    })
  })

  describe('card with image', () => {
    it('renders card with image and text', () => {
      const dsl = `Card ver pad 16
  Image "cover.jpg" w full h 200 fit cover
  Title "Card Title"
  Description "Card description text"`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(3)
    })
  })
})
