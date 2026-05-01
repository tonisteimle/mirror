/**
 * Eval-Driver für Token-Compliance des LLM-Edit-Flows.
 *
 * Nutzt dieselbe production pipeline wie eval-edit-flow.ts (buildEditPrompt
 * → claude CLI → parsePatchResponse → applyPatches), addiert aber den
 * Token-Compliance-Check als zusätzlichen Quality-Assert.
 *
 * Frage die wir beantworten wollen:
 *   "Wie oft schreibt der LLM hardcodete Werte, obwohl ein Token verfügbar wäre?"
 *
 * Run:
 *   npx tsx scripts/eval-token-quality.ts                # alle Scenarios
 *   npx tsx scripts/eval-token-quality.ts --only=tq-1    # einzelnes
 *   npx tsx scripts/eval-token-quality.ts --list         # IDs auflisten
 *
 * Foreground, sichtbar — pro Scenario ~5-10s (claude CLI).
 */

import type { EditCaptureCtx } from '../studio/agent/edit-prompts'
import { checkTokenCompliance, type TokenViolation } from '../studio/agent/quality-checks'
import {
  applyScenarioFilter,
  logScenarioHeader,
  parseEvalArgs,
  runEvalPipeline,
} from './lib/eval-driver'

// =============================================================================
// SCENARIO TYPES
// =============================================================================

interface TokenScenario {
  id: string
  label: string
  /** Was prüfen wir konkret in diesem Scenario? */
  question: string
  ctx: EditCaptureCtx
}

// =============================================================================
// SCENARIOS — token-relevant only
// =============================================================================

const SCENARIOS: TokenScenario[] = [
  // S1: Existing scenario from eval-edit-flow.ts (mode2-3) — selected hex
  // is being replaced with token. Explicit instruction (selection-bound).
  {
    id: 'tq-1',
    label: 'mode 2 selection: replace selected hardcoded color',
    question:
      'Bei Selection eines Hex-Werts (#2271C1) und vorhandenem $primary token: ersetzt LLM korrekt durch $primary?',
    ctx: {
      source: 'canvas mobile\n\nFrame gap 8\n  Button "Save", bg #2271C1\n  Button "Cancel"',
      fileName: 'app.mir',
      cursor: { line: 4, col: 25 },
      selection: { from: 50, to: 57, text: '#2271C1' },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.bg: #2271C1' },
        components: {},
      },
    },
  },

  // S2: Existing scenario (mode3-1) — explicit instruction to use token.
  {
    id: 'tq-2',
    label: 'mode 3 instruction: explicit token-extraction request',
    question: 'Mit klarer Anweisung "$primary statt #2271C1": ersetzt LLM ALLE Vorkommen?',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 12\n  Text "Title", col #2271C1, fs 18\n  Text "Sub", col #2271C1, fs 14',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Verwende den $primary Token für die col-Properties statt #2271C1',
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.col: #2271C1' },
        components: {},
      },
    },
  },

  // S3: Existing scenario (mode3-6) — instruction to define new token + extract.
  {
    id: 'tq-3',
    label: 'mode 3 instruction: define + extract token',
    question:
      'Mit Anweisung "definiere primary.bg + ersetze alle #2271C1": macht LLM beides korrekt?',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Button "A", bg #2271C1, col white\n  Button "B", bg #2271C1, col white\n  Button "C", bg #2271C1, col white',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction:
        'Definiere oben in der Datei einen Token `primary.bg: #2271C1` und ersetze alle Vorkommen von #2271C1 durch $primary',
      diffSinceLastCall: '',
      projectFiles: { tokens: { 'tokens.tok': '' }, components: {} },
    },
  },

  // S4: NEW — implicit token-awareness test.
  // Tokens verfügbar, User schreibt hardcoded und ruft Mode 1 auf
  // (kein explizit token-related instruction). Erkennt der LLM von
  // selbst dass er den Token nutzen sollte? Das ist der eigentlich
  // interessante Test — Idiom-Disziplin ohne explizite Aufforderung.
  {
    id: 'tq-4',
    label: 'mode 1 implicit: hardcoded value duplicates available token',
    question:
      'Tokens verfügbar, hardcoded geschrieben, KEINE explizite Token-Aufforderung — sieht der LLM das selbst?',
    ctx: {
      source:
        'canvas mobile\n\nFrame pad 16, gap 12\n  Text "Title", col white, fs 18\n  Button "Save", bg #2271C1, col white, pad 12 24, rad 6',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: {
          'tokens.tok': 'primary.bg: #2271C1\ntext.col: white\nm.pad: 12\nl.pad: 16\nm.rad: 6',
        },
        components: {},
      },
    },
  },

  // S5: NEW — Mode 3 with rich token context, asked to ADD new content.
  // Will the LLM use available tokens for the new code, or invent
  // hardcoded values?
  {
    id: 'tq-5',
    label: 'mode 3 generation: add new element in token-rich context',
    question:
      'LLM soll neuen Button hinzufügen. Reiche Token-Palette verfügbar — nutzt LLM Tokens, oder erfindet er Hex?',
    ctx: {
      source: 'canvas mobile\n\nFrame pad $l, gap $m\n  Text "Hello", col $text, fs 18',
      fileName: 'app.mir',
      cursor: { line: 4, col: 1 },
      selection: null,
      instruction: 'Füge unter dem Text einen primären Save-Button hinzu (passend zum Theme).',
      diffSinceLastCall: '',
      projectFiles: {
        tokens: {
          'tokens.tok':
            'primary.bg: #2271C1\ndanger.bg: #ef4444\ntext.col: white\nmuted.col: #a1a1aa\nm.pad: 12\nl.pad: 16\nm.gap: 8\nm.rad: 8',
        },
        components: {},
      },
    },
  },
]

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface ScenarioResult {
  scenario: TokenScenario
  finalSource: string | null
  /** Patches were attempted but didn't apply. */
  applyFailed: boolean
  /** No patches at all (LLM said "no change"). */
  noChange: boolean
  violations: TokenViolation[]
  passed: boolean
  claudeMs: number
}

