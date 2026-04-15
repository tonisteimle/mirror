/**
 * Drop Result Applier
 *
 * Applies code changes from drop operations to the editor.
 * Handles offset adjustments, validation, undo recording.
 */

import type { ModificationResult } from './types'
import type { Command, CommandContext, CommandResult } from '../core/commands'

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
  setPendingSelection: (selection: PendingSelection) => void
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

interface PendingSelection {
  line: number
  componentName: string
  origin: string
}

export class DropResultApplier {
  constructor(private deps: ApplierDependencies) {}

  apply(result: ModificationResult, componentName: string): void {
    if (!this.isValidResult(result)) return

    const change = this.adjustChange(result.change!)
    if (!this.isValidChange(change)) return

    this.applyToEditor(change)
    this.recordForUndo(change)
    this.emitEvent(change)
    this.setPendingSelection(change, componentName)
    this.compileAndSave()
  }

  private isValidResult(result: ModificationResult): boolean {
    return result.success && !!result.change
  }

  private adjustChange(change: Change): Change {
    const docLength = this.deps.editor.state.doc.length
    if (this.isFullReplace(change, docLength)) {
      return this.adjustFullReplace(change, docLength)
    }
    return this.adjustStandardChange(change)
  }

  private isFullReplace(change: Change, docLength: number): boolean {
    return change.from === 0 && change.to > docLength && this.deps.preludeOffset > 0
  }

  private adjustFullReplace(change: Change, docLength: number): Change {
    return {
      from: 0,
      to: docLength,
      insert: change.insert.substring(this.deps.preludeOffset),
    }
  }

  private adjustStandardChange(change: Change): Change {
    // Calculate indent correction for wrapped code
    // When code is wrapped with App, each user line gets 2 extra spaces
    // The preludeOffset accounts for the first line's indent, but not subsequent lines
    const indentCorrection = this.calculateIndentCorrection(change.from)

    return {
      from: change.from - this.deps.preludeOffset - indentCorrection,
      to: change.to - this.deps.preludeOffset - indentCorrection,
      insert: this.adjustInsertIndent(change.insert),
    }
  }

  /**
   * Calculate the indent correction for a position in the full source.
   * When code is wrapped with App, each line after the first gets 2 extra spaces.
   */
  private calculateIndentCorrection(fullPosition: number): number {
    if (!this.deps.isWrappedWithApp || !this.deps.resolvedSource) {
      return 0
    }

    // Find which line in the full source this position is on
    const textBefore = this.deps.resolvedSource.substring(0, fullPosition)
    const fullLineNumber = textBefore.split('\n').length

    // Calculate user line (1-based)
    const userLine = fullLineNumber - this.deps.preludeLineOffset

    if (userLine <= 1) {
      return 0 // First line indent is already in preludeOffset
    }

    // Each additional user line has 2 extra indent chars
    return 2 * (userLine - 1)
  }

  /**
   * Adjust the insert text to remove extra indentation from wrapped code.
   */
  private adjustInsertIndent(insert: string): string {
    if (!this.deps.isWrappedWithApp) {
      return insert
    }

    // Remove 2-space indent from each line of the insert
    return insert
      .split('\n')
      .map((line, i) => {
        // First line might be just newline, keep as-is
        if (i === 0 && line === '') return line
        // Remove 2-space indent if present
        if (line.startsWith('  ')) {
          return line.substring(2)
        }
        return line
      })
      .join('\n')
  }

  private isValidChange(change: Change): boolean {
    const docLength = this.deps.editor.state.doc.length
    const valid = change.from >= 0 && change.to <= docLength && change.from <= change.to
    if (!valid) this.logInvalidChange(change, docLength)
    return valid
  }

  private logInvalidChange(change: Change, docLength: number): void {
    console.warn(
      '[DropResultApplier] Invalid change range:',
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

  private setPendingSelection(change: Change, componentName: string): void {
    const line = this.deps.editor.state.doc.lineAt(change.from)
    this.deps.setPendingSelection({
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
