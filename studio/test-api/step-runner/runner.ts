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
import type { Scenario, Step, Expectations } from './types'
import { installConsoleCollector, type ConsoleCollector } from './console-collector'
import { codeDiff, canonicalizeCode } from './diff'
import { getReader, PROPERTY_READERS, type SourceMapLike } from './properties'
import { getWriter } from './writers'

export function scenarioToTestCase(scenario: Scenario): TestCase {
  const tc = testWithSetup(scenario.name, scenario.setup, async (api: TestAPI) => {
    const collector = installConsoleCollector()
    try {
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

      // Most actions trigger a recompile; waitForCompile is a no-op if nothing
      // is pending. The post-delay lets event-driven UI (panel, handles) settle.
      await api.utils.waitForCompile()
      await api.utils.delay(200)

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
  if (expect.panel) {
    for (const [property, expected] of Object.entries(expect.panel)) {
      const actual = api.panel.property.getPropertyValue(property)
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
    const sourceMap = api.studio.getSourceMap() as SourceMapLike | null
    const container = document.getElementById('preview')
    if (!sourceMap) {
      issues.push('props: SourceMap not available (compile in progress?)')
    } else if (!container) {
      issues.push('props: preview container not found')
    } else {
      const ctx = { source, sourceMap, container, api }
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
