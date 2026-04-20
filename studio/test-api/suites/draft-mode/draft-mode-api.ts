/**
 * Draft Mode Test API
 *
 * Provides helper functions for testing the draft mode feature (-- marker).
 * This API abstracts the complexity of interacting with CodeMirror,
 * state management, and event handling for draft mode tests.
 */

import type { EditorView } from '@codemirror/view'

// =============================================================================
// Types
// =============================================================================

export interface DraftModeTestContext {
  /** The CodeMirror EditorView instance */
  view: EditorView
  /** Set code in the editor */
  setCode: (code: string) => Promise<void>
  /** Get current editor content */
  getCode: () => string
  /** Type text at current cursor position */
  typeText: (text: string) => Promise<void>
  /** Type text at end of document */
  typeAtEnd: (text: string) => Promise<void>
  /** Press a key combination (e.g., 'Mod-Enter', 'Escape') */
  pressKey: (key: string) => Promise<void>
  /** Move cursor to specific line and column */
  moveCursor: (line: number, column?: number) => void
  /** Get cursor position */
  getCursor: () => { line: number; column: number }
  /** Check if draft mode is active */
  isDraftActive: () => boolean
  /** Get draft state */
  getDraftState: () => {
    active: boolean
    startLine: number | null
    prompt: string | null
    endLine: number | null
    indent: number
    processing: boolean
  }
  /** Check if a line is in draft block */
  isLineInDraft: (lineNumber: number) => boolean
  /** Get lines with draft CSS class (1-indexed) */
  getDraftClassLines: () => number[]
  /** Check if a line has draft marker class */
  hasMarkerClass: (lineNumber: number) => boolean
  /** Check if processing indicator is visible */
  isProcessing: () => boolean
  /** Wait for async operations */
  delay: (ms: number) => Promise<void>
  /** Get all editor lines as array */
  getLines: () => string[]
  /** Check if autocomplete popup is visible */
  isAutocompleteVisible: () => boolean
}

export interface DraftModeAssertions {
  /** Assert draft mode is active */
  isActive: (message?: string) => void
  /** Assert draft mode is NOT active */
  isNotActive: (message?: string) => void
  /** Assert prompt was extracted correctly */
  hasPrompt: (expected: string, message?: string) => void
  /** Assert no prompt */
  hasNoPrompt: (message?: string) => void
  /** Assert specific lines are in draft block */
  linesInDraft: (lineNumbers: number[], message?: string) => void
  /** Assert specific lines are NOT in draft block */
  linesNotInDraft: (lineNumbers: number[], message?: string) => void
  /** Assert lines have draft CSS class */
  linesHaveDraftClass: (lineNumbers: number[], message?: string) => void
  /** Assert lines do NOT have draft CSS class */
  linesNoDraftClass: (lineNumbers: number[], message?: string) => void
  /** Assert indentation level */
  hasIndent: (expected: number, message?: string) => void
  /** Assert start line */
  startsAtLine: (lineNumber: number, message?: string) => void
  /** Assert end line */
  endsAtLine: (lineNumber: number | null, message?: string) => void
  /** Assert code contains text */
  codeContains: (text: string, message?: string) => void
  /** Assert code does NOT contain text */
  codeNotContains: (text: string, message?: string) => void
  /** Assert autocomplete is NOT visible */
  noAutocomplete: (message?: string) => void
}

// =============================================================================
// API Factory
// =============================================================================

/**
 * Create a test context for draft mode testing
 */
