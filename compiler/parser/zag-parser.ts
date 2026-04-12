/**
 * Zag Component Parser
 *
 * Handles parsing of Zag UI components (Select, Checkbox, Tabs, etc.)
 * This module is prepared for future extraction from the main parser.
 *
 * TODO: Migrate the following methods from parser.ts:
 * - parseZagComponent (line ~2485)
 * - parseZagInlineProperties (line ~2553)
 * - parseZagComponentBody (line ~2626)
 * - parseZagSlot (line ~2792)
 * - parseZagSlotBody (line ~2838)
 * - parseZagItem (line ~2933)
 * - parseZagGroup (line ~3244)
 *
 * Dependencies needed:
 * - ParserContext from parser-context.ts
 * - Schema helpers from ../schema/zag-primitives.ts
 * - AST types from ./ast.ts
 */

import type { ZagNode, ZagSlotDef, ZagItem } from './ast'
import type { ParserContext } from './parser-context'

/**
 * Parse result for Zag components.
 */
export interface ZagParseResult {
  node: ZagNode | null
  errors: string[]
}

/**
 * Parse a Zag component.
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseZagComponent(
  _ctx: ParserContext,
  _nameToken: { value: string; line: number; column: number },
  _colonAlreadyConsumed: boolean = false
): ZagParseResult {
  // TODO: Migrate from Parser.parseZagComponent
  throw new Error('Not yet migrated - use Parser.parseZagComponent')
}

/**
 * Parse a Zag slot definition.
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseZagSlot(
  _ctx: ParserContext,
  _componentName: string,
  _slotName: string
): ZagSlotDef | null {
  // TODO: Migrate from Parser.parseZagSlot
  throw new Error('Not yet migrated - use Parser.parseZagSlot')
}

/**
 * Parse a Zag item (Option, RadioItem, Tab, etc.)
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseZagItem(
  _ctx: ParserContext,
  _componentName: string
): ZagItem | null {
  // TODO: Migrate from Parser.parseZagItem
  throw new Error('Not yet migrated - use Parser.parseZagItem')
}

/**
 * Parse a Zag group (NavGroup, etc.)
 * Currently delegates to the main parser - will be migrated here.
 */
export function parseZagGroup(
  _ctx: ParserContext,
  _componentName: string
): ZagItem | null {
  // TODO: Migrate from Parser.parseZagGroup
  throw new Error('Not yet migrated - use Parser.parseZagGroup')
}
