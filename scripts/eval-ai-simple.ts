/**
 * AI Draft-Mode Eval — Simple Edition
 *
 * Tests the AI quality directly: build the prompt with the same function the
 * production uses, call claude CLI as a subprocess, parse the output with the
 * same extractor, splice into source, compile-check via the compiler CLI, run
 * scenario assertions. No browser, no studio, no bridge server, no shim.
 *
 * Pro Scenario etwa 5-15s. Foreground, alles sichtbar.
 *
 * Run:
 *   npx tsx scripts/eval-ai-simple.ts                    # all scenarios
 *   npx tsx scripts/eval-ai-simple.ts --only=14          # one scenario
 *   npx tsx scripts/eval-ai-simple.ts --list             # show scenario IDs
 */

import { spawn } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildDraftPromptCurrent, extractCodeBlock } from '../studio/agent/draft-prompts'

// =============================================================================
// SCENARIOS — same shape as the eval-ai-draft.ts driver, minus the asserts
// API (kept inline-simple here, no levels, no DOM checks).
// =============================================================================

interface Assertion {
  label: string
  check: (ctx: AssertContext) => { pass: boolean; detail?: string }
}

interface AssertContext {
  /** What Claude returned, post-extractCodeBlock. */
  extractedCode: string
  /** Final source after splicing the AI code into the original (?? markers replaced). */
  finalSource: string
  /** Whether the final source compiles cleanly. */
  compileOk: boolean
}

interface Scenario {
  id: string
  label: string
  /** Project files. The currentFile must contain `__PROMPT_HERE__` marker. */
  files: Record<string, string>
  /** Which file gets the `??` block. */
  currentFile: string
  /** User prompt text after the `??` marker. */
  prompt: string
  /** Optional code lines inside the draft block (for "fix this" scenarios). */
  draftContent?: string[]
  asserts: Assertion[]
}

const PROMPT_MARKER = '__PROMPT_HERE__'

// Tiny terse assertion builders — same idiom as the bigger eval, just trimmed
const must = {
  contain: (needle: string | RegExp, label?: string): Assertion => ({
    label: label ?? `contains ${describe(needle)}`,
    check: ctx => ({
      pass: matches(ctx.extractedCode, needle),
      detail: matches(ctx.extractedCode, needle) ? undefined : 'not found',
    }),
  }),
  notContain: (needle: string | RegExp, label?: string): Assertion => ({
    label: label ?? `does not contain ${describe(needle)}`,
    check: ctx => ({
      pass: !matches(ctx.extractedCode, needle),
      detail: matches(ctx.extractedCode, needle) ? `unexpected match` : undefined,
    }),
  }),
  useToken: (name: string, label?: string): Assertion => ({
    label: label ?? `uses $${name} token`,
    check: ctx => {
      const re = new RegExp(`\\$${escape(name)}\\b`)
      return {
        pass: re.test(ctx.extractedCode),
        detail: re.test(ctx.extractedCode) ? undefined : `$${name} not used`,
      }
    },
  }),
  useComponent: (name: string, label?: string): Assertion => ({
    label: label ?? `uses ${name} component`,
    check: ctx => {
      const re = new RegExp(`(^|[\\s,])${escape(name)}(\\s+["$\\w]|$|\\s*\\n)`, 'm')
      return {
        pass: re.test(ctx.extractedCode),
        detail: re.test(ctx.extractedCode) ? undefined : `${name} not instantiated`,
      }
    },
  }),
  notDefine: (name: string, label?: string): Assertion => ({
    label: label ?? `does not define ${name}`,
    check: ctx => {
      const re = new RegExp(`^\\s*${escape(name)}\\s*(:|as\\b)`, 'm')
      return {
        pass: !re.test(ctx.extractedCode),
        detail: re.test(ctx.extractedCode) ? `${name} was redefined` : undefined,
      }
    },
  }),
  noInventedHex: (label = 'no invented hex colors'): Assertion => ({
    label,
    check: ctx => {
      const re = /#[0-9a-fA-F]{3,8}\b/
      return {
        pass: !re.test(ctx.extractedCode),
        detail: re.test(ctx.extractedCode)
          ? `found hex: ${ctx.extractedCode.match(re)![0]}`
          : undefined,
      }
    },
  }),
  compileOk: (): Assertion => ({
    label: 'compiles cleanly',
    check: ctx => ({ pass: ctx.compileOk, detail: ctx.compileOk ? undefined : 'compile failed' }),
  }),
}

