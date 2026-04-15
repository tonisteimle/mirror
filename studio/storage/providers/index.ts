/**
 * Storage Provider Factory
 *
 * Automatische Erkennung und Erstellung des richtigen Providers.
 */

import type { StorageProvider, ProviderType } from '../types'
import { TauriProvider, isTauri } from './tauri'
import { LocalStorageProvider, isLocalStorageAvailable } from './localstorage'
import { DemoProvider } from './demo'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('Storage')

export { TauriProvider, isTauri } from './tauri'
export { LocalStorageProvider, isLocalStorageAvailable } from './localstorage'
export { DemoProvider } from './demo'

/**
 * Erkennt automatisch den verfügbaren Provider
 *
 * Priorität:
 * 1. Tauri (Desktop-App)
 * 2. LocalStorage (Browser)
 */
export async function detectProvider(): Promise<StorageProvider> {
  if (isTauri()) {
    log.info('Tauri detected, using TauriProvider')
    return new TauriProvider()
  }
  if (isLocalStorageAvailable()) {
    log.info('Using LocalStorageProvider')
    return new LocalStorageProvider()
  }
  throw new Error('No storage provider available')
}

/**
 * Erstellt einen spezifischen Provider
 */
export function createProvider(type: ProviderType): StorageProvider {
  switch (type) {
    case 'tauri':
      return new TauriProvider()
    case 'localstorage':
      return new LocalStorageProvider()
    case 'demo':
      return new DemoProvider()
    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}
