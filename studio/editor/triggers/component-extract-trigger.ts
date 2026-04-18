/**
 * Component Extract Trigger
 *
 * When typing `::` after a component name, extracts the entire component
 * definition (properties + children) to a .com file and replaces the
 * current code with just the instance name.
 *
 * Example:
 *   Card:: pad 16, bg #333
 *     Text "Hello"
 *     Button "OK"
 *
 * Becomes in editor:
 *   Card
 *
 * And in components.com:
 *   Card: pad 16, bg #333
 *     Text "Hello"
 *     Button "OK"
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
 * Extract the component definition from the current line and children
 */
function extractComponentDefinition(
  view: EditorView,
  lineNumber: number,
  componentName: string,
  propertiesAfterColons: string
): { definition: string; endLine: number } {
  const doc = view.state.doc
  const baseLine = doc.line(lineNumber)

  // Calculate base indentation of the component line
  const baseIndentMatch = baseLine.text.match(/^(\s*)/)
  const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0

  // Start building the definition
  // Format: Name: properties
  let definition = `${componentName}: ${propertiesAfterColons.trim()}`

  // Find all children (lines with greater indentation)
  let endLine = lineNumber
  const totalLines = doc.lines

  for (let i = lineNumber + 1; i <= totalLines; i++) {
    const line = doc.line(i)
    const lineText = line.text

    // Empty lines are included if followed by more children
    if (lineText.trim() === '') {
      // Look ahead to see if there are more children
      let hasMoreChildren = false
      for (let j = i + 1; j <= totalLines; j++) {
        const nextLine = doc.line(j)
        const nextText = nextLine.text
        if (nextText.trim() === '') continue

        const nextIndentMatch = nextText.match(/^(\s*)/)
        const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0

        if (nextIndent > baseIndent) {
          hasMoreChildren = true
        }
        break
      }

      if (hasMoreChildren) {
        definition += '\n'
        endLine = i
        continue
      } else {
        break
      }
    }

    // Check indentation
    const indentMatch = lineText.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0

    // If same or less indentation, we're done with children
    if (indent <= baseIndent) {
      break
    }

    // Add child line (preserve relative indentation)
    // Convert absolute indent to relative (2 spaces per level from base)
    const relativeIndent = indent - baseIndent
    const relativeSpaces = '  '.repeat(Math.ceil(relativeIndent / 2))
    definition += '\n' + relativeSpaces + lineText.trim()
    endLine = i
  }

  return { definition, endLine }
}

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
 * Perform the component extraction
 */
function performExtraction(view: EditorView, componentName: string, lineNumber: number): void {
  if (!callbacks) {
    log.error('No callbacks configured')
    return
  }

  const doc = view.state.doc
  const line = doc.line(lineNumber)
  const lineText = line.text

  // Find the :: position
  const colonIndex = lineText.lastIndexOf('::')
  if (colonIndex === -1) {
    log.error('Could not find :: in line')
    return
  }

  const propertiesAfterColons = lineText.slice(colonIndex + 2)

  // If no properties after ::, just replace :: with nothing (convert to instance)
  if (!propertiesAfterColons.trim()) {
    // Just remove the :: and keep the name
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

  // Extract full component definition (including children)
  const { definition, endLine } = extractComponentDefinition(
    view,
    lineNumber,
    componentName,
    propertiesAfterColons
  )

  log.info(`Extracted definition:\n${definition}`)

  // Get files and find/create components file
  const files = callbacks.getFiles()
  const { filename: comFilename, content: comContent } = getComponentsFile(files)

  // Check if component already exists
  const existingPattern = new RegExp(`^${componentName}\\s*:`, 'm')
  if (existingPattern.test(comContent)) {
    log.warn(`Component ${componentName} already exists in ${comFilename}`)
    // Just remove the :: to convert to instance usage
    const doubleColonStart = line.from + colonIndex
    view.dispatch({
      changes: { from: doubleColonStart, to: line.to, insert: '' },
      selection: { anchor: doubleColonStart },
      annotations: Transaction.userEvent.of('input.extract'),
    })
    return
  }

  // Add to components file
  const newComContent = addToComponentsFile(comContent, definition)

  // Update components file
  callbacks.updateFile(comFilename, newComContent)
  log.info(`Added ${componentName} to ${comFilename}`)

  // Calculate what to remove from current file
  const baseLine = doc.line(lineNumber)
  const endLineObj = doc.line(endLine)

  // Find start of component name on the line
  const nameMatch = baseLine.text.match(new RegExp(`(\\s*)${componentName}::`))
  const indent = nameMatch ? nameMatch[1] : ''

  // Replace entire component block with just the instance name
  const removeFrom = baseLine.from
  const removeTo = endLineObj.to
  const replacement = indent + componentName

  view.dispatch({
    changes: { from: removeFrom, to: removeTo, insert: replacement },
    selection: { anchor: removeFrom + replacement.length },
    annotations: Transaction.userEvent.of('input.extract'),
  })

  log.info(`Replaced code with instance: ${componentName}`)
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
