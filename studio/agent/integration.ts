/**
 * Agent Integration for Mirror Studio
 *
 * Initializes the AI agent with OpenRouter configuration and
 * connects it to the studio state.
 */

import { createMirrorAgent } from './mirror-agent'
import { createClaudeCliAgent, type ClaudeCliAgent } from './claude-cli-agent'
import type { MirrorAgentConfig } from './types'
import { ChatPanel, type ChatPanelConfig } from '../panels/chat-panel'
import { createCommandHandler, type AgentCommandHandler } from './command-handler'
import { validateAndFix, formatErrors } from './validator'
import { getLLMBridge } from '../llm'
import { state } from '../core'
import type { LLMCommand } from './types'

// ============================================
// CONFIGURATION
// ============================================

export interface AgentIntegrationConfig {
  /** OpenRouter API key */
  apiKey: string
  /** Model to use (default: anthropic/claude-sonnet-4) */
  model?: string
  /** Container for the chat panel */
  chatContainer?: HTMLElement
  /** Available design tokens */
  tokens?: Record<string, string>
  /** Available component definitions */
  components?: string[]
  /** Callback when a command is executed */
  onCommand?: (command: LLMCommand) => void
  /** Callback for errors */
  onError?: (error: string) => void
  // Project context callbacks
  /** Get current file name */
  getCurrentFile?: () => string
  /** Get all project files with types */
  getFiles?: () => { name: string; type: 'tokens' | 'components' | 'component' | 'layout' | 'data' | 'unknown'; code: string }[]
  /** Get all code concatenated */
  getAllCode?: () => string
  /** Update file content */
  updateFile?: (filename: string, content: string) => void
  /** Switch to file */
  switchToFile?: (filename: string) => void
}

// OpenRouter base URL
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

// Default model
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4'

// ============================================
// AGENT INTEGRATION CLASS
// ============================================

export class AgentIntegration {
  private agent: ReturnType<typeof createMirrorAgent>
  private claudeAgent: ClaudeCliAgent | null = null
  private chatPanel: ChatPanel | null = null
  private commandHandler: AgentCommandHandler | null = null
  private llmBridge = getLLMBridge()
  private config: AgentIntegrationConfig

  constructor(config: AgentIntegrationConfig) {
    // Build agent config
    const agentConfig: MirrorAgentConfig = {
      apiKey: config.apiKey,
      baseUrl: OPENROUTER_BASE_URL,
      model: config.model || DEFAULT_MODEL,
      maxIterations: 10,

      // Code access
      getCode: () => state.get().source,
      getCursor: () => {
        const pos = state.get().cursor
        return { line: pos.line, column: pos.column }
      },
      getSelection: () => {
        const nodeId = state.get().selection.nodeId
        if (!nodeId) return null
        const sourceMap = state.get().sourceMap
        if (!sourceMap) return null
        const node = sourceMap.getNodeById(nodeId)
        if (!node) return null
        const source = state.get().source
        // Calculate character offsets from line/column positions
        const lines = source.split('\n')
        let startOffset = 0
        for (let i = 0; i < node.position.line - 1; i++) {
          startOffset += lines[i].length + 1 // +1 for newline
        }
        startOffset += node.position.column - 1
        let endOffset = 0
        for (let i = 0; i < node.position.endLine - 1; i++) {
          endOffset += lines[i].length + 1
        }
        endOffset += node.position.endColumn - 1
        const text = source.substring(startOffset, endOffset)
        return {
          from: startOffset,
          to: endOffset,
          text
        }
      },

      // Tokens and components
      tokens: config.tokens || {},
      components: config.components || [],

      // Project context (for smart file integration)
      getCurrentFile: config.getCurrentFile,
      getFiles: config.getFiles,
      getAllCode: config.getAllCode,

      // Visual context (optional - for visual tools)
      getPreviewElement: () => {
        const preview = document.querySelector('.preview-frame') as HTMLElement
        return preview || null
      },
      getElementByNodeId: (nodeId: string) => {
        const preview = document.querySelector('.preview-frame')
        if (!preview) return null
        return preview.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
      },
      highlightElement: (nodeId: string, color?: string) => {
        const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
        if (el) {
          el.style.outline = `2px solid ${color || '#007bff'}`
          el.style.outlineOffset = '2px'
        }
      },
      clearHighlights: () => {
        document.querySelectorAll('[data-mirror-id]').forEach(el => {
          (el as HTMLElement).style.outline = ''
          ;(el as HTMLElement).style.outlineOffset = ''
        })
      }
    }

    this.agent = createMirrorAgent(agentConfig)
    this.config = config

    // Create Claude CLI agent (works in Tauri desktop app)
    this.claudeAgent = createClaudeCliAgent({
      getCode: () => state.get().source,
      getCurrentFile: config.getCurrentFile,
      getCursor: () => {
        const pos = state.get().cursor
        return { line: pos.line, column: pos.column }
      },
      getSelection: () => {
        const nodeId = state.get().selection.nodeId
        if (!nodeId) return null
        const sourceMap = state.get().sourceMap
        if (!sourceMap) return null
        const node = sourceMap.getNodeById(nodeId)
        if (!node) return null
        const source = state.get().source
        const lines = source.split('\n')
        let startOffset = 0
        for (let i = 0; i < node.position.line - 1; i++) {
          startOffset += lines[i].length + 1
        }
        startOffset += node.position.column - 1
        let endOffset = 0
        for (let i = 0; i < node.position.endLine - 1; i++) {
          endOffset += lines[i].length + 1
        }
        endOffset += node.position.endColumn - 1
        const text = source.substring(startOffset, endOffset)
        return { from: startOffset, to: endOffset, text }
      },
      tokens: config.tokens || {},
      components: config.components || []
    })

    // Initialize command handler if project callbacks provided
    if (config.getFiles && config.getCurrentFile) {
      this.commandHandler = createCommandHandler({
        getCurrentFile: config.getCurrentFile,
        getFiles: config.getFiles,
        updateFile: config.updateFile || (() => {}),
        switchToFile: config.switchToFile,
      })
    }

    // Initialize chat panel if container provided
    if (config.chatContainer) {
      this.initChatPanel(config)
    }
  }

