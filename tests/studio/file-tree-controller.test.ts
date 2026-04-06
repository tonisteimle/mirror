/**
 * File Tree Controller Tests
 *
 * Tests for FileTreeController - state management without DOM.
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
// INITIALIZATION
// =============================================================================

describe('FileTreeController Initialization', () => {
  it('should start with no current file', () => {
    expect(controller.currentFile).toBeNull()
  })

  it('should start with no expanded folders', () => {
    expect(controller.expandedFolders.size).toBe(0)
  })

  it('should start with empty files cache', () => {
    expect(Object.keys(controller.filesCache).length).toBe(0)
  })

  it('should get tree from storage', () => {
    const tree = controller.getTree()
    expect(Array.isArray(tree)).toBe(true)
    expect(tree.length).toBeGreaterThan(0)
  })

  it('should report project name', () => {
    // DemoProvider doesn't have a project name by default
    expect(controller.getProjectName()).toBeNull()
  })
})

// =============================================================================
// FILE SELECTION
// =============================================================================

describe('FileTreeController File Selection', () => {
  it('should select a file', async () => {
    await controller.selectFile('index.mir')
    expect(controller.currentFile).toBe('index.mir')
  })

  it('should cache file content on selection', async () => {
    await controller.selectFile('index.mir')
    expect(controller.filesCache['index.mir']).toBeDefined()
    expect(controller.filesCache['index.mir']).toContain('Mirror')
  })

  it('should call onFileSelect callback', async () => {
    const onFileSelect = vi.fn()
    controller.init({ onFileSelect })

    await controller.selectFile('index.mir')

    expect(onFileSelect).toHaveBeenCalledWith('index.mir', expect.any(String))
  })

  it('should call onTreeChange callback', async () => {
    const onTreeChange = vi.fn()
    controller.init({ onTreeChange })

    await controller.selectFile('index.mir')

    expect(onTreeChange).toHaveBeenCalled()
  })

  it('should call onError for non-existent file', async () => {
    const onError = vi.fn()
    controller.init({ onError })

    await controller.selectFile('nonexistent.mir')

    expect(onError).toHaveBeenCalled()
    // Error originates from selectFile operation
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})

// =============================================================================
// FILE OPERATIONS
// =============================================================================

describe('FileTreeController File Operations', () => {
  describe('saveFile', () => {
    it('should update cache immediately', async () => {
      await controller.saveFile('test.mir', 'new content')
      expect(controller.filesCache['test.mir']).toBe('new content')
    })

    it('should persist to storage', async () => {
      await controller.saveFile('test.mir', 'saved content')
      const content = await storage.readFile('test.mir')
      expect(content).toBe('saved content')
    })
  })

  describe('createFile', () => {
    it('should create file with default content', async () => {
      const result = await controller.createFile('newfile.mir')
      expect(result).toBe(true)

      const content = await storage.readFile('newfile.mir')
      expect(content).toContain('// newfile.mir')
    })

    it('should auto-select created file', async () => {
      await controller.createFile('newfile.mir')
      expect(controller.currentFile).toBe('newfile.mir')
    })

    it('should create in parent folder', async () => {
      await storage.createFolder('subfolder')
      const result = await controller.createFile('file.mir', 'subfolder')
      expect(result).toBe(true)

      const content = await storage.readFile('subfolder/file.mir')
      expect(content).toBeDefined()
    })

    it('should add .mir extension if missing', async () => {
      await controller.createFile('noext')
      expect(controller.currentFile).toBe('noext.mir')
    })

    it('should reject invalid filenames', async () => {
      const onError = vi.fn()
      controller.init({ onError })

      const result = await controller.createFile('')
      expect(result).toBe(false)
      expect(onError).toHaveBeenCalled()
    })

    it('should reject filenames with special characters', async () => {
      const onError = vi.fn()
      controller.init({ onError })

      const result = await controller.createFile('file name.mir')
      expect(result).toBe(false)
    })
  })

  describe('createFolder', () => {
    it('should create folder', async () => {
      const result = await controller.createFolder('newfolder')
      expect(result).toBe(true)

      const tree = storage.getTree()
      const folder = tree.find(i => i.name === 'newfolder')
      expect(folder).toBeDefined()
    })

    it('should create nested folder', async () => {
      await storage.createFolder('parent')
      const result = await controller.createFolder('child', 'parent')
      expect(result).toBe(true)
    })

    it('should reject invalid folder names', async () => {
      const result = await controller.createFolder('.hidden')
      expect(result).toBe(false)
    })
  })

  describe('renameItem', () => {
    it('should rename file', async () => {
      await storage.writeFile('old.mir', 'content')
      const result = await controller.renameItem('old.mir', 'new.mir')
      expect(result).toBe(true)

      await expect(storage.readFile('old.mir')).rejects.toThrow()
      const content = await storage.readFile('new.mir')
      expect(content).toBe('content')
    })

    it('should update currentFile on rename', async () => {
      await controller.selectFile('index.mir')
      await controller.renameItem('index.mir', 'main.mir')
      expect(controller.currentFile).toBe('main.mir')
    })

    it('should reject invalid names', async () => {
      const result = await controller.renameItem('index.mir', 'bad name.mir')
      expect(result).toBe(false)
    })
  })

  describe('duplicateFile', () => {
    it('should create copy of file', async () => {
      await storage.writeFile('original.mir', 'content')
      const result = await controller.duplicateFile('original.mir')
      expect(result).toBe(true)

      const copy = await storage.readFile('original-copy.mir')
      expect(copy).toBe('content')
    })

    it('should increment copy number if exists', async () => {
      await storage.writeFile('file.mir', 'content')
      await storage.writeFile('file-copy.mir', 'copy1')

      await controller.duplicateFile('file.mir')

      const copy = await storage.readFile('file-copy-1.mir')
      expect(copy).toBe('content')
    })
  })

  describe('deleteItem', () => {
    it('should delete file', async () => {
      await storage.writeFile('todelete.mir', 'content')
      const result = await controller.deleteItem('todelete.mir', false)
      expect(result).toBe(true)

      await expect(storage.readFile('todelete.mir')).rejects.toThrow()
    })

    it('should delete folder', async () => {
      await storage.createFolder('todelete')
      await storage.writeFile('todelete/file.mir', 'content')

      const result = await controller.deleteItem('todelete', true)
      expect(result).toBe(true)

      await expect(storage.readFile('todelete/file.mir')).rejects.toThrow()
    })

    it('should clear currentFile if deleted', async () => {
      await controller.selectFile('index.mir')
      expect(controller.currentFile).toBe('index.mir')

      await controller.deleteItem('index.mir', false)
      // Should auto-select another file
      expect(controller.currentFile).not.toBe('index.mir')
    })

    it('should remove from cache', async () => {
      await controller.selectFile('index.mir')
      expect(controller.filesCache['index.mir']).toBeDefined()

      await controller.deleteItem('index.mir', false)
      expect(controller.filesCache['index.mir']).toBeUndefined()
    })
  })

  describe('moveItem', () => {
    it('should move file to folder', async () => {
      await storage.writeFile('tomove.mir', 'content')
      await storage.createFolder('target')

      const result = await controller.moveItem('tomove.mir', 'target')
      expect(result).toBe(true)

      const content = await storage.readFile('target/tomove.mir')
      expect(content).toBe('content')
    })

    it('should prevent moving folder into itself', async () => {
      await storage.createFolder('parent')
      await storage.createFolder('parent/child')

      const onError = vi.fn()
      controller.init({ onError })

      const result = await controller.moveItem('parent', 'parent/child')
      expect(result).toBe(false)
      expect(onError).toHaveBeenCalled()
    })

    it('should do nothing if same path', async () => {
      await storage.writeFile('file.mir', 'content')
      const result = await controller.moveItem('file.mir', '')
      expect(result).toBe(false)
    })
  })
})

// =============================================================================
// FOLDER EXPANSION
// =============================================================================

describe('FileTreeController Folder Expansion', () => {
  it('should toggle folder expansion', () => {
    expect(controller.isFolderExpanded('components')).toBe(false)

    controller.toggleFolder('components')
    expect(controller.isFolderExpanded('components')).toBe(true)

    controller.toggleFolder('components')
    expect(controller.isFolderExpanded('components')).toBe(false)
  })

  it('should expand folder', () => {
    controller.expandFolder('components')
    expect(controller.isFolderExpanded('components')).toBe(true)
  })

  it('should collapse folder', () => {
    controller.expandFolder('components')
    controller.collapseFolder('components')
    expect(controller.isFolderExpanded('components')).toBe(false)
  })

  it('should call onTreeChange on toggle', () => {
    const onTreeChange = vi.fn()
    controller.init({ onTreeChange })

    controller.toggleFolder('components')

    expect(onTreeChange).toHaveBeenCalled()
  })
})

// =============================================================================
// FILE CACHE
// =============================================================================

describe('FileTreeController File Cache', () => {
  it('should get file content from cache', async () => {
    await controller.selectFile('index.mir')
    const content = controller.getFileContent('index.mir')
    expect(content).toBeDefined()
    expect(content).toContain('Mirror')
  })

  it('should update file cache', () => {
    controller.updateFileCache('test.mir', 'cached content')
    expect(controller.getFileContent('test.mir')).toBe('cached content')
  })

  it('should preload all files', async () => {
    await controller.preloadAllFiles()

    expect(controller.getFileContent('index.mir')).toBeDefined()
    expect(controller.getFileContent('tokens.tok')).toBeDefined()
    expect(controller.getFileContent('components.com')).toBeDefined()
  })
})

// =============================================================================
// CONTEXT MENU
// =============================================================================

describe('FileTreeController Context Menu', () => {
  it('should return file actions', () => {
    const actions = controller.getContextMenuActions({
      path: 'index.mir',
      isFile: true,
      isFolder: false,
      isRoot: false
    })

    expect(actions).toContain('rename')
    expect(actions).toContain('duplicate')
    expect(actions).toContain('delete')
    expect(actions).not.toContain('new-file')
  })

  it('should return folder actions', () => {
    const actions = controller.getContextMenuActions({
      path: 'components',
      isFile: false,
      isFolder: true,
      isRoot: false
    })

    expect(actions).toContain('new-file')
    expect(actions).toContain('new-folder')
    expect(actions).toContain('rename')
    expect(actions).toContain('delete')
  })

  it('should return limited root actions', () => {
    const actions = controller.getContextMenuActions({
      path: '.',
      isFile: false,
      isFolder: true,
      isRoot: true
    })

    expect(actions).toContain('new-file')
    expect(actions).toContain('new-folder')
    expect(actions).not.toContain('rename')
    expect(actions).not.toContain('delete')
  })

  it('should return empty area actions', () => {
    const actions = controller.getContextMenuActions({
      path: null,
      isFile: false,
      isFolder: false,
      isRoot: false
    })

    expect(actions).toContain('new-file')
    expect(actions).toContain('new-folder')
  })
})

// =============================================================================
// EVENT HANDLING
// =============================================================================

describe('FileTreeController Event Handling', () => {
  it('should handle file:changed event', async () => {
    const onFileChange = vi.fn()
    controller.init({ onFileChange })

    // Trigger file change via storage
    await storage.writeFile('index.mir', 'updated content')

    expect(onFileChange).toHaveBeenCalledWith('index.mir', 'updated content')
    expect(controller.filesCache['index.mir']).toBe('updated content')
  })

  it('should handle file:deleted event', async () => {
    const onTreeChange = vi.fn()
    controller.init({ onTreeChange })

    await controller.selectFile('index.mir')
    await storage.deleteFile('index.mir')

    expect(controller.filesCache['index.mir']).toBeUndefined()
    expect(onTreeChange).toHaveBeenCalled()
  })

  it('should handle file:renamed event', async () => {
    await controller.selectFile('index.mir')
    const originalContent = controller.filesCache['index.mir']

    await storage.renameFile('index.mir', 'main.mir')

    expect(controller.currentFile).toBe('main.mir')
    expect(controller.filesCache['main.mir']).toBe(originalContent)
    expect(controller.filesCache['index.mir']).toBeUndefined()
  })

  it('should reset state on project close', () => {
    controller.updateFileCache('test.mir', 'content')
    controller.expandFolder('components')

    storage.events.emit('project:closed', {})

    expect(controller.currentFile).toBeNull()
    expect(controller.expandedFolders.size).toBe(0)
    expect(Object.keys(controller.filesCache).length).toBe(0)
  })
})

// =============================================================================
// RESET
// =============================================================================

describe('FileTreeController Reset', () => {
  it('should reset all state', async () => {
    await controller.selectFile('index.mir')
    controller.expandFolder('components')

    controller.resetState()

    expect(controller.currentFile).toBeNull()
    expect(controller.expandedFolders.size).toBe(0)
    expect(Object.keys(controller.filesCache).length).toBe(0)
  })
})
