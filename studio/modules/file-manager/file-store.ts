/**
 * File Store - State management for files
 */

import type { FileStore, FileMetadata, FileType, Project } from './types'

type Subscriber<T> = (state: T) => void

export interface Store<T> {
  get(): T
  set(partial: Partial<T>): void
  subscribe(subscriber: Subscriber<T>): () => void
  reset(): void
}

const initialState: FileStore = {
  files: {},
  metadata: {},
  currentFile: null,
  projects: [],
  currentProject: null,
  isDirty: {},
}

export function createFileStore(): Store<FileStore> {
  let state: FileStore = { ...initialState }
  const subscribers = new Set<Subscriber<FileStore>>()

  return {
    get() {
      return state
    },

    set(partial: Partial<FileStore>) {
      state = { ...state, ...partial }
      subscribers.forEach(fn => {
        try {
          fn(state)
        } catch (error) {
          console.error('[FileStore] Subscriber error:', error)
        }
      })
    },

    subscribe(subscriber: Subscriber<FileStore>) {
      subscribers.add(subscriber)
      return () => {
        subscribers.delete(subscriber)
      }
    },

    reset() {
      state = { ...initialState }
      subscribers.forEach(fn => fn(state))
    },
  }
}

// Helper functions for common operations
export function getFileType(filename: string): FileType {
  const name = filename.toLowerCase()
  if (name.includes('token')) return 'tokens'
  if (name.includes('component') || name.endsWith('.comp.mirror')) return 'component'
  return 'layout'
}

export function createMetadata(name: string, type: FileType, content: string = ''): FileMetadata {
  const now = new Date()
  return {
    name,
    type,
    created: now,
    modified: now,
    size: content.length,
  }
}

export function updateMetadata(metadata: FileMetadata, content: string): FileMetadata {
  return {
    ...metadata,
    modified: new Date(),
    size: content.length,
  }
}