export async function createDraftModeTestContext(api: any): Promise<DraftModeTestContext> {
  // Dynamic imports to get fresh modules
  const { isDraftModeActive, getDraftState, isLineInDraftBlock } =
    await import('../../../editor/draft-mode')

  const view = (window as any).editor as EditorView
  if (!view) {
    throw new Error('EditorView not available on window.editor')
  }

  return {
    view,

    setCode: async (code: string) => {
      await api.editor.setCode(code)
      await api.utils.delay(50)
    },

    getCode: () => view.state.doc.toString(),

    typeText: async (text: string) => {
      // Simulate typing at current cursor position
      const pos = view.state.selection.main.head
      view.dispatch({
        changes: { from: pos, to: pos, insert: text },
        selection: { anchor: pos + text.length },
      })
      await api.utils.delay(50)
    },

    typeAtEnd: async (text: string) => {
      const end = view.state.doc.length
      view.dispatch({
        changes: { from: end, to: end, insert: text },
        selection: { anchor: end + text.length },
      })
      await api.utils.delay(50)
    },

    pressKey: async (key: string) => {
      // Create and dispatch keyboard event
      const isMod = key.startsWith('Mod-')
      const actualKey = isMod ? key.slice(4) : key

      const event = new KeyboardEvent('keydown', {
        key: actualKey,
        code:
          actualKey === 'Enter'
            ? 'Enter'
            : actualKey === 'Escape'
              ? 'Escape'
              : `Key${actualKey.toUpperCase()}`,
        metaKey: isMod,
        ctrlKey: false,
        bubbles: true,
      })

      view.contentDOM.dispatchEvent(event)
      await api.utils.delay(100)
    },

    moveCursor: (line: number, column: number = 1) => {
      try {
        const lineInfo = view.state.doc.line(line)
        const offset = lineInfo.from + Math.min(column - 1, lineInfo.length)
        view.dispatch({
          selection: { anchor: offset },
        })
      } catch {
        // Line doesn't exist
      }
    },

    getCursor: () => {
      const offset = view.state.selection.main.head
      const line = view.state.doc.lineAt(offset)
      return {
        line: line.number,
        column: offset - line.from + 1,
      }
    },

    isDraftActive: () => isDraftModeActive(view),

    getDraftState: () => {
      const state = getDraftState(view)
      return {
        active: state.active,
        startLine: state.startLine,
        prompt: state.prompt,
        endLine: state.endLine,
        indent: state.indent,
        processing: state.processing,
      }
    },

    isLineInDraft: (lineNumber: number) => isLineInDraftBlock(view, lineNumber),

    getDraftClassLines: () => {
      const lines = document.querySelectorAll('.cm-line')
      const draftLines: number[] = []
      lines.forEach((line, index) => {
        if (line.classList.contains('cm-draft-line')) {
          draftLines.push(index + 1) // Convert to 1-indexed
        }
      })
      return draftLines
    },

    hasMarkerClass: (lineNumber: number) => {
      const lines = document.querySelectorAll('.cm-line')
      const line = lines[lineNumber - 1]
      return line?.classList.contains('cm-draft-marker-line') ?? false
    },

    isProcessing: () => {
      return document.querySelector('.cm-draft-processing') !== null
    },

    delay: (ms: number) => api.utils.delay(ms),

    getLines: () => view.state.doc.toString().split('\n'),

    isAutocompleteVisible: () => {
      return document.querySelector('.cm-tooltip-autocomplete') !== null
    },
  }
}

/**
 * Create assertion helpers for draft mode tests
 */
export function createDraftModeAssertions(
  ctx: DraftModeTestContext,
  assertOk: (condition: boolean, message: string) => void
): DraftModeAssertions {
  return {
    isActive: (message?: string) => {
      assertOk(ctx.isDraftActive(), message || 'Draft mode should be active')
    },

    isNotActive: (message?: string) => {
      assertOk(!ctx.isDraftActive(), message || 'Draft mode should NOT be active')
    },

    hasPrompt: (expected: string, message?: string) => {
      const state = ctx.getDraftState()
      assertOk(
        state.prompt === expected,
        message || `Expected prompt "${expected}" but got "${state.prompt}"`
      )
    },

    hasNoPrompt: (message?: string) => {
      const state = ctx.getDraftState()
      assertOk(state.prompt === null, message || `Expected no prompt but got "${state.prompt}"`)
    },

    linesInDraft: (lineNumbers: number[], message?: string) => {
      for (const lineNum of lineNumbers) {
        const inDraft = ctx.isLineInDraft(lineNum)
        assertOk(inDraft, message || `Line ${lineNum} should be in draft block`)
      }
    },

    linesNotInDraft: (lineNumbers: number[], message?: string) => {
      for (const lineNum of lineNumbers) {
        const inDraft = ctx.isLineInDraft(lineNum)
        assertOk(!inDraft, message || `Line ${lineNum} should NOT be in draft block`)
      }
    },

    linesHaveDraftClass: (lineNumbers: number[], message?: string) => {
      const draftLines = ctx.getDraftClassLines()
      for (const lineNum of lineNumbers) {
        assertOk(
          draftLines.includes(lineNum),
          message || `Line ${lineNum} should have cm-draft-line class`
        )
      }
    },

    linesNoDraftClass: (lineNumbers: number[], message?: string) => {
      const draftLines = ctx.getDraftClassLines()
      for (const lineNum of lineNumbers) {
        assertOk(
          !draftLines.includes(lineNum),
          message || `Line ${lineNum} should NOT have cm-draft-line class`
        )
      }
    },

    hasIndent: (expected: number, message?: string) => {
      const state = ctx.getDraftState()
      assertOk(
        state.indent === expected,
        message || `Expected indent ${expected} but got ${state.indent}`
      )
    },

    startsAtLine: (lineNumber: number, message?: string) => {
      const state = ctx.getDraftState()
      assertOk(
        state.startLine === lineNumber,
        message || `Expected start line ${lineNumber} but got ${state.startLine}`
      )
    },

    endsAtLine: (lineNumber: number | null, message?: string) => {
      const state = ctx.getDraftState()
      assertOk(
        state.endLine === lineNumber,
        message || `Expected end line ${lineNumber} but got ${state.endLine}`
      )
    },

    codeContains: (text: string, message?: string) => {
      const code = ctx.getCode()
      assertOk(code.includes(text), message || `Code should contain "${text}"`)
    },

    codeNotContains: (text: string, message?: string) => {
      const code = ctx.getCode()
      assertOk(!code.includes(text), message || `Code should NOT contain "${text}"`)
    },

    noAutocomplete: (message?: string) => {
      assertOk(!ctx.isAutocompleteVisible(), message || 'Autocomplete should NOT be visible')
    },
  }
}

