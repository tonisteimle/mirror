/**
 * @module doc-shortcuts
 * @description Doc-Mode Shortcuts - Markdown-kompatible Formatierungs-Syntax
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Vordefinierte Markdown-Shortcuts für Doc-Mode Formatierung
 *
 * Bietet Markdown-kompatible Syntax für:
 * - Headings: # ## ### ####
 * - Inline: **bold**, _italic_, `code`
 * - Links: [text](url)
 *
 * User können Shortcuts überschreiben durch Components mit `shortcut` Property.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SHORTCUT TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type block
 *   Matcht am Zeilenanfang
 *   Beispiel: # Heading 1
 *
 * @type inline
 *   Wraps Text mit Marker
 *   Beispiel: **bold** oder _italic_
 *
 * @type link
 *   Spezielle [text](url) Syntax
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEFAULT SHORTCUTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @category Block (Line Start)
 *   #    → h1 (size 48, weight 400)
 *   ##   → h2 (size 28, weight 500)
 *   ###  → h3 (size 18, weight 500)
 *   #### → h4 (size 15, weight 500)
 *
 * @category Inline (Wrapping)
 *   **   → bold (weight 600)
 *   _    → italic
 *   `    → code (monospace, bg #333)
 *
 * @category Link
 *   []   → link (col #5ba8f5, underline)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function getBlockShortcuts() → DocShortcut[]
 *   Gibt Block-Shortcuts sortiert nach Länge (längste zuerst)
 *
 * @function getInlineShortcuts() → DocShortcut[]
 *   Gibt alle Inline-Shortcuts
 *
 * @function getLinkShortcut() → DocShortcut | undefined
 *   Gibt den Link-Shortcut
 *
 * @function findShortcutByMarker(marker) → DocShortcut | undefined
 *   Findet Shortcut nach Syntax-Marker
 *
 * @function findShortcutByName(name) → DocShortcut | undefined
 *   Findet Shortcut nach Token-Namen
 *
 * @used-by doc-text-parser.ts für Markdown-Parsing
 */

import type { DocTokenDef } from './doc-tokens'

/**
 * Shortcut type:
 * - 'block': Matches at line start (e.g., # Heading)
 * - 'inline': Wraps text (e.g., **bold**)
 * - 'link': Special [text](url) syntax
 */
export type ShortcutType = 'block' | 'inline' | 'link'

/**
 * Shortcut definition
 */
export interface DocShortcut {
  /** Token/component name (e.g., 'h1', 'b', 'link') */
  name: string
  /** Shortcut syntax (e.g., '#', '**', '[]') */
  shortcut: string
  /** How the shortcut is applied */
  type: ShortcutType
  /** Default style properties */
  properties: DocTokenDef
}

/**
 * Default shortcuts for doc-mode
 *
 * These provide Markdown-compatible syntax:
 * - # Heading 1, ## Heading 2, ### Heading 3
 * - **bold**, _italic_, `code`
 * - [link text](url)
 */
export const DOC_SHORTCUT_DEFAULTS: DocShortcut[] = [
  // ============================================
  // Block-level shortcuts (line start)
  // ============================================
  {
    name: 'h1',
    shortcut: '#',
    type: 'block',
    properties: { size: 48, weight: 400 }
  },
  {
    name: 'h2',
    shortcut: '##',
    type: 'block',
    properties: { size: 28, weight: 500 }
  },
  {
    name: 'h3',
    shortcut: '###',
    type: 'block',
    properties: { size: 18, weight: 500 }
  },
  {
    name: 'h4',
    shortcut: '####',
    type: 'block',
    properties: { size: 15, weight: 500 }
  },

  // ============================================
  // Inline shortcuts (wrapping text)
  // ============================================
  {
    name: 'b',
    shortcut: '**',
    type: 'inline',
    properties: { weight: 600 }
  },
  {
    name: 'i',
    shortcut: '_',
    type: 'inline',
    properties: { italic: true }
  },
  {
    name: 'code',
    shortcut: '`',
    type: 'inline',
    properties: { font: 'monospace', bg: '#333' }
  },

  // ============================================
  // Link syntax
  // ============================================
  {
    name: 'link',
    shortcut: '[]',
    type: 'link',
    properties: { col: '#5ba8f5', underline: true }
  },
]

/**
 * Get block shortcuts sorted by length (longest first for proper matching)
 */
export function getBlockShortcuts(): DocShortcut[] {
  return DOC_SHORTCUT_DEFAULTS
    .filter(s => s.type === 'block')
    .sort((a, b) => b.shortcut.length - a.shortcut.length)
}

/**
 * Get inline shortcuts
 */
export function getInlineShortcuts(): DocShortcut[] {
  return DOC_SHORTCUT_DEFAULTS.filter(s => s.type === 'inline')
}

/**
 * Get link shortcut
 */
export function getLinkShortcut(): DocShortcut | undefined {
  return DOC_SHORTCUT_DEFAULTS.find(s => s.type === 'link')
}

/**
 * Find a shortcut by its syntax marker
 */
export function findShortcutByMarker(marker: string): DocShortcut | undefined {
  return DOC_SHORTCUT_DEFAULTS.find(s => s.shortcut === marker)
}

/**
 * Find a shortcut by component/token name
 */
export function findShortcutByName(name: string): DocShortcut | undefined {
  return DOC_SHORTCUT_DEFAULTS.find(s => s.name === name)
}
