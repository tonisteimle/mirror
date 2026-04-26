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

import { applySegmentReplace } from '../../../studio/editor/extract/apply-batch-replace'

describe('applySegmentReplace', () => {
  it('replaces single segment with token reference', () => {
    const result = applySegmentReplace({
      files: [{ filename: 'a.mir', source: 'Frame bg #2271C1, pad 10' }],
      acceptedMatches: [
        {
          filename: 'a.mir',
          lineNumber: 1,
          columnStart: 6,
          length: 10,
          originalText: 'Frame bg #2271C1, pad 10',
          segmentText: 'bg #2271C1',
        },
      ],
      property: 'bg',
      tokenName: 'primary',
    })
    expect(result.changedFiles.get('a.mir')).toBe('Frame bg $primary, pad 10')
  })

  it('multiple segments on same line replaced right-to-left', () => {
    const line = 'Frame bg #2271C1, pad 10, bg #2271C1'
    // Find the two `bg #2271C1` positions
    const first = line.indexOf('bg #2271C1')
    const second = line.lastIndexOf('bg #2271C1')

    const result = applySegmentReplace({
      files: [{ filename: 'a.mir', source: line }],
      acceptedMatches: [
        {
          filename: 'a.mir',
          lineNumber: 1,
          columnStart: first,
          length: 10,
          originalText: line,
          segmentText: 'bg #2271C1',
        },
        {
          filename: 'a.mir',
          lineNumber: 1,
          columnStart: second,
          length: 10,
          originalText: line,
          segmentText: 'bg #2271C1',
        },
      ],
      property: 'bg',
      tokenName: 'primary',
    })
    expect(result.changedFiles.get('a.mir')).toBe('Frame bg $primary, pad 10, bg $primary')
  })

  it('replaces across multiple files', () => {
    const result = applySegmentReplace({
      files: [
        { filename: 'a.mir', source: 'Frame bg #2271C1' },
        { filename: 'b.mir', source: 'Btn pad 10, bg #2271C1' },
      ],
      acceptedMatches: [
        {
          filename: 'a.mir',
          lineNumber: 1,
          columnStart: 6,
          length: 10,
          originalText: 'Frame bg #2271C1',
          segmentText: 'bg #2271C1',
        },
        {
          filename: 'b.mir',
          lineNumber: 1,
          columnStart: 12,
          length: 10,
          originalText: 'Btn pad 10, bg #2271C1',
          segmentText: 'bg #2271C1',
        },
      ],
      property: 'bg',
      tokenName: 'primary',
    })
    expect(result.changedFiles.size).toBe(2)
    expect(result.changedFiles.get('a.mir')).toBe('Frame bg $primary')
    expect(result.changedFiles.get('b.mir')).toBe('Btn pad 10, bg $primary')
  })

  it('handles empty match list', () => {
    const result = applySegmentReplace({
      files: [{ filename: 'a.mir', source: 'Frame pad 10' }],
      acceptedMatches: [],
      property: 'bg',
      tokenName: 'primary',
    })
    expect(result.changedFiles.size).toBe(0)
  })
})
