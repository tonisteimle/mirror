/**
 * Property Writer Interface
 *
 * Symmetric to PropertyReader: a writer knows how to *set* its property via
 * each of the three input methods Mirror exposes:
 *   - via 'code'    → modify the Mirror source directly
 *   - via 'panel'   → drive the Property Panel input as a user would
 *   - via 'preview' → perform a UI interaction on the preview canvas
 *
 * All three should leave the system in the same final state. Tests can
 * therefore re-run the same scenario with `via: 'code' | 'panel' | 'preview'`
 * swapped, and verify that each input path produces equivalent code+DOM+
 * panel state. That is exactly the kind of cross-modal sync test the
 * existing framework couldn't express.
 */

import type { TestAPI } from '../../types'

export type WriteVia = 'code' | 'panel' | 'preview'

export interface WriterContext {
  /** Test API for selection, panel, editor, interaction. */
  api: TestAPI
}

export interface PropertyWriter {
  /** The Mirror property name this writer handles, e.g. "pad". */
  name: string

  /**
   * Write the property by editing the Mirror source. Should produce code in
   * the canonical alias form (e.g. `pad N`, not `padding N` or `p N`).
   */
  toCode(nodeId: string, value: string, ctx: WriterContext): Promise<void>

  /**
   * Write the property by driving the Property Panel — selects the node,
   * then sets the panel input. Reflects how an end user changes a value
   * in the panel.
   */
  toPanel(nodeId: string, value: string, ctx: WriterContext): Promise<void>

  /**
   * Write the property by performing a direct-manipulation interaction in
   * the preview (drag, keyboard mode, etc.). The exact gesture depends on
   * the property — for `pad` it is "enter padding-mode and step the value
   * with arrow keys". The writer chooses the most direct gesture available.
   */
  toPreview(nodeId: string, value: string, ctx: WriterContext): Promise<void>
}
