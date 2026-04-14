/**
 * Command Pattern Implementation for Studio
 */

import { state, actions } from './state'
import type { SourceMap } from '../../compiler/ir/source-map'
import {
  CodeModifier,
  type CodeChange,
  type AddChildOptions,
} from '../../compiler/studio/code-modifier'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('Commands')

export interface Command {
  readonly type: string
  readonly description: string
  execute(ctx: CommandContext): CommandResult
  undo(ctx: CommandContext): CommandResult
}

export interface CommandResult {
  success: boolean
  error?: string
  change?: CodeChange
}

export interface CommandContext {
  getSourceMap(): SourceMap | null
  /** Get editor source (current file only, without prelude) */
  getSource(): string
  /** Get resolved source (with prelude) for CodeModifier - matches SourceMap positions */
  getResolvedSource(): string
  /** Get prelude character offset (to adjust CodeModifier changes for editor) */
  getPreludeOffset(): number
  applyChange(change: CodeChange): void
  compile(): void
  /** Clear selection through SyncCoordinator (optional, falls back to direct action) */
  clearSelection?: (origin: 'keyboard') => void
}

// Legacy: Global command context for backward compatibility
// Will be removed in future version - use CommandExecutor with injected context instead
let legacyCommandContext: CommandContext | null = null

/** @deprecated Use CommandExecutor with injected context instead */
export function setCommandContext(context: CommandContext): void {
  legacyCommandContext = context
}

/** @deprecated Commands now receive context as parameter */
export function getCommandContext(): CommandContext {
  if (!legacyCommandContext) {
    throw new Error('Command context not initialized. Use CommandExecutor with injected context.')
  }
  return legacyCommandContext
}

/**
 * Adjust a CodeModifier change for the editor.
 * CodeModifier operates on resolved source (with prelude), but editor only has current file.
 * This subtracts the prelude offset from change positions.
 */
function adjustChangeForEditor(change: CodeChange, ctx: CommandContext): CodeChange {
  const offset = ctx.getPreludeOffset()
  // DEBUG
  console.log('[adjustChangeForEditor] preludeOffset:', offset)
  console.log('[adjustChangeForEditor] original change:', change)
  if (offset === 0) return change
  const adjusted = {
    from: change.from - offset,
    to: change.to - offset,
    insert: change.insert,
  }
  console.log('[adjustChangeForEditor] adjusted change:', adjusted)
  return adjusted
}

/**
 * Get source and modifier for commands.
 * Returns resolved source (with prelude) for CodeModifier to match SourceMap positions.
 */
