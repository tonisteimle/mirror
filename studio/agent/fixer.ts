/**
 * Mirror Fixer Service
 *
 * Single AI entry point for the `??` draft-mode trigger in the editor.
 * Receives a prompt + draft content + full source from the editor, builds
 * the draft prompt via `draft-prompts.ts`, calls Claude through the Tauri
 * bridge, and returns the extracted code block ready for splicing back
 * into the editor.
 *
 * The historic multi-file `fix()` / `quickFix()` flow (with streaming
 * AgentEvents, JSON FixerResponse parsing, multi-file CodeApplicator,
 * ContextCollector, conversation history, system prompt) was removed —
 * the only live consumer was the deleted chat panel.
 */

import type { FileInfo } from './types'
import { buildDraftPrompt, extractCodeBlock } from './draft-prompts'

// ============================================
// TYPES
// ============================================

declare global {
  interface Window {
    TauriBridge?: TauriBridge
  }
}

export interface FixerConfig {
  /** All project files (used to inject token + component context). */
  getFiles: () => FileInfo[]
  /** Name of the file currently in the editor (excluded from context). */
  getCurrentFile: () => string
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
  }
}

// ============================================
// FIXER SERVICE
// ============================================

export class FixerService {
  private config: FixerConfig
  private sessionId: string | null = null
  private isProcessing: boolean = false

  constructor(config: FixerConfig) {
    this.config = config
  }

  /** Currently inside a `generateDraftCode` call. */
  isBusy(): boolean {
    return this.isProcessing
  }

  /**
   * Generate replacement code for a draft block (?? marker syntax).
   *
   * Returns a single code string ready to be spliced into the editor at
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
    if (this.isProcessing) {
      throw new Error('Fixer ist bereits aktiv')
    }
    this.isProcessing = true
    try {
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

      // Pull tokens + components from OTHER project files (current file is
      // already in fullSource). Without this the AI is token-blind and would
      // invent hex colors / sizes instead of using `$primary`, `$surface` etc.
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

      const fullPrompt = buildDraftPrompt({
        prompt,
        content,
        fullSource,
        tokenFiles,
        componentFiles,
      })
      const result = await bridge.agent.runAgent(fullPrompt, 'draft', '', this.sessionId)
      this.sessionId = result.session_id
      if (!result.success) {
        throw new Error(result.error || 'Claude CLI Fehler')
      }
      const code = extractCodeBlock(result.output)
      if (!code) {
        throw new Error('Keine Code-Antwort vom AI erhalten')
      }
      return code
    } finally {
      this.isProcessing = false
    }
  }

  /** Reset session id (next call starts a fresh Claude conversation). */
  clearSession(): void {
    this.sessionId = null
  }

  private getTauriBridge(): TauriBridge | null {
    if (typeof window !== 'undefined' && window.TauriBridge) {
      return window.TauriBridge
    }
    return null
  }
}

// ============================================
// DRAFT PROMPT RE-EXPORTS
// ============================================
// Prompt builder + extractor + splice live in draft-prompts.ts (no deps)
// so the eval driver can import them without dragging in the agent module
// tree. Re-exported here for API stability of the existing consumers.
export {
  buildDraftPrompt,
  extractCodeBlock,
  indentBlock,
  spliceDraftBlock,
  type DraftPromptInput,
} from './draft-prompts'

// ============================================
// FACTORY
// ============================================

let instance: FixerService | null = null

/** Create or replace the Fixer singleton. Cleans up the old session id. */
export function createFixer(config: FixerConfig): FixerService {
  if (instance) instance.clearSession()
  instance = new FixerService(config)
  return instance
}

export function getFixer(): FixerService | null {
  return instance
}
