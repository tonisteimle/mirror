/**
 * Mock Tauri Bridge for Testing
 *
 * Two modes:
 * 1. Mock Mode - Returns predefined responses (fast, deterministic)
 * 2. CLI Mode - Actually calls Claude CLI (slow, real results)
 */

import { spawn } from 'child_process'
import type { FixerResponse } from '../../studio/agent/types'

// ============================================
// TYPES
// ============================================

export interface AgentOutput {
  session_id: string
  agent_type: string
  content: string
  is_complete: boolean
  is_error: boolean
}

export interface AgentResult {
  session_id: string
  success: boolean
  output: string
  error: string | null
}

export interface MockTauriBridgeConfig {
  /** Use real Claude CLI instead of mocks */
  useRealCli?: boolean
  /** Mock response to return (for mock mode) — JSON-stringified into output */
  mockResponse?: FixerResponse
  /**
   * Raw output string to return (for mock mode). Takes precedence over
   * `mockResponse`. Use this when testing code paths that expect raw text
   * (e.g. `generateDraftCode` returning a ```mirror code block).
   */
  mockRawOutput?: string
  /** Mock error to return (for mock mode) */
  mockError?: string
  /** Delay before responding (ms) */
  responseDelay?: number
  /** Callback for each output event */
  onOutput?: (output: AgentOutput) => void
}

// ============================================
// MOCK TAURI BRIDGE
// ============================================

export class MockTauriBridge {
  private config: MockTauriBridgeConfig
  private sessionCounter: number = 0
  private outputListeners: ((output: AgentOutput) => void)[] = []

  constructor(config: MockTauriBridgeConfig = {}) {
    this.config = {
      useRealCli: false,
      responseDelay: 100,
      ...config,
    }
  }

  isTauri(): boolean {
    return true
  }

  get agent() {
    return {
      checkClaudeCli: () => this.checkClaudeCli(),
      runAgent: (
        prompt: string,
        agentType: string,
        projectPath: string,
        sessionId?: string | null
      ) => this.runAgent(prompt, agentType, projectPath, sessionId),
      onAgentOutput: (callback: (output: AgentOutput) => void) => this.onAgentOutput(callback),
    }
  }

  // ============================================
  // AGENT API
  // ============================================

  async checkClaudeCli(): Promise<boolean> {
    if (!this.config.useRealCli) {
      return true // Mock always available
    }

    // Actually check if claude CLI exists
    return new Promise(resolve => {
      const proc = spawn('which', ['claude'])
      proc.on('close', code => {
        resolve(code === 0)
      })
      proc.on('error', () => {
        resolve(false)
      })
    })
  }

  async runAgent(
    prompt: string,
    agentType: string,
    projectPath: string,
    sessionId?: string | null
  ): Promise<AgentResult> {
    const newSessionId = sessionId || `mock-session-${++this.sessionCounter}`

    if (this.config.useRealCli) {
      return this.runRealCli(prompt, agentType, newSessionId)
    } else {
      return this.runMockAgent(prompt, agentType, newSessionId)
    }
  }

  async onAgentOutput(callback: (output: AgentOutput) => void): Promise<() => void> {
    this.outputListeners.push(callback)

    // Return unlisten function
    return () => {
      const index = this.outputListeners.indexOf(callback)
      if (index >= 0) {
        this.outputListeners.splice(index, 1)
      }
    }
  }

  // ============================================
  // MOCK AGENT
  // ============================================

  private async runMockAgent(
    prompt: string,
    agentType: string,
    sessionId: string
  ): Promise<AgentResult> {
    // Wait for configured delay
    await this.delay(this.config.responseDelay || 100)

    // Check for mock error
    if (this.config.mockError) {
      this.emitOutput({
        session_id: sessionId,
        agent_type: agentType,
        content: this.config.mockError,
        is_complete: false,
        is_error: true,
      })

      this.emitOutput({
        session_id: sessionId,
        agent_type: agentType,
        content: '',
        is_complete: true,
        is_error: false,
      })

      return {
        session_id: sessionId,
        success: false,
        output: '',
        error: this.config.mockError,
      }
    }

    // Determine output: raw text takes precedence over JSON response
    const output =
      this.config.mockRawOutput ??
      JSON.stringify(this.config.mockResponse || this.generateMockResponse(prompt), null, 2)

    // Emit streaming output
    this.emitOutput({
      session_id: sessionId,
      agent_type: agentType,
      content: output,
      is_complete: false,
      is_error: false,
    })

    // Emit completion
    this.emitOutput({
      session_id: sessionId,
      agent_type: agentType,
      content: '',
      is_complete: true,
      is_error: false,
    })

    return {
      session_id: sessionId,
      success: true,
      output,
      error: null,
    }
  }

