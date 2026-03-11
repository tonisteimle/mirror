/**
 * Command Pattern Implementation for Studio
 */

import { state, actions } from './state'
import type { SourceMap } from '../../src/studio/source-map'
import { CodeModifier, type CodeChange, type AddChildOptions } from '../../src/studio/code-modifier'

export interface Command {
  readonly type: string
  readonly description: string
  execute(): CommandResult
  undo(): CommandResult
}

export interface CommandResult {
  success: boolean
  error?: string
  change?: CodeChange
}

export interface CommandContext {
  getSourceMap(): SourceMap | null
  getSource(): string
  applyChange(change: CodeChange): void
  compile(): void
}

let commandContext: CommandContext | null = null

export function setCommandContext(context: CommandContext): void {
  commandContext = context
}

export function getCommandContext(): CommandContext {
  if (!commandContext) {
    throw new Error('Command context not initialized')
  }
  return commandContext
}

export class SetPropertyCommand implements Command {
  readonly type = 'SET_PROPERTY'
  readonly description: string
  private nodeId: string
  private property: string
  private newValue: string
  private oldValue: string | null = null
  private change: CodeChange | null = null

  constructor(params: { nodeId: string; property: string; value: string }) {
    this.nodeId = params.nodeId
    this.property = params.property
    this.newValue = params.value
    this.description = `Set ${params.property} to ${params.value}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    const sourceMap = ctx.getSourceMap()
    const source = ctx.getSource()
    if (!sourceMap) return { success: false, error: 'No source map' }

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.updateProperty(this.nodeId, this.property, this.newValue)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    this.oldValue = source.substring(result.change.from, result.change.to)
    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.change || this.oldValue === null) return { success: false, error: 'Cannot undo' }
    const ctx = getCommandContext()
    const sourceMap = ctx.getSourceMap()
    const source = ctx.getSource()
    if (!sourceMap) return { success: false, error: 'No source map' }

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.updateProperty(this.nodeId, this.property, this.oldValue)
    if (!result.success) return { success: false, error: result.error }
    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }
}

export class RemovePropertyCommand implements Command {
  readonly type = 'REMOVE_PROPERTY'
  readonly description: string
  private nodeId: string
  private property: string
  private oldLine: string | null = null
  private change: CodeChange | null = null

  constructor(params: { nodeId: string; property: string }) {
    this.nodeId = params.nodeId
    this.property = params.property
    this.description = `Remove ${params.property}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    const sourceMap = ctx.getSourceMap()
    const source = ctx.getSource()
    if (!sourceMap) return { success: false, error: 'No source map' }

    const node = sourceMap.getNodeById(this.nodeId)
    if (!node) return { success: false, error: `Node not found: ${this.nodeId}` }
    this.oldLine = source.split('\n')[node.position.line - 1]

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.removeProperty(this.nodeId, this.property)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.change || !this.oldLine) return { success: false, error: 'Cannot undo' }
    const ctx = getCommandContext()
    const undoChange: CodeChange = {
      from: this.change.from,
      to: this.change.from + this.change.insert.length,
      insert: this.oldLine,
    }
    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

export class InsertComponentCommand implements Command {
  readonly type = 'INSERT_COMPONENT'
  readonly description: string
  private parentId: string
  private component: string
  private options: AddChildOptions
  private change: CodeChange | null = null

  constructor(params: { parentId: string; component: string; position?: 'first' | 'last' | number; properties?: string; textContent?: string }) {
    this.parentId = params.parentId
    this.component = params.component
    this.options = { position: params.position, properties: params.properties, textContent: params.textContent }
    this.description = `Insert ${params.component}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    const sourceMap = ctx.getSourceMap()
    const source = ctx.getSource()
    if (!sourceMap) return { success: false, error: 'No source map' }

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild(this.parentId, this.component, this.options)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.change) return { success: false, error: 'Cannot undo' }
    const ctx = getCommandContext()
    const undoChange: CodeChange = {
      from: this.change.from,
      to: this.change.from + this.change.insert.length,
      insert: '',
    }
    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

export class DeleteNodeCommand implements Command {
  readonly type = 'DELETE_NODE'
  readonly description: string
  private nodeId: string
  private deletedContent: string | null = null
  private change: CodeChange | null = null

  constructor(params: { nodeId: string }) {
    this.nodeId = params.nodeId
    this.description = `Delete node ${params.nodeId}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    const sourceMap = ctx.getSourceMap()
    const source = ctx.getSource()
    if (!sourceMap) return { success: false, error: 'No source map' }

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.removeNode(this.nodeId)
    if (!result.success) return { success: false, error: result.error }

    this.deletedContent = source.substring(result.change.from, result.change.to)
    this.change = result.change
    ctx.applyChange(result.change)

    if (state.get().selection.nodeId === this.nodeId) {
      actions.setSelection(null, 'keyboard')
    }
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.change || !this.deletedContent) return { success: false, error: 'Cannot undo' }
    const ctx = getCommandContext()
    const undoChange: CodeChange = { from: this.change.from, to: this.change.from, insert: this.deletedContent }
    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

export class MoveNodeCommand implements Command {
  readonly type = 'MOVE_NODE'
  readonly description: string
  private nodeId: string
  private targetId: string
  private placement: 'before' | 'after' | 'inside'
  private originalSource: string | null = null
  private change: CodeChange | null = null

