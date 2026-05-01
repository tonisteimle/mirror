/**
 * Mirror Runtime v2
 *
 * Ein JavaScript-Framework das Mirror 1:1 spiegelt.
 *
 * Verwendung:
 * ```typescript
 * import { M } from './runtime'
 *
 * // Elemente erstellen (wie Mirror, nur in JS)
 * const ui = M('Box', { bg: '#1a1a23', pad: 16 }, [
 *   M('Text', 'Hello', { weight: 'bold' }),
 *   M('Icon', 'home', { is: 24 })
 * ])
 *
 * // Rendern
 * M.render(ui, document.body)
 *
 * // Zurück zu Mirror übersetzen (deterministisch)
 * const mirrorCode = M.toMirror(ui)
 * ```
 */

export { M, default } from './mirror-runtime'
export type { MirrorProps, MirrorNode, Action } from './mirror-runtime'

// Markdown utilities for .data files
export { markdownToHTML, markdownToPlainText, hasMarkdownFormatting } from './markdown'
