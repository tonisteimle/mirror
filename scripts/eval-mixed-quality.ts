/**
 * Eval-Driver für CROSS-CUTTING Quality-Compliance.
 *
 * Die fokussierten Eval-Sets (eval-token-quality, eval-component-quality,
 * eval-redundancy-quality) testen jede Dimension isoliert. In der Realität
 * mischen sich aber Anti-Patterns: ein Source kann gleichzeitig hardcodete
 * Werte, fehlende Component-Verwendung und redundante Properties enthalten.
 *
 * Diese Datei testet mehrere Verstöße in einem Source — Mode 1 ohne Hint.
 * Frage: Erkennt der LLM ALLE Anti-Patterns gleichzeitig, oder fixt er
 * nur die "offensichtlichen"?
 *
 * Plus: ein Clean-Code-Scenario (mq-5) um zu prüfen dass die Stille-
 * Klausel hält wenn nichts zu fixen ist.
 *
 * Run:
 *   npx tsx scripts/eval-mixed-quality.ts
 *   npx tsx scripts/eval-mixed-quality.ts --only=mq-1
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

interface MixedScenario {
  id: string
  label: string
  question: string
  expected: { kind: 'must-improve'; expectedFixes: string[] } | { kind: 'must-be-silent' }
  ctx: EditCaptureCtx
}

const SCENARIOS: MixedScenario[] = [
  // mq-1: Card with hardcoded color + available component + available token.
  // Three violations: Token + Component (button could use PrimaryBtn).
  {
    id: 'mq-1',
    label: 'card with hardcoded color + missing component usage',
    question:
      'Mode 1: hardcoded #2271C1 obwohl $primary verfügbar, Inline-Button obwohl PrimaryBtn verfügbar — sieht der LLM beides?',
    expected: {
      kind: 'must-improve',
      expectedFixes: [
        'replaces hardcoded #2271C1 with $primary OR uses PrimaryBtn',
        'final source has no token or component violations',
      ],
    },
    ctx: {
      source:
        'canvas mobile, bg #1a1a1a\n\nFrame pad 16, gap 12, bg #222, rad 8\n  Text "Card Title", col white, fs 18\n  Button "Speichern", bg #2271C1, col white, pad 12 24',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.bg: #2271C1\nmuted.col: #a1a1aa' },
        components: {
          'components.com': 'PrimaryBtn as Button: bg $primary, col white, pad 12 24',
        },
      },
    },
  },

  // mq-2: Settings panel with inherited-redundancy + missing token.
  // canvas col white inherits → but Texts re-specify col white (redundant).
  // Plus: muted.col available but col #a1a1aa hardcoded (token violation).
  {
    id: 'mq-2',
    label: 'inherited-redundancy + missing-token-usage',
    question:
      'canvas col white macht col redundant — UND #a1a1aa hat einen verfügbaren Token. Beides erkannt?',
    expected: {
      kind: 'must-improve',
      expectedFixes: [
        'removes redundant col white from descendants',
        'replaces #a1a1aa with $muted',
      ],
    },
    ctx: {
      source:
        'canvas mobile, col white, bg #18181b\n\nFrame pad 16, gap 12\n  Text "Settings", col white, fs 24, weight bold\n  Text "Notifications enabled", col white, fs 14\n  Text "5 unread messages", col #a1a1aa, fs 12',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'muted.col: #a1a1aa' },
        components: {},
      },
    },
  },

  // mq-3: Three buttons with same inline props + available component
  // (hardest version — multiple replacements, all-or-nothing.)
  {
    id: 'mq-3',
    label: 'three identical inline-buttons with available component',
    question: 'Drei identische Inline-Buttons, PrimaryBtn verfügbar — fixt LLM alle drei?',
    expected: {
      kind: 'must-improve',
      expectedFixes: ['all three buttons use PrimaryBtn'],
    },
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 8\n  Button "Save", bg $primary, col white, pad 12 24\n  Button "Cancel", bg $primary, col white, pad 12 24\n  Button "Reset", bg $primary, col white, pad 12 24',
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

  // mq-4: Wrapper-Frame + inline component-violation + token-violation.
  // Three classes mixed in one source.
  {
    id: 'mq-4',
    label: 'wrapper-frame + inline-component-dup + token-dup',
    question: 'Drei Anti-Patterns gleichzeitig — fixt LLM alle?',
    expected: {
      kind: 'must-improve',
      expectedFixes: [
        'wrapper Frame removed',
        'inline button replaced with PrimaryBtn',
        'hardcoded value replaced with token',
      ],
    },
    ctx: {
      source:
        'canvas mobile\n\nFrame pad 16\n  Frame\n    Button "OK", bg #2271C1, col white, pad 12 24',
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

  // mq-5: CLEAN code — must stay silent. Tests the silence clause.
  {
    id: 'mq-5',
    label: 'clean idiomatic code — must produce no-change',
    question: 'Source nutzt Tokens, Components korrekt, keine Redundanz — bleibt der LLM still?',
    expected: { kind: 'must-be-silent' },
    ctx: {
      source:
        'canvas mobile, bg $canvas, col $text\n\nFrame pad 16, gap 12\n  Text "Welcome", fs 18, weight bold\n  PrimaryBtn "Save"',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: {
        tokens: {
          'tokens.tok': 'primary.bg: #2271C1\ncanvas.bg: #1a1a1a\ntext.col: white',
        },
        components: {
          'components.com': 'PrimaryBtn as Button: bg $primary, col $text, pad 12 24',
        },
      },
    },
  },
]

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface ScenarioResult {
  scenario: MixedScenario
  finalSource: string | null
  applyFailed: boolean
  noChange: boolean
  redundancyViolations: RedundancyViolation[]
  componentViolations: ComponentViolation[]
  tokenViolations: TokenViolation[]
  /** All-quality-clean iff all three checks pass. */
  qualityClean: boolean
  /** Did the scenario meet its expected outcome? */
  expectedMet: boolean
  expectedDetail: string
  claudeMs: number
}

