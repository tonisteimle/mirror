/**
 * Line-level Source-Diff via Longest-Common-Subsequence.
 *
 * Output: `DiffHunk[]` — zusammenhängende Gruppen aus entfernten und/oder
 * hinzugefügten Zeilen, jede mit Position im alten und neuen Text. Reine
 * `keep`-Zeilen tauchen nicht auf (sie sind im Original sichtbar; was wir
 * brauchen ist nur _was sich änderte_).
 *
 * Algorithmus: Standard-LCS-DP-Tabelle + Backtrack. O(n·m) Zeit/Platz.
 * Für unsere Inputs (≤ a few thousand Zeilen) reicht das deutlich.
 *
 * Bewusst _ohne_ npm-Dep (`diff`, `fast-diff`, ...) — wäre eine winzige
 * Wrapping-Schicht; eigene Impl ist transparenter und vermeidet eine
 * neue Bundle-Dep für eine ohnehin gewrappte Funktion.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Diff-Ghost), llm-edit-flow-plan.md (T1.4)
 */

export interface DiffHunk {
  /** 1-basierte Zeile im alten Text, an der die Änderung beginnt. */
  oldStart: number
  /** 1-basierte Zeile im neuen Text, an der die Änderung beginnt. */
  newStart: number
  /** Zeilen, die im alten Text waren und nun fehlen. */
  removed: string[]
  /** Zeilen, die im neuen Text dazukommen. */
  added: string[]
}

type RawOp = { type: 'keep' | 'remove' | 'add'; text: string }

export function computeLineDiff(oldText: string, newText: string): DiffHunk[] {
  const a = oldText === '' ? [] : oldText.split('\n')
  const b = newText === '' ? [] : newText.split('\n')

  const ops = backtrack(a, b, lcsTable(a, b))
  return groupIntoHunks(ops)
}

export function formatUnifiedDiff(oldText: string, newText: string): string {
  const hunks = computeLineDiff(oldText, newText)
  if (hunks.length === 0) return ''

  const out: string[] = []
  for (const h of hunks) {
    const oldCount = h.removed.length
    const newCount = h.added.length
    out.push(`@@ -${h.oldStart},${oldCount} +${h.newStart},${newCount} @@`)
    for (const line of h.removed) out.push(`-${line}`)
    for (const line of h.added) out.push(`+${line}`)
  }
  return out.join('\n')
}

// ---------- internals ----------

function lcsTable(a: string[], b: string[]): number[][] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  return dp
}

function backtrack(a: string[], b: string[], dp: number[][]): RawOp[] {
  const ops: RawOp[] = []
  let i = a.length
  let j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      ops.push({ type: 'keep', text: a[i - 1] })
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      ops.push({ type: 'remove', text: a[i - 1] })
      i--
    } else {
      ops.push({ type: 'add', text: b[j - 1] })
      j--
    }
  }
  while (i > 0) {
    ops.push({ type: 'remove', text: a[i - 1] })
    i--
  }
  while (j > 0) {
    ops.push({ type: 'add', text: b[j - 1] })
    j--
  }
  return ops.reverse()
}

function groupIntoHunks(ops: RawOp[]): DiffHunk[] {
  const hunks: DiffHunk[] = []
  let oldLine = 1
  let newLine = 1
  let pending: DiffHunk | null = null

  const flush = () => {
    if (pending) {
      hunks.push(pending)
      pending = null
    }
  }

  for (const op of ops) {
    if (op.type === 'keep') {
      flush()
      oldLine++
      newLine++
      continue
    }
    if (!pending) {
      pending = { oldStart: oldLine, newStart: newLine, removed: [], added: [] }
    }
    if (op.type === 'remove') {
      pending.removed.push(op.text)
      oldLine++
    } else {
      pending.added.push(op.text)
      newLine++
    }
  }
  flush()
  return hunks
}
