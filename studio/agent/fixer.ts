/**
 * Mirror Fixer Service
 *
 * Main service for AI-powered code generation in Mirror Studio.
 * Uses Claude Code CLI for multi-file code generation.
 *
 * Features:
 * - Collects full project context (tokens, components, layout)
 * - Generates code changes for multiple files
 * - Applies changes to the correct files
 * - Maintains conversation history for context
 */

import type {
  FixerContext,
  FixerResponse,
  FixerChange,
  ProjectContext,
  FileInfo,
  AgentEvent
} from './types'
import { ContextCollector, extractProjectContext, createContextCollector } from './context-collector'
import { CodeApplicator, createCodeApplicator } from './code-applicator'
import { buildFixerSystemPrompt, buildFixerPrompt } from './prompts/fixer-system'

// ============================================
// TYPES
// ============================================

export interface FixerConfig {
  // File access
  getFiles: () => FileInfo[]
  getCurrentFile: () => string
  getEditorContent: () => string
  getCursor: () => { line: number; column: number; offset: number }
  getSelection: () => { from: number; to: number; text: string } | null

  // File operations
  getFileContent: (filename: string) => string | null
  saveFile: (filename: string, content: string) => Promise<void>
  createFile: (filename: string, content: string) => Promise<void>
  updateEditor: (content: string) => void
  refreshFileTree: () => void
  switchToFile?: (filename: string) => void
}

