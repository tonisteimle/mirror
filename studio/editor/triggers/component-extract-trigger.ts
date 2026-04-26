/**
 * Component Extract Trigger
 *
 * When typing `::` after a component name, extracts the entire component
 * definition (properties + children) to a .com file and replaces the
 * current code with just the instance name.
 *
 * Example (new component):
 *   Card:: pad 16, bg #333
 *     Text "Hello"
 *     Button "OK"
 *
 * Becomes in editor:
 *   Card
 *     Text "Hello"
 *     Button "OK"
 *
 * And in components.com:
 *   Card: pad 16, bg #333
 *
 * Example (existing component - smart diffing):
 *   If Card already exists with: pad 16, bg #333
 *   And you type: Card:: pad 16, bg #333, rad 8
 *
 *   Result: Card rad 8
 *   (Only the different property 'rad 8' is kept as override)
 */

import { EditorView, ViewUpdate } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { createLogger } from '../../../compiler/utils/logger'
import { findProjectMatches, findNearMatches } from '../extract/pattern-match'
import { applyBatchReplace, applyNearMatchReplace } from '../extract/apply-batch-replace'
import { showBatchReplaceDialog } from '../extract/batch-replace-dialog'

const log = createLogger('ComponentExtract')

export const COMPONENT_EXTRACT_TRIGGER_ID = 'component-extract'

// Pattern to detect Name:: (PascalCase name followed by ::)
// Matches the full "Name::" at the end of text
const EXTRACT_PATTERN = /([A-Z][a-zA-Z0-9]*)::$/

/**
 * Split a property list string into comma-separated segments, respecting
 * quoted strings.
 */
function splitOnComma(s: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  for (const char of s) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
      current += char
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false
      quoteChar = ''
      current += char
    } else if (char === ',' && !inQuotes) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/**
 * Classify a single trimmed property segment into:
 *   - 'content' — bare quoted string with no preceding property name
 *     (e.g. `"Drück mich"`). Stays at the instance.
 *   - 'property' — anything else, including positional bare values
 *     (e.g. `#333`, `100`) and named properties (`pad 12`, `bg #333`).
 *     Goes to the component definition.
 *
 * Returns the segment's "key" for merge purposes: the property name if
 * named, or null if bare/positional (no merge possible — appended).
 */
type ClassifiedSegment =
  | { kind: 'content'; full: string }
  | { kind: 'property'; key: string | null; full: string }

function classifySegment(s: string): ClassifiedSegment {
  // Bare quoted string (with optional surrounding spaces): it's content.
  if (/^"[^"]*"$/.test(s) || /^'[^']*'$/.test(s)) {
    return { kind: 'content', full: s }
  }
  // Property: starts with an alpha identifier → that's the name.
  // Otherwise it's a positional bare value (no name to merge by).
  const named = s.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\b/)
  return { kind: 'property', key: named ? named[1] : null, full: s }
}

/**
 * Parse a property list into classified segments. Used for both the new
 * properties typed after `::` and the existing definition's properties.
 */
export function parseSegments(propsString: string): ClassifiedSegment[] {
  if (!propsString.trim()) return []
  return splitOnComma(propsString).map(classifySegment)
}

/**
 * Per-property merge: take an existing property list and apply updates
 * from new segments. Rules:
 *   - Named properties with matching key replace the existing one.
 *   - Named properties with new keys are appended.
 *   - Positional bare properties (no key) are always appended.
 *   - Content segments are dropped (they go to the instance, not the
 *     definition).
 */
export function mergeProperties(
  existing: ClassifiedSegment[],
  updates: ClassifiedSegment[]
): string {
  const result: ClassifiedSegment[] = [...existing]
  const updateProps = updates.filter(s => s.kind === 'property') as Extract<
    ClassifiedSegment,
    { kind: 'property' }
  >[]

  for (const upd of updateProps) {
    if (upd.key) {
      const existingIdx = result.findIndex(s => s.kind === 'property' && s.key === upd.key)
      if (existingIdx >= 0) {
        result[existingIdx] = upd
      } else {
        result.push(upd)
      }
    } else {
      result.push(upd)
    }
  }

  return result.map(s => s.full).join(', ')
}

/**
 * Extract the existing definition body for a component from .com content.
 * Returns the property list (without the `Name: ` prefix) or null if not found.
 */
