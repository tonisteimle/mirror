import WebSocket from 'ws'
import type {
  MirrorStudioState,
  MCPToStudioMessage,
  StudioToMCPMessage,
} from './types.js'

const MIRROR_STUDIO_PORT = 24601
const RECONNECT_INTERVAL = 2000

/**
 * WebSocket bridge to Mirror Studio
 * Maintains connection and syncs state
 */
export class MirrorBridge {
  private ws: WebSocket | null = null
  private state: MirrorStudioState = {
    filePath: null,
    fileContent: null,
    selection: null,
    tokens: [],
    components: [],
    errors: [],
  }
  private reconnectTimer: NodeJS.Timeout | null = null
  private connected = false

  constructor() {
    this.connect()
  }

  /**
   * Connect to Mirror Studio
   */
  private connect(): void {
    if (this.ws) {
      this.ws.close()
    }

    const url = `ws://localhost:${MIRROR_STUDIO_PORT}`

    try {
      this.ws = new WebSocket(url)

      this.ws.on('open', () => {
        this.connected = true
        console.error('[MCP Bridge] Connected to Mirror Studio')
        this.requestState()
      })

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as StudioToMCPMessage
          this.handleMessage(message)
        } catch (e) {
          console.error('[MCP Bridge] Failed to parse message:', e)
        }
      })

      this.ws.on('close', () => {
        this.connected = false
        console.error('[MCP Bridge] Disconnected from Mirror Studio')
        this.scheduleReconnect()
      })

      this.ws.on('error', (error) => {
        // Don't log connection refused errors (Studio not running)
        if ((error as NodeJS.ErrnoException).code !== 'ECONNREFUSED') {
          console.error('[MCP Bridge] WebSocket error:', error.message)
        }
        this.scheduleReconnect()
      })
    } catch (e) {
      this.scheduleReconnect()
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, RECONNECT_INTERVAL)
  }

  /**
   * Handle incoming message from Mirror Studio
   */
  private handleMessage(message: StudioToMCPMessage): void {
    switch (message.type) {
      case 'state':
        this.state = message.state
        break
      case 'state-update':
        this.state = { ...this.state, ...message.partial }
        break
      case 'pong':
        // Connection alive
        break
    }
  }

  /**
   * Send message to Mirror Studio
   */
  private send(message: MCPToStudioMessage): void {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Request full state from Mirror Studio
   */
  requestState(): void {
    this.send({ type: 'request-state' })
  }

  /**
   * Request Mirror Studio to select an element
   */
  selectElement(line: number): void {
    this.send({ type: 'select-element', line })
  }

  /**
   * Get current state
   */
  getState(): MirrorStudioState {
    return this.state
  }

  /**
   * Check if connected to Mirror Studio
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    if (this.ws) {
      this.ws.close()
    }
  }
}
