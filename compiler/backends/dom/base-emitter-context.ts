/**
 * Base Emitter Context
 *
 * Consolidated base interface for all DOM emitter modules.
 * This defines the minimal set of methods shared by all emitters.
 *
 * Architecture:
 * - BaseEmitterContext: minimal shared methods (emit, indent, escape)
 * - EmitterContext: full context with all methods (extends Base)
 * - Specialized contexts: Pick<EmitterContext, ...> for subset needs
 */

import type {
  IRNode,
  IRStyle,
  IRSlot,
  IREach,
  IRConditional,
  IRStateMachine,
  IRStateTransition,
} from '../../ir/types'

// =============================================================================
// Deferred Types
// =============================================================================

/**
 * Deferred when watcher - emitted after DOM is built
 */
export interface DeferredWhenWatcher {
  varName: string
  transition: IRStateTransition
  sm: IRStateMachine
}

// =============================================================================
// Base Context (Minimal)
// =============================================================================

/**
 * Base emitter context with minimal shared methods.
 * All emitter contexts include these methods.
 */
export interface BaseEmitterContext {
  /** Emit a line of code with current indentation */
  emit(line: string): void

  /** Increment indentation */
  indentIn(): void

  /** Decrement indentation */
  indentOut(): void

  /** Escape a string for safe inclusion in JavaScript */
  escapeString(str: string | number | boolean | undefined | null): string
}

// =============================================================================
// Full Emitter Context
// =============================================================================

/**
 * Full emitter context with all methods.
 * This is the primary context used by the main DOMGenerator.
 */
export interface EmitterContext extends BaseEmitterContext {
  /** Emit a line of code without indentation */
  emitRaw(line: string): void

  /** Get current indentation level */
  getIndent(): number

  /** Set indentation level */
  setIndent(level: number): void

  /** Sanitize an ID for use as a JavaScript variable name */
  sanitizeVarName(id: string): string

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

// =============================================================================
// Specialized Contexts (Type Aliases using Pick)
// =============================================================================

/**
 * Context for the DatePicker (sole) Zag component emitter.
 * Subset of EmitterContext with the methods used by overlay-emitters.ts.
 */
export type ZagEmitterContext = Pick<
  EmitterContext,
  | 'emit'
  | 'getIndent'
  | 'setIndent'
  | 'indentIn'
  | 'indentOut'
  | 'sanitizeVarName'
  | 'escapeString'
  | 'emitNode'
>

/**
 * Context for event emitters.
 * Minimal subset for action/event code generation.
 */
export type EventEmitterContext = Pick<
  EmitterContext,
  'emit' | 'indentIn' | 'indentOut' | 'escapeString'
>

/**
 * Context for state machine emitters.
 * Subset for state machine code generation.
 */
export type StateMachineEmitterContext = Pick<
  EmitterContext,
  'emit' | 'indentIn' | 'indentOut' | 'escapeString' | 'addDeferredWhenWatcher'
>

/**
 * Context for loop emitters.
 * Subset for each/conditional code generation.
 */
export type LoopEmitterContext = Pick<
  EmitterContext,
  | 'emit'
  | 'indentIn'
  | 'indentOut'
  | 'sanitizeVarName'
  | 'resolveConditionVariables'
  | 'emitEachTemplateNode'
  | 'emitConditionalTemplateNode'
>

// =============================================================================
// Emitter Function Types
// =============================================================================

/**
 * Type for an emitter function that operates on a specific node type
 */
export type EmitterFn<T> = (node: T, parentVar: string, ctx: EmitterContext) => void

/**
 * Type for a Zag component emitter function
 */
export type ZagEmitterFn = (
  node: import('../../ir/types').IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
) => void
