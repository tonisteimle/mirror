/**
 * WebSocketAdapter - Streams drag frames to external tools
 *
 * Connects to a WebSocket server and sends frames in real-time.
 */

import type { ReportAdapter, DragFrame, DragSession } from '../types'
import { createLogger } from '../../../../../compiler/utils/logger'

const log = createLogger('WebSocketAdapter')

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WebSocketAdapterConfig {
  url: string
  reconnect: boolean
  reconnectInterval: number
  maxReconnectAttempts: number
}

const DEFAULT_CONFIG: WebSocketAdapterConfig = {
  url: 'ws://localhost:8765',
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
}

export class WebSocketAdapter implements ReportAdapter {
  private config: WebSocketAdapterConfig
  private ws: WebSocket | null = null
  private state: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private messageQueue: object[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: Partial<WebSocketAdapterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.state === 'connecting' || this.state === 'connected') return
    this.state = 'connecting'
    log.info('Connecting to', this.config.url)
    try {
      this.ws = new WebSocket(this.config.url)
      this.setupEventHandlers()
    } catch (error) {
      log.error('Connection failed:', error)
      this.handleConnectionError()
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.clearReconnectTimer()
    this.reconnectAttempts = 0

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.state = 'disconnected'
    log.info('Disconnected')
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state
  }

  onSessionStart(session: DragSession): void {
    this.send({
      type: 'session-start',
      session,
    })
  }

  onFrame(frame: DragFrame): void {
    this.send({
      type: 'frame',
      frame,
    })
  }

  onSessionEnd(session: DragSession): void {
    this.send({
      type: 'session-end',
      session,
    })
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.state = 'connected'
      this.reconnectAttempts = 0
      log.info('Connected')
      this.flushQueue()
    }

    this.ws.onclose = () => {
      this.state = 'disconnected'
      log.info('Connection closed')
      this.attemptReconnect()
    }

    this.ws.onerror = event => {
      log.error('WebSocket error:', event)
      this.handleConnectionError()
    }

    this.ws.onmessage = event => {
      log.debug('Received:', event.data)
    }
  }

  private send(data: object): void {
    if (this.state === 'connected' && this.ws) {
      try {
        this.ws.send(JSON.stringify(data))
      } catch (error) {
        log.error('Send failed:', error)
        this.messageQueue.push(data)
      }
    } else {
      // Queue message for later
      this.messageQueue.push(data)

      // Limit queue size
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift()
      }
    }
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.state === 'connected') {
      const data = this.messageQueue.shift()
      if (data) {
        this.send(data)
      }
    }
  }

  private handleConnectionError(): void {
    this.state = 'error'
    this.attemptReconnect()
  }

  private attemptReconnect(): void {
    if (!this.config.reconnect) return
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      log.warn('Max reconnect attempts reached')
      return
    }
    this.clearReconnectTimer()
    this.reconnectAttempts++
    log.info(
      `Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts})`
    )
    this.reconnectTimer = setTimeout(() => this.connect(), this.config.reconnectInterval)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  destroy(): void {
    this.disconnect()
    this.messageQueue = []
  }
}
