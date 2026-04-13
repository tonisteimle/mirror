/**
 * Command Executor with undo/redo support and dependency injection
 */

import type { Command, CommandResult, CommandContext } from './commands'
import { getCommandContext } from './commands'
import { events } from './events'

interface HistoryEntry {
  command: Command
  timestamp: number
}

export interface CommandExecutorOptions {
  maxHistory?: number
  emitEvents?: boolean
  /** Injected context - if not provided, falls back to legacy global context */
  context?: CommandContext
}

export class CommandExecutor {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private maxHistory: number
  private emitEvents: boolean
  private executing = false
  private injectedContext: CommandContext | null

  constructor(options: CommandExecutorOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100
    this.emitEvents = options.emitEvents ?? true
    this.injectedContext = options.context ?? null
  }

  /** Get the command context (injected or legacy global) */
  private getContext(): CommandContext {
    if (this.injectedContext) return this.injectedContext
    // Fallback to legacy global context for backward compatibility
    return getCommandContext()
  }

  /** Update the injected context (useful when context changes after construction) */
  setContext(context: CommandContext): void {
    this.injectedContext = context
  }

  execute(command: Command): CommandResult {
    if (this.executing) {
      return { success: false, error: 'Execution already in progress' }
    }

    this.executing = true
    try {
      const ctx = this.getContext()
      const result = command.execute(ctx)
      if (result.success) {
        this.undoStack.push({ command, timestamp: Date.now() })
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift()
        this.redoStack = []
        if (this.emitEvents) events.emit('command:executed', { command })
      }
      return result
    } finally {
      this.executing = false
    }
  }

  undo(): CommandResult {
    const entry = this.undoStack.pop()
    if (!entry) return { success: false, error: 'Nothing to undo' }
    if (this.executing) {
      this.undoStack.push(entry)
      return { success: false, error: 'Execution already in progress' }
    }

    this.executing = true
    try {
      const ctx = this.getContext()
      const result = entry.command.undo(ctx)
      if (result.success) {
        this.redoStack.push(entry)
        if (this.emitEvents) events.emit('command:undone', { command: entry.command })
      } else {
        this.undoStack.push(entry)
      }
      return result
    } finally {
      this.executing = false
    }
  }

  redo(): CommandResult {
    const entry = this.redoStack.pop()
    if (!entry) return { success: false, error: 'Nothing to redo' }
    if (this.executing) {
      this.redoStack.push(entry)
      return { success: false, error: 'Execution already in progress' }
    }

    this.executing = true
    try {
      const ctx = this.getContext()
      const result = entry.command.execute(ctx)
      if (result.success) {
        this.undoStack.push(entry)
        if (this.emitEvents) events.emit('command:redone', { command: entry.command })
      } else {
        this.redoStack.push(entry)
      }
      return result
    } finally {
      this.executing = false
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}

// Global executor instance
export const executor = new CommandExecutor()

export function canUndo(): boolean {
  return executor.canUndo()
}

export function canRedo(): boolean {
  return executor.canRedo()
}
