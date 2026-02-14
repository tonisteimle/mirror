/**
 * Escape special HTML characters in text content
 *
 * @example
 * escapeHtml('Hello <World>') // 'Hello &lt;World&gt;'
 * escapeHtml('A & B') // 'A &amp; B'
 */
export function escapeHtml(text: string): string {
  if (!text) return ''

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
