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

    } catch (error: any) {
      return {
        success: false,
        filesChanged,
        filesCreated,
        error: error.message || 'Unknown error applying changes'
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
   */
  private indentCode(code: string, depth: number): string {
    const indent = '  '.repeat(depth)
    return code
      .split('\n')
      .map((line, i) => {
        // First line uses context indent, subsequent lines add to it
        if (i === 0) return indent + line.trimStart()
        // Preserve relative indentation for other lines
        const lineIndent = line.match(/^(\s*)/)?.[1] || ''
        return indent + line
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
