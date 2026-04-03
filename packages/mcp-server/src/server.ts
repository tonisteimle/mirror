import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { MirrorBridge } from './bridge.js'
import { RESOURCES, getResourceContent } from './resources/index.js'
import { TOOLS, executeTool } from './tools/index.js'
import { PROMPTS, getPromptContent } from './prompts/index.js'

/**
 * Mirror MCP Server
 * Provides Claude Code with context about Mirror Studio
 */
export class MirrorMCPServer {
  private server: Server
  private bridge: MirrorBridge

  constructor() {
    this.bridge = new MirrorBridge()

    this.server = new Server(
      {
        name: 'mirror-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    )

    this.setupHandlers()
  }

  private setupHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: RESOURCES.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      }
    })

    // Read a specific resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri
      const content = getResourceContent(uri, this.bridge)
      const resource = RESOURCES.find((r) => r.uri === uri)

      return {
        contents: [
          {
            uri,
            mimeType: resource?.mimeType || 'application/json',
            text: content,
          },
        ],
      }
    })

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }
    })

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      const result = await executeTool(name, args || {}, this.bridge)

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      }
    })

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: PROMPTS.map((p) => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        })),
      }
    })

    // Get a specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      const state = this.bridge.getState()
      const fileContent = state.fileContent || ''

      const result = getPromptContent(name, args || {}, fileContent)

      return {
        messages: result.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: {
            type: 'text' as const,
            text: m.content,
          },
        })),
      }
    })
  }

  /**
   * Start the server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('[Mirror MCP] Server started')
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    this.bridge.close()
    await this.server.close()
  }
}
