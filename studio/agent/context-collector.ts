/**
 * Context Collector for Mirror Fixer
 *
 * Collects all necessary context from the project:
 * - All token files (.tok)
 * - All component files (.com)
 * - Current file content
 * - Cursor position and selection
 * - AST context (parent, siblings, depth)
 * - Conversation history
 */

import type { FixerContext, ProjectContext, FileInfo } from './types'
import { state } from '../core'

// ============================================
// CONSTANTS
// ============================================

const MAX_HISTORY_MESSAGES = 10
const MAX_MESSAGE_LENGTH = 5000  // FIX #4: Limit message size
const MAX_HISTORY_TOTAL_SIZE = 50000  // FIX #4: Total history size limit
const INDENT_SIZE = 2  // FIX #14: Spaces per indent level

/**
 * FIX #5: Type-safe file content accessor
 * Handles both 'code' and legacy 'content' properties
 */
function getFileContent(file: FileInfo): string {
  // Use type assertion with runtime check
  const f = file as FileInfo & { content?: string }
  return f.code ?? f.content ?? ''
}

/**
 * Extract a component definition using efficient line scanning
 * Finds the component starting at startIndex and reads until the next component definition
 */
function extractComponentDefinition(content: string, name: string, startIndex: number): string | null {
  const lines = content.split('\n')
  let startLine = -1
  let currentPos = 0

  // Find the line containing startIndex
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = currentPos + lines[i].length
    if (currentPos <= startIndex && startIndex <= lineEnd) {
      startLine = i
      break
    }
    currentPos = lineEnd + 1 // +1 for newline
  }

  if (startLine === -1) return null

  // Collect lines until we hit another top-level definition (line starting with word:)
  const result: string[] = [lines[startLine]]
  const componentDefPattern = /^\w+(?:\s+as\s+\w+)?:/

  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i]
    // Check if this is a new top-level definition (starts with word followed by colon)
    if (componentDefPattern.test(line)) {
      break
    }
    result.push(line)
  }

  // Trim trailing empty lines
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop()
  }

  return result.join('\n').trim() || null
}

// ============================================
// TYPES
// ============================================

export interface ContextCollectorConfig {
  /** Get all project files */
  getFiles: () => FileInfo[]
  /** Get current file path */
  getCurrentFile: () => string
  /** Get current editor content */
  getEditorContent: () => string
  /** Get cursor position */
  getCursor: () => { line: number; column: number; offset: number }
  /** Get selection if any */
  getSelection: () => { from: number; to: number; text: string } | null
}

export interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// ============================================
// CONTEXT COLLECTOR
// ============================================

export class ContextCollector {
  private config: ContextCollectorConfig
  private history: HistoryEntry[] = []

  constructor(config: ContextCollectorConfig) {
    this.config = config
  }

  /**
   * Collect full context for a prompt
   */
  collect(prompt: string): FixerContext {
    const files = this.config.getFiles()
    const currentFile = this.config.getCurrentFile()
    const editorContent = this.config.getEditorContent()
    const cursor = this.config.getCursor()
    const selection = this.config.getSelection()

    // Separate files by type
    const tokenFiles: Record<string, string> = {}
    const componentFiles: Record<string, string> = {}

    for (const file of files) {
      // FIX #5: Use type-safe content accessor
      const content = getFileContent(file)

      if (file.type === 'tokens' || file.name.endsWith('.tok')) {
        tokenFiles[file.name] = content
      } else if (file.type === 'component' || file.name.endsWith('.com')) {
        componentFiles[file.name] = content
      }
    }

    // Get AST context from SourceMap
    const astContext = this.getASTContext(cursor.offset)

    return {
      files: {
        tokens: tokenFiles,
        components: componentFiles,
        current: {
          path: currentFile,
          content: editorContent
        }
      },
      cursor,
      selection,
      ast: astContext,
      history: [...this.history],
      prompt
    }
  }

