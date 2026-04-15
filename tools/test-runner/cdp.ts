/**
 * Chrome DevTools Protocol Client
 *
 * Minimal CDP implementation over WebSocket.
 * Single responsibility: CDP communication.
 */

import * as http from 'http'
import type { CDPSession } from './types'

// =============================================================================
// CDP Connection
// =============================================================================

export async function connectCDP(wsEndpoint: string): Promise<CDPSession> {
  const WebSocket = (await import('ws')).default

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsEndpoint)
    let messageId = 0
    const callbacks = new Map<
      number,
      { resolve: (v: unknown) => void; reject: (e: Error) => void }
    >()
    const eventHandlers = new Map<string, Set<(params: unknown) => void>>()

    ws.on('open', () => {
      resolve(createSession(ws, () => ++messageId, callbacks, eventHandlers))
    })

    ws.on('message', (data: Buffer) => {
      handleMessage(data, callbacks, eventHandlers)
    })

    ws.on('error', reject)
  })
}

// =============================================================================
// Session Factory
// =============================================================================

function createSession(
  ws: InstanceType<typeof import('ws').default>,
  nextId: () => number,
  callbacks: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>,
  eventHandlers: Map<string, Set<(params: unknown) => void>>
): CDPSession {
  return {
    send: <T>(method: string, params: Record<string, unknown> = {}): Promise<T> => {
      return new Promise((resolve, reject) => {
        const id = nextId()
        callbacks.set(id, {
          resolve: resolve as (v: unknown) => void,
          reject,
        })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },

    on: (event: string, handler: (params: unknown) => void) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
    },

    off: (event: string, handler: (params: unknown) => void) => {
      eventHandlers.get(event)?.delete(handler)
    },

    close: () => ws.close(),
  }
}

// =============================================================================
// Message Handling
// =============================================================================

function handleMessage(
  data: Buffer,
  callbacks: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>,
  eventHandlers: Map<string, Set<(params: unknown) => void>>
): void {
  const msg = JSON.parse(data.toString())

  // Response to a command
  if (msg.id !== undefined && callbacks.has(msg.id)) {
    const cb = callbacks.get(msg.id)!
    callbacks.delete(msg.id)

    if (msg.error) {
      cb.reject(new Error(msg.error.message))
    } else {
      cb.resolve(msg.result)
    }
    return
  }

  // Event
  if (msg.method) {
    const handlers = eventHandlers.get(msg.method)
    if (handlers) {
      for (const handler of handlers) {
        handler(msg.params)
      }
    }
  }
}

// =============================================================================
// Target Discovery
// =============================================================================

export async function getPageTarget(port: number): Promise<string> {
  const response = await httpGet(`http://127.0.0.1:${port}/json`)
  const targets = JSON.parse(response)
  const pageTarget = targets.find((t: { type: string }) => t.type === 'page')

  if (!pageTarget) {
    throw new Error('No page target found')
  }

  return pageTarget.webSocketDebuggerUrl
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}
