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
  ServerProvider,
  DemoProvider,
  isTauri,
  isServerAvailable
} from './providers'

export type {
  StorageProvider,
  StorageProject,
  StorageItem,
  StorageFile,
  StorageFolder,
  StorageEventMap,
  ProviderType,
  MirrorFileType,
  PreludeFile
} from './types'

export {
  FILE_EXTENSIONS,
  getFileType,
  isMirrorFile
} from './types'
