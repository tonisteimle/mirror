/**
 * Storage Service
 *
 * Zentraler Service für alle Datei-Operationen.
 * Abstrahiert das Backend (Tauri, Server, Demo).
 */

import type {
  StorageProvider,
  StorageProject,
  StorageItem,
  ProviderType,
  PreludeFile
} from './types'
import { getFileType } from './types'
import { StorageEventEmitter } from './events'
import { detectProvider } from './providers'

// =============================================================================
// Cache Entry
// =============================================================================

interface CacheEntry {
  content: string
  timestamp: number
}

// =============================================================================
// Operation Lock (Mutex per file)
// =============================================================================

class OperationLock {
  private locks = new Map<string, Promise<void>>()

  /**
   * Acquire lock for a path, wait if already locked
   */
  async acquire(path: string): Promise<() => void> {
    // Wait for any existing operation on this path
    while (this.locks.has(path)) {
      await this.locks.get(path)
    }

    // Create new lock
    let release!: () => void
    const lock = new Promise<void>(resolve => {
      release = resolve
    })
    this.locks.set(path, lock)

    // Return release function
    return () => {
      this.locks.delete(path)
      release()
    }
  }
}

// =============================================================================
// Storage Service
// =============================================================================

export class StorageService {
  private provider: StorageProvider | null = null
  private cache = new Map<string, CacheEntry>()
  private treeCache: StorageItem[] = []
  private currentProject: StorageProject | null = null
  private initialized = false
  private operationLock = new OperationLock()

  private readonly CACHE_TTL = 5000 // 5 Sekunden

  /**
   * Event-Emitter für Storage-Events
   */
  readonly events = new StorageEventEmitter()

  // ===========================================================================
  // Initialisierung
  // ===========================================================================

  /**
   * Service initialisieren (Auto-Detection des Providers)
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.warn('[Storage] Already initialized')
      return
    }

    this.provider = await detectProvider()
    this.initialized = true

    console.log(`[Storage] Initialized with ${this.provider.type} provider`)
  }

  /**
   * Provider manuell setzen (für Tests)
   */
  setProvider(provider: StorageProvider): void {
    this.provider = provider
    this.initialized = true
    this.cache.clear()
    this.treeCache = []
    this.currentProject = null
  }

  /**
   * Provider wechseln (z.B. Fallback auf Demo wenn Server-Projekt nicht existiert)
   */
  async switchProvider(type: ProviderType): Promise<void> {
    const { createProvider } = await import('./providers')
    const newProvider = createProvider(type)
    this.setProvider(newProvider)
    console.log(`[Storage] Switched to ${type} provider`)
  }

  // ===========================================================================
  // Status
  // ===========================================================================

  get isInitialized(): boolean {
    return this.initialized
  }

  get providerType(): ProviderType {
    this.ensureInitialized()
    return this.provider!.type
  }

  get hasProject(): boolean {
    return this.currentProject !== null
  }

  get currentProjectName(): string | null {
    return this.currentProject?.name ?? null
  }

  get supportsProjects(): boolean {
    this.ensureInitialized()
    return this.provider!.supportsProjects
  }

  get supportsNativeDialogs(): boolean {
    this.ensureInitialized()
    return this.provider!.supportsNativeDialogs
  }

  // ===========================================================================
  // Projekt-API
  // ===========================================================================

  async listProjects(): Promise<StorageProject[]> {
    this.ensureInitialized()
    return this.provider!.listProjects()
  }

  async createProject(name: string): Promise<StorageProject> {
    this.ensureInitialized()

    try {
      const project = await this.provider!.createProject(name)
      return project
    } catch (error) {
      this.emitError(error as Error, 'createProject', undefined, false)
      throw error
    }
  }

  async deleteProject(id: string): Promise<void> {
    this.ensureInitialized()

    try {
      await this.provider!.deleteProject(id)

      if (this.currentProject?.id === id) {
        await this.closeProject()
      }
    } catch (error) {
      this.emitError(error as Error, 'deleteProject', undefined, false)
      throw error
    }
  }

