/**
 * Demo Storage Provider
 *
 * In-Memory Storage (per session).
 * Fallback wenn kein Tauri und kein Server verfügbar.
 */

import type { StorageProvider, StorageProject, StorageItem, StorageFile, StorageFolder } from '../types'
import { isMirrorFile } from '../types'

// =============================================================================
// Default Demo Files
// =============================================================================

const DEFAULT_DEMO_FILES: Record<string, string> = {
  'index.mir': `App bg $app.bg, pad $lg.pad, gap $md.gap
  Text "Mirror Studio", fs 24, weight bold, col $text.col
  Text "Browser Demo Mode", col $muted.col

  Card
    Text "Edit this code to test", col $muted.col
    Button "Click Me"

  // Zag Select Component
  Select placeholder "Choose an option..."
    Item "Option 1"
    Item "Option 2"
    Item "Option 3"`,

  'tokens.tok': `// Design Tokens

// Background Colors
$primary.bg: #3b82f6
$primary-hover.bg: #2563eb
$surface.bg: #27272a
$app.bg: #18181b
$input.bg: #1f1f1f

// Text Colors
$text.col: #ffffff
$muted.col: #a1a1aa

// Border Colors
$border.boc: #333333
$focus.boc: #3b82f6

// Padding
$sm.pad: 8
$md.pad: 16
$lg.pad: 24

// Gap
$sm.gap: 8
$md.gap: 12
$lg.gap: 16

// Radius
$sm.rad: 4
$md.rad: 8
$lg.rad: 12`,

  'components.com': `// Component Definitions

Button:
  pad $sm.pad $md.pad, bg $primary.bg, rad $sm.rad, col white, cursor pointer
  hover bg $primary-hover.bg

Card:
  bg $surface.bg, pad $md.pad, rad $md.rad, gap $sm.gap

Input:
  pad $sm.pad, bg $input.bg, rad $sm.rad, bor 1 $border.boc
  col $text.col
  focus bor 1 $focus.boc`
}

// =============================================================================
// Demo Provider
// =============================================================================

export class DemoProvider implements StorageProvider {
  readonly type = 'demo' as const
  readonly supportsProjects = false
  readonly supportsNativeDialogs = false

  private files: Record<string, string>
  private projectOpen = false
  private hasBeenModified = false

  constructor() {
    // Start with default demo files (in-memory only)
    this.files = { ...DEFAULT_DEMO_FILES }
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

      // .folder Marker überspringen (nur für Ordner-Erstellung)
      if (fileName === '.folder') {
        // Aber Ordner trotzdem erstellen
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
                children: []
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
    this.hasBeenModified = true
  }

  async deleteFile(path: string): Promise<void> {
    if (this.files[path] === undefined) {
      throw new Error(`File not found: ${path}`)
    }
    delete this.files[path]
    this.hasBeenModified = true
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
    this.hasBeenModified = true
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    if (this.files[sourcePath] === undefined) {
      throw new Error(`File not found: ${sourcePath}`)
    }
    if (this.files[targetPath] !== undefined) {
      throw new Error(`File already exists: ${targetPath}`)
    }

    this.files[targetPath] = this.files[sourcePath]
    this.hasBeenModified = true
  }

  // ===========================================================================
  // Ordner-Operationen
  // ===========================================================================

  async createFolder(path: string): Promise<void> {
    // In-Memory: Ordner existieren implizit durch Dateipfade
    // Wir erstellen eine .gitkeep-ähnliche Markierung
    const markerPath = `${path}/.folder`
    this.files[markerPath] = ''
    this.hasBeenModified = true
  }

  async deleteFolder(path: string): Promise<void> {
    // Alle Dateien im Ordner löschen
    const prefix = `${path}/`
    for (const filePath of Object.keys(this.files)) {
      if (filePath.startsWith(prefix)) {
        delete this.files[filePath]
      }
    }
    this.hasBeenModified = true
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

    this.hasBeenModified = true
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
  // State
  // ===========================================================================

  /**
   * Demo-Dateien auf Defaults zurücksetzen
   */
  resetToDefaults(): void {
    this.files = { ...DEFAULT_DEMO_FILES }
    this.hasBeenModified = false
  }

  /**
   * Prüft ob Demo-Daten modifiziert wurden
   */
  hasModifications(): boolean {
    return this.hasBeenModified
  }
}
