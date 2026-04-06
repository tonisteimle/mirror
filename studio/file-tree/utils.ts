/**
 * File Tree Utilities
 *
 * Pure functions for file tree operations.
 * Fully testable without DOM.
 */

import type { StorageItem, StorageFile, StorageFolder } from '../storage/types'

// =============================================================================
// File Type Detection
// =============================================================================

export interface FileTypeInfo {
  type: 'layout' | 'tokens' | 'component' | 'unknown'
  color: string
  extensions: string[]
}

export const FILE_TYPES: Record<string, FileTypeInfo> = {
  layout: {
    type: 'layout',
    extensions: ['.mir', '.mirror'],
    color: '#3B82F6'
  },
  tokens: {
    type: 'tokens',
    extensions: ['.tok', '.tokens'],
    color: '#F59E0B'
  },
  component: {
    type: 'component',
    extensions: ['.com', '.components'],
    color: '#8B5CF6'
  }
}

/**
 * Get file type info from filename
 */
export function getFileType(filename: string): FileTypeInfo {
  for (const [key, info] of Object.entries(FILE_TYPES)) {
    if (info.extensions.some(ext => filename.endsWith(ext))) {
      return info
    }
  }
  return { type: 'unknown', color: '#888888', extensions: [] }
}

/**
 * Check if filename has a supported Mirror extension
 */
export function isSupportedExtension(filename: string): boolean {
  const supported = ['.mir', '.tok', '.com', '.mirror', '.tokens', '.components']
  return supported.some(ext => filename.endsWith(ext))
}

// =============================================================================
// Filename Validation
// =============================================================================

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate filename - returns error message or null if valid
 * Only ASCII alphanumeric, -, _, and . allowed
 */
export function validateFilename(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name cannot be empty' }
  }
  if (name.includes('/') || name.includes('\\')) {
    return { valid: false, error: 'Name cannot contain / or \\' }
  }
  if (name.includes(':')) {
    return { valid: false, error: 'Name cannot contain :' }
  }
  if (name.startsWith('.')) {
    return { valid: false, error: 'Name cannot start with .' }
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, hyphens, and underscores' }
  }
  return { valid: true }
}

// =============================================================================
// Tree Traversal
// =============================================================================

/**
 * Find first file in tree (prioritizes index.mir)
 */
export function findFirstFile(tree: StorageItem[]): string | null {
  // First pass: look for index.mir
  for (const item of tree) {
    if (item.type === 'file' && item.path.endsWith('index.mir')) {
      return item.path
    }
    if (item.type === 'folder') {
      const folder = item as StorageFolder
      const found = findFirstFile(folder.children || [])
      if (found && found.endsWith('index.mir')) return found
    }
  }

  // Second pass: return any file
  for (const item of tree) {
    if (item.type === 'file') return item.path
    if (item.type === 'folder') {
      const folder = item as StorageFolder
      const found = findFirstFile(folder.children || [])
      if (found) return found
    }
  }

  return null
}

/**
 * Collect all file paths from tree
 */
export function collectFilePaths(tree: StorageItem[]): string[] {
  const paths: string[] = []

  function traverse(items: StorageItem[]) {
    for (const item of items) {
      if (item.type === 'file') {
        paths.push(item.path)
      } else if (item.type === 'folder') {
        const folder = item as StorageFolder
        traverse(folder.children || [])
      }
    }
  }

  traverse(tree)
  return paths
}

/**
 * Check if a path exists in the tree
 */
export function pathExistsInTree(tree: StorageItem[], path: string): boolean {
  for (const item of tree) {
    if (item.path === path) return true
    if (item.type === 'folder') {
      const folder = item as StorageFolder
      if (pathExistsInTree(folder.children || [], path)) return true
    }
  }
  return false
}

/**
 * Find item by path in tree
 */
export function findItemByPath(tree: StorageItem[], path: string): StorageItem | null {
  for (const item of tree) {
    if (item.path === path) return item
    if (item.type === 'folder') {
      const folder = item as StorageFolder
      const found = findItemByPath(folder.children || [], path)
      if (found) return found
    }
  }
  return null
}

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Get parent folder path
 */
export function getParentPath(path: string): string | null {
  const lastSlash = path.lastIndexOf('/')
  if (lastSlash === -1) return null
  return path.substring(0, lastSlash)
}

/**
 * Get filename from path
 */
export function getFileName(path: string): string {
  return path.split('/').pop() || path
}

/**
 * Get file extension
 */
export function getExtension(path: string): string {
  const name = getFileName(path)
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.substring(dotIndex) : ''
}

/**
 * Get base name (without extension)
 */
export function getBaseName(path: string): string {
  const name = getFileName(path)
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.substring(0, dotIndex) : name
}

/**
 * Build new path in same directory
 */
export function buildSiblingPath(originalPath: string, newName: string): string {
  const parent = getParentPath(originalPath)
  return parent ? `${parent}/${newName}` : newName
}

/**
 * Build path in target folder
 */
export function buildChildPath(folder: string, name: string): string {
  if (!folder || folder === '.' || folder === 'demo') {
    return name
  }
  return `${folder}/${name}`
}

// =============================================================================
// Sorting
// =============================================================================

/**
 * Get sort priority for file extension
 * .mir = 0, .com = 1, .tok = 2, others = 3
 */
export function getExtensionPriority(name: string): number {
  if (name.endsWith('.mir') || name.endsWith('.mirror')) return 0
  if (name.endsWith('.com') || name.endsWith('.components')) return 1
  if (name.endsWith('.tok') || name.endsWith('.tokens')) return 2
  return 3
}

/**
 * Sort items: folders first, then files by extension priority, then alphabetically
 */
export function sortTreeItems(items: StorageItem[]): StorageItem[] {
  return [...items].sort((a, b) => {
    // Folders first
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    // Files: sort by extension priority
    if (a.type === 'file') {
      const priorityA = getExtensionPriority(a.name)
      const priorityB = getExtensionPriority(b.name)
      if (priorityA !== priorityB) return priorityA - priorityB
    }
    // Then alphabetically
    return a.name.localeCompare(b.name)
  })
}

// =============================================================================
// Duplicate Name Generation
// =============================================================================

/**
 * Generate unique copy name
 */
export function generateCopyName(
  originalPath: string,
  existingPaths: Set<string>
): string {
  const name = getFileName(originalPath)
  const ext = getExtension(name)
  const baseName = getBaseName(name)
  const parent = getParentPath(originalPath)

  let newName = `${baseName}-copy${ext}`
  let newPath = parent ? `${parent}/${newName}` : newName
  let counter = 1

  while (existingPaths.has(newPath)) {
    newName = `${baseName}-copy-${counter}${ext}`
    newPath = parent ? `${parent}/${newName}` : newName
    counter++
  }

  return newPath
}

// =============================================================================
// Default Content
// =============================================================================

/**
 * Generate default content for new files
 */
export function generateDefaultContent(filename: string): string {
  const type = getFileType(filename)

  switch (type.type) {
    case 'tokens':
      return `// ${filename}\n\n$primary.bg: #3b82f6\n$surface.bg: #1a1a1a\n`
    case 'component':
      return `// ${filename}\n\nMyComponent: pad 16, bg #1a1a1a, rad 8\n`
    case 'layout':
    default:
      return `// ${filename}\n\nFrame w 100, h 100, bg #333\n`
  }
}
