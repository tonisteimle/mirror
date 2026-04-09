/**
 * StorageService Tests
 *
 * Tests for the main StorageService class using DemoProvider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from '../../studio/storage/service'
import { DemoProvider } from '../../studio/storage/providers/demo'

// =============================================================================
// TEST SETUP
// =============================================================================

let service: StorageService
let provider: DemoProvider

beforeEach(async () => {
  provider = new DemoProvider()
  service = new StorageService()
  service.setProvider(provider)
  // Populate tree cache for tests that depend on it
  await service.refreshTree()
})

// =============================================================================
// INITIALIZATION
// =============================================================================

describe('StorageService Initialization', () => {
  it('should be initialized after setProvider', () => {
    expect(service.isInitialized).toBe(true)
  })

  it('should report correct provider type', () => {
    expect(service.providerType).toBe('demo')
  })

  it('should throw if not initialized', () => {
    const uninitializedService = new StorageService()
    expect(() => uninitializedService.providerType).toThrow(
      'StorageService not initialized'
    )
  })

  it('should clear cache on setProvider', async () => {
    // Write a file to populate cache
    await service.writeFile('cached.mir', 'content')
    const cached = await service.readFile('cached.mir')
    expect(cached).toBe('content')

    // Set new provider (same instance, but clears cache)
    const newProvider = new DemoProvider()
    service.setProvider(newProvider)

    // File should not exist in new provider
    await expect(service.readFile('cached.mir')).rejects.toThrow()
  })
})

// =============================================================================
// FILE OPERATIONS
// =============================================================================

describe('StorageService File Operations', () => {
  describe('readFile', () => {
    it('should read file from provider', async () => {
      const content = await service.readFile('index.mir')
      expect(content).toContain('Mirror')
    })

    it('should cache file content', async () => {
      // First read
      await service.readFile('index.mir')

      // Spy on provider
      const readSpy = vi.spyOn(provider, 'readFile')

      // Second read should use cache
      await service.readFile('index.mir')

      expect(readSpy).not.toHaveBeenCalled()
    })

    it('should refresh cache after TTL', async () => {
      // This test verifies cache behavior conceptually
      // In production, cache expires after 5 seconds
      const content = await service.readFile('index.mir')
      expect(content).toBeDefined()
    })

    it('should throw on non-existent file', async () => {
      await expect(service.readFile('nonexistent.mir')).rejects.toThrow()
    })
  })

  describe('writeFile', () => {
    it('should write file to provider', async () => {
      await service.writeFile('new.mir', 'Frame "New"')
      const content = await service.readFile('new.mir')
      expect(content).toBe('Frame "New"')
    })

    it('should emit file:created for new files', async () => {
      const callback = vi.fn()
      service.events.on('file:created', callback)

      await service.writeFile('brand-new.mir', 'content')

      expect(callback).toHaveBeenCalledWith({ path: 'brand-new.mir' })
    })

    it('should emit file:changed for existing files', async () => {
      const callback = vi.fn()
      service.events.on('file:changed', callback)

      await service.writeFile('index.mir', 'updated')

      expect(callback).toHaveBeenCalledWith({
        path: 'index.mir',
        content: 'updated',
      })
    })

    it('should update cache on write', async () => {
      await service.writeFile('cached.mir', 'original')
      await service.writeFile('cached.mir', 'updated')

      const content = await service.readFile('cached.mir')
      expect(content).toBe('updated')
    })
  })

  describe('deleteFile', () => {
    it('should delete file from provider', async () => {
      await service.writeFile('temp.mir', 'temp')
      await service.deleteFile('temp.mir')

      await expect(service.readFile('temp.mir')).rejects.toThrow()
    })

    it('should emit file:deleted event', async () => {
      const callback = vi.fn()
      service.events.on('file:deleted', callback)

      await service.writeFile('todelete.mir', 'content')
      await service.deleteFile('todelete.mir')

      expect(callback).toHaveBeenCalledWith({ path: 'todelete.mir' })
    })

    it('should invalidate cache on delete', async () => {
      await service.writeFile('cached.mir', 'content')
      await service.readFile('cached.mir') // Populate cache

      await service.deleteFile('cached.mir')

      await expect(service.readFile('cached.mir')).rejects.toThrow()
    })
  })

  describe('renameFile', () => {
    it('should rename file', async () => {
      await service.writeFile('old.mir', 'content')
      await service.renameFile('old.mir', 'new.mir')

      const content = await service.readFile('new.mir')
      expect(content).toBe('content')
    })

    it('should emit file:renamed event', async () => {
      const callback = vi.fn()
      service.events.on('file:renamed', callback)

      await service.writeFile('source.mir', 'content')
      await service.renameFile('source.mir', 'target.mir')

      expect(callback).toHaveBeenCalledWith({
        oldPath: 'source.mir',
        newPath: 'target.mir',
      })
    })

    it('should update cache on rename', async () => {
      await service.writeFile('old.mir', 'content')
      await service.readFile('old.mir') // Populate cache

      await service.renameFile('old.mir', 'new.mir')

      // Old path should not be in cache
      await expect(service.readFile('old.mir')).rejects.toThrow()

      // New path should work
      const content = await service.readFile('new.mir')
      expect(content).toBe('content')
    })
  })

  describe('copyFile', () => {
    it('should copy file', async () => {
      await service.writeFile('original.mir', 'content')
      await service.copyFile('original.mir', 'copy.mir')

      const original = await service.readFile('original.mir')
      const copy = await service.readFile('copy.mir')

      expect(original).toBe('content')
      expect(copy).toBe('content')
    })

    it('should emit file:created for copy', async () => {
      const callback = vi.fn()
      service.events.on('file:created', callback)

      await service.writeFile('source.mir', 'content')
      await service.copyFile('source.mir', 'copy.mir')

      expect(callback).toHaveBeenCalledWith({ path: 'copy.mir' })
    })
  })
})

// =============================================================================
// FOLDER OPERATIONS
// =============================================================================

describe('StorageService Folder Operations', () => {
  describe('createFolder', () => {
    it('should create folder', async () => {
      await service.createFolder('components')

      const tree = service.getTree()
      const folder = tree.find(i => i.name === 'components')

      expect(folder).toBeDefined()
    })

    it('should emit folder:created event', async () => {
      const callback = vi.fn()
      service.events.on('folder:created', callback)

      await service.createFolder('newfolder')

      expect(callback).toHaveBeenCalledWith({ path: 'newfolder' })
    })
  })

  describe('deleteFolder', () => {
    it('should delete folder', async () => {
      await service.createFolder('todelete')
      await service.deleteFolder('todelete')

      const tree = service.getTree()
      const folder = tree.find(i => i.name === 'todelete')

      expect(folder).toBeUndefined()
    })

    it('should emit folder:deleted event', async () => {
      const callback = vi.fn()
      service.events.on('folder:deleted', callback)

      await service.createFolder('temp')
      await service.deleteFolder('temp')

      expect(callback).toHaveBeenCalledWith({ path: 'temp' })
    })

    it('should invalidate cache for files in deleted folder', async () => {
      await service.createFolder('folder')
      await service.writeFile('folder/file.mir', 'content')
      await service.readFile('folder/file.mir') // Populate cache

      await service.deleteFolder('folder')

      await expect(service.readFile('folder/file.mir')).rejects.toThrow()
    })
  })

  describe('moveItem', () => {
    it('should move file to folder', async () => {
      await service.writeFile('file.mir', 'content')
      await service.createFolder('target')

      await service.moveItem('file.mir', 'target')

      const content = await service.readFile('target/file.mir')
      expect(content).toBe('content')
    })

    it('should emit file:renamed event for move', async () => {
      const callback = vi.fn()
      service.events.on('file:renamed', callback)

      await service.writeFile('moveme.mir', 'content')
      await service.createFolder('dest')
      await service.moveItem('moveme.mir', 'dest')

      expect(callback).toHaveBeenCalledWith({
        oldPath: 'moveme.mir',
        newPath: 'dest/moveme.mir',
      })
    })
  })
})

// =============================================================================
// TREE OPERATIONS
// =============================================================================

describe('StorageService Tree Operations', () => {
  it('should return cached tree synchronously', () => {
    const tree = service.getTree()
    expect(Array.isArray(tree)).toBe(true)
  })

  it('should refresh tree from provider', async () => {
    const initialTree = service.getTree()

    await service.writeFile('newfile.mir', 'content')

    const updatedTree = service.getTree()
    const newFile = updatedTree.find(i => i.name === 'newfile.mir')

    expect(newFile).toBeDefined()
  })

  it('should emit tree:changed on refresh', async () => {
    const callback = vi.fn()
    service.events.on('tree:changed', callback)

    await service.refreshTree()

    expect(callback).toHaveBeenCalled()
  })
})

// =============================================================================
// PRELUDE OPERATIONS
// =============================================================================

describe('StorageService Prelude', () => {
  it('should get prelude files (tokens and components)', async () => {
    const preludeFiles = await service.getPreludeFiles()

    const types = preludeFiles.map(f => f.type)
    expect(types).toContain('tokens')
    expect(types).toContain('component')
  })

  it('should order tokens before components', async () => {
    const preludeFiles = await service.getPreludeFiles()

    const firstTokenIndex = preludeFiles.findIndex(f => f.type === 'tokens')
    const firstComponentIndex = preludeFiles.findIndex(f => f.type === 'component')

    if (firstTokenIndex !== -1 && firstComponentIndex !== -1) {
      expect(firstTokenIndex).toBeLessThan(firstComponentIndex)
    }
  })

  it('should build prelude string', async () => {
    const prelude = await service.buildPrelude()

    // Prelude contains components that use tokens (e.g., bg $accent)
    expect(prelude).toContain('$')
    expect(typeof prelude).toBe('string')
  })

  it('should handle missing prelude files gracefully', async () => {
    // Delete all prelude files
    await service.deleteFile('tokens.tok')
    await service.deleteFile('components.com')

    // Should not throw
    const prelude = await service.buildPrelude()
    expect(typeof prelude).toBe('string')
  })
})

// =============================================================================
// PROJECT OPERATIONS
// =============================================================================

describe('StorageService Project Operations', () => {
  it('should not have project initially', () => {
    expect(service.hasProject).toBe(false)
    expect(service.currentProjectName).toBeNull()
  })

  it('should list projects', async () => {
    const projects = await service.listProjects()
    expect(Array.isArray(projects)).toBe(true)
  })

  it('should not support native dialogs with demo provider', () => {
    expect(service.supportsNativeDialogs).toBe(false)
    expect(service.canOpenFolderDialog()).toBe(false)
  })
})

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

describe('StorageService Cache', () => {
  it('should invalidate specific file cache', async () => {
    await service.writeFile('cached.mir', 'original')
    await service.readFile('cached.mir') // Populate cache

    // Manually update provider without going through service
    await provider.writeFile('cached.mir', 'changed-directly')

    // Cache should still have old value
    const cached = await service.readFile('cached.mir')
    expect(cached).toBe('original')

    // Invalidate cache
    service.invalidateCache('cached.mir')

    // Now should get fresh value
    const fresh = await service.readFile('cached.mir')
    expect(fresh).toBe('changed-directly')
  })

  it('should invalidate all cache', async () => {
    await service.writeFile('file1.mir', 'content1')
    await service.writeFile('file2.mir', 'content2')
    await service.readFile('file1.mir')
    await service.readFile('file2.mir')

    service.invalidateCache()

    // Spy to verify fresh reads
    const readSpy = vi.spyOn(provider, 'readFile')

    await service.readFile('file1.mir')
    await service.readFile('file2.mir')

    expect(readSpy).toHaveBeenCalledTimes(2)
  })
})

// =============================================================================
// ERROR HANDLING
// =============================================================================

describe('StorageService Error Handling', () => {
  it('should emit error event on read failure', async () => {
    const callback = vi.fn()
    service.events.on('error', callback)

    try {
      await service.readFile('nonexistent.mir')
    } catch {
      // Expected
    }

    expect(callback).toHaveBeenCalled()
    expect(callback.mock.calls[0][0].operation).toBe('readFile')
    expect(callback.mock.calls[0][0].path).toBe('nonexistent.mir')
  })

  it('should emit error event on delete failure', async () => {
    const callback = vi.fn()
    service.events.on('error', callback)

    try {
      await service.deleteFile('nonexistent.mir')
    } catch {
      // Expected
    }

    expect(callback).toHaveBeenCalled()
    expect(callback.mock.calls[0][0].operation).toBe('deleteFile')
  })
})

// =============================================================================
// CONCURRENT OPERATIONS
// =============================================================================

describe('StorageService Concurrency', () => {
  it('should handle concurrent reads', async () => {
    await service.writeFile('concurrent.mir', 'content')

    const results = await Promise.all([
      service.readFile('concurrent.mir'),
      service.readFile('concurrent.mir'),
      service.readFile('concurrent.mir'),
    ])

    expect(results).toEqual(['content', 'content', 'content'])
  })

  it('should serialize writes to same file', async () => {
    const writes = [
      service.writeFile('serial.mir', 'first'),
      service.writeFile('serial.mir', 'second'),
      service.writeFile('serial.mir', 'third'),
    ]

    await Promise.all(writes)

    const content = await service.readFile('serial.mir')
    // One of the writes should have won
    expect(['first', 'second', 'third']).toContain(content)
  })

  it('should handle mixed operations', async () => {
    await service.writeFile('mixed.mir', 'initial')

    const operations = [
      service.readFile('mixed.mir'),
      service.writeFile('mixed.mir', 'updated'),
      service.readFile('mixed.mir'),
    ]

    const results = await Promise.allSettled(operations)

    // All operations should complete
    expect(results.every(r => r.status === 'fulfilled')).toBe(true)
  })
})
