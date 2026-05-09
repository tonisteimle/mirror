/**
 * Change-offset adjustment — shared between DropResultApplier and the
 * DrawManager onComplete handler.
 *
 * Background: code-modifying operations (drop, draw, …) compute
 * source-positions against the *resolved* source — that is, the user's
 * editor content prefixed by an auto-generated prelude (component
 * library, helper definitions) and possibly wrapped in `App\n  …` with
 * each user line indented by two spaces. The editor only displays the
 * un-wrapped, prelude-free user code, so a Change targeting position
 * 1389 in the resolved source might map to position 117 in the editor.
 *
 * This module turns a resolved-source Change into an editor-source
 * Change. Both DropResultApplier and the DrawManager funnel through
 * here so they stay consistent.
 */

export interface Change {
  from: number
  to: number
  insert: string
}

export interface OffsetContext {
  preludeOffset: number
  /** Whether the user code is wrapped in `App\n  …` with 2-space indent. */
  isWrappedWithApp: boolean
  /** Full resolved source (prelude + user code, post-wrap). Required when
   *  isWrappedWithApp is true. Otherwise can be ''. */
  resolvedSource: string
}

/**
 * Adjust a resolved-source Change for application to the editor.
 *
 * `editorDocLength` is consulted to detect the "full replace" case: a
 * change `{from: 0, to: pastDocLength}` is what addRoot emits, and it
 * needs a different mapping than a normal insertion. (Drop and draw
 * both rely on this.)
 */
export function adjustChangeForEditor(
  change: Change,
  ctx: OffsetContext,
  editorDocLength: number
): Change {
  if (isFullReplace(change, editorDocLength, ctx.preludeOffset)) {
    return adjustFullReplace(change, editorDocLength, ctx.preludeOffset)
  }
  return adjustStandardChange(change, ctx)
}

function isFullReplace(change: Change, docLength: number, preludeOffset: number): boolean {
  return change.from === 0 && change.to > docLength && preludeOffset > 0
}

function adjustFullReplace(change: Change, docLength: number, preludeOffset: number): Change {
  return {
    from: 0,
    to: docLength,
    insert: change.insert.substring(preludeOffset),
  }
}

function adjustStandardChange(change: Change, ctx: OffsetContext): Change {
  // Calculate indent correction separately for `from` and `to`. Both
  // must count *actual* wrap-indent chars (`'  '` at start of each
  // non-empty user line) that have been passed by the position. A naive
  // `(userLine - 1) * 2` over- or under-counts on empty lines and
  // boundary positions; this walk is exact.
  const fromCorrection = calculateIndentCorrection(change.from, ctx)
  const toCorrection = calculateIndentCorrection(change.to, ctx)

  return {
    from: change.from - ctx.preludeOffset - fromCorrection,
    to: change.to - ctx.preludeOffset - toCorrection,
    insert: adjustInsertIndent(change.insert, ctx.isWrappedWithApp),
  }
}

/**
 * "Fully passed" means: the position is at or past the second char of
 * that line's leading `'  '`. A position that lands exactly at the
 * start of a line (right after `\n`) has *not* passed that line's
 * indent yet.
 */
function calculateIndentCorrection(fullPosition: number, ctx: OffsetContext): number {
  if (!ctx.isWrappedWithApp || !ctx.resolvedSource) return 0
  if (fullPosition <= ctx.preludeOffset) return 0

  const region = ctx.resolvedSource.substring(ctx.preludeOffset, fullPosition)

  let passed = 0
  // First user line starts at preludeOffset (offset 0 in `region`).
  if (region.length >= 2 && region.substring(0, 2) === '  ') passed++

  // Each subsequent line starts after a `\n`.
  let nlIdx = region.indexOf('\n')
  while (nlIdx !== -1) {
    const lineStart = nlIdx + 1
    if (region.length >= lineStart + 2 && region.substring(lineStart, lineStart + 2) === '  ') {
      passed++
    }
    nlIdx = region.indexOf('\n', lineStart)
  }
  return passed * 2
}

/**
 * Strip the 2-space wrap-indent from each line of the insert text.
 * Empty lines stay empty; lines that don't start with two spaces are
 * left unchanged (a defensive fallback — addChild never produces them
 * inside a wrapped context, but we don't want to corrupt one if it
 * shows up).
 */
function adjustInsertIndent(insert: string, isWrappedWithApp: boolean): string {
  if (!isWrappedWithApp) return insert

  return insert
    .split('\n')
    .map((line, i) => {
      if (i === 0 && line === '') return line
      if (line.startsWith('  ')) return line.substring(2)
      return line
    })
    .join('\n')
}
