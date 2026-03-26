/**
 * Storage Provider Factory
 *
 * Automatische Erkennung und Erstellung des richtigen Providers.
 */

import type { StorageProvider } from '../types'
import { TauriProvider, isTauri } from './tauri'
import { LocalStorageProvider, isLocalStorageAvailable } from './localstorage'

export { TauriProvider, isTauri } from './tauri'
export { LocalStorageProvider, isLocalStorageAvailable } from './localstorage'

/**
 * Erkennt automatisch den verfügbaren Provider
 *
 * Priorität:
 * 1. Tauri (Desktop-App)
 * 2. LocalStorage (Browser)
 */
export async function detectProvider(): Promise<StorageProvider> {
  // 1. Tauri verfügbar?
  if (isTauri()) {
    console.log('[Storage] Tauri detected, using TauriProvider')
    return new TauriProvider()
  }

  // 2. LocalStorage (Standard für Browser)
  if (isLocalStorageAvailable()) {
    console.log('[Storage] Using LocalStorageProvider')
    return new LocalStorageProvider()
  }

  // Fallback: sollte nie passieren
  throw new Error('No storage provider available')
}

/**
 * Erstellt einen spezifischen Provider
 */
export function createProvider(type: 'tauri' | 'localstorage'): StorageProvider {
  switch (type) {
    case 'tauri':
      return new TauriProvider()
    case 'localstorage':
      return new LocalStorageProvider()
    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}
