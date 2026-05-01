/**
 * Step-Runner — turn a declarative Scenario into a TestCase that the
 * existing CDP runner can execute.
 *
 * For each step:
 *   1. Execute the action (direct manipulation, panel, or code edit)
 *   2. Wait for the compile pipeline to settle
 *   3. Validate the declared expectations across the three readout
 *      dimensions (code, DOM, panel) plus side-channels (selection,
 *      console, undo stack)
 *
 * If anything mismatches, the step fails with a labeled message that
 * names the step number, the action, and a per-dimension diff. The
 * runner does not try to recover — first failure stops the scenario.
 */

import type { TestCase, TestAPI } from '../types'
import { testWithSetup } from '../test-runner'
import type { Scenario, SetupProject, Step, Expectations } from './types'
import { installConsoleCollector, type ConsoleCollector } from './console-collector'
import { codeDiff, canonicalizeCode } from './diff'
import { getReader, PROPERTY_READERS, type SourceMapLike } from './properties'
import { getWriter } from './writers'

export function scenarioToTestCase(scenario: Scenario): TestCase {
  // Skipped scenarios become a TestCase with skip:true so the runner
  // reports them as "skipped" (⏭️) instead of swallowing them. The
  // reason surfaces via a name suffix — visible in the console + JUnit
  // output without needing reporter changes.
  if (scenario.skip) {
    const name = `${scenario.name} [SKIP: ${scenario.skip.reason}]`
    const tc: TestCase = {
      name,
      run: async () => {
        /* never invoked — runner respects skip:true */
      },
      skip: true,
    }
    return scenario.category ? { ...tc, category: scenario.category } : tc
  }

  // Single-file scenario: pass setup string straight to testWithSetup so
  // the existing single-file path keeps working unchanged.
  // Multi-file scenario: setup the entry file's content as the editor's
  // initial code, then create the rest of the project files in the
  // scenario body before any steps run.
  const initialCode =
    typeof scenario.setup === 'string'
      ? scenario.setup
      : (scenario.setup.files[scenario.setup.entry] ?? '')

  const tc = testWithSetup(scenario.name, initialCode, async (api: TestAPI) => {
    const collector = installConsoleCollector()
    try {
      // Wipe stale prelude-contributing files (tokens.tok, components.com,
      // …) left behind by an earlier multi-file scenario. Without this,
      // __compileTestCode would prepend that stale content to the
      // current single-file scenario's source and shift sourceMap line
      // numbers, breaking single-file tests after a multi-file run.
      //
      // Note: testRunner already called setCode() with the scenario's
      // initial code BEFORE this callback fires, so a __compileTestCode
      // pass already happened with the stale prelude in window.files.
      // After wiping, re-trigger __compileTestCode so the CodeModifier
      // and sourceMap drop the stale prelude offsets. setupProjectFiles
      // does its own wipe-and-compile dance, so single-file scenarios
      // are the only path that needs this re-trigger.
      wipeStraySideFiles(api, new Set([api.panel.files.getCurrentFile() ?? '']))
      if (typeof scenario.setup !== 'string') {
        await setupProjectFiles(scenario.setup, api)
      } else {
        const recompile = (window as { __compileTestCode?: (code: string) => unknown })
          .__compileTestCode
        if (recompile) recompile(api.editor.getCode())
        await api.utils.delay(50)
      }
      await runScenario(scenario, api, collector)
    } finally {
      collector.dispose()
    }
  })
  if (scenario.category) {
    return { ...tc, category: scenario.category }
  }
  return tc
}

/**
 * Create non-entry project files via the panel.files API, then re-open
 * the entry file so the editor focus matches the scenario's intent.
 * Tokens defined in `tokens.tok`/`*.tok` and components in `*.com`
 * become available across the whole project after this step.
 *
 * Test isolation note: pre-existing files NOT listed in setup.files
 * are wiped to empty content (but not deleted — deleting the file the
 * editor is currently on or the scenario's entry breaks Studio's file
 * cache). Empty content keeps cross-file scans (`findSegmentMatches`,
 * `findProjectMatches`) from picking up stale lines an earlier test
 * left behind. Files explicitly in setup.files are recreated normally.
 */
