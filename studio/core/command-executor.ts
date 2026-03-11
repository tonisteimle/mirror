/**
 * Command Executor with undo/redo support
 */

import type { Command, CommandResult } from './commands'
import { events } from './events'

interface HistoryEntry {
  command: Command
  timestamp: number
}

export interface CommandExecutorOptions {
  maxHistory?: number
  emitEvents?: boolean
}

export class CommandExecutor {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private maxHistory: number
  private emitEvents: boolean
  private executing = false

  constructor(options: CommandExecutorOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100
    this.emitEvents = options.emitEvents ?? true
  }

  execute(command: Command): CommandResult {
    if (this.executing) {
      return { success: false, error: 'Execution already in progress' }
    }

    this.executing = true
    try {
      const result = command.execute()
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
      const result = entry.command.undo()
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
      const result = entry.command.execute()
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

export const executor = new CommandExecutor()

export function execute(command: Command): CommandResult {
  return executor.execute(command)
}

export function undo(): CommandResult {
  return executor.undo()
}

export function redo(): CommandResult {
  return executor.redo()
}

export function canUndo(): boolean {
  return executor.canUndo()
}

export function canRedo(): boolean {
  return executor.canRedo()
}
