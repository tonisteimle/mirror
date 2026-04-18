/**
 * Token Extract Trigger
 *
 * When typing `::` after a token name in a property context, extracts the
 * value to a .tok file and replaces the inline definition with the token reference.
 *
 * Example:
 *   bg default::#333
 *
 * Becomes in editor:
 *   bg $default
 *
 * And in tokens.tok:
 *   default.bg: #333
 */

import { EditorView, ViewUpdate } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('TokenExtract')

export const TOKEN_EXTRACT_TRIGGER_ID = 'token-extract'

// Pattern to detect property tokenName::value
// Matches: propertyName tokenName::value (tokenName is lowercase starting)
// The :: was just typed, so we look for: property name::
const EXTRACT_PATTERN = /\b([a-z][a-zA-Z0-9-]*)\s+([a-z][a-zA-Z0-9]*)::$/

// Property aliases to canonical names (for token suffix)
const PROPERTY_SUFFIXES: Record<string, string> = {
  // Colors
  bg: 'bg',
  background: 'bg',
  col: 'col',
  color: 'col',
  c: 'col',
  boc: 'boc',
  'border-color': 'boc',
  ic: 'ic',
  'icon-color': 'ic',
  // Spacing
  pad: 'pad',
  padding: 'pad',
  p: 'pad',
  mar: 'mar',
  margin: 'mar',
  m: 'mar',
  gap: 'gap',
  g: 'gap',
  'pad-x': 'pad',
  'pad-y': 'pad',
  px: 'pad',
  py: 'pad',
  // Sizing
  w: 'w',
  width: 'w',
  h: 'h',
  height: 'h',
  minw: 'w',
  maxw: 'w',
  minh: 'h',
  maxh: 'h',
  // Border
  rad: 'rad',
  radius: 'rad',
  bor: 'bor',
  border: 'bor',
  // Typography
  fs: 'fs',
  'font-size': 'fs',
  // Icon
  is: 'is',
  'icon-size': 'is',
}

interface TokenExtractCallbacks {
  /** Get all project files */
  getFiles: () => { name: string; type: string; code: string }[]
  /** Update a file's content */
  updateFile: (filename: string, content: string) => void
  /** Get current file name */
  getCurrentFile: () => string
}

let callbacks: TokenExtractCallbacks | null = null

/**
 * Get the token suffix for a property
 */
function getTokenSuffix(property: string): string {
  return PROPERTY_SUFFIXES[property] || property
}

/**
 * Find or create a tokens file
 */
function getTokensFile(files: { name: string; type: string; code: string }[]): {
  filename: string
  content: string
  exists: boolean
} {
  // Look for existing .tok file
  const tokFile = files.find(f => f.name.endsWith('.tok') || f.name.endsWith('.tokens'))

  if (tokFile) {
    return { filename: tokFile.name, content: tokFile.code, exists: true }
  }

  // Create new tokens.tok
  return { filename: 'tokens.tok', content: '', exists: false }
}

/**
 * Add token definition to the tokens file
 */
function addToTokensFile(
  currentContent: string,
  tokenName: string,
  suffix: string,
  value: string
): string {
  const tokenDef = `${tokenName}.${suffix}: ${value}`
  const trimmedContent = currentContent.trim()

  // Check if token already exists
  const existingPattern = new RegExp(`^${tokenName}\\.${suffix}\\s*:`, 'm')
  if (existingPattern.test(trimmedContent)) {
    // Update existing token
    const updatedContent = trimmedContent.replace(
      new RegExp(`^${tokenName}\\.${suffix}\\s*:.*$`, 'm'),
      tokenDef
    )
    return updatedContent + '\n'
  }

  if (!trimmedContent) {
    return tokenDef + '\n'
  }

  // Add with newline
  return trimmedContent + '\n' + tokenDef + '\n'
}

/**
 * Perform the token extraction
 */
function performExtraction(
  view: EditorView,
  property: string,
  tokenName: string,
  lineNumber: number,
  matchStart: number
): void {
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

  // Get the value after ::
  const valueAfterColons = lineText.slice(colonIndex + 2).trim()

  // Parse the value - take until comma or end of line
  const valueMatch = valueAfterColons.match(/^(\S+)/)
  if (!valueMatch) {
    log.info('No value after ::, removing ::')
    // Just remove the ::
    const doubleColonStart = line.from + colonIndex
    const doubleColonEnd = line.from + colonIndex + 2
    view.dispatch({
      changes: { from: doubleColonStart, to: doubleColonEnd, insert: '' },
      selection: { anchor: doubleColonStart },
      annotations: Transaction.userEvent.of('input.extract'),
    })
    return
  }

  const value = valueMatch[1]
  const suffix = getTokenSuffix(property)

  log.info(`Extracting token: ${tokenName}.${suffix}: ${value}`)

  // Get files and find/create tokens file
  const files = callbacks.getFiles()
  const { filename: tokFilename, content: tokContent } = getTokensFile(files)

  // Add to tokens file
  const newTokContent = addToTokensFile(tokContent, tokenName, suffix, value)

  // Update tokens file
  callbacks.updateFile(tokFilename, newTokContent)
  log.info(`Added ${tokenName}.${suffix} to ${tokFilename}`)

  // Calculate what to replace in the editor
  // Find where "property tokenName::value" starts
  const patternToFind = new RegExp(
    `\\b${property}\\s+${tokenName}::${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
  )
  const match = lineText.match(patternToFind)

  if (!match || match.index === undefined) {
    log.error('Could not find full pattern in line')
    return
  }

  const replaceStart = line.from + match.index
  const replaceEnd = replaceStart + match[0].length
  const replacement = `${property} $${tokenName}`

  view.dispatch({
    changes: { from: replaceStart, to: replaceEnd, insert: replacement },
    selection: { anchor: replaceStart + replacement.length },
    annotations: Transaction.userEvent.of('input.extract'),
  })

  log.info(`Replaced with: ${replacement}`)
}

/**
 * Create a CodeMirror extension that listens for :: and triggers token extraction
 */
export function createTokenExtractExtension(config: TokenExtractCallbacks): Extension {
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

      // Check if we have property tokenName:: pattern
      const match = textUpToCursor.match(EXTRACT_PATTERN)
      if (!match) return

      const property = match[1]
      const tokenName = match[2]

      log.info(`Detected :: for token: ${property} ${tokenName}`)

      // Perform extraction after a short delay to let the document update settle
      setTimeout(() => {
        performExtraction(view, property, tokenName, line.number, match.index || 0)
      }, 10)
    })
  })
}

/**
 * Unregister (cleanup) - resets callbacks
 */
export function unregisterTokenExtractTrigger(): void {
  callbacks = null
}
