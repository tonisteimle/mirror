/**
 * Draft Lines Test API
 *
 * Provides helper functions for testing the draft lines feature.
 * This API abstracts the complexity of interacting with CodeMirror,
 * state management, and event handling for draft lines tests.
 */

import type { EditorView } from '@codemirror/view'

// =============================================================================
// Types
// =============================================================================

export interface DraftLinesTestContext {
  /** The CodeMirror EditorView instance */
  view: EditorView
  /** Set code in the editor */
  setCode: (code: string) => Promise<void>
  /** Get current editor content */
  getCode: () => string
  /** Set validated source in state */
  setValidated: (code: string) => void
  /** Get validated source from state */
  getValidated: () => string
  /** Detect draft lines (returns 1-indexed line numbers) */
  detectDraft: (current: string, validated: string) => Set<number>
  /** Apply draft line decorations */
  applyDraft: (lineNumbers: Set<number>) => void
  /** Clear all draft line decorations */
  clearDraft: () => void
  /** Check if a line has the draft CSS class (1-indexed) */
  hasLineDraftClass: (lineNumber: number) => boolean
  /** Get all lines with draft CSS class (1-indexed) */
  getDraftClassLines: () => number[]
  /** Emit compile:completed event */
  emitCompileCompleted: (hasErrors: boolean) => void
  /** Wait for async operations */
  delay: (ms: number) => Promise<void>
}

export interface LineVisualState {
  lineNumber: number
  hasDraftClass: boolean
  textContent: string
}

// =============================================================================
// API Factory
// =============================================================================

/**
 * Create a test context for draft lines testing
 */
export async function createDraftLinesTestContext(
  editorSetCode: (code: string) => Promise<void>,
  delayFn: (ms: number) => Promise<void>
): Promise<DraftLinesTestContext> {
  // Dynamic imports to get fresh modules
  const { detectDraftLines, setDraftLines, clearDraftLines } =
    await import('../../../editor/draft-lines')
  const { state, events } = await import('../../../core')

  const view = (window as any).editor as EditorView
  if (!view) {
    throw new Error('EditorView not available on window.editor')
  }

  return {
    view,

    setCode: async (code: string) => {
      await editorSetCode(code)
      // Also update state.source for consistency
      state.set({ source: code })
      await delayFn(50)
    },

    getCode: () => view.state.doc.toString(),

    setValidated: (code: string) => {
      state.set({ validatedSource: code })
    },

    getValidated: () => state.get().validatedSource,

    detectDraft: (current: string, validated: string) => {
      return detectDraftLines(current, validated)
    },

    applyDraft: (lineNumbers: Set<number>) => {
      setDraftLines(view, lineNumbers)
    },

    clearDraft: () => {
      clearDraftLines(view)
    },

    hasLineDraftClass: (lineNumber: number) => {
      const lines = document.querySelectorAll('.cm-line')
      const line = lines[lineNumber - 1] // Convert to 0-indexed
      return line?.classList.contains('cm-draft-line') ?? false
    },

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

    emitCompileCompleted: (hasErrors: boolean) => {
      events.emit('compile:completed', {
        hasErrors,
        ast: {},
        ir: {},
        sourceMap: { getNodeById: () => null },
        version: Date.now(),
      })
    },

    delay: delayFn,
  }
}

// =============================================================================
// Assertion Helpers
// =============================================================================

export interface DraftLinesAssertions {
  /** Assert specific lines are draft (1-indexed) */
  linesAreDraft: (lineNumbers: number[], message?: string) => void
  /** Assert specific lines are NOT draft (validated/bright) */
  linesAreValidated: (lineNumbers: number[], message?: string) => void
  /** Assert exact set of draft lines */
  exactDraftLines: (expected: number[], message?: string) => void
  /** Assert no lines are draft */
  noDraftLines: (message?: string) => void
  /** Assert all lines are draft */
  allLinesDraft: (totalLines: number, message?: string) => void
}

