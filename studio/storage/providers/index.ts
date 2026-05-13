/**
 * Storage Provider Factory
 *
 * Automatische Erkennung und Erstellung des richtigen Providers.
 */

import type { StorageProvider, ProviderType } from '../types'
import { TauriProvider, isTauri } from './tauri'
import { BridgeProvider, isBridgeAvailable } from './bridge'
import { LocalStorageProvider, isLocalStorageAvailable } from './localstorage'
import { DemoProvider } from './demo'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('Storage')

export { TauriProvider, isTauri } from './tauri'
export { BridgeProvider, isBridgeAvailable } from './bridge'
export { LocalStorageProvider, isLocalStorageAvailable } from './localstorage'
export { DemoProvider } from './demo'

/**
 * Erkennt automatisch den verfügbaren Provider.
 *
 * Priorität:
 *   1. Tauri (Desktop-App)
 *   2. Bridge (Browser + AI-Bridge-Server läuft → echtes Filesystem)
 *   3. LocalStorage (Browser, Fallback)
 *
 * Die Bridge-Probe hat einen 800 ms Timeout — ist der Server nicht da,
 * fällt die Detection still auf LocalStorage zurück. Heißt: User muss
 * den Bridge-Server manuell starten (`npm run ai-bridge`), Studio
 * erkennt das automatisch beim Reload.
 */
export async function detectProvider(): Promise<StorageProvider> {
  if (isTauri()) {
    log.info('Tauri detected, using TauriProvider')
    return new TauriProvider()
  }
  if (await isBridgeAvailable()) {
    log.info('AI-Bridge detected, using BridgeProvider')
    return new BridgeProvider()
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
    case 'bridge':
      return new BridgeProvider()
    case 'localstorage':
      return new LocalStorageProvider()
    case 'demo':
      return new DemoProvider()
    default:
      throw new Error(`Unknown provider type: ${type}`)
  }
}
