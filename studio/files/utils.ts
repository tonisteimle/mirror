/**
 * File Utilities
 *
 * Pure functions for file operations.
 * All functions < 10 lines.
 */

import type { FileType, TreeItem } from './types'
import { ICON_LAYOUT, ICON_TOKENS, ICON_COMPONENT } from './icons'

const FILE_TYPES: Record<string, FileType> = {
  layout: {
    type: 'layout',
    extensions: ['.mir', '.mirror'],
    color: '#5BA8F5',
    icon: ICON_LAYOUT,
  },
  tokens: {
    type: 'tokens',
    extensions: ['.tok', '.tokens'],
    color: '#F59E0B',
    icon: ICON_TOKENS,
  },
  component: {
    type: 'component',
    extensions: ['.com', '.components'],
    color: '#8B5CF6',
    icon: ICON_COMPONENT,
  },
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function escapeAttr(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

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

export function getFileType(filename: string): FileType {
  for (const config of Object.values(FILE_TYPES)) {
    if (config.extensions.some(ext => filename.endsWith(ext))) {
      return config
    }
  }
  return FILE_TYPES.layout
}

export function getExtensionPriority(name: string): number {
  if (name.endsWith('.mir') || name.endsWith('.mirror')) return 0
  if (name.endsWith('.com') || name.endsWith('.components')) return 1
  if (name.endsWith('.tok') || name.endsWith('.tokens')) return 2
  return 3
}

export function findFirstFile(tree: TreeItem[]): string | null {
  const indexFile = findIndexFile(tree)
  if (indexFile) return indexFile
  return findAnyFile(tree)
}

function findIndexFile(tree: TreeItem[]): string | null {
  for (const item of tree) {
    if (item.type === 'file' && item.path.endsWith('index.mir')) {
      return item.path
    }
    if (item.type === 'folder' && item.children) {
      const found = findIndexFile(item.children)
      if (found) return found
    }
  }
  return null
}

function findAnyFile(tree: TreeItem[]): string | null {
  for (const item of tree) {
    if (item.type === 'file') return item.path
    if (item.type === 'folder' && item.children) {
      const found = findAnyFile(item.children)
      if (found) return found
    }
  }
  return null
}

export function getDirectory(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash > 0 ? path.substring(0, lastSlash) : ''
}

export function getFilename(path: string): string {
  return path.split('/').pop() || ''
}

export function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.substring(dotIndex) : ''
}

export function getBasename(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename
}

export function sortTreeItems(items: TreeItem[]): TreeItem[] {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    if (a.type === 'file') {
      const priorityDiff = getExtensionPriority(a.name) - getExtensionPriority(b.name)
      if (priorityDiff !== 0) return priorityDiff
    }
    return a.name.localeCompare(b.name)
  })
}

export function isValidPath(path: string): boolean {
  return !!path && path !== '.' && path !== 'demo'
}

export function buildTargetPath(fileName: string, parentFolder: string | null): string {
  if (!parentFolder || !isValidPath(parentFolder)) {
    return fileName
  }
  return `${parentFolder}/${fileName}`
}

export function ensureExtension(fileName: string): string {
  const SUPPORTED = ['.mir', '.tok', '.com', '.mirror', '.tokens', '.components']
  if (SUPPORTED.some(ext => fileName.endsWith(ext))) {
    return fileName
  }
  return `${fileName}.mir`
}