export function getExistingDefinitionBody(
  comContent: string,
  componentName: string
): string | null {
  // Use [ \t] for inline whitespace so we don't accidentally consume the
  // line break and pick up a slot from the next line (e.g. `Card:\n  Title:`
  // would otherwise return `Title: ...` instead of `''`).
  const pattern = new RegExp(`^${componentName}[ \\t]*:[ \\t]*(.*)$`, 'm')
  const match = comContent.match(pattern)
  return match ? match[1] : null
}

/**
 * Replace the existing `ComponentName: ...` line in .com with a new
 * definition line. Preserves any leading whitespace on that line.
 */
export function replaceDefinitionLine(
  comContent: string,
  componentName: string,
  newBody: string
): string {
  // Match only on the same line (use [ \t] not \s — see getExistingDefinitionBody).
  const pattern = new RegExp(`^([ \\t]*)${componentName}[ \\t]*:[ \\t]*.*$`, 'm')
  return comContent.replace(pattern, `$1${componentName}: ${newBody}`)
}

interface ComponentExtractCallbacks {
  /** Get all project files */
  getFiles: () => { name: string; type: string; code: string }[]
  /** Update a file's content */
  updateFile: (filename: string, content: string) => void
  /** Get current file name */
  getCurrentFile: () => string
}

let callbacks: ComponentExtractCallbacks | null = null

/**
 * Find or create a components file
 */
function getComponentsFile(files: { name: string; type: string; code: string }[]): {
  filename: string
  content: string
  exists: boolean
} {
  // Look for existing .com file
  const comFile = files.find(f => f.name.endsWith('.com') || f.name.endsWith('.components'))

  if (comFile) {
    return { filename: comFile.name, content: comFile.code, exists: true }
  }

  // Create new components.com
  return { filename: 'components.com', content: '', exists: false }
}

/**
 * Add component definition to the components file
 */
function addToComponentsFile(currentContent: string, definition: string): string {
  const trimmedContent = currentContent.trim()

  if (!trimmedContent) {
    return definition + '\n'
  }

  // Add with blank line separator
  return trimmedContent + '\n\n' + definition + '\n'
}

// =====================================================================
// Pure-function core: takes the source + .com content + line number,
// returns the new editor text and the new .com content (no EditorView).
// performExtraction is a thin wrapper that calls this and dispatches.
// =====================================================================

export interface ExtractionInput {
  /** Source text that contains the `Name::` line. */
  source: string
  /** 1-based line number of the line containing `Name::`. */
  lineNumber: number
  /** Detected component name from `Name::` pattern. */
  componentName: string
  /** Existing .com content (empty if no .com file yet). */
  comContent: string
}

export type ExtractionAction =
  /** No properties after `::` — just strip the second `:`. */
  | { kind: 'strip-colon'; componentName: string }
  /** Full extract: replace lines + write/update .com. */
  | {
      kind: 'extract'
      /** Inclusive 1-based line range to replace in the editor. */
      startLine: number
      endLine: number
      /** Replacement text (instance line + children). */
      replacement: string
      /** New .com content with the merged or fresh definition. */
      newComContent: string
      /** Cursor position after the component name on the instance line. */
      cursorOffsetInReplacement: number
    }

/**
 * Pure orchestrator for component extraction. No EditorView required —
 * everything is computed from the source text. This is the unit-testable
 * core of `performExtraction`.
 */
