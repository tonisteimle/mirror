/**
 * Draft Mode Extension
 *
 * CodeMirror extension that detects `--` markers for AI-assisted code editing.
 * When a line starts with `--`, the following content is treated as a "draft block"
 * that will be sent to AI for correction or generation.
 *
 * Features:
 * - `--` at line start marks the beginning of a draft block
 * - Optional prompt after `--`: `-- make this responsive`
 * - Second `--` closes the block, or block stays open until Cmd+Enter
 * - Indented `--` is allowed (provides context to AI about parent element)
 * - Code in draft block is displayed with muted colors (via draft-lines)
 *
 * Usage:
 *   1. Add draftModeExtension() to EditorView extensions
 *   2. Access draft state via draftModeField
 *   3. Subscribe to draft:submit events for AI integration
 */

import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { StateField, StateEffect, type Text } from '@codemirror/state'
import { setDraftLines, clearDraftLines } from './draft-lines'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('DraftMode')

// ===========================================
// Types
// ===========================================

export interface DraftBlockState {
  /** Whether a draft block is currently active */
  active: boolean
  /** Line number where the -- marker is (1-indexed) */
  startLine: number | null
  /** Optional prompt text after -- (e.g., "make responsive") */
  prompt: string | null
  /** Line number where block ends (second -- or null for open) */
  endLine: number | null
  /** Indentation depth of the -- marker (number of spaces) */
  indent: number
  /** Whether AI is currently processing this block */
  processing: boolean
  /** Abort controller for cancelling AI requests */
  abortController: AbortController | null
}

export interface DraftSubmitEvent {
  /** The prompt text after -- (if any) */
  prompt: string | null
  /** Start line of the draft block (1-indexed) */
  startLine: number
  /** End line of the draft block (1-indexed, or last line if open) */
  endLine: number
  /** Indentation of the -- marker */
  indent: number
  /** The code content within the draft block (excluding -- lines) */
  content: string
  /** Full editor source for context */
  fullSource: string
  /** Abort controller to cancel the request */
  abortController: AbortController
}

// ===========================================
// Parsing
// ===========================================

/** Regular expression to match -- at line start (after optional whitespace) */
const DRAFT_MARKER_REGEX = /^(\s*)--\s*(.*)$/

/**
 * Parse a line to check if it's a draft marker
 * @param lineText - The text of the line to check
 * @returns Object with match info or null if not a draft marker
 */
export function parseDraftMarker(lineText: string): {
  indent: number
  prompt: string | null
} | null {
  const match = lineText.match(DRAFT_MARKER_REGEX)
  if (!match) return null

  const [, indentStr, promptText] = match
  return {
    indent: indentStr.length,
    prompt: promptText.trim() || null,
  }
}

/**
 * Parse the document to find draft blocks
 * @param doc - The CodeMirror document
 * @returns DraftBlockState describing the current draft block (if any)
 */
export function parseDraftBlock(doc: Text): DraftBlockState {
  const emptyState: DraftBlockState = {
    active: false,
    startLine: null,
    prompt: null,
    endLine: null,
    indent: 0,
    processing: false,
    abortController: null,
  }

  let foundStart = false
  let startLine: number | null = null
  let prompt: string | null = null
  let indent = 0
  let endLine: number | null = null

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const markerInfo = parseDraftMarker(line.text)

    if (markerInfo !== null) {
      if (!foundStart) {
        // First -- marker: start of draft block
        foundStart = true
        startLine = i
        prompt = markerInfo.prompt
        indent = markerInfo.indent
      } else {
        // Second -- marker: end of draft block
        endLine = i
        break
      }
    }
  }

  if (!foundStart) {
    return emptyState
  }

  return {
    active: true,
    startLine,
    prompt,
    endLine,
    indent,
    processing: false,
    abortController: null,
  }
}

/**
 * Get the line numbers that should be marked as draft (muted colors)
 * Includes all lines from startLine to endLine (or end of document)
 */
export function getDraftLineNumbers(state: DraftBlockState, totalLines: number): Set<number> {
  if (!state.active || state.startLine === null) {
    return new Set()
  }

  const end = state.endLine ?? totalLines
  const lines = new Set<number>()

  for (let i = state.startLine; i <= end; i++) {
    lines.add(i)
  }

  return lines
}

/**
 * Extract the content of a draft block (excluding -- marker lines)
 */