export function createDraftLinesAssertions(
  ctx: DraftLinesTestContext,
  assertOk: (condition: boolean, message: string) => void
): DraftLinesAssertions {
  return {
    linesAreDraft: (lineNumbers: number[], message?: string) => {
      for (const lineNum of lineNumbers) {
        const hasDraft = ctx.hasLineDraftClass(lineNum)
        assertOk(hasDraft, message || `Line ${lineNum} should be draft (have cm-draft-line class)`)
      }
    },

    linesAreValidated: (lineNumbers: number[], message?: string) => {
      for (const lineNum of lineNumbers) {
        const hasDraft = ctx.hasLineDraftClass(lineNum)
        assertOk(
          !hasDraft,
          message || `Line ${lineNum} should be validated (NOT have cm-draft-line class)`
        )
      }
    },

    exactDraftLines: (expected: number[], message?: string) => {
      const actual = ctx.getDraftClassLines()
      const expectedSet = new Set(expected)
      const actualSet = new Set(actual)

      const match =
        expectedSet.size === actualSet.size && [...expectedSet].every(n => actualSet.has(n))

      assertOk(
        match,
        message || `Expected draft lines [${expected.join(', ')}] but got [${actual.join(', ')}]`
      )
    },

    noDraftLines: (message?: string) => {
      const draftLines = ctx.getDraftClassLines()
      assertOk(
        draftLines.length === 0,
        message || `Expected no draft lines but found [${draftLines.join(', ')}]`
      )
    },

    allLinesDraft: (totalLines: number, message?: string) => {
      const draftLines = ctx.getDraftClassLines()
      const expected = Array.from({ length: totalLines }, (_, i) => i + 1)
      assertOk(
        draftLines.length === totalLines,
        message ||
          `Expected all ${totalLines} lines to be draft but got ${draftLines.length}: [${draftLines.join(', ')}]`
      )
    },
  }
}

// =============================================================================
// Test Scenarios
// =============================================================================

export interface DraftLinesScenario {
  name: string
  description: string
  validated: string
  current: string
  expectedDraftLines: number[]
}

/**
 * Common test scenarios for draft lines
 */
export const DRAFT_LINES_SCENARIOS: DraftLinesScenario[] = [
  {
    name: 'empty-validated',
    description: 'All lines draft when validated is empty',
    validated: '',
    current: 'Frame bg #1a1a1a\n  Text "Hello"',
    expectedDraftLines: [1, 2],
  },
  {
    name: 'identical-content',
    description: 'No draft lines when content matches validated',
    validated: 'Frame bg #1a1a1a\n  Text "Hello"',
    current: 'Frame bg #1a1a1a\n  Text "Hello"',
    expectedDraftLines: [],
  },
  {
    name: 'new-line-added',
    description: 'Only new line is draft',
    validated: 'Frame bg #1a1a1a',
    current: 'Frame bg #1a1a1a\n  Text "New"',
    expectedDraftLines: [2],
  },
  {
    name: 'line-modified',
    description: 'Modified line is draft, unchanged lines are not',
    validated: 'Frame bg #1a1a1a\n  Text "Original"',
    current: 'Frame bg #1a1a1a\n  Text "Modified"',
    expectedDraftLines: [2],
  },
  {
    name: 'multiple-new-lines',
    description: 'Multiple new lines are all draft',
    validated: 'Frame bg #1a1a1a',
    current: 'Frame bg #1a1a1a\n  Text "One"\n  Text "Two"\n  Text "Three"',
    expectedDraftLines: [2, 3, 4],
  },
  {
    name: 'first-line-modified',
    description: 'First line modified, rest unchanged',
    validated: 'Frame bg #1a1a1a\n  Text "Child"',
    current: 'Frame bg #2271C1\n  Text "Child"',
    expectedDraftLines: [1],
  },
  {
    name: 'middle-line-modified',
    description: 'Middle line modified in 3-line content',
    validated: 'Frame\n  Text "Middle"\n  Button "OK"',
    current: 'Frame\n  Text "Changed"\n  Button "OK"',
    expectedDraftLines: [2],
  },
  {
    name: 'insert-at-beginning',
    description: 'New line inserted at beginning shifts everything',
    validated: 'Text "Original"',
    current: 'Frame\n  Text "Original"',
    expectedDraftLines: [1, 2], // Both are "different" from validated perspective
  },
  {
    name: 'single-line-content',
    description: 'Single line content handling',
    validated: 'Button "Old"',
    current: 'Button "New"',
    expectedDraftLines: [1],
  },
  {
    name: 'whitespace-only-change',
    description: 'Whitespace change is detected as modification',
    validated: 'Frame bg #1a1a1a',
    current: 'Frame  bg #1a1a1a', // Extra space
    expectedDraftLines: [1],
  },
]

