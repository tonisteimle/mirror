/**
 * Eval-Driver für Redundanz-Compliance des LLM-Edit-Flows.
 *
 * Drei Klassen Redundanz:
 *   A) duplicate-property — `Frame ver, ver`
 *   B) redundant-wrapper — Frame ohne Properties + 1 Kind
 *   C) inherited-redundant — Re-Spezifikation von canvas-Default
 *
 * 3 von 5 Scenarios sind Mode 1 ohne Hint — das ist der eigentliche
 * Test ob der LLM diese Patterns von selbst sieht.
 *
 * Run:
 *   npx tsx scripts/eval-redundancy-quality.ts
 *   npx tsx scripts/eval-redundancy-quality.ts --only=rq-3
 */

import type { EditCaptureCtx } from '../studio/agent/edit-prompts'
import {
  checkComponentCompliance,
  checkRedundancyCompliance,
  checkTokenCompliance,
  type ComponentViolation,
  type RedundancyViolation,
  type TokenViolation,
} from '../studio/agent/quality-checks'
import {
  applyScenarioFilter,
  logScenarioHeader,
  parseEvalArgs,
  runEvalPipeline,
} from './lib/eval-driver'

interface RedScenario {
  id: string
  label: string
  question: string
  ctx: EditCaptureCtx
  /** Which redundancy class is being probed (for the report). */
  klass: 'A-duplicate' | 'B-wrapper' | 'C-inherited' | 'mixed'
}

