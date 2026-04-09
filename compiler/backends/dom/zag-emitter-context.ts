/**
 * Context interface for Zag component emitters
 *
 * This interface abstracts the methods needed by Zag emitters,
 * allowing them to be extracted from DOMGenerator without tight coupling.
 */

import type { IRNode, IRStyle, IRZagNode, IRSlot } from '../../ir/types'

/**
 * Context provided to Zag emitters for code generation
 */
export interface ZagEmitterContext {
  /** Emit a line of code with current indentation */
  emit(line: string): void

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

  /** Emit styles for a slot */
  emitSlotStyles(varName: string, slot: IRSlot | undefined): void
}

/**
 * Type for a Zag component emitter function
 */
export type ZagEmitterFn = (
  node: IRZagNode,
  parentVar: string,
  ctx: ZagEmitterContext
) => void
