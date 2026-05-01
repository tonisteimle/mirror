#!/usr/bin/env node
/**
 * Playwright Pool MCP Server
 *
 * Multi-session browser pool that allows multiple Claude Code sessions
 * to use Playwright simultaneously without conflicts.
 *
 * Architecture:
 * - Each session gets its own isolated browser context
 * - Sessions are identified by CLAUDE_SESSION_ID env var or auto-generated
 * - Inactive sessions are cleaned up after timeout
 * - All standard Playwright MCP tools are supported
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

// ============================================
// Types
// ============================================

interface BrowserSession {
  id: string
  browser: Browser
  context: BrowserContext
  page: Page
  lastActivity: number
  consoleMessages: Array<{ type: string; text: string }>
}

// ============================================
// Browser Pool Manager
// ============================================

class BrowserPool {
  private sessions: Map<string, BrowserSession> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes inactivity timeout

  constructor() {
    // Start cleanup timer
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000)
  }

  async getSession(sessionId: string): Promise<BrowserSession> {
    let session = this.sessions.get(sessionId)

    if (!session) {
      session = await this.createSession(sessionId)
      this.sessions.set(sessionId, session)
    }

    session.lastActivity = Date.now()
    return session
  }

  private async createSession(sessionId: string): Promise<BrowserSession> {
    console.error(`[Pool] Creating new browser session: ${sessionId}`)

    const browser = await chromium.launch({
      headless: process.env.HEADLESS === 'true',
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    })

    const page = await context.newPage()
    const consoleMessages: Array<{ type: string; text: string }> = []

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      })
      // Keep only last 100 messages
      if (consoleMessages.length > 100) {
        consoleMessages.shift()
      }
    })

    return {
      id: sessionId,
      browser,
      context,
      page,
      lastActivity: Date.now(),
      consoleMessages,
    }
  }

  private async cleanup(): Promise<void> {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.TIMEOUT_MS) {
        toRemove.push(id)
      }
    }

    for (const id of toRemove) {
      await this.closeSession(id)
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      console.error(`[Pool] Closing browser session: ${sessionId}`)
      await session.browser.close().catch(() => {})
      this.sessions.delete(sessionId)
    }
  }

  async closeAll(): Promise<void> {
    for (const id of this.sessions.keys()) {
      await this.closeSession(id)
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }

  getStats(): { sessions: number; ids: string[] } {
    return {
      sessions: this.sessions.size,
      ids: Array.from(this.sessions.keys()),
    }
  }
}

// ============================================
// Tool Definitions
// ============================================

const TOOLS: Tool[] = [
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_snapshot',
    description: 'Capture accessibility snapshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'browser_click',
    description: 'Click on an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or text to click' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'browser_type',
    description: 'Type text into an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of input' },
        text: { type: 'string', description: 'Text to type' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', description: 'Capture full page' },
      },
    },
  },
  {
    name: 'browser_console',
    description: 'Get console messages from the page',
    inputSchema: {
      type: 'object',
      properties: {
        onlyErrors: { type: 'boolean', description: 'Only return errors' },
      },
    },
  },
  {
    name: 'browser_evaluate',
    description: 'Evaluate JavaScript in the page',
    inputSchema: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'JavaScript to evaluate' },
      },
      required: ['script'],
    },
  },
  {
    name: 'browser_close',
    description: 'Close the browser session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'pool_stats',
    description: 'Get statistics about the browser pool',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

// ============================================
// Tool Handlers
// ============================================

async function handleTool(
  pool: BrowserPool,
  sessionId: string,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  // Pool management tools don't need a session
  if (name === 'pool_stats') {
    return JSON.stringify(pool.getStats(), null, 2)
  }

  if (name === 'browser_close') {
    await pool.closeSession(sessionId)
    return 'Browser session closed'
  }

  // All other tools need an active session
  const session = await pool.getSession(sessionId)
  const { page } = session

  switch (name) {
    case 'browser_navigate': {
      const url = args.url as string
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return `Navigated to ${url}\nTitle: ${await page.title()}`
    }

    case 'browser_snapshot': {
      // Get page content as simplified structure
      const title = await page.title()
      const url = page.url()
      const content = await page.evaluate(() => {
        const getText = (el: Element): string => {
          const text = el.textContent?.trim() || ''
          return text.substring(0, 100)
        }
        const getTree = (el: Element, depth = 0): object | null => {
          if (depth > 5) return null
          const tag = el.tagName.toLowerCase()
          const role = el.getAttribute('role')
          const text =
            el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? getText(el) : ''
          const children = Array.from(el.children)
            .map(c => getTree(c, depth + 1))
            .filter(Boolean)
          return {
            tag,
            role,
            text: text || undefined,
            children: children.length ? children : undefined,
          }
        }
        return getTree(document.body)
      })
      return JSON.stringify({ title, url, content }, null, 2)
    }

    case 'browser_click': {
      const selector = args.selector as string
      // Try as CSS selector first, then as text
      try {
        await page.click(selector, { timeout: 5000 })
      } catch {
        await page.getByText(selector).click({ timeout: 5000 })
      }
      return `Clicked: ${selector}`
    }

    case 'browser_type': {
      const selector = args.selector as string
      const text = args.text as string
      await page.fill(selector, text)
      return `Typed "${text}" into ${selector}`
    }

    case 'browser_screenshot': {
      const fullPage = args.fullPage as boolean | undefined
      const buffer = await page.screenshot({ fullPage: fullPage ?? false })
      const base64 = buffer.toString('base64')
      return `data:image/png;base64,${base64}`
    }

    case 'browser_console': {
      const onlyErrors = args.onlyErrors as boolean | undefined
      let messages = session.consoleMessages
      if (onlyErrors) {
        messages = messages.filter(m => m.type === 'error')
      }
      return JSON.stringify(messages, null, 2)
    }

    case 'browser_evaluate': {
      const script = args.script as string
      const result = await page.evaluate(script)
      return JSON.stringify(result, null, 2)
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ============================================
// MCP Server
// ============================================

async function main() {
  const sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`
  console.error(`[Pool] Starting with session ID: ${sessionId}`)

  const pool = new BrowserPool()
  const server = new Server(
    {
      name: 'playwright-pool',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }))

  // Call tool
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params

    try {
      const result = await handleTool(pool, sessionId, name, args || {})
      return {
        content: [{ type: 'text', text: result }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      }
    }
  })

  // Cleanup on exit
  process.on('SIGINT', async () => {
    await pool.closeAll()
    process.exit(0)
  })
  process.on('SIGTERM', async () => {
    await pool.closeAll()
    process.exit(0)
  })

  // Start server
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[Pool] MCP Server started')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
