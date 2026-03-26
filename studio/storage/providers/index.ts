/**
 * Storage Provider Factory
 *
 * Automatische Erkennung und Erstellung des richtigen Providers.
 */

import type { StorageProvider } from '../types'
import { TauriProvider, isTauri } from './tauri'
import { ServerProvider, isServerAvailable } from './server'

export { TauriProvider, isTauri } from './tauri'
export { ServerProvider, isServerAvailable } from './server'

/**
 * Erkennt automatisch den verfügbaren Provider
 *
 * Priorität:
 * 1. Tauri (Desktop-App)
 * 2. Server (PHP API) - kein Fallback, Server ist erforderlich
 */
export async function detectProvider(): Promise<StorageProvider> {
  // 1. Tauri verfügbar?
  if (isTauri()) {
    console.log('[Storage] Tauri detected, using TauriProvider')
    return new TauriProvider()
  }

  // 2. Server (immer verwenden, kein Demo-Fallback)
  console.log('[Storage] Using ServerProvider')
  return new ServerProvider()
}

/**
 * Erstellt einen spezifischen Provider
 */
export function createProvider(type: 'tauri' | 'server'): StorageProvider {
  switch (type) {
    case 'tauri':
      return new TauriProvider()
    case 'server':
      return new ServerProvider()
    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}