async function setupProjectFiles(setup: SetupProject, api: TestAPI): Promise<void> {
  // Close any leftover Studio dialogs from a prior scenario. A
  // batch-replace dialog left open because the previous test didn't
  // cancel it would otherwise sit on top and intercept the next
  // test's `batchReplace` step (it queries for the *first* matching
  // dialog and reads the wrong checkbox count). Atom 7 is a typical
  // case — it triggers `::` on a project that may have stale leftover
  // matches but doesn't include a cancel step itself.
  for (const d of Array.from(document.querySelectorAll('dialog.mirror-batch-replace-dialog'))) {
    const dialog = d as HTMLDialogElement
    try {
      dialog.close()
    } catch {
      /* may not be open */
    }
    dialog.remove()
  }

  const entry = setup.entry
  const setupNames = new Set(Object.keys(setup.files))

  // Studio has TWO file caches that need to stay in sync:
  //   1. `window.files` — written by panel.files.create/delete
  //      (the test-API path), read by panel.files.getContent.
  //   2. `window.desktopFiles.filesCache` — read by the `::` trigger
  //      callbacks (componentExtractConfig.getFilesWithType in app.js).
  // Both caches must reflect the same project state, otherwise the
  // trigger scans a stale file map while assertions read a fresh one.
  const desktop = (
    window as {
      desktopFiles?: {
        getFiles?: () => Record<string, string>
        updateFileCache?: (p: string, c: string | undefined) => void
      }
    }
  ).desktopFiles

  wipeStraySideFiles(api, setupNames)

  for (const [filename, content] of Object.entries(setup.files)) {
    const exists = api.panel.files.list().includes(filename)
    if (exists) {
      await api.panel.files.delete(filename)
    }
    await api.panel.files.create(filename, content)
    // Mirror into desktopFiles cache so the `::` trigger sees the
    // same content panel.files.getContent reports.
    desktop?.updateFileCache?.(filename, content)
  }
  // Switch to entry so the editor + preview reflect that file.
  await api.panel.files.open(entry)
  await api.utils.waitForCompile()
  await api.utils.delay(100)
}

/**
 * Drop any project files NOT in `keep` from window.files +
 * desktopFiles cache. Files are *deleted* from window.files (not just
 * emptied) so a subsequent `panel.files.create(name, content)` on the
 * same name actually writes — `create` treats `files[name] !== undefined`
 * as "already exists" and returns false. The desktop cache is set to
 * empty string because its `updateFileCache(name, undefined)` does
 * nothing useful for our purposes; an empty string contributes no lines
 * to getPreludeCode() (which trims before checking).
 *
 * The currently-edited file is preserved (deleting it would corrupt
 * Studio's editor binding). Caller passes it via `keep`.
 */
function wipeStraySideFiles(api: TestAPI, keep: Set<string>): void {
  const desktop = (
    window as {
      desktopFiles?: {
        getFiles?: () => Record<string, string>
        updateFileCache?: (p: string, c: string | undefined) => void
      }
      files?: Record<string, string>
    }
  ).desktopFiles
  const filesGlobal = (window as { files?: Record<string, string> }).files

  const existingPanel = api.panel.files.list()
  const existingDesktop = desktop?.getFiles ? Object.keys(desktop.getFiles()) : []
  const existingFilesGlobal = filesGlobal ? Object.keys(filesGlobal) : []
  const allExisting = new Set([...existingPanel, ...existingDesktop, ...existingFilesGlobal])
  for (const filename of allExisting) {
    if (keep.has(filename)) continue
    desktop?.updateFileCache?.(filename, '')
    if (filesGlobal) delete filesGlobal[filename]
  }
}

export function scenariosToTestCases(scenarios: Scenario[]): TestCase[] {
  return scenarios.map(scenarioToTestCase)
}

async function runScenario(
  scenario: Scenario,
  api: TestAPI,
  collector: ConsoleCollector
): Promise<void> {
  // Wait for initial setup compile + give the studio a moment to settle.
  await api.utils.waitForCompile()
  await api.utils.delay(50)

  let prevUndoStackSize = api.studio.history.getUndoStackSize()
  let prevErrorCount = collector.errorCount()
  let prevWarnCount = collector.warnCount()

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i]
    const label = `Step ${i + 1}/${scenario.steps.length}: ${describeStep(step)}`

    try {
      await executeAction(step, api)

      // Most actions trigger a recompile; waitForCompile is a no-op if
      // nothing is pending. While the active file is non-layout (tokens
      // or components — no preview nodes by design), waitForCompile
      // would time out — settle via plain delay instead. The post-delay
      // lets event-driven UI (panel, handles) settle.
      if (isOnNonLayoutFile(step, api)) {
        await api.utils.delay(300)
      } else {
        await api.utils.waitForCompile()
        await api.utils.delay(200)
      }

      const issues = validateExpectations(step.expect, api, {
        prevUndoStackSize,
        newConsoleErrors: collector.errorCount() - prevErrorCount,
        consoleErrorMessages: collector.errorsSince(prevErrorCount),
        newConsoleWarnings: collector.warnCount() - prevWarnCount,
        consoleWarningMessages: collector.warningsSince(prevWarnCount),
      })

      if (issues.length > 0) {
        throw new Error(`${label}\n${issues.map(line => '  • ' + line).join('\n')}`)
      }

      prevUndoStackSize = api.studio.history.getUndoStackSize()
      prevErrorCount = collector.errorCount()
      prevWarnCount = collector.warnCount()
    } catch (e) {
      const err = e as Error
      // Don't double-prefix already-labeled errors
      if (err.message.startsWith('Step ')) throw err
      throw new Error(`${label}\n  ${err.message}`)
    }
  }
}

