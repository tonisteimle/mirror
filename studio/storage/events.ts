/**
 * Storage Events
 *
 * Typisierter EventEmitter für Storage-Events.
 */

import type { StorageEventMap } from './types'

type EventCallback<K extends keyof StorageEventMap> = (payload: StorageEventMap[K]) => void

/**
 * Typisierter EventEmitter für Storage
 */
export class StorageEventEmitter {
  private handlers = new Map<keyof StorageEventMap, Set<EventCallback<any>>>()

  /**
   * Event-Listener registrieren
   */
  on<K extends keyof StorageEventMap>(event: K, callback: EventCallback<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(callback)

    // Unsubscribe-Funktion zurückgeben
    return () => {
      this.handlers.get(event)?.delete(callback)
    }
  }

  /**
   * Einmaliger Event-Listener
   */
  once<K extends keyof StorageEventMap>(event: K, callback: EventCallback<K>): () => void {
    const unsubscribe = this.on(event, (payload) => {
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
          console.error(`[StorageEvents] Error in ${event} handler:`, error)
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
