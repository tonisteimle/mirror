/**
 * Anthropic SDK Agent
 *
 * Uses the official @anthropic-ai/sdk for direct API access.
 * Implements full tool-use agentic loop like MirrorAgent.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  ContentBlock,
  MessageParam,
  ToolUseBlock,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages'
import { buildSystemPrompt, selectPromptMode } from './prompts/system'
import { coreTools } from './tools/core'
import { writeTools } from './tools/write'
import { analyzeTools } from './tools/analyze'
import { generateTools } from './tools/generate'
import { projectTools } from './tools/project'
import { validateTools } from './tools/validate'
import type { AgentEvent, Tool, ToolContext, ToolResult, LLMCommand, FileInfo } from './types'

// All available tools (validate tools first - they're critical)
const allTools = [
  ...validateTools,
  ...projectTools,
  ...coreTools,
  ...writeTools,
  ...analyzeTools,
  ...generateTools,
]

// ============================================
// TYPES
// ============================================

export interface AnthropicSdkAgentConfig {
  /** Anthropic API key */
  apiKey: string
  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string
  /** Maximum iterations for agentic loop */
  maxIterations?: number
  /** Get current code */
  getCode: () => string
  /** Get current file name */
  getCurrentFile?: () => string
  /** Get all project files */
  getFiles?: () => FileInfo[]
  /** Get all code concatenated */
  getAllCode?: () => string
  /** Get cursor position */
  getCursor?: () => { line: number; column: number }
  /** Get selection */
  getSelection?: () => { text: string; from: number; to: number } | null
  /** Available design tokens */
  tokens?: Record<string, string>
  /** Available components */
  components?: string[]
}

// Anthropic SDK tool format
interface AnthropicTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

// ============================================
// ANTHROPIC SDK AGENT
// ============================================

export class AnthropicSdkAgent {
  private config: AnthropicSdkAgentConfig
  private client: Anthropic
  private model: string
  private tools: Map<string, Tool>

