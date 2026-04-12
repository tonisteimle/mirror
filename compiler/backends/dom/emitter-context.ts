/**
 * Emitter Context Interface
 *
 * Shared interface for all DOM emitter modules. This abstracts the methods
 * needed by extracted emitters, allowing them to be decoupled from DOMGenerator
 * while still having access to necessary functionality.
 */

import type { IRNode, IRStyle, IRSlot, IREach, IRConditional, IRTable, IRStateMachine, IRStateTransition } from '../../ir/types'

/**
 * Deferred when watcher - emitted after DOM is built
 */
export interface DeferredWhenWatcher {
  varName: string
  transition: IRStateTransition
  sm: IRStateMachine
}

/**
 * Context provided to emitter modules for code generation.
 *
 * This interface allows emitter modules to:
 * - Emit lines of code with proper indentation
 * - Manage indentation levels
 * - Sanitize variable names
 * - Escape strings safely
 * - Emit child nodes recursively
 * - Apply styles to elements
 */
export interface EmitterContext {
  /** Emit a line of code with current indentation */
  emit(line: string): void

  /** Emit a line of code without indentation */
  emitRaw(line: string): void

  /** Get current indentation level */
  getIndent(): number

  /** Set indentation level */
  setIndent(level: number): void

  /** Increment indentation */
  indentIn(): void

  /** Decrement indentation */
  indentOut(): void

  /** Sanitize an ID for use as a JavaScript variable name */
  sanitizeVarName(id: string): string

  /** Escape a string for safe inclusion in JavaScript */
  escapeString(str: string | number | boolean | undefined | null): string

  /** Emit a child node */
  emitNode(node: IRNode, parentVar: string): void

  /** Emit styles for an element */
  emitStyles(varName: string, styles: IRStyle[]): void

  /** Emit styles for a slot element */
  emitSlotStyles(varName: string, slot: IRSlot | undefined): void

  /** Get deferred when watchers */
  getDeferredWhenWatchers(): DeferredWhenWatcher[]

  /** Add a deferred when watcher */
  addDeferredWhenWatcher(watcher: DeferredWhenWatcher): void

  /** Emit state machine for a node */
  emitStateMachine(varName: string, node: IRNode): void

  /** Emit an each loop */
  emitEachLoop(each: IREach, parentVar: string): void

  /** Emit a conditional */
  emitConditional(cond: IRConditional, parentVar: string): void

  /** Emit an each template node */
  emitEachTemplateNode(node: IRNode, parentVar: string, itemVar: string, indexVar?: string): void

  /** Emit a conditional template node */
  emitConditionalTemplateNode(node: IRNode, parentVar: string): void

  /** Resolve template value (for data binding in loops) */
  resolveTemplateValue(value: unknown, itemVar: string, indexVar: string): string

  /** Resolve template style value */
  resolveTemplateStyleValue(value: string, itemVar: string): string

  /** Resolve condition variables */
  resolveConditionVariables(condition: string): string

  /** Resolve content value */
  resolveContentValue(value: unknown): string
}

/**
 * Type for an emitter function that operates on a specific node type
 */
export type EmitterFn<T> = (
  node: T,
  parentVar: string,
  ctx: EmitterContext
) => void
