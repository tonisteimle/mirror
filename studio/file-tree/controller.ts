/**
 * File Tree Controller
 *
 * Manages file tree state and operations.
 * No DOM dependencies - fully testable.
 */

import type { StorageItem, StorageFolder } from '../storage/types'
import type { StorageService } from '../storage/service'
import {
  findFirstFile,
  collectFilePaths,
  validateFilename,
  buildChildPath,
  buildSiblingPath,
  generateCopyName,
  generateDefaultContent,
  isSupportedExtension
} from './utils'

// =============================================================================
// Types
// =============================================================================

export interface FileTreeState {
  currentFile: string | null
  expandedFolders: Set<string>
  filesCache: Record<string, string>
}

export interface FileTreeCallbacks {
  onFileSelect?: (path: string, content: string) => void
  onFileChange?: (path: string, content: string) => void
  onTreeChange?: () => void
  onError?: (error: Error, operation: string) => void
}

export type ContextMenuTarget = {
  path: string | null
  isFile: boolean
  isFolder: boolean
  isRoot: boolean
}

// =============================================================================
// Controller
// =============================================================================

export class FileTreeController {
  private state: FileTreeState = {
    currentFile: null,
    expandedFolders: new Set(),
    filesCache: {}
  }

  private callbacks: FileTreeCallbacks = {}

  constructor(
    private storage: StorageService
  ) {
    this.setupEventListeners()
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize controller with callbacks
   */
  init(callbacks: FileTreeCallbacks = {}): void {
    this.callbacks = callbacks
  }

  /**
   * Setup storage event listeners
   */
  private setupEventListeners(): void {
    this.storage.events.on('tree:changed', () => {
      this.callbacks.onTreeChange?.()
    })

    this.storage.events.on('file:created', async ({ path }) => {
      try {
        this.state.filesCache[path] = await this.storage.readFile(path)
      } catch (e) {
        console.warn('[FileTreeController] Failed to cache new file:', path)
      }
      // Auto-select new file
      await this.selectFile(path)
    })

    this.storage.events.on('file:changed', ({ path, content }) => {
      this.state.filesCache[path] = content
      this.callbacks.onFileChange?.(path, content)
    })

    this.storage.events.on('file:deleted', ({ path }) => {
      delete this.state.filesCache[path]

      if (this.state.currentFile === path) {
        this.state.currentFile = null
        const tree = this.storage.getTree()
        const nextFile = findFirstFile(tree)
        if (nextFile) {
          this.selectFile(nextFile)
        }
      }
      this.callbacks.onTreeChange?.()
    })

    this.storage.events.on('file:renamed', ({ oldPath, newPath }) => {
      if (this.state.filesCache[oldPath] !== undefined) {
        this.state.filesCache[newPath] = this.state.filesCache[oldPath]
        delete this.state.filesCache[oldPath]
      }

      if (this.state.currentFile === oldPath) {
        this.state.currentFile = newPath
      }
      this.callbacks.onTreeChange?.()
    })

    this.storage.events.on('project:closed', () => {
      this.resetState()
      this.callbacks.onTreeChange?.()
    })

    this.storage.events.on('project:opened', async () => {
      this.resetState()
      await this.preloadAllFiles()

      const tree = this.storage.getTree()
      const firstFile = findFirstFile(tree)
      if (firstFile) {
        await this.selectFile(firstFile)
      }
      this.callbacks.onTreeChange?.()
    })

    this.storage.events.on('error', ({ error, operation }) => {
      this.callbacks.onError?.(error, operation)
    })
  }

  /**
   * Reset all state
   */
  resetState(): void {
    this.state = {
      currentFile: null,
      expandedFolders: new Set(),
      filesCache: {}
    }
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get currentFile(): string | null {
    return this.state.currentFile
  }

  get expandedFolders(): Set<string> {
    return this.state.expandedFolders
  }

  get filesCache(): Record<string, string> {
    return this.state.filesCache
  }

  getTree(): StorageItem[] {
    return this.storage.getTree()
  }

  getProjectName(): string | null {
    return this.storage.currentProjectName
  }

  hasProject(): boolean {
    return this.storage.hasProject
  }

  // ===========================================================================
  // File Operations
  // ===========================================================================

  /**
   * Select and load a file
   */
  async selectFile(path: string): Promise<void> {
    try {
      const content = await this.storage.readFile(path)
      this.state.currentFile = path
      this.state.filesCache[path] = content
      this.callbacks.onFileSelect?.(path, content)
      this.callbacks.onTreeChange?.()
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'selectFile')
    }
  }

  /**
   * Save file content
   */
  async saveFile(path: string, content: string): Promise<void> {
    this.state.filesCache[path] = content
    try {
      await this.storage.writeFile(path, content)
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'saveFile')
    }
  }

