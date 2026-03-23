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

// ============================================
// CONTEXT COLLECTOR
// ============================================

export class ContextCollector {
  private config: ContextCollectorConfig
  private history: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = []

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
      if (file.type === 'tokens' || file.name.endsWith('.tok')) {
        tokenFiles[file.name] = file.code
      } else if (file.type === 'components' || file.type === 'component' || file.name.endsWith('.com')) {
        componentFiles[file.name] = file.code
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
   */
  private getASTContext(offset: number): FixerContext['ast'] {
    const sourceMap = state.get().sourceMap
    if (!sourceMap) {
      return {
        currentNode: null,
        parentNode: null,
        siblings: [],
        depth: 0
      }
    }

    // Try to find node at offset
    const nodeId = state.get().selection.nodeId
    if (!nodeId) {
      return {
        currentNode: null,
        parentNode: null,
        siblings: [],
        depth: 0
      }
    }

    const node = sourceMap.getNodeById(nodeId)
    if (!node) {
      return {
        currentNode: null,
        parentNode: null,
        siblings: [],
        depth: 0
      }
    }

    // Get parent
    const parentId = sourceMap.getParentId(nodeId)
    const parentNode = parentId ? sourceMap.getNodeById(parentId) : null

    // Get siblings
    const siblings: string[] = []
    if (parentId) {
      const siblingIds = sourceMap.getChildIds(parentId)
      for (const sibId of siblingIds) {
        if (sibId !== nodeId) {
          const sib = sourceMap.getNodeById(sibId)
          if (sib) {
            siblings.push(sib.type)
          }
        }
      }
    }

    // Calculate depth from indentation
    const source = state.get().source
    const lines = source.split('\n')
    const line = lines[node.position.line - 1] || ''
    const indent = line.match(/^(\s*)/)?.[1].length || 0
    const depth = Math.floor(indent / 2)

    return {
      currentNode: {
        type: node.type,
        name: node.name || node.type,
        line: node.position.line
      },
      parentNode: parentNode ? {
        type: parentNode.type,
        name: parentNode.name || parentNode.type,
        line: parentNode.position.line
      } : null,
      siblings,
      depth
    }
  }

  /**
   * Add message to history
   */
  addToHistory(role: 'user' | 'assistant', content: string): void {
    this.history.push({
      role,
      content,
      timestamp: Date.now()
    })

    // Keep last 10 messages
    if (this.history.length > 10) {
      this.history = this.history.slice(-10)
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
  getHistory() {
    return [...this.history]
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
    if (file.type === 'tokens' || file.name.endsWith('.tok')) {
      // Extract tokens: $name: value
      const matches = file.code.matchAll(/^\s*(\$[\w.-]+):\s*(.+)$/gm)
      for (const match of matches) {
        const name = match[1]
        const value = match[2].trim()
        tokenNames.push(name)
        tokenValues[name] = value
      }
    }

    if (file.type === 'components' || file.type === 'component' || file.name.endsWith('.com')) {
      // Extract component definitions: Name as Primitive: or Name:
      const matches = file.code.matchAll(/^(\w+)(?:\s+as\s+\w+)?:/gm)
      for (const match of matches) {
        const name = match[1]
        componentNames.push(name)

        // Extract full definition (until next component or end)
        const defMatch = file.code.match(new RegExp(`^${name}[^\\n]*:[\\s\\S]*?(?=^\\w+[^\\n]*:|$)`, 'm'))
        if (defMatch) {
          componentDefinitions[name] = defMatch[0].trim()
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

export function createContextCollector(config: ContextCollectorConfig): ContextCollector {
  instance = new ContextCollector(config)
  return instance
}

export function getContextCollector(): ContextCollector | null {
  return instance
}
