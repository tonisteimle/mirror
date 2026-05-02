/**
 * DemoProvider Tests
 *
 * Tests for the in-memory demo storage provider
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DemoProvider } from '../../studio/storage/providers/demo'

// =============================================================================
// TEST SETUP
// =============================================================================

let provider: DemoProvider

beforeEach(() => {
  provider = new DemoProvider()
})

// =============================================================================
// PROVIDER PROPERTIES
// =============================================================================

describe('DemoProvider Properties', () => {
  it('should have type "demo"', () => {
    expect(provider.type).toBe('demo')
  })

  it('should not support projects', () => {
    expect(provider.supportsProjects).toBe(false)
  })

  it('should not support native dialogs', () => {
    expect(provider.supportsNativeDialogs).toBe(false)
  })
})

// =============================================================================
// PROJECT OPERATIONS
// =============================================================================

describe('DemoProvider Project Operations', () => {
  it('should list demo project', async () => {
    const projects = await provider.listProjects()

    expect(projects).toHaveLength(1)
    expect(projects[0].id).toBe('demo')
    expect(projects[0].name).toBe('Demo Project')
  })

  it('should throw on createProject', async () => {
    await expect(provider.createProject('test')).rejects.toThrow(
      'Demo mode does not support creating projects'
    )
  })

  it('should throw on deleteProject', async () => {
    await expect(provider.deleteProject('demo')).rejects.toThrow(
      'Demo mode does not support deleting projects'
    )
  })

  it('should open and close project', async () => {
    await provider.openProject('demo')
    await provider.closeProject()
    // Should not throw
  })
})

// =============================================================================
// FILE TREE
// =============================================================================

describe('DemoProvider File Tree', () => {
  it('should return tree with default files', async () => {
    const tree = await provider.getTree()

    expect(tree.length).toBe(5)

    const fileNames = tree.map(item => item.name)
    expect(fileNames).toContain('index.mir')
    expect(fileNames).toContain('tokens.tok')
    expect(fileNames).toContain('components.com')
    expect(fileNames).toContain('data.yaml')
    expect(fileNames).toContain('data.data')
  })

  it('should sort tree with folders first', async () => {
    // Create a folder and file
    await provider.createFolder('aaa-folder')
    await provider.writeFile('zzz-file.mir', 'content')

    const tree = await provider.getTree()

    // Folders should come before files
    const folderIndex = tree.findIndex(i => i.name === 'aaa-folder')
    const fileIndex = tree.findIndex(i => i.name === 'zzz-file.mir')

    if (folderIndex !== -1 && fileIndex !== -1) {
      expect(folderIndex).toBeLessThan(fileIndex)
    }
  })

  it('should sort items alphabetically within type', async () => {
    await provider.writeFile('charlie.mir', 'c')
    await provider.writeFile('alpha.mir', 'a')
    await provider.writeFile('bravo.mir', 'b')

    const tree = await provider.getTree()
    const files = tree.filter(i => i.type === 'file')
    const names = files.map(f => f.name)

    // Check that files are sorted alphabetically
    const sorted = [...names].sort()
    expect(names).toEqual(sorted)
  })

  it('should handle nested folders in tree', async () => {
    await provider.writeFile('deep/nested/file.mir', 'content')

    const tree = await provider.getTree()
    const deep = tree.find(i => i.name === 'deep')

    expect(deep).toBeDefined()
    expect(deep?.type).toBe('folder')

    if (deep?.type === 'folder') {
      const nested = deep.children.find(i => i.name === 'nested')
      expect(nested).toBeDefined()
      expect(nested?.type).toBe('folder')

      if (nested?.type === 'folder') {
        const file = nested.children.find(i => i.name === 'file.mir')
        expect(file).toBeDefined()
        expect(file?.type).toBe('file')
      }
    }
  })
})

// =============================================================================
// FILE OPERATIONS
// =============================================================================

describe('DemoProvider File Operations', () => {
  describe('readFile', () => {
    it('should read existing file', async () => {
      const content = await provider.readFile('index.mir')

      expect(content).toContain('Frame')
    })

    it('should throw on non-existent file', async () => {
      await expect(provider.readFile('nonexistent.mir')).rejects.toThrow(
        'File not found: nonexistent.mir'
      )
    })
  })

  describe('writeFile', () => {
    it('should write new file', async () => {
      await provider.writeFile('new.mir', 'Frame "New"')
      const content = await provider.readFile('new.mir')

      expect(content).toBe('Frame "New"')
    })

    it('should overwrite existing file', async () => {
      await provider.writeFile('index.mir', 'Updated content')
      const content = await provider.readFile('index.mir')

      expect(content).toBe('Updated content')
    })

    it('should create nested path', async () => {
      await provider.writeFile('deep/path/file.mir', 'content')
      const content = await provider.readFile('deep/path/file.mir')

      expect(content).toBe('content')
    })

    it('should mark provider as modified', async () => {
      expect(provider.hasModifications()).toBe(false)
      await provider.writeFile('test.mir', 'content')
      expect(provider.hasModifications()).toBe(true)
    })
  })

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      await provider.writeFile('temp.mir', 'temp')
      await provider.deleteFile('temp.mir')

      await expect(provider.readFile('temp.mir')).rejects.toThrow()
    })

    it('should throw on non-existent file', async () => {
      await expect(provider.deleteFile('nonexistent.mir')).rejects.toThrow(
        'File not found: nonexistent.mir'
      )
    })
  })

  describe('renameFile', () => {
    it('should rename file', async () => {
      await provider.writeFile('old.mir', 'content')
      await provider.renameFile('old.mir', 'new.mir')

      const content = await provider.readFile('new.mir')
      expect(content).toBe('content')

      await expect(provider.readFile('old.mir')).rejects.toThrow()
    })

    it('should throw if source does not exist', async () => {
      await expect(provider.renameFile('nonexistent.mir', 'new.mir')).rejects.toThrow(
        'File not found: nonexistent.mir'
      )
    })

    it('should throw if target already exists', async () => {
      await provider.writeFile('source.mir', 'source')
      await provider.writeFile('target.mir', 'target')

      await expect(provider.renameFile('source.mir', 'target.mir')).rejects.toThrow(
        'File already exists: target.mir'
      )
    })
  })

  describe('copyFile', () => {
    it('should copy file', async () => {
      await provider.writeFile('original.mir', 'content')
      await provider.copyFile('original.mir', 'copy.mir')

      const original = await provider.readFile('original.mir')
      const copy = await provider.readFile('copy.mir')

      expect(original).toBe('content')
      expect(copy).toBe('content')
    })

    it('should throw if source does not exist', async () => {
      await expect(provider.copyFile('nonexistent.mir', 'copy.mir')).rejects.toThrow(
        'File not found: nonexistent.mir'
      )
    })

    it('should throw if target already exists', async () => {
      await provider.writeFile('source.mir', 'source')
      await provider.writeFile('target.mir', 'target')

      await expect(provider.copyFile('source.mir', 'target.mir')).rejects.toThrow(
        'File already exists: target.mir'
      )
    })
  })
})

// =============================================================================
// FOLDER OPERATIONS
// =============================================================================

describe('DemoProvider Folder Operations', () => {
  describe('createFolder', () => {
    it('should create folder', async () => {
      await provider.createFolder('components')

      const tree = await provider.getTree()
      const folder = tree.find(i => i.name === 'components')

      expect(folder).toBeDefined()
      expect(folder?.type).toBe('folder')
    })

    it('should create nested folders', async () => {
      await provider.createFolder('deep/nested/folder')

      const tree = await provider.getTree()
      const deep = tree.find(i => i.name === 'deep')

      expect(deep?.type).toBe('folder')
    })
  })

  describe('deleteFolder', () => {
    it('should delete folder and contents', async () => {
      await provider.createFolder('todelete')
      await provider.writeFile('todelete/file1.mir', 'content1')
      await provider.writeFile('todelete/file2.mir', 'content2')

      await provider.deleteFolder('todelete')

      const tree = await provider.getTree()
      const folder = tree.find(i => i.name === 'todelete')

      expect(folder).toBeUndefined()
      await expect(provider.readFile('todelete/file1.mir')).rejects.toThrow()
    })

    it('should delete nested contents', async () => {
      await provider.writeFile('parent/child/file.mir', 'content')
      await provider.deleteFolder('parent')

      await expect(provider.readFile('parent/child/file.mir')).rejects.toThrow()
    })
  })

  describe('renameFolder', () => {
    it('should rename folder and update file paths', async () => {
      await provider.createFolder('old-folder')
      await provider.writeFile('old-folder/file.mir', 'content')

      await provider.renameFolder('old-folder', 'new-folder')

      const content = await provider.readFile('new-folder/file.mir')
      expect(content).toBe('content')

      await expect(provider.readFile('old-folder/file.mir')).rejects.toThrow()
    })

    it('should rename nested contents', async () => {
      await provider.writeFile('parent/child/deep.mir', 'deep')
      await provider.renameFolder('parent', 'renamed')

      const content = await provider.readFile('renamed/child/deep.mir')
      expect(content).toBe('deep')
    })
  })

  describe('moveItem', () => {
    it('should move file to folder', async () => {
      await provider.writeFile('file.mir', 'content')
      await provider.createFolder('target')

      await provider.moveItem('file.mir', 'target')

      const content = await provider.readFile('target/file.mir')
      expect(content).toBe('content')

      await expect(provider.readFile('file.mir')).rejects.toThrow()
    })

    it('should move folder to another folder', async () => {
      await provider.createFolder('source')
      await provider.writeFile('source/file.mir', 'content')
      await provider.createFolder('target')

      await provider.moveItem('source', 'target')

      const content = await provider.readFile('target/source/file.mir')
      expect(content).toBe('content')
    })

    it('should move to root with empty target', async () => {
      await provider.createFolder('folder')
      await provider.writeFile('folder/file.mir', 'content')

      await provider.moveItem('folder/file.mir', '')

      const content = await provider.readFile('file.mir')
      expect(content).toBe('content')
    })
  })
})

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

describe('DemoProvider State', () => {
  it('should track modifications', async () => {
    expect(provider.hasModifications()).toBe(false)

    await provider.writeFile('test.mir', 'content')
    expect(provider.hasModifications()).toBe(true)
  })

  it('should reset to defaults', async () => {
    await provider.writeFile('custom.mir', 'custom')
    await provider.deleteFile('index.mir')

    provider.resetToDefaults()

    // Custom file should be gone
    await expect(provider.readFile('custom.mir')).rejects.toThrow()

    // Default file should be back
    const content = await provider.readFile('index.mir')
    expect(content).toContain('Frame')

    // Modifications flag should be reset
    expect(provider.hasModifications()).toBe(false)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('DemoProvider Edge Cases', () => {
  it('should handle empty file content', async () => {
    await provider.writeFile('empty.mir', '')
    const content = await provider.readFile('empty.mir')
    expect(content).toBe('')
  })

  it('should handle file with special characters in content', async () => {
    const specialContent = 'Frame "Hello\n\tWorld" // Comment'
    await provider.writeFile('special.mir', specialContent)
    const content = await provider.readFile('special.mir')
    expect(content).toBe(specialContent)
  })

  it('should handle unicode content', async () => {
    const unicodeContent = 'Text "Hello 🌍 Wörld"'
    await provider.writeFile('unicode.mir', unicodeContent)
    const content = await provider.readFile('unicode.mir')
    expect(content).toBe(unicodeContent)
  })

  it('should handle rapid sequential operations', async () => {
    // Rapid writes
    await Promise.all([
      provider.writeFile('rapid1.mir', 'one'),
      provider.writeFile('rapid2.mir', 'two'),
      provider.writeFile('rapid3.mir', 'three'),
    ])

    const [c1, c2, c3] = await Promise.all([
      provider.readFile('rapid1.mir'),
      provider.readFile('rapid2.mir'),
      provider.readFile('rapid3.mir'),
    ])

    expect(c1).toBe('one')
    expect(c2).toBe('two')
    expect(c3).toBe('three')
  })
})
