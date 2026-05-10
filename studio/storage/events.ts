/**
 * Storage Events
 *
 * Typisierter EventEmitter für Storage-Events.
 */

import type { StorageEventMap } from './types'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('StorageEvents')

type EventCallback<K extends keyof StorageEventMap> = (payload: StorageEventMap[K]) => void

// Storage-set type erased to "some callback for some StorageEventMap key" —
// the per-key narrowing happens at on()/emit()'s generic signature, so the
// internal Map can hold any concrete instantiation safely.
type AnyStorageCallback = (payload: StorageEventMap[keyof StorageEventMap]) => void

/**
 * Typisierter EventEmitter für Storage
 */
export class StorageEventEmitter {
  private handlers = new Map<keyof StorageEventMap, Set<AnyStorageCallback>>()

  /**
   * Event-Listener registrieren
   */
  on<K extends keyof StorageEventMap>(event: K, callback: EventCallback<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    // The Map stores an erased AnyStorageCallback per event-key so a single
    // Set can hold callbacks for different event types. The per-key
    // narrowing at the generic on()/emit() signature is the contract.
    this.handlers.get(event)!.add(callback as AnyStorageCallback)

    // Unsubscribe-Funktion zurückgeben
    return () => {
      this.handlers.get(event)?.delete(callback as AnyStorageCallback)
    }
  }

  /**
   * Einmaliger Event-Listener
   */
  once<K extends keyof StorageEventMap>(event: K, callback: EventCallback<K>): () => void {
    const unsubscribe = this.on(event, payload => {
      unsubscribe()
      callback(payload)
    })
    return unsubscribe
  }

  /**
   * Event emittieren
   */
  emit<K extends keyof StorageEventMap>(event: K, payload: StorageEventMap[K]): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          log.error(`Error in ${event} handler:`, error)
        }
      })
    }
  }

  /**
   * Alle Listener für ein Event entfernen
   */
  off<K extends keyof StorageEventMap>(event: K): void {
    this.handlers.delete(event)
  }

  /**
   * Alle Listener entfernen
   */
  clear(): void {
    this.handlers.clear()
  }
}
