/**
 * Tests for studio/agent/change-tracker.ts
 *
 * Stateful, per-File-Snapshots. `getDiffSinceLastCall()` liefert den
 * unified-diff-Text seit dem letzten Snapshot und aktualisiert den
 * Snapshot atomar — der nächste Call vergleicht gegen die jetzt aktuelle
 * Source.
 *
 * Siehe: docs/concepts/llm-edit-flow-test-concept.md § 3.1 (change-tracker)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createChangeTracker } from '../../studio/agent/change-tracker'
import type { ChangeTracker } from '../../studio/agent/change-tracker'

describe('ChangeTracker', () => {
  let tracker: ChangeTracker

  beforeEach(() => {
    tracker = createChangeTracker()
  })

  it('returns empty diff when no baseline has been tracked yet (first call)', () => {
    const diff = tracker.getDiffSinceLastCall('main.mir', 'Frame gap 12')
    expect(diff).toBe('')
  })

  it('returns a unified-diff string after the baseline changes', () => {
    tracker.track('main.mir', 'Frame gap 12\n  Text "old"')
    const diff = tracker.getDiffSinceLastCall('main.mir', 'Frame gap 12\n  Text "new"')
    expect(diff).toContain('-  Text "old"')
    expect(diff).toContain('+  Text "new"')
  })

  it('resets the baseline after getDiffSinceLastCall (next call sees no change)', () => {
    tracker.track('main.mir', 'A')
    tracker.getDiffSinceLastCall('main.mir', 'B')
    const diff = tracker.getDiffSinceLastCall('main.mir', 'B')
    expect(diff).toBe('')
  })

  it('returns empty diff when current source equals baseline', () => {
    tracker.track('main.mir', 'Frame gap 12')
    const diff = tracker.getDiffSinceLastCall('main.mir', 'Frame gap 12')
    expect(diff).toBe('')
  })

  it('tracks multiple files independently', () => {
    tracker.track('a.mir', 'AAA')
    tracker.track('b.mir', 'BBB')

    const diffA = tracker.getDiffSinceLastCall('a.mir', 'AAA changed')
    const diffB = tracker.getDiffSinceLastCall('b.mir', 'BBB')

    expect(diffA).toContain('AAA changed')
    expect(diffB).toBe('')
  })

  it('caps the returned diff at MAX_DIFF_LINES with a truncation marker', () => {
    const big = (suffix: string) =>
      Array.from({ length: 300 }, (_, i) => `Line ${i}${suffix}`).join('\n')

    tracker.track('big.mir', big(''))
    const diff = tracker.getDiffSinceLastCall('big.mir', big(' (changed)'))

    const lines = diff.split('\n')
    expect(lines.length).toBeLessThanOrEqual(201) // MAX_DIFF_LINES + 1 truncation marker
    expect(diff).toMatch(/truncated/i)
  })

  it('does not count individual long lines toward the cap (only total line count matters)', () => {
    const longLine = 'x'.repeat(10000)
    tracker.track('long.mir', longLine)
    const diff = tracker.getDiffSinceLastCall('long.mir', longLine + '\nadded')
    expect(diff).not.toMatch(/truncated/i)
    expect(diff).toContain('+added')
  })

  it('reset() clears all snapshots so subsequent getDiff returns empty', () => {
    tracker.track('main.mir', 'A')
    tracker.reset()
    const diff = tracker.getDiffSinceLastCall('main.mir', 'B')
    expect(diff).toBe('') // baseline gone, treated as first call
  })
})