async function runScenario(s: TokenScenario): Promise<ScenarioResult> {
  logScenarioHeader(s.id, s.label, s.question)
  const out = await runEvalPipeline(s.ctx)

  if (out.claudeError || out.applyFailed) {
    return {
      scenario: s,
      finalSource: null,
      applyFailed: true,
      noChange: false,
      violations: [],
      passed: false,
      claudeMs: out.claudeMs,
    }
  }

  const finalSource = out.finalSource as string
  const tokenResult = checkTokenCompliance(finalSource, s.ctx.projectFiles.tokens)
  if (tokenResult.pass) {
    console.log(`✅ token-compliance: clean`)
  } else {
    console.log(`❌ token-compliance: ${tokenResult.violations.length} violation(s)`)
    tokenResult.violations.forEach((v, i) => {
      console.log(
        `   ${i + 1}. L${v.line} ${v.elementName} ${v.propertyName} = ${v.hardcodedValue}  (suggested: ${v.suggestedToken})`
      )
    })
  }

  return {
    scenario: s,
    finalSource,
    applyFailed: false,
    noChange: out.noChange,
    violations: tokenResult.violations,
    passed: tokenResult.pass,
    claudeMs: out.claudeMs,
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = parseEvalArgs()
  const scenarios = applyScenarioFilter(SCENARIOS, args, 'token-quality')
  if (scenarios === null) return

  console.log(`Running ${scenarios.length} token-quality scenario(s)...`)
  const results: ScenarioResult[] = []
  for (const s of scenarios) results.push(await runScenario(s))

  console.log('')
  console.log('═'.repeat(80))
  console.log('TOKEN-COMPLIANCE SUMMARY')
  console.log('═'.repeat(80))
  // A scenario "passes token-compliance" iff the FINAL source (whether
  // mutated or no-change) is clean. A no-change response is a violation
  // if the source had violations to begin with — silence is not virtue
  // when there's hardcoded duplication right there.
  let totalViolations = 0
  let scenariosWithViolations = 0
  let scenariosClean = 0
  let scenariosApplyFailed = 0
  for (const r of results) {
    let status: string
    if (r.applyFailed) {
      status = '⚠ apply-fail'
      scenariosApplyFailed++
    } else if (r.violations.length > 0) {
      const tag = r.noChange ? 'no-change MISSED' : 'wrote'
      status = `✗ ${r.violations.length} viol (${tag})`
      scenariosWithViolations++
      totalViolations += r.violations.length
    } else {
      status = r.noChange ? '○ no-change clean' : '✓ clean'
      scenariosClean++
    }
    console.log(`  ${status}  ${r.scenario.id}  — ${r.scenario.label}`)
  }
  const evaluable = results.length - scenariosApplyFailed
  console.log('')
  console.log(`Evaluable: ${evaluable} / ${results.length}`)
  console.log(
    `Clean: ${scenariosClean} | with violations: ${scenariosWithViolations} | apply-fail: ${scenariosApplyFailed}`
  )
  console.log(`Total token violations across all scenarios: ${totalViolations}`)

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
