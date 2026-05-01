/**
 * Eval-Driver für Component-Compliance des LLM-Edit-Flows.
 *
 * Analog zu eval-token-quality.ts: nutzt dieselbe production pipeline
 * (buildEditPrompt → claude CLI → parsePatchResponse → applyPatches),
 * addiert aber den Component-Compliance-Check als Quality-Assert.
 *
 * Frage: "Wie oft schreibt der LLM Inline-Properties, obwohl eine
 * Component verfügbar wäre, die genau diese Property-Kombination ist?"
 *
 * Run:
 *   npx tsx scripts/eval-component-quality.ts                # alle 5
 *   npx tsx scripts/eval-component-quality.ts --only=cq-4    # einzeln
 *   npx tsx scripts/eval-component-quality.ts --list
 *
 * Foreground, sichtbar — pro Scenario ~5-15s.
 */

import type { EditCaptureCtx } from '../studio/agent/edit-prompts'
import {
  checkComponentCompliance,
  checkTokenCompliance,
  type ComponentViolation,
  type TokenViolation,
} from '../studio/agent/quality-checks'
import {
  applyScenarioFilter,
  logScenarioHeader,
  parseEvalArgs,
  runEvalPipeline,
} from './lib/eval-driver'

interface CompScenario {
  id: string
  label: string
  question: string
  ctx: EditCaptureCtx
}

// =============================================================================
// SCENARIOS
// =============================================================================

const SCENARIOS: CompScenario[] = [
  // cq-1: Mode 2 — selection on inline element that duplicates a component.
  {
    id: 'cq-1',
    label: 'mode 2 selection: inline duplicates available component',
    question: 'Selection auf Inline-Button mit Component-Properties: ersetzt LLM durch Component?',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Button "Save", bg $primary, col white, pad 12 24\n  PrimaryBtn "Cancel"',
      fileName: 'app.mir',
      cursor: { line: 4, col: 1 },
      selection: {
        from: 22,
        to: 73,
        text: '  Button "Save", bg $primary, col white, pad 12 24',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.bg: #2271C1' },
        components: {
          'components.com': 'PrimaryBtn as Button: bg $primary, col white, pad 12 24',
        },
      },
    },
  },

  // cq-2: Mode 3 explicit — "use the PrimaryBtn component".
  {
    id: 'cq-2',
    label: 'mode 3 instruction: explicit "use the component"',
    question: 'Klare Anweisung "nutze PrimaryBtn": ersetzt LLM die Inline-Variante?',
    ctx: {
      source: 'canvas mobile\n\nFrame gap 8\n  Button "Save", bg $primary, col white, pad 12 24',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Verwende die PrimaryBtn Component statt der Inline-Properties',
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.bg: #2271C1' },
        components: {
          'components.com': 'PrimaryBtn as Button: bg $primary, col white, pad 12 24',
        },
      },
    },
  },

  // cq-3: Mode 3 — extract repeated pattern as a new component.
  {
    id: 'cq-3',
    label: 'mode 3 instruction: extract repeated inline as component',
    question:
      'Drei identische Inline-Buttons + Anweisung "extrahiere als Component": baut LLM die Component und nutzt sie?',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Button "Save", bg #2271C1, col white, pad 12 24, rad 6\n  Button "Cancel", bg #2271C1, col white, pad 12 24, rad 6\n  Button "Delete", bg #2271C1, col white, pad 12 24, rad 6',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction:
        'Extrahiere die wiederholten Button-Properties in eine Component "PrimaryBtn" oben in der Datei und ersetze alle drei Buttons durch Verwendungen davon.',
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
  },

  // cq-4: Mode 1 implicit — THE HOLE. Component available, user wrote
  // inline duplicate, NO instruction. Will the LLM see it?
  {
    id: 'cq-4',
    label: 'mode 1 implicit: inline duplicates component (no instruction)',
    question:
      'Component verfügbar, Inline-Duplikat geschrieben, KEINE explizite Anweisung — sieht der LLM das?',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Button "Save", bg $primary, col white, pad 12 24\n  Button "Cancel"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.bg: #2271C1' },
        components: {
          'components.com': 'PrimaryBtn as Button: bg $primary, col white, pad 12 24',
        },
      },
    },
  },

  // cq-5: Mode 3 — add new element. Component available — does the LLM
  // use it instead of inline-Button-with-properties?
  {
    id: 'cq-5',
    label: 'mode 3 generation: add element when component is available',
    question:
      'Anweisung "füge primären Save-Button hinzu", Component verfügbar — nutzt LLM die Component?',
    ctx: {
      source: 'canvas mobile\n\nFrame gap 8\n  Text "Welcome", col white, fs 18',
      fileName: 'app.mir',
      cursor: { line: 4, col: 1 },
      selection: null,
      instruction:
        'Füge unter dem Welcome-Text einen primären "Speichern"-Button hinzu (passend zur Theme).',
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.bg: #2271C1' },
        components: {
          'components.com': 'PrimaryBtn as Button: bg $primary, col white, pad 12 24',
        },
      },
    },
  },
]

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface ScenarioResult {
  scenario: CompScenario
  finalSource: string | null
  applyFailed: boolean
  noChange: boolean
  componentViolations: ComponentViolation[]
  tokenViolations: TokenViolation[]
  passed: boolean
  claudeMs: number
}

