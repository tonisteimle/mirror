/**
 * Inline Markdown Formatter
 *
 * Renders a small markdown subset inside Text content:
 *   `**bold**`   → `<strong>bold</strong>`
 *   `*italic*`   → `<em>italic</em>`
 *
 * The function HTML-escapes the input first so user data can never inject
 * tags — only the literal `**`/`*` markers we substitute become HTML.
 *
 * Self-contained on purpose: this file is `.toString()`-stamped into the
 * generated DOM bundle by `compiler/backends/dom/runtime-template/index.ts`,
 * so it must not rely on imports, closures, or outer scope.
 */

export function formatInlineMarkdown(text: unknown): string {
  // Coerce non-strings (numbers from arithmetic, booleans, null/undefined)
  // to a string the way `el.textContent = X` would. Skipping this returned
  // '' for `Text $a * $b` and similar expressions whose result is a number.
  if (text === null || text === undefined) return ''
  const str = typeof text === 'string' ? text : String(text)
  // 1) Escape HTML special chars so any tag-looking content from data
  //    becomes literal text instead of injected markup.
  let html = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  // 2) Bold first (non-greedy so multiple bold spans on one line don't
  //    merge), italic second on what remains.
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>')
  return html
}
