/**
 * Fixer Test Harness
 *
 * Provides a complete testing API for the Fixer system without requiring
 * the actual Mirror Studio UI. Integrates mock editor, mock Tauri bridge,
 * and the real FixerService for end-to-end testing.
 *
 * Usage:
 *   const harness = createFixerTestHarness({
 *     files: { 'app.mir': 'Button "Click"' },
 *     useMockCli: true
 *   })
 *   const result = await harness.runPrompt('/roter Button')
 *   console.log(result.changes)
 *   console.log(result.files)
 */

import type { FixerResponse, FixerChange, FileInfo, AgentEvent, FileType } from '../types'
import { MockEditorView, createMockEditor } from './mock-editor'
import { MockTauriBridge, createMockTauriBridge, AgentOutput } from './mock-tauri-bridge'
import { FixerService, createFixer, FixerConfig } from '../fixer'

// ============================================
// TYPES
// ============================================

export interface FixerTestHarnessConfig {
  /** Initial files in the project */
  files?: Record<string, string>

  /** Current file path (defaults to 'app.mir') */
  currentFile?: string

  /** Cursor position (defaults to line 1, column 1) */
  cursor?: {
    line: number
    column: number
  }

  /** Selection (optional) */
  selection?: {
    from: number
    to: number
    text: string
  } | null

  /** Use real Claude CLI instead of mocks (slow, requires CLI) */
  useMockCli?: boolean

  /** Mock response to return (only for mock mode) */
  mockResponse?: FixerResponse

  /** Mock error to return (only for mock mode) */
  mockError?: string

  /** Response delay in ms (only for mock mode) */
  responseDelay?: number

  /** Debug mode - logs all events */
  debug?: boolean
}

export interface PromptResult {
  /** Was the prompt successful? */
  success: boolean

  /** All events emitted during processing */
  events: AgentEvent[]

  /** The parsed fixer response (if successful) */
  response?: FixerResponse

  /** Error message (if failed) */
  error?: string

  /** Final file states after applying changes */
  files: Record<string, string>

  /** Files that were changed */
  filesChanged: string[]

  /** Files that were created */
  filesCreated: string[]

  /** Processing duration in ms */
  duration: number
}

export interface FixerTestHarness {
  /** Run a prompt and get results */
  runPrompt: (prompt: string) => Promise<PromptResult>

  /** Run a quick fix (non-streaming) */
  quickFix: (prompt: string) => Promise<PromptResult>

  /** Check if fixer is available */
  isAvailable: () => Promise<boolean>

  /** Check if fixer is busy */
  isBusy: () => boolean

  /** Get current file content */
  getFileContent: (filename: string) => string | null

  /** Set file content */
  setFileContent: (filename: string, content: string) => void

  /** Get all files */
  getFiles: () => Record<string, string>

  /** Get current file path */
  getCurrentFile: () => string

  /** Set current file */
  setCurrentFile: (filename: string) => void

  /** Get mock editor (for advanced testing) */
  getEditor: () => MockEditorView

  /** Get mock bridge (for advanced testing) */
  getBridge: () => MockTauriBridge

  /** Get fixer service (for advanced testing) */
  getFixer: () => FixerService

  /** Set mock response for next call */
  setMockResponse: (response: FixerResponse) => void

  /** Set mock error for next call */
  setMockError: (error: string) => void

  /** Clear session/history */
  clearSession: () => void

  /** Get conversation history */
  getHistory: () => Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>

  /** Cleanup resources */
  dispose: () => void
}

// ============================================
// HARNESS IMPLEMENTATION
// ============================================

class FixerTestHarnessImpl implements FixerTestHarness {
  private files: Record<string, string>
  private currentFile: string
  private cursor: { line: number; column: number; offset: number }
  private selection: { from: number; to: number; text: string } | null
  private editor: MockEditorView
  private bridge: MockTauriBridge
  private fixer: FixerService
  private debug: boolean

