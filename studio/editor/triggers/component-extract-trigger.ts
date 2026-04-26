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
  const pattern = new RegExp(`^${componentName}\\s*:\\s*(.*)$`, 'm')
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
  const pattern = new RegExp(`^(\\s*)${componentName}\\s*:\\s*.*$`, 'm')
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

/**
 * Collect children of the component line (lines below with greater
 * indentation). Returns the children as already-trimmed lines (with
 * their relative indentation preserved as 2-space-per-level), plus the
 * last line number that belongs to the children block.
 */
function collectChildren(
  view: EditorView,
  lineNumber: number,
  baseIndent: number
): { children: string[]; endLine: number } {
  const doc = view.state.doc
  const totalLines = doc.lines
  const children: string[] = []
  let endLine = lineNumber

  for (let i = lineNumber + 1; i <= totalLines; i++) {
    const childLine = doc.line(i)
    const childText = childLine.text

    if (childText.trim() === '') {
      let hasMore = false
      for (let j = i + 1; j <= totalLines; j++) {
        const nextLine = doc.line(j)
        if (nextLine.text.trim() === '') continue
        const nextIndent = (nextLine.text.match(/^(\s*)/) || ['', ''])[1].length
        if (nextIndent > baseIndent) hasMore = true
        break
      }
      if (hasMore) {
        children.push('')
        endLine = i
        continue
      }
      break
    }

    const childIndent = (childText.match(/^(\s*)/) || ['', ''])[1].length
    if (childIndent <= baseIndent) break

    const relativeIndent = childIndent - baseIndent
    const relativeSpaces = '  '.repeat(Math.ceil(relativeIndent / 2))
    children.push(relativeSpaces + childText.trim())
    endLine = i
  }
  return { children, endLine }
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
  const line = doc.line(lineNumber)
  const lineText = line.text

  const colonIndex = lineText.lastIndexOf('::')
  if (colonIndex === -1) {
    log.error('Could not find :: in line')
    return
  }

  const propertiesAfterColons = lineText.slice(colonIndex + 2)

  // No properties after :: — just remove the :: and convert to instance.
  if (!propertiesAfterColons.trim()) {
    const doubleColonStart = line.from + colonIndex
    const doubleColonEnd = line.from + colonIndex + 2
    view.dispatch({
      changes: { from: doubleColonStart, to: doubleColonEnd, insert: '' },
      selection: { anchor: doubleColonStart },
      annotations: Transaction.userEvent.of('input.extract'),
    })
    log.info(`Removed :: from ${componentName} (no properties to extract)`)
    return
  }

  // Split into property + content segments.
  const newSegments = parseSegments(propertiesAfterColons)
  const newProps = newSegments.filter(s => s.kind === 'property')
  const contentSegments = newSegments.filter(s => s.kind === 'content')

  log.info(
    `Parsed ${newProps.length} property segment(s) + ${contentSegments.length} content string(s)`
  )

  // Get files and find/create components file.
  const files = callbacks.getFiles()
  const { filename: comFilename, content: comContent } = getComponentsFile(files)

  // Build new definition body via merge (or fresh) and update .com.
  const existingBody = getExistingDefinitionBody(comContent, componentName)
  let newComContent: string
  if (existingBody !== null) {
    const existingSegments = parseSegments(existingBody)
    const mergedBody = mergeProperties(existingSegments, newProps)
    newComContent = replaceDefinitionLine(comContent, componentName, mergedBody)
    log.info(`Merged into existing ${componentName}: → ${mergedBody}`)
  } else {
    const freshBody = newProps.map(s => s.full).join(', ')
    const newDefinition = `${componentName}: ${freshBody}`
    newComContent = addToComponentsFile(comContent, newDefinition)
    log.info(`Created new ${componentName}: ${freshBody}`)
  }

  // Build the instance line: indent + name + (content strings) + children.
  const baseLine = doc.line(lineNumber)
  const nameMatch = baseLine.text.match(new RegExp(`(\\s*)${componentName}::`))
  const indent = nameMatch ? nameMatch[1] : ''

  let instanceLine = indent + componentName
  if (contentSegments.length > 0) {
    instanceLine += ' ' + contentSegments.map(s => s.full).join(', ')
  }

  // Children stay below the instance, unchanged in their relative indent.
  const baseIndentMatch = baseLine.text.match(/^(\s*)/)
  const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0
  const { children, endLine: childEndLine } = collectChildren(view, lineNumber, baseIndent)

  let replacement = instanceLine
  if (children.length > 0) {
    replacement += '\n' + children.map(c => indent + c).join('\n')
  }

  // Order matters: dispatch the editor change FIRST (while the editor
  // still hosts the file the user typed `::` in), THEN updateFile. The
  // `file:created` event from updateFile auto-selects the new
  // components file; doing it the other way makes view.dispatch land
  // on the wrong editor.
  const endLineObj = doc.line(childEndLine)
  view.dispatch({
    changes: { from: baseLine.from, to: endLineObj.to, insert: replacement },
    selection: { anchor: baseLine.from + indent.length + componentName.length },
    annotations: Transaction.userEvent.of('input.extract'),
  })

  // Update components file AFTER the editor change has been applied.
  callbacks.updateFile(comFilename, newComContent)
  log.info(`Added ${componentName} to ${comFilename}`)

  log.info(`Created component ${componentName}, kept ${children.length} children in editor`)
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
