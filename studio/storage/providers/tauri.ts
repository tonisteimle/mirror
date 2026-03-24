/**
 * Tauri Storage Provider
 *
 * Nutzt das native Dateisystem via TauriBridge.
 */

import type { StorageProvider, StorageProject, StorageItem } from '../types'
import { isMirrorFile } from '../types'

// =============================================================================
// TauriBridge Type (global verfügbar)
// =============================================================================

interface TauriBridge {
  fs: {
    readFile(path: string): Promise<string>
    writeFile(path: string, content: string): Promise<void>
    listDirectory(path: string): Promise<{ path: string; files: Array<{ name: string; is_dir: boolean }> }>
    createDirectory(path: string): Promise<void>
    deletePath(path: string): Promise<void>
    renamePath(from: string, to: string): Promise<void>
    pathExists(path: string): Promise<boolean>
  }
  dialog: {
    openFolder(): Promise<string | null>
    openFile(filters?: unknown[]): Promise<string | null>
  }
  project: {
    getRecentProjects(): Promise<string[]>
  }
  window: {
    setTitle(title: string): Promise<void>
  }
}

declare global {
  interface Window {
    TauriBridge?: TauriBridge
    __TAURI_INTERNALS__?: unknown
  }
}

// =============================================================================
// Tauri Provider
// =============================================================================

export class TauriProvider implements StorageProvider {
  readonly type = 'tauri' as const
  readonly supportsProjects = false // Arbeitet mit Ordnern
  readonly supportsNativeDialogs = true

  private basePath: string | null = null
  private bridge: TauriBridge

  constructor() {
    if (!window.TauriBridge) {
      throw new Error('TauriBridge not available')
    }
    this.bridge = window.TauriBridge
  }

  // ===========================================================================
  // Projekt-Operationen
  // ===========================================================================

  async listProjects(): Promise<StorageProject[]> {
    try {
      const recentPaths = await this.bridge.project.getRecentProjects()

      return recentPaths.map((path: string) => ({
        id: path,
        name: this.basename(path),
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    } catch (error) {
      console.error('[TauriProvider] Failed to list projects:', error)
      return []
    }
  }

  async createProject(name: string): Promise<StorageProject> {
    // Ordner-Dialog öffnen für Parent-Verzeichnis
    const parentPath = await this.openFolderDialog()
    if (!parentPath) {
      throw new Error('No folder selected')
    }

    const projectPath = `${parentPath}/${name}`

    // Projektordner erstellen
    await this.bridge.fs.createDirectory(projectPath)

    // Default index.mir erstellen
    const defaultContent = `// ${name}

App bg #18181b, pad 24
  Text "Welcome to ${name}", col white
`
    await this.bridge.fs.writeFile(`${projectPath}/index.mir`, defaultContent)

    return {
      id: projectPath,
      name,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  async deleteProject(_id: string): Promise<void> {
    // Sicherheitshalber nicht implementiert
    console.warn('[TauriProvider] deleteProject not implemented for safety')
    throw new Error('Deleting projects from file system is disabled for safety')
  }

  async openProject(id: string): Promise<void> {
    this.basePath = id

    // Fenster-Titel aktualisieren
    try {
      const folderName = this.basename(id)
      await this.bridge.window.setTitle(`${folderName} - Mirror Studio`)
    } catch {
      // Ignorieren falls setTitle nicht verfügbar
    }
  }

  async closeProject(): Promise<void> {
    this.basePath = null
  }

  // ===========================================================================
  // Datei-Baum
  // ===========================================================================

  async getTree(): Promise<StorageItem[]> {
    if (!this.basePath) {
      return []
    }

    return this.loadFolderRecursive(this.basePath, 0)
  }

  private async loadFolderRecursive(folderPath: string, depth: number): Promise<StorageItem[]> {
    if (depth > 5) return [] // Max Tiefe

    try {
      const result = await this.bridge.fs.listDirectory(folderPath)
      const entries = result.files || []
      const items: StorageItem[] = []

      for (const entry of entries) {
        // Versteckte Dateien überspringen
        if (entry.name.startsWith('.')) continue

        const fullPath = `${folderPath}/${entry.name}`
        const relativePath = this.toRelativePath(fullPath)

        if (entry.is_dir) {
          const children = await this.loadFolderRecursive(fullPath, depth + 1)
          items.push({
            type: 'folder',
            name: entry.name,
            path: relativePath,
            children
          })
        } else if (isMirrorFile(entry.name)) {
          items.push({
            type: 'file',
            name: entry.name,
            path: relativePath
          })
        }
      }

      // Sortieren: Ordner zuerst, dann alphabetisch
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return items
    } catch (error) {
      console.error('[TauriProvider] Failed to load folder:', folderPath, error)
      return []
    }
  }

  // ===========================================================================
  // Datei-Operationen
  // ===========================================================================

  async readFile(path: string): Promise<string> {
    const absolutePath = this.toAbsolutePath(path)
    return this.bridge.fs.readFile(absolutePath)
  }

  async writeFile(path: string, content: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(path)
    await this.bridge.fs.writeFile(absolutePath, content)
  }

  async deleteFile(path: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(path)
    await this.bridge.fs.deletePath(absolutePath)
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const absoluteOld = this.toAbsolutePath(oldPath)
    const absoluteNew = this.toAbsolutePath(newPath)
    await this.bridge.fs.renamePath(absoluteOld, absoluteNew)
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    const content = await this.readFile(sourcePath)
    await this.writeFile(targetPath, content)
  }

  // ===========================================================================
  // Ordner-Operationen
  // ===========================================================================

  async createFolder(path: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(path)
    await this.bridge.fs.createDirectory(absolutePath)
  }

  async deleteFolder(path: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(path)
    await this.bridge.fs.deletePath(absolutePath)
  }

  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    const absoluteOld = this.toAbsolutePath(oldPath)
    const absoluteNew = this.toAbsolutePath(newPath)
    await this.bridge.fs.renamePath(absoluteOld, absoluteNew)
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    const name = sourcePath.split('/').pop()!
    const newPath = targetFolder ? `${targetFolder}/${name}` : name

    const absoluteSource = this.toAbsolutePath(sourcePath)
    const absoluteTarget = this.toAbsolutePath(newPath)

    await this.bridge.fs.renamePath(absoluteSource, absoluteTarget)
  }

  // ===========================================================================
  // Native Dialoge
  // ===========================================================================

  async openFolderDialog(): Promise<string | null> {
    return this.bridge.dialog.openFolder()
  }

  async openFileDialog(): Promise<string | null> {
    return this.bridge.dialog.openFile()
  }

  // ===========================================================================
  // Hilfsfunktionen
  // ===========================================================================

  private toAbsolutePath(relativePath: string): string {
    if (!this.basePath) {
      throw new Error('No project open')
    }
    return `${this.basePath}/${relativePath}`
  }

  private toRelativePath(absolutePath: string): string {
    if (!this.basePath) {
      return absolutePath
    }
    const prefix = `${this.basePath}/`
    if (absolutePath.startsWith(prefix)) {
      return absolutePath.slice(prefix.length)
    }
    return absolutePath
  }

  private basename(path: string): string {
    const parts = path.split(/[/\\]/)
    return parts[parts.length - 1] || path
  }

  /**
   * Aktueller Projekt-Pfad (für externe Verwendung)
   */
  getBasePath(): string | null {
    return this.basePath
  }
}

/**
 * Prüft ob Tauri verfügbar ist
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
}
