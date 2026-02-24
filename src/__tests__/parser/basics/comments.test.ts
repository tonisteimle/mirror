/**
 * Parser Tests: Comments
 *
 * Tests for comment parsing in Mirror DSL.
 * - Single-line comments: // comment
 * - Inline comments after properties
 * - Comments after strings
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne, props } from '../../test-utils'

describe('Single-Line Comments', () => {
  it('ignores comment-only lines', () => {
    const result = parse(`// This is a comment
Box bg #333`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].name).toBe('Box')
  })

  it('ignores multiple comment lines', () => {
    const result = parse(`// Comment 1
// Comment 2
// Comment 3
Button "Click"`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
  })

  it('handles empty comment', () => {
    const result = parse(`//
Box`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
  })
})

describe('Trailing Comments', () => {
  it('ignores comment after property', () => {
    const p = props('Box bg #333 // background color')
    expect(p.bg).toBe('#333')
  })

  it('ignores comment after multiple properties', () => {
    const p = props('Box bg #333, pad 12 // styled box')
    expect(p.bg).toBe('#333')
    expect(p.pad).toBe(12)
  })

  it('ignores comment after number', () => {
    const p = props('Box pad 16 // padding')
    expect(p.pad).toBe(16)
  })

  it('ignores comment after boolean property', () => {
    const p = props('Box hor // horizontal layout')
    expect(p.hor).toBe(true)
  })
})

describe('Comments After Strings', () => {
  it('ignores comment after quoted string', () => {
    const node = parseOne('Button "Click me" // button label')
    // Button string creates a Text child
    expect(node.children[0]?.content).toBe('Click me')
  })

  it('handles string with // inside', () => {
    // The // inside the string should NOT be treated as a comment
    const node = parseOne('Text "Visit https://example.com"')
    // Text content can be in children[0].content or node.content
    expect(node.children[0]?.content || node.content).toBe('Visit https://example.com')
  })

})

describe('Comments in Complex Structures', () => {
  it('handles comments in multiline code', () => {
    const result = parse(`
Card // main container
  Title "Hello" // heading
  Text "World" // content
`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].children.length).toBe(2)
  })

  it('handles comments in token definitions', () => {
    const result = parse(`
$primary: #3B82F6 // brand color
$spacing: 16 // base spacing
Box bg $primary, pad $spacing
`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    expect(result.nodes[0].properties.pad).toBe(16)
  })

  it('handles comments in component definitions', () => {
    const result = parse(`
Button: pad 12, bg #3B82F6 // primary button style
Button "Click"
`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
  })
})

describe('Edge Cases', () => {
  it('handles comment at end of file', () => {
    const result = parse('Box // final comment')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
  })

  it('handles multiple // in comment', () => {
    const p = props('Box bg #333 // this // is // fine')
    expect(p.bg).toBe('#333')
  })

  it('does not treat # as comment', () => {
    // # is for colors, not comments
    const p = props('Box bg #FF0000')
    expect(p.bg).toBe('#FF0000')
  })
})