export function computeExtraction(input: ExtractionInput): ExtractionAction | null {
  const { source, lineNumber, componentName, comContent } = input

  const lines = source.split('\n')
  if (lineNumber < 1 || lineNumber > lines.length) return null
  const lineText = lines[lineNumber - 1]

  const colonIndex = lineText.lastIndexOf('::')
  if (colonIndex === -1) return null

  const propertiesAfterColons = lineText.slice(colonIndex + 2)

  // No properties after :: — strip the second `:` and keep the name.
  if (!propertiesAfterColons.trim()) {
    return { kind: 'strip-colon', componentName }
  }

  const newSegments = parseSegments(propertiesAfterColons)
  const newProps = newSegments.filter(s => s.kind === 'property')
  const contentSegments = newSegments.filter(s => s.kind === 'content')

  // Build new .com content via merge or fresh.
  const existingBody = getExistingDefinitionBody(comContent, componentName)
  let newComContent: string
  if (existingBody !== null) {
    const existingSegments = parseSegments(existingBody)
    const mergedBody = mergeProperties(existingSegments, newProps)
    newComContent = replaceDefinitionLine(comContent, componentName, mergedBody)
  } else {
    const freshBody = newProps.map(s => s.full).join(', ')
    newComContent = addToComponentsFile(comContent, `${componentName}: ${freshBody}`)
  }

  // Build the instance line.
  const indent = (lineText.match(/^(\s*)/) || ['', ''])[1]
  let instanceLine = indent + componentName
  if (contentSegments.length > 0) {
    instanceLine += ' ' + contentSegments.map(s => s.full).join(', ')
  }

  // Collect children (lines below with deeper indent) — text-level.
  const baseIndent = indent.length
  const childTexts: string[] = []
  let endLine = lineNumber
  for (let i = lineNumber; i < lines.length; i++) {
    const next = lines[i]
    if (next.trim() === '') {
      // Look ahead for more children
      let hasMore = false
      for (let j = i + 1; j < lines.length; j++) {
        const further = lines[j]
        if (further.trim() === '') continue
        const furtherIndent = (further.match(/^(\s*)/) || ['', ''])[1].length
        if (furtherIndent > baseIndent) hasMore = true
        break
      }
      if (hasMore) {
        childTexts.push('')
        endLine = i + 1
        continue
      }
      break
    }
    const ci = (next.match(/^(\s*)/) || ['', ''])[1].length
    if (ci <= baseIndent) break
    const relIndent = ci - baseIndent
    const relSpaces = '  '.repeat(Math.ceil(relIndent / 2))
    childTexts.push(relSpaces + next.trim())
    endLine = i + 1
  }

  let replacement = instanceLine
  if (childTexts.length > 0) {
    replacement += '\n' + childTexts.map(c => indent + c).join('\n')
  }

  return {
    kind: 'extract',
    startLine: lineNumber,
    endLine,
    replacement,
    newComContent,
    cursorOffsetInReplacement: indent.length + componentName.length,
  }
}

/**
 * Perform the component extraction.
 *
 * Behavior:
 *   1. Split everything after `::` into property-segments and
 *      content-segments. Bare quoted strings (without a preceding
 *      property name) are content; everything else is properties.
 *   2. Properties go to the .com definition. If the component already
 *      exists, MERGE: same-named properties replace, new ones append,
 *      properties only in the existing definition stay.
 *   3. Content stays at the instance line: `Name "Drück mich"`.
 *   4. Children (lines below with deeper indent) always stay at the
 *      instance — unchanged.
 */