  constructor(params: { nodeId: string; targetId: string; position: 'before' | 'after' | 'inside' }) {
    this.nodeId = params.nodeId
    this.targetId = params.targetId
    this.placement = params.position
    this.description = `Move node ${params.nodeId} ${params.position} ${params.targetId}`
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    const sourceMap = ctx.getSourceMap()
    const source = ctx.getSource()
    if (!sourceMap) return { success: false, error: 'No source map' }

    this.originalSource = source
    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.moveNode(this.nodeId, this.targetId, this.placement)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    ctx.applyChange(result.change)
    return { success: true, change: result.change }
  }

  undo(): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }
    const ctx = getCommandContext()
    const currentSource = ctx.getSource()
    const undoChange: CodeChange = { from: 0, to: currentSource.length, insert: this.originalSource }
    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

export class UpdateSourceCommand implements Command {
  readonly type = 'UPDATE_SOURCE'
  readonly description = 'Update source code'
  private change: CodeChange
  private inverseChange: CodeChange | null = null

  constructor(params: { from: number; to: number; insert: string }) {
    this.change = params
  }

  execute(): CommandResult {
    const ctx = getCommandContext()
    const source = ctx.getSource()
    this.inverseChange = {
      from: this.change.from,
      to: this.change.from + this.change.insert.length,
      insert: source.substring(this.change.from, this.change.to),
    }
    ctx.applyChange(this.change)
    return { success: true, change: this.change }
  }

  undo(): CommandResult {
    if (!this.inverseChange) return { success: false, error: 'Cannot undo' }
    const ctx = getCommandContext()
    ctx.applyChange(this.inverseChange)
    return { success: true, change: this.inverseChange }
  }
}

/**
 * RecordedChangeCommand - For changes already applied externally (e.g., by PropertyPanel)
 * This command doesn't execute anything - it just records a change for undo/redo.
 * execute() is a no-op (returns success immediately)
 * undo() applies the inverse change
 * redo (via execute()) re-applies the original change
 */
export class RecordedChangeCommand implements Command {
  readonly type = 'RECORDED_CHANGE'
  readonly description: string
  private change: CodeChange
  private inverseChange: CodeChange
  private isFirstExecution = true

  constructor(params: { change: CodeChange; inverseChange: CodeChange; description?: string }) {
    this.change = params.change
    this.inverseChange = params.inverseChange
    this.description = params.description || 'Recorded change'
  }

  execute(): CommandResult {
    // First execution is a no-op (change already applied)
    // Subsequent executions (redo) apply the change
    if (this.isFirstExecution) {
      this.isFirstExecution = false
      return { success: true, change: this.change }
    }
    const ctx = getCommandContext()
    ctx.applyChange(this.change)
    return { success: true, change: this.change }
  }

  undo(): CommandResult {
    const ctx = getCommandContext()
    ctx.applyChange(this.inverseChange)
    return { success: true, change: this.inverseChange }
  }
}

export class BatchCommand implements Command {
  readonly type = 'BATCH'
  readonly description: string
  private commands: Command[]
  private executedCommands: Command[] = []

  constructor(params: { commands: Command[]; description?: string }) {
    this.commands = params.commands
    this.description = params.description || `Batch of ${params.commands.length} commands`
  }

  execute(): CommandResult {
    this.executedCommands = []
    for (const command of this.commands) {
      const result = command.execute()
      if (!result.success) {
        for (const executed of this.executedCommands.reverse()) executed.undo()
        return { success: false, error: `Batch failed at ${command.type}: ${result.error}` }
      }
      this.executedCommands.push(command)
    }
    return { success: true }
  }

  undo(): CommandResult {
    for (const command of [...this.executedCommands].reverse()) {
      const result = command.undo()
      if (!result.success) return { success: false, error: `Batch undo failed at ${command.type}: ${result.error}` }
    }
    this.executedCommands = []
    return { success: true }
  }
}

export type CommandType = 'SET_PROPERTY' | 'REMOVE_PROPERTY' | 'INSERT_COMPONENT' | 'DELETE_NODE' | 'MOVE_NODE' | 'UPDATE_SOURCE' | 'BATCH'

export function createCommand(type: CommandType, params: Record<string, any>): Command {
  switch (type) {
    case 'SET_PROPERTY': return new SetPropertyCommand(params as any)
    case 'REMOVE_PROPERTY': return new RemovePropertyCommand(params as any)
    case 'INSERT_COMPONENT': return new InsertComponentCommand(params as any)
    case 'DELETE_NODE': return new DeleteNodeCommand(params as any)
    case 'MOVE_NODE': return new MoveNodeCommand(params as any)
    case 'UPDATE_SOURCE': return new UpdateSourceCommand(params as any)
    case 'BATCH': return new BatchCommand(params as any)
    default: throw new Error(`Unknown command type: ${type}`)
  }
}

export function parseCommandFromLLM(commandData: { type: string; [key: string]: any }): Command {
  const { type, ...params } = commandData
  return createCommand(type as CommandType, params)
}
