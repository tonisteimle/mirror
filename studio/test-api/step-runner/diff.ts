/**
 * Tiny line-diff utility for failure messages.
 *
 * Goal: when an `expectCode` fails, show a side-by-side per-line view that
 * makes the divergence obvious in 1 second. We don't need a real LCS diff —
 * line indices align well enough for human reading in test output.
 */

export function codeDiff(expected: string, actual: string): string {
  const exp = expected.split('\n')
  const act = actual.split('\n')
  const max = Math.max(exp.length, act.length)
  const out: string[] = []
  out.push('  ' + pad('EXPECTED', 60) + ' │ ACTUAL')
  out.push('  ' + '─'.repeat(60) + '─┼─' + '─'.repeat(60))
  for (let i = 0; i < max; i++) {
    const e = exp[i] ?? ''
    const a = act[i] ?? ''
    const marker = e === a ? '  ' : '✗ '
    out.push(marker + pad(e, 60) + ' │ ' + a)
  }
  return out.join('\n')
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…'
  return s + ' '.repeat(n - s.length)
}

/**
 * Whitespace canonicalization: trims trailing whitespace per line and
 * normalizes line endings. Indentation differences ARE preserved — Mirror
 * is indentation-sensitive. Leading/trailing blank lines are normalized.
 */
export function canonicalizeCode(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
}