// =============================================================================
// Test Scenarios
// =============================================================================

export interface DraftModeScenario {
  name: string
  description: string
  code: string
  expected: {
    active: boolean
    startLine?: number | null
    prompt?: string | null
    endLine?: number | null
    indent?: number
    draftLines?: number[]
    nonDraftLines?: number[]
  }
}

/**
 * Common test scenarios for draft mode
 */
export const DRAFT_MODE_SCENARIOS: DraftModeScenario[] = [
  {
    name: 'simple-open',
    description: 'Simple -- at end opens draft block',
    code: 'Frame bg #1a1a1a\n--',
    expected: {
      active: true,
      startLine: 2,
      prompt: null,
      endLine: null,
      indent: 0,
      draftLines: [2],
      nonDraftLines: [1],
    },
  },
  {
    name: 'with-prompt',
    description: '-- with prompt extracts text',
    code: 'Frame\n-- add a blue button',
    expected: {
      active: true,
      startLine: 2,
      prompt: 'add a blue button',
      endLine: null,
      indent: 0,
    },
  },
  {
    name: 'indented',
    description: 'Indented -- preserves indent level',
    code: 'Frame\n  -- add child element',
    expected: {
      active: true,
      startLine: 2,
      prompt: 'add child element',
      indent: 2,
    },
  },
  {
    name: 'closed-block',
    description: 'Closed block with two -- markers',
    code: 'Frame\n--\nBtn "Test"\n--',
    expected: {
      active: true,
      startLine: 2,
      endLine: 4,
      draftLines: [2, 3, 4],
      nonDraftLines: [1],
    },
  },
  {
    name: 'open-with-content',
    description: 'Open block with content after',
    code: 'Frame\n--\nBtn "Test"\nText "Hello"',
    expected: {
      active: true,
      startLine: 2,
      endLine: null,
      draftLines: [2, 3, 4],
      nonDraftLines: [1],
    },
  },
  {
    name: 'no-marker',
    description: 'No -- means no draft block',
    code: 'Frame bg #1a1a1a\n  Text "Hello"',
    expected: {
      active: false,
      startLine: null,
    },
  },
  {
    name: 'first-line',
    description: '-- on first line',
    code: '-- generate a form',
    expected: {
      active: true,
      startLine: 1,
      prompt: 'generate a form',
    },
  },
  {
    name: 'deeply-indented',
    description: 'Deeply indented --',
    code: 'Frame\n  Frame\n    -- add nested content',
    expected: {
      active: true,
      startLine: 3,
      indent: 4,
      prompt: 'add nested content',
    },
  },
]

// =============================================================================
// Workflow Helper
// =============================================================================

export interface DraftWorkflowStep {
  action: 'type' | 'setCode' | 'pressKey' | 'wait'
  value?: string
  key?: string
  ms?: number
}

/**
 * Execute a sequence of workflow steps
 */
export async function executeDraftWorkflow(
  ctx: DraftModeTestContext,
  steps: DraftWorkflowStep[]
): Promise<void> {
  for (const step of steps) {
    switch (step.action) {
      case 'type':
        await ctx.typeAtEnd(step.value || '')
        break
      case 'setCode':
        await ctx.setCode(step.value || '')
        break
      case 'pressKey':
        await ctx.pressKey(step.key || '')
        break
      case 'wait':
        await ctx.delay(step.ms || 100)
        break
    }
  }
}

// =============================================================================
// Visual State Inspector
// =============================================================================

export interface LineVisualState {
  lineNumber: number
  text: string
  hasDraftClass: boolean
  hasMarkerClass: boolean
  hasProcessingClass: boolean
}

/**
 * Get detailed visual state of all editor lines
 */
export function inspectDraftVisualState(ctx: DraftModeTestContext): LineVisualState[] {
  const lines = document.querySelectorAll('.cm-line')
  const states: LineVisualState[] = []
  const codeLines = ctx.getLines()

  lines.forEach((line, index) => {
    states.push({
      lineNumber: index + 1,
      text: codeLines[index] || '',
      hasDraftClass: line.classList.contains('cm-draft-line'),
      hasMarkerClass: line.classList.contains('cm-draft-marker-line'),
      hasProcessingClass: line.classList.contains('cm-draft-processing'),
    })
  })

  return states
}

/**
 * Format visual state for debugging output
 */
export function formatDraftVisualState(states: LineVisualState[]): string {
  return states
    .map(s => {
      const flags: string[] = []
      if (s.hasDraftClass) flags.push('DRAFT')
      if (s.hasMarkerClass) flags.push('MARKER')
      if (s.hasProcessingClass) flags.push('PROCESSING')
      const flagStr = flags.length > 0 ? `[${flags.join(',')}]` : '[NORMAL]'
      return `  L${s.lineNumber}: ${flagStr} "${s.text}"`
    })
    .join('\n')
}