  /**
   * Get AST context at cursor position
   * FIX #10: Better validation and error handling
   */
  private getASTContext(offset: number): FixerContext['ast'] {
    const emptyContext: FixerContext['ast'] = {
      currentNode: null,
      parentNode: null,
      siblings: [],
      depth: 0
    }

    try {
      const appState = state.get()
      const sourceMap = appState.sourceMap

      if (!sourceMap) {
        return emptyContext
      }

      // Validate sourceMap has required methods
      if (typeof sourceMap.getNodeById !== 'function') {
        console.warn('[ContextCollector] SourceMap missing getNodeById method')
        return emptyContext
      }

      // Try to find node at offset
      const nodeId = appState.selection?.nodeId
      if (!nodeId) {
        return emptyContext
      }

      const node = sourceMap.getNodeById(nodeId)
      if (!node) {
        return emptyContext
      }

      // Validate node has position
      if (!node.position || typeof node.position.line !== 'number') {
        console.warn('[ContextCollector] Node missing valid position:', nodeId)
        return emptyContext
      }

      // Get parent (with validation)
      let parentNode = null
      if (typeof sourceMap.getParent === 'function') {
        parentNode = sourceMap.getParent(nodeId)
      }

      // Get siblings (with validation)
      const siblings: string[] = []
      if (typeof sourceMap.getSiblings === 'function') {
        const siblingNodes = sourceMap.getSiblings(nodeId)
        for (const sib of siblingNodes) {
          if (sib.componentName) {
            siblings.push(sib.componentName)
          }
        }
      }

      // Calculate depth from indentation
      const source = appState.source || ''
      const lines = source.split('\n')
      const lineIndex = node.position.line - 1  // 1-indexed to 0-indexed

      // Validate line index
      if (lineIndex < 0 || lineIndex >= lines.length) {
        console.warn('[ContextCollector] Invalid line index:', lineIndex)
        return emptyContext
      }

      const line = lines[lineIndex]
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1].length : 0
      // FIX #14: Use INDENT_SIZE constant
      const depth = Math.floor(indent / INDENT_SIZE)

      return {
        currentNode: {
          type: node.componentName || 'unknown',
          name: node.instanceName || node.componentName || 'unknown',
          line: node.position.line
        },
        parentNode: parentNode ? {
          type: parentNode.componentName || 'unknown',
          name: parentNode.instanceName || parentNode.componentName || 'unknown',
          // Use 1 as minimum valid line number instead of 0
          line: parentNode.position?.line ?? 1
        } : null,
        siblings,
        depth
      }
    } catch (error) {
      console.error('[ContextCollector] Error getting AST context:', error)
      return emptyContext
    }
  }

  /**
   * Add message to history
   * FIX #4: Limit message size and total history
   */
  addToHistory(role: 'user' | 'assistant', content: string): void {
    // Truncate large messages
    const truncatedContent = content.length > MAX_MESSAGE_LENGTH
      ? content.slice(0, MAX_MESSAGE_LENGTH) + '... [truncated]'
      : content

    this.history.push({
      role,
      content: truncatedContent,
      timestamp: Date.now()
    })

    // Keep last N messages
    if (this.history.length > MAX_HISTORY_MESSAGES) {
      this.history = this.history.slice(-MAX_HISTORY_MESSAGES)
    }

    // Also check total size
    this.trimHistoryBySize()
  }

  /**
   * Trim history if total size exceeds limit
   * FIX #4: Prevent memory issues with large responses
   * FIX #15: Handle single large entries that exceed limit
   */
  private trimHistoryBySize(): void {
    let totalSize = this.history.reduce((sum, entry) => sum + entry.content.length, 0)

    // Remove oldest entries until under limit
    while (totalSize > MAX_HISTORY_TOTAL_SIZE && this.history.length > 1) {
      const removed = this.history.shift()
      if (removed) {
        totalSize -= removed.content.length
      }
    }

    // FIX #15: If single remaining entry is too large, truncate it
    if (this.history.length === 1 && totalSize > MAX_HISTORY_TOTAL_SIZE) {
      const entry = this.history[0]
      const maxContentSize = MAX_HISTORY_TOTAL_SIZE - 50 // Leave room for truncation marker
      entry.content = entry.content.slice(0, maxContentSize) + '... [truncated due to size]'
      console.warn('[ContextCollector] Single history entry truncated due to size limit')
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = []
  }

  /**
   * Get history
   */
  getHistory(): HistoryEntry[] {
    return [...this.history]
  }

  /**
   * Get history size in bytes (approximate)
   */
  getHistorySize(): number {
    return this.history.reduce((sum, entry) => sum + entry.content.length, 0)
  }
}

// ============================================
// PROJECT CONTEXT EXTRACTION
// ============================================

/**
 * Extract token and component names from project files
 */
export function extractProjectContext(files: FileInfo[]): ProjectContext {
  const tokenNames: string[] = []
  const tokenValues: Record<string, string> = {}
  const componentNames: string[] = []
  const componentDefinitions: Record<string, string> = {}

  for (const file of files) {
    // FIX #5: Use type-safe content accessor
    const content = getFileContent(file)

    if (file.type === 'tokens' || file.name.endsWith('.tok')) {
      // Extract tokens: $name: value
      const matches = content.matchAll(/^\s*(\$[\w.-]+):\s*(.+)$/gm)
      for (const match of matches) {
        const name = match[1]
        const value = match[2].trim()
        tokenNames.push(name)
        tokenValues[name] = value
      }
    }

    if (file.type === 'component' || file.name.endsWith('.com')) {
      // Extract component definitions: Name as Primitive: or Name:
      const matches = content.matchAll(/^(\w+)(?:\s+as\s+\w+)?:/gm)
      for (const match of matches) {
        const name = match[1]
        componentNames.push(name)

        // FIX: Use line-based extraction instead of slow regex
        // Find the definition by scanning lines
        const definition = extractComponentDefinition(content, name, match.index ?? 0)
        if (definition) {
          componentDefinitions[name] = definition
        }
      }
    }
  }

  return {
    tokenNames,
    tokenValues,
    componentNames,
    componentDefinitions
  }
}

// ============================================
// FACTORY
// ============================================

let instance: ContextCollector | null = null

/**
 * Create or replace the ContextCollector singleton
 * Cleans up old instance history before creating new one
 */
export function createContextCollector(config: ContextCollectorConfig): ContextCollector {
  if (instance) {
    // Clear history from old instance to free memory
    instance.clearHistory()
  }
  instance = new ContextCollector(config)
  return instance
}

export function getContextCollector(): ContextCollector | null {
  return instance
}