function getSourceForModifier(
  ctx: CommandContext
): { source: string; sourceMap: SourceMap } | null {
  const sourceMap = ctx.getSourceMap()
  if (!sourceMap) return null
  // Use resolved source so CodeModifier positions match SourceMap
  const source = ctx.getResolvedSource()
  return { source, sourceMap }
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

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.updateProperty(this.nodeId, this.property, this.newValue)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    this.oldValue = data.source.substring(result.change.from, result.change.to)
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.change || this.oldValue === null) return { success: false, error: 'Cannot undo' }
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.updateProperty(this.nodeId, this.property, this.oldValue)
    if (!result.success) return { success: false, error: result.error }
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)
    return { success: true, change: editorChange }
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

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    const node = data.sourceMap.getNodeById(this.nodeId)
    if (!node) return { success: false, error: `Node not found: ${this.nodeId}` }
    this.oldLine = data.source.split('\n')[node.position.line - 1]

    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.removeProperty(this.nodeId, this.property)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.change || !this.oldLine) return { success: false, error: 'Cannot undo' }
    const offset = ctx.getPreludeOffset()
    const undoChange: CodeChange = {
      from: this.change.from - offset,
      to: this.change.from - offset + this.change.insert.length,
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

  constructor(params: {
    parentId: string
    component: string
    position?: 'first' | 'last' | number
    properties?: string
    textContent?: string
  }) {
    this.parentId = params.parentId
    this.component = params.component
    this.options = {
      position: params.position,
      properties: params.properties,
      textContent: params.textContent,
    }
    this.description = `Insert ${params.component}`
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.addChild(this.parentId, this.component, this.options)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.change) return { success: false, error: 'Cannot undo' }
    const offset = ctx.getPreludeOffset()
    const undoChange: CodeChange = {
      from: this.change.from - offset,
      to: this.change.from - offset + this.change.insert.length,
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
  // Store fallback info BEFORE deletion for robust selection recovery
  private fallbackInfo: {
    parentId?: string
    nextSiblingId?: string
    prevSiblingId?: string
  } = {}

  constructor(params: { nodeId: string }) {
    this.nodeId = params.nodeId
    this.description = `Delete node ${params.nodeId}`
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store fallback info BEFORE deletion for robust selection recovery
    // Priority: next sibling → previous sibling → parent
    const node = data.sourceMap.getNodeById(this.nodeId)
    if (node) {
      this.fallbackInfo.parentId = node.parentId
      const nextSibling = data.sourceMap.getNextSibling(this.nodeId)
      const prevSibling = data.sourceMap.getPreviousSibling(this.nodeId)
      this.fallbackInfo.nextSiblingId = nextSibling?.nodeId
      this.fallbackInfo.prevSiblingId = prevSibling?.nodeId
    }

    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.removeNode(this.nodeId)
    if (!result.success) return { success: false, error: result.error }

    this.deletedContent = data.source.substring(result.change.from, result.change.to)
    this.change = result.change
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)

    // Selection recovery: use pre-computed fallback info
    // The actual selection will be set after compile via setCompileResult
    // But we queue a selection hint so the system knows what to select
    if (state.get().selection.nodeId === this.nodeId) {
      // Queue the fallback selection - will be resolved after compile
      // Priority: next sibling → previous sibling → parent
      const fallbackId =
        this.fallbackInfo.nextSiblingId ||
        this.fallbackInfo.prevSiblingId ||
        this.fallbackInfo.parentId

      if (fallbackId) {
        // Queue selection to be resolved after compile
        state.set({ queuedSelection: { nodeId: fallbackId, origin: 'keyboard' } })
      } else if (ctx.clearSelection) {
        ctx.clearSelection('keyboard')
      } else {
        actions.setSelection(null, 'keyboard')
      }
    }
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.change || !this.deletedContent) return { success: false, error: 'Cannot undo' }
    const offset = ctx.getPreludeOffset()
    const undoChange: CodeChange = {
      from: this.change.from - offset,
      to: this.change.from - offset,
      insert: this.deletedContent,
    }
    ctx.applyChange(undoChange)

    // Re-select the restored node after undo
    // Queue selection to be resolved after compile
    state.set({ queuedSelection: { nodeId: this.nodeId, origin: 'keyboard' } })

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

  constructor(params: {
    nodeId: string
    targetId: string
    position: 'before' | 'after' | 'inside'
  }) {
    this.nodeId = params.nodeId
    this.targetId = params.targetId
    this.placement = params.position
    this.description = `Move node ${params.nodeId} ${params.position} ${params.targetId}`
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store original editor source for undo (without prelude)
    this.originalSource = ctx.getSource()
    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.moveNode(this.nodeId, this.targetId, this.placement)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)
    state.set({ queuedSelection: { nodeId: this.nodeId, origin: 'keyboard' } })
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }
    const currentSource = ctx.getSource()
    const undoChange: CodeChange = {
      from: 0,
      to: currentSource.length,
      insert: this.originalSource,
    }
    ctx.applyChange(undoChange)
    state.set({ queuedSelection: { nodeId: this.nodeId, origin: 'keyboard' } })
    return { success: true, change: undoChange }
  }
}

/**
 * MoveNodeWithLayoutCommand - Move with layout transition support
 *
 * Handles moves between different layout types:
 * - Flex → Absolute: Add x, y properties
 * - Absolute → Flex: Remove x, y properties
 * - Absolute → Absolute: Update x, y properties
 */
export class MoveNodeWithLayoutCommand implements Command {
  readonly type = 'MOVE_NODE_WITH_LAYOUT'
  readonly description: string
  private nodeId: string
  private targetId: string
  private placement: 'before' | 'after' | 'inside'
  private layoutTransition?: {
    from: 'flex' | 'absolute'
    to: 'flex' | 'absolute'
    absolutePosition?: { x: number; y: number }
  }
  private originalSource: string | null = null

