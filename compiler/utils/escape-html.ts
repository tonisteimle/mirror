/**
 * String-based HTML escaping
 *
 * Two pure-string escape functions for SSR / CLI / string-builder paths
 * that can't use DOM. The DOM-based variant
 * (`document.createElement('div'); div.textContent = s; return div.innerHTML`)
 * is more compact and parser-correct, but only runs when document is
 * available — these here are the fallback used by the compile CLI
 * (`compiler/cli/html-template.ts`), the export-button NDJSON streamer,
 * and the dialog HTML builder.
 *
 * Pre-2026-05-10 the same map was inline-duplicated in 4 different
 * places with subtle differences (some omitted `'`, some used switch
 * statements). Centralising them here means a future XSS hardening
 * (e.g. escaping `=` for partial attributes) lands in one place.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const HTML_ESCAPE_REGEX = /[&<>"']/g

/**
 * Escape the 5 characters that have meaning in HTML element content
 * (`<`, `>`, `&`) and HTML attribute content (`"`, `'`). Safe for both
 * contexts.
 *
 * Handles `null` / `undefined` by returning the empty string — useful
 * in template-literal HTML builders where the input may be optional.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(HTML_ESCAPE_REGEX, c => HTML_ESCAPES[c] || c)
}
