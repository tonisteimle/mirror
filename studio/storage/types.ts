/**
 * Storage Types
 *
 * Einheitliche Typen für alle Storage-Provider.
 */

// =============================================================================
// File & Folder Types
// =============================================================================

/**
 * Datei-Repräsentation
 */
export interface StorageFile {
  name: string           // "button.mir"
  path: string           // "components/button.mir" (relativ)
  type: 'file'
  updatedAt?: Date
}

/**
 * Ordner-Repräsentation
 */
export interface StorageFolder {
  name: string           // "components"
  path: string           // "components" (relativ)
  type: 'folder'
  children: StorageItem[]
}

/**
 * Datei oder Ordner
 */
export type StorageItem = StorageFile | StorageFolder

/**
 * Projekt-Metadaten
 */
export interface StorageProject {
  id: string             // Eindeutige ID (Tauri: Pfad, Server: UUID)
  name: string           // Anzeigename
  createdAt?: Date
  updatedAt?: Date
}

// =============================================================================
// File Extensions & Types
// =============================================================================

/**
 * Unterstützte Datei-Extensions
 */
export const FILE_EXTENSIONS = {
  layout: ['.mir', '.mirror'],
  tokens: ['.tok', '.tokens'],
  component: ['.com', '.components']
} as const

export type MirrorFileType = 'layout' | 'tokens' | 'component' | 'unknown'

/**
 * Ermittelt den Dateityp anhand der Extension
 */
export function getFileType(filename: string): MirrorFileType {
  for (const [type, extensions] of Object.entries(FILE_EXTENSIONS)) {
    if (extensions.some(ext => filename.endsWith(ext))) {
      return type as MirrorFileType
    }
  }
  return 'unknown'
}

/**
 * Prüft ob eine Datei eine Mirror-Datei ist
 */
export function isMirrorFile(filename: string): boolean {
  const allExtensions = Object.values(FILE_EXTENSIONS).flat()
  return allExtensions.some(ext => filename.endsWith(ext))
}

// =============================================================================
// Provider Interface
// =============================================================================

export type ProviderType = 'tauri' | 'server' | 'demo' | 'localstorage'

/**
 * Storage Provider Interface
 *
 * Jeder Provider (Tauri, Server, Demo) implementiert dieses Interface.
 */
export interface StorageProvider {
  // === Meta ===
  readonly type: ProviderType
  readonly supportsProjects: boolean
  readonly supportsNativeDialogs: boolean

  // === Projekt-Operationen ===
  listProjects(): Promise<StorageProject[]>
  createProject(name: string): Promise<StorageProject>
  deleteProject(id: string): Promise<void>
  openProject(id: string): Promise<void>
  closeProject(): Promise<void>

  // === Datei-Baum ===
  getTree(): Promise<StorageItem[]>

  // === Datei-Operationen ===
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  renameFile(oldPath: string, newPath: string): Promise<void>
  copyFile(sourcePath: string, targetPath: string): Promise<void>

  // === Ordner-Operationen ===
  createFolder(path: string): Promise<void>
  deleteFolder(path: string): Promise<void>
  renameFolder(oldPath: string, newPath: string): Promise<void>

  // === Item verschieben ===
  moveItem(sourcePath: string, targetFolder: string): Promise<void>

  // === Native Dialoge (optional, nur Tauri) ===
  openFolderDialog?(): Promise<string | null>
  openFileDialog?(): Promise<string | null>
}

// =============================================================================
// Event Types
// =============================================================================

export interface StorageEventMap {
  'file:created': { path: string }
  'file:changed': { path: string; content: string }
  'file:deleted': { path: string }
  'file:renamed': { oldPath: string; newPath: string }
  'folder:created': { path: string }
  'folder:deleted': { path: string }
  'tree:changed': { tree: StorageItem[] }
  'project:opened': { project: StorageProject }
  'project:closed': Record<string, never>
  'error': { error: Error; operation: string; path?: string; recoverable: boolean }
}

// =============================================================================
// Prelude Types
// =============================================================================

export interface PreludeFile {
  path: string
  content: string
  type: 'tokens' | 'component'
}