export function extractDraftContent(doc: Text, state: DraftBlockState): string {
  if (!state.active || state.startLine === null) {
    return ''
  }

  const end = state.endLine ?? doc.lines
  const lines: string[] = []

  for (let i = state.startLine + 1; i < end; i++) {
    lines.push(doc.line(i).text)
  }

  // If block is open (no end marker), include from startLine+1 to end of doc
  if (state.endLine === null) {
    for (let i = state.startLine + 1; i <= doc.lines; i++) {
      lines.push(doc.line(i).text)
    }
  }

  return lines.join('\n')
}

// ===========================================
// State Effects
// ===========================================

/** Effect to update draft block state */
export const updateDraftStateEffect = StateEffect.define<Partial<DraftBlockState>>()

/** Effect to set processing state */
export const setDraftProcessingEffect = StateEffect.define<boolean>()

/** Effect to clear draft block (after AI completes or user cancels) */
export const clearDraftBlockEffect = StateEffect.define<void>()

// ===========================================
// State Field
// ===========================================

/**
 * StateField that tracks the current draft block state
 */
export const draftModeField = StateField.define<DraftBlockState>({
  create(state) {
    return parseDraftBlock(state.doc)
  },

  update(current, tr) {
    // Handle explicit effects first
    for (const effect of tr.effects) {
      if (effect.is(updateDraftStateEffect)) {
        return { ...current, ...effect.value }
      }
      if (effect.is(setDraftProcessingEffect)) {
        return { ...current, processing: effect.value }
      }
      if (effect.is(clearDraftBlockEffect)) {
        return {
          active: false,
          startLine: null,
          prompt: null,
          endLine: null,
          indent: 0,
          processing: false,
          abortController: null,
        }
      }
    }

    // If document changed, re-parse
    if (tr.docChanged) {
      const newState = parseDraftBlock(tr.newDoc)
      // Preserve processing state and abortController if still active
      if (newState.active && current.processing) {
        return {
          ...newState,
          processing: current.processing,
          abortController: current.abortController,
        }
      }
      return newState
    }

    return current
  },
})

// ===========================================
// Decorations
// ===========================================

const draftMarkerDecoration = Decoration.line({
  class: 'cm-draft-marker-line',
})

const draftProcessingDecoration = Decoration.line({
  class: 'cm-draft-processing',
})

// ===========================================
// View Plugin
// ===========================================

/**
 * ViewPlugin that syncs draft mode state with visual decorations
 * Uses the existing draft-lines system for muted colors
 */
export const draftModeViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
      this.syncDraftLines(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
        this.syncDraftLines(update.view)
      }

      // Check for state field changes
      const newState = update.state.field(draftModeField)
      const oldState = update.startState.field(draftModeField)
      if (newState !== oldState) {
        this.decorations = this.buildDecorations(update.view)
        this.syncDraftLines(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const state = view.state.field(draftModeField)
      if (!state.active || state.startLine === null) {
        return Decoration.none
      }

      const decorations: { from: number; to: number; value: Decoration }[] = []

      // Add marker decoration for the -- line
      try {
        const startLine = view.state.doc.line(state.startLine)
        const decoration = state.processing ? draftProcessingDecoration : draftMarkerDecoration
        decorations.push({ from: startLine.from, to: startLine.from, value: decoration })
      } catch {
        // Line doesn't exist
      }

      // Add marker decoration for the end -- line if closed
      if (state.endLine !== null) {
        try {
          const endLine = view.state.doc.line(state.endLine)
          decorations.push({ from: endLine.from, to: endLine.from, value: draftMarkerDecoration })
        } catch {
          // Line doesn't exist
        }
      }

      return Decoration.set(decorations.map(d => d.value.range(d.from)))
    }

    syncDraftLines(view: EditorView) {
      const state = view.state.field(draftModeField)
      if (!state.active || state.startLine === null) {
        clearDraftLines(view)
        return
      }

      const draftLineNumbers = getDraftLineNumbers(state, view.state.doc.lines)
      setDraftLines(view, draftLineNumbers)
    }
  },
  {
    decorations: v => v.decorations,
  }
)

// ===========================================
// CSS Theme
// ===========================================