  // ============================================
  // REAL CLI
  // ============================================

  private async runRealCli(
    prompt: string,
    agentType: string,
    sessionId: string
  ): Promise<AgentResult> {
    return new Promise(resolve => {
      let output = ''
      let hasError = false

      // Run claude CLI with the prompt
      const proc = spawn('claude', ['-p', prompt], {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      proc.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString()
        output += chunk

        this.emitOutput({
          session_id: sessionId,
          agent_type: agentType,
          content: chunk,
          is_complete: false,
          is_error: false,
        })
      })

      proc.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString()
        hasError = true

        this.emitOutput({
          session_id: sessionId,
          agent_type: agentType,
          content: chunk,
          is_complete: false,
          is_error: true,
        })
      })

      proc.on('close', code => {
        this.emitOutput({
          session_id: sessionId,
          agent_type: agentType,
          content: '',
          is_complete: true,
          is_error: false,
        })

        resolve({
          session_id: sessionId,
          success: code === 0 && !hasError,
          output,
          error: hasError ? 'CLI error' : null,
        })
      })

      proc.on('error', err => {
        this.emitOutput({
          session_id: sessionId,
          agent_type: agentType,
          content: err.message,
          is_complete: true,
          is_error: true,
        })

        resolve({
          session_id: sessionId,
          success: false,
          output: '',
          error: err.message,
        })
      })
    })
  }

  // ============================================
  // HELPERS
  // ============================================

  private emitOutput(output: AgentOutput) {
    for (const listener of this.outputListeners) {
      listener(output)
    }
    this.config.onOutput?.(output)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateMockResponse(prompt: string): FixerResponse {
    // Generate a simple mock response based on the prompt
    const lowerPrompt = prompt.toLowerCase()

    if (lowerPrompt.includes('button')) {
      return {
        explanation: 'Button-Komponente erstellt',
        changes: [
          {
            file: 'app.mir',
            action: 'insert',
            code: 'Button "Click me"\n  bg #3B82F6\n  col white\n  pad 12 24\n  rad 8',
            position: { line: 1 },
          },
        ],
      }
    }

    if (lowerPrompt.includes('card')) {
      return {
        explanation: 'Card-Komponente erstellt',
        changes: [
          {
            file: 'app.mir',
            action: 'insert',
            code: 'Card\n  pad 20\n  bg #1a1a1a\n  rad 12\n  Title "Card Title"\n  Text "Card content"',
            position: { line: 1 },
          },
        ],
      }
    }

    // Default response
    return {
      explanation: 'Änderung durchgeführt',
      changes: [
        {
          file: 'app.mir',
          action: 'insert',
          code: '// Generated from: ' + prompt.slice(0, 50),
          position: { line: 1 },
        },
      ],
    }
  }

  // ============================================
  // TEST HELPERS
  // ============================================

  /** Set mock response for next call */
  setMockResponse(response: FixerResponse) {
    this.config.mockResponse = response
  }

  /** Set raw text output for next call (takes precedence over response) */
  setMockRawOutput(output: string) {
    this.config.mockRawOutput = output
  }

  /** Set mock error for next call */
  setMockError(error: string) {
    this.config.mockError = error
  }

  /** Clear mock response/error/output */
  clearMocks() {
    this.config.mockResponse = undefined
    this.config.mockRawOutput = undefined
    this.config.mockError = undefined
  }
}

// ============================================
// FACTORY
// ============================================

export function createMockTauriBridge(config?: MockTauriBridgeConfig): MockTauriBridge {
  return new MockTauriBridge(config)
}