function matches(s: string, n: string | RegExp): boolean {
  return typeof n === 'string' ? s.includes(n) : n.test(s)
}
function describe(n: string | RegExp): string {
  return typeof n === 'string' ? `"${n}"` : `/${n.source}/`
}
function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const SCENARIOS: Scenario[] = [
  {
    id: '1-trivial',
    label: 'Trivial: blauer Button',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'blauer button',
    asserts: [
      must.compileOk(),
      must.contain(/^Button\b/m, 'output starts with Button'),
      must.notDefine('Button'),
    ],
  },
  {
    id: '2-multi-element',
    label: 'Card mit Titel/Beschreibung/Button',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16, gap 12\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'card mit titel und beschreibung und einem mehr-lesen button',
    asserts: [
      must.compileOk(),
      must.contain(/^Frame\b/m),
      must.contain(/Text\s/),
      must.contain(/Button\s/),
      must.notDefine('Card'),
    ],
  },
  {
    id: '3-token-aware',
    label: 'Token-reicher Kontext',
    files: {
      'tokens.tok': `primary.bg: #2271C1\nsurface.bg: #1a1a1a\ncanvas.bg: #18181b\ntext.col: #ffffff\nmuted.col: #a1a1aa\nm.pad: 12\nm.rad: 8\n`,
      'index.mir': `canvas mobile, bg $canvas, col $text\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'primärer button mit text "Speichern"',
    asserts: [
      must.compileOk(),
      must.useToken('primary'),
      must.useToken('text'),
      must.noInventedHex(),
      must.contain('"Speichern"'),
    ],
  },
  {
    id: '4-component-reuse',
    label: 'Component-Reuse: Btn / PrimaryBtn / DangerBtn definiert',
    files: {
      'tokens.tok': `primary.bg: #2271C1\ndanger.bg: #ef4444\ntext.col: #ffffff\nm.pad: 12\nm.rad: 6\n`,
      'components.com': `Btn: pad $m, rad $m, col $text, cursor pointer\nPrimaryBtn as Btn: bg $primary\nDangerBtn as Btn: bg $danger\n`,
      'index.mir': `canvas mobile\n\nFrame pad 16, gap 8\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'drei buttons nebeneinander: Speichern (primär), Abbrechen, Löschen (gefährlich)',
    asserts: [
      must.compileOk(),
      must.useComponent('PrimaryBtn'),
      must.useComponent('DangerBtn'),
      must.notDefine('Btn'),
      must.notDefine('PrimaryBtn'),
      must.notDefine('DangerBtn'),
      must.contain(/\bhor\b/),
    ],
  },
  {
    id: '5-settings-panel',
    label: 'Real: Settings-Panel mit Switch/RadioGroup/Select',
    files: {
      'tokens.tok': `primary.bg: #2271C1\nsurface.bg: #27272a\ncanvas.bg: #18181b\ntext.col: #ffffff\nmuted.col: #a1a1aa\nm.pad: 12\nl.pad: 16\nm.gap: 8\nm.rad: 8\nm.fs: 14\nl.fs: 18\n`,
      'index.mir': `canvas mobile, bg $canvas, col $text\n\nFrame pad $l, gap $m\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt:
      'drei sections: Notifications mit Switch, Theme mit RadioGroup für Light/Dark/Auto, Language mit Select',
    asserts: [
      must.compileOk(),
      must.useToken('m'),
      must.contain(/Switch\b/),
      must.contain(/RadioGroup\b/),
      must.contain(/Select\b/),
      must.noInventedHex(),
    ],
  },
  {
    id: '14-fix-typos',
    label: 'Fix: DSL-Property-Typos',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: '',
    draftContent: ['Frame pdd 16, gpa 8', '  Buton "Save", bgg #2271C1, padng 12 24'],
    asserts: [
      must.compileOk(),
      must.notContain(/\bpdd\b/),
      must.notContain(/\bgpa\b/),
      must.notContain(/\bButon\b/),
      must.notContain(/\bbgg\b/),
      must.notContain(/\bpadng\b/),
      must.contain('"Save"'),
    ],
  },
  {
    id: '15-fix-missing-dollar',
    label: 'Fix: vergessenes $ bei Tokens',
    files: {
      'tokens.tok': `primary.bg: #2271C1\ntext.col: #ffffff\nm.pad: 12\nm.rad: 6\n`,
      'index.mir': `canvas mobile\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: '',
    draftContent: ['Button "Save", bg primary, col text, pad m, rad m'],
    asserts: [
      must.compileOk(),
      must.useToken('primary'),
      must.useToken('text'),
      must.useToken('m'),
      must.contain('"Save"'),
    ],
  },
  {
    id: '16-fix-missing-quotes',
    label: 'Fix: fehlende Quotes um Strings',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16, gap 8\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: '',
    draftContent: ['Text Hello World', 'Button Click Me, bg blue'],
    asserts: [must.compileOk(), must.contain(/"Hello World"/), must.contain(/"Click Me"/)],
  },
  {
    id: '17-fix-wrong-indent',
    label: 'Fix: falsche Hierarchie-Indentation',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: '',
    draftContent: ['Frame pad 16, gap 8', 'Text "Titel"', 'Button "OK"'],
    asserts: [
      must.compileOk(),
      must.contain('"Titel"'),
      must.contain('"OK"'),
      // Check: in finalSource, Text and Button should be MORE indented than the Frame
      {
        label: 'Text/Button als Children, nicht Siblings',
        check: ctx => {
          const lines = ctx.finalSource.split('\n')
          const frameLine = lines.findIndex(l => /^\s*Frame pad 16, gap 8\b/.test(l))
          const textLine = lines.findIndex(l => /^\s*Text "Titel"/.test(l))
          if (frameLine === -1 || textLine === -1)
            return { pass: false, detail: `Frame@${frameLine}, Text@${textLine}` }
          const fi = lines[frameLine].match(/^(\s*)/)![1].length
          const ti = lines[textLine].match(/^(\s*)/)![1].length
          return { pass: ti > fi, detail: ti > fi ? undefined : `Text indent ${ti} ≤ Frame ${fi}` }
        },
      },
    ],
  },
  {
    id: '18-fix-missing-commas',
    label: 'Fix: fehlende Kommas zwischen Properties',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: '',
    draftContent: ['Button "Save" bg #2271C1 col white pad 12 24'],
    asserts: [
      must.compileOk(),
      must.contain('"Save"'),
      {
        label: 'output has commas separating properties',
        check: ctx => {
          const buttonLine =
            ctx.extractedCode.split('\n').find(l => /Button\s+"Save"/.test(l)) ?? ''
          const commas = (buttonLine.match(/,/g) ?? []).length
          return { pass: commas >= 3, detail: `${commas} commas` }
        },
      },
    ],
  },
  {
    id: '19-fix-css-style',
    label: 'Fix: CSS-Syntax statt Mirror DSL',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: '',
    draftContent: [
      'Frame { padding: 16px; background: #27272a; gap: 8px; }',
      '  Button { text: "OK"; color: white; background: #2271C1; }',
    ],
    asserts: [
      must.compileOk(),
      must.notContain('{'),
      must.notContain('}'),
      must.notContain(';'),
      must.notContain(/\d+px\b/),
      must.contain('"OK"'),
    ],
  },
]

// =============================================================================
// CLI EXEC — direct subprocess
// =============================================================================

function findClaudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  const home = process.env.HOME
  if (home) return join(home, '.local', 'bin', 'claude')
  return 'claude'
}

const CLAUDE_BIN = findClaudeBin()

interface ClaudeResult {
  output: string
  error: string | null
  elapsedMs: number
}

function callClaude(prompt: string, timeoutMs = 90000): Promise<ClaudeResult> {
  return new Promise(resolve => {
    const start = Date.now()
    const proc = spawn(CLAUDE_BIN, ['-p', '--output-format', 'text'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let killed = false
    const timer = setTimeout(() => {
      killed = true
      proc.kill('SIGTERM')
    }, timeoutMs)
    proc.stdout.on('data', d => (stdout += d.toString()))
    proc.stderr.on('data', d => (stderr += d.toString()))
    proc.on('error', err => {
      clearTimeout(timer)
      resolve({ output: '', error: `spawn failed: ${err.message}`, elapsedMs: Date.now() - start })
    })
    proc.on('close', code => {
      clearTimeout(timer)
      const elapsedMs = Date.now() - start
      if (killed) {
        resolve({ output: stdout, error: `claude killed after ${timeoutMs}ms timeout`, elapsedMs })
      } else if (code === 0) {
        resolve({ output: stdout, error: null, elapsedMs })
      } else {
        resolve({
          output: stdout,
          error: stderr.trim() || `claude exited with code ${code}`,
          elapsedMs,
        })
      }
    })
    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

// =============================================================================
// COMPILE — write all project files to tmpdir, run compiler/cli.ts
// =============================================================================

interface CompileResult {
  ok: boolean
  errors: string[]
  elapsedMs: number
}

async function compileProject(
  files: Record<string, string>,
  currentFile: string,
  finalCurrentFileSource: string
): Promise<CompileResult> {
  const start = Date.now()
  const tmp = mkdtempSync(join(tmpdir(), 'eval-mirror-'))
  try {
    for (const [name, content] of Object.entries(files)) {
      const out = name === currentFile ? finalCurrentFileSource : content.replace(PROMPT_MARKER, '')
      writeFileSync(join(tmp, name), out)
    }
    return await new Promise(resolve => {
      const proc = spawn(
        'npx',
        ['tsx', 'compiler/cli.ts', '--project', tmp, '-o', join(tmp, 'out.js')],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', d => (stdout += d.toString()))
      proc.stderr.on('data', d => (stderr += d.toString()))
      proc.on('close', code => {
        try {
          rmSync(tmp, { recursive: true, force: true })
        } catch {
          /* ignore */
        }
        const errors = (stderr + '\n' + stdout)
          .split('\n')
          .filter(l => /error|fail/i.test(l))
          .filter(l => l.trim())
        resolve({ ok: code === 0, errors, elapsedMs: Date.now() - start })
      })
    })
  } catch (err) {
    try {
      rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    return { ok: false, errors: [String(err)], elapsedMs: Date.now() - start }
  }
}

// =============================================================================
// SPLICE — pure, in-Node version of replaceDraftBlock
// =============================================================================

function spliceDraftCode(code: string, originalSource: string): string {
  const lines = originalSource.split('\n')
  let startIdx = -1
  let endIdx = -1
  let indent = ''
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)\?\?(.*)$/)
    if (!m) continue
    if (startIdx === -1) {
      startIdx = i
      indent = m[1]
    } else {
      endIdx = i
      break
    }
  }
  if (startIdx === -1) return originalSource + '\n' + code
  const closingIdx = endIdx === -1 ? lines.length - 1 : endIdx
  const indentedCode = code
    .split('\n')
    .map(l => (l.trim() ? indent + l : l))
    .join('\n')
  return [...lines.slice(0, startIdx), indentedCode, ...lines.slice(closingIdx + 1)].join('\n')
}

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface ScenarioResult {
  scenario: Scenario
  prompt: string
  output: string
  extractedCode: string | null
  finalSource: string
  compileOk: boolean
  compileErrors: string[]
  assertResults: { label: string; pass: boolean; detail?: string }[]
  bridgeMs: number
  compileMs: number
  totalMs: number
  error?: string
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
  const totalStart = Date.now()
  const ts = (label: string) => `[+${((Date.now() - totalStart) / 1000).toFixed(1)}s] ${label}`

  console.log('')
  console.log('━'.repeat(80))
  console.log(`▶  ${scenario.id}: ${scenario.label}`)
  console.log('━'.repeat(80))
  console.log(`Prompt: "${scenario.prompt || '(empty)'}"`)
  if (scenario.draftContent && scenario.draftContent.length > 0) {
    console.log(`Draft content (${scenario.draftContent.length} lines):`)
    scenario.draftContent.forEach(l => console.log(`  │ ${l}`))
  }
  console.log(`Files: ${Object.keys(scenario.files).join(', ')}`)
  console.log(`Asserts: ${scenario.asserts.length}`)
  console.log('')

  // Build source-with-marker (open ?? + draftContent + close ??) — same as
  // what the editor would have when ?? auto-submit fires.
  const sourceWithMarker = scenario.files[scenario.currentFile]
  const markerLineMatch = sourceWithMarker.match(new RegExp(`(^|\\n)([ \\t]*)${PROMPT_MARKER}`))
  if (!markerLineMatch) throw new Error(`Scenario ${scenario.id}: marker not found`)
  const markerIndent = markerLineMatch[2]
  const openLine = scenario.prompt ? `?? ${scenario.prompt}` : '??'
  const contentLines = (scenario.draftContent ?? []).map(l => `${markerIndent}${l}`)
  const sourceWithBlock = sourceWithMarker.replace(
    PROMPT_MARKER,
    [openLine, ...contentLines, `${markerIndent}??`].join('\n')
  )

  // Pull tokens + components from OTHER files (production behavior)
  const tokenFiles: Record<string, string> = {}
  const componentFiles: Record<string, string> = {}
  for (const [name, content] of Object.entries(scenario.files)) {
    if (name === scenario.currentFile) continue
    if (name.endsWith('.tok')) tokenFiles[name] = content
    else if (name.endsWith('.com')) componentFiles[name] = content
  }

  // Build the production prompt (same function the live ?? feature uses)
  console.log(ts('🔨 building prompt with buildDraftPromptCurrent (production fn)...'))
  const prompt = buildDraftPromptCurrent({
    prompt: scenario.prompt || null,
    content: scenario.draftContent?.join('\n') ?? '',
    fullSource: sourceWithBlock,
    tokenFiles,
    componentFiles,
  })
  console.log(ts(`   prompt is ${prompt.length} chars`))

  // Call claude
  console.log(ts('🤖 calling claude -p (timeout 90s)...'))
  const claudeResult = await callClaude(prompt)
  if (claudeResult.error) {
    console.log(ts(`❌ claude error: ${claudeResult.error}`))
    return errResult(scenario, prompt, claudeResult.error, totalStart)
  }
  console.log(ts(`   got ${claudeResult.output.length} chars in ${claudeResult.elapsedMs}ms`))

  // Extract code
  console.log(ts('✂  extracting code-block via extractCodeBlock (production fn)...'))
  const extractedCode = extractCodeBlock(claudeResult.output)
  if (!extractedCode) {
    console.log(ts('❌ no code-block found in response'))
    console.log(`   raw output: ${claudeResult.output.slice(0, 300)}…`)
    return errResult(scenario, prompt, 'no code-block extracted', totalStart, claudeResult.output)
  }
  const extractedLines = extractedCode.split('\n')
  console.log(ts(`   ${extractedLines.length} lines:`))
  extractedLines.forEach(l => console.log(`     │ ${l}`))

  // Splice into source
  const finalSource = spliceDraftCode(extractedCode, sourceWithBlock)

  // Compile
  console.log(ts('🔧 compile-checking final source via compiler CLI...'))
  const compile = await compileProject(scenario.files, scenario.currentFile, finalSource)
  if (compile.ok) {
    console.log(ts(`   ✓ compile clean (${compile.elapsedMs}ms)`))
  } else {
    console.log(
      ts(`   ✗ compile FAILED (${compile.elapsedMs}ms) — ${compile.errors.length} error(s):`)
    )
    compile.errors.slice(0, 5).forEach(e => console.log(`     │ ${e.slice(0, 140)}`))
  }

  // Assertions
  console.log(ts(`✅ running ${scenario.asserts.length} assertions:`))
  const assertCtx: AssertContext = {
    extractedCode,
    finalSource,
    compileOk: compile.ok,
  }
  const assertResults = scenario.asserts.map(a => {
    const r = a.check(assertCtx)
    return { label: a.label, pass: r.pass, detail: r.detail }
  })
  for (const r of assertResults) {
    const icon = r.pass ? '✓' : '✗'
    const detail = r.detail ? ` — ${r.detail}` : ''
    console.log(`     ${icon} ${r.label}${detail}`)
  }

  const totalMs = Date.now() - totalStart
  const passed = assertResults.filter(r => r.pass).length
  console.log('')
  console.log(
    `▷  ${scenario.id}: ${passed}/${assertResults.length} asserts ` +
      `| claude ${claudeResult.elapsedMs}ms | compile ${compile.elapsedMs}ms | total ${totalMs}ms`
  )

  return {
    scenario,
    prompt,
    output: claudeResult.output,
    extractedCode,
    finalSource,
    compileOk: compile.ok,
    compileErrors: compile.errors,
    assertResults,
    bridgeMs: claudeResult.elapsedMs,
    compileMs: compile.elapsedMs,
    totalMs,
  }
}

function errResult(
  scenario: Scenario,
  prompt: string,
  error: string,
  start: number,
  output = ''
): ScenarioResult {
  return {
    scenario,
    prompt,
    output,
    extractedCode: null,
    finalSource: '',
    compileOk: false,
    compileErrors: [],
    assertResults: scenario.asserts.map(a => ({
      label: a.label,
      pass: false,
      detail: 'pipeline failed before assert',
    })),
    bridgeMs: 0,
    compileMs: 0,
    totalMs: Date.now() - start,
    error,
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--list')) {
    console.log('Available scenarios:')
    for (const s of SCENARIOS) console.log(`  ${s.id} — ${s.label}`)
    return
  }
  const onlyArg = args.find(a => a.startsWith('--only='))
  const onlyId = onlyArg?.split('=')[1]
  const scenarios = onlyId
    ? SCENARIOS.filter(s => s.id === onlyId || s.id.startsWith(`${onlyId}-`))
    : SCENARIOS

  if (scenarios.length === 0) {
    console.error(`No matching scenarios for --only=${onlyId}`)
    console.error('Run --list to see available IDs')
    process.exit(1)
  }

  const reportDir = join(
    'test-results',
    `ai-eval-simple-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`
  )
  mkdirSync(reportDir, { recursive: true })

  console.log(`AI Eval (simple) — ${scenarios.length} scenarios`)
  console.log(`Report dir: ${reportDir}`)

  const results: ScenarioResult[] = []
  for (const scenario of scenarios) {
    try {
      const r = await runScenario(scenario)
      results.push(r)
      writeFileSync(join(reportDir, 'report.md'), formatReport(results))
    } catch (err) {
      console.error(`  ✗ scenario ${scenario.id} crashed:`, err)
    }
  }

  console.log('')
  console.log('━'.repeat(80))
  const totalAsserts = results.reduce((sum, r) => sum + r.assertResults.length, 0)
  const totalPassed = results.reduce(
    (sum, r) => sum + r.assertResults.filter(a => a.pass).length,
    0
  )
  const compiled = results.filter(r => r.compileOk).length
  console.log(
    `Done. ${results.length} scenarios | compile ${compiled}/${results.length} | ` +
      `asserts ${totalPassed}/${totalAsserts}`
  )
  console.log(`Report: ${reportDir}/report.md`)
}

function formatReport(results: ScenarioResult[]): string {
  const lines: string[] = []
  lines.push(`# AI Eval (simple) — ${new Date().toISOString()}`)
  lines.push('')
  lines.push('| # | Scenario | Compile | Asserts | Claude ms | Total ms |')
  lines.push('|---|----------|---------|---------|-----------|----------|')
  for (const r of results) {
    const passed = r.assertResults.filter(a => a.pass).length
    lines.push(
      `| ${r.scenario.id} | ${r.scenario.label} | ${r.compileOk ? '✓' : '✗'} | ${passed}/${r.assertResults.length} | ${r.bridgeMs} | ${r.totalMs} |`
    )
  }
  lines.push('')
  for (const r of results) {
    lines.push('---')
    lines.push('')
    lines.push(`## ${r.scenario.id}: ${r.scenario.label}`)
    lines.push('')
    lines.push(`**Prompt:** \`${r.scenario.prompt || '(empty)'}\``)
    lines.push('')
    if (r.error) {
      lines.push(`**Pipeline error:** ${r.error}`)
      lines.push('')
    }
    if (r.extractedCode) {
      lines.push('### Extracted code')
      lines.push('```mirror')
      lines.push(r.extractedCode)
      lines.push('```')
      lines.push('')
    }
    if (!r.compileOk && r.compileErrors.length > 0) {
      lines.push('### Compile errors')
      lines.push('```')
      lines.push(r.compileErrors.join('\n'))
      lines.push('```')
      lines.push('')
    }
    lines.push('### Asserts')
    for (const a of r.assertResults) {
      const icon = a.pass ? '✓' : '✗'
      const detail = a.detail ? ` — ${a.detail}` : ''
      lines.push(`- ${icon} ${a.label}${detail}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
