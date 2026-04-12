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
import { logAgent } from '../../compiler/utils/logger'

// ============================================
// CONSTANTS
// ============================================

const INDENT_SIZE = 2  // FIX #14: Spaces per indent level
const ALLOWED_EXTENSIONS = ['.mir', '.tok', '.com', '.mirror']  // Allowed file types

// ============================================
// HELPERS
// ============================================

/**
 * Validate file path for security
 * Prevents path traversal and restricts to allowed extensions
 */
function validateFilePath(path: string): { valid: boolean; error?: string } {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Ungültiger Dateipfad' }
  }

  // Normalize path
  const normalized = path.trim()

  // FIX: Check for null bytes (security risk)
  if (normalized.includes('\0')) {
    return { valid: false, error: 'Null-Bytes im Pfad nicht erlaubt' }
  }

  // Check for path traversal
  if (normalized.includes('..') || normalized.includes('//')) {
    return { valid: false, error: 'Path traversal nicht erlaubt' }
  }

  // Check for absolute paths (security risk)
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return { valid: false, error: 'Absolute Pfade nicht erlaubt' }
  }

  // Check for allowed extensions
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => normalized.endsWith(ext))
  if (!hasAllowedExtension) {
    return { valid: false, error: `Nur ${ALLOWED_EXTENSIONS.join(', ')} Dateien erlaubt` }
  }

  return { valid: true }
}

/**
 * Compare file paths case-insensitively (for macOS compatibility)
 * Normalizes trailing slashes and whitespace
 */
function isSameFile(path1: string, path2: string): boolean {
  const normalize = (p: string) => p.trim().replace(/\/+$/, '').toLowerCase()
  return normalize(path1) === normalize(path2)
}

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

/**
 * Snapshot of file state for rollback
 */
interface FileSnapshot {
  path: string
  content: string | null  // null means file didn't exist
  wasCreated: boolean
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
   * FIX: Implements rollback on failure
   */
  async apply(response: FixerResponse, context: FixerContext): Promise<ApplyResult> {
    const filesChanged: string[] = []
    const filesCreated: string[] = []
    const snapshots: FileSnapshot[] = []

    try {
      // Phase 1: Create snapshots of all files that will be modified
      for (const change of response.changes) {
        const snapshot = this.createSnapshot(change.file, change.action === 'create')
        snapshots.push(snapshot)
      }

      // Phase 2: Apply all changes
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

      // Phase 3: Rollback all changes on failure
      logAgent.warn('CodeApplicator: Error applying changes, rolling back:', errorMessage)
      await this.rollback(snapshots)

      return {
        success: false,
        filesChanged: [],  // Clear since we rolled back
        filesCreated: [],  // Clear since we rolled back
        error: errorMessage
      }
    }
  }

  /**
   * Create a snapshot of a file before modification
   */
  private createSnapshot(filePath: string, isCreate: boolean): FileSnapshot {
    return {
      path: filePath,
      content: isCreate ? null : this.config.getFileContent(filePath),
      wasCreated: isCreate
    }
  }

  /**
   * Rollback all changes using snapshots
   */
  private async rollback(snapshots: FileSnapshot[]): Promise<void> {
    const currentFile = this.config.getCurrentFile()

    for (const snapshot of snapshots) {
      try {
        if (snapshot.wasCreated) {
          // File was created, we can't delete it (no deleteFile in config)
          // Just log it - the file will remain but with empty content
          logAgent.warn(`CodeApplicator: Cannot delete created file during rollback: ${snapshot.path}`)
        } else if (snapshot.content !== null) {
          // Restore original content
          await this.config.saveFile(snapshot.path, snapshot.content)

          // Update editor if this is the current file
          if (isSameFile(snapshot.path, currentFile)) {
            this.config.updateEditor(snapshot.content)
          }
        }
      } catch (e) {
        // Log but continue with other rollbacks
        logAgent.error(`CodeApplicator: Failed to rollback ${snapshot.path}:`, e)
      }
    }

    // Refresh file tree after rollback
    this.config.refreshFileTree()
  }

  /**
   * Apply a single change
   * Validates file path and code before applying
   */
  private async applyChange(change: FixerChange, context: FixerContext): Promise<void> {
    const { file, action, code, position } = change

    // Validate file path for security
    const pathValidation = validateFilePath(file)
    if (!pathValidation.valid) {
      throw new Error(`Ungültiger Dateipfad "${file}": ${pathValidation.error}`)
    }

    // Validate code parameter
    if (code === undefined || code === null) {
      throw new Error(`Fehlender Code für Datei "${file}"`)
    }
    if (typeof code !== 'string') {
      throw new Error(`Ungültiger Code-Typ für Datei "${file}": ${typeof code}`)
    }

    const currentFile = this.config.getCurrentFile()
    // Use case-insensitive comparison for macOS compatibility
    const isCurrentFile = isSameFile(file, currentFile)

    switch (action) {
      case 'create':
        try {
          await this.config.createFile(file, code)
        } catch (e) {
          throw new Error(`Fehler beim Erstellen von "${file}": ${e instanceof Error ? e.message : String(e)}`)
        }
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
   * FIX #6: Validate line parameter for NaN/Infinity
   */
  private async insertInFile(
    filename: string,
    code: string,
    line: number,
    context: FixerContext,
    isCurrentFile: boolean
  ): Promise<void> {
    // FIX #6: Validate line parameter
    let validLine = line
    if (!Number.isFinite(validLine) || validLine < 1) {
      validLine = 1
    }

    let content = this.config.getFileContent(filename)

    if (content === null) {
      // File doesn't exist, create it
      await this.config.createFile(filename, code)
      // FIX #13: Switch to new file if handler is provided
      if (this.config.switchToFile) {
        this.config.switchToFile(filename)
      }
      return
    }

    const lines = content.split('\n')

    // Ensure proper indentation based on context
    const indentedCode = this.indentCode(code, context.ast.depth)

    // Insert at line (1-indexed)
    const insertIndex = Math.min(Math.max(0, validLine - 1), lines.length)
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
   * FIX #14: Use INDENT_SIZE constant
   *
   * The code from the Fixer may have its own internal indentation (for nested elements).
   * We need to:
   * 1. Add base indent (depth * INDENT_SIZE spaces) to all lines
   * 2. Preserve relative indentation between lines
   */
  private indentCode(code: string, depth: number): string {
    if (!code || code.trim() === '') {
      return ''
    }

    // FIX #6: Validate depth parameter
    const validDepth = Number.isFinite(depth) && depth >= 0 ? depth : 0

    const baseIndent = ' '.repeat(INDENT_SIZE).repeat(validDepth)
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

        // FIX #14: Use INDENT_SIZE constant for indent calculation
        const newIndent = ' '.repeat(INDENT_SIZE).repeat(validDepth + Math.floor(relativeIndent / INDENT_SIZE))

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
