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
  AgentEvent,
} from './types'
import {
  ContextCollector,
  extractProjectContext,
  createContextCollector,
} from './context-collector'
import { CodeApplicator, createCodeApplicator } from './code-applicator'
import { buildFixerSystemPrompt, buildFixerPrompt } from './prompts/fixer-system'
import { logAgent } from '../../compiler/utils/logger'

// ============================================
// CONSTANTS
// ============================================

const AGENT_TIMEOUT_MS = 60000 // 60 seconds
const MAX_CHANGES_PER_RESPONSE = 50 // Prevent excessive changes from LLM
const MAX_OUTPUT_BUFFER_SIZE = 100 // Prevent memory issues from fast events
const MAX_CONTENT_SIZE = 500000 // 500KB max response size

// FIX #8: Valid actions as const for type safety
const VALID_ACTIONS = ['create', 'insert', 'append', 'replace'] as const
type ValidAction = (typeof VALID_ACTIONS)[number]

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

// ============================================
// FIXER SERVICE
// ============================================

export class FixerService {
  private config: FixerConfig
  private contextCollector: ContextCollector
  private codeApplicator: CodeApplicator
  private sessionId: string | null = null
  private isProcessing: boolean = false // FIX #3: Track processing state

  constructor(config: FixerConfig) {
    this.config = config

    // Initialize context collector
    this.contextCollector = createContextCollector({
      getFiles: config.getFiles,
      getCurrentFile: config.getCurrentFile,
      getEditorContent: config.getEditorContent,
      getCursor: config.getCursor,
      getSelection: config.getSelection,
    })

    // Initialize code applicator
    this.codeApplicator = createCodeApplicator({
      getFileContent: config.getFileContent,
      saveFile: config.saveFile,
      createFile: config.createFile,
      getCurrentFile: config.getCurrentFile,
      updateEditor: config.updateEditor,
      refreshFileTree: config.refreshFileTree,
      switchToFile: config.switchToFile,
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

      unlistenFn = await bridge.agent.onAgentOutput(output => {
        if (resolveNext) {
          resolveNext(output)
          resolveNext = null
          pendingPromise = null
        } else {
          // Limit buffer size to prevent memory issues
          if (outputBuffer.length < MAX_OUTPUT_BUFFER_SIZE) {
            outputBuffer.push(output)
          } else {
            logAgent.warn('Fixer output buffer full, dropping event')
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
        pendingPromise = new Promise(resolve => {
          resolveNext = resolve
          const currentTimeoutId = setTimeout(() => {
            if (timeoutId === currentTimeoutId) timeoutId = null
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
      const resultPromise = bridge.agent
        .runAgent(fullPrompt, 'fixer', '', this.sessionId)
        .catch((e: Error) => {
          resultError = e
          return {
            session_id: this.sessionId || '',
            success: false,
            output: '',
            error: e.message,
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
          yield { type: 'done' } // Yield done here to prevent double-yield
          return // Exit generator completely
        }

        if (output.is_complete) {
          isComplete = true

          // Parse and apply response
          const parseResult = this.parseResponse(fullContent)

          if (parseResult.success && parseResult.response) {
            const response = parseResult.response
            yield {
              type: 'text',
              content: response.explanation || 'Änderungen werden angewendet...',
            }

            // Apply changes
            const result = await this.codeApplicator.apply(response, context)

            if (result.success) {
              yield {
                type: 'text',
                content: this.formatResult(result.filesChanged, result.filesCreated),
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
            logAgent.warn('Fixer response content truncated at', MAX_CONTENT_SIZE, 'bytes')
          }
          yield { type: 'text', content: output.content }
        }
      }

      // Get session ID for continuation
      // FIX #3: No try-catch needed since promise is already caught above
      const result = await resultPromise
      this.sessionId = result.session_id

      if (resultError) {
        logAgent.error('Fixer error from agent:', resultError)
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
        ;(resolveNext as (value: AgentOutput | null) => void)(null)
        resolveNext = null
      }

      if (unlistenFn) {
        unlistenFn()
      }
    }
  }

  /**
   * Generate replacement code for a draft block (?? marker syntax).
   *
   * Unlike `fix()` and `quickFix()` which produce multi-file FixerResponse JSON,
   * this returns a single code string ready to be spliced into the editor at
   * the draft block position.
   *
   * @param prompt - User's prompt (text after the `??` marker), or null
   * @param content - Code currently inside the draft block (between ?? markers)
   * @param fullSource - Full editor source, used for surrounding context
   * @throws if Tauri/Claude CLI is unavailable, or AI returns no code
   */
  async generateDraftCode(
    prompt: string | null,
    content: string,
    fullSource: string
  ): Promise<string> {
    return this.runWithLock(async () => {
      const ctx = await this.prepareDraftContext()
      const builder = resolveDraftPromptBuilder(this.getDraftPromptVariantOverride())
      const fullPrompt = builder({
        prompt,
        content,
        fullSource,
        tokenFiles: ctx.tokenFiles,
        componentFiles: ctx.componentFiles,
      })
      const output = await this.runDraftClaudeCall(fullPrompt)
      const code = extractCodeBlock(output)
      if (!code) {
        throw new Error('Keine Code-Antwort vom AI erhalten')
      }
      return code
    })
  }

  /**
   * Validator-loop helper: AI just generated `brokenCode` for this draft
   * block, but the compiler reports `errors`. Ask AI to fix the code given
   * the errors. Returns the corrected code.
   *
   * Reuses the current sessionId so Claude has the conversation history —
   * doesn't need to re-explain everything.
   */
  async fixCompileErrors(
    brokenCode: string,
    errors: string[],
    input: { prompt: string | null; content: string; fullSource: string }
  ): Promise<string> {
    return this.runWithLock(async () => {
      const ctx = await this.prepareDraftContext()
      const fullPrompt = buildFixCompileErrorsPrompt({
        ...input,
        brokenCode,
        errors,
        tokenFiles: ctx.tokenFiles,
        componentFiles: ctx.componentFiles,
      })
      const output = await this.runDraftClaudeCall(fullPrompt)
      const code = extractCodeBlock(output)
      if (!code) {
        throw new Error('Keine Code-Antwort vom AI bei Fix-Versuch')
      }
      return code
    })
  }

  /**
   * Plan-then-execute helper #1: ask AI to plan the draft block as 3-5
   * structured bullet points BEFORE writing any code. Returns the plan
   * text (not Mirror code).
   */
  async planDraft(input: {
    prompt: string | null
    content: string
    fullSource: string
  }): Promise<string> {
    return this.runWithLock(async () => {
      const ctx = await this.prepareDraftContext()
      const fullPrompt = buildPlanDraftPrompt({
        ...input,
        tokenFiles: ctx.tokenFiles,
        componentFiles: ctx.componentFiles,
      })
      const output = await this.runDraftClaudeCall(fullPrompt)
      // Plan is plain text — no code-block extraction. Trim and return.
      const plan = output.trim()
      if (!plan) {
        throw new Error('Leerer Plan vom AI erhalten')
      }
      return plan
    })
  }

  /**
   * Plan-then-execute helper #2: AI writes Mirror code that follows the
   * plan from `planDraft`. Returns the code.
   */
  async executePlan(
    plan: string,
    input: { prompt: string | null; content: string; fullSource: string }
  ): Promise<string> {
    return this.runWithLock(async () => {
      const ctx = await this.prepareDraftContext()
      const fullPrompt = buildExecutePlanPrompt({
        ...input,
        plan,
        tokenFiles: ctx.tokenFiles,
        componentFiles: ctx.componentFiles,
      })
      const output = await this.runDraftClaudeCall(fullPrompt)
      const code = extractCodeBlock(output)
      if (!code) {
        throw new Error('Keine Code-Antwort vom AI bei Plan-Execution')
      }
      return code
    })
  }

  // ============================================
  // INTERNAL HELPERS — shared by all draft-call methods
  // ============================================

  /**
   * Wrap a draft operation with the isProcessing lock + try/finally cleanup.
   * Throws synchronously if a previous call is still running (catches
   * concurrent triggers without slipping past awaits).
   */
  private async runWithLock<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isProcessing) {
      throw new Error('Fixer ist bereits aktiv')
    }
    this.isProcessing = true
    try {
      return await fn()
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Validate Tauri/CLI availability and gather token/component files from
   * other project files. Returns the context every draft-call needs.
   */
  private async prepareDraftContext(): Promise<{
    tokenFiles: Record<string, string>
    componentFiles: Record<string, string>
  }> {
    const bridge = this.getTauriBridge()
    if (!bridge || !bridge.isTauri()) {
      throw new Error('Claude CLI ist nur in der Desktop-App verfügbar')
    }
    const cliAvailable = await bridge.agent.checkClaudeCli()
    if (!cliAvailable) {
      throw new Error(
        'Claude CLI nicht gefunden. Bitte installieren: npm install -g @anthropic-ai/claude-code'
      )
    }

    const allFiles = this.config.getFiles()
    const currentFileName = this.config.getCurrentFile()
    const tokenFiles: Record<string, string> = {}
    const componentFiles: Record<string, string> = {}
    for (const file of allFiles) {
      if (file.name === currentFileName) continue
      if (file.type === 'tokens') {
        tokenFiles[file.name] = file.code
      } else if (file.type === 'components' || file.type === 'component') {
        componentFiles[file.name] = file.code
      }
    }
    return { tokenFiles, componentFiles }
  }

  /**
   * Read prompt-variant override from window (eval/A-B testing only).
   * Production always resolves to 'current'.
   */
  private getDraftPromptVariantOverride(): string | undefined {
    if (typeof window === 'undefined') return undefined
    return (window as any).__draftPromptVariant as string | undefined
  }

  /**
   * Single Claude CLI round-trip with session reuse and error normalization.
   * Returns the raw output string (caller decides whether to extract code).
   */
  private async runDraftClaudeCall(fullPrompt: string): Promise<string> {
    const bridge = this.getTauriBridge()
    if (!bridge) throw new Error('Claude CLI ist nur in der Desktop-App verfügbar')
    const result = await bridge.agent.runAgent(fullPrompt, 'draft', '', this.sessionId)
    this.sessionId = result.session_id
    if (!result.success) {
      throw new Error(result.error || 'Claude CLI Fehler')
    }
    return result.output
  }

  /**
   * Quick fix without streaming (for simple requests)
   */
  async quickFix(prompt: string): Promise<FixerResponse | null> {
    // FIX #3: Prevent concurrent processing
    if (this.isProcessing) {
      logAgent.warn('Fixer already processing, ignoring quickFix')
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

      const result = await bridge.agent.runAgent(fullPrompt, 'fixer', '', this.sessionId)

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
      logAgent.error('Fixer quick fix error:', e)
    } finally {
      this.isProcessing = false
    }

    return null
  }

  /**
   * Parse JSON response from Claude
   * FIX #8: Better error messages
   */
  private parseResponse(text: string): {
    success: boolean
    response?: FixerResponse
    error?: string
  } {
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
              error: 'JSON gefunden, aber "changes" Array fehlt',
            }
          } catch (e) {
            return {
              success: false,
              error: `JSON-Parsing fehlgeschlagen: ${e instanceof Error ? e.message : 'Ungültiges Format'}`,
            }
          }
        }
        return {
          success: false,
          error: 'Kein JSON in der Antwort gefunden. Antwort-Länge: ' + text.length,
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
          error: 'JSON-Struktur ungültig: "changes" muss ein Array sein',
        }
      } catch (e) {
        return {
          success: false,
          error: `JSON-Parsing fehlgeschlagen: ${e instanceof Error ? e.message : 'Ungültiges Format'}`,
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      logAgent.error('Fixer parse error:', {
        error: errorMsg,
        textLength: text.length,
        textPreview: text.substring(0, 200),
      })
      return {
        success: false,
        error: `Parsing-Fehler: ${errorMsg}`,
      }
    }
  }

  private isValidChange(change: unknown): boolean {
    if (typeof change !== 'object' || change === null) return false
    const c = change as Record<string, unknown>
    return (
      typeof c.file === 'string' &&
      typeof c.code === 'string' &&
      typeof c.action === 'string' &&
      VALID_ACTIONS.includes(c.action as ValidAction)
    )
  }

  private isValidFixerResponse(obj: unknown): obj is FixerResponse {
    if (typeof obj !== 'object' || obj === null) return false
    const response = obj as Record<string, unknown>
    if (!Array.isArray(response.changes)) return false
    return response.changes.slice(0, MAX_CHANGES_PER_RESPONSE).every(c => this.isValidChange(c))
  }

  private scanJson(
    text: string,
    start: number,
    end: number,
    onChar: (c: string, i: number, inStr: boolean) => void
  ) {
    let inString = false,
      escapeNext = false
    for (let i = start; i < end && i < text.length; i++) {
      const c = text[i]
      if (escapeNext) {
        escapeNext = false
        continue
      }
      if (c === '\\') {
        escapeNext = true
        continue
      }
      if (c === '"') inString = !inString
      onChar(c, i, inString)
    }
  }

  private findJsonStart(text: string, targetIndex: number): number {
    let lastBrace = -1
    this.scanJson(text, 0, targetIndex + 1, (c, i, inStr) => {
      if (!inStr && c === '{') lastBrace = i
    })
    return lastBrace
  }

  private findJsonEnd(text: string, startIndex: number): number {
    let count = 0,
      result = -1
    this.scanJson(text, startIndex, text.length, (c, i, inStr) => {
      if (inStr || result !== -1) return
      if (c === '{') count++
      else if (c === '}' && --count === 0) result = i + 1
    })
    return result
  }

  /**
   * Clone response and limit changes array
   * Prevents mutation of original response object
   */
  private cloneResponse(response: FixerResponse): FixerResponse {
    const limitedChanges = response.changes.slice(0, MAX_CHANGES_PER_RESPONSE)
    if (response.changes.length > MAX_CHANGES_PER_RESPONSE) {
      logAgent.warn(
        `Fixer response has ${response.changes.length} changes, limiting to ${MAX_CHANGES_PER_RESPONSE}`
      )
    }
    return {
      ...response,
      changes: limitedChanges.map(change => ({ ...change })),
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
// DRAFT PROMPT HELPERS
// ============================================

interface DraftPromptInput {
  prompt: string | null
  content: string
  fullSource: string
  /** Other token files (.tok) — keyed by filename → file content */
  tokenFiles?: Record<string, string>
  /** Other component files (.com) — keyed by filename → file content */
  componentFiles?: Record<string, string>
}

type DraftPromptBuilder = (input: DraftPromptInput) => string

/**
 * Registry of named draft prompt variants. The eval driver can pick a
 * non-default variant via `window.__draftPromptVariant`, enabling A/B
 * comparison without changing production code. Production always uses
 * 'current' (the default in resolveDraftPromptBuilder).
 *
 * To add a new variant for an experiment:
 *   1. Add an entry here with a tight, testable hypothesis encoded in name.
 *   2. Run: `npx tsx scripts/eval-ai-draft.ts --compare-variants=current,<name>`
 *   3. Diff the side-by-side report.
 *   4. If wins → replace 'current' and delete the experiment variant.
 */
const DRAFT_PROMPT_VARIANTS: Record<string, DraftPromptBuilder> = {
  current: buildDraftPromptCurrent,
  minimal: buildDraftPromptMinimal,
}

export function resolveDraftPromptBuilder(name?: string): DraftPromptBuilder {
  if (!name || !(name in DRAFT_PROMPT_VARIANTS)) return DRAFT_PROMPT_VARIANTS.current
  return DRAFT_PROMPT_VARIANTS[name]
}

/** Names of registered variants — exposed for eval introspection. */
export function listDraftPromptVariants(): string[] {
  return Object.keys(DRAFT_PROMPT_VARIANTS)
}

/**
 * The shipping prompt. All production calls go through this. Tightened from
 * the original after eval surfaced over-invention + non-uniform patterns
 * (see commit f8791268).
 */
function buildDraftPromptCurrent(input: DraftPromptInput): string {
  const userInstruction = input.prompt
    ? `User-Anfrage: ${input.prompt}`
    : 'Vervollständige oder korrigiere den Code im Draft-Block basierend auf dem Kontext.'

  const draftContent = input.content.trim()
    ? `\n\nAktueller Inhalt des Draft-Blocks:\n\`\`\`mirror\n${input.content}\n\`\`\``
    : '\n\nDer Draft-Block ist leer — generiere neuen Code basierend auf User-Anfrage und Kontext.'

  const tokenSection = formatProjectFileSection(
    'Token-Dateien (verfügbare $tokens — bevorzugen statt Hex-Werte zu erfinden)',
    input.tokenFiles
  )
  const componentSection = formatProjectFileSection(
    'Komponenten-Dateien (verfügbare Komponenten — wiederverwenden statt neu zu definieren)',
    input.componentFiles
  )

  return `Du bist ein Mirror DSL Code-Generator. Im folgenden Editor-Source markieren \`??\` Zeilen einen "Draft-Block" — den Bereich, der durch deine generierte Code-Antwort ersetzt werden soll.
${tokenSection}${componentSection}
## Editor-Source (aktuelle Datei, mit ?? Markern)
\`\`\`mirror
${input.fullSource}
\`\`\`
${draftContent}

## ${userInstruction}

## ANTWORTFORMAT (kritisch)
- Gib NUR den Mirror-Code zurück, eingeschlossen in einen einzigen \`\`\`mirror Code-Block
- KEIN JSON, KEINE Erklärungen davor oder danach, KEINE \`??\` Marker im Output
- Die Einrückung wird vom Editor automatisch angepasst (relative Einrückung im Code-Block ist OK)
- Wenn Tokens existieren ($name) → nutze sie statt Hex/Pixel-Werte zu erfinden
- Wenn Komponenten existieren → wiederverwenden statt neue parallel zu definieren
- Halte dich strikt an die User-Anfrage — erfinde KEINE zusätzlichen Sub-Labels, Hilfstexte
  oder Inhalte die nicht explizit gefragt wurden. Wenn der User "Switch" sagt, gib einen Switch
  ohne Sub-Beschreibung. "Mehr ist mehr" ist hier falsch — Designer iterieren weiter.
- Bei wiederholten Strukturen (mehrere Sections, Tabs, Cards, Items) → nutze IDENTISCHE
  innere Hierarchie für jede Wiederholung. Wenn Section 1 \`Frame > Text + Wrapper > Control\`
  ist, dann müssen Section 2 und 3 dieselbe Struktur haben — gleiches Spacing, gleicher Wrapper,
  gleiches Visual-Pattern.

Beispiel:
\`\`\`mirror
Frame hor, gap 8
  Button "Speichern", bg $primary
  Button "Abbrechen"
\`\`\`
`
}

/**
 * Experimental: extremely terse prompt. Hypothesis: with token + component
 * sections already structured, the long rule list adds tokens but little
 * signal. Tests whether a much smaller prompt produces equivalent output.
 *
 * Use via `--compare-variants=current,minimal` to A/B test.
 */
function buildDraftPromptMinimal(input: DraftPromptInput): string {
  const userInstruction = input.prompt || 'Korrigiere oder vervollständige den Draft-Block.'

  const draftContent = input.content.trim()
    ? `\n\nDraft-Block-Inhalt:\n\`\`\`mirror\n${input.content}\n\`\`\``
    : ''

  const tokenSection = formatProjectFileSection('Tokens', input.tokenFiles)
  const componentSection = formatProjectFileSection('Komponenten', input.componentFiles)

  return `Du generierst Mirror DSL Code. Ersetze den \`??\`-Block:
${tokenSection}${componentSection}
## Source
\`\`\`mirror
${input.fullSource}
\`\`\`
${draftContent}

## Anfrage
${userInstruction}

## Antwort
Nur \`\`\`mirror Code-Block. Keine Prosa. Tokens vor Hex. Komponenten wiederverwenden.
Keine erfundenen Inhalte. Bei Wiederholungen: identische Struktur.
`
}

/**
 * Validator-loop fix prompt: AI generated `brokenCode` for the draft block,
 * compiler reports `errors`. Ask AI to correct the code given the errors.
 *
 * Reuses the same context layout as the generator prompt — Claude knows the
 * conventions (token use, no-invent, uniform-pattern) and what file context
 * looks like. The new bits: the broken code + the error list.
 */
function buildFixCompileErrorsPrompt(input: {
  prompt: string | null
  content: string
  fullSource: string
  brokenCode: string
  errors: string[]
  tokenFiles?: Record<string, string>
  componentFiles?: Record<string, string>
}): string {
  const tokenSection = formatProjectFileSection(
    'Token-Dateien (verfügbare $tokens)',
    input.tokenFiles
  )
  const componentSection = formatProjectFileSection(
    'Komponenten-Dateien (verfügbare Komponenten)',
    input.componentFiles
  )
  const userIntent = input.prompt
    ? `Ursprüngliche User-Anfrage: ${input.prompt}`
    : 'Es gab keinen expliziten User-Prompt — Code sollte den Block-Inhalt korrigieren.'

  return `Dein vorheriger Code für einen Mirror DSL Draft-Block hat den Compiler nicht bestanden. Korrigiere die Fehler.
${tokenSection}${componentSection}
## Editor-Source (Kontext)
\`\`\`mirror
${input.fullSource}
\`\`\`

## Dein vorheriger Code (fehlerhaft)
\`\`\`mirror
${input.brokenCode}
\`\`\`

## Compiler-Fehler
${input.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

## ${userIntent}

## ANTWORTFORMAT (kritisch)
- Gib den KORRIGIERTEN Code zurück, eingeschlossen in einen einzigen \`\`\`mirror Code-Block
- Behebe ALLE oben genannten Fehler
- Behalte die Struktur und Intention des Codes bei — minimale Änderungen, nur was zur Korrektur nötig ist
- Keine Erklärungen, kein JSON, keine \`??\` Marker
- Tokens und Komponenten unverändert nutzen (nicht durch Hex-Werte ersetzen)
`
}

/**
 * Plan-mode prompt #1: ask AI to outline the structure as 3-5 bullet points
 * BEFORE writing any code. Forces commitment to a structure — particularly
 * helps with consistency across repeated items (sections, cards, tabs).
 */
function buildPlanDraftPrompt(input: {
  prompt: string | null
  content: string
  fullSource: string
  tokenFiles?: Record<string, string>
  componentFiles?: Record<string, string>
}): string {
  const tokenSection = formatProjectFileSection('Token-Dateien', input.tokenFiles)
  const componentSection = formatProjectFileSection('Komponenten-Dateien', input.componentFiles)
  const userInstruction = input.prompt
    ? `User-Anfrage: ${input.prompt}`
    : 'Korrigiere oder vervollständige den Draft-Block-Inhalt.'

  const draftContent = input.content.trim()
    ? `\n\nDraft-Block-Inhalt:\n\`\`\`mirror\n${input.content}\n\`\`\``
    : ''

  return `Du planst die Mirror DSL Code-Generation für einen \`??\` Draft-Block. Schreibe noch KEINEN Code — erstelle einen kurzen Plan.
${tokenSection}${componentSection}
## Editor-Source (mit ?? Markern)
\`\`\`mirror
${input.fullSource}
\`\`\`
${draftContent}

## ${userInstruction}

## PLAN — 3 bis 5 Bulletpoints
- Welche Mirror-Elemente brauche ich (Frame, Text, Button, Switch, RadioGroup, ...)?
- Welche Hierarchie / Verschachtelung?
- Welche Tokens nutze ich? Welche existierenden Komponenten?
- Bei wiederholten Strukturen (mehrere Sections/Items): welches inner-Pattern verwende ich für ALLE Wiederholungen?
- Welche Texte (User-Inhalt — nichts Erfundenes)?

Antworte NUR mit dem Plan als Bulletpoints. Schreibe noch keinen Code.
`
}

/**
 * Plan-mode prompt #2: AI writes the actual Mirror code now that the plan is
 * committed. Same context as buildDraftPromptCurrent + the plan.
 */
function buildExecutePlanPrompt(input: {
  prompt: string | null
  content: string
  fullSource: string
  plan: string
  tokenFiles?: Record<string, string>
  componentFiles?: Record<string, string>
}): string {
  const tokenSection = formatProjectFileSection(
    'Token-Dateien (verfügbare $tokens)',
    input.tokenFiles
  )
  const componentSection = formatProjectFileSection(
    'Komponenten-Dateien (verfügbare Komponenten)',
    input.componentFiles
  )
  const draftContent = input.content.trim()
    ? `\n\nDraft-Block-Inhalt:\n\`\`\`mirror\n${input.content}\n\`\`\``
    : ''
  const userInstruction = input.prompt
    ? `User-Anfrage: ${input.prompt}`
    : 'Korrigiere oder vervollständige den Draft-Block-Inhalt.'

  return `Du generierst Mirror DSL Code basierend auf einem zuvor erstellten Plan.
${tokenSection}${componentSection}
## Editor-Source (mit ?? Markern)
\`\`\`mirror
${input.fullSource}
\`\`\`
${draftContent}

## ${userInstruction}

## Plan (folge diesem strikt)
${input.plan}

## ANTWORTFORMAT (kritisch)
- Gib NUR den Mirror-Code zurück, eingeschlossen in einen einzigen \`\`\`mirror Code-Block
- Folge dem Plan strikt — keine Abweichungen, keine zusätzlichen Elemente
- Bei wiederholten Strukturen: identische Hierarchie wie im Plan beschrieben
- Tokens nutzen, Komponenten wiederverwenden
- Keine Erklärungen, kein JSON, keine \`??\` Marker
`
}

function formatProjectFileSection(
  heading: string,
  files: Record<string, string> | undefined
): string {
  if (!files) return ''
  const entries = Object.entries(files).filter(([, content]) => content.trim())
  if (entries.length === 0) return ''

  const blocks = entries
    .map(([name, content]) => `### ${name}\n\`\`\`mirror\n${content}\n\`\`\``)
    .join('\n\n')

  return `\n## ${heading}\n${blocks}\n`
}

/**
 * Extract the first \`\`\`mirror or \`\`\` code block from an AI response.
 * Falls back to the trimmed response if no code block is found but the first
 * line is a recognizable Mirror DSL construct.
 */
function extractCodeBlock(response: string): string | null {
  if (!response) return null

  // Prefer a fenced code block (any language tag)
  const fenceMatch = response.match(/```(?:mirror|mir)?\s*\n([\s\S]*?)\n```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  // Fallback: first line must look like a Mirror declaration. Strict whitelist —
  // matching free German prose that happens to start with a capital ("Ich…")
  // would be a worse outcome than asking the user to retry.
  const trimmed = response.trim()
  const firstLine = trimmed.split('\n')[0]
  if (looksLikeMirrorLine(firstLine)) {
    return trimmed
  }

  return null
}

const MIRROR_PRIMITIVES = new Set([
  'Frame',
  'Box',
  'Text',
  'Button',
  'Input',
  'Textarea',
  'Label',
  'Image',
  'Img',
  'Icon',
  'Link',
  'Slot',
  'Divider',
  'Spacer',
  'Header',
  'Nav',
  'Main',
  'Section',
  'Article',
  'Aside',
  'Footer',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'Dialog',
  'Tooltip',
  'Tabs',
  'Tab',
  'Select',
  'Item',
  'Checkbox',
  'Switch',
  'Slider',
  'RadioGroup',
  'RadioItem',
  'DatePicker',
  'Table',
  'Row',
  'Column',
  'Line',
  'Bar',
  'Pie',
  'Donut',
  'Area',
])

function looksLikeMirrorLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  // canvas declaration
  if (/^canvas\b/.test(trimmed)) return true
  // Token / property-set / data definition (lowercase identifier with .key: value pattern)
  if (/^[a-z][\w]*(?:\.[a-z][\w]*)*\s*:/.test(trimmed)) return true
  // Component definition or instance: must start with capitalized identifier
  const head = trimmed.match(/^([A-Z][A-Za-z0-9]*)/)
  if (!head) return false
  const name = head[1]
  const rest = trimmed.slice(name.length)
  // Bare primitive (e.g. just "Frame" or "Divider") — accept
  if (rest === '' && MIRROR_PRIMITIVES.has(name)) return true
  // Component definition: ends with `:` after optional properties
  if (/:/.test(rest)) return true
  // Otherwise we need a structural Mirror value character (string/token/color/digit)
  // to distinguish DSL ("Button \"OK\", bg #fff") from prose ("Sorry, I cannot do that").
  // Note: comma alone is too weak — prose like "Sorry, I cannot" would slip through.
  return /["$#(]|\b\d/.test(rest)
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
