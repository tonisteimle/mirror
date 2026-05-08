/**
 * Convert a string with simple inline-Markdown to safe HTML.
 *
 * Supported markers (Mirror project scope):
 *   **bold**   -> <strong>...</strong>
 *   *italic*   -> <em>...</em>
 *
 * The input is assumed to be plain text (no other HTML allowed). We
 * HTML-escape it first, then apply marker replacements. The result is
 * safe to feed into `dangerouslySetInnerHTML`.
 */
export function inlineMd(text: string): string {
  const escaped = escapeHtml(text)
  // Bold first so ** is consumed before * matches.
  const withBold = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  const withItalic = withBold.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  return withItalic
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Tiny self-test; throws if any expectation fails. Imported = compiled. */
export function _selfTest(): void {
  const cases: Array<[string, string]> = [
    ['plain', 'plain'],
    ['**bold**', '<strong>bold</strong>'],
    ['*italic*', '<em>italic</em>'],
    ['Hi **there** &go', 'Hi <strong>there</strong> &amp;go'],
    ['Lukas, *der überzeugte Tüftler*', 'Lukas, <em>der überzeugte Tüftler</em>'],
  ]
  for (const [input, expected] of cases) {
    const got = inlineMd(input)
    if (got !== expected) {
      throw new Error(
        `inlineMd(${JSON.stringify(input)}) = ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`
      )
    }
  }
}
