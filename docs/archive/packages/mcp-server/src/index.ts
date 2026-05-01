#!/usr/bin/env node

/**
 * Mirror MCP Server
 *
 * Provides Claude Code with context about Mirror Studio:
 * - Current file content
 * - Selected element
 * - Defined tokens and components
 * - Validation errors
 *
 * Usage:
 *   npx @anthropic/mirror-mcp-server
 *
 * Or configure in Claude Code settings:
 *   {
 *     "mcpServers": {
 *       "mirror": {
 *         "command": "npx",
 *         "args": ["@anthropic/mirror-mcp-server"]
 *       }
 *     }
 *   }
 */

import { MirrorMCPServer } from './server.js'

async function main(): Promise<void> {
  const server = new MirrorMCPServer()

  // Handle shutdown
  process.on('SIGINT', async () => {
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await server.stop()
    process.exit(0)
  })

  // Start server
  await server.start()
}

main().catch((error) => {
  console.error('[Mirror MCP] Fatal error:', error)
  process.exit(1)
})