async function runScenario(s: CompScenario): Promise<ScenarioResult> {
  logScenarioHeader(s.id, s.label, s.question)
  const out = await runEvalPipeline(s.ctx)

  if (out.claudeError || out.applyFailed) {
    return {
      scenario: s,
      finalSource: null,
      applyFailed: true,
      noChange: false,
      componentViolations: [],
      tokenViolations: [],
      passed: false,
      claudeMs: out.claudeMs,
    }
  }

  const finalSource = out.finalSource as string
  const compResult = checkComponentCompliance(finalSource, s.ctx.projectFiles.components)
  const tokResult = checkTokenCompliance(finalSource, s.ctx.projectFiles.tokens)

  if (compResult.pass) {
    console.log(`✅ component-compliance: clean`)
  } else {
    console.log(`❌ component-compliance: ${compResult.violations.length} violation(s)`)
    compResult.violations.forEach((v, i) => {
      console.log(
        `   ${i + 1}. L${v.line} ${v.inlineElementType}(${v.matchedProperties.join(', ')}) → ${v.suggestedComponent}`
      )
    })
  }
  if (tokResult.pass) {
    console.log(`✅ token-compliance: clean`)
  } else {
    console.log(`❌ token-compliance: ${tokResult.violations.length} violation(s)`)
    tokResult.violations.forEach((v, i) => {
      console.log(
        `   ${i + 1}. L${v.line} ${v.elementName} ${v.propertyName}=${v.hardcodedValue} → ${v.suggestedToken}`
      )
    })
  }

  return {
    scenario: s,
    finalSource,
    applyFailed: false,
    noChange: out.noChange,
    componentViolations: compResult.violations,
    tokenViolations: tokResult.violations,
    passed: compResult.pass && tokResult.pass,
    claudeMs: out.claudeMs,
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = parseEvalArgs()
  const scenarios = applyScenarioFilter(SCENARIOS, args, 'component-quality')
  if (scenarios === null) return

  console.log(`Running ${scenarios.length} component-quality scenario(s)...`)
  const results: ScenarioResult[] = []
  for (const s of scenarios) results.push(await runScenario(s))

  console.log('')
  console.log('═'.repeat(80))
  console.log('COMPONENT-COMPLIANCE SUMMARY')
  console.log('═'.repeat(80))
  let totalCompViol = 0
  let totalTokViol = 0
  let cleanCount = 0
  let applyFailedCount = 0
  for (const r of results) {
    const compTag =
      r.componentViolations.length === 0 ? '✓ comp' : `✗${r.componentViolations.length}c`
    const tokTag = r.tokenViolations.length === 0 ? '✓ tok' : `✗${r.tokenViolations.length}t`
    let status: string
    if (r.applyFailed) {
      status = '⚠ apply-fail'
      applyFailedCount++
    } else {
      status = `${compTag} | ${tokTag}` + (r.noChange ? ' (no-change)' : '')
      if (r.passed) cleanCount++
      totalCompViol += r.componentViolations.length
      totalTokViol += r.tokenViolations.length
    }
    console.log(`  ${status}  ${r.scenario.id}  — ${r.scenario.label}`)
  }
  console.log('')
  console.log(
    `Clean: ${cleanCount} / ${results.length - applyFailedCount} evaluable | apply-fail: ${applyFailedCount}`
  )
  console.log(
    `Total component violations: ${totalCompViol} | total token violations: ${totalTokViol}`
  )

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
