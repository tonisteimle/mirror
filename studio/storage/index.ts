/**
 * Storage Module
 *
 * Abstrahiertes Speichersystem für Mirror Studio.
 *
 * @example
 * ```typescript
 * import { storage } from './storage'
 *
 * // Initialisieren (einmal beim App-Start)
 * await storage.init()
 *
 * // Projekt öffnen
 * await storage.openProject('path/to/project')
 *
 * // Datei lesen
 * const content = await storage.readFile('index.mir')
 *
 * // Datei speichern
 * await storage.writeFile('index.mir', content)
 *
 * // Events abonnieren
 * storage.events.on('file:changed', ({ path, content }) => {
 *   console.log('File changed:', path)
 * })
 * ```
 */

import { StorageService } from './service'

// =============================================================================
// Singleton
// =============================================================================

/**
 * Globale Storage-Instanz (Singleton)
 */
export const storage = new StorageService()

// =============================================================================
// Re-Exports
// =============================================================================

export { StorageService } from './service'
export { StorageEventEmitter } from './events'

export {
  detectProvider,
  createProvider,
  TauriProvider,
  LocalStorageProvider,
  isTauri,
  isLocalStorageAvailable,
} from './providers'

// User settings (recent icons, agent memory)
export { getUserSettings, initUserSettings } from './user-settings'

// Project actions (new, demo, import, export)
export {
  projectActions,
  newProject,
  loadDemoProject,
  importProject,
  exportProject,
  DEFAULT_PROJECT,
} from './project-actions'

export type {
  StorageProvider,
  StorageProject,
  StorageItem,
  StorageFile,
  StorageFolder,
  StorageEventMap,
  ProviderType,
  MirrorFileType,
  PreludeFile,
} from './types'

export { FILE_EXTENSIONS, getFileType, isMirrorFile } from './types'