  constructor(config: AnthropicSdkAgentConfig) {
    this.config = config
    this.model = config.model || 'claude-sonnet-4-20250514'
    this.client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    })
    this.tools = new Map()

    // Register all tools
    for (const tool of allTools) {
      this.tools.set(tool.name, tool)
    }
  }

  /**
   * Check if the agent is available (has valid API key)
   */
  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey
  }

  /**
   * Run a prompt through the agent with streaming events.
   * Implements the agentic loop: LLM -> tools -> LLM -> ...
   */
  async *run(userPrompt: string): AsyncGenerator<AgentEvent> {
    if (!this.config.apiKey) {
      yield { type: 'error', error: 'Anthropic API key nicht konfiguriert' }
      return
    }

    const maxIterations = this.config.maxIterations || 10
    let iterations = 0

    // Build system prompt — full tutorial when generating from scratch,
    // compact when iterating on existing code.
    const systemPrompt = buildSystemPrompt({
      tokens: this.config.tokens,
      components: this.config.components,
      mode: selectPromptMode(this.config.getCode()),
    })

    // Build initial messages
    const messages: MessageParam[] = [
      {
        role: 'user',
        content: this.buildContextualPrompt(userPrompt),
      },
    ]

    // Build tool definitions
    const toolDefinitions = this.buildToolDefinitions()

    try {
      while (iterations < maxIterations) {
        iterations++

        // Call LLM via Anthropic SDK
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages,
          tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        })

        // Process content blocks
        const assistantContent: ContentBlock[] = []
        const toolUseBlocks: ToolUseBlock[] = []

        for (const block of response.content) {
          if (block.type === 'text') {
            yield { type: 'text', content: block.text }
            assistantContent.push(block)
          } else if (block.type === 'tool_use') {
            toolUseBlocks.push(block)
            assistantContent.push(block)
          }
        }

        // Check for tool calls
        if (toolUseBlocks.length === 0) {
          // No tool calls, we're done
          break
        }

        // Add assistant message to history
        messages.push({
          role: 'assistant',
          content: assistantContent,
        })

        // Process tool calls
        const toolResults: ToolResultBlockParam[] = []

        for (const toolUse of toolUseBlocks) {
          const toolName = toolUse.name
          const toolInput = (toolUse.input as Record<string, unknown>) || {}

          yield {
            type: 'tool_start',
            tool: toolName,
            input: toolInput,
          }

          // Execute the tool
          const result = await this.executeTool(toolName, toolInput)

          yield {
            type: 'tool_end',
            tool: toolName,
            result,
          }

          // Emit commands
          if (result.commands) {
            for (const cmd of result.commands) {
              yield { type: 'command', command: cmd }
            }
          }

          // Add tool result
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          })
        }

        // Add tool results to messages
        messages.push({
          role: 'user',
          content: toolResults,
        })

        // Check if we should stop
        if (response.stop_reason === 'end_turn') {
          break
        }
      }

      yield { type: 'done' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      yield { type: 'error', error: `Anthropic API Fehler: ${message}` }
    }
  }

  /**
   * Simple one-shot query (non-streaming, returns final text)
   */
  async query(userPrompt: string): Promise<{ text: string; commands: LLMCommand[] }> {
    let text = ''
    const commands: LLMCommand[] = []

    for await (const event of this.run(userPrompt)) {
      if (event.type === 'text' && event.content) {
        text += event.content
      }
      if (event.type === 'command' && event.command) {
        commands.push(event.command)
      }
    }

    return { text, commands }
  }

  /**
   * Build contextual prompt with current code state
   */
  private buildContextualPrompt(userPrompt: string): string {
    const code = this.config.getCode()

    let context = `## Current Code

\`\`\`mirror
${code}
\`\`\`
`

    // Add cursor info if available
    if (this.config.getCursor) {
      const cursor = this.config.getCursor()
      context += `
## Cursor Position
Line: ${cursor.line}, Column: ${cursor.column}
`
    }

    // Add selection if any
    if (this.config.getSelection) {
      const selection = this.config.getSelection()
      if (selection) {
        context += `
## Selected Code
\`\`\`mirror
${selection.text}
\`\`\`
`
      }
    }

    // Add available tokens
    const tokens = this.config.tokens
    if (tokens && Object.keys(tokens).length > 0) {
      context += `
## Available Tokens
${Object.entries(tokens)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}
`
    }

    context += `
## User Request
${userPrompt}`

    return context
  }

  /**
   * Build tool definitions for Anthropic SDK
   */
  private buildToolDefinitions(): AnthropicTool[] {
    return Array.from(this.tools.values()).map(tool => {
      const properties: Record<string, unknown> = {}
      const required: string[] = []

      for (const [name, def] of Object.entries(tool.parameters)) {
        const propDef: Record<string, unknown> = {
          type: def.type,
          description: def.description,
        }

        if (def.enum) {
          propDef.enum = def.enum
        }

        properties[name] = propDef

        if (def.required) {
          required.push(name)
        }
      }

      return {
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: 'object' as const,
          properties,
          required,
        },
      }
    })
  }

  /**
   * Execute a tool by name
   */
  private async executeTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` }
    }

    // Build default file info if not provided
    const defaultFiles: FileInfo[] = [
      {
        name: this.config.getCurrentFile?.() || 'main.mirror',
        type: 'layout',
        code: this.config.getCode(),
      },
    ]

    const ctx: ToolContext = {
      // Code access
      getCode: () => this.config.getCode(),
      getCurrentFile: () => this.config.getCurrentFile?.() || 'main.mirror',
      getFiles: () => this.config.getFiles?.() || defaultFiles,
      getAllCode: () => this.config.getAllCode?.() || this.config.getCode(),
      // Project context
      getTokens: () => this.config.tokens || {},
      getComponents: () => this.config.components || [],
    }

    try {
      return await tool.execute(input, ctx)
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update the API key
   */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }

  /**
   * Update the model
   */
  updateModel(model: string): void {
    this.model = model
  }

  /**
   * Register additional tools
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.tools.delete(name)
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys())
  }
}

// ============================================
// FACTORY
// ============================================

export function createAnthropicSdkAgent(config: AnthropicSdkAgentConfig): AnthropicSdkAgent {
  return new AnthropicSdkAgent(config)
}

/**
 * Check if Anthropic SDK agent is available (has API key)
 */
export function isAnthropicSdkAvailable(apiKey?: string): boolean {
  return !!apiKey
}
