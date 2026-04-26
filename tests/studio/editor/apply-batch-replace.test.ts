import { describe, it, expect } from 'vitest'
import {
  applyBatchReplace,
  rewriteMatchLine,
} from '../../../studio/editor/extract/apply-batch-replace'

describe('rewriteMatchLine', () => {
  it('replaces Frame with Card, drops properties', () => {
    expect(rewriteMatchLine('Frame pad 16, bg #1a1a1a, rad 8', 'Card')).toBe('Card')
  })

  it('preserves indent', () => {
    expect(rewriteMatchLine('  Frame pad 16, bg #1a1a1a', 'Card')).toBe('  Card')
    expect(rewriteMatchLine('    Frame pad 16', 'Card')).toBe('    Card')
  })

  it('preserves leading content string', () => {
    expect(rewriteMatchLine('Text "Hello", col white', 'Headline')).toBe('Headline "Hello"')
  })

  it('preserves trailing inline comment', () => {
    expect(rewriteMatchLine('Frame pad 16  // outer card', 'Card')).toBe('Card  // outer card')
  })

  it('handles Icon with leading string + properties', () => {
    expect(rewriteMatchLine('Icon "edit", ic #888, is 24', 'MyIcon')).toBe('MyIcon "edit"')
  })

  it('handles Image src ... — src is treated as property, not leading string', () => {
    // Image's src is a property, not a leading positional string. After
    // replace, src goes away (it's part of the new component definition).
    expect(rewriteMatchLine('Image src "a.jpg", w 200, h 100', 'Photo')).toBe('Photo')
  })

  it('returns line unchanged if no element name found', () => {
    expect(rewriteMatchLine('hor, gap 12', 'Card')).toBe('hor, gap 12')
  })
})

describe('applyBatchReplace', () => {
  it('replaces matches across multiple files, leaves unrelated files untouched', () => {
    const input = {
      files: [
        {
          filename: 'a.mir',
          source: `Frame pad 16, bg #333
  Text "X"
Frame pad 16, bg #333
  Text "Y"`,
        },
        {
          filename: 'b.mir',
          source: `Frame pad 16, bg #333\n  Text "Z"`,
        },
        {
          filename: 'c.mir',
          source: `Frame other, props\n`,
        },
      ],
      acceptedMatches: [
        { filename: 'a.mir', lineNumber: 1, originalText: 'Frame pad 16, bg #333' },
        { filename: 'a.mir', lineNumber: 3, originalText: 'Frame pad 16, bg #333' },
        { filename: 'b.mir', lineNumber: 1, originalText: 'Frame pad 16, bg #333' },
      ],
      componentName: 'Card',
    }
    const result = applyBatchReplace(input)
    expect(result.changedFiles.size).toBe(2)
    expect(result.changedFiles.get('a.mir')).toBe(`Card
  Text "X"
Card
  Text "Y"`)
    expect(result.changedFiles.get('b.mir')).toBe('Card\n  Text "Z"')
    expect(result.changedFiles.has('c.mir')).toBe(false)
  })

  it('preserves children below replaced lines', () => {
    const input = {
      files: [
        {
          filename: 'a.mir',
          source: `Frame pad 16
  Text "Title"
  Button "Go"`,
        },
      ],
      acceptedMatches: [{ filename: 'a.mir', lineNumber: 1, originalText: 'Frame pad 16' }],
      componentName: 'Card',
    }
    const result = applyBatchReplace(input)
    expect(result.changedFiles.get('a.mir')).toBe(`Card
  Text "Title"
  Button "Go"`)
  })

  it('skips matches with out-of-range line numbers', () => {
    const input = {
      files: [{ filename: 'a.mir', source: 'Frame pad 16' }],
      acceptedMatches: [{ filename: 'a.mir', lineNumber: 99, originalText: 'Frame pad 16' }],
      componentName: 'Card',
    }
    const result = applyBatchReplace(input)
    expect(result.changedFiles.get('a.mir')).toBe('Frame pad 16')
  })

  it('handles empty accepted-matches list', () => {
    const result = applyBatchReplace({
      files: [{ filename: 'a.mir', source: 'Frame pad 16' }],
      acceptedMatches: [],
      componentName: 'Card',
    })
    expect(result.changedFiles.size).toBe(0)
  })
})
