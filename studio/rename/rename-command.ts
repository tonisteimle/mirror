/**
 * Rename Symbol Command
 *
 * Command pattern implementation for renaming symbols across files.
 * Supports undo/redo for all file changes.
 */

import type { Command, CommandContext, CommandResult } from '../core/commands'
import { events } from '../core/events'
import type { SymbolType, SymbolLocation } from './rename-engine'
import { getRenameEngine } from './rename-engine'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('RenameCommand')

export interface FileChange {
  oldContent: string
  newContent: string
}

export interface RenameSymbolParams {
  oldName: string
  newName: string
  symbolType: SymbolType
  /** Map of filename → { oldContent, newContent } */
  fileChanges: Map<string, FileChange>
  /** Locations where renames occur (for display) */
  locations: SymbolLocation[]
}

/**
 * Command to rename a symbol across all files
 *
 * Handles both single-file and multi-file renames with full undo support.
 */
export class RenameSymbolCommand implements Command {
  readonly type = 'RENAME_SYMBOL'
  readonly description: string

  private oldName: string
  private newName: string
  private symbolType: SymbolType
  private fileChanges: Map<string, FileChange>
  private locations: SymbolLocation[]

  constructor(params: RenameSymbolParams) {
    this.oldName = params.oldName
    this.newName = params.newName
    this.symbolType = params.symbolType
    this.fileChanges = params.fileChanges
    this.locations = params.locations
    this.description = `Rename ${params.symbolType} "${params.oldName}" to "${params.newName}"`
  }

  execute(ctx: CommandContext): CommandResult {
    try {
      // Apply changes to all files
      for (const [filename, change] of this.fileChanges) {
        // Emit event to update file (handled by app.js)
        events.emit('file:update-requested', {
          filename,
          content: change.newContent,
        })
      }

      // If current file is in the changes, apply to editor
      const currentSource = ctx.getSource()
      for (const [filename, change] of this.fileChanges) {
        if (change.oldContent === currentSource) {
          // This is the current file - apply change to editor
          ctx.applyChange({
            from: 0,
            to: currentSource.length,
            insert: change.newContent,
          })
          break
        }
      }

      // Trigger recompile
      ctx.compile()

      // Emit rename completed event
      events.emit('rename:completed', {
        oldName: this.oldName,
        newName: this.newName,
        symbolType: this.symbolType,
        fileCount: this.fileChanges.size,
        locationCount: this.locations.length,
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: `Failed to rename: ${message}` }
    }
  }

  undo(ctx: CommandContext): CommandResult {
    try {
      // Restore all files to their original content
      for (const [filename, change] of this.fileChanges) {
        // Emit event to update file (handled by app.js)
        events.emit('file:update-requested', {
          filename,
          content: change.oldContent,
        })
      }

      // If current file is in the changes, restore in editor
      const currentSource = ctx.getSource()
      for (const [filename, change] of this.fileChanges) {
        if (change.newContent === currentSource) {
          // This is the current file - restore original content
          ctx.applyChange({
            from: 0,
            to: currentSource.length,
            insert: change.oldContent,
          })
          break
        }
      }

      // Trigger recompile
      ctx.compile()

      // Emit rename undone event
      events.emit('rename:undone', {
        oldName: this.oldName,
        newName: this.newName,
        symbolType: this.symbolType,
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: `Failed to undo rename: ${message}` }
    }
  }
}

/**
 * Factory function to create a RenameSymbolCommand
 *
 * This handles finding all references and computing file changes.
 */
export interface CreateRenameCommandParams {
  /** The current symbol name */
  oldName: string
  /** The new symbol name */
  newName: string
  /** Type of symbol (component or token) */
  symbolType: SymbolType
  /** All files in the project */
  files: Array<{ name: string; content: string }>
  /** Current file name (to identify editor file) */
  currentFile: string
}

export function createRenameCommand(params: CreateRenameCommandParams): RenameSymbolCommand | null {
  const { oldName, newName, symbolType, files, currentFile } = params

  // Validate new name
  const engine = getRenameEngine()
  const validation = engine.validateName(newName, symbolType)
  if (!validation.valid) {
    log.warn('Invalid name:', validation.error)
    return null
  }

  // Find all references
  const result = engine.findAllReferences(
    files.map(f => ({ name: f.name, content: f.content })),
    oldName,
    symbolType
  )

  if (result.locations.length === 0) {
    log.warn('No references found for:', oldName)
    return null
  }

  // Group locations by file
  const locationsByFile = new Map<string, SymbolLocation[]>()
  for (const loc of result.locations) {
    const existing = locationsByFile.get(loc.file) || []
    existing.push(loc)
    locationsByFile.set(loc.file, existing)
  }

  // Compute file changes
  const fileChanges = new Map<string, FileChange>()
  for (const file of files) {
    const locations = locationsByFile.get(file.name)
    if (!locations || locations.length === 0) continue

    const newContent = engine.applyRename(file.content, locations, newName)
    fileChanges.set(file.name, {
      oldContent: file.content,
      newContent,
    })
  }

  return new RenameSymbolCommand({
    oldName,
    newName,
    symbolType,
    fileChanges,
    locations: result.locations,
  })
}
