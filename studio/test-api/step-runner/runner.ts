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
      if (typeof scenario.setup !== 'string') {
        await setupProjectFiles(scenario.setup, api)
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
 */
async function setupProjectFiles(setup: SetupProject, api: TestAPI): Promise<void> {
  const entry = setup.entry
  for (const [filename, content] of Object.entries(setup.files)) {
    // Important: also create the entry file. testWithSetup put its
    // content in the editor, but Studio's `files{}` global doesn't know
    // about it under the entry name (it's still under whatever
    // currentFile defaulted to — index.mir or similar). Without this,
    // panel.files.open(entry) silently fails (returns false) because
    // files[entry] doesn't exist.
    const exists = api.panel.files.list().includes(filename)
    if (exists) {
      await api.panel.files.delete(filename)
    }
    await api.panel.files.create(filename, content)
  }
  // Switch to entry so the editor + preview reflect that file.
  await api.panel.files.open(entry)
  await api.utils.waitForCompile()
  await api.utils.delay(100)
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
  let prevConsoleCount = collector.count()

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
        newConsoleErrors: collector.count() - prevConsoleCount,
        consoleErrorMessages: collector.errorsSince(prevConsoleCount),
      })

      if (issues.length > 0) {
        throw new Error(`${label}\n${issues.map(line => '  • ' + line).join('\n')}`)
      }

      prevUndoStackSize = api.studio.history.getUndoStackSize()
      prevConsoleCount = collector.count()
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
    case 'wait':
      await api.utils.delay(step.ms)
      return
    default: {
      const _exhaustive: never = step
      throw new Error(`Unknown action: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

// =============================================================================
// Expectation validation
// =============================================================================

interface ValidationCtx {
  prevUndoStackSize: number
  newConsoleErrors: number
  consoleErrorMessages: string[]
}

function validateExpectations(
  expect: Expectations | undefined,
  api: TestAPI,
  ctx: ValidationCtx
): string[] {
  const issues: string[] = []
  // consoleClean defaults to true even when no `expect` block was given —
  // unexpected console errors should always fail.
  const consoleCleanRequired = expect?.consoleClean !== false
  if (consoleCleanRequired && ctx.newConsoleErrors > 0) {
    issues.push(
      `console: ${ctx.newConsoleErrors} unexpected error(s)\n      ${ctx.consoleErrorMessages.join('\n      ')}`
    )
  }
  if (!expect) return issues

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
  if (expect.dom) {
    for (const [nodeId, styles] of Object.entries(expect.dom)) {
      const el = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!el) {
        issues.push(`dom: element ${nodeId} not found`)
        continue
      }
      const computed = window.getComputedStyle(el)
      for (const [prop, expected] of Object.entries(styles)) {
        const actual =
          (computed as unknown as Record<string, string>)[prop] ?? computed.getPropertyValue(prop)
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
    const source = api.editor.getCode()
    const allSources = collectAllProjectSources(api, source)
    const sourceMap = api.studio.getSourceMap() as SourceMapLike | null
    const container = document.getElementById('preview')
    const selectedId = api.studio.getSelection()
    for (const [property, expected] of Object.entries(expect.panel)) {
      const reader = getReader(property)
      let actual: string | null
      if (reader && sourceMap && container && selectedId) {
        const ctx = { source, allSources, sourceMap, container, api }
        const norm = reader.normalize ?? ((v: string | null) => v)
        actual = norm(reader.fromPanel(selectedId, ctx))
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
    const source = api.editor.getCode()
    const allSources = collectAllProjectSources(api, source)
    const sourceMap = api.studio.getSourceMap() as SourceMapLike | null
    const container = document.getElementById('preview')
    if (!sourceMap) {
      issues.push('props: SourceMap not available (compile in progress?)')
    } else if (!container) {
      issues.push('props: preview container not found')
    } else {
      const ctx = { source, allSources, sourceMap, container, api }
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

  // ----- Undo stack -----
  if (expect.undoStackDelta !== undefined) {
    const currentSize = api.studio.history.getUndoStackSize()
    const actualDelta = currentSize - ctx.prevUndoStackSize
    if (actualDelta !== expect.undoStackDelta) {
      issues.push(`undoStackDelta: expected ${expect.undoStackDelta}, got ${actualDelta}`)
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
    case 'wait':
      return `${prefix}wait ${step.ms}ms${suffix}`
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
