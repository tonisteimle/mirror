#!/usr/bin/env node

/**
 * Standalone Bridge Server
 *
 * Runs alongside Mirror Studio and provides state to the MCP Server.
 * Watches .mirror files and tracks cursor position.
 *
 * Usage:
 *   npx mirror-bridge /path/to/project
 *
 * This creates a WebSocket server that the MCP Server connects to.
 */

import { WebSocketServer, WebSocket } from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const PORT = 24601

interface MirrorState {
  filePath: string | null
  fileContent: string | null
  selection: {
    line: number
    column: number
    elementType: string | null
  } | null
  tokens: Array<{ name: string; value: string; line: number }>
  components: Array<{ name: string; line: number }>
  errors: Array<{ line: number; message: string }>
}

class StandaloneBridge {
  private wss: WebSocketServer
  private state: MirrorState = {
    filePath: null,
    fileContent: null,
    selection: null,
    tokens: [],
    components: [],
    errors: [],
  }
  private watcher: fs.FSWatcher | null = null
  private projectPath: string

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath)

    // Create WebSocket server
    this.wss = new WebSocketServer({ port: PORT })

    this.wss.on('connection', (ws) => {
      console.log('[Bridge] MCP Server connected')

      // Send current state
      ws.send(JSON.stringify({ type: 'state', state: this.state }))

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(message, ws)
        } catch (e) {
          console.error('[Bridge] Invalid message:', e)
        }
      })

      ws.on('close', () => {
        console.log('[Bridge] MCP Server disconnected')
      })
    })

    console.log(`[Bridge] WebSocket server listening on port ${PORT}`)

    // Watch for .mirror files
    this.watchProject()

    // Interactive mode for setting cursor position
    this.startInteractive()
  }

  private handleMessage(message: any, ws: WebSocket): void {
    switch (message.type) {
      case 'request-state':
        ws.send(JSON.stringify({ type: 'state', state: this.state }))
        break

      case 'select-element':
        console.log(`[Bridge] Select element at line ${message.line}`)
        this.state.selection = {
          line: message.line,
          column: 0,
          elementType: null,
        }
        this.broadcast({ type: 'state-update', partial: { selection: this.state.selection } })
        break

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }))
        break
    }
  }

  private watchProject(): void {
    // Find .mirror files
    const files = this.findMirrorFiles(this.projectPath)

    if (files.length === 0) {
      console.log('[Bridge] No .mirror files found in', this.projectPath)
      return
    }

    // Watch first file for now
    const file = files[0]
    this.watchFile(file)
  }

  private findMirrorFiles(dir: string): string[] {
    const files: string[] = []

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.findMirrorFiles(path.join(dir, entry.name)))
        } else if (entry.isFile() && entry.name.endsWith('.mirror')) {
          files.push(path.join(dir, entry.name))
        }
      }
    } catch (e) {
      // Ignore permission errors
    }

    return files
  }

  private watchFile(filePath: string): void {
    console.log('[Bridge] Watching:', filePath)

    this.state.filePath = filePath
    this.loadFile(filePath)

    if (this.watcher) {
      this.watcher.close()
    }

    this.watcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        this.loadFile(filePath)
      }
    })
  }

  private loadFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      this.state.fileContent = content
      this.parseContent(content)

      console.log(`[Bridge] File updated: ${path.basename(filePath)}`)
      this.broadcast({ type: 'state-update', partial: {
        fileContent: content,
        tokens: this.state.tokens,
        components: this.state.components,
      }})
    } catch (e) {
      console.error('[Bridge] Failed to read file:', e)
    }
  }

  private parseContent(content: string): void {
    const lines = content.split('\n')
    const tokens: MirrorState['tokens'] = []
    const components: MirrorState['components'] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Simple token detection: $name.suffix: value
      const tokenMatch = line.match(/^\$([a-zA-Z][a-zA-Z0-9.]*)\s*:\s*(.+)$/)
      if (tokenMatch) {
        tokens.push({
          name: '$' + tokenMatch[1],
          value: tokenMatch[2].trim(),
          line: lineNum,
        })
      }

      // Simple component detection: Name: (at start of line, capitalized)
      const componentMatch = line.match(/^([A-Z][a-zA-Z0-9]*)\s*:/)
      if (componentMatch && !line.includes('$')) {
        components.push({
          name: componentMatch[1],
          line: lineNum,
        })
      }
    }

    this.state.tokens = tokens
    this.state.components = components
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message)
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  private startInteractive(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    console.log('\n[Bridge] Commands:')
    console.log('  select <line>  - Set cursor to line')
    console.log('  watch <file>   - Watch a different file')
    console.log('  status         - Show current state')
    console.log('  quit           - Exit\n')

    rl.on('line', (input) => {
      const parts = input.trim().split(' ')
      const cmd = parts[0]

      switch (cmd) {
        case 'select':
          const line = parseInt(parts[1], 10)
          if (!isNaN(line)) {
            this.state.selection = { line, column: 0, elementType: null }
            this.broadcast({ type: 'state-update', partial: { selection: this.state.selection } })
            console.log(`[Bridge] Selection set to line ${line}`)
          }
          break

        case 'watch':
          if (parts[1]) {
            const file = path.resolve(parts[1])
            if (fs.existsSync(file)) {
              this.watchFile(file)
            } else {
              console.log('[Bridge] File not found:', file)
            }
          }
          break

        case 'status':
          console.log('[Bridge] Current state:')
          console.log('  File:', this.state.filePath)
          console.log('  Selection:', this.state.selection)
          console.log('  Tokens:', this.state.tokens.length)
          console.log('  Components:', this.state.components.length)
          console.log('  Clients:', this.wss.clients.size)
          break

        case 'quit':
        case 'exit':
          process.exit(0)
          break
      }
    })
  }
}

// Main
const projectPath = process.argv[2] || process.cwd()
new StandaloneBridge(projectPath)
