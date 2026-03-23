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
const MAX_CHANGES_PER_RESPONSE = 50  // Prevent excessive changes from LLM
const MAX_OUTPUT_BUFFER_SIZE = 100  // Prevent memory issues from fast events
const MAX_CONTENT_SIZE = 500000  // 500KB max response size

// FIX #8: Valid actions as const for type safety
const VALID_ACTIONS = ['create', 'insert', 'append', 'replace'] as const
type ValidAction = typeof VALID_ACTIONS[number]

// FIX #18: Type-safe window augmentation
declare global {
  interface Window {
    TauriBridge?: TauriBridge
  }
}

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
    // Declare outside try for cleanup in finally
    let resolveNext: ((value: AgentOutput | null) => void) | null = null

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
      // FIX #4: Use single pending promise to prevent memory accumulation
      const outputBuffer: AgentOutput[] = []
      let pendingPromise: Promise<AgentOutput | null> | null = null
      // Note: resolveNext is declared outside try block for cleanup

      unlistenFn = await bridge.agent.onAgentOutput((output) => {
        if (resolveNext) {
          resolveNext(output)
          resolveNext = null
          pendingPromise = null
        } else {
          // Limit buffer size to prevent memory issues
          if (outputBuffer.length < MAX_OUTPUT_BUFFER_SIZE) {
            outputBuffer.push(output)
          } else {
            console.warn('[Fixer] Output buffer full, dropping event')
          }
        }
      })

      const getNextOutput = (): Promise<AgentOutput | null> => {
        if (outputBuffer.length > 0) {
          return Promise.resolve(outputBuffer.shift()!)
        }
        // FIX #4: Reuse pending promise if one exists
        if (pendingPromise) {
          return pendingPromise
        }
        pendingPromise = new Promise((resolve) => {
          resolveNext = resolve
          const currentTimeoutId = setTimeout(() => {
            // Always clear this timeout reference
            if (timeoutId === currentTimeoutId) {
              timeoutId = null
            }
            // Only resolve if we're still the active resolver
            if (resolveNext === resolve) {
              resolveNext = null
              pendingPromise = null
              resolve(null)
            }
          }, AGENT_TIMEOUT_MS)
          timeoutId = currentTimeoutId
        })
        return pendingPromise
      }

      // Start agent
      yield { type: 'thinking', content: 'Generiere Code...' }

      // FIX #3: Wrap promise to prevent unhandled rejection during streaming
      let resultError: Error | null = null
      const resultPromise = bridge.agent.runAgent(
        fullPrompt,
        'fixer',
        '',
        this.sessionId
      ).catch((e: Error) => {
        resultError = e
        return {
          session_id: this.sessionId || '',
          success: false,
          output: '',
          error: e.message
        }
      })

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
          yield { type: 'done' }  // Yield done here to prevent double-yield
          return  // Exit generator completely
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
              yield {
                type: 'text',
                content: this.formatResult(result.filesChanged, result.filesCreated)
              }

              // Add to history AFTER yield to ensure consistency
              const historyContent = JSON.stringify(response).slice(0, 5000)
              this.contextCollector.addToHistory('assistant', historyContent)
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
          // FIX: Limit content size to prevent memory issues
          if (fullContent.length + output.content.length <= MAX_CONTENT_SIZE) {
            fullContent += output.content
          } else if (fullContent.length < MAX_CONTENT_SIZE) {
            // Add as much as we can
            fullContent += output.content.slice(0, MAX_CONTENT_SIZE - fullContent.length)
            console.warn('[Fixer] Response content truncated at', MAX_CONTENT_SIZE, 'bytes')
          }
          yield { type: 'text', content: output.content }
        }
      }

      // Get session ID for continuation
      // FIX #3: No try-catch needed since promise is already caught above
      const result = await resultPromise
      this.sessionId = result.session_id

      if (resultError) {
        console.error('[Fixer] Error from agent:', resultError)
      }

      if (!result.success && result.error) {
        yield { type: 'error', error: result.error }
      }

      yield { type: 'done' }

    } finally {
      // FIX #3: Always cleanup
      this.isProcessing = false

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Resolve any pending promise to prevent memory leaks
      if (resolveNext) {
        resolveNext(null)
        resolveNext = null
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
          // FIX: Clone response to prevent mutation
          return { success: true, response: this.cloneResponse(parsed) }
        }
      } catch {
        // Not valid JSON, try extraction
      }

      // Second try: Find JSON by looking for "changes" keyword
      // Use indexOf for safety instead of complex regex (avoid ReDoS)
      const changesIndex = text.indexOf('"changes"')
      if (changesIndex === -1) {
        // Try to find any JSON object
        const anyJsonMatch = text.match(/\{[\s\S]*\}/)
        if (anyJsonMatch) {
          try {
            const parsed = JSON.parse(anyJsonMatch[0])
            if (this.isValidFixerResponse(parsed)) {
              return { success: true, response: this.cloneResponse(parsed) }
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

      // Find the JSON object containing "changes"
      // FIX: Use string-aware bracket matching
      const startIndex = this.findJsonStart(text, changesIndex)

      if (startIndex === -1) {
        return { success: false, error: 'Ungültiges JSON-Format' }
      }

      // Find matching closing brace (string-aware)
      const endIndex = this.findJsonEnd(text, startIndex)

      if (endIndex === -1) {
        return { success: false, error: 'Unvollständiges JSON' }
      }

      const jsonStr = text.slice(startIndex, endIndex)

      // Try to parse the extracted JSON
      try {
        const parsed = JSON.parse(jsonStr)
        if (this.isValidFixerResponse(parsed)) {
          return { success: true, response: this.cloneResponse(parsed) }
        }
        return {
          success: false,
          error: 'JSON-Struktur ungültig: "changes" muss ein Array sein'
        }
      } catch (e) {
        return {
          success: false,
          error: `JSON-Parsing fehlgeschlagen: ${e instanceof Error ? e.message : 'Ungültiges Format'}`
        }
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
   * FIX #8: Stricter type validation (no mutation)
   */
  private isValidFixerResponse(obj: unknown): obj is FixerResponse {
    if (typeof obj !== 'object' || obj === null) {
      return false
    }
    const response = obj as Record<string, unknown>
    if (!Array.isArray(response.changes)) {
      return false
    }
    // Just validate, don't mutate (cloning happens in cloneResponse)
    const changesToValidate = response.changes.slice(0, MAX_CHANGES_PER_RESPONSE)
    for (const change of changesToValidate) {
      if (typeof change !== 'object' || change === null) {
        return false
      }
      const c = change as Record<string, unknown>
      if (typeof c.file !== 'string' || typeof c.code !== 'string') {
        return false
      }
      // FIX #8: Use typed const array for action validation
      if (typeof c.action !== 'string' || !VALID_ACTIONS.includes(c.action as ValidAction)) {
        return false
      }
    }
    return true
  }

  /**
   * Find the start of a JSON object containing the given index
   * FIX: Scans forward from beginning to properly track string state
   */
  private findJsonStart(text: string, targetIndex: number): number {
    let inString = false
    let escapeNext = false
    let lastOpenBrace = -1

    // Scan forward to properly track string state
    for (let i = 0; i <= targetIndex && i < text.length; i++) {
      const char = text[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"') {
        inString = !inString
      } else if (!inString && char === '{') {
        lastOpenBrace = i
      }
    }

    return lastOpenBrace
  }

  /**
   * Find the end of a JSON object (forwards from given index)
   * String-aware: ignores brackets inside JSON strings
   */
  private findJsonEnd(text: string, startIndex: number): number {
    let braceCount = 0
    let inString = false
    let escapeNext = false

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"') {
        inString = !inString
      } else if (!inString) {
        if (char === '{') {
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount === 0) {
            return i + 1
          }
        }
      }
    }

    return -1
  }

  /**
   * Clone response and limit changes array
   * Prevents mutation of original response object
   */
  private cloneResponse(response: FixerResponse): FixerResponse {
    const limitedChanges = response.changes.slice(0, MAX_CHANGES_PER_RESPONSE)
    if (response.changes.length > MAX_CHANGES_PER_RESPONSE) {
      console.warn(`[Fixer] Response has ${response.changes.length} changes, limiting to ${MAX_CHANGES_PER_RESPONSE}`)
    }
    return {
      ...response,
      changes: limitedChanges.map(change => ({ ...change }))
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
   * FIX #18: Use typed window augmentation
   */
  private getTauriBridge(): TauriBridge | null {
    if (typeof window !== 'undefined' && window.TauriBridge) {
      return window.TauriBridge
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

/**
 * Create or replace the Fixer singleton
 * FIX #7: Cleanup old instance before creating new one
 */
export function createFixer(config: FixerConfig): FixerService {
  if (instance) {
    // Cleanup old instance to prevent dangling sessions
    instance.clearSession()
  }
  instance = new FixerService(config)
  return instance
}

export function getFixer(): FixerService | null {
  return instance
}
