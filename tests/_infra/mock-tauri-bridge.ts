/**
 * Mock Tauri Bridge for Testing
 *
 * Two modes:
 * 1. Mock Mode - Returns predefined responses (fast, deterministic)
 * 2. CLI Mode - Actually calls Claude CLI (slow, real results)
 */

import { spawn } from 'child_process'

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
  /**
   * Raw output string returned for the next mock call. The live AI path
   * (`generateDraftCode`) consumes raw text — typically a ```mirror code
   * block. Defaults to an empty string if unset.
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
    _prompt: string,
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

    const output = this.config.mockRawOutput ?? ''

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

  // ============================================
  // TEST HELPERS
  // ============================================

  /** Set raw text output for next call */
  setMockRawOutput(output: string) {
    this.config.mockRawOutput = output
  }

  /** Set mock error for next call */
  setMockError(error: string) {
    this.config.mockError = error
  }

  /** Clear mock output + error */
  clearMocks() {
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
