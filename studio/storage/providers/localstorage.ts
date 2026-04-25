/**
 * LocalStorage Provider
 *
 * Speichert alle Dateien in localStorage.
 * Kein Projekt-Konzept, keine User-Verwaltung.
 * Bei leerem Storage wird ein Demo-Projekt erstellt.
 */

import type {
  StorageProvider,
  StorageProject,
  StorageItem,
  StorageFile,
  StorageFolder,
} from '../types'
import { createLogger } from '../../../compiler/utils/logger'
import { DEFAULT_PROJECT } from '../project-actions'

const log = createLogger('LocalStorageProvider')

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'mirror-files'

// =============================================================================
// LocalStorage Provider
// =============================================================================

export class LocalStorageProvider implements StorageProvider {
  readonly type = 'localstorage' as const
  readonly supportsProjects = false
  readonly supportsNativeDialogs = false

  private files: Record<string, string> = {}

  constructor() {
    // Demo blank mode (?demo=blank): skip storage entirely and start with
    // a single empty index.mir. Used by the demo runner so a fresh
    // headed run isn't polluted by the previous session's files.
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search)
      if (params.get('demo') === 'blank') {
        this.files = { 'index.mir': '' }
        log.info('Demo blank mode — empty project, storage bypassed')
        return
      }
    }
    this.loadFromStorage()
  }

  // ===========================================================================
  // Storage Helpers
  // ===========================================================================

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.files = JSON.parse(stored)
      }

      // Wenn komplett leer, Demo-Projekt laden
      if (Object.keys(this.files).length === 0) {
        log.info('Empty storage, loading demo project')
        this.files = { ...DEFAULT_PROJECT }
        this.saveToStorage()
      }
    } catch (err) {
      log.error('Failed to load from localStorage:', err)
      this.files = { ...DEFAULT_PROJECT }
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.files))
    } catch (err) {
      log.error('Failed to save to localStorage:', err)
    }
  }

  // ===========================================================================
  // Projekt-Operationen (nicht unterstützt, aber Interface erfüllen)
  // ===========================================================================

  async listProjects(): Promise<StorageProject[]> {
    return [
      {
        id: 'local',
        name: 'Local Project',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
  }

  async createProject(_name: string): Promise<StorageProject> {
    throw new Error('LocalStorage mode does not support multiple projects')
  }

  async deleteProject(_id: string): Promise<void> {
    throw new Error('LocalStorage mode does not support deleting projects')
  }

  async openProject(_id: string): Promise<void> {
    // Nichts zu tun - nur ein Projekt
  }

  async closeProject(): Promise<void> {
    // Nichts zu tun
  }

  // ===========================================================================
  // Datei-Baum
  // ===========================================================================

  async getTree(): Promise<StorageItem[]> {
    const tree: StorageItem[] = []
    const folders = new Map<string, StorageFolder>()

    // Alle Dateien durchgehen und Baum aufbauen
    for (const path of Object.keys(this.files)) {
      const parts = path.split('/')
      const fileName = parts.pop()!

      // .folder Marker überspringen (nur für Ordner-Erstellung)
      if (fileName === '.folder') {
        // Aber Ordner trotzdem erstellen falls nötig
        if (parts.length > 0) {
          let currentPath = ''
          let parentChildren = tree

          for (const folderName of parts) {
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

            if (!folders.has(currentPath)) {
              const folder: StorageFolder = {
                type: 'folder',
                name: folderName,
                path: currentPath,
                children: [],
              }
              folders.set(currentPath, folder)
              parentChildren.push(folder)
            }

            parentChildren = folders.get(currentPath)!.children
          }
        }
        continue
      }

      if (parts.length === 0) {
        // Datei im Root
        tree.push({
          type: 'file',
          name: fileName,
          path: path,
        })
      } else {
        // Datei in Unterordner
        let currentPath = ''
        let parentChildren = tree

        for (const folderName of parts) {
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

          if (!folders.has(currentPath)) {
            const folder: StorageFolder = {
              type: 'folder',
              name: folderName,
              path: currentPath,
              children: [],
            }
            folders.set(currentPath, folder)
            parentChildren.push(folder)
          }

          parentChildren = folders.get(currentPath)!.children
        }

        parentChildren.push({
          type: 'file',
          name: fileName,
          path: path,
        })
      }
    }

    // Sortieren: Ordner zuerst, dann alphabetisch
    this.sortTree(tree)

    return tree
  }

  private sortTree(items: StorageItem[]): void {
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    for (const item of items) {
      if (item.type === 'folder') {
        this.sortTree(item.children)
      }
    }
  }

  // ===========================================================================
  // Datei-Operationen
  // ===========================================================================

  async readFile(path: string): Promise<string> {
    const content = this.files[path]
    if (content === undefined) {
      throw new Error(`File not found: ${path}`)
    }
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files[path] = content
    this.saveToStorage()
  }

  async deleteFile(path: string): Promise<void> {
    if (this.files[path] === undefined) {
      throw new Error(`File not found: ${path}`)
    }
    delete this.files[path]
    this.saveToStorage()
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    if (this.files[oldPath] === undefined) {
      throw new Error(`File not found: ${oldPath}`)
    }
    if (this.files[newPath] !== undefined) {
      throw new Error(`File already exists: ${newPath}`)
    }

    this.files[newPath] = this.files[oldPath]
    delete this.files[oldPath]
    this.saveToStorage()
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    if (this.files[sourcePath] === undefined) {
      throw new Error(`File not found: ${sourcePath}`)
    }
    if (this.files[targetPath] !== undefined) {
      throw new Error(`File already exists: ${targetPath}`)
    }

    this.files[targetPath] = this.files[sourcePath]
    this.saveToStorage()
  }

  // ===========================================================================
  // Ordner-Operationen
  // ===========================================================================

  async createFolder(path: string): Promise<void> {
    // Ordner existieren implizit durch Dateipfade
    // Marker-Datei für leere Ordner
    const markerPath = `${path}/.folder`
    this.files[markerPath] = ''
    this.saveToStorage()
  }

  async deleteFolder(path: string): Promise<void> {
    const prefix = `${path}/`
    for (const filePath of Object.keys(this.files)) {
      if (filePath.startsWith(prefix)) {
        delete this.files[filePath]
      }
    }
    this.saveToStorage()
  }

  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    const oldPrefix = `${oldPath}/`
    const newPrefix = `${newPath}/`

    const filesToMove: [string, string][] = []

    for (const filePath of Object.keys(this.files)) {
      if (filePath.startsWith(oldPrefix)) {
        const newFilePath = newPrefix + filePath.slice(oldPrefix.length)
        filesToMove.push([filePath, newFilePath])
      }
    }

    for (const [oldFilePath, newFilePath] of filesToMove) {
      this.files[newFilePath] = this.files[oldFilePath]
      delete this.files[oldFilePath]
    }

    this.saveToStorage()
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    const name = sourcePath.split('/').pop()!
    const newPath = targetFolder ? `${targetFolder}/${name}` : name

    if (this.files[sourcePath] !== undefined) {
      // Datei verschieben
      await this.renameFile(sourcePath, newPath)
    } else {
      // Ordner verschieben
      await this.renameFolder(sourcePath, newPath)
    }
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  /**
   * Alle Daten löschen und Demo-Projekt laden
   */
  reset(): void {
    this.files = { ...DEFAULT_PROJECT }
    this.saveToStorage()
  }

  /**
   * Prüft ob Storage leer ist (wird intern verwendet)
   */
  isEmpty(): boolean {
    return Object.keys(this.files).length === 0
  }
}

/**
 * Prüft ob localStorage verfügbar ist
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}
