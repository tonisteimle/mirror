/**
 * Command Executor with undo/redo support and dependency injection
 */

import type { Command, CommandResult, CommandContext } from './commands'
import { BatchCommand, getCommandContext } from './commands'
import { events } from './events'

interface HistoryEntry {
  command: Command
  timestamp: number
}

interface Session {
  commands: Command[]
  description?: string
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
  private session: Session | null = null

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

  private runHistoryOp(
    from: HistoryEntry[],
    to: HistoryEntry[],
    action: (e: HistoryEntry, ctx: CommandContext) => CommandResult,
    event: string,
    emptyError: string
  ): CommandResult {
    const entry = from.pop()
    if (!entry) return { success: false, error: emptyError }
    if (this.executing) {
      from.push(entry)
      return { success: false, error: 'Execution already in progress' }
    }
    this.executing = true
    try {
      const result = action(entry, this.getContext())
      if (result.success) {
        to.push(entry)
        if (this.emitEvents) events.emit(event, { command: entry.command })
      } else from.push(entry)
      return result
    } finally {
      this.executing = false
    }
  }

  undo(): CommandResult {
    // Commit any in-progress session first so the user undoes a complete unit
    // of work, not a half-finished session.
    if (this.session) this.endSession()
    return this.runHistoryOp(
      this.undoStack,
      this.redoStack,
      (e, ctx) => e.command.undo(ctx),
      'command:undone',
      'Nothing to undo'
    )
  }

  redo(): CommandResult {
    if (this.session) this.endSession()
    return this.runHistoryOp(
      this.redoStack,
      this.undoStack,
      (e, ctx) => e.command.execute(ctx),
      'command:redone',
      'Nothing to redo'
    )
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
    this.session = null
  }

  // ===========================================================================
  // Session API — coalesce many small commands into one undo step
  //
  // Use case: Spacing-Mode keyboard arrows. Each press is a SetPropertyCommand
  // that needs to be applied immediately for live preview, but the user thinks
  // of the whole "I tweaked padding for 8 seconds" as a single undo unit.
  //
  // Begin → executeInSession×N → end. On end, the N commands are wrapped in a
  // BatchCommand(alreadyExecuted) and pushed as one undo entry.
  // ===========================================================================

  beginSession(description?: string): void {
    // Forgiving: if a previous session was left open, commit it cleanly.
    if (this.session) this.endSession()
    this.session = { commands: [], description }
  }

  /**
   * Execute a command as part of the active session. The change is applied
   * immediately (so the user sees live feedback), but it is NOT pushed to the
   * undo stack as a separate entry — instead it accumulates in the session
   * until endSession() collapses everything into one BatchCommand.
   *
   * If no session is active, falls back to normal execute().
   */
  executeInSession(command: Command): CommandResult {
    if (!this.session) return this.execute(command)
    if (this.executing) {
      return { success: false, error: 'Execution already in progress' }
    }

    this.executing = true
    try {
      const ctx = this.getContext()
      const result = command.execute(ctx)
      if (result.success) {
        this.session.commands.push(command)
        // Intentionally no 'command:executed' event — the session emits one
        // batched event in endSession() instead.
      }
      return result
    } finally {
      this.executing = false
    }
  }

  endSession(): void {
    const session = this.session
    this.session = null
    if (!session || session.commands.length === 0) return

    const batch = new BatchCommand({
      commands: session.commands,
      description: session.description,
      alreadyExecuted: true,
    })
    this.undoStack.push({ command: batch, timestamp: Date.now() })
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift()
    this.redoStack = []
    if (this.emitEvents) events.emit('command:executed', { command: batch })
  }

  isInSession(): boolean {
    return this.session !== null
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
