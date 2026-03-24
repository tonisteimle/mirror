/**
 * Demo Storage Provider
 *
 * In-Memory Storage mit localStorage-Persistenz.
 * Fallback wenn kein Tauri und kein Server verfügbar.
 */

import type { StorageProvider, StorageProject, StorageItem, StorageFile, StorageFolder } from '../types'
import { isMirrorFile } from '../types'

// =============================================================================
// Default Demo Files
// =============================================================================

const DEFAULT_DEMO_FILES: Record<string, string> = {
  'index.mir': `App bg #18181b, pad 24, gap 16
  Text "Mirror Studio", fs 24, weight bold, col white
  Text "Browser Demo Mode", col #888

  Card bg #27272a, pad 16, rad 8, gap 8
    Text "Edit this code to test", col #a1a1aa
    Button "Click Me"
      pad 12 24, bg #3b82f6, rad 6, col white
      hover bg #2563eb`,

  'tokens.tok': `// Design Tokens

// Colors
$primary: #3b82f6
$surface: #27272a
$background: #18181b
$text: #ffffff
$muted: #a1a1aa

// Spacing
$spacing-sm: 8
$spacing-md: 16
$spacing-lg: 24

// Radius
$radius: 8`,

  'components.com': `// Component Definitions

Button:
  pad 12 24, bg #3b82f6, rad 6, col white, cursor pointer
  hover bg #2563eb

Card:
  bg #27272a, pad 16, rad 8

Input:
  pad 12, bg #1f1f1f, rad 6, bor 1 #333
  col white
  focus bor 1 #3b82f6`
}

// =============================================================================
// Demo Provider
// =============================================================================

export class DemoProvider implements StorageProvider {
  readonly type = 'demo' as const
  readonly supportsProjects = false
  readonly supportsNativeDialogs = false

  private readonly STORAGE_KEY = 'mirror-demo-files'
  private files: Record<string, string>
  private projectOpen = false

  constructor() {
    // Aus localStorage laden oder Defaults verwenden
    const saved = this.loadFromStorage()
    this.files = saved ?? { ...DEFAULT_DEMO_FILES }
  }

  // ===========================================================================
  // Projekt-Operationen
  // ===========================================================================

  async listProjects(): Promise<StorageProject[]> {
    // Demo hat nur ein implizites Projekt
    return [{
      id: 'demo',
      name: 'Demo Project',
      createdAt: new Date(),
      updatedAt: new Date()
    }]
  }

  async createProject(_name: string): Promise<StorageProject> {
    // Demo unterstützt keine echten Projekte
    throw new Error('Demo mode does not support creating projects')
  }

  async deleteProject(_id: string): Promise<void> {
    throw new Error('Demo mode does not support deleting projects')
  }

  async openProject(_id: string): Promise<void> {
    this.projectOpen = true
  }

  async closeProject(): Promise<void> {
    this.projectOpen = false
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

      if (parts.length === 0) {
        // Datei im Root
        tree.push({
          type: 'file',
          name: fileName,
          path: path
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
              children: []
            }
            folders.set(currentPath, folder)
            parentChildren.push(folder)
          }

          parentChildren = folders.get(currentPath)!.children
        }

        parentChildren.push({
          type: 'file',
          name: fileName,
          path: path
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
    this.persist()
  }

  async deleteFile(path: string): Promise<void> {
    if (this.files[path] === undefined) {
      throw new Error(`File not found: ${path}`)
    }
    delete this.files[path]
    this.persist()
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
    this.persist()
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    if (this.files[sourcePath] === undefined) {
      throw new Error(`File not found: ${sourcePath}`)
    }
    if (this.files[targetPath] !== undefined) {
      throw new Error(`File already exists: ${targetPath}`)
    }

    this.files[targetPath] = this.files[sourcePath]
    this.persist()
  }

  // ===========================================================================
  // Ordner-Operationen
  // ===========================================================================

  async createFolder(path: string): Promise<void> {
    // In-Memory: Ordner existieren implizit durch Dateipfade
    // Wir erstellen eine .gitkeep-ähnliche Markierung
    const markerPath = `${path}/.folder`
    this.files[markerPath] = ''
    this.persist()
  }

  async deleteFolder(path: string): Promise<void> {
    // Alle Dateien im Ordner löschen
    const prefix = `${path}/`
    for (const filePath of Object.keys(this.files)) {
      if (filePath.startsWith(prefix)) {
        delete this.files[filePath]
      }
    }
    this.persist()
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

    this.persist()
  }

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    const name = sourcePath.split('/').pop()!
    const newPath = targetFolder ? `${targetFolder}/${name}` : name

    // Prüfen ob es eine Datei oder ein Ordner ist
    if (this.files[sourcePath] !== undefined) {
      // Datei verschieben
      await this.renameFile(sourcePath, newPath)
    } else {
      // Ordner verschieben
      await this.renameFolder(sourcePath, newPath)
    }
  }

  // ===========================================================================
  // Persistenz
  // ===========================================================================

  private persist(): void {
    try {
      // Nur Mirror-Dateien speichern, keine .folder Marker
      const toSave: Record<string, string> = {}
      for (const [path, content] of Object.entries(this.files)) {
        if (isMirrorFile(path)) {
          toSave[path] = content
        }
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave))
    } catch (error) {
      console.warn('[DemoProvider] Failed to persist to localStorage:', error)
    }
  }

  private loadFromStorage(): Record<string, string> | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.warn('[DemoProvider] Failed to load from localStorage:', error)
    }
    return null
  }

  /**
   * Demo-Dateien auf Defaults zurücksetzen
   */
  resetToDefaults(): void {
    this.files = { ...DEFAULT_DEMO_FILES }
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * Prüft ob Demo-Daten modifiziert wurden
   */
  hasModifications(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null
  }
}