  constructor(params: {
    nodeId: string
    targetId: string
    position: 'before' | 'after' | 'inside'
    layoutTransition?: {
      from: 'flex' | 'absolute'
      to: 'flex' | 'absolute'
      absolutePosition?: { x: number; y: number }
    }
  }) {
    this.nodeId = params.nodeId
    this.targetId = params.targetId
    this.placement = params.position
    this.layoutTransition = params.layoutTransition
    this.description = this.buildDescription()
  }

  private buildDescription(): string {
    let desc = `Move node ${this.nodeId} ${this.placement} ${this.targetId}`
    if (this.layoutTransition) {
      const { from, to } = this.layoutTransition
      if (from !== to) {
        desc += ` (${from} → ${to})`
      } else if (to === 'absolute' && this.layoutTransition.absolutePosition) {
        const { x, y } = this.layoutTransition.absolutePosition
        desc += ` (x: ${x}, y: ${y})`
      }
    }
    return desc
  }

  /**
   * Validate a coordinate value
   * Returns null if invalid (undefined, NaN, Infinity)
   * Returns clamped, rounded integer if valid (minimum 0)
   */
  private validateCoordinate(value: number | undefined): number | null {
    if (value === undefined || value === null) {
      log.warn('MoveNodeWithLayoutCommand: Coordinate is undefined')
      return null
    }
    if (!Number.isFinite(value)) {
      log.warn('MoveNodeWithLayoutCommand: Coordinate is not finite:', value)
      return null
    }
    // Round to integer and clamp to minimum of 0
    return Math.max(0, Math.round(value))
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store original editor source for undo
    this.originalSource = ctx.getSource()

    let source = data.source
    const modifier = new CodeModifier(source, data.sourceMap)

    // Step 1: Move the node to the new location
    const moveResult = modifier.moveNode(this.nodeId, this.targetId, this.placement)
    if (!moveResult.success) return { success: false, error: moveResult.error }
    source = moveResult.newSource

    // Step 2: Handle layout transitions (if any)
    // CRITICAL: Reuse the SAME modifier instance that did the move operation.
    // CodeModifier tracks line shifts internally, so using a new instance with
    // the old SourceMap would cause it to look up stale line positions.
    if (this.layoutTransition) {
      const { from, to, absolutePosition } = this.layoutTransition

      if (from === 'flex' && to === 'absolute' && absolutePosition) {
        // Validate coordinates before applying
        const x = this.validateCoordinate(absolutePosition.x)
        const y = this.validateCoordinate(absolutePosition.y)

        if (x !== null && y !== null) {
          // Flex → Absolute: Add x, y properties
          // Use the SAME modifier instance that did the move
          const xResult = modifier.updateProperty(this.nodeId, 'x', String(x))
          if (xResult.success) {
            source = xResult.newSource
            // Reuse same modifier - it has updated internal state
            const yResult = modifier.updateProperty(this.nodeId, 'y', String(y))
            if (yResult.success) source = yResult.newSource
          }
        }
      } else if (from === 'absolute' && to === 'flex') {
        // Absolute → Flex: Remove x, y properties
        const xResult = modifier.removeProperty(this.nodeId, 'x')
        if (xResult.success) {
          source = xResult.newSource
          // Reuse same modifier
          const yResult = modifier.removeProperty(this.nodeId, 'y')
          if (yResult.success) source = yResult.newSource
        }
      } else if (from === 'absolute' && to === 'absolute' && absolutePosition) {
        // Validate coordinates before applying
        const x = this.validateCoordinate(absolutePosition.x)
        const y = this.validateCoordinate(absolutePosition.y)

        if (x !== null && y !== null) {
          // Absolute → Absolute: Update x, y properties
          // Use the SAME modifier instance that did the move
          const xResult = modifier.updateProperty(this.nodeId, 'x', String(x))
          if (xResult.success) {
            source = xResult.newSource
            // Reuse same modifier
            const yResult = modifier.updateProperty(this.nodeId, 'y', String(y))
            if (yResult.success) source = yResult.newSource
          }
        }
      }
    }

    // Apply full document change
    const preludeOffset = ctx.getPreludeOffset()
    const newEditorContent = preludeOffset > 0 ? source.substring(preludeOffset) : source
    const editorChange: CodeChange = {
      from: 0,
      to: this.originalSource.length,
      insert: newEditorContent,
    }

    ctx.applyChange(editorChange)
    state.set({ queuedSelection: { nodeId: this.nodeId, origin: 'drag-drop' } })
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }
    const currentSource = ctx.getSource()
    const undoChange: CodeChange = {
      from: 0,
      to: currentSource.length,
      insert: this.originalSource,
    }
    ctx.applyChange(undoChange)
    state.set({ queuedSelection: { nodeId: this.nodeId, origin: 'drag-drop' } })
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