async function runScenario(s: MixedScenario): Promise<ScenarioResult> {
  logScenarioHeader(s.id, s.label, s.question, [`Expected: ${s.expected.kind}`])
  const out = await runEvalPipeline(s.ctx)

  if (out.claudeError) {
    return {
      scenario: s,
      finalSource: null,
      applyFailed: true,
      noChange: false,
      redundancyViolations: [],
      componentViolations: [],
      tokenViolations: [],
      qualityClean: false,
      expectedMet: false,
      expectedDetail: 'claude error',
      claudeMs: out.claudeMs,
    }
  }
  if (out.applyFailed) {
    return {
      scenario: s,
      finalSource: null,
      applyFailed: true,
      noChange: false,
      redundancyViolations: [],
      componentViolations: [],
      tokenViolations: [],
      qualityClean: false,
      expectedMet: false,
      expectedDetail: 'apply failed',
      claudeMs: out.claudeMs,
    }
  }

  const finalSource = out.finalSource as string
  const noChange = out.noChange
  const redResult = checkRedundancyCompliance(finalSource)
  const compResult = checkComponentCompliance(finalSource, s.ctx.projectFiles.components)
  const tokResult = checkTokenCompliance(finalSource, s.ctx.projectFiles.tokens)

  const qualityClean = redResult.pass && compResult.pass && tokResult.pass

  if (qualityClean) {
    console.log(`✅ all three checks: clean`)
  } else {
    if (!redResult.pass) {
      console.log(`❌ redundancy: ${redResult.violations.length}`)
      redResult.violations.forEach(v =>
        console.log(`   - L${v.line} ${v.elementName}/${v.kind}: ${v.detail}`)
      )
    }
    if (!compResult.pass) {
      console.log(`❌ component: ${compResult.violations.length}`)
      compResult.violations.forEach(v =>
        console.log(`   - L${v.line} ${v.inlineElementType} → ${v.suggestedComponent}`)
      )
    }
    if (!tokResult.pass) {
      console.log(`❌ token: ${tokResult.violations.length}`)
      tokResult.violations.forEach(v =>
        console.log(
          `   - L${v.line} ${v.elementName} ${v.propertyName}=${v.hardcodedValue} → ${v.suggestedToken}`
        )
      )
    }
  }

  // Evaluate expected outcome.
  let expectedMet: boolean
  let expectedDetail: string
  if (s.expected.kind === 'must-be-silent') {
    expectedMet = noChange && qualityClean
    expectedDetail = noChange
      ? qualityClean
        ? 'silent + clean'
        : 'silent BUT input had violations (test setup wrong)'
      : `wrote ${out.parsed.patches.length} patch(es) when silence was expected`
  } else {
    // must-improve: needs to (a) actually patch and (b) end up clean
    expectedMet = !noChange && qualityClean
    expectedDetail = noChange
      ? 'no-change MISSED — should have improved'
      : qualityClean
        ? 'improved + clean'
        : 'improved BUT still has violations'
  }

  console.log(`🎯 expected ${s.expected.kind}: ${expectedMet ? '✓' : '✗'} (${expectedDetail})`)

  return {
    scenario: s,
    finalSource,
    applyFailed: false,
    noChange,
    redundancyViolations: redResult.violations,
    componentViolations: compResult.violations,
    tokenViolations: tokResult.violations,
    qualityClean,
    expectedMet,
    expectedDetail,
    claudeMs: out.claudeMs,
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = parseEvalArgs()
  if (args.list) {
    console.log('Available mixed-quality scenarios:')
    for (const s of SCENARIOS) console.log(`  ${s.id} (${s.expected.kind}) — ${s.label}`)
    return
  }
  const scenarios = applyScenarioFilter(SCENARIOS, args, 'mixed-quality')
  if (scenarios === null) return

  console.log(`Running ${scenarios.length} mixed-quality scenario(s)...`)
  const results: ScenarioResult[] = []
  for (const s of scenarios) {
    results.push(await runScenario(s))
  }

  console.log('')
  console.log('═'.repeat(80))
  console.log('MIXED-QUALITY SUMMARY')
  console.log('═'.repeat(80))
  let metCount = 0
  for (const r of results) {
    const icon = r.expectedMet ? '✓' : '✗'
    const totalViol =
      r.redundancyViolations.length + r.componentViolations.length + r.tokenViolations.length
    const breakdown = r.qualityClean
      ? 'all-clean'
      : `r${r.redundancyViolations.length} c${r.componentViolations.length} t${r.tokenViolations.length}`
    const tag = r.applyFailed ? '[apply-fail]' : r.noChange ? '[no-change]' : '[applied]'
    console.log(`  ${icon}  ${r.scenario.id}  ${tag}  ${breakdown.padEnd(15)}  ${r.expectedDetail}`)
    if (r.expectedMet) metCount++
  }
  console.log('')
  console.log(`Met expectation: ${metCount} / ${results.length}`)

  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