  async openProject(id: string): Promise<void> {
    this.ensureInitialized()

    try {
      // Aktuelles Projekt schließen
      if (this.currentProject) {
        await this.closeProject()
      }

      await this.provider!.openProject(id)

      // Projekt-Metadaten setzen
      const projects = await this.provider!.listProjects()
      this.currentProject = projects.find(p => p.id === id) ?? {
        id,
        name: id.split('/').pop() ?? id
      }

      // Baum laden
      this.treeCache = await this.provider!.getTree()

      this.events.emit('project:opened', { project: this.currentProject })
      this.events.emit('tree:changed', { tree: this.treeCache })
    } catch (error) {
      this.emitError(error as Error, 'openProject', undefined, false)
      throw error
    }
  }

  async closeProject(): Promise<void> {
    this.ensureInitialized()

    await this.provider!.closeProject()

    this.currentProject = null
    this.cache.clear()
    this.treeCache = []

    this.events.emit('project:closed', {})
  }

  // ===========================================================================
  // Datei-API
  // ===========================================================================

  async readFile(path: string): Promise<string> {
    this.ensureInitialized()

    // Cache prüfen
    const cached = this.cache.get(path)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.content
    }

    try {
      const content = await this.provider!.readFile(path)

      // Cache aktualisieren
      this.cache.set(path, { content, timestamp: Date.now() })

      return content
    } catch (error) {
      this.emitError(error as Error, 'readFile', path, false)
      throw error
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.ensureInitialized()

    // Acquire lock to prevent concurrent writes to same file
    const release = await this.operationLock.acquire(path)

    try {
      const isNew = !this.fileExistsInTree(path)

      await this.provider!.writeFile(path, content)

      // Cache aktualisieren
      this.cache.set(path, { content, timestamp: Date.now() })

      if (isNew) {
        // Baum aktualisieren für neue Datei
        await this.refreshTree()
        this.events.emit('file:created', { path })
      } else {
        this.events.emit('file:changed', { path, content })
      }
    } catch (error) {
      this.emitError(error as Error, 'writeFile', path, true)
      throw error
    } finally {
      release()
    }
  }

  async deleteFile(path: string): Promise<void> {
    this.ensureInitialized()

    const release = await this.operationLock.acquire(path)

    try {
      await this.provider!.deleteFile(path)

      // Cache invalidieren
      this.cache.delete(path)

      // Baum aktualisieren
      await this.refreshTree()

      this.events.emit('file:deleted', { path })
    } catch (error) {
      this.emitError(error as Error, 'deleteFile', path, false)
      throw error
    } finally {
      release()
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    this.ensureInitialized()

    // Lock both paths to prevent concurrent operations
    const releaseOld = await this.operationLock.acquire(oldPath)
    const releaseNew = await this.operationLock.acquire(newPath)

    try {
      await this.provider!.renameFile(oldPath, newPath)

      // Cache aktualisieren
      const cached = this.cache.get(oldPath)
      if (cached) {
        this.cache.delete(oldPath)
        this.cache.set(newPath, cached)
      }

      // Baum aktualisieren
      await this.refreshTree()

      this.events.emit('file:renamed', { oldPath, newPath })
    } catch (error) {
      this.emitError(error as Error, 'renameFile', oldPath, false)
      throw error
    } finally {
      releaseNew()
      releaseOld()
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    this.ensureInitialized()

    // Lock target path to prevent concurrent writes
    const release = await this.operationLock.acquire(targetPath)

    try {
      await this.provider!.copyFile(sourcePath, targetPath)

      // Baum aktualisieren
      await this.refreshTree()

      this.events.emit('file:created', { path: targetPath })
    } catch (error) {
      this.emitError(error as Error, 'copyFile', sourcePath, false)
      throw error
    } finally {
      release()
    }
  }

  // ===========================================================================
  // Ordner-API
  // ===========================================================================

  async createFolder(path: string): Promise<void> {
    this.ensureInitialized()

    try {
      await this.provider!.createFolder(path)

      await this.refreshTree()

      this.events.emit('folder:created', { path })
    } catch (error) {
      this.emitError(error as Error, 'createFolder', path, false)
      throw error
    }
  }

  async deleteFolder(path: string): Promise<void> {
    this.ensureInitialized()

    try {
      await this.provider!.deleteFolder(path)

      // Cache für alle Dateien im Ordner invalidieren
      const prefix = `${path}/`
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key)
        }
      }

      await this.refreshTree()

      this.events.emit('folder:deleted', { path })
    } catch (error) {
      this.emitError(error as Error, 'deleteFolder', path, false)
      throw error
    }
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    this.ensureInitialized()

