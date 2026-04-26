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
 * Parse properties from a property string like "pad 16, bg #333, rad 8"
 * Returns a Map of property name -> full property string (e.g., "pad" -> "pad 16")
 */
function parseProperties(propsString: string): Map<string, string> {
  const props = new Map<string, string>()
  if (!propsString.trim()) return props

  // Split by comma, handling potential quoted strings
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (const char of propsString) {
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

  // Parse each property
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Extract property name (first word)
    const spaceIndex = trimmed.indexOf(' ')
    const propName = spaceIndex > 0 ? trimmed.slice(0, spaceIndex) : trimmed

    // Store full property string
    props.set(propName, trimmed)
  }

  return props
}

/**
 * Extract component definition properties from .com file content
 */
function getComponentDefinitionProps(
  comContent: string,
  componentName: string
): Map<string, string> | null {
  // Find the component definition line
  const pattern = new RegExp(`^${componentName}\\s*:\\s*(.*)$`, 'm')
  const match = comContent.match(pattern)

  if (!match) return null

  return parseProperties(match[1])
}

/**
 * Diff properties: return only properties that are different from the component definition
 */
function diffProperties(
  instanceProps: Map<string, string>,
  componentProps: Map<string, string>
): string[] {
  const overrides: string[] = []

  for (const [propName, propValue] of instanceProps) {
    const componentValue = componentProps.get(propName)

    // Keep if: not in component, or different value
    if (!componentValue || componentValue !== propValue) {
      overrides.push(propValue)
    }
  }

  return overrides
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
    log.info(`Component ${componentName} already exists - performing smart diff`)

    // Get component definition properties
    const componentProps = getComponentDefinitionProps(comContent, componentName)
    if (!componentProps) {
      log.error(`Could not parse component ${componentName} from ${comFilename}`)
      return
    }

    // Get instance properties
    const instanceProps = parseProperties(propertiesAfterColons)

    // Diff: find properties that are different or new
    const overrides = diffProperties(instanceProps, componentProps)

    log.info(`Component props: ${[...componentProps.values()].join(', ')}`)
    log.info(`Instance props: ${[...instanceProps.values()].join(', ')}`)
    log.info(`Overrides: ${overrides.join(', ') || '(none)'}`)

    // Build replacement: ComponentName [overrides]
    const baseLine = doc.line(lineNumber)
    const nameMatch = baseLine.text.match(new RegExp(`(\\s*)${componentName}::`))
    const indent = nameMatch ? nameMatch[1] : ''

    // Find children (lines with greater indentation)
    let endLine = lineNumber
    const baseIndentMatch = baseLine.text.match(/^(\s*)/)
    const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0
    const totalLines = doc.lines

    // Collect children
    const children: string[] = []
    for (let i = lineNumber + 1; i <= totalLines; i++) {
      const childLine = doc.line(i)
      const childText = childLine.text

      if (childText.trim() === '') {
        // Check if there are more children after empty line
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

      // Preserve relative indentation
      const relativeIndent = childIndent - baseIndent
      const relativeSpaces = '  '.repeat(Math.ceil(relativeIndent / 2))
      children.push(relativeSpaces + childText.trim())
      endLine = i
    }

    // Build replacement string
    let replacement = indent + componentName
    if (overrides.length > 0) {
      replacement += ' ' + overrides.join(', ')
    }

    // Add children if any
    if (children.length > 0) {
      replacement += '\n' + children.map(c => indent + c).join('\n')
    }

    const endLineObj = doc.line(endLine)
    view.dispatch({
      changes: { from: baseLine.from, to: endLineObj.to, insert: replacement },
      selection: { anchor: baseLine.from + replacement.length },
      annotations: Transaction.userEvent.of('input.extract'),
    })

    log.info(`Converted to instance with ${overrides.length} override(s)`)
    return
  }

  // Create component definition with ONLY properties (not children)
  const propsOnlyDefinition = `${componentName}: ${propertiesAfterColons.trim()}`

  // Add to components file
  const newComContent = addToComponentsFile(comContent, propsOnlyDefinition)

  // Calculate what to replace in current file
  const baseLine = doc.line(lineNumber)

  // Find start of component name on the line
  const nameMatch = baseLine.text.match(new RegExp(`(\\s*)${componentName}::`))
  const indent = nameMatch ? nameMatch[1] : ''

  // Collect children (keep them in the editor!)
  const baseIndentMatch = baseLine.text.match(/^(\s*)/)
  const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0
  const totalLines = doc.lines

  const children: string[] = []
  let childEndLine = lineNumber

  for (let i = lineNumber + 1; i <= totalLines; i++) {
    const childLine = doc.line(i)
    const childText = childLine.text

    if (childText.trim() === '') {
      // Check if more children after empty line
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
        childEndLine = i
        continue
      }
      break
    }

    const childIndent = (childText.match(/^(\s*)/) || ['', ''])[1].length
    if (childIndent <= baseIndent) break

    // Preserve relative indentation
    const relativeIndent = childIndent - baseIndent
    const relativeSpaces = '  '.repeat(Math.ceil(relativeIndent / 2))
    children.push(relativeSpaces + childText.trim())
    childEndLine = i
  }

  // Build replacement: instance name + children
  let replacement = indent + componentName
  if (children.length > 0) {
    replacement += '\n' + children.map(c => indent + c).join('\n')
  }

  // ORDER MATTERS: dispatch the editor change FIRST (while the editor
  // still hosts the file the user typed `::` in), THEN createFile via
  // updateFile. The `file:created` event from updateFile auto-selects
  // the new components file (see studio/desktop-files.js); doing it the
  // other way around makes our `view.dispatch` land on the wrong
  // editor — overwriting the freshly-created definition with the
  // instance-replacement.
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
