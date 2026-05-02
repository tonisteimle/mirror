/**
 * Desktop Files — Pure utility helpers.
 *
 * Extracted from desktop-files.ts so they can be unit-tested in
 * isolation without pulling in storage / dialog / DOM-bootstrap.
 */

import type { StorageItem } from './storage'

// =============================================================================
// File-type metadata
// =============================================================================

export interface FileTypeConfig {
  extensions: string[]
  color: string
  icon: string
}

export interface FileTypeInfo extends FileTypeConfig {
  type: string
}

/**
 * Public file-type registry. Keeps the icon strings here so both the
 * renderer (in desktop-files.ts) and tests can rely on the same source.
 */
export const FILE_TYPES: Record<string, FileTypeConfig> = {
  layout: {
    extensions: ['.mir', '.mirror'],
    color: '#5BA8F5',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
    </svg>`,
  },
  tokens: {
    extensions: ['.tok', '.tokens'],
    color: '#F59E0B',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
    </svg>`,
  },
  component: {
    extensions: ['.com', '.components'],
    color: '#8B5CF6',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>`,
  },
}

// =============================================================================
// Pure helpers
// =============================================================================

/**
 * Escape HTML entities to prevent XSS in text content. Uses the DOM
 * for parser-correct escaping; in non-DOM environments fall back to a
 * regex-based equivalent.
 */
export function escapeHtml(text: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  return escapeAttr(text)
}

/**
 * Escape for use in HTML attributes (escapes quotes too).
 */
export function escapeAttr(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Validate filename — returns error message or null if valid.
 * ASCII-only because the server applies the same constraint.
 */
export function validateFilename(name: string): string | null {
  if (!name || !name.trim()) return 'Name cannot be empty'
  if (name.includes('/') || name.includes('\\')) return 'Name cannot contain / or \\'
  if (name.includes(':')) return 'Name cannot contain :'
  if (name.startsWith('.')) return 'Name cannot start with .'
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
    return 'Name can only contain letters, numbers, hyphens, and underscores'
  }
  return null
}

/**
 * Lookup file-type info by filename extension. Defaults to 'layout'
 * for unknown extensions so list rendering always has an icon.
 */
export function getFileType(filename: string): FileTypeInfo {
  for (const [type, config] of Object.entries(FILE_TYPES)) {
    if (config.extensions.some(ext => filename.endsWith(ext))) {
      return { type, ...config }
    }
  }
  return { type: 'layout', ...FILE_TYPES.layout }
}

/**
 * Find first file in a tree, prioritising index.mir.
 */
export function findFirstFile(tree: StorageItem[]): string | null {
  for (const item of tree) {
    if (item.type === 'file' && item.path.endsWith('index.mir')) {
      return item.path
    }
    if (item.type === 'folder' && item.children) {
      const found = findFirstFile(item.children)
      if (found && found.endsWith('index.mir')) return found
    }
  }
  for (const item of tree) {
    if (item.type === 'file') return item.path
    if (item.type === 'folder' && item.children) {
      const found = findFirstFile(item.children)
      if (found) return found
    }
  }
  return null
}

/**
 * Sort priority for known extensions. Lower = earlier. Unknown
 * extensions sort last.
 */
export function getExtensionPriority(name: string): number {
  if (name.endsWith('.mir') || name.endsWith('.mirror')) return 0
  if (name.endsWith('.com') || name.endsWith('.components')) return 1
  if (name.endsWith('.tok') || name.endsWith('.tokens')) return 2
  return 3
}

/**
 * Sort items: folders first, then files by extension priority,
 * finally alphabetically (locale-aware).
 */
export function sortTreeItems(items: StorageItem[]): StorageItem[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    if (a.type === 'file') {
      const priorityA = getExtensionPriority(a.name)
      const priorityB = getExtensionPriority(b.name)
      if (priorityA !== priorityB) return priorityA - priorityB
    }
    return a.name.localeCompare(b.name)
  })
}
