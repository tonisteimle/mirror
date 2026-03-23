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
// CONSTANTS
// ============================================

const AGENT_TIMEOUT_MS = 60000  // 60 seconds

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
  private isProcessing: boolean = false  // FIX #3: Track processing state

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
   * Check if fixer is currently processing
   */
  isBusy(): boolean {
    return this.isProcessing
  }

  /**
   * Run the fixer with streaming output
   */
  async *fix(prompt: string): AsyncGenerator<AgentEvent> {
    // FIX #3: Prevent concurrent processing
    if (this.isProcessing) {
      yield { type: 'error', error: 'Fixer ist bereits aktiv' }
      return
    }

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

    this.isProcessing = true
    let unlistenFn: (() => void) | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
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
      let isComplete = false

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
          timeoutId = setTimeout(() => {
            if (resolveNext === resolve) {
              resolveNext = null
              resolve(null)
            }
          }, AGENT_TIMEOUT_MS)
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
      while (!isComplete) {
        const output = await getNextOutput()

        // Clear timeout after receiving output
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }

        if (!output) {
          yield { type: 'error', error: 'Timeout: Keine Antwort vom Agent' }
          break
        }

        if (output.is_complete) {
          isComplete = true

          // Parse and apply response
          const parseResult = this.parseResponse(fullContent)

          if (parseResult.success && parseResult.response) {
            const response = parseResult.response
            yield { type: 'text', content: response.explanation || 'Änderungen werden angewendet...' }

            // Apply changes
            const result = await this.codeApplicator.apply(response, context)

            if (result.success) {
              // Add to history (truncate large responses)
              const historyContent = JSON.stringify(response).slice(0, 5000)
              this.contextCollector.addToHistory('assistant', historyContent)

              yield {
                type: 'text',
                content: this.formatResult(result.filesChanged, result.filesCreated)
              }
            } else {
              yield { type: 'error', error: result.error || 'Fehler beim Anwenden der Änderungen' }
            }
          } else {
            // FIX #8: Better error messages for parse failures
            yield { type: 'error', error: parseResult.error || 'Konnte Antwort nicht parsen' }
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
      try {
        const result = await resultPromise
        this.sessionId = result.session_id

        if (!result.success && result.error) {
          yield { type: 'error', error: result.error }
        }
      } catch (e) {
        console.error('[Fixer] Error getting result:', e)
      }

      yield { type: 'done' }

    } finally {
      // FIX #3: Always cleanup
      this.isProcessing = false

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (unlistenFn) {
        unlistenFn()
      }
    }
  }

  /**
   * Quick fix without streaming (for simple requests)
   */
  async quickFix(prompt: string): Promise<FixerResponse | null> {
    // FIX #3: Prevent concurrent processing
    if (this.isProcessing) {
      console.warn('[Fixer] Already processing, ignoring quickFix')
      return null
    }

    const bridge = this.getTauriBridge()
    if (!bridge || !bridge.isTauri()) {
      return null
    }

    this.isProcessing = true

    try {
      const context = this.contextCollector.collect(prompt)
      const projectContext = extractProjectContext(this.config.getFiles())

      const systemPrompt = buildFixerSystemPrompt()
      const userPrompt = buildFixerPrompt(context, projectContext)
      const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`

      const result = await bridge.agent.runAgent(
        fullPrompt,
        'fixer',
        '',
        this.sessionId
      )

      this.sessionId = result.session_id

      if (result.success) {
        const parseResult = this.parseResponse(result.output)
        if (parseResult.success && parseResult.response) {
          const response = parseResult.response
          await this.codeApplicator.apply(response, context)
          this.contextCollector.addToHistory('user', prompt)
          // Truncate large responses for history
          const historyContent = JSON.stringify(response).slice(0, 5000)
          this.contextCollector.addToHistory('assistant', historyContent)
          return response
        }
      }
    } catch (e) {
      console.error('[Fixer] Quick fix error:', e)
    } finally {
      this.isProcessing = false
    }

    return null
  }

  /**
   * Parse JSON response from Claude
   * FIX #8: Better error messages
   */
  private parseResponse(text: string): { success: boolean; response?: FixerResponse; error?: string } {
    if (!text || text.trim().length === 0) {
      return { success: false, error: 'Leere Antwort erhalten' }
    }

    try {
      // First try: Parse entire text as JSON
      try {
        const parsed = JSON.parse(text)
        if (this.isValidFixerResponse(parsed)) {
          return { success: true, response: parsed }
        }
      } catch {
        // Not valid JSON, try extraction
      }

      // Second try: Extract JSON with "changes" key
      // Use a more specific regex to find the JSON object
      const jsonMatches = text.match(/\{[^{}]*"changes"\s*:\s*\[[^\]]*\][^{}]*\}/gs)

      if (!jsonMatches || jsonMatches.length === 0) {
        // Try to find any JSON object
        const anyJsonMatch = text.match(/\{[\s\S]*\}/)
        if (anyJsonMatch) {
          try {
            const parsed = JSON.parse(anyJsonMatch[0])
            if (this.isValidFixerResponse(parsed)) {
              return { success: true, response: parsed }
            }
            return {
              success: false,
              error: 'JSON gefunden, aber "changes" Array fehlt'
            }
          } catch (e) {
            return {
              success: false,
              error: `JSON-Parsing fehlgeschlagen: ${e instanceof Error ? e.message : 'Ungültiges Format'}`
            }
          }
        }
        return {
          success: false,
          error: 'Kein JSON in der Antwort gefunden. Antwort-Länge: ' + text.length
        }
      }

      // Try to parse the first match
      const parsed = JSON.parse(jsonMatches[0])
      if (this.isValidFixerResponse(parsed)) {
        return { success: true, response: parsed }
      }

      return {
        success: false,
        error: 'JSON-Struktur ungültig: "changes" muss ein Array sein'
      }

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      console.error('[Fixer] Parse error:', {
        error: errorMsg,
        textLength: text.length,
        textPreview: text.substring(0, 200)
      })
      return {
        success: false,
        error: `Parsing-Fehler: ${errorMsg}`
      }
    }
  }

  /**
   * Validate FixerResponse structure
   */
  private isValidFixerResponse(obj: unknown): obj is FixerResponse {
    if (typeof obj !== 'object' || obj === null) {
      return false
    }
    const response = obj as Record<string, unknown>
    if (!Array.isArray(response.changes)) {
      return false
    }
    // Validate each change
    for (const change of response.changes) {
      if (typeof change !== 'object' || change === null) {
        return false
      }
      const c = change as Record<string, unknown>
      if (typeof c.file !== 'string' || typeof c.code !== 'string') {
        return false
      }
      if (!['create', 'insert', 'append', 'replace'].includes(c.action as string)) {
        return false
      }
    }
    return true
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
