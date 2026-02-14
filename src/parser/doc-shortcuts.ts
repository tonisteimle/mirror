/**
 * Doc-Mode Shortcuts
 *
 * Default markdown-style shortcuts for documentation formatting.
 * These provide Markdown-compatible syntax for headings, inline formatting, and links.
 *
 * Users can override these by defining components with the `shortcut` property.
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