interface TauriBridge {
  isTauri: () => boolean
  agent: {
    checkClaudeCli: () => Promise<boolean>
    runAgent: (prompt: string, agentType: string, projectPath: string, sessionId?: string | null) => Promise<{
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

// ============================================
// FIXER SERVICE
// ============================================

export class FixerService {
  private config: FixerConfig
  private contextCollector: ContextCollector
  private codeApplicator: CodeApplicator
  private sessionId: string | null = null

  constructor(config: FixerConfig) {
    this.config = config

    // Initialize context collector
    this.contextCollector = createContextCollector({
      getFiles: config.getFiles,
      getCurrentFile: config.getCurrentFile,
      getEditorContent: config.getEditorContent,
      getCursor: config.getCursor,
      getSelection: config.getSelection
    })

    // Initialize code applicator
    this.codeApplicator = createCodeApplicator({
      getFileContent: config.getFileContent,
      saveFile: config.saveFile,
      createFile: config.createFile,
      getCurrentFile: config.getCurrentFile,
      updateEditor: config.updateEditor,
      refreshFileTree: config.refreshFileTree,
      switchToFile: config.switchToFile
    })
  }

  /**
   * Check if Fixer is available (requires Tauri + Claude CLI)
   */
  async isAvailable(): Promise<boolean> {
    const bridge = this.getTauriBridge()
    if (!bridge || !bridge.isTauri()) {
      return false
    }
    return bridge.agent.checkClaudeCli()
  }

  /**
   * Run the fixer with streaming output
   */
  async *fix(prompt: string): AsyncGenerator<AgentEvent> {
    const bridge = this.getTauriBridge()

    if (!bridge || !bridge.isTauri()) {
      yield { type: 'error', error: 'Fixer ist nur in der Desktop-App verfügbar' }
      return
    }

    // Check CLI availability
    const cliAvailable = await bridge.agent.checkClaudeCli()
    if (!cliAvailable) {
      yield { type: 'error', error: 'Claude CLI nicht gefunden. Bitte installieren.' }
      return
    }

    // Collect context
    yield { type: 'thinking', content: 'Sammle Projekt-Kontext...' }
    const context = this.contextCollector.collect(prompt)
    const projectContext = extractProjectContext(this.config.getFiles())

    // Build prompts
    const systemPrompt = buildFixerSystemPrompt()
    const userPrompt = buildFixerPrompt(context, projectContext)
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`

    // Add to history
    this.contextCollector.addToHistory('user', prompt)

    // Set up streaming
    let fullContent = ''
    let unlistenFn: (() => void) | null = null

    try {
      // Set up event listener
      const outputBuffer: AgentOutput[] = []
      let resolveNext: ((value: AgentOutput | null) => void) | null = null

      unlistenFn = await bridge.agent.onAgentOutput((output) => {
        if (resolveNext) {
          resolveNext(output)
          resolveNext = null
        } else {
          outputBuffer.push(output)
        }
      })

      const getNextOutput = (): Promise<AgentOutput | null> => {
        if (outputBuffer.length > 0) {
          return Promise.resolve(outputBuffer.shift()!)
        }
        return new Promise((resolve) => {
          resolveNext = resolve
          setTimeout(() => {
            if (resolveNext === resolve) {
              resolveNext = null
              resolve(null)
            }
          }, 60000)
        })
      }

      // Start agent
      yield { type: 'thinking', content: 'Generiere Code...' }

      const resultPromise = bridge.agent.runAgent(
        fullPrompt,
        'fixer',
        '',
        this.sessionId
      )

      // Process streaming
      while (true) {
        const output = await getNextOutput()

        if (!output) {
          yield { type: 'error', error: 'Timeout: Keine Antwort' }
          break
        }

        if (output.is_complete) {
          // Parse and apply response
          const response = this.parseResponse(fullContent)

          if (response) {
            yield { type: 'text', content: response.explanation || 'Änderungen werden angewendet...' }

            // Apply changes
            const result = await this.codeApplicator.apply(response, context)

            if (result.success) {
              // Add to history
              this.contextCollector.addToHistory('assistant', JSON.stringify(response))

              yield {
                type: 'text',
                content: this.formatResult(result.filesChanged, result.filesCreated)
              }
            } else {
              yield { type: 'error', error: result.error || 'Fehler beim Anwenden' }
            }
          } else {
            yield { type: 'error', error: 'Konnte Antwort nicht parsen' }
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

      // Get session ID for continuation
      const result = await resultPromise
      this.sessionId = result.session_id

      if (!result.success && result.error) {
        yield { type: 'error', error: result.error }
      }

      yield { type: 'done' }

    } finally {
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }

  /**
   * Quick fix without streaming (for simple requests)
   */
  async quickFix(prompt: string): Promise<FixerResponse | null> {
    const bridge = this.getTauriBridge()
    if (!bridge || !bridge.isTauri()) {
      return null
    }

    const context = this.contextCollector.collect(prompt)
    const projectContext = extractProjectContext(this.config.getFiles())

    const systemPrompt = buildFixerSystemPrompt()
    const userPrompt = buildFixerPrompt(context, projectContext)
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`

    try {
      const result = await bridge.agent.runAgent(
        fullPrompt,
        'fixer',
        '',
        this.sessionId
      )

      this.sessionId = result.session_id

      if (result.success) {
        const response = this.parseResponse(result.output)
        if (response) {
          await this.codeApplicator.apply(response, context)
          this.contextCollector.addToHistory('user', prompt)
          this.contextCollector.addToHistory('assistant', JSON.stringify(response))
        }
        return response
      }
    } catch (e) {
      console.error('[Fixer] Quick fix error:', e)
    }

    return null
  }

  /**
   * Parse JSON response from Claude
   */
  private parseResponse(text: string): FixerResponse | null {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*"changes"[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // Try parsing entire text as JSON
      return JSON.parse(text)
    } catch (e) {
      console.error('[Fixer] Failed to parse response:', e)
      console.log('[Fixer] Raw response:', text)
      return null
    }
  }

  /**
   * Format result message
   */
  private formatResult(changed: string[], created: string[]): string {
    const parts: string[] = []

    if (created.length > 0) {
      parts.push(`Erstellt: ${created.join(', ')}`)
    }
    if (changed.length > 0) {
      parts.push(`Geändert: ${changed.join(', ')}`)
    }

    return parts.join(' | ') || 'Keine Änderungen'
  }

  /**
   * Get Tauri bridge
   */
  private getTauriBridge(): TauriBridge | null {
    if (typeof window !== 'undefined' && (window as any).TauriBridge) {
      return (window as any).TauriBridge
    }
    return null
  }

  /**
   * Clear session (fresh conversation)
   */
  clearSession(): void {
    this.sessionId = null
    this.contextCollector.clearHistory()
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.contextCollector.getHistory()
  }
}

// ============================================
// FACTORY
// ============================================

let instance: FixerService | null = null

export function createFixer(config: FixerConfig): FixerService {
  instance = new FixerService(config)
  return instance
}

export function getFixer(): FixerService | null {
  return instance
}
