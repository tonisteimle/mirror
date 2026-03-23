/**
 * Code Applicator for Mirror Fixer
 *
 * Applies multi-file changes from the Fixer response:
 * - Creates new files
 * - Inserts code at specific positions
 * - Appends code to files
 * - Replaces file content
 * - Updates the editor if current file is affected
 */

import type { FixerResponse, FixerChange, FixerContext } from './types'

// ============================================
// TYPES
// ============================================

export interface CodeApplicatorConfig {
  /** Get file content */
  getFileContent: (filename: string) => string | null
  /** Save file content */
  saveFile: (filename: string, content: string) => Promise<void>
  /** Create new file */
  createFile: (filename: string, content: string) => Promise<void>
  /** Get current file path */
  getCurrentFile: () => string
  /** Update editor content (for current file) */
  updateEditor: (content: string) => void
  /** Refresh file tree */
  refreshFileTree: () => void
  /** Switch to file (optional) */
  switchToFile?: (filename: string) => void
}

export interface ApplyResult {
  success: boolean
  filesChanged: string[]
  filesCreated: string[]
  error?: string
}

// ============================================
// CODE APPLICATOR
// ============================================

export class CodeApplicator {
  private config: CodeApplicatorConfig

  constructor(config: CodeApplicatorConfig) {
    this.config = config
  }

  /**
   * Apply all changes from a FixerResponse
   */
  async apply(response: FixerResponse, context: FixerContext): Promise<ApplyResult> {
    const filesChanged: string[] = []
    const filesCreated: string[] = []

    try {
      for (const change of response.changes) {
        await this.applyChange(change, context)

        if (change.action === 'create') {
          filesCreated.push(change.file)
        } else {
          filesChanged.push(change.file)
        }
      }

      // Refresh file tree if files were created
      if (filesCreated.length > 0) {
        this.config.refreshFileTree()
      }

      return {
        success: true,
        filesChanged,
        filesCreated
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error applying changes'
      return {
        success: false,
        filesChanged,
        filesCreated,
        error: errorMessage
      }
    }
  }

  /**
   * Apply a single change
   */
  private async applyChange(change: FixerChange, context: FixerContext): Promise<void> {
    const { file, action, code, position } = change
    const currentFile = this.config.getCurrentFile()
    const isCurrentFile = file === currentFile

    switch (action) {
      case 'create':
        await this.config.createFile(file, code)
        break

      case 'append':
        await this.appendToFile(file, code, isCurrentFile)
        break

      case 'insert':
        await this.insertInFile(file, code, position?.line ?? 1, context, isCurrentFile)
        break

      case 'replace':
        await this.replaceFileContent(file, code, isCurrentFile)
        break
    }
  }

  /**
   * Append code to end of file
   */
  private async appendToFile(filename: string, code: string, isCurrentFile: boolean): Promise<void> {
    let content = this.config.getFileContent(filename)

    if (content === null) {
      // File doesn't exist, create it
      await this.config.createFile(filename, code)
      return
    }

    // Append with proper spacing
    const newContent = content.trimEnd() + '\n\n' + code

    await this.config.saveFile(filename, newContent)

    if (isCurrentFile) {
      this.config.updateEditor(newContent)
    }
  }

  /**
   * Insert code at specific line
   */
  private async insertInFile(
    filename: string,
    code: string,
    line: number,
    context: FixerContext,
    isCurrentFile: boolean
  ): Promise<void> {
    let content = this.config.getFileContent(filename)

    if (content === null) {
      // File doesn't exist, create it
      await this.config.createFile(filename, code)
      return
    }

    const lines = content.split('\n')

    // Ensure proper indentation based on context
    const indentedCode = this.indentCode(code, context.ast.depth)

    // Insert at line (1-indexed)
    const insertIndex = Math.min(Math.max(0, line - 1), lines.length)
    lines.splice(insertIndex, 0, indentedCode)

    const newContent = lines.join('\n')

    await this.config.saveFile(filename, newContent)

    if (isCurrentFile) {
      this.config.updateEditor(newContent)
    }
  }

  /**
   * Replace entire file content
   */
  private async replaceFileContent(filename: string, code: string, isCurrentFile: boolean): Promise<void> {
    await this.config.saveFile(filename, code)

    if (isCurrentFile) {
      this.config.updateEditor(code)
    }
  }

  /**
   * Indent code based on depth
   * FIX #7: Properly preserve relative indentation
   *
   * The code from the Fixer may have its own internal indentation (for nested elements).
   * We need to:
   * 1. Add base indent (depth * 2 spaces) to all lines
   * 2. Preserve relative indentation between lines
   */
  private indentCode(code: string, depth: number): string {
    if (!code || code.trim() === '') {
      return ''
    }

    const baseIndent = '  '.repeat(depth)
    const lines = code.split('\n')

    // Find the minimum indentation in the input (excluding empty lines)
    // This helps us normalize the input before adding our indent
    let minIndent = Infinity
    for (const line of lines) {
      if (line.trim() === '') continue
      const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      minIndent = Math.min(minIndent, lineIndent)
    }

    // If no non-empty lines, use 0
    if (minIndent === Infinity) minIndent = 0

    return lines
      .map(line => {
        // Keep empty lines empty
        if (line.trim() === '') {
          return ''
        }

        // Get current line's indent
        const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0

        // Calculate relative indent (how much more than the minimum)
        const relativeIndent = currentIndent - minIndent

        // New indent = base + relative
        const newIndent = '  '.repeat(depth + Math.floor(relativeIndent / 2))

        // Return new indent + trimmed content
        return newIndent + line.trimStart()
      })
      .join('\n')
  }
}

// ============================================
// FACTORY
// ============================================

let instance: CodeApplicator | null = null

export function createCodeApplicator(config: CodeApplicatorConfig): CodeApplicator {
  instance = new CodeApplicator(config)
  return instance
}

export function getCodeApplicator(): CodeApplicator | null {
  return instance
}