const draftModeTheme = EditorView.baseTheme({
  // Styling for the -- marker line
  '.cm-draft-marker-line': {
    borderLeft: '2px solid #2271C1',
    paddingLeft: '4px',
  },

  // Pulsing animation while AI is processing
  '.cm-draft-processing': {
    borderLeft: '2px solid #2271C1',
    paddingLeft: '4px',
    animation: 'draftPulse 1.5s ease-in-out infinite',
  },

  '@keyframes draftPulse': {
    '0%, 100%': { borderLeftColor: 'rgba(34, 113, 193, 0.4)' },
    '50%': { borderLeftColor: 'rgba(34, 113, 193, 1)' },
  },
})

// ===========================================
// Extension
// ===========================================

/**
 * CodeMirror extension for draft mode.
 * Add this to your EditorView extensions array.
 */
export function draftModeExtension() {
  return [draftModeField, draftModeViewPlugin, draftModeTheme]
}

// ===========================================
// API Functions
// ===========================================

/**
 * Check if the editor is currently in draft mode
 */
export function isDraftModeActive(view: EditorView): boolean {
  return view.state.field(draftModeField).active
}

/**
 * Get the current draft block state
 */
export function getDraftState(view: EditorView): DraftBlockState {
  return view.state.field(draftModeField)
}

/**
 * Check if a specific line is within a draft block
 */
export function isLineInDraftBlock(view: EditorView, lineNumber: number): boolean {
  const state = view.state.field(draftModeField)
  if (!state.active || state.startLine === null) {
    return false
  }

  const end = state.endLine ?? view.state.doc.lines
  return lineNumber >= state.startLine && lineNumber <= end
}

/**
 * Set the processing state for the draft block
 */
export function setDraftProcessing(
  view: EditorView,
  processing: boolean,
  abortController?: AbortController
): void {
  view.dispatch({
    effects: [
      setDraftProcessingEffect.of(processing),
      ...(abortController ? [updateDraftStateEffect.of({ abortController })] : []),
    ],
  })
}

/**
 * Clear the draft block (removes -- markers and content)
 */
export function clearDraftBlock(view: EditorView): void {
  const state = view.state.field(draftModeField)
  if (!state.active || state.startLine === null) {
    return
  }

  // Remove the draft block lines from the document
  const startLineInfo = view.state.doc.line(state.startLine)
  const endLineNum = state.endLine ?? view.state.doc.lines
  const endLineInfo = view.state.doc.line(endLineNum)

  view.dispatch({
    changes: { from: startLineInfo.from, to: endLineInfo.to },
    effects: clearDraftBlockEffect.of(undefined),
  })
}

/**
 * Replace the draft block with new content (after AI correction)
 */
export function replaceDraftBlock(view: EditorView, newContent: string): void {
  const state = view.state.field(draftModeField)
  if (!state.active || state.startLine === null) {
    log.warn('replaceDraftBlock called but no active draft block')
    return
  }

  // Calculate replacement range
  const startLineInfo = view.state.doc.line(state.startLine)
  const endLineNum = state.endLine ?? view.state.doc.lines
  const endLineInfo = view.state.doc.line(endLineNum)

  // Build the replacement content with proper indentation
  const baseIndent = ' '.repeat(state.indent)
  const indentedContent = newContent
    .split('\n')
    .map(line => (line.trim() ? baseIndent + line : line))
    .join('\n')

  view.dispatch({
    changes: { from: startLineInfo.from, to: endLineInfo.to, insert: indentedContent },
    effects: clearDraftBlockEffect.of(undefined),
  })
}

/**
 * Prepare a draft submit event for AI processing
 */
export function prepareDraftSubmit(view: EditorView): DraftSubmitEvent | null {
  const state = view.state.field(draftModeField)
  if (!state.active || state.startLine === null) {
    return null
  }

  const abortController = new AbortController()
  const content = extractDraftContent(view.state.doc, state)

  return {
    prompt: state.prompt,
    startLine: state.startLine,
    endLine: state.endLine ?? view.state.doc.lines,
    indent: state.indent,
    content,
    fullSource: view.state.doc.toString(),
    abortController,
  }
}

/**
 * Cancel the current AI processing
 */
export function cancelDraftProcessing(view: EditorView): void {
  const state = view.state.field(draftModeField)
  if (state.processing && state.abortController) {
    state.abortController.abort()
    view.dispatch({
      effects: setDraftProcessingEffect.of(false),
    })
    log.info('Draft processing cancelled')
  }
}
