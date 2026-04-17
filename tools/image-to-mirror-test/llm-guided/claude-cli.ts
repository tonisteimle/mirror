/**
 * Claude CLI Integration for Image Analysis
 *
 * Uses local Claude CLI to analyze screenshots.
 * Requires: npm install -g @anthropic-ai/claude-code
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { LLMAnalysis, LLMInterface } from './types'

// =============================================================================
// Claude CLI Interface
// =============================================================================

interface ClaudeCliOptions {
  timeoutMs?: number
  verbose?: boolean
}

/**
 * Call Claude CLI with a prompt
 */
async function callClaude(prompt: string, options: ClaudeCliOptions = {}): Promise<string> {
  const { timeoutMs = 60000, verbose = false } = options

  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'text']

    if (verbose) {
      console.log('[Claude CLI] Running with prompt length:', prompt.length)
    }

    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    const timeout = setTimeout(() => {
      killed = true
      claude.kill('SIGTERM')
      reject(new Error(`Claude CLI timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    claude.stdout.on('data', data => {
      stdout += data.toString()
    })

    claude.stderr.on('data', data => {
      stderr += data.toString()
    })

    claude.on('close', code => {
      clearTimeout(timeout)
      if (killed) return
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`))
      }
    })

    claude.on('error', err => {
      clearTimeout(timeout)
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`))
    })
  })
}

/**
 * Call Claude CLI with an image file
 */
async function callClaudeWithImage(
  imagePath: string,
  prompt: string,
  options: ClaudeCliOptions = {}
): Promise<string> {
  const { timeoutMs = 90000, verbose = false } = options

  // Verify image exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`)
  }

  // Get absolute path
  const absPath = path.resolve(imagePath)

  return new Promise((resolve, reject) => {
    // Claude CLI can read images with the Read tool
    const fullPrompt = `Lies das Bild ${absPath} und analysiere es.

${prompt}`

    const args = ['-p', fullPrompt, '--output-format', 'text', '--allowedTools', 'Read']

    if (verbose) {
      console.log('[Claude CLI] Running with image:', imagePath)
    }

    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    const timeout = setTimeout(() => {
      killed = true
      claude.kill('SIGTERM')
      reject(new Error(`Claude CLI timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    claude.stdout.on('data', data => {
      stdout += data.toString()
    })

    claude.stderr.on('data', data => {
      stderr += data.toString()
    })

    claude.on('close', code => {
      clearTimeout(timeout)
      if (killed) return
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`))
      }
    })

    claude.on('error', err => {
      clearTimeout(timeout)
      reject(new Error(`Failed to spawn Claude CLI: ${err.message}`))
    })
  })
}

// =============================================================================
// Image Analysis Prompt
// =============================================================================

const IMAGE_ANALYSIS_PROMPT = `Du bist ein UI-Analyse-Experte. Analysiere das Bild und beschreibe die UI-Elemente.

Gib EXAKT dieses JSON-Format zurück:
\`\`\`json
{
  "description": "Kurze Beschreibung was du siehst",
  "elements": [
    {
      "type": "button|text|icon|input|checkbox|select|container|image",
      "description": "Beschreibung des Elements",
      "position": "center|top|bottom|left|right|top-left|top-right|bottom-left|bottom-right",
      "text": "Sichtbarer Text (falls vorhanden)",
      "iconName": "Name des Icons (falls erkennbar, z.B. check, plus, settings)"
    }
  ],
  "layout": {
    "direction": "horizontal|vertical",
    "gap": "none|small|medium|large"
  },
  "componentType": "Button|Input|Checkbox|Select|Tabs|Card|null"
}
\`\`\`

WICHTIG:
- Beschreibe NUR was du im Bild siehst
- Bei Icons: Versuche das Icon zu identifizieren (check, plus, minus, settings, user, etc.)
- componentType: Welche Zag-Komponente passt am besten?
- Gib NUR das JSON zurück, keine Erklärungen`

// =============================================================================
// Claude LLM Implementation
// =============================================================================

export class ClaudeCLI implements LLMInterface {
  private verbose: boolean

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose || false
  }

  /**
   * Check if Claude CLI is available
   */
  async isAvailable(): Promise<boolean> {
    return new Promise(resolve => {
      const which = spawn('which', ['claude'])
      which.on('close', code => {
        resolve(code === 0)
      })
      which.on('error', () => {
        resolve(false)
      })
    })
  }

  /**
   * Analyze an image and return structured analysis
   */
  async analyze(imageBuffer: Buffer, context?: string): Promise<LLMAnalysis> {
    // Save buffer to temp file
    const tempDir = '/tmp/mirror-llm'
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const tempPath = path.join(tempDir, `analysis-${Date.now()}.png`)
    fs.writeFileSync(tempPath, imageBuffer)

    try {
      const prompt = context
        ? `${IMAGE_ANALYSIS_PROMPT}\n\nKontext: ${context}`
        : IMAGE_ANALYSIS_PROMPT

      const response = await callClaudeWithImage(tempPath, prompt, {
        verbose: this.verbose,
        timeoutMs: 90000,
      })

      return this.parseResponse(response)
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    }
  }

  /**
   * Analyze an image file directly
   */
  async analyzeFile(imagePath: string, context?: string): Promise<LLMAnalysis> {
    const prompt = context
      ? `${IMAGE_ANALYSIS_PROMPT}\n\nKontext: ${context}`
      : IMAGE_ANALYSIS_PROMPT

    const response = await callClaudeWithImage(imagePath, prompt, {
      verbose: this.verbose,
      timeoutMs: 90000,
    })

    return this.parseResponse(response)
  }

  /**
   * Parse Claude response to LLMAnalysis
   */
  private parseResponse(response: string): LLMAnalysis {
    // Try to extract JSON from response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) || response.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      console.error('[Claude CLI] No JSON found in response:', response.slice(0, 500))
      return {
        description: 'Analyse fehlgeschlagen',
        elements: [],
      }
    }

    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonStr)

      // Validate and normalize
      return {
        description: parsed.description || 'Keine Beschreibung',
        elements: (parsed.elements || []).map((e: any) => ({
          type: e.type || 'container',
          description: e.description || '',
          position: e.position || 'center',
          text: e.text,
          iconName: e.iconName,
          children: e.children,
        })),
        layout: parsed.layout,
        componentType: parsed.componentType,
        needsRecursion: parsed.needsRecursion,
      }
    } catch (e) {
      console.error('[Claude CLI] Failed to parse JSON:', e)
      return {
        description: 'JSON-Parsing fehlgeschlagen',
        elements: [],
      }
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createClaudeCLI(options?: { verbose?: boolean }): ClaudeCLI {
  return new ClaudeCLI(options)
}

// =============================================================================
// Quick Test
// =============================================================================

async function quickTest() {
  console.log('Testing Claude CLI availability...')

  const cli = createClaudeCLI({ verbose: true })
  const available = await cli.isAvailable()

  if (available) {
    console.log('✅ Claude CLI is available')
  } else {
    console.log('❌ Claude CLI is not available')
    console.log('   Install with: npm install -g @anthropic-ai/claude-code')
  }
}

// Run test if called directly
if (process.argv[1]?.endsWith('claude-cli.ts')) {
  quickTest().catch(console.error)
}