  constructor(config: FixerTestHarnessConfig = {}) {
    // Initialize file system
    // Note: Use ternary because { ...undefined } returns {} which is truthy
    this.files = config.files ? { ...config.files } : { 'app.mir': '' }
    this.currentFile = config.currentFile || Object.keys(this.files)[0] || 'app.mir'
    this.cursor = {
      line: config.cursor?.line ?? 1,
      column: config.cursor?.column ?? 1,
      offset: 0
    }
    this.selection = config.selection ?? null
    this.debug = config.debug ?? false

    // Calculate cursor offset
    this.updateCursorOffset()

    // Initialize mock editor
    const currentContent = this.files[this.currentFile] || ''
    this.editor = createMockEditor(currentContent, this.cursor.line)

    // Initialize mock Tauri bridge
    this.bridge = createMockTauriBridge({
      useRealCli: !config.useMockCli,
      mockResponse: config.mockResponse,
      mockError: config.mockError,
      responseDelay: config.responseDelay ?? 100,
      onOutput: this.debug
        ? (output) => console.log('[Harness] Agent output:', output)
        : undefined
    })

    // Inject mock bridge into window
    this.injectBridge()

    // Initialize fixer service with our mocked dependencies
    const fixerConfig: FixerConfig = {
      getFiles: () => this.getFileInfos(),
      getCurrentFile: () => this.currentFile,
      getEditorContent: () => this.editor.getContent(),
      getCursor: () => this.cursor,
      getSelection: () => this.selection,
      getFileContent: (filename) => this.files[filename] ?? null,
      saveFile: async (filename, content) => {
        this.files[filename] = content
        if (this.debug) {
          console.log(`[Harness] Saved ${filename}:`, content.slice(0, 100))
        }
      },
      createFile: async (filename, content) => {
        this.files[filename] = content
        if (this.debug) {
          console.log(`[Harness] Created ${filename}:`, content.slice(0, 100))
        }
      },
      updateEditor: (content) => {
        this.editor.setContent(content)
        this.files[this.currentFile] = content
        if (this.debug) {
          console.log('[Harness] Editor updated:', content.slice(0, 100))
        }
      },
      refreshFileTree: () => {
        if (this.debug) {
          console.log('[Harness] File tree refreshed')
        }
      },
      switchToFile: (filename) => {
        if (filename in this.files) {
          this.currentFile = filename
          this.editor.setContent(this.files[filename])
          if (this.debug) {
            console.log('[Harness] Switched to file:', filename)
          }
        }
      }
    }

    this.fixer = createFixer(fixerConfig)
  }

  // ============================================
  // PUBLIC API
  // ============================================

  async runPrompt(prompt: string): Promise<PromptResult> {
    const startTime = Date.now()
    const events: AgentEvent[] = []
    const initialFiles = { ...this.files }

    try {
      // Run the fixer with streaming
      for await (const event of this.fixer.fix(prompt)) {
        events.push(event)

        if (this.debug) {
          console.log('[Harness] Event:', event.type, event.content?.slice(0, 50) || event.error)
        }
      }

      // Analyze results
      const errorEvent = events.find(e => e.type === 'error')
      const success = !errorEvent

      // Calculate changed/created files
      const filesChanged: string[] = []
      const filesCreated: string[] = []

      for (const filename of Object.keys(this.files)) {
        if (!(filename in initialFiles)) {
          filesCreated.push(filename)
        } else if (this.files[filename] !== initialFiles[filename]) {
          filesChanged.push(filename)
        }
      }

      // Extract response from events (if any)
      const textContent = events
        .filter(e => e.type === 'text')
        .map(e => e.content)
        .join('')

      const response = this.extractResponseFromText(textContent)

      return {
        success,
        events,
        response,
        error: errorEvent?.error,
        files: { ...this.files },
        filesChanged,
        filesCreated,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        events,
        error: error instanceof Error ? error.message : String(error),
        files: { ...this.files },
        filesChanged: [],
        filesCreated: [],
        duration: Date.now() - startTime
      }
    }
  }

