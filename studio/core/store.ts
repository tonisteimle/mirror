/**
 * Generic Store Implementation
 *
 * Simple state management with subscription support.
 * Extracted from state.ts for reusability.
 */

import type { Subscriber } from './state-types'
import { events } from './events'

/**
 * Generic reactive store with subscription support.
 * Provides get/set/subscribe pattern for state management.
 */
export class Store<T extends object> {
  private state: T
  private subscribers: Set<Subscriber<T>> = new Set()

  constructor(initialState: T) {
    this.state = initialState
  }

  /**
   * Get current state (readonly)
   */
  get(): Readonly<T> {
    return this.state
  }

  /**
   * Update state with partial values
   */
  set(partial: Partial<T>): void {
    const prevState = this.state
    this.state = { ...this.state, ...partial }
    this.notify(prevState)
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(subscriber: Subscriber<T>): () => void {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  /**
   * Notify all subscribers of state change
   */
  private notify(prevState: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(this.state, prevState)
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        console.error('[Store] Subscriber error:', error.message, error.stack)
        // Emit error event for centralized error handling
        events.emit('state:error', {
          error,
          context: 'subscriber notification',
        })
      }
    }
  }
}