const SCENARIOS: RedScenario[] = [
  // rq-1: Mode 2 selection — duplicate-property, asked via selection.
  {
    id: 'rq-1',
    label: 'mode 2 selection: duplicate property in selection',
    question: 'Selection auf `Frame ver, ver`: bereinigt LLM die Duplizierung?',
    klass: 'A-duplicate',
    ctx: {
      source: 'canvas mobile\n\nFrame ver, ver, gap 8\n  Text "Hello"\n  Text "World"',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: { from: 15, to: 35, text: 'Frame ver, ver, gap 8' },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
  },

  // rq-2: Mode 3 explicit — "entferne Redundanzen"
  {
    id: 'rq-2',
    label: 'mode 3 instruction: explicit "remove redundancy"',
    question: 'Anweisung "entferne Redundanzen": fixt LLM duplicate-property + inherited?',
    klass: 'mixed',
    ctx: {
      source: 'canvas mobile, col white\n\nFrame ver, ver, gap 8\n  Text "Hello", col white, fs 18',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction:
        'Entferne alle redundanten Properties (Duplikate, oder Re-Spezifikationen die bereits geerbt werden)',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
  },

  // rq-3: Mode 1 implicit — Klasse A (duplicate-property)
  // No hint. Will the LLM see `Frame ver, ver` and clean it?
  {
    id: 'rq-3',
    label: 'mode 1 implicit: duplicate property without hint',
    question: 'Source hat `Frame ver, ver`, KEIN Hint — sieht der LLM das Duplikat?',
    klass: 'A-duplicate',
    ctx: {
      source: 'canvas mobile\n\nFrame ver, ver, gap 8\n  Text "A"\n  Text "B"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
  },

  // rq-4: Mode 1 implicit — Klasse B (redundant-wrapper)
  // Frame > Frame > Text. Outer has property, inner is the redundant
  // wrapper. Without hint — will the LLM remove it?
  {
    id: 'rq-4',
    label: 'mode 1 implicit: redundant wrapper Frame without hint',
    question:
      'Empty Frame zwischen Outer und Text-Kind — sieht der LLM die unnötige Verschachtelung?',
    klass: 'B-wrapper',
    ctx: {
      source: 'canvas mobile\n\nFrame pad 16\n  Frame\n    Text "Hello"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
  },

  // rq-5: Mode 1 implicit — Klasse C (inherited-redundant)
  // canvas col white, Text col white. Without hint.
  {
    id: 'rq-5',
    label: 'mode 1 implicit: inherited redundancy without hint',
    question: 'canvas col white setzt Default — Text re-spezifiziert col white. Sieht der LLM das?',
    klass: 'C-inherited',
    ctx: {
      source:
        'canvas mobile, col white\n\nFrame gap 8\n  Text "Title", col white, fs 18\n  Text "Sub", col white',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
  },
]

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface ScenarioResult {
  scenario: RedScenario
  finalSource: string | null
  applyFailed: boolean
  noChange: boolean
  redundancyViolations: RedundancyViolation[]
  componentViolations: ComponentViolation[]
  tokenViolations: TokenViolation[]
  passed: boolean
  claudeMs: number
}

async function runScenario(s: RedScenario): Promise<ScenarioResult> {
  logScenarioHeader(s.id, s.label, s.question, [`Class: ${s.klass}`])
  const out = await runEvalPipeline(s.ctx)

  if (out.claudeError || out.applyFailed) {
    return {
      scenario: s,
      finalSource: null,
      applyFailed: true,
      noChange: false,
      redundancyViolations: [],
      componentViolations: [],
      tokenViolations: [],
      passed: false,
      claudeMs: out.claudeMs,
    }
  }

  const finalSource = out.finalSource as string
  const redResult = checkRedundancyCompliance(finalSource)
  const compResult = checkComponentCompliance(finalSource, s.ctx.projectFiles.components)
  const tokResult = checkTokenCompliance(finalSource, s.ctx.projectFiles.tokens)

  if (redResult.pass) {
    console.log(`✅ redundancy: clean`)
  } else {
    console.log(`❌ redundancy: ${redResult.violations.length} violation(s)`)
    redResult.violations.forEach((v, i) => {
      console.log(`   ${i + 1}. L${v.line} ${v.elementName}/${v.kind}: ${v.detail}`)
    })
  }
  if (!compResult.pass) {
    console.log(`❌ component: ${compResult.violations.length} violation(s)`)
  }
  if (!tokResult.pass) {
    console.log(`❌ token: ${tokResult.violations.length} violation(s)`)
  }

  return {
    scenario: s,
    finalSource,
    applyFailed: false,
    noChange: out.noChange,
    redundancyViolations: redResult.violations,
    componentViolations: compResult.violations,
    tokenViolations: tokResult.violations,
    passed: redResult.pass && compResult.pass && tokResult.pass,
    claudeMs: out.claudeMs,
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = parseEvalArgs()
  const scenarios = applyScenarioFilter(SCENARIOS, args, 'redundancy-quality')
  if (scenarios === null) return

  console.log(`Running ${scenarios.length} redundancy-quality scenario(s)...`)
  const results: ScenarioResult[] = []
  for (const s of scenarios) results.push(await runScenario(s))

  console.log('')
  console.log('═'.repeat(80))
  console.log('REDUNDANCY-COMPLIANCE SUMMARY')
  console.log('═'.repeat(80))
  let totalRed = 0
  let totalComp = 0
  let totalTok = 0
  let cleanCount = 0
  let applyFailedCount = 0
  for (const r of results) {
    const redTag =
      r.redundancyViolations.length === 0 ? '✓ red' : `✗${r.redundancyViolations.length}r`
    const compTag = r.componentViolations.length === 0 ? '   ' : `c${r.componentViolations.length}`
    const tokTag = r.tokenViolations.length === 0 ? '   ' : `t${r.tokenViolations.length}`
    let status: string
    if (r.applyFailed) {
      status = '⚠ apply-fail'
      applyFailedCount++
    } else {
      status = `${redTag} ${compTag} ${tokTag}` + (r.noChange ? ' (no-change)' : '')
      if (r.passed) cleanCount++
      totalRed += r.redundancyViolations.length
      totalComp += r.componentViolations.length
      totalTok += r.tokenViolations.length
    }
    console.log(`  ${status}  ${r.scenario.id} (${r.scenario.klass}) — ${r.scenario.label}`)
  }
  console.log('')
  console.log(
    `Clean: ${cleanCount} / ${results.length - applyFailedCount} evaluable | apply-fail: ${applyFailedCount}`
  )
  console.log(`Redundancy violations: ${totalRed} | component: ${totalComp} | token: ${totalTok}`)

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
