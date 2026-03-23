/**
 * File Manager Module
 *
 * Centralized file and project management for Mirror Studio.
 */

import { createFileStore, type Store } from './file-store'
import { createFileOperations, type FileOperations } from './file-operations'
import { createLocalStorageAdapter, createApiStorageAdapter, createTauriStorageAdapter, isTauri, openFolderDialog, type StorageAdapter } from './storage'
import type { FileStore, FileType, FileMetadata, Project, FileManagerOptions, FileManagerEvents } from './types'

export type { FileStore, FileType, FileMetadata, Project, FileManagerOptions, FileManagerEvents }
export { createTauriStorageAdapter, isTauri, openFolderDialog, type StorageAdapter }

type EventCallback<K extends keyof FileManagerEvents> = (payload: FileManagerEvents[K]) => void

export interface FileManager extends FileOperations {
  // Store access
  store: Store<FileStore>

  // Selection
  selectFile(name: string): void
  getCurrentFile(): string | null
  getCurrentContent(): string | null

  // Project operations
  loadProject(id: string): Promise<boolean>
  saveProject(): Promise<void>
  createProject(name: string): Promise<Project>
  deleteProject(id: string): Promise<void>
  listProjects(): Promise<Project[]>
  getCurrentProject(): Project | null

  // Events
  on<K extends keyof FileManagerEvents>(event: K, callback: EventCallback<K>): () => void
  emit<K extends keyof FileManagerEvents>(event: K, payload: FileManagerEvents[K]): void

  // Lifecycle
  dispose(): void
}

export function createFileManager(options: FileManagerOptions = { storage: 'local' }): FileManager {
  const store = createFileStore()
  const operations = createFileOperations(store)

  // Create storage adapter
  let storage: StorageAdapter

  if (typeof options.storage === 'object') {
    // Custom adapter passed directly
    storage = options.storage
  } else if (options.storage === 'tauri') {
    // Tauri file system adapter
    storage = createTauriStorageAdapter(options.projectPath)
  } else if (options.storage === 'api' && options.apiEndpoint) {
    // API adapter
    storage = createApiStorageAdapter(options.apiEndpoint)
  } else {
    // Default: localStorage
    storage = createLocalStorageAdapter()
  }

  // Event handlers
  const eventHandlers = new Map<keyof FileManagerEvents, Set<EventCallback<any>>>()

  function on<K extends keyof FileManagerEvents>(event: K, callback: EventCallback<K>): () => void {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set())
    }
    eventHandlers.get(event)!.add(callback)
    return () => {
      eventHandlers.get(event)?.delete(callback)
    }
  }

  function emit<K extends keyof FileManagerEvents>(event: K, payload: FileManagerEvents[K]): void {
    const handlers = eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          console.error(`[FileManager] Error in ${event} handler:`, error)
        }
      })
    }
  }

  // Auto-save timer
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null

  if (options.autoSave && options.autoSaveInterval) {
    autoSaveTimer = setInterval(() => {
      const state = store.get()
      if (state.currentProject && Object.values(state.isDirty).some(Boolean)) {
        manager.saveProject().catch(console.error)
      }
    }, options.autoSaveInterval)
  }

  const manager: FileManager = {
    // Store
    store,

    // File operations (delegate to operations)
    createFile(name: string, type?: FileType, content?: string) {
      operations.createFile(name, type, content)
      emit('file:created', { filename: name, type: type || store.get().metadata[name].type })
    },

    deleteFile(name: string) {
      operations.deleteFile(name)
      emit('file:deleted', { filename: name })
    },

    renameFile(oldName: string, newName: string) {
      operations.renameFile(oldName, newName)
      emit('file:renamed', { oldName, newName })
    },

    duplicateFile(name: string, newName: string) {
      operations.duplicateFile(name, newName)
      emit('file:created', { filename: newName, type: store.get().metadata[newName].type })
    },

    getContent: operations.getContent,

    setContent(name: string, content: string) {
      operations.setContent(name, content)
      emit('file:changed', { filename: name, content })
    },

    getFileType: operations.getFileType,
    getFileMetadata: operations.getFileMetadata,
    getAllFiles: operations.getAllFiles,
    getFilesByType: operations.getFilesByType,
    hasUnsavedChanges: operations.hasUnsavedChanges,
    markSaved: operations.markSaved,
    markDirty: operations.markDirty,

    // Selection
    selectFile(name: string) {
      const state = store.get()
      if (state.files[name] === undefined) {
        throw new Error(`File not found: ${name}`)
      }
      store.set({ currentFile: name })
      emit('file:selected', { filename: name })
    },

    getCurrentFile() {
      return store.get().currentFile
    },

    getCurrentContent() {
      const state = store.get()
      if (!state.currentFile) return null
      return state.files[state.currentFile] ?? null
    },

    // Project operations
    async loadProject(id: string) {
      const result = await storage.loadProject(id)
      if (!result) return false

      const { project, files } = result

      // Build metadata from files
      const metadata: Record<string, FileMetadata> = {}
      const isDirty: Record<string, boolean> = {}

      for (const [name, content] of Object.entries(files)) {
        const type = name.includes('token') ? 'tokens' as const
          : name.includes('component') ? 'component' as const
          : 'layout' as const

        metadata[name] = {
          name,
          type,
          created: project.created,
          modified: project.modified,
          size: content.length,
        }
        isDirty[name] = false
      }

      const currentFile = Object.keys(files)[0] || null

      store.set({
        files,
        metadata,
        currentFile,
        currentProject: project,
        isDirty,
      })

      emit('project:loaded', { project })
      return true
    },

    async saveProject() {
      const state = store.get()
      if (!state.currentProject) {
        throw new Error('No project loaded')
      }

      const project: Project = {
        ...state.currentProject,
        files: Object.keys(state.files),
        modified: new Date(),
      }

      await storage.saveProject(project, state.files)

      // Mark all files as saved
      const isDirty: Record<string, boolean> = {}
      for (const name of Object.keys(state.files)) {
        isDirty[name] = false
      }

      store.set({ currentProject: project, isDirty })
      emit('project:saved', { project })
    },

    async createProject(name: string) {
      const project = await storage.createProject(name)

      store.set({
        files: {},
        metadata: {},
        currentFile: null,
        currentProject: project,
        projects: [...store.get().projects, project],
        isDirty: {},
      })

      emit('project:created', { project })
      return project
    },

    async deleteProject(id: string) {
      await storage.deleteProject(id)

      const state = store.get()
      store.set({
        projects: state.projects.filter(p => p.id !== id),
        ...(state.currentProject?.id === id ? {
          files: {},
          metadata: {},
          currentFile: null,
          currentProject: null,
          isDirty: {},
        } : {}),
      })
    },

    async listProjects() {
      const projects = await storage.listProjects()
      store.set({ projects })
      return projects
    },

    getCurrentProject() {
      return store.get().currentProject
    },

    // Events
    on,
    emit,

    // Lifecycle
    dispose() {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer)
        autoSaveTimer = null
      }
      eventHandlers.clear()
      store.reset()
    },
  }

  return manager
}

// Singleton instance
let defaultInstance: FileManager | null = null

export function getFileManager(options?: FileManagerOptions): FileManager {
  if (!defaultInstance) {
    defaultInstance = createFileManager(options)
  }
  return defaultInstance
}

export function resetFileManager(): void {
  if (defaultInstance) {
    defaultInstance.dispose()
    defaultInstance = null
  }
}