// =============================================================================
// Visual State Inspector
// =============================================================================

/**
 * Get detailed visual state of all editor lines
 */
export function inspectLineStates(ctx: DraftLinesTestContext): LineVisualState[] {
  const lines = document.querySelectorAll('.cm-line')
  const states: LineVisualState[] = []

  lines.forEach((line, index) => {
    states.push({
      lineNumber: index + 1,
      hasDraftClass: line.classList.contains('cm-draft-line'),
      textContent: line.textContent || '',
    })
  })

  return states
}

/**
 * Format line states for debugging output
 */
export function formatLineStates(states: LineVisualState[]): string {
  return states
    .map(s => `  L${s.lineNumber}: ${s.hasDraftClass ? '[DRAFT]' : '[VALID]'} "${s.textContent}"`)
    .join('\n')
}

// =============================================================================
// AI Correction Workflow API
// =============================================================================

export interface AIWorkflowStep {
  action: 'write' | 'ai-validate' | 'ai-correct'
  code?: string
  description: string
}

export interface AIWorkflowContext {
  /** Current code in editor */
  currentCode: string
  /** Last validated code */
  validatedCode: string
  /** Lines that are currently draft (1-indexed) */
  draftLines: number[]
  /** Lines that are validated/bright (1-indexed) */
  validatedLines: number[]
}

/**
 * Simulates the AI-assisted editing workflow.
 * Provides methods to:
 * - Write code as user (marks new/changed lines as draft)
 * - AI validates code (marks all lines as validated/bright)
 * - AI corrects code (replaces code and marks as validated)
 */
export interface AIWorkflowSimulator {
  /** Get current workflow state */
  getState: () => AIWorkflowContext

  /**
   * User writes/types code - new/changed lines become draft
   * Returns the lines that are now draft
   */
  userWritesCode: (code: string) => Promise<number[]>

  /**
   * AI validates the current code successfully
   * All lines become validated/bright
   */
  aiValidates: () => Promise<void>

  /**
   * AI corrects the code (replaces with new code)
   * The corrected code becomes validated/bright
   */
  aiCorrects: (correctedCode: string) => Promise<void>

  /**
   * AI validation fails (code has errors)
   * Draft lines remain draft
   */
  aiValidationFails: () => Promise<void>

  /**
   * Get visual state of all lines
   */
  inspectLines: () => LineVisualState[]

  /**
   * Assert expected draft/validated state
   */
  assertState: (expectedDraft: number[], expectedValidated: number[]) => void
}

/**
 * Create an AI workflow simulator for testing
 */
