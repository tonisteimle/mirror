/**
 * Tests for multiline string auto-indent functionality
 */

import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  createSmartEnterKeymap,
  createSmartTabKeymap,
  isInsideMultilineString
} from '../../editor/multiline-indent'

// Helper to create a minimal editor view for testing
function createTestEditor(doc: string, cursorPos?: number): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor: cursorPos ?? doc.length },
    extensions: [
      createSmartEnterKeymap(),
      createSmartTabKeymap(),
    ]
  })

  const view = new EditorView({
    state,
    parent: document.createElement('div')
  })

  return view
}

describe('Multiline String Detection', () => {
  it('detects cursor inside multiline string', () => {
    const doc = `text
  'content inside
   multiline string'`

    const view = createTestEditor(doc, 15) // cursor inside the string

    expect(isInsideMultilineString(view, 15)).toBe(true)
    expect(isInsideMultilineString(view, 0)).toBe(false) // before string
  })

  it('returns false for position outside multiline string', () => {
    const doc = `Button "regular string"
text
  'multiline'`

    const view = createTestEditor(doc, 5) // in "Button"

    expect(isInsideMultilineString(view, 5)).toBe(false)
  })

  it('handles escaped quotes correctly', () => {
    const doc = `text
  'content with \\'escaped\\' quotes'`

    const view = createTestEditor(doc, 20) // inside string

    expect(isInsideMultilineString(view, 20)).toBe(true)
  })

  it('handles multiple multiline strings', () => {
    const doc = `text
  'first string'

text
  'second string'`

    const view = createTestEditor(doc)

    // Position in first string
    expect(isInsideMultilineString(view, 10)).toBe(true)
    // Position between strings
    expect(isInsideMultilineString(view, 25)).toBe(false)
    // Position in second string
    expect(isInsideMultilineString(view, 40)).toBe(true)
  })
})

describe('Smart Enter Handler', () => {
  it('preserves indentation inside multiline string', () => {
    const doc = `text
  '$h1 Heading

   $p Paragraph'`

    // Position cursor at end of "Paragraph" (inside string, before closing quote)
    const cursorPos = doc.indexOf('Paragraph') + 'Paragraph'.length
    const view = createTestEditor(doc, cursorPos)

    // Verify we're inside the string
    expect(isInsideMultilineString(view, cursorPos)).toBe(true)

    // Get the current line's indentation
    const line = view.state.doc.lineAt(cursorPos)
    const indent = line.text.match(/^(\s*)/)?.[1] || ''

    // Indentation should be preserved (3 spaces in this case)
    expect(indent).toBe('   ')
  })

  it('does not preserve indentation outside multiline string', () => {
    const doc = `Button padding 12
Card background #333`

    const cursorPos = doc.indexOf('12') + 2
    const view = createTestEditor(doc, cursorPos)

    // Should not be inside multiline string
    expect(isInsideMultilineString(view, cursorPos)).toBe(false)
  })
})

describe('Smart Tab Handler', () => {
  it('inserts 2 spaces inside multiline string', () => {
    const doc = `text
  'content'`

    // Position cursor inside the string
    const cursorPos = doc.indexOf('content')
    const view = createTestEditor(doc, cursorPos)

    expect(isInsideMultilineString(view, cursorPos)).toBe(true)
  })

  it('does not handle Tab outside multiline string', () => {
    const doc = `Button padding 12`
    const view = createTestEditor(doc, 6)

    expect(isInsideMultilineString(view, 6)).toBe(false)
  })
})

describe('Edge Cases', () => {
  it('handles empty multiline string', () => {
    const doc = `text
  ''`

    const view = createTestEditor(doc, doc.indexOf("''") + 1)

    // Position between quotes should be inside
    expect(isInsideMultilineString(view, doc.indexOf("''") + 1)).toBe(true)
  })

  it('handles cursor at opening quote', () => {
    const doc = `text
  'content'`

    const view = createTestEditor(doc)
    const openQuotePos = doc.indexOf("'")

    // At opening quote (not inside yet)
    expect(isInsideMultilineString(view, openQuotePos)).toBe(false)
    // After opening quote (inside)
    expect(isInsideMultilineString(view, openQuotePos + 1)).toBe(true)
  })

  it('handles cursor at closing quote', () => {
    const doc = `text
  'content'`

    const view = createTestEditor(doc)
    const closeQuotePos = doc.lastIndexOf("'")

    // At closing quote (still inside)
    expect(isInsideMultilineString(view, closeQuotePos)).toBe(true)
    // After closing quote (outside)
    expect(isInsideMultilineString(view, closeQuotePos + 1)).toBe(false)
  })

  it('handles unclosed multiline string', () => {
    const doc = `text
  'unclosed content`

    const view = createTestEditor(doc)

    // With unclosed string, positions after quote are not considered "inside"
    // because there's no valid range
    expect(isInsideMultilineString(view, doc.length - 1)).toBe(false)
  })

  it('ignores double-quoted strings', () => {
    const doc = `Button "regular string" padding 12`

    const view = createTestEditor(doc)
    const insideDoubleQuote = doc.indexOf('regular')

    // Double-quoted strings are NOT multiline strings
    expect(isInsideMultilineString(view, insideDoubleQuote)).toBe(false)
  })
})
