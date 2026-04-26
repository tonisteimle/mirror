/**
 * Claude CLI Agent
 *
 * Uses Claude Code CLI via Tauri Bridge for Mirror code generation.
 * Only works in Desktop app (Tauri).
 */

import { buildSystemPrompt, selectPromptMode } from './prompts/system'
import type { AgentEvent, LLMCommand } from './types'

// ============================================
// TYPES
// ============================================

export interface ClaudeCliAgentConfig {
  getCode: () => string
  getCurrentFile?: () => string
  getCursor?: () => { line: number; column: number }
  getSelection?: () => { text: string; from: number; to: number } | null
  tokens?: Record<string, string>
  components?: string[]
}

interface TauriBridge {
  isTauri: () => boolean
  agent: {
    checkClaudeCli: () => Promise<boolean>
    runAgent: (
      prompt: string,
      agentType: string,
      projectPath: string,
      sessionId?: string | null
    ) => Promise<{
      session_id: string
      success: boolean
      output: string
      error: string | null
    }>
    onAgentOutput: (callback: (output: AgentOutput) => void) => Promise<() => void>
  }
}

interface AgentOutput {
  session_id: string
  agent_type: string
  content: string
  is_complete: boolean
  is_error: boolean
}

// Get Tauri Bridge
function getTauriBridge(): TauriBridge | null {
  if (typeof window !== 'undefined' && (window as any).TauriBridge) {
    return (window as any).TauriBridge
  }
  return null
}

// ============================================
// CLAUDE CLI AGENT
// ============================================

export class ClaudeCliAgent {
  private config: ClaudeCliAgentConfig
  private sessionId: string | null = null
  private unlistenFn: (() => void) | null = null

  constructor(config: ClaudeCliAgentConfig) {
    this.config = config
  }

  /**
   * Check if Claude CLI is available
   */
  async isAvailable(): Promise<boolean> {
    const bridge = getTauriBridge()
    if (!bridge || !bridge.isTauri()) {
      return false
    }
    return bridge.agent.checkClaudeCli()
  }

  /**
   * Run a prompt through Claude CLI with streaming events
   */
  async *run(userPrompt: string): AsyncGenerator<AgentEvent> {
    const bridge = getTauriBridge()

    if (!bridge || !bridge.isTauri()) {
      yield { type: 'error', error: 'Claude CLI ist nur in der Desktop-App verfügbar' }
      return
    }

    // Check if CLI is available
    const cliAvailable = await bridge.agent.checkClaudeCli()
    if (!cliAvailable) {
      yield {
        type: 'error',
        error:
          'Claude CLI nicht gefunden. Bitte installieren: npm install -g @anthropic-ai/claude-code',
      }
      return
    }

    // Build the full prompt with context
    const contextPrompt = this.buildContextualPrompt(userPrompt)

    // Build system prompt — full tutorial when generating from scratch,
    // compact when iterating on existing code.
    const systemPrompt = buildSystemPrompt({
      tokens: this.config.tokens,
      components: this.config.components,
      mode: selectPromptMode(this.config.getCode()),
    })

    // Full prompt for Claude CLI
    const fullPrompt = `${systemPrompt}

---

${contextPrompt}

---

WICHTIG: Gib NUR den Mirror-Code zurück, keine Erklärungen. Der Code wird direkt in den Editor eingefügt.
Wenn du Änderungen am bestehenden Code machst, gib den VOLLSTÄNDIGEN aktualisierten Code zurück.`

    // Set up event listener for streaming
    const outputBuffer: AgentOutput[] = []
    let resolveNext: ((value: AgentOutput | null) => void) | null = null

    this.unlistenFn = await bridge.agent.onAgentOutput(output => {
      if (resolveNext) {
        resolveNext(output)
        resolveNext = null
      } else {
        outputBuffer.push(output)
      }
    })

    // Helper to get next output
    const getNextOutput = (): Promise<AgentOutput | null> => {
      if (outputBuffer.length > 0) {
        return Promise.resolve(outputBuffer.shift()!)
      }
      return new Promise(resolve => {
        resolveNext = resolve
        // Timeout after 60 seconds
        setTimeout(() => {
          if (resolveNext === resolve) {
            resolveNext = null
            resolve(null)
          }
        }, 60000)
      })
    }

    try {
      // Start agent (non-blocking, results come via events)
      const resultPromise = bridge.agent.runAgent(
        fullPrompt,
        'fixer',
        '', // project path - empty for now
        this.sessionId
      )

      // Process streaming output
      let fullContent = ''

      while (true) {
        const output = await getNextOutput()

        if (!output) {
          // Timeout
          yield { type: 'error', error: 'Timeout: Keine Antwort von Claude CLI' }
          break
        }

        if (output.is_complete) {
          // Done - extract and emit final code
          const code = this.extractMirrorCode(fullContent)
          if (code) {
            yield { type: 'command', command: this.createReplaceCommand(code) }
          }
          break
        }

        if (output.is_error) {
          yield { type: 'error', error: output.content }
          continue
        }

        if (output.content) {
          fullContent += output.content
          yield { type: 'text', content: output.content }
        }
      }

      // Wait for result
      const result = await resultPromise
      this.sessionId = result.session_id

      if (!result.success && result.error) {
        yield { type: 'error', error: result.error }
      }

      yield { type: 'done' }
    } catch (error: unknown) {
      yield { type: 'error', error: error instanceof Error ? error.message : 'Unbekannter Fehler' }
    } finally {
      // Clean up listener
      if (this.unlistenFn) {
        this.unlistenFn()
        this.unlistenFn = null
      }
    }
  }

