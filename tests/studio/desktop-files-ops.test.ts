// @vitest-environment jsdom
/**
 * Tests for studio/desktop-files.ts (operation orchestrators).
 *
 * desktop-files.ts is heavily DOM-coupled — UI rendering, context menus,
 * modal dialogs. The PURE-LOGIC orchestrators (createFile, renameItem,
 * duplicateFile, deleteItem, moveItem) were previously untested. They
 * contain real path-construction + validation logic that's worth pinning.
 *
 * Strategy: mock the storage + dialog modules, verify the orchestrators
 * call the right storage operations with the right paths.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Hoisted mock — must be declared before imports
vi.mock('../../studio/storage', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    storage: {
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(''),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      deleteFolder: vi.fn().mockResolvedValue(undefined),
      renameFile: vi.fn().mockResolvedValue(undefined),
      copyFile: vi.fn().mockResolvedValue(undefined),
      moveItem: vi.fn().mockResolvedValue(undefined),
      getTree: vi.fn().mockReturnValue([]),
      events: { on: vi.fn(() => () => {}), off: vi.fn() },
    },
  }
})

vi.mock('../../studio/dialog', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(true),
  confirmDelete: vi.fn().mockResolvedValue(true),
}))

import {
  createFile,
  renameItem,
  deleteItem,
  moveItem,
  duplicateFile,
} from '../../studio/desktop-files'
import { storage } from '../../studio/storage'
import { alert, confirmDelete } from '../../studio/dialog'

const writeFile = storage.writeFile as unknown as ReturnType<typeof vi.fn>
const renameFile = storage.renameFile as unknown as ReturnType<typeof vi.fn>
const deleteFile = storage.deleteFile as unknown as ReturnType<typeof vi.fn>
const deleteFolder = storage.deleteFolder as unknown as ReturnType<typeof vi.fn>
const copyFile = (storage as unknown as { copyFile: ReturnType<typeof vi.fn> }).copyFile
const moveItemMock = storage.moveItem as unknown as ReturnType<typeof vi.fn>
const getTree = storage.getTree as unknown as ReturnType<typeof vi.fn>
const alertMock = alert as unknown as ReturnType<typeof vi.fn>
const confirmDeleteMock = confirmDelete as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  confirmDeleteMock.mockResolvedValue(true)
  getTree.mockReturnValue([])
})

describe('createFile — path construction', () => {
  it('writes the file at the bare filename when parentFolder is null', async () => {
    await createFile('foo.mir', null)
    expect(writeFile).toHaveBeenCalledOnce()
    expect(writeFile.mock.calls[0][0]).toBe('foo.mir')
  })

  it('prepends a real parent folder to the target path', async () => {
    await createFile('button.mir', 'components')
    expect(writeFile.mock.calls[0][0]).toBe('components/button.mir')
  })

  it('treats "." parent as root (no prepending)', async () => {
    // Locks in: '.' is the root sentinel — the code skips prepending.
    await createFile('top.mir', '.')
    expect(writeFile.mock.calls[0][0]).toBe('top.mir')
  })

  it('treats "demo" parent as root (legacy demo project sentinel)', async () => {
    await createFile('top.mir', 'demo')
    expect(writeFile.mock.calls[0][0]).toBe('top.mir')
  })

  it('auto-appends .mir when filename has no supported extension', async () => {
    await createFile('button', 'components')
    expect(writeFile.mock.calls[0][0]).toBe('components/button.mir')
  })

  it('does NOT auto-append .mir when filename already has a supported extension', async () => {
    await createFile('theme.tok', null)
    expect(writeFile.mock.calls[0][0]).toBe('theme.tok')
  })

  it('accepts all six supported extensions verbatim', async () => {
    const extensions = ['.mir', '.tok', '.com', '.mirror', '.tokens', '.components']
    for (const ext of extensions) {
      writeFile.mockClear()
      await createFile(`name${ext}`, null)
      expect(writeFile.mock.calls[0][0]).toBe(`name${ext}`)
    }
  })

  it('writes default content (line comment + Box stub) when creating a file', async () => {
    await createFile('foo.mir', null)
    const content = writeFile.mock.calls[0][1]
    expect(content).toContain('// foo.mir')
    expect(content).toContain('Box')
  })

  it('aborts with alert when filename validation fails', async () => {
    // Validate fails for filenames with slashes or special chars.
    await createFile('bad/name.mir', null)
    expect(alertMock).toHaveBeenCalledOnce()
    expect(writeFile).not.toHaveBeenCalled()
  })
})

describe('renameItem — dir extraction', () => {
  it('keeps the directory prefix and replaces only the basename', async () => {
    await renameItem('components/button.mir', 'card.mir')
    expect(renameFile).toHaveBeenCalledWith('components/button.mir', 'components/card.mir')
  })

  it('drops the dir prefix when the file is at root', async () => {
    await renameItem('app.mir', 'main.mir')
    expect(renameFile).toHaveBeenCalledWith('app.mir', 'main.mir')
  })

  it('handles deeply-nested paths', async () => {
    await renameItem('a/b/c/file.mir', 'renamed.mir')
    expect(renameFile).toHaveBeenCalledWith('a/b/c/file.mir', 'a/b/c/renamed.mir')
  })

  it('does not throw when storage.renameFile fails (logs and recovers)', async () => {
    renameFile.mockRejectedValueOnce(new Error('disk full'))
    await expect(renameItem('a.mir', 'b.mir')).resolves.toBeUndefined()
  })
})

describe('deleteItem — file vs folder branch', () => {
  it('routes to storage.deleteFile when isFolder=false (default)', async () => {
    await deleteItem('app.mir')
    expect(deleteFile).toHaveBeenCalledWith('app.mir')
    expect(deleteFolder).not.toHaveBeenCalled()
  })

  it('routes to storage.deleteFolder when isFolder=true', async () => {
    await deleteItem('components', true)
    expect(deleteFolder).toHaveBeenCalledWith('components')
    expect(deleteFile).not.toHaveBeenCalled()
  })

  it('aborts when user cancels the confirm dialog', async () => {
    confirmDeleteMock.mockResolvedValueOnce(false)
    await deleteItem('app.mir')
    expect(deleteFile).not.toHaveBeenCalled()
    expect(deleteFolder).not.toHaveBeenCalled()
  })

  it('shows a folder-specific confirm message for folders', async () => {
    await deleteItem('components', true)
    const callArgs = confirmDeleteMock.mock.calls[0]
    // 1st arg is the name, 2nd is options { message }
    expect(callArgs[0]).toBe('components')
    expect(callArgs[1].message).toMatch(/Inhalte/)
  })

  it('passes only the basename (not full path) as the dialog name', async () => {
    await deleteItem('a/b/c/file.mir')
    expect(confirmDeleteMock.mock.calls[0][0]).toBe('file.mir')
  })

  it('does not throw when storage.deleteFile fails', async () => {
    deleteFile.mockRejectedValueOnce(new Error('locked'))
    await expect(deleteItem('a.mir')).resolves.toBeUndefined()
  })
})

describe('moveItem — guards', () => {
  it('builds new path as targetFolder/basename and calls storage.moveItem', async () => {
    await moveItem('a/b/file.mir', 'c')
    expect(moveItemMock).toHaveBeenCalledWith('a/b/file.mir', 'c')
  })

  it('is a no-op when source and computed-new-path are identical', async () => {
    // 'foo/bar.mir' moved to 'foo' → newPath='foo/bar.mir' = source.
    await moveItem('foo/bar.mir', 'foo')
    expect(moveItemMock).not.toHaveBeenCalled()
  })

  it('refuses to move a folder into itself (newPath starts with sourcePath + /)', async () => {
    // 'a' moved to 'a/sub' → newPath='a/sub/a' starts with 'a/' → refuse.
    await moveItem('a', 'a/sub')
    expect(moveItemMock).not.toHaveBeenCalled()
  })

  it('does not throw when storage.moveItem fails', async () => {
    moveItemMock.mockRejectedValueOnce(new Error('conflict'))
    await expect(moveItem('a.mir', 'newdir')).resolves.toBeUndefined()
  })
})

describe('duplicateFile — unique name search', () => {
  it('appends "-copy" to the basename for the first duplicate', async () => {
    getTree.mockReturnValue([{ type: 'file', name: 'app.mir', path: 'app.mir' }])
    await duplicateFile('app.mir')
    expect(copyFile).toHaveBeenCalled()
    const [src, newPath] = copyFile.mock.calls[0]
    expect(src).toBe('app.mir')
    expect(newPath).toMatch(/app-copy/)
    expect(newPath.endsWith('.mir')).toBe(true)
  })

  it('finds an unused suffix when "-copy" already exists', async () => {
    // app.mir + app-copy.mir both exist → next try should be app-copy-1.mir or similar.
    getTree.mockReturnValue([
      { type: 'file', name: 'app.mir', path: 'app.mir' },
      { type: 'file', name: 'app-copy.mir', path: 'app-copy.mir' },
    ])
    await duplicateFile('app.mir')
    const newPath = copyFile.mock.calls[0][1]
    expect(['app.mir', 'app-copy.mir']).not.toContain(newPath)
  })

  it('preserves the directory of the source file', async () => {
    getTree.mockReturnValue([
      {
        type: 'folder',
        name: 'components',
        path: 'components',
        children: [{ type: 'file', name: 'button.mir', path: 'components/button.mir' }],
      },
    ])
    await duplicateFile('components/button.mir')
    const newPath = copyFile.mock.calls[0][1]
    expect(newPath.startsWith('components/')).toBe(true)
  })
})