  private async handleCommand(command: LLMCommand): Promise<void> {
    // Check if this is a project command that needs special handling
    const projectCommands = ['ADD_TOKEN', 'ADD_COMPONENT', 'USE_COMPONENT', 'REPLACE_ALL']

    if (projectCommands.includes(command.type) && this.commandHandler) {
      // AUTO-VALIDATION for REPLACE_ALL: Validate and fix code before applying
      if (command.type === 'REPLACE_ALL' && command.code) {
        const validationResult = validateAndFix(command.code)
        if (validationResult.fixedCode) {
          console.log('[Agent] Auto-fixed structural issues in generated code')
          command = { ...command, code: validationResult.fixedCode }
        }
        if (!validationResult.valid && validationResult.errors.length > 0) {
          const criticalErrors = validationResult.errors.filter(e =>
            e.type === 'self-closing-with-children'
          )
          if (criticalErrors.length > 0) {
            console.warn('[Agent] Generated code has structural issues:\n', formatErrors(criticalErrors))
            if (this.config.onError) {
              this.config.onError(`Code has structural issues that need manual fixing:\n${formatErrors(criticalErrors)}`)
            }
          }
        }
      }

      const result = await this.commandHandler.processCommand(command)

      if (result.success) {
        console.log('[Agent] Project command processed:', result.message)

        // If there's a code change, apply it through LLMBridge
        if (result.change) {
          this.llmBridge.executeResponse({
            commands: [{
              type: 'UPDATE_SOURCE',
              ...result.change
            }]
          })
        }
      } else {
        console.error('[Agent] Project command failed:', result.error)
        if (this.config.onError) {
          this.config.onError(result.error || 'Project command failed')
        }
      }
    } else if (command.type === 'UPDATE_SOURCE' && command.insert) {
      // AUTO-VALIDATION: Validate and fix code before applying
      const validationResult = validateAndFix(command.insert)

      if (validationResult.fixedCode) {
        console.log('[Agent] Auto-fixed structural issues in generated code')
        command = { ...command, insert: validationResult.fixedCode }
      }

      if (!validationResult.valid && validationResult.errors.length > 0) {
        // Log warnings for errors that couldn't be auto-fixed
        const criticalErrors = validationResult.errors.filter(e =>
          e.type === 'self-closing-with-children'
        )

        if (criticalErrors.length > 0) {
          console.warn('[Agent] Generated code has structural issues:\n', formatErrors(criticalErrors))
          // Still apply the code but warn the user
          if (this.config.onError) {
            this.config.onError(`Code has structural issues that need manual fixing:\n${formatErrors(criticalErrors)}`)
          }
        }
      }

      // Apply the (possibly fixed) code
      const result = this.llmBridge.executeResponse({
        commands: [command]
      })

      if (!result.success && this.config.onError) {
        this.config.onError(result.error || 'Command execution failed')
      }
    } else {
      // Use LLMBridge for other standard commands
      const result = this.llmBridge.executeResponse({
        commands: [command]
      })

      if (!result.success && this.config.onError) {
        this.config.onError(result.error || 'Command execution failed')
      }
    }

    if (this.config.onCommand) {
      this.config.onCommand(command)
    }
  }

  private initChatPanel(config: AgentIntegrationConfig): void {
    if (!config.chatContainer) return

    this.chatPanel = new ChatPanel({
      container: config.chatContainer,
      agent: this.agent,
      claudeAgent: this.claudeAgent || undefined,
      onCommand: (command) => {
        this.handleCommand(command)
      },
      onError: config.onError
    })
  }

  /**
   * Get the agent instance
   */
  getAgent() {
    return this.agent
  }

  /**
   * Get the chat panel instance
   */
  getChatPanel() {
    return this.chatPanel
  }

  /**
   * Send a message to the agent
   */
  async sendMessage(message: string): Promise<void> {
    if (this.chatPanel) {
      // Use chat panel's send method if available
      await (this.chatPanel as any).sendMessage?.(message)
    } else {
      // Direct agent query
      const result = await this.agent.query(message)
      for (const command of result.commands) {
        this.llmBridge.executeResponse({ commands: [command] })
      }
    }
  }

  /**
   * Update tokens
   */
  updateTokens(tokens: Record<string, string>): void {
    // Agent will read from config on next request
    // Note: For live updates, agent would need mutable config
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

let instance: AgentIntegration | null = null

/**
 * Initialize the agent integration
 */
export function initializeAgent(config: AgentIntegrationConfig): AgentIntegration {
  instance = new AgentIntegration(config)
  return instance
}

/**
 * Get the current agent integration instance
 */
export function getAgentIntegration(): AgentIntegration | null {
  return instance
}

/**
 * Check if agent is available (has API key)
 */
export function isAgentAvailable(): boolean {
  return instance !== null
}
