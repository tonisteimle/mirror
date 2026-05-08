/**
 * Tests for studio/agent/change-tracker.ts
 *
 * Stateful, per-File-Snapshots. `getDiffSinceLastCall()` liefert den
 * unified-diff-Text seit dem letzten Snapshot und aktualisiert den
 * Snapshot atomar — der nächste Call vergleicht gegen die jetzt aktuelle
 * Source.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow-test-concept.md § 3.1 (change-tracker)
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
    // Sharp: byte-exact format. Tests `formatUnifiedDiff` integration AND
    // that change-tracker doesn't mutate the diff in any way.
    expect(diff).toBe('@@ -2,1 +2,1 @@\n-  Text "old"\n+  Text "new"')
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
    // Sharp: exactly MAX_DIFF_LINES + 1 truncation marker line, not "<= 201".
    // Catches an off-by-one in the slicing: `slice(0, 200)` produces 200
    // diff lines, plus one marker. A regression to `slice(0, 199)` or
    // `slice(0, 201)` would slip past `<= 201`.
    expect(lines.length).toBe(201)
    // Sharp: exact marker text. We rely on this format in the prompt
    // ("we truncated N lines") — drift would silently change the LLM
    // signal.
    expect(lines[200]).toMatch(/^\.\.\. \(\d+ more diff lines truncated\)$/)
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

  // -----------------------------------------------------------------------
  // P2 coverage gaps
  // -----------------------------------------------------------------------

  it('first-call establishes the baseline so the second call sees the actual diff', () => {
    // Locks in the "first call returns empty AND establishes baseline" contract.
    // A regression where the first call doesn't update the snapshot would
    // make the second call ALSO return empty.
    const first = tracker.getDiffSinceLastCall('main.mir', 'A')
    expect(first).toBe('')
    const second = tracker.getDiffSinceLastCall('main.mir', 'B')
    expect(second).toBe('@@ -1,1 +1,1 @@\n-A\n+B')
  })

  it('track() called twice overwrites the previous baseline', () => {
    // track() is idempotent on the snapshot value — no append, no log. The
    // newer call wins.
    tracker.track('main.mir', 'A')
    tracker.track('main.mir', 'B')
    const diff = tracker.getDiffSinceLastCall('main.mir', 'C')
    // If track() didn't overwrite, the diff would be against 'A' and
    // contain "-A". With overwrite, baseline is 'B'.
    expect(diff).toBe('@@ -1,1 +1,1 @@\n-B\n+C')
  })

  it('reset() clears ALL files, not just one', () => {
    tracker.track('a.mir', 'a-old')
    tracker.track('b.mir', 'b-old')
    tracker.reset()
    expect(tracker.getDiffSinceLastCall('a.mir', 'a-new')).toBe('')
    expect(tracker.getDiffSinceLastCall('b.mir', 'b-new')).toBe('')
  })

  it('after reset() and a fresh track(), normal diff behavior resumes', () => {
    // Verifies reset() doesn't leave the tracker in a broken state — a
    // fresh track() must establish a usable baseline again.
    tracker.track('main.mir', 'old')
    tracker.reset()
    tracker.track('main.mir', 'baseline')
    const diff = tracker.getDiffSinceLastCall('main.mir', 'new')
    expect(diff).toBe('@@ -1,1 +1,1 @@\n-baseline\n+new')
  })

  it('truncation marker reports the exact number of lines that were dropped', () => {
    // Edit-Flow prompt format depends on the count. Discovery test —
    // locks in what the LLM sees. If the math drifts, the LLM sees a
    // wrong "we hid X lines" signal.
    const big = (suffix: string) =>
      Array.from({ length: 300 }, (_, i) => `Line ${i}${suffix}`).join('\n')

    tracker.track('big.mir', big(''))
    const diff = tracker.getDiffSinceLastCall('big.mir', big(' (changed)'))
    const lines = diff.split('\n')

    // formatUnifiedDiff for 300 changed lines: 1 hunk header + 300
    // remove + 300 add = 601 lines. Cap at 200, so 401 lines were
    // truncated.
    expect(lines[200]).toBe('... (401 more diff lines truncated)')
  })

  it('does not truncate a diff that is exactly MAX_DIFF_LINES long (boundary)', () => {
    // Constructs a diff of EXACTLY 200 lines to exercise the `<=` boundary.
    // A regression to `<` would truncate at-cap diffs, costing 199 lines of
    // useful signal in the LLM prompt every time.
    //
    // Construction: keep 'a', then add 199 fresh lines. The unified-diff
    // is 1 hunk header + 199 +lines = 200 lines.
    const old = 'a'
    const added = Array.from({ length: 199 }, (_, i) => `line${i}`).join('\n')
    const next = `a\n${added}`

    tracker.track('boundary.mir', old)
    const diff = tracker.getDiffSinceLastCall('boundary.mir', next)
    const lines = diff.split('\n')

    expect(lines.length).toBe(200) // sanity: construction is at the boundary
    expect(diff).not.toMatch(/truncated/i)
    // The exact diff: header + 199 +lines, no marker
    expect(lines[0]).toBe('@@ -2,0 +2,199 @@')
    expect(lines[199]).toBe('+line198')
  })

  it('truncates a diff that is MAX_DIFF_LINES + 1 long (just past boundary)', () => {
    // The first line past the cap must trigger truncation.
    // Construction: 200 +lines pushes total to 201, just past the cap.
    const old = 'a'
    const added = Array.from({ length: 200 }, (_, i) => `line${i}`).join('\n')
    const next = `a\n${added}`

    tracker.track('boundary.mir', old)
    const diff = tracker.getDiffSinceLastCall('boundary.mir', next)
    const lines = diff.split('\n')

    expect(lines.length).toBe(201) // 200 cap + 1 truncation marker
    expect(lines[200]).toBe('... (1 more diff lines truncated)')
  })

  it('handles empty-string baseline correctly (first non-empty edit shows full add)', () => {
    tracker.track('new.mir', '')
    const diff = tracker.getDiffSinceLastCall('new.mir', 'first content\nsecond')
    expect(diff).toBe('@@ -1,0 +1,2 @@\n+first content\n+second')
  })

  it('handles empty-string current source (full removal)', () => {
    tracker.track('main.mir', 'A\nB')
    const diff = tracker.getDiffSinceLastCall('main.mir', '')
    expect(diff).toBe('@@ -1,2 +1,0 @@\n-A\n-B')
  })

  it('three consecutive getDiff calls produce diffs against the previous call, not the original baseline', () => {
    // Drift detector: each getDiff must reset the baseline to the value
    // it just received. A regression where getDiff doesn't update the
    // snapshot would produce diffs against the FIRST baseline every time,
    // which would silently re-send the same content to the LLM forever.
    tracker.track('main.mir', 'V0')
    expect(tracker.getDiffSinceLastCall('main.mir', 'V1')).toBe('@@ -1,1 +1,1 @@\n-V0\n+V1')
    expect(tracker.getDiffSinceLastCall('main.mir', 'V2')).toBe('@@ -1,1 +1,1 @@\n-V1\n+V2')
    expect(tracker.getDiffSinceLastCall('main.mir', 'V3')).toBe('@@ -1,1 +1,1 @@\n-V2\n+V3')
  })

  it('different file IDs with identical content track independently', () => {
    // Make sure the Map keys don't collide on content — they're keyed on
    // fileId only.
    tracker.track('a.mir', 'same')
    tracker.track('b.mir', 'same')
    expect(tracker.getDiffSinceLastCall('a.mir', 'changed-a')).toBe(
      '@@ -1,1 +1,1 @@\n-same\n+changed-a'
    )
    // b's baseline must still be 'same', untouched by the call to a.
    expect(tracker.getDiffSinceLastCall('b.mir', 'changed-b')).toBe(
      '@@ -1,1 +1,1 @@\n-same\n+changed-b'
    )
  })
})
