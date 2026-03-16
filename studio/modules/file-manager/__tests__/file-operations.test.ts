/**
 * File Operations Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createFileStore } from '../file-store'
import { createFileOperations, type FileOperations } from '../file-operations'
import type { Store } from '../file-store'
import type { FileStore } from '../types'

describe('FileOperations', () => {
  let store: Store<FileStore>
  let ops: FileOperations

  beforeEach(() => {
    store = createFileStore()
    ops = createFileOperations(store)
  })

  describe('createFile', () => {
    it('should create a new file', () => {
      ops.createFile('test.mirror', 'layout', 'Box w 100')

      expect(ops.getAllFiles()).toContain('test.mirror')
      expect(ops.getContent('test.mirror')).toBe('Box w 100')
      expect(ops.getFileType('test.mirror')).toBe('layout')
    })

    it('should infer type from filename', () => {
      ops.createFile('tokens.mirror')
      expect(ops.getFileType('tokens.mirror')).toBe('tokens')

      ops.createFile('button.comp.mirror')
      expect(ops.getFileType('button.comp.mirror')).toBe('component')

      ops.createFile('main.mirror')
      expect(ops.getFileType('main.mirror')).toBe('layout')
    })

    it('should throw on duplicate filename', () => {
      ops.createFile('test.mirror')

      expect(() => ops.createFile('test.mirror')).toThrow('File already exists')
    })

    it('should initialize metadata', () => {
      ops.createFile('test.mirror', 'layout', 'content')

      const metadata = ops.getFileMetadata('test.mirror')
      expect(metadata).not.toBeNull()
      expect(metadata?.name).toBe('test.mirror')
      expect(metadata?.type).toBe('layout')
      expect(metadata?.size).toBe(7) // 'content'.length
      expect(metadata?.created).toBeInstanceOf(Date)
    })

    it('should mark file as not dirty', () => {
      ops.createFile('test.mirror')
      expect(ops.hasUnsavedChanges('test.mirror')).toBe(false)
    })
  })

  describe('deleteFile', () => {
    it('should delete an existing file', () => {
      ops.createFile('test.mirror')
      ops.deleteFile('test.mirror')

      expect(ops.getAllFiles()).not.toContain('test.mirror')
      expect(ops.getContent('test.mirror')).toBeNull()
    })

    it('should throw on non-existent file', () => {
      expect(() => ops.deleteFile('nonexistent.mirror')).toThrow('File not found')
    })

    it('should clear currentFile if deleted', () => {
      ops.createFile('test.mirror')
      store.set({ currentFile: 'test.mirror' })

      ops.deleteFile('test.mirror')

      expect(store.get().currentFile).toBeNull()
    })

    it('should select another file when current is deleted', () => {
      ops.createFile('a.mirror')
      ops.createFile('b.mirror')
      store.set({ currentFile: 'a.mirror' })

      ops.deleteFile('a.mirror')

      expect(store.get().currentFile).toBe('b.mirror')
    })
  })

  describe('renameFile', () => {
    it('should rename an existing file', () => {
      ops.createFile('old.mirror', 'layout', 'content')
      ops.renameFile('old.mirror', 'new.mirror')

      expect(ops.getAllFiles()).not.toContain('old.mirror')
      expect(ops.getAllFiles()).toContain('new.mirror')
      expect(ops.getContent('new.mirror')).toBe('content')
    })

    it('should throw on non-existent file', () => {
      expect(() => ops.renameFile('nonexistent.mirror', 'new.mirror')).toThrow('File not found')
    })

    it('should throw if new name exists', () => {
      ops.createFile('a.mirror')
      ops.createFile('b.mirror')

      expect(() => ops.renameFile('a.mirror', 'b.mirror')).toThrow('File already exists')
    })

    it('should update currentFile if renamed', () => {
      ops.createFile('old.mirror')
      store.set({ currentFile: 'old.mirror' })

      ops.renameFile('old.mirror', 'new.mirror')

      expect(store.get().currentFile).toBe('new.mirror')
    })

    it('should mark renamed file as dirty', () => {
      ops.createFile('old.mirror')
      ops.renameFile('old.mirror', 'new.mirror')

      expect(ops.hasUnsavedChanges('new.mirror')).toBe(true)
    })
  })

  describe('duplicateFile', () => {
    it('should duplicate a file', () => {
      ops.createFile('original.mirror', 'layout', 'content')
      ops.duplicateFile('original.mirror', 'copy.mirror')

      expect(ops.getAllFiles()).toContain('original.mirror')
      expect(ops.getAllFiles()).toContain('copy.mirror')
      expect(ops.getContent('copy.mirror')).toBe('content')
    })

    it('should throw on non-existent file', () => {
      expect(() => ops.duplicateFile('nonexistent.mirror', 'copy.mirror')).toThrow('File not found')
    })
  })

  describe('setContent', () => {
    it('should update file content', () => {
      ops.createFile('test.mirror', 'layout', 'original')
      ops.setContent('test.mirror', 'updated')

      expect(ops.getContent('test.mirror')).toBe('updated')
    })

    it('should throw on non-existent file', () => {
      expect(() => ops.setContent('nonexistent.mirror', 'content')).toThrow('File not found')
    })

    it('should mark file as dirty', () => {
      ops.createFile('test.mirror')
      ops.setContent('test.mirror', 'updated')

      expect(ops.hasUnsavedChanges('test.mirror')).toBe(true)
    })

    it('should update metadata size and modified date', () => {
      ops.createFile('test.mirror', 'layout', 'short')
      const originalModified = ops.getFileMetadata('test.mirror')?.modified

      // Wait a bit to ensure different timestamp
      const before = Date.now()
      ops.setContent('test.mirror', 'much longer content')

      const metadata = ops.getFileMetadata('test.mirror')
      expect(metadata?.size).toBe('much longer content'.length)
      expect(metadata?.modified.getTime()).toBeGreaterThanOrEqual(before)
    })
  })

  describe('getFilesByType', () => {
    it('should filter files by type', () => {
      ops.createFile('tokens.mirror', 'tokens')
      ops.createFile('button.mirror', 'component')
      ops.createFile('main.mirror', 'layout')
      ops.createFile('other.mirror', 'layout')

      expect(ops.getFilesByType('tokens')).toEqual(['tokens.mirror'])
      expect(ops.getFilesByType('component')).toEqual(['button.mirror'])
      expect(ops.getFilesByType('layout').sort()).toEqual(['main.mirror', 'other.mirror'].sort())
    })
  })

  describe('hasUnsavedChanges', () => {
    it('should check specific file', () => {
      ops.createFile('clean.mirror')
      ops.createFile('dirty.mirror')
      ops.setContent('dirty.mirror', 'changed')

      expect(ops.hasUnsavedChanges('clean.mirror')).toBe(false)
      expect(ops.hasUnsavedChanges('dirty.mirror')).toBe(true)
    })

    it('should check any file when no name provided', () => {
      ops.createFile('a.mirror')
      ops.createFile('b.mirror')

      expect(ops.hasUnsavedChanges()).toBe(false)

      ops.setContent('a.mirror', 'changed')

      expect(ops.hasUnsavedChanges()).toBe(true)
    })
  })

  describe('markSaved/markDirty', () => {
    it('should mark file as saved', () => {
      ops.createFile('test.mirror')
      ops.setContent('test.mirror', 'changed')
      expect(ops.hasUnsavedChanges('test.mirror')).toBe(true)

      ops.markSaved('test.mirror')
      expect(ops.hasUnsavedChanges('test.mirror')).toBe(false)
    })

    it('should mark file as dirty', () => {
      ops.createFile('test.mirror')
      expect(ops.hasUnsavedChanges('test.mirror')).toBe(false)

      ops.markDirty('test.mirror')
      expect(ops.hasUnsavedChanges('test.mirror')).toBe(true)
    })
  })
})
