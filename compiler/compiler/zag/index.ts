/**
 * Zag Compiler Module
 *
 * Provides compilation support for Zag-based behavior components.
 * This module handles the transformation of Zag component AST nodes
 * into IR nodes that can be rendered by the runtime.
 *
 * Usage:
 *   import { isZagComponent, transformZagNode } from './compiler/zag'
 *
 *   if (isZagComponent(node.name)) {
 *     const irNode = transformZagNode(node, context)
 *   }
 */

// Re-export detection utilities
export {
  isZagComponent,
  getZagMachineType,
  detectPrimitiveType,
  getValidSlots,
  isValidSlot,
  getValidProps,
  isValidProp,
  getValidEvents,
} from './detector'

// Re-export slot utilities
export {
  SLOT_MAPPINGS,
  getSlotDefinition,
  getSlotApiMethod,
  getSlotElement,
  isPortaledSlot,
  isItemBoundSlot,
  getAllSlotDefinitions,
  type ZagSlotDef,
} from './slots'

// Re-export transformer
export {
  transformZagNode,
  createZagCompileContext,
} from './transformer'

// Re-export types
export type {
  ZagMachineConfig,
  ParsedSlot,
  ParsedItem,
  ZagCompileContext,
  CompiledSlot,
  CompiledItem,
} from './types'