  execute(ctx: CommandContext): CommandResult {
    const source = ctx.getSource()
    this.inverseChange = {
      from: this.change.from,
      to: this.change.from + this.change.insert.length,
      insert: source.substring(this.change.from, this.change.to),
    }
    ctx.applyChange(this.change)
    return { success: true, change: this.change }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.inverseChange) return { success: false, error: 'Cannot undo' }
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

  execute(ctx: CommandContext): CommandResult {
    // First execution is a no-op (change already applied)
    // Subsequent executions (redo) apply the change
    if (this.isFirstExecution) {
      this.isFirstExecution = false
      return { success: true, change: this.change }
    }
    ctx.applyChange(this.change)
    return { success: true, change: this.change }
  }

  undo(ctx: CommandContext): CommandResult {
    ctx.applyChange(this.inverseChange)
    return { success: true, change: this.inverseChange }
  }
}

export class WrapNodesCommand implements Command {
  readonly type = 'WRAP_NODES'
  readonly description: string
  private nodeIds: string[]
  private wrapperName: string
  private wrapperProps?: string
  private originalSource: string | null = null
  private change: CodeChange | null = null

  constructor(params: { nodeIds: string[]; wrapperName?: string; wrapperProps?: string }) {
    this.nodeIds = params.nodeIds
    this.wrapperName = params.wrapperName || 'Box'
    this.wrapperProps = params.wrapperProps
    this.description = `Wrap ${params.nodeIds.length} nodes in ${this.wrapperName}`
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store editor source for undo (without prelude)
    this.originalSource = ctx.getSource()
    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.wrapNodes(this.nodeIds, this.wrapperName, this.wrapperProps)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }
    const currentSource = ctx.getSource()
    const undoChange: CodeChange = {
      from: 0,
      to: currentSource.length,
      insert: this.originalSource,
    }
    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

export class UnwrapNodeCommand implements Command {
  readonly type = 'UNWRAP_NODE'
  readonly description: string
  private nodeId: string
  private originalSource: string | null = null
  private change: CodeChange | null = null

  constructor(params: { nodeId: string }) {
    this.nodeId = params.nodeId
    this.description = `Unwrap node ${params.nodeId}`
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store editor source for undo (without prelude)
    this.originalSource = ctx.getSource()
    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.unwrapNode(this.nodeId)
    if (!result.success) return { success: false, error: result.error }

    this.change = result.change
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)

    // Clear selection since the unwrapped node no longer exists
    if (state.get().selection.nodeId === this.nodeId) {
      actions.setSelection(null, 'keyboard')
    }

    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }
    const currentSource = ctx.getSource()
    const undoChange: CodeChange = {
      from: 0,
      to: currentSource.length,
      insert: this.originalSource,
    }
    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
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

  execute(ctx: CommandContext): CommandResult {
    this.executedCommands = []
    for (const command of this.commands) {
      const result = command.execute(ctx)
      if (!result.success) {
        for (const executed of this.executedCommands.reverse()) executed.undo(ctx)
        return { success: false, error: `Batch failed at ${command.type}: ${result.error}` }
      }
      this.executedCommands.push(command)
    }
    return { success: true }
  }

  undo(ctx: CommandContext): CommandResult {
    for (const command of [...this.executedCommands].reverse()) {
      const result = command.undo(ctx)
      if (!result.success)
        return { success: false, error: `Batch undo failed at ${command.type}: ${result.error}` }
    }
    this.executedCommands = []
    return { success: true }
  }
}

