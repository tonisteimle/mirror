/**
 * Rename Module
 *
 * IDE-style "Rename Symbol" (F2) functionality for Mirror Studio.
 * Allows renaming components and tokens across all files.
 */

// Engine - core logic for finding symbols and references
export {
  RenameEngine,
  getRenameEngine,
  createRenameEngine,
  type SymbolType,
  type SymbolInfo,
  type SymbolLocation,
  type RenameResult,
  type FileInfo as RenameFileInfo,
} from './rename-engine'

// Command - undo/redo support
export {
  RenameSymbolCommand,
  createRenameCommand,
  type RenameSymbolParams,
  type CreateRenameCommandParams,
  type FileChange,
} from './rename-command'

// UI - inline rename input
export {
  RenameUI,
  getRenameUI,
  createRenameUI,
  type RenameUIConfig,
  type RenameUIPosition,
} from './rename-ui'

// ============================================
// Convenience function for triggering rename
// ============================================

import { state } from '../core/state'
import { executor } from '../core/command-executor'
import { events } from '../core/events'
import { getRenameEngine } from './rename-engine'
import { createRenameCommand } from './rename-command'
import { getRenameUI } from './rename-ui'
import type { EditorController } from '../editor'

export interface RenameConfig {
  /** Editor controller instance */
  editor: EditorController
  /** Function to get all project files */
  getFiles: () => Array<{ name: string; content: string }>
  /** Current file name */
  getCurrentFile: () => string
}

/**
 * Trigger rename at current cursor position
 *
 * This is the main entry point for F2 functionality.
 */
export function triggerRename(config: RenameConfig): void {
  const { editor, getFiles, getCurrentFile } = config

  // Get cursor position
  const cursor = editor.getCursor()
  const source = editor.getContent()

  // Find symbol at cursor
  const engine = getRenameEngine()
  const symbol = engine.getSymbolAtPosition(source, cursor.line, cursor.column)

  if (!symbol) {
    console.log('[Rename] No symbol found at cursor position')
    events.emit('rename:no-symbol', { line: cursor.line, column: cursor.column })
    return
  }

  console.log('[Rename] Symbol found:', symbol.name, symbol.type)

  // Get cursor screen position for UI placement
  const editorView = editor.getEditorView()
  if (!editorView) {
    console.warn('[Rename] EditorView not available')
    return
  }

  // Get position from CodeMirror
  const pos = editorView.coordsAtPos(cursor.offset)
  if (!pos) {
    console.warn('[Rename] Could not get cursor coordinates')
    return
  }

  // Show rename UI
  const ui = getRenameUI()
  ui.show(
    symbol.name,
    symbol.type,
    { x: pos.left, y: pos.bottom + 4 },
    {
      onConfirm: (newName: string) => {
        // Create and execute rename command
        const command = createRenameCommand({
          oldName: symbol.name,
          newName,
          symbolType: symbol.type,
          files: getFiles(),
          currentFile: getCurrentFile(),
        })

        if (command) {
          const result = executor.execute(command)
          if (result.success) {
            console.log('[Rename] Success:', symbol.name, '→', newName)
          } else {
            console.error('[Rename] Failed:', result.error)
            events.emit('notification:error', {
              message: result.error || 'Failed to rename symbol',
            })
          }
        } else {
          events.emit('notification:error', {
            message: 'Could not create rename command',
          })
        }
      },
      onCancel: () => {
        console.log('[Rename] Cancelled')
      },
      validate: (name: string) => engine.validateName(name, symbol.type),
    }
  )
}

/**
 * Check if rename UI is currently open
 */
export function isRenameActive(): boolean {
  return getRenameUI().isVisible()
}

/**
 * Close rename UI if open
 */
export function closeRename(): void {
  getRenameUI().hide()
}
