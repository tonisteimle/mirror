/**
 * Generator Tests: Primitive Rendering
 *
 * Tests for rendering primitive components (Button, Input, Icon, etc.)
 */

import { describe, it, expect } from 'vitest'
import { parseOne, props } from '../../test-utils'

describe('Button Primitive', () => {
  it('parses Button with text', () => {
    const node = parseOne('Button "Click me"')
    expect(node.name).toBe('Button')
    // Button string creates a Text child
    expect(node.children[0]?.content).toBe('Click me')
  })

  it('Button with properties', () => {
    const node = parseOne('Button bg #3B82F6, col #FFF, pad 12, rad 8, "Submit"')
    expect(node.properties.bg).toBe('#3B82F6')
    expect(node.properties.col).toBe('#FFF')
    expect(node.properties.pad).toBe(12)
    expect(node.properties.rad).toBe(8)
    // Button string creates a Text child
    expect(node.children[0]?.content).toBe('Submit')
  })

  it('Button with disabled', () => {
    const p = props('Button disabled, "Disabled"')
    expect(p.disabled).toBe(true)
  })
})

describe('Input Primitive', () => {
  it('parses Input with placeholder', () => {
    const node = parseOne('Input "Enter email"')
    expect(node.name).toBe('Input')
    expect(node.properties.placeholder).toBe('Enter email')
  })

  it('Input with properties', () => {
    const p = props('Input pad 12, bor 1, rad 4, "Search..."')
    expect(p.pad).toBe(12)
    expect(p.bor).toBe(1)
    expect(p.rad).toBe(4)
    expect(p.placeholder).toBe('Search...')
  })
})

describe('Textarea Primitive', () => {
  it('parses Textarea with placeholder', () => {
    const node = parseOne('Textarea "Enter message"')
    expect(node.name).toBe('Textarea')
    expect(node.properties.placeholder).toBe('Enter message')
  })
})

describe('Icon Primitive', () => {
  it('parses Icon with name', () => {
    const node = parseOne('Icon "search"')
    expect(node.name).toBe('Icon')
    expect(node.properties.icon || node.content).toBe('search')
  })

  it('Icon with size', () => {
    const p = props('Icon size 24, "home"')
    expect(p['icon-size']).toBe(24)
  })

  it('Icon with material flag', () => {
    const p = props('Icon material, "home"')
    expect(p.material).toBe(true)
  })

  it('Icon with fill', () => {
    const p = props('Icon fill, "star"')
    expect(p.fill).toBe(true)
  })

  it('Icon with color', () => {
    const p = props('Icon col #3B82F6, "check"')
    expect(p.col).toBe('#3B82F6')
  })
})

describe('Image Primitive', () => {
  it('parses Image with src', () => {
    const node = parseOne('Image "photo.jpg"')
    expect(node.name).toBe('Image')
    expect(node.properties.src || node.content).toBe('photo.jpg')
  })

  it('Image with dimensions', () => {
    const p = props('Image 200 150, "photo.jpg"')
    expect(p.w).toBe(200)
    expect(p.h).toBe(150)
  })

  it('Image with radius', () => {
    const p = props('Image rad 8, "avatar.png"')
    expect(p.rad).toBe(8)
  })
})

describe('Link Primitive', () => {
  it('parses Link with href and label', () => {
    const node = parseOne('Link href "/about", "About Us"')
    expect(node.name).toBe('Link')
    expect(node.properties.href).toBe('/about')
    // Link string creates a Text child
    expect(node.children[0]?.content).toBe('About Us')
  })

  it('Link with external URL', () => {
    const p = props('Link href "https://example.com", "Visit"')
    expect(p.href).toBe('https://example.com')
  })
})

describe('Segment Primitive', () => {
  it('parses Segment with count', () => {
    const node = parseOne('Segment segments 4')
    expect(node.name).toBe('Segment')
    expect(node.properties.segments).toBe(4)
  })

  it('Segment with different counts', () => {
    const counts = [3, 4, 5, 6]
    counts.forEach((n) => {
      const p = props(`Segment segments ${n}`)
      expect(p.segments).toBe(n)
    })
  })
})

describe('Text Primitive', () => {
  it('parses Text with content', () => {
    const node = parseOne('Text "Hello World"')
    expect(node.name).toBe('Text')
    // Text content is in children[0].content or node.content
    expect(node.children[0]?.content || node.content).toBe('Hello World')
  })

  it('Text with styling', () => {
    const p = props('Text text-size 16, weight bold, col #FFF, "Title"')
    expect(p['text-size']).toBe(16)
    expect(p.weight).toBe(700)
    expect(p.col).toBe('#FFF')
  })
})

describe('Box/Card Containers', () => {
  it('Box with layout', () => {
    const p = props('Box hor, gap 12, pad 16')
    expect(p.hor).toBe(true)
    expect(p.g).toBe(12)
    expect(p.pad).toBe(16)
  })

  it('Card with styling', () => {
    const p = props('Card bg #1E1E2E, pad 24, rad 12, shadow md')
    expect(p.bg).toBe('#1E1E2E')
    expect(p.pad).toBe(24)
    expect(p.rad).toBe(12)
    expect(p.shadow).toBe('md')
  })
})