    try {
      await this.provider!.moveItem(sourcePath, targetFolder)

      // Cache aktualisieren
      const name = sourcePath.split('/').pop()!
      const newPath = targetFolder ? `${targetFolder}/${name}` : name

      const cached = this.cache.get(sourcePath)
      if (cached) {
        this.cache.delete(sourcePath)
        this.cache.set(newPath, cached)
      }

      await this.refreshTree()

      this.events.emit('file:renamed', { oldPath: sourcePath, newPath })
    } catch (error) {
      this.emitError(error as Error, 'moveItem', sourcePath, false)
      throw error
    }
  }

  // ===========================================================================
  // Baum-API
  // ===========================================================================

  /**
   * Gibt den gecachten Baum zurück (synchron)
   */
  getTree(): StorageItem[] {
    return this.treeCache
  }

  /**
   * Aktualisiert den Baum-Cache (asynchron)
   */
  async refreshTree(): Promise<StorageItem[]> {
    this.ensureInitialized()

    this.treeCache = await this.provider!.getTree()
    this.events.emit('tree:changed', { tree: this.treeCache })

    return this.treeCache
  }

  // ===========================================================================
  // Prelude-API
  // ===========================================================================

  /**
   * Gibt alle Token- und Component-Dateien zurück
   */
  async getPreludeFiles(): Promise<PreludeFile[]> {
    const preludeFiles: { path: string; type: 'tokens' | 'component' }[] = []

    // Rekursiv alle .tok und .com Dateien sammeln
    const collect = (items: StorageItem[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          const fileType = getFileType(item.name)
          if (fileType === 'tokens' || fileType === 'component') {
            preludeFiles.push({ path: item.path, type: fileType })
          }
        } else if (item.type === 'folder') {
          collect(item.children)
        }
      }
    }

    collect(this.treeCache)

    // Tokens zuerst, dann Components, dann alphabetisch
    preludeFiles.sort((a, b) => {
      if (a.type === 'tokens' && b.type !== 'tokens') return -1
      if (a.type !== 'tokens' && b.type === 'tokens') return 1
      return a.path.localeCompare(b.path)
    })

    // Inhalte laden
    return Promise.all(
      preludeFiles.map(async (f) => ({
        ...f,
        content: await this.readFile(f.path)
      }))
    )
  }

  /**
   * Baut Prelude-String für Compiler
   */
  async buildPrelude(): Promise<string> {
    const files = await this.getPreludeFiles()
    return files.map(f => f.content).join('\n\n')
  }

  // ===========================================================================
  // Native Dialoge
  // ===========================================================================

  canOpenFolderDialog(): boolean {
    return this.initialized && this.provider!.supportsNativeDialogs
  }

  async openFolderDialog(): Promise<string | null> {
    this.ensureInitialized()

    if (!this.provider!.openFolderDialog) {
      throw new Error('Provider does not support native dialogs')
    }

    return this.provider!.openFolderDialog()
  }

  // ===========================================================================
  // Cache-Verwaltung
  // ===========================================================================

  /**
   * Cache für eine Datei invalidieren
   */
  invalidateCache(path?: string): void {
    if (path) {
      this.cache.delete(path)
    } else {
      this.cache.clear()
    }
  }

  // ===========================================================================
  // Hilfsfunktionen
  // ===========================================================================

  private ensureInitialized(): void {
    if (!this.initialized || !this.provider) {
      throw new Error('StorageService not initialized. Call init() first.')
    }
  }

  private fileExistsInTree(path: string): boolean {
    // Im Cache?
    if (this.cache.has(path)) return true

    // Im Baum suchen
    const find = (items: StorageItem[]): boolean => {
      for (const item of items) {
        if (item.type === 'file' && item.path === path) return true
        if (item.type === 'folder' && find(item.children)) return true
      }
      return false
    }

    return find(this.treeCache)
  }

  private emitError(error: Error, operation: string, path: string | undefined, recoverable: boolean): void {
    this.events.emit('error', { error, operation, path, recoverable })
  }
}
