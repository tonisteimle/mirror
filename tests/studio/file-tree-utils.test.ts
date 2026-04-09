/**
 * File Tree Utils Tests
 *
 * Tests for pure utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  getFileType,
  isSupportedExtension,
  validateFilename,
  findFirstFile,
  collectFilePaths,
  pathExistsInTree,
  findItemByPath,
  getParentPath,
  getFileName,
  getExtension,
  getBaseName,
  buildSiblingPath,
  buildChildPath,
  getExtensionPriority,
  sortTreeItems,
  generateCopyName,
  generateDefaultContent
} from '../../studio/file-tree/utils'

import type { StorageItem } from '../../studio/storage/types'

// =============================================================================
// FILE TYPE DETECTION
// =============================================================================

describe('getFileType', () => {
  it('should detect .mir as layout', () => {
    expect(getFileType('index.mir').type).toBe('layout')
    expect(getFileType('page.mir').type).toBe('layout')
  })

  it('should detect .mirror as layout', () => {
    expect(getFileType('app.mirror').type).toBe('layout')
  })

  it('should detect .tok as tokens', () => {
    expect(getFileType('theme.tok').type).toBe('tokens')
  })

  it('should detect .tokens as tokens', () => {
    expect(getFileType('colors.tokens').type).toBe('tokens')
  })

  it('should detect .com as component', () => {
    expect(getFileType('button.com').type).toBe('component')
  })

  it('should detect .components as component', () => {
    expect(getFileType('ui.components').type).toBe('component')
  })

  it('should return unknown for other extensions', () => {
    expect(getFileType('readme.md').type).toBe('unknown')
    expect(getFileType('style.css').type).toBe('unknown')
    expect(getFileType('app.js').type).toBe('unknown')
  })

  it('should return correct colors', () => {
    expect(getFileType('index.mir').color).toBe('#5BA8F5')
    expect(getFileType('theme.tok').color).toBe('#F59E0B')
    expect(getFileType('button.com').color).toBe('#8B5CF6')
  })
})

describe('isSupportedExtension', () => {
  it('should return true for supported extensions', () => {
    expect(isSupportedExtension('file.mir')).toBe(true)
    expect(isSupportedExtension('file.tok')).toBe(true)
    expect(isSupportedExtension('file.com')).toBe(true)
    expect(isSupportedExtension('file.mirror')).toBe(true)
    expect(isSupportedExtension('file.tokens')).toBe(true)
    expect(isSupportedExtension('file.components')).toBe(true)
  })

  it('should return false for unsupported extensions', () => {
    expect(isSupportedExtension('file.js')).toBe(false)
    expect(isSupportedExtension('file.md')).toBe(false)
    expect(isSupportedExtension('file.css')).toBe(false)
  })
})

// =============================================================================
// FILENAME VALIDATION
// =============================================================================

describe('validateFilename', () => {
  it('should accept valid filenames', () => {
    expect(validateFilename('index.mir').valid).toBe(true)
    expect(validateFilename('my-file.tok').valid).toBe(true)
    expect(validateFilename('component_v2.com').valid).toBe(true)
    expect(validateFilename('Test123.mir').valid).toBe(true)
  })

  it('should reject empty names', () => {
    expect(validateFilename('').valid).toBe(false)
    expect(validateFilename('   ').valid).toBe(false)
  })

  it('should reject names with slashes', () => {
    expect(validateFilename('path/file.mir').valid).toBe(false)
    expect(validateFilename('path\\file.mir').valid).toBe(false)
  })

  it('should reject names with colons', () => {
    expect(validateFilename('file:name.mir').valid).toBe(false)
  })

  it('should reject names starting with dot', () => {
    expect(validateFilename('.hidden').valid).toBe(false)
  })

  it('should reject special characters', () => {
    expect(validateFilename('file name.mir').valid).toBe(false)
    expect(validateFilename('file@name.mir').valid).toBe(false)
    expect(validateFilename('file#name.mir').valid).toBe(false)
    expect(validateFilename('filéname.mir').valid).toBe(false)
  })

  it('should return error message', () => {
    const result = validateFilename('')
    expect(result.error).toBe('Name cannot be empty')
  })
})

// =============================================================================
// TREE TRAVERSAL
// =============================================================================

const sampleTree: StorageItem[] = [
  { type: 'file', name: 'index.mir', path: 'index.mir' },
  { type: 'file', name: 'tokens.tok', path: 'tokens.tok' },
  {
    type: 'folder',
    name: 'components',
    path: 'components',
    children: [
      { type: 'file', name: 'button.com', path: 'components/button.com' },
      { type: 'file', name: 'card.com', path: 'components/card.com' }
    ]
  },
  {
    type: 'folder',
    name: 'pages',
    path: 'pages',
    children: [
      { type: 'file', name: 'home.mir', path: 'pages/home.mir' }
    ]
  }
]

describe('findFirstFile', () => {
  it('should prioritize index.mir', () => {
    expect(findFirstFile(sampleTree)).toBe('index.mir')
  })

  it('should find nested index.mir', () => {
    const tree: StorageItem[] = [
      { type: 'file', name: 'other.mir', path: 'other.mir' },
      {
        type: 'folder',
        name: 'src',
        path: 'src',
        children: [
          { type: 'file', name: 'index.mir', path: 'src/index.mir' }
        ]
      }
    ]
    expect(findFirstFile(tree)).toBe('src/index.mir')
  })

  it('should return first file if no index.mir', () => {
    const tree: StorageItem[] = [
      { type: 'file', name: 'app.mir', path: 'app.mir' },
      { type: 'file', name: 'other.mir', path: 'other.mir' }
    ]
    expect(findFirstFile(tree)).toBe('app.mir')
  })

  it('should return null for empty tree', () => {
    expect(findFirstFile([])).toBeNull()
  })

  it('should return null for folder-only tree', () => {
    const tree: StorageItem[] = [
      { type: 'folder', name: 'empty', path: 'empty', children: [] }
    ]
    expect(findFirstFile(tree)).toBeNull()
  })
})

describe('collectFilePaths', () => {
  it('should collect all file paths', () => {
    const paths = collectFilePaths(sampleTree)
    expect(paths).toContain('index.mir')
    expect(paths).toContain('tokens.tok')
    expect(paths).toContain('components/button.com')
    expect(paths).toContain('components/card.com')
    expect(paths).toContain('pages/home.mir')
    expect(paths.length).toBe(5)
  })

  it('should not include folder paths', () => {
    const paths = collectFilePaths(sampleTree)
    expect(paths).not.toContain('components')
    expect(paths).not.toContain('pages')
  })

  it('should return empty array for empty tree', () => {
    expect(collectFilePaths([])).toEqual([])
  })
})

describe('pathExistsInTree', () => {
  it('should find root files', () => {
    expect(pathExistsInTree(sampleTree, 'index.mir')).toBe(true)
  })

  it('should find nested files', () => {
    expect(pathExistsInTree(sampleTree, 'components/button.com')).toBe(true)
  })

  it('should find folders', () => {
    expect(pathExistsInTree(sampleTree, 'components')).toBe(true)
  })

  it('should return false for non-existent paths', () => {
    expect(pathExistsInTree(sampleTree, 'nonexistent.mir')).toBe(false)
  })
})

describe('findItemByPath', () => {
  it('should find root items', () => {
    const item = findItemByPath(sampleTree, 'index.mir')
    expect(item).not.toBeNull()
    expect(item!.name).toBe('index.mir')
  })

  it('should find nested items', () => {
    const item = findItemByPath(sampleTree, 'components/button.com')
    expect(item).not.toBeNull()
    expect(item!.name).toBe('button.com')
  })

  it('should return null for non-existent paths', () => {
    expect(findItemByPath(sampleTree, 'nonexistent')).toBeNull()
  })
})

// =============================================================================
// PATH UTILITIES
// =============================================================================

describe('getParentPath', () => {
  it('should return parent folder', () => {
    expect(getParentPath('folder/file.mir')).toBe('folder')
    expect(getParentPath('a/b/c.mir')).toBe('a/b')
  })

  it('should return null for root files', () => {
    expect(getParentPath('file.mir')).toBeNull()
  })
})

describe('getFileName', () => {
  it('should extract filename', () => {
    expect(getFileName('folder/file.mir')).toBe('file.mir')
    expect(getFileName('a/b/c.mir')).toBe('c.mir')
  })

  it('should handle root files', () => {
    expect(getFileName('file.mir')).toBe('file.mir')
  })
})

describe('getExtension', () => {
  it('should extract extension', () => {
    expect(getExtension('file.mir')).toBe('.mir')
    expect(getExtension('folder/file.tok')).toBe('.tok')
  })

  it('should handle no extension', () => {
    expect(getExtension('Makefile')).toBe('')
  })

  it('should handle multiple dots', () => {
    expect(getExtension('file.backup.mir')).toBe('.mir')
  })
})

describe('getBaseName', () => {
  it('should extract base name', () => {
    expect(getBaseName('file.mir')).toBe('file')
    expect(getBaseName('folder/file.tok')).toBe('file')
  })

  it('should handle no extension', () => {
    expect(getBaseName('Makefile')).toBe('Makefile')
  })
})

describe('buildSiblingPath', () => {
  it('should build sibling path in same folder', () => {
    expect(buildSiblingPath('folder/old.mir', 'new.mir')).toBe('folder/new.mir')
  })

  it('should handle root files', () => {
    expect(buildSiblingPath('old.mir', 'new.mir')).toBe('new.mir')
  })
})

describe('buildChildPath', () => {
  it('should build child path', () => {
    expect(buildChildPath('folder', 'file.mir')).toBe('folder/file.mir')
  })

  it('should handle empty folder', () => {
    expect(buildChildPath('', 'file.mir')).toBe('file.mir')
  })

  it('should handle root markers', () => {
    expect(buildChildPath('.', 'file.mir')).toBe('file.mir')
    expect(buildChildPath('demo', 'file.mir')).toBe('file.mir')
  })
})

// =============================================================================
// SORTING
// =============================================================================

describe('getExtensionPriority', () => {
  it('should prioritize .mir files', () => {
    expect(getExtensionPriority('file.mir')).toBe(0)
    expect(getExtensionPriority('file.mirror')).toBe(0)
  })

  it('should rank .com second', () => {
    expect(getExtensionPriority('file.com')).toBe(1)
    expect(getExtensionPriority('file.components')).toBe(1)
  })

  it('should rank .tok third', () => {
    expect(getExtensionPriority('file.tok')).toBe(2)
    expect(getExtensionPriority('file.tokens')).toBe(2)
  })

  it('should rank others last', () => {
    expect(getExtensionPriority('file.txt')).toBe(3)
    expect(getExtensionPriority('file.md')).toBe(3)
  })
})

describe('sortTreeItems', () => {
  it('should sort folders before files', () => {
    const items: StorageItem[] = [
      { type: 'file', name: 'a.mir', path: 'a.mir' },
      { type: 'folder', name: 'z', path: 'z', children: [] }
    ]
    const sorted = sortTreeItems(items)
    expect(sorted[0].type).toBe('folder')
    expect(sorted[1].type).toBe('file')
  })

  it('should sort files by extension priority', () => {
    const items: StorageItem[] = [
      { type: 'file', name: 'a.tok', path: 'a.tok' },
      { type: 'file', name: 'b.mir', path: 'b.mir' },
      { type: 'file', name: 'c.com', path: 'c.com' }
    ]
    const sorted = sortTreeItems(items)
    expect(sorted[0].name).toBe('b.mir')  // Priority 0
    expect(sorted[1].name).toBe('c.com')  // Priority 1
    expect(sorted[2].name).toBe('a.tok')  // Priority 2
  })

  it('should sort alphabetically within same priority', () => {
    const items: StorageItem[] = [
      { type: 'file', name: 'c.mir', path: 'c.mir' },
      { type: 'file', name: 'a.mir', path: 'a.mir' },
      { type: 'file', name: 'b.mir', path: 'b.mir' }
    ]
    const sorted = sortTreeItems(items)
    expect(sorted[0].name).toBe('a.mir')
    expect(sorted[1].name).toBe('b.mir')
    expect(sorted[2].name).toBe('c.mir')
  })

  it('should not modify original array', () => {
    const items: StorageItem[] = [
      { type: 'file', name: 'b.mir', path: 'b.mir' },
      { type: 'file', name: 'a.mir', path: 'a.mir' }
    ]
    sortTreeItems(items)
    expect(items[0].name).toBe('b.mir')  // Original unchanged
  })
})

// =============================================================================
// COPY NAME GENERATION
// =============================================================================

describe('generateCopyName', () => {
  it('should generate copy name', () => {
    const existing = new Set(['file.mir'])
    expect(generateCopyName('file.mir', existing)).toBe('file-copy.mir')
  })

  it('should increment if copy exists', () => {
    const existing = new Set(['file.mir', 'file-copy.mir'])
    expect(generateCopyName('file.mir', existing)).toBe('file-copy-1.mir')
  })

  it('should keep incrementing', () => {
    const existing = new Set([
      'file.mir',
      'file-copy.mir',
      'file-copy-1.mir',
      'file-copy-2.mir'
    ])
    expect(generateCopyName('file.mir', existing)).toBe('file-copy-3.mir')
  })

  it('should handle nested paths', () => {
    const existing = new Set(['folder/file.mir'])
    expect(generateCopyName('folder/file.mir', existing)).toBe('folder/file-copy.mir')
  })
})

// =============================================================================
// DEFAULT CONTENT
// =============================================================================

describe('generateDefaultContent', () => {
  it('should generate layout content for .mir', () => {
    const content = generateDefaultContent('index.mir')
    expect(content).toContain('// index.mir')
    expect(content).toContain('Frame')
  })

  it('should generate token content for .tok', () => {
    const content = generateDefaultContent('theme.tok')
    expect(content).toContain('// theme.tok')
    // New syntax: token definitions without $ (e.g., primary.bg: #5BA8F5)
    expect(content).toMatch(/\w+\.\w+:/)
  })

  it('should generate component content for .com', () => {
    const content = generateDefaultContent('button.com')
    expect(content).toContain('// button.com')
    expect(content).toContain('MyComponent:')
  })
})
