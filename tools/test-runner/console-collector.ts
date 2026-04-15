/**
 * Console Message Collector
 *
 * Collects and categorizes browser console messages.
 * Single responsibility: console message management.
 */

import type { CDPSession, ConsoleMessage } from './types'

// =============================================================================
// Console Collector
// =============================================================================

export class ConsoleCollector {
  private messages: ConsoleMessage[] = []
  private handlers: ((msg: ConsoleMessage) => void)[] = []

  /**
   * Attach to CDP session and start collecting
   */
  attach(cdp: CDPSession): void {
    cdp.on('Runtime.consoleAPICalled', (params: unknown) => {
      const message = this.parseConsoleCall(params)
      this.messages.push(message)
      this.notifyHandlers(message)
    })

    cdp.on('Console.messageAdded', (params: unknown) => {
      const message = this.parseLegacyMessage(params)
      this.messages.push(message)
      this.notifyHandlers(message)
    })
  }

  /**
   * Subscribe to new messages
   */
  onMessage(handler: (msg: ConsoleMessage) => void): () => void {
    this.handlers.push(handler)
    return () => {
      const index = this.handlers.indexOf(handler)
      if (index >= 0) this.handlers.splice(index, 1)
    }
  }

  /**
   * Get all collected messages
   */
  getAll(): ConsoleMessage[] {
    return [...this.messages]
  }

  /**
   * Get only error messages
   */
  getErrors(): ConsoleMessage[] {
    return this.messages.filter(m => m.type === 'error')
  }

  /**
   * Get only warnings
   */
  getWarnings(): ConsoleMessage[] {
    return this.messages.filter(m => m.type === 'warn')
  }

  /**
   * Clear collected messages
   */
  clear(): void {
    this.messages = []
  }

  /**
   * Get messages since a timestamp
   */
  getSince(timestamp: Date): ConsoleMessage[] {
    return this.messages.filter(m => m.timestamp >= timestamp)
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private parseConsoleCall(params: unknown): ConsoleMessage {
    const { type, args } = params as {
      type: string
      args: { value?: string; description?: string }[]
    }

    const text = args.map(a => a.value ?? a.description ?? '').join(' ')

    return {
      type: this.normalizeType(type),
      text,
      timestamp: new Date(),
    }
  }

  private parseLegacyMessage(params: unknown): ConsoleMessage {
    const { message } = params as { message: { text: string; level?: string } }

    return {
      type: this.normalizeType(message.level || 'log'),
      text: message.text,
      timestamp: new Date(),
    }
  }

  private normalizeType(type: string): ConsoleMessage['type'] {
    switch (type) {
      case 'error':
        return 'error'
      case 'warning':
      case 'warn':
        return 'warn'
      case 'info':
        return 'info'
      case 'debug':
        return 'debug'
      default:
        return 'log'
    }
  }

  private notifyHandlers(message: ConsoleMessage): void {
    for (const handler of this.handlers) {
      handler(message)
    }
  }
}
