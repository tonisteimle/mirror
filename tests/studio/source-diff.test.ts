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
    // Sharp: full hunk equality including positions catches off-by-one drift.
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 2, newStart: 2, removed: ['B'], added: ['X'] },
      { oldStart: 4, newStart: 4, removed: ['D'], added: ['Y'] },
    ])
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

    // Exactly one modification → exactly one hunk with [Line 100] → [Line 100 modified].
    expect(hunks).toHaveLength(1)
    expect(hunks[0]).toEqual({
      oldStart: 101,
      newStart: 101,
      removed: ['Line 100'],
      added: ['Line 100 modified'],
    })
    expect(elapsed).toBeLessThan(2000) // 2s ceiling — generous, real LCS on 5000² is ~25M ops
  })
})

describe('SourceDiff — edge cases (P2 coverage)', () => {
  it('handles single-line input on both sides', () => {
    expect(computeLineDiff('a', 'b')).toEqual<DiffHunk[]>([
      { oldStart: 1, newStart: 1, removed: ['a'], added: ['b'] },
    ])
  })

  it('treats trailing newline as an additional empty line', () => {
    // 'a\n' splits to ['a', ''] — two lines: "a" and "" (after the newline).
    // 'a' splits to ['a'] — one line. Diff: an empty line was added at end.
    expect(computeLineDiff('a', 'a\n')).toEqual<DiffHunk[]>([
      { oldStart: 2, newStart: 2, removed: [], added: [''] },
    ])
  })

  it('handles repeated lines without confusing the LCS', () => {
    // LCS naively could match either repeated line; verify the diff is
    // minimal and the position math is consistent.
    const hunks = computeLineDiff('a\nb\na\nc\na', 'a\na\nc\na')
    // Expected: a single removal at position 2 (the first 'b').
    expect(hunks).toEqual<DiffHunk[]>([{ oldStart: 2, newStart: 2, removed: ['b'], added: [] }])
  })

  it('handles modification at the very start of the file', () => {
    const hunks = computeLineDiff('OLD\nb\nc', 'NEW\nb\nc')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 1, newStart: 1, removed: ['OLD'], added: ['NEW'] },
    ])
  })

  it('handles modification at the very end of the file', () => {
    const hunks = computeLineDiff('a\nb\nOLD', 'a\nb\nNEW')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 3, newStart: 3, removed: ['OLD'], added: ['NEW'] },
    ])
  })

  it('insertion at position 1 puts oldStart and newStart at line 1', () => {
    const hunks = computeLineDiff('b\nc', 'a\nb\nc')
    expect(hunks).toEqual<DiffHunk[]>([{ oldStart: 1, newStart: 1, removed: [], added: ['a'] }])
  })

  it('different lines containing only whitespace are still distinct', () => {
    // '  ' vs '\t' — both whitespace-only, but byte-different. The diff must
    // treat them as different lines, not equal.
    const hunks = computeLineDiff('  ', '\t')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 1, newStart: 1, removed: ['  '], added: ['\t'] },
    ])
  })

  it('removal from the start of file', () => {
    const hunks = computeLineDiff('removed\na\nb', 'a\nb')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 1, newStart: 1, removed: ['removed'], added: [] },
    ])
  })

  it('hunk positions correctly diverge after asymmetric add/remove', () => {
    // After removing 'B' (oldLine 2++ → 3, newLine stays at 2).
    // Keep 'c' advances both: oldLine 3 → 4, newLine 2 → 3.
    // Adding 'D' produces hunk at oldStart=4, newStart=3 — positions diverge.
    // Locks in that oldLine increments only on removes, newLine only on adds.
    const hunks = computeLineDiff('a\nB\nc', 'a\nc\nD')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 2, newStart: 2, removed: ['B'], added: [] },
      { oldStart: 4, newStart: 3, removed: [], added: ['D'] },
    ])
  })

  it('formatUnifiedDiff line numbers reflect divergent positions across hunks', () => {
    // Same divergence as above, but verified via the unified-diff string —
    // independent assertion path, catches the same bug if formatUnifiedDiff
    // ever drifts from computeLineDiff's position math.
    const out = formatUnifiedDiff('a\nB\nc', 'a\nc\nD')
    expect(out).toBe('@@ -2,1 +2,0 @@\n-B\n@@ -4,0 +3,1 @@\n+D')
  })

  it('LCS tie-break direction is locked (>= path in backtrack, not >)', () => {
    // When dp[i-1][j] equals dp[i][j-1], the backtrack uses `>=` to
    // prefer "remove" over "add" (move up vs left). Both tie-break
    // directions produce valid minimum-edit diffs — only the SHAPE differs.
    // Without a test that asserts the exact shape, the mutation `>=` → `>`
    // slips silently because total edit distance is unchanged.
    //
    // For 'A\nB' → 'B\nA' the LCS table has a tie at (2,2): both
    // dp[1][2] and dp[2][1] equal 1. With `>=` the backtrack picks
    // remove first → produces ADD 'B' at start, then REMOVE 'B' at end.
    const hunks = computeLineDiff('A\nB', 'B\nA')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 1, newStart: 1, removed: [], added: ['B'] },
      { oldStart: 2, newStart: 3, removed: ['B'], added: [] },
    ])
  })

  it('multiple removes before adds keep oldLine and newLine correctly tracked', () => {
    // Two removes (oldLine 2→3→4), then keep 'd' (3→5, 2→3),
    // then two adds at the end (newLine 3→4→5).
    // If oldLine/newLine increments were swapped, the final hunk's
    // newStart would shift by 2 (the remove count) and oldStart would
    // shift by -2.
    const hunks = computeLineDiff('a\nB\nC\nd', 'a\nd\nE\nF')
    expect(hunks).toEqual<DiffHunk[]>([
      { oldStart: 2, newStart: 2, removed: ['B', 'C'], added: [] },
      { oldStart: 5, newStart: 3, removed: [], added: ['E', 'F'] },
    ])
  })
})

describe('SourceDiff — formatUnifiedDiff', () => {
  it('returns empty string for identical inputs', () => {
    expect(formatUnifiedDiff('a\nb', 'a\nb')).toBe('')
  })

  it('formats a simple modification as a unified-diff-style string', () => {
    const out = formatUnifiedDiff('a\nB\nc', 'a\nX\nc')
    expect(out).toBe('@@ -2,1 +2,1 @@\n-B\n+X')
  })

  it('includes line numbers for each hunk', () => {
    const out = formatUnifiedDiff('a\nB\nc\nD\ne', 'a\nX\nc\nY\ne')
    // Sharp: byte-exact format. Discovery test — if the output drifts, this
    // is the canonical reference for what changed.
    expect(out).toBe('@@ -2,1 +2,1 @@\n-B\n+X\n@@ -4,1 +4,1 @@\n-D\n+Y')
  })
})