  /**
   * Build contextual prompt with current code state
   */
  private buildContextualPrompt(userPrompt: string): string {
    const code = this.config.getCode()

    let context = `## Aktueller Code

\`\`\`mirror
${code}
\`\`\`
`

    // Add cursor info if available
    if (this.config.getCursor) {
      const cursor = this.config.getCursor()
      context += `
## Cursor Position
Zeile: ${cursor.line}, Spalte: ${cursor.column}
`
    }

    // Add selection if any
    if (this.config.getSelection) {
      const selection = this.config.getSelection()
      if (selection) {
        context += `
## Selektierter Code
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
## Verfügbare Tokens
${Object.entries(tokens)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}
`
    }

    context += `
## User Anfrage
${userPrompt}`

    return context
  }

  /**
   * Extract Mirror code from response
   */
  private extractMirrorCode(response: string): string | null {
    // Try to extract from code block
    const codeBlockMatch = response.match(/```(?:mirror)?\n([\s\S]*?)```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // If no code block, check if entire response looks like Mirror code
    const lines = response.trim().split('\n')
    const looksLikeMirror = lines.some(line => {
      const trimmed = line.trim()
      return /^(Box|Frame|Text|Button|Input|H[1-6]|Header|Main|Section|Nav|Footer|Image|Icon|Label|Select|Option)\b/.test(
        trimmed
      )
    })

    if (looksLikeMirror) {
      return response.trim()
    }

    return null
  }

  /**
   * Create a replace command for the code
   */
  private createReplaceCommand(code: string): LLMCommand {
    return {
      type: 'REPLACE_ALL',
      code,
    }
  }

  /**
   * Clear session (start fresh conversation)
   */
  clearSession(): void {
    this.sessionId = null
  }
}

// ============================================
// FACTORY
// ============================================

export function createClaudeCliAgent(config: ClaudeCliAgentConfig): ClaudeCliAgent {
  return new ClaudeCliAgent(config)
}

/**
 * Check if Claude CLI agent is available
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  const bridge = getTauriBridge()
  if (!bridge || !bridge.isTauri()) {
    return false
  }
  return bridge.agent.checkClaudeCli()
}
