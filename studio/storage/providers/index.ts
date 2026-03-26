/**
 * Storage Provider Factory
 *
 * Automatische Erkennung und Erstellung des richtigen Providers.
 */

import type { StorageProvider } from '../types'
import { TauriProvider, isTauri } from './tauri'
import { ServerProvider, isServerAvailable } from './server'
import { DemoProvider } from './demo'

export { TauriProvider, isTauri } from './tauri'
export { ServerProvider, isServerAvailable } from './server'
export { DemoProvider } from './demo'

/**
 * Erkennt automatisch den verfügbaren Provider
 *
 * Priorität:
 * 1. Tauri (Desktop-App)
 * 2. Server (PHP API)
 * 3. Demo (Fallback)
 */
export async function detectProvider(): Promise<StorageProvider> {
  // 1. Tauri verfügbar?
  if (isTauri()) {
    console.log('[Storage] Tauri detected, using TauriProvider')
    return new TauriProvider()
  }

  // 2. Server erreichbar?
  if (await isServerAvailable()) {
    console.log('[Storage] Server detected, using ServerProvider')
    return new ServerProvider()
  }

  // 3. No fallback - server is required
  console.error('[Storage] Server not available')
  // Still use ServerProvider - it will create projects when server becomes available
  return new ServerProvider()
}

/**
 * Erstellt einen spezifischen Provider
 */
export function createProvider(type: 'tauri' | 'server' | 'demo'): StorageProvider {
  switch (type) {
    case 'tauri':
      return new TauriProvider()
    case 'server':
      return new ServerProvider()
    case 'demo':
      return new DemoProvider()
    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}
