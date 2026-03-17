/**
 * Mirror Agent
 *
 * AI Assistant for Mirror DSL using OpenRouter API with tool use.
 * Implements an agentic loop: prompt → tools → response → repeat.
 */

import { buildSystemPrompt } from './prompts/system'
import { coreTools } from './tools/core'
import { writeTools } from './tools/write'
import { analyzeTools } from './tools/analyze'
import { generateTools } from './tools/generate'
import { visualTools } from './tools/visual'
import { projectTools } from './tools/project'
import { validateTools } from './tools/validate'
import type {
  MirrorAgentConfig,
  AgentEvent,
  Tool,
  ToolContext,
  ToolResult,
  LLMCommand,
  FileInfo
} from './types'

// All available tools (validate tools first - they're critical)
const allTools = [...validateTools, ...projectTools, ...coreTools, ...writeTools, ...analyzeTools, ...generateTools, ...visualTools]

// ============================================
// TYPES FOR OPENROUTER/OPENAI API
// ============================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required: string[]
    }
  }
}

interface ChatCompletionResponse {
  id: string
  choices: {
    index: number
    message: {
      role: string
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }[]
}

// ============================================
// MIRROR AGENT CLASS
// ============================================

export class MirrorAgent {
  private config: MirrorAgentConfig
  private tools: Map<string, Tool>
  private model: string
  private baseUrl: string
  private apiKey: string

  constructor(config: MirrorAgentConfig) {
    this.config = config
    this.model = config.model || 'anthropic/claude-sonnet-4'
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1'
    this.apiKey = config.apiKey
    this.tools = new Map()

    // Register all tools
    for (const tool of allTools) {
      this.tools.set(tool.name, tool)
    }
  }

  /**
   * Run a prompt through the agent with streaming events.
   * Implements the agentic loop: LLM → tools → LLM → ...
   */
  async *run(userPrompt: string): AsyncGenerator<AgentEvent> {
    const maxIterations = this.config.maxIterations || 10
    let iterations = 0

    // Build system prompt
    const systemPrompt = buildSystemPrompt({
      tokens: this.config.tokens,
      components: this.config.components
    })

    // Build initial messages
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: this.buildContextualPrompt(userPrompt)
      }
    ]

    // Build tool definitions
    const toolDefinitions = this.buildToolDefinitions()

    // Collected commands from tool executions
    const allCommands: LLMCommand[] = []

    try {
      while (iterations < maxIterations) {
        iterations++

        // Call LLM via OpenRouter
        const response = await this.callLLM(messages, toolDefinitions)

        if (!response.choices?.[0]) {
          yield { type: 'error', error: 'No response from LLM' }
          break
        }

        const choice = response.choices[0]
        const message = choice.message

        // Process text content
        if (message.content) {
          yield { type: 'text', content: message.content }
        }

        // Check for tool calls
        const toolCalls = message.tool_calls
        if (!toolCalls || toolCalls.length === 0) {
          // No tool calls, we're done
          break
        }

        // Process tool calls
        const toolResults: ChatMessage[] = []

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name
          let toolInput: Record<string, any> = {}

          try {
            toolInput = JSON.parse(toolCall.function.arguments)
          } catch {
            toolInput = {}
          }

          yield {
            type: 'tool_start',
            tool: toolName,
            input: toolInput
          }

          // Execute the tool
          const result = await this.executeTool(toolName, toolInput)

          yield {
            type: 'tool_end',
            tool: toolName,
            result
          }

          // Collect commands
          if (result.commands) {
            for (const cmd of result.commands) {
              allCommands.push(cmd)
              yield { type: 'command', command: cmd }
            }
          }

          // Add tool result message
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          })
        }

        // Add assistant message and tool results to history
        messages.push({
          role: 'assistant',
          content: message.content,
          tool_calls: toolCalls
        })

        for (const toolResult of toolResults) {
          messages.push(toolResult)
        }

        // Check if we should stop
        if (choice.finish_reason === 'stop') {
          break
        }
      }

      yield { type: 'done' }

    } catch (error: any) {
      yield {
        type: 'error',
        error: error.message || 'Unknown error occurred'
      }
    }
  }

  /**
   * Call the LLM API (OpenRouter/OpenAI format)
   */
  private async callLLM(messages: ChatMessage[], tools: OpenAITool[]): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://mirror-studio.dev',
        'X-Title': 'Mirror Studio'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        max_tokens: 4096
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API error ${response.status}: ${text.substring(0, 200)}`)
    }

    return response.json()
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
${Object.entries(tokens).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
`
    }

    context += `
## User Request
${userPrompt}`

    return context
  }

  /**
   * Build tool definitions for OpenRouter/OpenAI API
   */
  private buildToolDefinitions(): OpenAITool[] {
    return Array.from(this.tools.values()).map(tool => {
      const properties: Record<string, any> = {}
      const required: string[] = []

      for (const [name, def] of Object.entries(tool.parameters)) {
        properties[name] = {
          type: def.type,
          description: def.description
        }

        if (def.enum) {
          properties[name].enum = def.enum
        }

        if (def.required) {
          required.push(name)
        }
      }

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object' as const,
            properties,
            required
          }
        }
      }
    })
  }

  /**
   * Execute a tool by name
   */
  private async executeTool(name: string, input: Record<string, any>): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` }
    }

    // Build default file info if not provided
    const defaultFiles: FileInfo[] = [{
      name: this.config.getCurrentFile?.() || 'main.mirror',
      type: 'layout',
      code: this.config.getCode()
    }]

    const ctx: ToolContext = {
      // Code access
      getCode: () => this.config.getCode(),
      getCurrentFile: () => this.config.getCurrentFile?.() || 'main.mirror',
      getFiles: () => this.config.getFiles?.() || defaultFiles,
      getAllCode: () => this.config.getAllCode?.() || this.config.getCode(),
      // Project context
      getTokens: () => this.config.tokens || {},
      getComponents: () => this.config.components || [],
      // Visual context
      getPreviewElement: this.config.getPreviewElement,
      getElementByNodeId: this.config.getElementByNodeId,
      highlightElement: this.config.highlightElement,
      clearHighlights: this.config.clearHighlights
    }

    try {
      return await tool.execute(input, ctx)
    } catch (error: any) {
      return { success: false, error: error.message }
    }
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
// FACTORY FUNCTION
// ============================================

/**
 * Create a Mirror Agent instance
 */
export function createMirrorAgent(config: MirrorAgentConfig): MirrorAgent {
  return new MirrorAgent(config)
}