export async function createAIWorkflowSimulator(api: any): Promise<AIWorkflowSimulator> {
  const { detectDraftLines, setDraftLines, clearDraftLines } =
    await import('../../../editor/draft-lines')
  const { state, events } = await import('../../../core')

  const view = (window as any).editor
  if (!view) {
    throw new Error('EditorView not available')
  }

  // Initialize with empty validated source
  let validatedCode = ''
  state.set({ validatedSource: '' })
  clearDraftLines(view)

  const updateDraftVisuals = () => {
    const currentCode = view.state.doc.toString()
    const draftLineNumbers = detectDraftLines(currentCode, validatedCode)
    setDraftLines(view, draftLineNumbers)
    return [...draftLineNumbers]
  }

  const getLineCount = () => {
    return view.state.doc.lines
  }

  const getDraftLines = (): number[] => {
    const lines = document.querySelectorAll('.cm-line')
    const draft: number[] = []
    lines.forEach((line, i) => {
      if (line.classList.contains('cm-draft-line')) {
        draft.push(i + 1)
      }
    })
    return draft
  }

  const getValidatedLines = (): number[] => {
    const lines = document.querySelectorAll('.cm-line')
    const validated: number[] = []
    lines.forEach((line, i) => {
      if (!line.classList.contains('cm-draft-line')) {
        validated.push(i + 1)
      }
    })
    return validated
  }

  return {
    getState: () => ({
      currentCode: view.state.doc.toString(),
      validatedCode,
      draftLines: getDraftLines(),
      validatedLines: getValidatedLines(),
    }),

    userWritesCode: async (code: string) => {
      // Set editor content
      await api.editor.setCode(code)
      state.set({ source: code })
      await api.utils.delay(50)

      // Update draft line visuals
      const draftLines = updateDraftVisuals()
      await api.utils.delay(50)

      return draftLines
    },

    aiValidates: async () => {
      // Get current code
      const currentCode = view.state.doc.toString()

      // Mark as validated
      validatedCode = currentCode
      state.set({ validatedSource: currentCode })

      // Clear all draft decorations
      clearDraftLines(view)
      await api.utils.delay(50)
    },

    aiCorrects: async (correctedCode: string) => {
      // Set the corrected code
      await api.editor.setCode(correctedCode)
      state.set({ source: correctedCode })
      await api.utils.delay(50)

      // Mark corrected code as validated
      validatedCode = correctedCode
      state.set({ validatedSource: correctedCode })

      // Clear all draft decorations (corrected code is validated)
      clearDraftLines(view)
      await api.utils.delay(50)
    },

    aiValidationFails: async () => {
      // Don't update validatedCode
      // Draft lines remain as they are
      await api.utils.delay(50)
    },

    inspectLines: () => {
      const lines = document.querySelectorAll('.cm-line')
      const states: LineVisualState[] = []
      lines.forEach((line, index) => {
        states.push({
          lineNumber: index + 1,
          hasDraftClass: line.classList.contains('cm-draft-line'),
          textContent: line.textContent || '',
        })
      })
      return states
    },

    assertState: (expectedDraft: number[], expectedValidated: number[]) => {
      const actualDraft = getDraftLines()
      const actualValidated = getValidatedLines()

      const draftMatch =
        expectedDraft.length === actualDraft.length &&
        expectedDraft.every(n => actualDraft.includes(n))

      const validatedMatch =
        expectedValidated.length === actualValidated.length &&
        expectedValidated.every(n => actualValidated.includes(n))

      if (!draftMatch) {
        throw new Error(
          `Draft lines mismatch: expected [${expectedDraft.join(', ')}] but got [${actualDraft.join(', ')}]`
        )
      }

      if (!validatedMatch) {
        throw new Error(
          `Validated lines mismatch: expected [${expectedValidated.join(', ')}] but got [${actualValidated.join(', ')}]`
        )
      }
    },
  }
}

/**
 * Get computed color of a token in a specific line
 * Useful for verifying visual difference between draft and validated lines
 */
export function getTokenColor(lineNumber: number, tokenClass: string): string | null {
  const lines = document.querySelectorAll('.cm-line')
  const line = lines[lineNumber - 1]
  if (!line) return null

  const token = line.querySelector(`.${tokenClass}`)
  if (!token) return null

  return window.getComputedStyle(token).color
}

/**
 * Check if a line has muted colors (draft state)
 * Draft lines should have darker/muted syntax colors
 */
export function hasLinesMutedColors(lineNumber: number): boolean {
  const lines = document.querySelectorAll('.cm-line')
  const line = lines[lineNumber - 1]
  if (!line) return false

  // Check for the draft line class
  return line.classList.contains('cm-draft-line')
}
