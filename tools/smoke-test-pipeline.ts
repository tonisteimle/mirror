/**
 * Smoke-Test für die Generation-Pipeline.
 *
 * Liest einen Mirror-Sketch (oder akzeptiert einen --prompt), schickt ihn
 * durch beide Stufen (HTML-Gen → Translation), validiert das Mirror-Output
 * mit dem Compiler-Validator und schreibt alle Zwischen-Artefakte auf Disk.
 *
 * Voraussetzungen:
 *   - `claude` CLI in PATH oder via `CLAUDE_BIN` Env-Var
 *   - AI-Bridge-Server läuft (`npm run ai-bridge`)
 *
 * Usage:
 *   # Sketch durchschicken
 *   npx tsx tools/smoke-test-pipeline.ts --sketch tools/experiments/svelte-spike/sketch-input.mir
 *
 *   # Freier Prompt
 *   npx tsx tools/smoke-test-pipeline.ts --prompt "Stat-Card mit Monthly Revenue $48,217 und +12%"
 *
 *   # Output-Verzeichnis (default: tools/experiments/smoke-runs/<timestamp>/)
 *   npx tsx tools/smoke-test-pipeline.ts --sketch <file> --out <dir>
 *
 * Hinweis: Pipeline-Logik ist hier replizert (statt aus studio-Bundle zu
 * importieren), weil das Studio-Bundle Browser-only ist (window.TauriBridge
 * etc.). Die Prompt-Builder werden direkt aus studio/agent/ importiert —
 * sie sind reine Funktionen ohne Browser-Abhängigkeit.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

import {
  buildHtmlGenerationPrompt,
  buildTranslationPrompt,
} from '../studio/agent/generation-prompts'
import { validate, type ValidationError, type ValidationResult } from '../compiler/validator'

const BRIDGE_URL = process.env.AI_BRIDGE_URL || 'http://localhost:3456'

interface AgentResult {
  session_id: string
  success: boolean
  output: string
  error: string | null
}

async function callBridge(prompt: string): Promise<AgentResult> {
  const res = await fetch(`${BRIDGE_URL}/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, agentType: 'edit', sessionId: null }),
  })
  if (!res.ok) {
    throw new Error(`Bridge HTTP ${res.status}: ${await res.text()}`)
  }
  return (await res.json()) as AgentResult
}

function stripCodeFences(raw: string, language: 'html' | 'mirror'): string {
  let s = raw.trim()
  const openRegex = new RegExp(`^\`\`\`(?:${language}|html|mirror)?\\s*\\n`)
  const openMatch = s.match(openRegex)
  if (!openMatch) return s
  s = s.slice(openMatch[0].length)
  const closeMatch = s.match(/\n```\s*$/)
  if (closeMatch) s = s.slice(0, s.length - closeMatch[0].length)
  return s
}

function formatErrors(errors: ValidationError[]): string {
  return errors
    .map(
      e =>
        `- [${e.code}] L${e.line}:${e.column}  ${e.message}` +
        (e.suggestion ? ` — ${e.suggestion}` : '')
    )
    .join('\n')
}

// Mirror the pipeline's W500 elevation so the smoke test exercises the same
// retry trigger as the production pipeline. Keep both sides in sync if this
// changes — see studio/agent/generation-pipeline.ts.
const VALID_TOKEN_REF_RE = /^\$[a-zA-Z_][a-zA-Z0-9_-]*(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)?$/

function looksLikeRealTokenRef(message: string): boolean {
  const match = message.match(/^Token "([^"]+)" is not defined$/)
  if (!match) return true
  return VALID_TOKEN_REF_RE.test(match[1])
}

function selectBlockingIssues(result: ValidationResult): ValidationError[] {
  const blocking: ValidationError[] = [...result.errors]
  for (const w of result.warnings) {
    if (w.code === 'W500' && looksLikeRealTokenRef(w.message)) {
      blocking.push({ ...w, severity: 'error' })
    }
  }
  return blocking
}

function parseArgs(argv: string[]): { sketch?: string; prompt?: string; out?: string } {
  const args: { sketch?: string; prompt?: string; out?: string } = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--sketch') args.sketch = argv[++i]
    else if (a === '--prompt') args.prompt = argv[++i]
    else if (a === '--out') args.out = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.sketch && !args.prompt) {
    console.error('Usage: smoke-test-pipeline.ts (--sketch <file> | --prompt <text>) [--out <dir>]')
    process.exit(1)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = args.out ?? join('tools', 'experiments', 'smoke-runs', stamp)
  mkdirSync(outDir, { recursive: true })

  const sketch = args.sketch ? readFileSync(args.sketch, 'utf8') : undefined
  const userPrompt = args.prompt

  console.log('═══ Generation-Pipeline Smoke Test ═══')
  console.log(`Output → ${outDir}`)
  if (sketch) console.log(`Sketch:\n${sketch}`)
  if (userPrompt) console.log(`Prompt: ${userPrompt}`)
  console.log()

  // -------------------------------------------------------------------------
  // Stage 1: HTML-Generation
  // -------------------------------------------------------------------------
  console.log('[1/3] HTML-Generation läuft …')
  const htmlPrompt = buildHtmlGenerationPrompt({ userPrompt, sketch })
  writeFileSync(join(outDir, 'html-prompt.md'), htmlPrompt)

  const htmlStart = Date.now()
  const htmlResult = await callBridge(htmlPrompt)
  if (!htmlResult.success) {
    console.error(`✗ HTML-Stage failed: ${htmlResult.error}`)
    process.exit(1)
  }
  const html = stripCodeFences(htmlResult.output, 'html').trim()
  writeFileSync(join(outDir, 'output.html'), html)
  console.log(`    ✓ ${html.length} chars in ${((Date.now() - htmlStart) / 1000).toFixed(1)}s`)

  // -------------------------------------------------------------------------
  // Stage 2: Translation (1. Versuch)
  // -------------------------------------------------------------------------
  console.log('[2/3] Translation läuft …')
  const translationPrompt = buildTranslationPrompt({ html })
  writeFileSync(join(outDir, 'translation-prompt.md'), translationPrompt)

  const translateStart = Date.now()
  const translateResult = await callBridge(translationPrompt)
  if (!translateResult.success) {
    console.error(`✗ Translation-Stage failed: ${translateResult.error}`)
    process.exit(1)
  }
  let mirror = stripCodeFences(translateResult.output, 'mirror').trim()
  writeFileSync(join(outDir, 'output.mir'), mirror)
  console.log(
    `    ✓ ${mirror.length} chars in ${((Date.now() - translateStart) / 1000).toFixed(1)}s`
  )

  // -------------------------------------------------------------------------
  // Stage 3: Validate (+ ein Retry bei Fail)
  // -------------------------------------------------------------------------
  console.log('[3/3] Validator läuft …')
  let validation = validate(mirror)
  let blocking = selectBlockingIssues(validation)
  let retries = 0

  if (blocking.length > 0) {
    console.log(
      `    ⚠ ${blocking.length} blockierende Issues — starte Translator-Retry mit Fehler-Hint`
    )
    writeFileSync(join(outDir, 'validation-errors-attempt-1.txt'), formatErrors(blocking))

    const retryPrompt = buildTranslationPrompt({
      html,
      retryContext: {
        validationErrors: blocking,
        previousMirror: mirror,
      },
    })
    writeFileSync(join(outDir, 'translation-prompt-retry.md'), retryPrompt)

    const retryStart = Date.now()
    const retryResult = await callBridge(retryPrompt)
    if (!retryResult.success) {
      console.error(`✗ Translation-Retry failed: ${retryResult.error}`)
      process.exit(1)
    }
    mirror = stripCodeFences(retryResult.output, 'mirror').trim()
    writeFileSync(join(outDir, 'output.mir'), mirror)
    console.log(
      `    ✓ retry: ${mirror.length} chars in ${((Date.now() - retryStart) / 1000).toFixed(1)}s`
    )
    retries = 1
    validation = validate(mirror)
    blocking = selectBlockingIssues(validation)
  }

  // -------------------------------------------------------------------------
  // Report
  // -------------------------------------------------------------------------
  console.log()
  console.log('═══ Ergebnis ═══')
  if (blocking.length === 0) {
    console.log(`✓ Mirror passes validator (retries: ${retries})`)
  } else {
    console.log(`⚠ Mirror has ${blocking.length} blocking issues after ${retries} retries`)
    writeFileSync(join(outDir, 'validation-errors-final.txt'), formatErrors(blocking))
    console.log(formatErrors(blocking))
  }
  if (validation.warningCount > 0) {
    console.log(`  ${validation.warningCount} non-blocking warnings`)
  }
  console.log()
  console.log('Output-Files:')
  console.log(`  ${outDir}/html-prompt.md`)
  console.log(`  ${outDir}/output.html`)
  console.log(`  ${outDir}/translation-prompt.md`)
  console.log(`  ${outDir}/output.mir`)

  console.log()
  console.log('--- generated Mirror ---')
  console.log(mirror)
}

main().catch(err => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
