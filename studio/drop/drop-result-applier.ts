/**
 * Drop Result Applier
 *
 * Applies code changes from drop operations to the editor.
 * Handles offset adjustments, validation, undo recording.
 */

import type { ModificationResult } from './types'
import type { Command, CommandContext, CommandResult } from '../core/commands'
import { adjustChangeForEditor } from './change-offset'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('DropResultApplier')

export interface ApplierDependencies {
  editor: CodeMirrorEditor
  preludeOffset: number
  /** Number of prelude lines (for indent correction in wrapped code) */
  preludeLineOffset: number
  /** Full resolved source code (prelude + user code) */
  resolvedSource: string
  /** Whether user code was wrapped with App and indented */
  isWrappedWithApp: boolean
  executor: CommandExecutor
  events: EventBus
  compile: (code: string) => void
  save: (code: string) => void
  /**
   * Defer a line-based selection — resolved by setCompileResult after the
   * post-drop compile finishes. The applier wraps a `{ type: 'line', ... }`
   * payload around the inserted line; callers (app-adapter / test-harness)
   * forward this to `actions.setDeferredSelection`.
   */
  setDeferredLineSelection: (selection: DeferredLineSelection) => void
}

interface CodeMirrorEditor {
  state: { doc: { length: number; toString: () => string; lineAt: (pos: number) => Line } }
  dispatch: (spec: DispatchSpec) => void
}

interface Line {
  number: number
}

interface DispatchSpec {
  changes: Change
  annotations: unknown
}

interface Change {
  from: number
  to: number
  insert: string
}

interface CommandExecutor {
  execute: (command: Command) => CommandResult
}

interface EventBus {
  emit: (event: string, data: unknown) => void
}

/**
 * Command for drop operations that have already been applied.
 * Execute is a no-op since the change is already applied.
 * Undo applies the inverse change.
 */
class DropChangeCommand implements Command {
  readonly type = 'DROP_CHANGE'
  readonly description: string

  constructor(
    private change: Change,
    private inverseChange: Change
  ) {
    this.description = 'Drop component'
  }

  execute(_ctx: CommandContext): CommandResult {
    // Change was already applied before this command was created
    // This is a "recorded" command - execute does nothing
    return { success: true, change: this.change }
  }

  undo(ctx: CommandContext): CommandResult {
    // Apply the inverse change to undo
    ctx.applyChange(this.inverseChange)
    return { success: true, change: this.inverseChange }
  }
}

/** `DeferredSelection` shape for `type: 'line'` — see core/state-types. */
interface DeferredLineSelection {
  type: 'line'
  line: number
  componentName: string
  origin: string
}

export class DropResultApplier {
  constructor(private deps: ApplierDependencies) {}

  apply(result: ModificationResult, componentName: string): void {
    if (!this.isValidResult(result)) {
      return
    }

    const change = this.adjustChange(result.change!)

    if (!this.isValidChange(change)) {
      return
    }

    this.applyToEditor(change)
    this.recordForUndo(change)
    this.emitEvent(change)
    this.deferLineSelection(change, componentName)
    this.compileAndSave()
  }

  private isValidResult(result: ModificationResult): boolean {
    return result.success && !!result.change
  }

  private adjustChange(change: Change): Change {
    return adjustChangeForEditor(
      change,
      {
        preludeOffset: this.deps.preludeOffset,
        isWrappedWithApp: this.deps.isWrappedWithApp,
        resolvedSource: this.deps.resolvedSource,
      },
      this.deps.editor.state.doc.length
    )
  }

  private isValidChange(change: Change): boolean {
    const docLength = this.deps.editor.state.doc.length
    const valid = change.from >= 0 && change.to <= docLength && change.from <= change.to
    if (!valid) this.logInvalidChange(change, docLength)
    return valid
  }

  private logInvalidChange(change: Change, docLength: number): void {
    log.warn(
      'Invalid change range:',
      'from=' + change.from,
      'to=' + change.to,
      'insertLen=' + change.insert.length,
      'docLen=' + docLength,
      'prelude=' + this.deps.preludeOffset
    )
  }

  private applyToEditor(change: Change): void {
    this.deps.editor.dispatch({
      changes: change,
      annotations: { type: 'input.drop' } as unknown,
    })
  }

  private recordForUndo(change: Change): void {
    const inverse = this.calculateInverse(change)
    const command = this.createCommand(change, inverse)
    this.deps.executor.execute(command)
  }

  private calculateInverse(change: Change): Change {
    const source = this.deps.editor.state.doc.toString()
    return {
      from: change.from,
      to: change.from + change.insert.length,
      insert: source.substring(change.from, change.to),
    }
  }

  private createCommand(change: Change, inverse: Change): Command {
    return new DropChangeCommand(change, inverse)
  }

  private emitEvent(change: Change): void {
    this.deps.events.emit('source:changed', {
      source: this.deps.editor.state.doc.toString(),
      origin: 'drag-drop',
      change,
    })
  }

  private deferLineSelection(change: Change, componentName: string): void {
    const line = this.deps.editor.state.doc.lineAt(change.from)
    this.deps.setDeferredLineSelection({
      type: 'line',
      line: line.number,
      componentName,
      origin: 'drag-drop',
    })
  }

  private compileAndSave(): void {
    const code = this.deps.editor.state.doc.toString()
    this.deps.compile(code)
    this.deps.save(code)
  }
}
