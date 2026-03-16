/**
 * File Operations - CRUD operations for files
 */

import type { Store } from './file-store'
import type { FileStore, FileType, FileMetadata } from './types'
import { createMetadata, updateMetadata, getFileType as inferFileType } from './file-store'

export interface FileOperations {
  createFile(name: string, type?: FileType, content?: string): void
  deleteFile(name: string): void
  renameFile(oldName: string, newName: string): void
  duplicateFile(name: string, newName: string): void
  getContent(name: string): string | null
  setContent(name: string, content: string): void
  getFileType(name: string): FileType | null
  getFileMetadata(name: string): FileMetadata | null
  getAllFiles(): string[]
  getFilesByType(type: FileType): string[]
  hasUnsavedChanges(name?: string): boolean
  markSaved(name: string): void
  markDirty(name: string): void
}

export function createFileOperations(store: Store<FileStore>): FileOperations {
  return {
    createFile(name: string, type?: FileType, content: string = '') {
      const state = store.get()

      if (state.files[name] !== undefined) {
        throw new Error(`File already exists: ${name}`)
      }

      const fileType = type || inferFileType(name)
      const metadata = createMetadata(name, fileType, content)

      store.set({
        files: { ...state.files, [name]: content },
        metadata: { ...state.metadata, [name]: metadata },
        isDirty: { ...state.isDirty, [name]: false },
      })
    },

    deleteFile(name: string) {
      const state = store.get()

      if (state.files[name] === undefined) {
        throw new Error(`File not found: ${name}`)
      }

      const { [name]: _, ...files } = state.files
      const { [name]: __, ...metadata } = state.metadata
      const { [name]: ___, ...isDirty } = state.isDirty

      const updates: Partial<FileStore> = { files, metadata, isDirty }

      // Clear currentFile if deleted
      if (state.currentFile === name) {
        const remaining = Object.keys(files)
        updates.currentFile = remaining.length > 0 ? remaining[0] : null
      }

      store.set(updates)
    },

    renameFile(oldName: string, newName: string) {
      const state = store.get()

      if (state.files[oldName] === undefined) {
        throw new Error(`File not found: ${oldName}`)
      }

      if (state.files[newName] !== undefined) {
        throw new Error(`File already exists: ${newName}`)
      }

      const content = state.files[oldName]
      const oldMetadata = state.metadata[oldName]

      // Create new entries
      const { [oldName]: _, ...files } = state.files
      const { [oldName]: __, ...metadata } = state.metadata
      const { [oldName]: ___, ...isDirty } = state.isDirty

      const newMetadata: FileMetadata = {
        ...oldMetadata,
        name: newName,
        modified: new Date(),
      }

      store.set({
        files: { ...files, [newName]: content },
        metadata: { ...metadata, [newName]: newMetadata },
        isDirty: { ...isDirty, [newName]: true },
        currentFile: state.currentFile === oldName ? newName : state.currentFile,
      })
    },

    duplicateFile(name: string, newName: string) {
      const state = store.get()

      if (state.files[name] === undefined) {
        throw new Error(`File not found: ${name}`)
      }

      if (state.files[newName] !== undefined) {
        throw new Error(`File already exists: ${newName}`)
      }

      const content = state.files[name]
      const type = state.metadata[name]?.type || inferFileType(newName)

      this.createFile(newName, type, content)
    },

    getContent(name: string) {
      return store.get().files[name] ?? null
    },

    setContent(name: string, content: string) {
      const state = store.get()

      if (state.files[name] === undefined) {
        throw new Error(`File not found: ${name}`)
      }

      const metadata = state.metadata[name]
      const updatedMetadata = updateMetadata(metadata, content)

      store.set({
        files: { ...state.files, [name]: content },
        metadata: { ...state.metadata, [name]: updatedMetadata },
        isDirty: { ...state.isDirty, [name]: true },
      })
    },

    getFileType(name: string) {
      return store.get().metadata[name]?.type ?? null
    },

    getFileMetadata(name: string) {
      return store.get().metadata[name] ?? null
    },

    getAllFiles() {
      return Object.keys(store.get().files)
    },

    getFilesByType(type: FileType) {
      const state = store.get()
      return Object.entries(state.metadata)
        .filter(([_, meta]) => meta.type === type)
        .map(([name]) => name)
    },

    hasUnsavedChanges(name?: string) {
      const state = store.get()
      if (name) {
        return state.isDirty[name] ?? false
      }
      return Object.values(state.isDirty).some(Boolean)
    },

    markSaved(name: string) {
      const state = store.get()
      store.set({
        isDirty: { ...state.isDirty, [name]: false },
      })
    },

    markDirty(name: string) {
      const state = store.get()
      store.set({
        isDirty: { ...state.isDirty, [name]: true },
      })
    },
  }
}