  /**
   * Create a new file
   */
  async createFile(fileName: string, parentFolder: string | null = null): Promise<boolean> {
    // Validate filename
    const validation = validateFilename(fileName)
    if (!validation.valid) {
      this.callbacks.onError?.(new Error(validation.error!), 'createFile')
      return false
    }

    // Build target path
    let targetPath = buildChildPath(parentFolder || '', fileName)

    // Ensure valid extension
    if (!isSupportedExtension(targetPath)) {
      targetPath = targetPath.endsWith('.mir') ? targetPath : `${targetPath}.mir`
    }

    const content = generateDefaultContent(fileName)

    try {
      await this.storage.writeFile(targetPath, content)
      await this.selectFile(targetPath)
      return true
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'createFile')
      return false
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(folderName: string, parentFolder: string | null = null): Promise<boolean> {
    const validation = validateFilename(folderName)
    if (!validation.valid) {
      this.callbacks.onError?.(new Error(validation.error!), 'createFolder')
      return false
    }

    const targetPath = buildChildPath(parentFolder || '', folderName)

    try {
      await this.storage.createFolder(targetPath)
      return true
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'createFolder')
      return false
    }
  }

  /**
   * Rename a file or folder
   */
  async renameItem(oldPath: string, newName: string): Promise<boolean> {
    const validation = validateFilename(newName)
    if (!validation.valid) {
      this.callbacks.onError?.(new Error(validation.error!), 'renameItem')
      return false
    }

    const newPath = buildSiblingPath(oldPath, newName)

    try {
      await this.storage.renameFile(oldPath, newPath)
      return true
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'renameItem')
      return false
    }
  }

  /**
   * Duplicate a file
   */
  async duplicateFile(path: string): Promise<boolean> {
    const tree = this.storage.getTree()
    const existingPaths = new Set(collectFilePaths(tree))
    const newPath = generateCopyName(path, existingPaths)

    try {
      await this.storage.copyFile(path, newPath)
      return true
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'duplicateFile')
      return false
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteItem(path: string, isFolder: boolean = false): Promise<boolean> {
    try {
      if (isFolder) {
        await this.storage.deleteFolder(path)
      } else {
        await this.storage.deleteFile(path)
      }
      return true
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'deleteItem')
      return false
    }
  }

  /**
   * Move an item to a new folder
   */
  async moveItem(sourcePath: string, targetFolder: string): Promise<boolean> {
    const name = sourcePath.split('/').pop()!
    const newPath = targetFolder ? `${targetFolder}/${name}` : name

    if (sourcePath === newPath) return false
    if (newPath.startsWith(sourcePath + '/')) {
      this.callbacks.onError?.(new Error('Cannot move folder into itself'), 'moveItem')
      return false
    }

    try {
      await this.storage.moveItem(sourcePath, targetFolder)
      return true
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      this.callbacks.onError?.(error, 'moveItem')
      return false
    }
  }

  // ===========================================================================
  // Folder Expansion
  // ===========================================================================

  /**
   * Toggle folder expansion
   */
  toggleFolder(folderPath: string): void {
    if (this.state.expandedFolders.has(folderPath)) {
      this.state.expandedFolders.delete(folderPath)
    } else {
      this.state.expandedFolders.add(folderPath)
    }
    this.callbacks.onTreeChange?.()
  }

  /**
   * Expand a folder
   */
  expandFolder(folderPath: string): void {
    this.state.expandedFolders.add(folderPath)
  }

  /**
   * Collapse a folder
   */
  collapseFolder(folderPath: string): void {
    this.state.expandedFolders.delete(folderPath)
  }

  /**
   * Check if folder is expanded
   */
  isFolderExpanded(folderPath: string): boolean {
    return this.state.expandedFolders.has(folderPath)
  }

  // ===========================================================================
  // File Cache
  // ===========================================================================

  /**
   * Get file content from cache
   */
  getFileContent(path: string): string | undefined {
    return this.state.filesCache[path]
  }

  /**
   * Update file in cache (for external editors)
   */
  updateFileCache(path: string, content: string): void {
    this.state.filesCache[path] = content
  }

  /**
   * Preload all files into cache
   */
  async preloadAllFiles(): Promise<void> {
    const tree = this.storage.getTree()
    const filePaths = collectFilePaths(tree)
    const MAX_CONCURRENT = 5

    for (let i = 0; i < filePaths.length; i += MAX_CONCURRENT) {
      const batch = filePaths.slice(i, i + MAX_CONCURRENT)
      const results = await Promise.allSettled(
        batch.map(async (path) => {
          const content = await this.storage.readFile(path)
          return { path, content }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          this.state.filesCache[result.value.path] = result.value.content
        }
      }
    }
  }

  // ===========================================================================
  // Context Menu Helpers
  // ===========================================================================

  /**
   * Get available actions for context menu target
   */
  getContextMenuActions(target: ContextMenuTarget): string[] {
    if (target.isFile) {
      return ['rename', 'duplicate', 'delete']
    }

    if (target.isFolder) {
      if (target.isRoot) {
        return ['new-file', 'new-folder']
      }
      return ['new-file', 'new-folder', 'rename', 'delete']
    }

    // Empty area
    return ['new-file', 'new-folder']
  }
}