  async quickFix(prompt: string): Promise<PromptResult> {
    const startTime = Date.now()
    const initialFiles = { ...this.files }

    try {
      const response = await this.fixer.quickFix(prompt)

      // Calculate changed/created files
      const filesChanged: string[] = []
      const filesCreated: string[] = []

      for (const filename of Object.keys(this.files)) {
        if (!(filename in initialFiles)) {
          filesCreated.push(filename)
        } else if (this.files[filename] !== initialFiles[filename]) {
          filesChanged.push(filename)
        }
      }

      return {
        success: !!response,
        events: [],
        response: response ?? undefined,
        error: response ? undefined : 'No response',
        files: { ...this.files },
        filesChanged,
        filesCreated,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        events: [],
        error: error instanceof Error ? error.message : String(error),
        files: { ...this.files },
        filesChanged: [],
        filesCreated: [],
        duration: Date.now() - startTime
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.fixer.isAvailable()
  }

  isBusy(): boolean {
    return this.fixer.isBusy()
  }

  getFileContent(filename: string): string | null {
    return this.files[filename] ?? null
  }

  setFileContent(filename: string, content: string): void {
    this.files[filename] = content
    if (filename === this.currentFile) {
      this.editor.setContent(content)
    }
  }

  getFiles(): Record<string, string> {
    return { ...this.files }
  }

  getCurrentFile(): string {
    return this.currentFile
  }

  setCurrentFile(filename: string): void {
    if (filename in this.files) {
      this.currentFile = filename
      this.editor.setContent(this.files[filename])
    }
  }

  getEditor(): MockEditorView {
    return this.editor
  }

  getBridge(): MockTauriBridge {
    return this.bridge
  }

  getFixer(): FixerService {
    return this.fixer
  }

  setMockResponse(response: FixerResponse): void {
    this.bridge.setMockResponse(response)
  }

  setMockError(error: string): void {
    this.bridge.setMockError(error)
  }

  clearSession(): void {
    this.fixer.clearSession()
    this.bridge.clearMocks()
  }

  getHistory(): Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> {
    return this.fixer.getHistory()
  }

  dispose(): void {
    this.fixer.clearSession()
    this.editor.destroy()
    this.cleanupBridge()
  }

  // ============================================
  // HELPERS
  // ============================================

  private updateCursorOffset(): void {
    const content = this.files[this.currentFile] || ''
    const lines = content.split('\n')
    let offset = 0

    for (let i = 0; i < Math.min(this.cursor.line - 1, lines.length); i++) {
      offset += lines[i].length + 1 // +1 for newline
    }
    offset += Math.min(this.cursor.column - 1, lines[this.cursor.line - 1]?.length ?? 0)

    this.cursor.offset = offset
  }

  private getFileInfos(): FileInfo[] {
    return Object.entries(this.files).map(([name, code]) => ({
      name,
      type: this.getFileType(name),
      code
    }))
  }

  private getFileType(filename: string): FileType {
    if (filename.endsWith('.tok')) return 'tokens'
    if (filename.endsWith('.com')) return 'component'
    if (filename.endsWith('.mir') || filename.endsWith('.mirror')) return 'layout'
    return 'unknown'
  }

  private injectBridge(): void {
    // Store original bridge if any
    const originalBridge = (globalThis as any).window?.TauriBridge

    // Create mock window if needed
    if (typeof window === 'undefined') {
      (globalThis as any).window = {}
    }

    // Inject our mock bridge
    (globalThis as any).window.TauriBridge = this.bridge;
    (globalThis as any).window._originalTauriBridge = originalBridge
  }

  private cleanupBridge(): void {
    // Restore original bridge if any
    if (typeof window !== 'undefined') {
      const original = (window as any)._originalTauriBridge
      if (original) {
        (window as any).TauriBridge = original
      } else {
        delete (window as any).TauriBridge
      }
      delete (window as any)._originalTauriBridge
    }
  }

  private extractResponseFromText(text: string): FixerResponse | undefined {
    if (!text) return undefined

    try {
      // Try to find JSON in the text
      const jsonMatch = text.match(/\{[\s\S]*"changes"[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // Parsing failed
    }

    return undefined
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create a new Fixer test harness
 *
 * @example
 * ```ts
 * // Simple mock test
 * const harness = createFixerTestHarness({
 *   files: { 'app.mir': 'Button "Click"' },
 *   useMockCli: true,
 *   mockResponse: {
 *     changes: [{ file: 'app.mir', action: 'replace', code: 'Button "Klick" bg red' }]
 *   }
 * })
 *
 * const result = await harness.runPrompt('/roter Button')
 * console.log(result.files['app.mir']) // Button "Klick" bg red
 *
 * harness.dispose()
 * ```
 *
 * @example
 * ```ts
 * // Real CLI test (slow, requires Claude CLI)
 * const harness = createFixerTestHarness({
 *   files: {
 *     'tokens.tok': '$primary: #3b82f6',
 *     'app.mir': 'Button "Click"'
 *   },
 *   useMockCli: false,
 *   debug: true
 * })
 *
 * const result = await harness.runPrompt('/mache den Button rot')
 * console.log(result.response?.explanation)
 * console.log(result.filesChanged)
 *
 * harness.dispose()
 * ```
 */
export function createFixerTestHarness(config?: FixerTestHarnessConfig): FixerTestHarness {
  return new FixerTestHarnessImpl(config)
}

// ============================================
// TEST HELPERS
// ============================================

/**
 * Create a simple mock response for testing
 */
export function createMockFixerResponse(
  changes: Partial<FixerChange>[],
  explanation?: string
): FixerResponse {
  return {
    explanation: explanation ?? 'Mock response',
    changes: changes.map(c => ({
      file: c.file ?? 'app.mir',
      action: c.action ?? 'replace',
      code: c.code ?? '',
      ...(c.position ? { position: c.position } : {})
    }))
  }
}

/**
 * Wait helper for async tests
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create multiple harnesses for parallel testing
 */
export function createTestHarnesses(count: number, config?: FixerTestHarnessConfig): FixerTestHarness[] {
  return Array.from({ length: count }, () => createFixerTestHarness(config))
}

/**
 * Dispose multiple harnesses
 */
export function disposeHarnesses(harnesses: FixerTestHarness[]): void {
  for (const harness of harnesses) {
    harness.dispose()
  }
}
