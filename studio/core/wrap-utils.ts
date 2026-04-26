/**
 * Wrap-utils — helpers for translating CodeModifier offsets back to
 * editor offsets when the compiled source is wrapped in an implicit `App`
 * root (which prepends `App\n` AND indents every non-empty user line by 2
 * spaces).
 *
 * The CodeModifier operates on the resolved/wrapped source; the editor
 * shows only the user's source. To apply a CodeModifier change to the
 * editor we have to:
 *   1. subtract `preludeOffset` (any prelude/`App\n` chars before the
 *      user's first line) — handled by callers.
 *   2. subtract the synthetic 2-space indent for every non-empty user
 *      line that the position has fully passed (this module).
 *   3. strip the same 2-space prefix from the `insert` payload so we
 *      don't accumulate wrapper indentation across multiple edits.
 *
 * Background commit: `539c03fb` (drop pipeline). The same correction is
 * required for the property-panel pipeline — kept in one place so the two
 * call sites stay in lockstep.
 */

/**
 * Count synthetic 2-space wrap indents in the resolved source's
 * `[startOffset, endOffset)` region. One indent = 2 chars per non-empty
 * user line whose `'  '` prefix lies fully before `endOffset`.
 */
export function countWrapIndentChars(
  resolved: string,
  startOffset: number,
  endOffset: number
): number {
  if (!resolved || endOffset <= startOffset) return 0
  const region = resolved.substring(startOffset, endOffset)
  let count = 0
  if (region.length >= 2 && region.substring(0, 2) === '  ') count++
  let nlIdx = region.indexOf('\n')
  while (nlIdx !== -1) {
    const lineStart = nlIdx + 1
    if (region.length >= lineStart + 2 && region.substring(lineStart, lineStart + 2) === '  ') {
      count++
    }
    nlIdx = region.indexOf('\n', lineStart)
  }
  return count * 2
}

/** Strip the leading 2-space wrap indent from each non-empty line of an insert payload. */
export function stripWrapIndentLines(insert: string): string {
  return insert
    .split('\n')
    .map((line, i) => {
      if (i === 0 && line === '') return line
      if (line.startsWith('  ')) return line.substring(2)
      return line
    })
    .join('\n')
}

/**
 * Translate a CodeModifier change to the equivalent editor change,
 * accounting for the prelude offset and (when wrapped) the App-wrapper
 * indent for every user line the position has passed.
 *
 * @param change           The CodeModifier change (from/to/insert in resolved-source coords)
 * @param preludeOffset    `state.preludeOffset` (chars before user's first line)
 * @param isWrappedWithApp `state.isWrappedWithApp` — true when CodeModifier source has an `App\n  …` wrapper
 * @param resolvedSource   `state.resolvedSource` — the wrapped source (only consulted when wrapped)
 */
export function adjustChangeForWrap(
  change: { from: number; to: number; insert: string },
  preludeOffset: number,
  isWrappedWithApp: boolean,
  resolvedSource: string
): { from: number; to: number; insert: string } {
  if (!isWrappedWithApp) {
    return {
      from: change.from - preludeOffset,
      to: change.to - preludeOffset,
      insert: change.insert,
    }
  }
  const fromIndents = countWrapIndentChars(resolvedSource, preludeOffset, change.from)
  const toIndents = countWrapIndentChars(resolvedSource, preludeOffset, change.to)
  return {
    from: change.from - preludeOffset - fromIndents,
    to: change.to - preludeOffset - toIndents,
    insert: stripWrapIndentLines(change.insert),
  }
}