function performExtraction(view: EditorView, componentName: string, lineNumber: number): void {
  if (!callbacks) {
    log.error('No callbacks configured')
    return
  }

  const doc = view.state.doc
  const source = doc.toString()

  const files = callbacks.getFiles()
  const { filename: comFilename, content: comContent } = getComponentsFile(files)

  const action = computeExtraction({ source, lineNumber, componentName, comContent })
  if (!action) {
    log.error('computeExtraction returned null — could not find :: line')
    return
  }

  if (action.kind === 'strip-colon') {
    // Just remove the second `:` from the line.
    const line = doc.line(lineNumber)
    const colonIndex = line.text.lastIndexOf('::')
    if (colonIndex === -1) return
    const start = line.from + colonIndex
    view.dispatch({
      changes: { from: start, to: start + 2, insert: '' },
      selection: { anchor: start },
      annotations: Transaction.userEvent.of('input.extract'),
    })
    log.info(`Removed :: from ${componentName} (no properties to extract)`)
    return
  }

  const startLineObj = doc.line(action.startLine)
  const endLineObj = doc.line(action.endLine)
  view.dispatch({
    changes: {
      from: startLineObj.from,
      to: endLineObj.to,
      insert: action.replacement,
    },
    selection: {
      anchor: startLineObj.from + action.cursorOffsetInReplacement,
    },
    annotations: Transaction.userEvent.of('input.extract'),
  })

  // Update components file AFTER the editor change has been applied.
  // The order matters: see comment in computeExtraction's call site.
  callbacks.updateFile(comFilename, action.newComContent)
  log.info(`Updated ${componentName} in ${comFilename}`)

  // Project-scan for batch-replace candidates: other lines styled the
  // same way that should also become this component. The reference
  // is synthesized from `<element-placeholder> + propertiesAfterColons`,
  // because propertiesMatch ignores element name.
  const lineText = doc.line(lineNumber).text
  const colonIndex = lineText.lastIndexOf('::')
  if (colonIndex === -1) return
  const propertiesAfterColons = lineText.slice(colonIndex + 2).trim()
  if (!propertiesAfterColons) return

  const targetReferenceLine = `Frame ${propertiesAfterColons}`
  const currentFilename = callbacks.getCurrentFile()

  // Build the file list using the AT-EDIT in-memory state for the
  // current file (the editor has unsaved changes), and the on-disk
  // version for all others.
  const projectFiles = files.map(f => ({
    filename: f.name,
    source: f.name === currentFilename ? doc.toString() : f.code,
  }))

  const exactMatches = findProjectMatches({
    targetReferenceLine,
    files: projectFiles,
    targetFilename: currentFilename,
    targetLineNumber: lineNumber,
    componentName,
  })

  const nearMatches = findNearMatches({
    targetReferenceLine,
    files: projectFiles,
    targetFilename: currentFilename,
    targetLineNumber: lineNumber,
    componentName,
  })

  if (exactMatches.length === 0 && nearMatches.length === 0) return

  // Capture callbacks in a non-null local for the deferred onApply callback.
  const cb = callbacks
  showBatchReplaceDialog({
    componentName,
    matches: exactMatches,
    nearMatches,
    onApply: ({ exact, near }) => {
      if (exact.length === 0 && near.length === 0) return

      // Apply both replace types and merge into one changedFiles map.
      const merged = new Map<string, string>()
      let runningFiles = projectFiles

      if (exact.length > 0) {
        const r = applyBatchReplace({
          files: runningFiles,
          acceptedMatches: exact,
          componentName,
        })
        for (const [f, s] of r.changedFiles) merged.set(f, s)
        // Update running view of files so near-match step sees the
        // exact-match changes.
        runningFiles = runningFiles.map(f =>
          merged.has(f.filename) ? { filename: f.filename, source: merged.get(f.filename)! } : f
        )
      }
      if (near.length > 0) {
        const r = applyNearMatchReplace({
          files: runningFiles,
          acceptedMatches: near,
          componentName,
        })
        for (const [f, s] of r.changedFiles) merged.set(f, s)
      }

      for (const [filename, newSource] of merged) {
        if (filename === currentFilename) {
          const fullDoc = view.state.doc
          view.dispatch({
            changes: { from: 0, to: fullDoc.length, insert: newSource },
            annotations: Transaction.userEvent.of('input.extract.batch'),
          })
        } else {
          cb.updateFile(filename, newSource)
        }
      }
      log.info(
        `Batch-replaced ${exact.length} exact + ${near.length} near match(es) across ${merged.size} file(s)`
      )
    },
  })
}

/**
 * Create a CodeMirror extension that listens for :: and triggers extraction
 */
export function createComponentExtractExtension(config: ComponentExtractCallbacks): Extension {
  callbacks = config

  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.docChanged) return

    // Check each change for :: pattern
    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const insertedText = inserted.toString()

      // Only trigger on single ':' insertion
      if (insertedText !== ':') return

      const view = update.view
      const line = view.state.doc.lineAt(toB)
      const textUpToCursor = line.text.slice(0, toB - line.from)

      // Check if we have Name:: pattern (the second : was just inserted)
      const match = textUpToCursor.match(EXTRACT_PATTERN)
      if (!match) return

      const componentName = match[1]
      log.info(`Detected :: after component: ${componentName}`)

      // Perform extraction after a short delay to let the document update settle
      setTimeout(() => {
        performExtraction(view, componentName, line.number)
      }, 10)
    })
  })
}

/**
 * Register the component extract extension
 * This function is kept for API compatibility but now returns an extension
 * that should be added to the editor
 */
export function registerComponentExtractTrigger(config: ComponentExtractCallbacks): Extension {
  return createComponentExtractExtension(config)
}

/**
 * Unregister (cleanup) - resets callbacks
 */
export function unregisterComponentExtractTrigger(): void {
  callbacks = null
}

// Legacy exports for compatibility with trigger system
export function createComponentExtractTriggerConfig(config: ComponentExtractCallbacks): any {
  // Not used anymore, but kept for API compatibility
  callbacks = config
  return null
}