/**
 * ResizeCommand - Set width and/or height properties on a node
 *
 * Supports sizing modes:
 * - 'full' → w full / h full
 * - 'hug' → w hug / h hug
 * - number → w <px> / h <px>
 */
export class ResizeCommand implements Command {
  readonly type = 'RESIZE'
  readonly description: string
  private nodeId: string
  private width?: 'full' | 'hug' | number
  private height?: 'full' | 'hug' | number
  private originalSource: string | null = null

  constructor(params: {
    nodeId: string
    width?: 'full' | 'hug' | number
    height?: 'full' | 'hug' | number
  }) {
    this.nodeId = params.nodeId
    this.width = params.width
    this.height = params.height

    const wStr = this.width === undefined ? '' : ` w=${this.formatSizing(this.width)}`
    const hStr = this.height === undefined ? '' : ` h=${this.formatSizing(this.height)}`
    this.description = `Resize${wStr}${hStr}`
  }

  private formatSizing(value: 'full' | 'hug' | number): string {
    if (typeof value === 'number') return `${value}`
    return value
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store editor source for undo (without prelude)
    this.originalSource = ctx.getSource()
    let source = data.source
    const preludeOffset = ctx.getPreludeOffset()

    // Apply width change
    if (this.width !== undefined) {
      const modifier = new CodeModifier(source, data.sourceMap)
      const result = modifier.updateProperty(this.nodeId, 'w', this.formatSizing(this.width))
      if (!result.success) {
        return { success: false, error: result.error }
      }
      source = result.newSource
    }

    // Apply height change (on updated source)
    if (this.height !== undefined) {
      // Note: We reuse the same sourceMap here. This works because updateProperty
      // only uses line numbers which don't change when we modify the same line.
      const modifier = new CodeModifier(source, data.sourceMap)
      const result = modifier.updateProperty(this.nodeId, 'h', this.formatSizing(this.height))
      if (!result.success) {
        return { success: false, error: result.error }
      }
      source = result.newSource
    }

    // Extract the part after prelude (the editor content)
    const newEditorContent = preludeOffset > 0 ? source.substring(preludeOffset) : source

    // Apply full document change to editor
    const change: CodeChange = {
      from: 0,
      to: this.originalSource.length,
      insert: newEditorContent,
    }

    ctx.applyChange(change)
    return { success: true, change }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.originalSource) {
      return { success: false, error: 'Cannot undo' }
    }

    const currentSource = ctx.getSource()
    const undoChange: CodeChange = {
      from: 0,
      to: currentSource.length,
      insert: this.originalSource,
    }

    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

/**
 * SetPositionCommand - Update x and y position properties atomically
 *
 * Used for keyboard navigation (arrow keys) and position panel updates.
 * Handles both adding new x/y properties and updating existing ones.
 */
export class SetPositionCommand implements Command {
  readonly type = 'SET_POSITION'
  readonly description: string
  private nodeId: string
  private x: number
  private y: number
  private originalSource: string | null = null

  constructor(params: { nodeId: string; x: number; y: number; description?: string }) {
    this.nodeId = params.nodeId
    this.x = params.x
    this.y = params.y
    this.description = params.description || `Set position (${params.x}, ${params.y})`
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store editor source for undo (without prelude)
    this.originalSource = ctx.getSource()
    let source = data.source
    const preludeOffset = ctx.getPreludeOffset()

    // Update x property
    const xModifier = new CodeModifier(source, data.sourceMap)
    const xResult = xModifier.updateProperty(this.nodeId, 'x', String(this.x))
    if (!xResult.success) {
      return { success: false, error: xResult.error }
    }
    source = xResult.newSource

    // Update y property (on updated source)
    const yModifier = new CodeModifier(source, data.sourceMap)
    const yResult = yModifier.updateProperty(this.nodeId, 'y', String(this.y))
    if (!yResult.success) {
      return { success: false, error: yResult.error }
    }
    source = yResult.newSource

    // Extract the part after prelude (the editor content)
    const newEditorContent = preludeOffset > 0 ? source.substring(preludeOffset) : source

    // Apply full document change to editor
    const change: CodeChange = {
      from: 0,
      to: this.originalSource.length,
      insert: newEditorContent,
    }

    ctx.applyChange(change)
    return { success: true, change }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.originalSource) {
      return { success: false, error: 'Cannot undo' }
    }

