/**
 * Tests for studio/agent/source-diff.ts
 *
 * Line-level diff. Output sind `DiffHunk`s — zusammenhängende Gruppen
 * aus removed/added Zeilen mit Position im alten und neuen Text.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow-test-concept.md § 3.1 (source-diff)
 */

import { describe, it, expect } from 'vitest'
import { computeLineDiff, formatUnifiedDiff, type DiffHunk } from '../../studio/agent/source-diff'

describe('SourceDiff — computeLineDiff', () => {
  it('returns no hunks for identical inputs', () => {
    expect(computeLineDiff('', '')).toEqual([])
    expect(computeLineDiff('a\nb\nc', 'a\nb\nc')).toEqual([])
  })

  it('returns a single add-hunk for pure insertion', () => {
    const hunks = computeLineDiff('a\nb', 'a\nb\nc')
    expect(hunks).toEqual<DiffHunk[]>([{ oldStart: 3, newStart: 3, removed: [], added: ['c'] }])
  })

  it('returns a single remove-hunk for pure removal', () => {
    const hunks = computeLineDiff('a\nb\nc', 'a\nb')
    expect(hunks).toEqual<DiffHunk[]>([{ oldStart: 3, newStart: 3, removed: ['c'], added: [] }])
  })

  it('returns a hunk with both removed and added lines for a modification', () => {
    const hunks = computeLineDiff('a\nB\nc', 'a\nX\nc')
    expect(hunks).toEqual<DiffHunk[]>([{ oldStart: 2, newStart: 2, removed: ['B'], added: ['X'] }])
  })

  it('returns separate hunks for disjoint changes', () => {
    const hunks = computeLineDiff('a\nB\nc\nD\ne', 'a\nX\nc\nY\ne')
    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toMatchObject({ removed: ['B'], added: ['X'] })
    expect(hunks[1]).toMatchObject({ removed: ['D'], added: ['Y'] })
  })

  it('handles empty old (all-add) and empty new (all-remove)', () => {
    expect(computeLineDiff('', 'a\nb')).toEqual<DiffHunk[]>([
      { oldStart: 1, newStart: 1, removed: [], added: ['a', 'b'] },
    ])
    expect(computeLineDiff('a\nb', '')).toEqual<DiffHunk[]>([
      { oldStart: 1, newStart: 1, removed: ['a', 'b'], added: [] },
    ])
  })

  it('handles consecutive insertions correctly', () => {
    const hunks = computeLineDiff('a\nz', 'a\nb\nc\nz')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 2, newStart: 2, removed: [], added: ['b', 'c'] },
    ])
  })

  it('completes on a 5000-line input within reasonable time', () => {
    const lines = (n: number) => Array.from({ length: n }, (_, i) => `Line ${i}`).join('\n')
    const oldText = lines(5000)
    const newText = lines(5000).replace('Line 100', 'Line 100 modified')

    const start = Date.now()
    const hunks = computeLineDiff(oldText, newText)
    const elapsed = Date.now() - start

    expect(hunks.length).toBeGreaterThanOrEqual(1)
    expect(elapsed).toBeLessThan(2000) // 2s ceiling — generous, real LCS on 5000² is ~25M ops
  })
})

describe('SourceDiff — formatUnifiedDiff', () => {
  it('returns empty string for identical inputs', () => {
    expect(formatUnifiedDiff('a\nb', 'a\nb')).toBe('')
  })

  it('formats a simple modification as a unified-diff-style string', () => {
    const out = formatUnifiedDiff('a\nB\nc', 'a\nX\nc')
    expect(out).toContain('-B')
    expect(out).toContain('+X')
  })

  it('includes line numbers for each hunk', () => {
    const out = formatUnifiedDiff('a\nB\nc\nD\ne', 'a\nX\nc\nY\ne')
    // Hunk header convention: @@ -<oldStart> +<newStart> @@
    expect(out).toMatch(/@@.*-2.*\+2.*@@/)
    expect(out).toMatch(/@@.*-4.*\+4.*@@/)
  })
})
