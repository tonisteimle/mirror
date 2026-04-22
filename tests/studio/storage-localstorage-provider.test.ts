/**
 * LocalStorageProvider Tests
 *
 * Tests for the browser localStorage storage provider.
 * Uses a mock localStorage since Node.js doesn't have it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LocalStorageProvider, isLocalStorageAvailable } from '../../studio/storage/providers/localstorage'

// =============================================================================
// LOCALSTORAGE MOCK
// =============================================================================

class MockLocalStorage {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }

  get length(): number {
    return Object.keys(this.store).length
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null
  }
}

// =============================================================================
// TEST SETUP
// =============================================================================

let mockStorage: MockLocalStorage
let originalLocalStorage: Storage | undefined

beforeEach(() => {
  // Save original
  originalLocalStorage = global.localStorage

  // Create mock
  mockStorage = new MockLocalStorage()
  global.localStorage = mockStorage as unknown as Storage

  // Suppress console logs
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  // Restore original
  if (originalLocalStorage) {
    global.localStorage = originalLocalStorage
  } else {
    // @ts-expect-error - Cleanup
    delete global.localStorage
  }

  vi.restoreAllMocks()
})

// =============================================================================
// PROVIDER PROPERTIES
// =============================================================================

describe('LocalStorageProvider Properties', () => {
  it('should have type "localstorage"', () => {
    const provider = new LocalStorageProvider()
    expect(provider.type).toBe('localstorage')
  })

  it('should not support projects', () => {
    const provider = new LocalStorageProvider()
    expect(provider.supportsProjects).toBe(false)
  })

  it('should not support native dialogs', () => {
    const provider = new LocalStorageProvider()
    expect(provider.supportsNativeDialogs).toBe(false)
  })
})

// =============================================================================
// INITIALIZATION
// =============================================================================

describe('LocalStorageProvider Initialization', () => {
  it('should load demo project when storage is empty', async () => {
    const provider = new LocalStorageProvider()
    const tree = await provider.getTree()

    const names = tree.map(i => i.name)
    expect(names).toContain('index.mir')
    expect(names).toContain('tokens.tok')
    expect(names).toContain('components.com')
    expect(names).toContain('data.yaml')
    expect(names.length).toBe(4)
  })

  it('should load existing files from storage', async () => {
    // Pre-populate storage
    mockStorage.setItem('mirror-files', JSON.stringify({
      'custom.mir': 'Frame "Custom"',
    }))

    const provider = new LocalStorageProvider()
    const content = await provider.readFile('custom.mir')

    expect(content).toBe('Frame "Custom"')
  })

  it('should persist to localStorage on write', async () => {
    const provider = new LocalStorageProvider()
    await provider.writeFile('test.mir', 'Frame "Test"')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['test.mir']).toBe('Frame "Test"')
  })

  it('should handle corrupted localStorage gracefully', async () => {
    mockStorage.setItem('mirror-files', 'not-valid-json')

    // Should not throw, should load defaults
    const provider = new LocalStorageProvider()
    const tree = await provider.getTree()

    expect(tree.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// PROJECT OPERATIONS
// =============================================================================

describe('LocalStorageProvider Project Operations', () => {
  it('should list local project', async () => {
    const provider = new LocalStorageProvider()
    const projects = await provider.listProjects()

    expect(projects).toHaveLength(1)
    expect(projects[0].id).toBe('local')
    expect(projects[0].name).toBe('Local Project')
  })

  it('should throw on createProject', async () => {
    const provider = new LocalStorageProvider()
    await expect(provider.createProject('test')).rejects.toThrow(
      'LocalStorage mode does not support multiple projects'
    )
  })

  it('should throw on deleteProject', async () => {
    const provider = new LocalStorageProvider()
    await expect(provider.deleteProject('local')).rejects.toThrow(
      'LocalStorage mode does not support deleting projects'
    )
  })

  it('should not throw on openProject/closeProject', async () => {
    const provider = new LocalStorageProvider()
    await provider.openProject('local')
    await provider.closeProject()
    // Should not throw
  })
})

// =============================================================================
// FILE OPERATIONS
// =============================================================================

describe('LocalStorageProvider File Operations', () => {
  describe('readFile', () => {
    it('should read existing file', async () => {
      const provider = new LocalStorageProvider()
      const content = await provider.readFile('index.mir')

      expect(content).toContain('Frame')
    })

    it('should throw on non-existent file', async () => {
      const provider = new LocalStorageProvider()
      await expect(provider.readFile('nonexistent.mir')).rejects.toThrow(
        'File not found: nonexistent.mir'
      )
    })
  })

  describe('writeFile', () => {
    it('should write new file', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('new.mir', 'Frame "New"')

      const content = await provider.readFile('new.mir')
      expect(content).toBe('Frame "New"')
    })

    it('should overwrite existing file', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('index.mir', 'Updated content')

      const content = await provider.readFile('index.mir')
      expect(content).toBe('Updated content')
    })

    it('should persist to localStorage', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('persisted.mir', 'content')

      // Create new provider to verify persistence
      const provider2 = new LocalStorageProvider()
      const content = await provider2.readFile('persisted.mir')
      expect(content).toBe('content')
    })

    it('should handle nested paths', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('deep/nested/file.mir', 'content')

      const content = await provider.readFile('deep/nested/file.mir')
      expect(content).toBe('content')
    })
  })

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('temp.mir', 'temp')
      await provider.deleteFile('temp.mir')

      await expect(provider.readFile('temp.mir')).rejects.toThrow()
    })

    it('should throw on non-existent file', async () => {
      const provider = new LocalStorageProvider()
      await expect(provider.deleteFile('nonexistent.mir')).rejects.toThrow(
        'File not found: nonexistent.mir'
      )
    })

    it('should persist deletion to localStorage', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('todelete.mir', 'content')
      await provider.deleteFile('todelete.mir')

      // Verify in new provider
      const provider2 = new LocalStorageProvider()
      await expect(provider2.readFile('todelete.mir')).rejects.toThrow()
    })
  })

  describe('renameFile', () => {
    it('should rename file', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('old.mir', 'content')
      await provider.renameFile('old.mir', 'new.mir')

      const content = await provider.readFile('new.mir')
      expect(content).toBe('content')
      await expect(provider.readFile('old.mir')).rejects.toThrow()
    })

    it('should throw if source does not exist', async () => {
      const provider = new LocalStorageProvider()
      await expect(
        provider.renameFile('nonexistent.mir', 'new.mir')
      ).rejects.toThrow('File not found: nonexistent.mir')
    })

    it('should throw if target already exists', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('source.mir', 'source')
      await provider.writeFile('target.mir', 'target')

      await expect(
        provider.renameFile('source.mir', 'target.mir')
      ).rejects.toThrow('File already exists: target.mir')
    })

    it('should persist rename to localStorage', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('before.mir', 'content')
      await provider.renameFile('before.mir', 'after.mir')

      const provider2 = new LocalStorageProvider()
      const content = await provider2.readFile('after.mir')
      expect(content).toBe('content')
    })
  })

  describe('copyFile', () => {
    it('should copy file', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('original.mir', 'content')
      await provider.copyFile('original.mir', 'copy.mir')

      const original = await provider.readFile('original.mir')
      const copy = await provider.readFile('copy.mir')
      expect(original).toBe('content')
      expect(copy).toBe('content')
    })

    it('should throw if source does not exist', async () => {
      const provider = new LocalStorageProvider()
      await expect(
        provider.copyFile('nonexistent.mir', 'copy.mir')
      ).rejects.toThrow('File not found: nonexistent.mir')
    })

    it('should throw if target already exists', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('source.mir', 'source')
      await provider.writeFile('target.mir', 'target')

      await expect(
        provider.copyFile('source.mir', 'target.mir')
      ).rejects.toThrow('File already exists: target.mir')
    })
  })
})

// =============================================================================
// FOLDER OPERATIONS
// =============================================================================

describe('LocalStorageProvider Folder Operations', () => {
  describe('createFolder', () => {
    it('should create folder', async () => {
      const provider = new LocalStorageProvider()
      await provider.createFolder('components')

      const tree = await provider.getTree()
      const folder = tree.find(i => i.name === 'components')
      expect(folder?.type).toBe('folder')
    })

    it('should create nested folders', async () => {
      const provider = new LocalStorageProvider()
      await provider.createFolder('deep/nested/folder')

      const tree = await provider.getTree()
      const deep = tree.find(i => i.name === 'deep')
      expect(deep?.type).toBe('folder')
    })
  })

  describe('deleteFolder', () => {
    it('should delete folder and contents', async () => {
      const provider = new LocalStorageProvider()
      await provider.createFolder('todelete')
      await provider.writeFile('todelete/file1.mir', 'content1')
      await provider.writeFile('todelete/file2.mir', 'content2')

      await provider.deleteFolder('todelete')

      const tree = await provider.getTree()
      const folder = tree.find(i => i.name === 'todelete')
      expect(folder).toBeUndefined()
    })

    it('should delete nested contents recursively', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('parent/child/deep.mir', 'content')
      await provider.deleteFolder('parent')

      await expect(provider.readFile('parent/child/deep.mir')).rejects.toThrow()
    })

    it('should persist deletion to localStorage', async () => {
      const provider = new LocalStorageProvider()
      await provider.createFolder('folder')
      await provider.writeFile('folder/file.mir', 'content')
      await provider.deleteFolder('folder')

      const provider2 = new LocalStorageProvider()
      await expect(provider2.readFile('folder/file.mir')).rejects.toThrow()
    })
  })

  describe('renameFolder', () => {
    it('should rename folder and update paths', async () => {
      const provider = new LocalStorageProvider()
      await provider.createFolder('old-folder')
      await provider.writeFile('old-folder/file.mir', 'content')

      await provider.renameFolder('old-folder', 'new-folder')

      const content = await provider.readFile('new-folder/file.mir')
      expect(content).toBe('content')
      await expect(provider.readFile('old-folder/file.mir')).rejects.toThrow()
    })

    it('should rename nested structure', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('parent/child/file.mir', 'content')
      await provider.renameFolder('parent', 'renamed')

      const content = await provider.readFile('renamed/child/file.mir')
      expect(content).toBe('content')
    })
  })

  describe('moveItem', () => {
    it('should move file to folder', async () => {
      const provider = new LocalStorageProvider()
      await provider.writeFile('file.mir', 'content')
      await provider.createFolder('target')

      await provider.moveItem('file.mir', 'target')

      const content = await provider.readFile('target/file.mir')
      expect(content).toBe('content')
      await expect(provider.readFile('file.mir')).rejects.toThrow()
    })

    it('should move folder to another folder', async () => {
      const provider = new LocalStorageProvider()
      await provider.createFolder('source')
      await provider.writeFile('source/file.mir', 'content')
      await provider.createFolder('target')

      await provider.moveItem('source', 'target')

      const content = await provider.readFile('target/source/file.mir')
      expect(content).toBe('content')
    })

    it('should move to root with empty target', async () => {
      const provider = new LocalStorageProvider()
      await provider.createFolder('folder')
      await provider.writeFile('folder/file.mir', 'content')

      await provider.moveItem('folder/file.mir', '')

      const content = await provider.readFile('file.mir')
      expect(content).toBe('content')
    })
  })
})

// =============================================================================
// FILE TREE
// =============================================================================

describe('LocalStorageProvider File Tree', () => {
  it('should return sorted tree (folders first)', async () => {
    const provider = new LocalStorageProvider()
    await provider.createFolder('aaa-folder')
    await provider.writeFile('zzz-file.mir', 'content')

    const tree = await provider.getTree()
    const folderIndex = tree.findIndex(i => i.name === 'aaa-folder')
    const fileIndex = tree.findIndex(i => i.name === 'zzz-file.mir')

    if (folderIndex !== -1 && fileIndex !== -1) {
      expect(folderIndex).toBeLessThan(fileIndex)
    }
  })

  it('should build nested tree structure', async () => {
    const provider = new LocalStorageProvider()
    await provider.writeFile('deep/nested/file.mir', 'content')

    const tree = await provider.getTree()
    const deep = tree.find(i => i.name === 'deep')

    expect(deep?.type).toBe('folder')
    if (deep?.type === 'folder') {
      const nested = deep.children.find(i => i.name === 'nested')
      expect(nested?.type).toBe('folder')
      if (nested?.type === 'folder') {
        const file = nested.children.find(i => i.name === 'file.mir')
        expect(file?.type).toBe('file')
      }
    }
  })
})

// =============================================================================
// UTILITY METHODS
// =============================================================================

describe('LocalStorageProvider Utilities', () => {
  describe('reset', () => {
    it('should reset to demo project', async () => {
      const provider = new LocalStorageProvider()

      // Modify
      await provider.writeFile('custom.mir', 'custom')
      await provider.deleteFile('index.mir')

      // Reset
      provider.reset()

      // Verify demo files are back
      const content = await provider.readFile('index.mir')
      expect(content).toContain('Frame')
      await expect(provider.readFile('custom.mir')).rejects.toThrow()
    })

    it('should persist reset to localStorage', () => {
      const provider = new LocalStorageProvider()
      provider.reset()

      const provider2 = new LocalStorageProvider()
      expect(provider2.isEmpty()).toBe(false)
    })
  })

  describe('isEmpty', () => {
    it('should return false for provider with files', () => {
      const provider = new LocalStorageProvider()
      expect(provider.isEmpty()).toBe(false)
    })
  })
})

// =============================================================================
// AVAILABILITY CHECK
// =============================================================================

describe('isLocalStorageAvailable', () => {
  it('should return true when localStorage is available', () => {
    expect(isLocalStorageAvailable()).toBe(true)
  })

  it('should return false when localStorage throws', () => {
    const original = global.localStorage

    // Mock localStorage to throw
    global.localStorage = {
      setItem: () => { throw new Error('Storage disabled') },
      getItem: () => null,
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    } as unknown as Storage

    expect(isLocalStorageAvailable()).toBe(false)

    global.localStorage = original
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('LocalStorageProvider Edge Cases', () => {
  it('should handle empty file content', async () => {
    const provider = new LocalStorageProvider()
    await provider.writeFile('empty.mir', '')

    const content = await provider.readFile('empty.mir')
    expect(content).toBe('')
  })

  it('should handle unicode content', async () => {
    const provider = new LocalStorageProvider()
    const unicodeContent = 'Text "Hello 🌍 Wörld"'
    await provider.writeFile('unicode.mir', unicodeContent)

    const content = await provider.readFile('unicode.mir')
    expect(content).toBe(unicodeContent)
  })

  it('should handle large content', async () => {
    const provider = new LocalStorageProvider()
    const largeContent = 'x'.repeat(100000)
    await provider.writeFile('large.mir', largeContent)

    const content = await provider.readFile('large.mir')
    expect(content).toBe(largeContent)
  })

  it('should handle special characters in file names', async () => {
    const provider = new LocalStorageProvider()
    await provider.writeFile('file-with-dashes.mir', 'content')
    await provider.writeFile('file_with_underscores.mir', 'content')

    const tree = await provider.getTree()
    const names = tree.map(i => i.name)
    expect(names).toContain('file-with-dashes.mir')
    expect(names).toContain('file_with_underscores.mir')
  })
})