    const currentSource = ctx.getSource()
    const undoChange: CodeChange = {
      from: 0,
      to: currentSource.length,
      insert: this.originalSource,
    }

    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

/**
 * SetTextContentCommand - Update text content of a text element
 *
 * Used for inline text editing (double-click to edit in preview).
 * Updates the quoted text content in the source code.
 */
export class SetTextContentCommand implements Command {
  readonly type = 'SET_TEXT_CONTENT'
  readonly description: string
  private nodeId: string
  private newText: string
  private oldText: string | null = null
  private originalSource: string | null = null

  constructor(params: { nodeId: string; text: string; description?: string }) {
    this.nodeId = params.nodeId
    this.newText = params.text
    this.description =
      params.description ||
      `Set text to "${params.text.substring(0, 20)}${params.text.length > 20 ? '...' : ''}"`
  }

  execute(ctx: CommandContext): CommandResult {
    const data = getSourceForModifier(ctx)
    if (!data) return { success: false, error: 'No source map' }

    // Store original source for undo
    this.originalSource = ctx.getSource()

    const modifier = new CodeModifier(data.source, data.sourceMap)
    const result = modifier.updateTextContent(this.nodeId, this.newText)
    if (!result.success) return { success: false, error: result.error }

    this.oldText = result.oldText || null

    // Apply the change (adjusted for prelude offset)
    const editorChange = adjustChangeForEditor(result.change, ctx)
    ctx.applyChange(editorChange)
    return { success: true, change: editorChange }
  }

  undo(ctx: CommandContext): CommandResult {
    if (!this.originalSource) return { success: false, error: 'Cannot undo' }

    const currentSource = ctx.getSource()
    const undoChange: CodeChange = {
      from: 0,
      to: currentSource.length,
      insert: this.originalSource,
    }

    ctx.applyChange(undoChange)
    return { success: true, change: undoChange }
  }
}

export type CommandType =
  | 'SET_PROPERTY'
  | 'REMOVE_PROPERTY'
  | 'INSERT_COMPONENT'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'MOVE_NODE_WITH_LAYOUT'
  | 'UPDATE_SOURCE'
  | 'WRAP_NODES'
  | 'UNWRAP_NODE'
  | 'BATCH'
  | 'RESIZE'
  | 'SET_POSITION'
  | 'SET_TEXT_CONTENT'

export function createCommand(type: CommandType, params: Record<string, any>): Command {
  switch (type) {
    case 'SET_PROPERTY':
      return new SetPropertyCommand(params as any)
    case 'REMOVE_PROPERTY':
      return new RemovePropertyCommand(params as any)
    case 'INSERT_COMPONENT':
      return new InsertComponentCommand(params as any)
    case 'DELETE_NODE':
      return new DeleteNodeCommand(params as any)
    case 'MOVE_NODE':
      return new MoveNodeCommand(params as any)
    case 'MOVE_NODE_WITH_LAYOUT':
      return new MoveNodeWithLayoutCommand(params as any)
    case 'UPDATE_SOURCE':
      return new UpdateSourceCommand(params as any)
    case 'WRAP_NODES':
      return new WrapNodesCommand(params as any)
    case 'UNWRAP_NODE':
      return new UnwrapNodeCommand(params as any)
    case 'BATCH':
      return new BatchCommand(params as any)
    case 'RESIZE':
      return new ResizeCommand(params as any)
    case 'SET_POSITION':
      return new SetPositionCommand(params as any)
    case 'SET_TEXT_CONTENT':
      return new SetTextContentCommand(params as any)
    default:
      throw new Error(`Unknown command type: ${type}`)
  }
}

export function parseCommandFromLLM(commandData: { type: string; [key: string]: any }): Command {
  const { type, ...params } = commandData
  return createCommand(type as CommandType, params)
}
