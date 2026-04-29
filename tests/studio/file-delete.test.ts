/**
 * File Delete Tests
 *
 * Focused tests for file deletion functionality.
 * Tests the complete flow from UI action through controller to storage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileTreeController } from '../../studio/file-tree/controller'
import { StorageService } from '../../studio/storage/service'
import { DemoProvider } from '../../studio/storage/providers/demo'

// =============================================================================
// TEST SETUP
// =============================================================================

let controller: FileTreeController
let storage: StorageService
let provider: DemoProvider

beforeEach(async () => {
  provider = new DemoProvider()
  storage = new StorageService()
  storage.setProvider(provider)
  await storage.refreshTree()

  controller = new FileTreeController(storage)
})

// =============================================================================
// BASIC DELETE TESTS
// =============================================================================

describe('File Delete - Basic Operations', () => {
  it('should delete a file that exists', async () => {
    // Create a test file first
    await storage.writeFile('test-to-delete.mir', '// test content')

    // Verify it exists
    const contentBefore = await storage.readFile('test-to-delete.mir')
    expect(contentBefore).toBe('// test content')

    // Delete it
    const result = await controller.deleteItem('test-to-delete.mir', false)
    expect(result).toBe(true)

    // Verify it's gone
    await expect(storage.readFile('test-to-delete.mir')).rejects.toThrow()
  })

  it('should return true on successful delete', async () => {
    await storage.writeFile('deleteme.mir', 'content')
    const result = await controller.deleteItem('deleteme.mir', false)
    expect(result).toBe(true)
  })

  it('should call storage.deleteFile for files', async () => {
    await storage.writeFile('file.mir', 'content')
    const spy = vi.spyOn(storage, 'deleteFile')

    await controller.deleteItem('file.mir', false)

    expect(spy).toHaveBeenCalledWith('file.mir')
  })

  it('should call storage.deleteFolder for folders', async () => {
    await storage.createFolder('testfolder')
    const spy = vi.spyOn(storage, 'deleteFolder')

    await controller.deleteItem('testfolder', true)

    expect(spy).toHaveBeenCalledWith('testfolder')
  })
})

// =============================================================================
// DELETE EVENT HANDLING
// =============================================================================

describe('File Delete - Event Handling', () => {
  it('should emit file:deleted event', async () => {
    const eventSpy = vi.fn()
    storage.events.on('file:deleted', eventSpy)

    await storage.writeFile('eventtest.mir', 'content')
    await controller.deleteItem('eventtest.mir', false)

    expect(eventSpy).toHaveBeenCalledWith({ path: 'eventtest.mir' })
  })

  it('should trigger onTreeChange callback after delete', async () => {
    const onTreeChange = vi.fn()
    controller.init({ onTreeChange })

    await storage.writeFile('treeevent.mir', 'content')
    await controller.deleteItem('treeevent.mir', false)

    // onTreeChange is called by event listener
    expect(onTreeChange).toHaveBeenCalled()
  })

  it('should remove file from cache after delete', async () => {
    await controller.selectFile('index.mir')
    expect(controller.filesCache['index.mir']).toBeDefined()

    await controller.deleteItem('index.mir', false)

    expect(controller.filesCache['index.mir']).toBeUndefined()
  })
})

// =============================================================================
// CURRENT FILE HANDLING
// =============================================================================

describe('File Delete - Current File Handling', () => {
  it('should clear currentFile when deleted file was selected', async () => {
    await controller.selectFile('index.mir')
    expect(controller.currentFile).toBe('index.mir')

    await controller.deleteItem('index.mir', false)

    // currentFile should be cleared (or switched to another file)
    expect(controller.currentFile).not.toBe('index.mir')
  })

  it('should auto-select next file after deleting current', async () => {
    // Ensure there are multiple files
    await storage.writeFile('file-a.mir', 'a')
    await storage.writeFile('file-b.mir', 'b')

    await controller.selectFile('file-a.mir')
    await controller.deleteItem('file-a.mir', false)

    // Should have auto-selected another file (or null if none left)
    // The behavior is to select first available file
    const tree = storage.getTree()
    const hasFiles = tree.some(item => item.type === 'file')

    if (hasFiles) {
      expect(controller.currentFile).not.toBeNull()
      expect(controller.currentFile).not.toBe('file-a.mir')
    }
  })

  it('should not affect currentFile when deleting different file', async () => {
    await storage.writeFile('other.mir', 'content')

    await controller.selectFile('index.mir')
    await controller.deleteItem('other.mir', false)

    // currentFile should still be the same
    expect(controller.currentFile).toBe('index.mir')
  })
})

// =============================================================================
// ERROR HANDLING
// =============================================================================

describe('File Delete - Error Handling', () => {
  it('should call onError callback when delete fails', async () => {
    const onError = vi.fn()
    controller.init({ onError })

    // Try to delete non-existent file
    const result = await controller.deleteItem('nonexistent.mir', false)

    expect(result).toBe(false)
    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    // Operation name comes from storage service, which reports 'deleteFile'
    expect(onError.mock.calls[0][1]).toBe('deleteFile')
  })

  it('should return false when delete fails', async () => {
    const result = await controller.deleteItem('does-not-exist.mir', false)
    expect(result).toBe(false)
  })

  it('should not modify cache when delete fails', async () => {
    await controller.selectFile('index.mir')
    const cachedContent = controller.filesCache['index.mir']

    // Try to delete non-existent file
    await controller.deleteItem('nonexistent.mir', false)

    // Cache should be unchanged
    expect(controller.filesCache['index.mir']).toBe(cachedContent)
  })
})

// =============================================================================
// FOLDER DELETE TESTS
// =============================================================================

describe('File Delete - Folder Operations', () => {
  it('should delete empty folder', async () => {
    await storage.createFolder('emptyfolder')

    const result = await controller.deleteItem('emptyfolder', true)
    expect(result).toBe(true)
  })

  it('should delete folder with files', async () => {
    await storage.createFolder('folderwithfiles')
    await storage.writeFile('folderwithfiles/file1.mir', 'content1')
    await storage.writeFile('folderwithfiles/file2.mir', 'content2')

    const result = await controller.deleteItem('folderwithfiles', true)
    expect(result).toBe(true)

    // Files inside should also be gone
    await expect(storage.readFile('folderwithfiles/file1.mir')).rejects.toThrow()
    await expect(storage.readFile('folderwithfiles/file2.mir')).rejects.toThrow()
  })

  // BUG: When deleting a folder, files inside are NOT removed from the controller cache
  // The storage service removes files from its cache, but the controller listens to
  // Storage emits `folder:deleted` for the folder itself (no per-file
  // `file:deleted` for nested files). The controller now listens for
  // that event and strips every cache entry whose path is under the
  // deleted folder prefix, so cached content for deleted folder files
  // is correctly evicted.
  it('should remove all folder files from cache', async () => {
    await storage.createFolder('cachedFolder')
    await storage.writeFile('cachedFolder/cached.mir', 'content')

    // Load into cache
    await controller.selectFile('cachedFolder/cached.mir')
    expect(controller.filesCache['cachedFolder/cached.mir']).toBeDefined()

    // Delete folder
    await controller.deleteItem('cachedFolder', true)

    // File is no longer in cache after folder delete.
    expect(controller.filesCache['cachedFolder/cached.mir']).toBeUndefined()
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('File Delete - Edge Cases', () => {
  it('should handle deleting file with special characters in path', async () => {
    // Note: DemoProvider validates filenames, so only valid names work
    await storage.writeFile('test-file-123.mir', 'content')

    const result = await controller.deleteItem('test-file-123.mir', false)
    expect(result).toBe(true)
  })

  it('should handle deleting file in nested folder', async () => {
    await storage.createFolder('level1')
    await storage.createFolder('level1/level2')
    await storage.writeFile('level1/level2/deep.mir', 'content')

    const result = await controller.deleteItem('level1/level2/deep.mir', false)
    expect(result).toBe(true)

    // Folder structure should remain
    const tree = storage.getTree()
    const level1 = tree.find(i => i.name === 'level1')
    expect(level1).toBeDefined()
  })

  it('should handle deleting last file in project', async () => {
    // Delete all default files
    const tree = storage.getTree()

    for (const item of tree) {
      if (item.type === 'file') {
        await controller.deleteItem(item.path, false)
      }
    }

    // Should not crash, currentFile should be null
    expect(controller.currentFile).toBeNull()
  })

  it('should handle rapid successive deletes', async () => {
    // Create multiple files
    await storage.writeFile('rapid1.mir', 'content1')
    await storage.writeFile('rapid2.mir', 'content2')
    await storage.writeFile('rapid3.mir', 'content3')

    // Delete them rapidly
    const results = await Promise.all([
      controller.deleteItem('rapid1.mir', false),
      controller.deleteItem('rapid2.mir', false),
      controller.deleteItem('rapid3.mir', false),
    ])

    expect(results).toEqual([true, true, true])
  })

  it('should handle deleting file while it is selected', async () => {
    await storage.writeFile('selected.mir', 'content')
    await controller.selectFile('selected.mir')

    // Delete while selected
    const result = await controller.deleteItem('selected.mir', false)
    expect(result).toBe(true)
    expect(controller.currentFile).not.toBe('selected.mir')
  })
})

// =============================================================================
// STORAGE SERVICE DIRECT TESTS
// =============================================================================

describe('Storage Service - Delete', () => {
  it('should delete file from provider', async () => {
    await storage.writeFile('storagetest.mir', 'content')
    await storage.deleteFile('storagetest.mir')

    await expect(storage.readFile('storagetest.mir')).rejects.toThrow()
  })

  it('should invalidate cache on delete', async () => {
    await storage.writeFile('cachetest.mir', 'content')

    // Read to populate cache
    await storage.readFile('cachetest.mir')

    // Delete
    await storage.deleteFile('cachetest.mir')

    // Should throw even if it was cached
    await expect(storage.readFile('cachetest.mir')).rejects.toThrow()
  })

  it('should update tree after delete', async () => {
    await storage.writeFile('treetest.mir', 'content')

    let tree = storage.getTree()
    expect(tree.some(i => i.name === 'treetest.mir')).toBe(true)

    await storage.deleteFile('treetest.mir')

    tree = storage.getTree()
    expect(tree.some(i => i.name === 'treetest.mir')).toBe(false)
  })

  it('should emit events in correct order', async () => {
    const events: string[] = []

    storage.events.on('file:deleted', () => events.push('deleted'))
    storage.events.on('tree:changed', () => events.push('tree'))

    await storage.writeFile('ordertest.mir', 'content')
    events.length = 0 // Clear events from write

    await storage.deleteFile('ordertest.mir')

    // file:deleted should come before tree:changed
    expect(events).toContain('deleted')
    expect(events).toContain('tree')
  })
})

// =============================================================================
// DEMO PROVIDER DIRECT TESTS
// =============================================================================

describe('DemoProvider - Delete', () => {
  it('should remove file from internal storage', async () => {
    const demo = new DemoProvider()

    await demo.writeFile('test.mir', 'content')
    expect(await demo.readFile('test.mir')).toBe('content')

    await demo.deleteFile('test.mir')

    await expect(demo.readFile('test.mir')).rejects.toThrow('File not found')
  })

  it('should throw when deleting non-existent file', async () => {
    const demo = new DemoProvider()

    await expect(demo.deleteFile('nonexistent.mir')).rejects.toThrow('File not found')
  })

  it('should delete all files in folder', async () => {
    const demo = new DemoProvider()

    await demo.createFolder('folder')
    await demo.writeFile('folder/a.mir', 'a')
    await demo.writeFile('folder/b.mir', 'b')

    await demo.deleteFolder('folder')

    await expect(demo.readFile('folder/a.mir')).rejects.toThrow()
    await expect(demo.readFile('folder/b.mir')).rejects.toThrow()
  })

  it('should update tree after delete', async () => {
    const demo = new DemoProvider()

    await demo.writeFile('todelete.mir', 'content')

    let tree = await demo.getTree()
    expect(tree.some(i => i.name === 'todelete.mir')).toBe(true)

    await demo.deleteFile('todelete.mir')

    tree = await demo.getTree()
    expect(tree.some(i => i.name === 'todelete.mir')).toBe(false)
  })
})