function isOnNonLayoutFile(step: Step, api: TestAPI): boolean {
  // After a `switchFile` step we trust the step's target.
  if (step.do === 'switchFile') {
    const type = api.panel.files.getFileType(step.filename)
    return type !== 'layout' && type !== 'unknown'
  }
  // Otherwise inspect the editor's active file. Falls back to "layout"
  // (i.e. wait for compile) when the file API is unavailable so single-
  // file scenarios behave unchanged.
  const current = api.panel.files.getCurrentFile()
  if (!current) return false
  const type = api.panel.files.getFileType(current)
  return type !== 'layout' && type !== 'unknown'
}

// =============================================================================
// Action execution
// =============================================================================

async function executeAction(step: Step, api: TestAPI): Promise<void> {
  switch (step.do) {
    case 'select':
      if (step.nodeId === null) {
        api.studio.clearSelection()
      } else {
        await api.studio.setSelection(step.nodeId)
      }
      return
    case 'click':
      await api.interact.click(step.nodeId)
      return
    case 'pressKey':
      await api.interact.pressKey(step.key, {
        alt: step.alt,
        shift: step.shift,
        meta: step.meta,
        ctrl: step.ctrl,
      })
      return
    case 'undo':
      await api.studio.history.undo()
      return
    case 'redo':
      await api.studio.history.redo()
      return
    case 'panelSet':
      await api.panel.property.setProperty(step.property, step.value)
      return
    case 'panelRemove':
      await api.panel.property.removeProperty(step.property)
      return
    case 'setProperty': {
      const writer = getWriter(step.property)
      if (!writer) {
        throw new Error(
          `setProperty: no writer for "${step.property}" (supported: ${Object.keys(PROPERTY_READERS).join(', ')})`
        )
      }
      const ctx = { api }
      switch (step.via) {
        case 'code':
          await writer.toCode(step.target, step.value, ctx)
          return
        case 'panel':
          await writer.toPanel(step.target, step.value, ctx)
          return
        case 'preview':
          await writer.toPreview(step.target, step.value, ctx)
          return
      }
      return
    }
    case 'editorSet':
      await api.editor.setCode(step.code)
      return
    case 'editorInsert':
      api.editor.insertAt(step.text, step.line, step.indent)
      return
    case 'editText': {
      // Find the node's source line and replace the first quoted segment
      // (the text content right after the element name).
      const sourceMap = api.studio.getSourceMap() as {
        getNodeById: (id: string) => { position: { line: number } } | null
      } | null
      if (!sourceMap) throw new Error('editText: SourceMap not available')
      const node = sourceMap.getNodeById(step.target)
      if (!node) throw new Error(`editText: node ${step.target} not in SourceMap`)
      const code = api.editor.getCode()
      const lines = code.split('\n')
      const lineIdx = node.position.line - 1
      const original = lines[lineIdx]
      if (!original) throw new Error(`editText: line ${node.position.line} not found`)
      // Replace the first "..."-quoted string on the line.
      const escaped = step.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const updated = original.replace(/"((?:[^"\\]|\\.)*)"/, `"${escaped}"`)
      if (updated === original) {
        throw new Error(`editText: no quoted text content found on line: "${original}"`)
      }
      lines[lineIdx] = updated
      await api.editor.setCode(lines.join('\n'))
      return
    }
    case 'hover':
      await api.interact.hover(step.target)
      return
    case 'unhover':
      await api.interact.unhover(step.target)
      return
    case 'multiSelect': {
      if (step.nodeIds.length === 0) {
        api.studio.clearMultiSelection()
        return
      }
      // First node: regular click (replaces any existing selection).
      await api.interact.click(step.nodeIds[0])
      await api.utils.delay(50)
      // Remaining nodes: shift-click to extend the selection.
      for (let i = 1; i < step.nodeIds.length; i++) {
        await api.interact.shiftClick(step.nodeIds[i])
        await api.utils.delay(50)
      }
      return
    }
    case 'switchFile': {
      // Save active editor content into the file store, then ask Studio
      // to switch — switchFile() in app.js itself does the editor save
      // before swapping content, so cross-file edits survive a switch.
      const ok = await api.panel.files.open(step.filename)
      if (!ok) {
        throw new Error(
          `switchFile: ${step.filename} could not be opened (not in project? window.switchFile missing?)`
        )
      }
      return
    }
    case 'replaceFile': {
      // Delete + create rewrites BOTH window.files and (via panel.create)
      // the desktopFiles cache for non-active files. The editor-based
      // path (switchFile + editorSet + switchFile back) doesn't reliably
      // commit YAML/tokens edits because saveFile reads editor.state.doc
      // which can lag behind setCode in test mode.
      if (step.filename === api.panel.files.getCurrentFile()) {
        throw new Error(`replaceFile: ${step.filename} is the active file; switchFile away first`)
      }
      const exists = api.panel.files.list().includes(step.filename)
      if (exists) {
        await api.panel.files.delete(step.filename)
      }
      await api.panel.files.create(step.filename, step.content)
      // Trigger a recompile of the active file so YAML re-injection
      // picks up the new content. We need the full compile() path
      // (not __compileTestCode) because YAML injection lives there.
      // Re-opening the active file via panel.files.open does the right
      // thing: it goes through window.switchFile, which calls compile()
      // and runs generateYAMLDataInjection.
      const active = api.panel.files.getCurrentFile()
      if (active) {
        await api.panel.files.open(active)
      }
      await api.utils.delay(150)
      return
    }
    case 'extractComponent': {
      const lineNumber = resolveTargetLineNumber(step.target, api)
      await dispatchExtractTrigger(api, {
        kind: 'component',
        lineNumber,
        name: step.name,
        properties: step.properties,
      })
      return
    }
    case 'extractToken': {
      const lineNumber = resolveTargetLineNumber(step.target, api)
      await dispatchExtractTrigger(api, {
        kind: 'token',
        lineNumber,
        property: step.property,
        tokenName: step.tokenName,
        value: step.value,
      })
      return
    }
    case 'batchReplace':
      await applyBatchReplaceAction(step, api)
      return
    case 'wait':
      await api.utils.delay(step.ms)
      return
    case 'waitFor': {
      const timeout = step.timeoutMs ?? 2000
      const interval = step.intervalMs ?? 50
      const deadline = Date.now() + timeout
      let lastIssues: string[] = []
      while (Date.now() < deadline) {
        lastIssues = checkStatePredicates(step.until, api)
        if (lastIssues.length === 0) return
        await api.utils.delay(interval)
      }
      // One last eval so the message reflects the final state, not a stale poll.
      lastIssues = checkStatePredicates(step.until, api)
      if (lastIssues.length === 0) return
      throw new Error(
        `waitFor timed out after ${timeout}ms — predicates still unmet:\n${lastIssues.map(l => '      • ' + l).join('\n')}`
      )
    }
    default: {
      const _exhaustive: never = step
      throw new Error(`Unknown action: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

// =============================================================================
// `::` Extract trigger helpers
// =============================================================================

interface ComponentExtractInput {
  kind: 'component'
  lineNumber: number
  name: string
  properties: string
}
interface TokenExtractInput {
  kind: 'token'
  lineNumber: number
  property: string
  tokenName: string
  value: string
}
type ExtractInput = ComponentExtractInput | TokenExtractInput

/**
 * Locate the 1-based line number of a target. Either via SourceMap node
 * lookup (preferred — survives positional resolution) or by string
 * search in the active editor.
 */
function resolveTargetLineNumber(
  target: { nodeId: string } | { searchFor: string },
  api: TestAPI
): number {
  if ('nodeId' in target) {
    const sourceMap = api.studio.getSourceMap() as {
      getNodeById: (id: string) => { position: { line: number } } | null
    } | null
    if (!sourceMap) throw new Error('extract: SourceMap not available')
    const node = sourceMap.getNodeById(target.nodeId)
    if (!node) throw new Error(`extract: node ${target.nodeId} not in SourceMap`)
    return node.position.line
  }
  const code = api.editor.getCode()
  const idx = code.indexOf(target.searchFor)
  if (idx === -1) {
    throw new Error(`extract: searchFor "${target.searchFor}" not found in active source`)
  }
  // Reject ambiguous matches — accidental multi-match is a real foot-gun.
  if (code.indexOf(target.searchFor, idx + 1) !== -1) {
    throw new Error(`extract: searchFor "${target.searchFor}" matches more than once`)
  }
  return code.slice(0, idx).split('\n').length
}

/**
 * Drive the `::` trigger by mutating the line through the same two
 * dispatches a real user produces: first replace the line with
 * `Name:<rest>` (single colon, no trigger fires), then insert a second
 * `:` at the right position (the editor's CodeMirror update listener
 * sees a single-`:` insertion preceded by `Name:`, matches the
 * EXTRACT_PATTERN, and schedules the extraction).
 *
 * The trigger uses a 10ms setTimeout before running, so we wait long
 * enough for both the trigger and the dialog (if any) to settle before
 * returning.
 */
async function dispatchExtractTrigger(api: TestAPI, input: ExtractInput): Promise<void> {
  const editor = (window as { editor?: EditorViewLike }).editor
  if (!editor) throw new Error('extract: window.editor not available')

  const doc = editor.state.doc
  if (input.lineNumber < 1 || input.lineNumber > doc.lines) {
    throw new Error(`extract: lineNumber ${input.lineNumber} out of range (1..${doc.lines})`)
  }
  const line = doc.line(input.lineNumber)

  // Compute the single-colon replacement. Component-extract is line-
  // level (the user types `Name::props` at the start of a line, the
  // trigger consumes the whole line). Token-extract is mid-line (the
  // user finds an existing `prop value` segment and rewrites that
  // exact segment to `prop name::value`, leaving siblings intact).
  let replaceFrom: number
  let replaceTo: number
  let singleColonText: string
  let cursorAbsPos: number

  if (input.kind === 'component') {
    const indent = line.text.match(/^(\s*)/)?.[1] ?? ''
    const head = `${indent}${input.name}:`
    const propsTail = input.properties.startsWith(' ')
      ? input.properties
      : input.properties
        ? ' ' + input.properties
        : ''
    replaceFrom = line.from
    replaceTo = line.to
    singleColonText = head + propsTail
    cursorAbsPos = line.from + head.length
  } else {
    // Find `<property> <value>` as a contiguous substring in the line.
    // The replacement leaves indent + everything else in place.
    const segment = `${input.property} ${input.value}`
    const segIdx = line.text.indexOf(segment)
    if (segIdx === -1) {
      throw new Error(
        `extractToken: line ${input.lineNumber} does not contain "${segment}"\n  line: "${line.text}"`
      )
    }
    if (line.text.indexOf(segment, segIdx + 1) !== -1) {
      throw new Error(
        `extractToken: segment "${segment}" appears more than once on line ${input.lineNumber} — ambiguous`
      )
    }
    const head = `${input.property} ${input.tokenName}:` // single colon
    replaceFrom = line.from + segIdx
    replaceTo = replaceFrom + segment.length
    singleColonText = head + input.value
    cursorAbsPos = replaceFrom + head.length
  }

  editor.dispatch({
    changes: { from: replaceFrom, to: replaceTo, insert: singleColonText },
    selection: { anchor: cursorAbsPos },
  })
  await api.utils.delay(50)

  // Insert the second `:` at the position right after the first `:`.
  // The CodeMirror update listener sees a single-`:` insertion preceded
  // by `Name:` / `prop name:` and matches its EXTRACT_PATTERN.
  editor.dispatch({
    changes: { from: cursorAbsPos, to: cursorAbsPos, insert: ':' },
    selection: { anchor: cursorAbsPos + 1 },
  })

  // Trigger uses setTimeout(10ms); add room for the extraction dispatch
  // and any dialog mount before returning.
  await api.utils.delay(300)
}

interface EditorViewLike {
  state: { doc: { lines: number; line(n: number): { from: number; to: number; text: string } } }
  dispatch(spec: {
    changes: { from: number; to: number; insert: string }
    selection?: { anchor: number }
  }): void
}

// =============================================================================
// Batch-replace dialog interaction
// =============================================================================

const BATCH_DIALOG_SELECTOR = 'dialog.mirror-batch-replace-dialog'

interface BatchReplaceStep {
  do: 'batchReplace'
  action: 'acceptAll' | 'cancel' | 'acceptNear' | 'selectOnly'
  expectMatches?: number
  expectNearMatches?: number
  nearIndices?: readonly number[]
  exactIndices?: readonly number[]
}

async function applyBatchReplaceAction(step: BatchReplaceStep, api: TestAPI): Promise<void> {
  const dialog = document.querySelector(BATCH_DIALOG_SELECTOR) as HTMLDialogElement | null
  if (!dialog || !dialog.open) {
    throw new Error('batchReplace: dialog not open (extract action did not produce matches?)')
  }

  // The dialog renders matches in two sections, each with its own list
  // of `<input type=checkbox>` elements wrapped in labels. We
  // distinguish them by their containing section's heading text.
  const { exactBoxes, nearBoxes } = collectDialogCheckboxes(dialog)

  if (step.expectMatches !== undefined && exactBoxes.length !== step.expectMatches) {
    throw new Error(
      `batchReplace: expected ${step.expectMatches} exact match(es), got ${exactBoxes.length}`
    )
  }
  if (step.expectNearMatches !== undefined && nearBoxes.length !== step.expectNearMatches) {
    throw new Error(
      `batchReplace: expected ${step.expectNearMatches} near match(es), got ${nearBoxes.length}`
    )
  }

  switch (step.action) {
    case 'acceptAll':
      // Defaults: exact pre-checked, near unchecked. Click "Anwenden".
      clickDialogButton(dialog, 'Anwenden')
      break
    case 'cancel':
      clickDialogButton(dialog, 'Abbrechen')
      break
    case 'acceptNear': {
      if (!step.nearIndices) throw new Error('batchReplace acceptNear: nearIndices required')
      for (const idx of step.nearIndices) {
        if (idx < 0 || idx >= nearBoxes.length) {
          throw new Error(
            `batchReplace acceptNear: index ${idx} out of range (0..${nearBoxes.length - 1})`
          )
        }
        if (!nearBoxes[idx].checked) nearBoxes[idx].click()
      }
      clickDialogButton(dialog, 'Anwenden')
      break
    }
    case 'selectOnly': {
      if (!step.exactIndices) throw new Error('batchReplace selectOnly: exactIndices required')
      const keep = new Set(step.exactIndices)
      for (let i = 0; i < exactBoxes.length; i++) {
        const wantChecked = keep.has(i)
        if (exactBoxes[i].checked !== wantChecked) exactBoxes[i].click()
      }
      clickDialogButton(dialog, 'Anwenden')
      break
    }
  }

  // Let the apply dispatch + side-file write settle.
  await api.utils.delay(300)
}

function collectDialogCheckboxes(dialog: HTMLDialogElement): {
  exactBoxes: HTMLInputElement[]
  nearBoxes: HTMLInputElement[]
} {
  // The dialog tags each list item with `data-match-kind="exact|near"`
  // on the wrapping <label>. The checkbox is the first input child.
  const exactBoxes = Array.from(
    dialog.querySelectorAll('[data-match-kind="exact"] input[type="checkbox"]')
  ) as HTMLInputElement[]
  const nearBoxes = Array.from(
    dialog.querySelectorAll('[data-match-kind="near"] input[type="checkbox"]')
  ) as HTMLInputElement[]
  return { exactBoxes, nearBoxes }
}

function clickDialogButton(dialog: HTMLDialogElement, label: string): void {
  const buttons = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[]
  const btn = buttons.find(b => (b.textContent ?? '').trim() === label)
  if (!btn) {
    const labels = buttons.map(b => `"${(b.textContent ?? '').trim()}"`).join(', ')
    throw new Error(`batchReplace: button "${label}" not found in dialog (have: ${labels})`)
  }
  btn.click()
}

// =============================================================================
// Expectation validation
// =============================================================================

interface ValidationCtx {
  prevUndoStackSize: number
  newConsoleErrors: number
  consoleErrorMessages: string[]
  newConsoleWarnings: number
  consoleWarningMessages: string[]
}

function validateExpectations(
  expect: Expectations | undefined,
  api: TestAPI,
  ctx: ValidationCtx
): string[] {
  const issues: string[] = []
  // consoleClean defaults to true (errors + warnings must be clean)
  // even when no `expect` block was given — unexpected console output
  // should always fail. `'errors-only'` tolerates warnings, `false`
  // tolerates everything (use sparingly; prefer fixing root cause).
  const cleanMode: boolean | 'errors-only' = expect?.consoleClean ?? true
  const checkErrors = cleanMode !== false
  const checkWarnings = cleanMode === true
  if (checkErrors && ctx.newConsoleErrors > 0) {
    issues.push(
      `console: ${ctx.newConsoleErrors} unexpected error(s)\n      ${ctx.consoleErrorMessages.join('\n      ')}`
    )
  }
  if (checkWarnings && ctx.newConsoleWarnings > 0) {
    issues.push(
      `console: ${ctx.newConsoleWarnings} unexpected warning(s)\n      ${ctx.consoleWarningMessages.join('\n      ')}`
    )
  }
  if (!expect) return issues

  issues.push(...checkStatePredicates(expect, api))

  // ----- Undo stack (uses ctx — not part of state predicates) -----
  if (expect.undoStackDelta !== undefined) {
    const currentSize = api.studio.history.getUndoStackSize()
    const actualDelta = currentSize - ctx.prevUndoStackSize
    if (actualDelta !== expect.undoStackDelta) {
      issues.push(`undoStackDelta: expected ${expect.undoStackDelta}, got ${actualDelta}`)
    }
  }

  return issues
}

/**
 * Pure state-predicate checks usable both for one-shot post-step
 * validation and for the `waitFor` polling loop. No console / undo
 * inspection — those are point-in-time deltas, not predicates.
 *
 * Accepts the full `Expectations` shape but only reads the state-related
 * fields (code/codeMatches/files/selection/multiSelection/dom/panel/props).
 * Other fields are ignored.
 */
function checkStatePredicates(
  expect: Pick<
    Expectations,
    | 'code'
    | 'codeMatches'
    | 'files'
    | 'selection'
    | 'selectionNot'
    | 'multiSelection'
    | 'dom'
    | 'panel'
    | 'props'
  >,
  api: TestAPI
): string[] {
  const issues: string[] = []

  // ----- Code -----
  if (expect.code !== undefined) {
    const actual = canonicalizeCode(api.editor.getCode())
    const expected = canonicalizeCode(expect.code)
    if (actual !== expected) {
      issues.push('code mismatch:\n' + codeDiff(expected, actual))
    }
  }
  if (expect.codeMatches !== undefined) {
    const actual = api.editor.getCode()
    if (!expect.codeMatches.test(actual)) {
      issues.push(`codeMatches did not match. Pattern: ${expect.codeMatches}\n  Actual:\n${actual}`)
    }
  }

  // ----- Files (per-file source assertions) -----
  // For the active file we read from the editor (it may have unsaved
  // edits). For other files we read from the project file cache.
  if (expect.files) {
    const activeFile = api.panel.files.getCurrentFile()
    for (const [filename, expected] of Object.entries(expect.files)) {
      let actualRaw: string | undefined
      if (filename === activeFile) {
        actualRaw = api.editor.getCode()
      } else {
        const content = api.panel.files.getContent(filename)
        actualRaw = typeof content === 'string' ? content : undefined
      }
      if (expected === null) {
        if (actualRaw !== undefined) {
          issues.push(`files[${filename}]: expected file NOT to exist, but it does`)
        }
        continue
      }
      if (actualRaw === undefined) {
        issues.push(`files[${filename}]: file does not exist (expected non-null content)`)
        continue
      }
      const actual = canonicalizeCode(actualRaw)
      const expectedCanon = canonicalizeCode(expected)
      if (actual !== expectedCanon) {
        issues.push(`files[${filename}] mismatch:\n` + codeDiff(expectedCanon, actual))
      }
    }
  }

  // ----- Selection -----
  if (expect.selection !== undefined) {
    const actual = api.studio.getSelection()
    if (actual !== expect.selection) {
      issues.push(`selection: expected ${formatId(expect.selection)}, got ${formatId(actual)}`)
    }
  }
  if (expect.selectionNot !== undefined) {
    const actual = api.studio.getSelection()
    if (actual === expect.selectionNot) {
      issues.push(`selection: expected NOT ${expect.selectionNot}, but it is`)
    }
  }
  if (expect.multiSelection !== undefined) {
    const actual = api.studio.getMultiSelection()
    const expectedSet = new Set(expect.multiSelection)
    const actualSet = new Set(actual)
    const missing = [...expectedSet].filter(id => !actualSet.has(id))
    const extra = [...actualSet].filter(id => !expectedSet.has(id))
    if (missing.length > 0 || extra.length > 0) {
      issues.push(
        `multiSelection: expected [${[...expectedSet].sort().join(', ')}], got [${[...actualSet].sort().join(', ')}]`
      )
    }
  }

  // ----- DOM -----
  // Most keys are computed-style names. The special keys below read from
  // the element rather than computed style:
  //   `textContent` → el.textContent.trim()  — useful for interpolated
  //                   text where source carries `$varName` and only the
  //                   runtime-rendered DOM holds the actual value.
  if (expect.dom) {
    for (const [nodeId, styles] of Object.entries(expect.dom)) {
      const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) {
        issues.push(`dom: element ${nodeId} not found`)
        continue
      }
      const computed = window.getComputedStyle(el)
      for (const [prop, expected] of Object.entries(styles)) {
        let actual: string
        if (prop === 'textContent') {
          actual = (el.textContent ?? '').trim()
        } else {
          actual =
            (computed as unknown as Record<string, string>)[prop] ?? computed.getPropertyValue(prop)
        }
        const matches = expected instanceof RegExp ? expected.test(actual) : actual === expected
        if (!matches) {
          issues.push(`dom[${nodeId}].${prop}: expected ${expected}, got "${actual}"`)
        }
      }
    }
  }

  // ----- Panel -----
  // For properties with a registered PropertyReader (e.g. bg/col/boc),
  // route through reader.fromPanel so we get the same token-aware,
  // normalised value our `props:` checks use. That gives `$primary`
  // → `#2271c1` resolution via allSources, matching what the user sees
  // in the panel swatch. Properties without a reader fall back to the
  // raw panel API (the historical behaviour).
  if (expect.panel) {
    const ctxOrNull = buildReaderContext(api)
    const selectedId = api.studio.getSelection()
    for (const [property, expected] of Object.entries(expect.panel)) {
      const reader = getReader(property)
      let actual: string | null
      if (reader && ctxOrNull && selectedId) {
        const norm = reader.normalize ?? ((v: string | null) => v)
        actual = norm(reader.fromPanel(selectedId, ctxOrNull))
        const expectedN = norm(expected)
        if (actual !== expectedN) {
          issues.push(
            `panel[${property}]: expected ${formatPanelValue(expectedN)}, got ${formatPanelValue(actual)}`
          )
        }
        continue
      }
      actual = api.panel.property.getPropertyValue(property)
      if (actual !== expected) {
        issues.push(
          `panel[${property}]: expected ${formatPanelValue(expected)}, got ${formatPanelValue(actual)}`
        )
      }
    }
  }

  // ----- Properties (3-dimension check) -----
  if (expect.props) {
    const ctx = buildReaderContext(api)
    if (!ctx) {
      issues.push('props: SourceMap or preview container not available')
    } else {
      for (const [nodeId, propMap] of Object.entries(expect.props)) {
        for (const [propName, expected] of Object.entries(propMap)) {
          const reader = getReader(propName)
          if (!reader) {
            issues.push(
              `props[${nodeId}].${propName}: no reader implemented (supported: ${supportedReaderNames()})`
            )
            continue
          }
          // Normalise expected and all reads through the reader's optional
          // normaliser, so multi-form properties (colors etc.) compare on a
          // single canonical representation.
          const norm = reader.normalize ?? ((v: typeof expected) => v)
          const expectedN = norm(expected)
          const code = norm(reader.fromCode(nodeId, ctx))
          const dom = norm(reader.fromDom(nodeId, ctx))
          const panel = norm(reader.fromPanel(nodeId, ctx))
          const codeOk = code === expectedN
          const domOk = dom === expectedN
          const panelOk = panel === expectedN
          if (!codeOk || !domOk || !panelOk) {
            issues.push(
              `property ${propName} on ${nodeId}:\n` +
                `      expected: ${formatPanelValue(expectedN)}\n` +
                `      code:     ${formatPanelValue(code)}    ${codeOk ? '✓' : '✗'}\n` +
                `      dom:      ${formatPanelValue(dom)}    ${domOk ? '✓' : '✗'}\n` +
                `      panel:    ${formatPanelValue(panel)}    ${panelOk ? '✓' : '✗'}`
            )
          }
        }
      }
    }
  }

  return issues
}

// =============================================================================
// Step description (for error labels)
// =============================================================================

function describeStep(step: Step): string {
  const prefix = step.comment ? `${step.comment} (` : ''
  const suffix = step.comment ? ')' : ''
  switch (step.do) {
    case 'select':
      return `${prefix}select ${formatId(step.nodeId)}${suffix}`
    case 'click':
      return `${prefix}click ${step.nodeId}${suffix}`
    case 'pressKey': {
      const mods = [
        step.meta && 'Cmd',
        step.ctrl && 'Ctrl',
        step.alt && 'Opt',
        step.shift && 'Shift',
      ]
        .filter(Boolean)
        .join('+')
      return `${prefix}press ${mods ? mods + '+' : ''}${step.key}${suffix}`
    }
    case 'undo':
      return `${prefix}undo${suffix}`
    case 'redo':
      return `${prefix}redo${suffix}`
    case 'panelSet':
      return `${prefix}panelSet ${step.property}=${step.value}${suffix}`
    case 'panelRemove':
      return `${prefix}panelRemove ${step.property}${suffix}`
    case 'setProperty':
      return `${prefix}set ${step.property}=${step.value} via ${step.via} on ${step.target}${suffix}`
    case 'editorSet':
      return `${prefix}editorSet (${step.code.length} chars)${suffix}`
    case 'editorInsert':
      return `${prefix}editorInsert@${step.line}${suffix}`
    case 'editText':
      return `${prefix}editText ${step.target}=${JSON.stringify(step.text)}${suffix}`
    case 'hover':
      return `${prefix}hover ${step.target}${suffix}`
    case 'unhover':
      return `${prefix}unhover ${step.target}${suffix}`
    case 'multiSelect':
      return `${prefix}multiSelect [${step.nodeIds.join(', ')}]${suffix}`
    case 'switchFile':
      return `${prefix}switchFile ${step.filename}${suffix}`
    case 'replaceFile':
      return `${prefix}replaceFile ${step.filename} (${step.content.length} chars)${suffix}`
    case 'extractComponent':
      return `${prefix}extractComponent ${step.name}::${step.properties.trim()}${suffix}`
    case 'extractToken':
      return `${prefix}extractToken ${step.property} ${step.tokenName}::${step.value}${suffix}`
    case 'batchReplace':
      return `${prefix}batchReplace ${step.action}${suffix}`
    case 'wait':
      return `${prefix}wait ${step.ms}ms${suffix}`
    case 'waitFor': {
      const keys = Object.keys(step.until).join(',')
      return `${prefix}waitFor [${keys}] ≤${step.timeoutMs ?? 2000}ms${suffix}`
    }
  }
}

function formatId(id: string | null): string {
  return id === null ? '<none>' : id
}

function formatPanelValue(v: string | null): string {
  return v === null ? '<unset>' : `"${v}"`
}

function supportedReaderNames(): string {
  return Object.keys(PROPERTY_READERS).join(', ')
}

/**
 * Concatenate the source of every project file. Used by readers that need
 * cross-file lookups (notably the token resolver: a `bg $primary` in one
 * screen file references a definition in `tokens.tok`). For single-file
 * scenarios this collapses to the active source.
 *
 * Failure modes (file API not available, file read throws) fall back to
 * the active source — the worst that happens is tokens defined in other
 * files won't resolve.
 */
function collectAllProjectSources(api: TestAPI, activeSource: string): string {
  try {
    const filenames = api.panel.files.list()
    if (filenames.length === 0) return activeSource
    const parts: string[] = []
    for (const name of filenames) {
      const content = api.panel.files.getContent(name)
      if (typeof content === 'string') parts.push(content)
    }
    return parts.length > 0 ? parts.join('\n') : activeSource
  } catch {
    return activeSource
  }
}

/**
 * Build the ReaderContext, accounting for any test-mode prelude offset.
 *
 * Studio's `__compileTestCode` prepends sibling tokens.tok / components.com
 * as a prelude before parsing, so the SourceMap that comes back uses
 * "resolved-source" line numbers (prelude + active). The editor's doc
 * however still only contains the active file. To let readers index into
 * the editor's content using `node.position.line - 1`, we wrap the
 * SourceMap and subtract the prelude line offset.
 *
 * Returns null when SourceMap or preview container are not available
 * (compile in progress, or no preview yet) — caller surfaces this as a
 * dimension-readiness issue.
 */
function buildReaderContext(api: TestAPI): {
  source: string
  allSources: string
  sourceMap: SourceMapLike
  container: HTMLElement
  api: TestAPI
} | null {
  const realSourceMap = api.studio.getSourceMap() as SourceMapLike | null
  const container = document.getElementById('preview')
  if (!realSourceMap || !container) return null

  const source = api.editor.getCode()
  const allSources = collectAllProjectSources(api, source)

  const preludeLineOffset =
    (window as { __getPreludeLineOffset?: () => number }).__getPreludeLineOffset?.() ?? 0

  const sourceMap: SourceMapLike =
    preludeLineOffset > 0
      ? {
          getNodeById: (id: string) => {
            const node = realSourceMap.getNodeById(id)
            if (!node) return null
            return {
              ...node,
              position: { ...node.position, line: node.position.line - preludeLineOffset },
            }
          },
        }
      : realSourceMap

  return { source, allSources, sourceMap, container, api }
}
