/**
 * Control Flow Transformers
 *
 * Functions for transforming control flow constructs:
 * - Each loops (each item in $collection)
 * - Conditionals (if condition ... else ...)
 */

import type { Each, Instance, Slot, ConditionalNode } from '../../parser/ast'
import type { IRNode, IREach, IRConditional, SourcePosition } from '../types'
import { calculateSourcePosition } from '../source-map'
import { fixLoopVariableReferences } from './loop-utils'

/** Child type that can appear in Each loops */
type EachChild = Instance | Slot | ConditionalNode | Each

/**
 * Conditional block node structure - 'if condition' blocks in Mirror DSL
 */
export interface ConditionalBlock {
  type: 'Conditional'
  condition: string
  then: (Instance | Slot)[]
  else?: (Instance | Slot)[]
  line: number
  column: number
}

/**
 * Context for control flow transformation
 */
export interface ControlFlowContext {
  generateId: () => string
  transformInstance: (
    instance: EachChild,
    parentId: string,
    isEachTemplate?: boolean,
    isConditional?: boolean
  ) => IRNode
  includeSourceMap: boolean
  addToSourceMap?: (
    nodeId: string,
    name: string,
    sourcePosition: SourcePosition,
    options: { isDefinition: boolean; isEachTemplate?: boolean; isConditional?: boolean }
  ) => void
}

/**
 * Transform an Each AST node to an IRNode with IREach data
 *
 * @param each The Each AST node
 * @param ctx Transformation context
 * @returns IRNode with each data
 */
export function transformEach(each: Each, ctx: ControlFlowContext): IRNode {
  const nodeId = ctx.generateId()

  // Transform children and fix initialState → textContent for loop variable references
  const template = each.children.map(child => {
    const irNode = ctx.transformInstance(child, nodeId, true)
    // If a child has initialState matching the loop variable, it's a variable reference
    // Convert it to textContent (e.g., "Text item" should display item's value, not be a state)
    fixLoopVariableReferences(irNode, each.item, each.index)
    return irNode
  })

  const eachData: IREach = {
    id: nodeId,
    itemVar: each.item,
    indexVar: each.index,
    collection: each.collection,
    filter: each.filter,
    orderBy: each.orderBy,
    orderDesc: each.orderDesc,
    template,
  }

  // Track source position for each loop
  let sourcePosition: SourcePosition | undefined
  if (ctx.includeSourceMap && ctx.addToSourceMap) {
    sourcePosition = calculateSourcePosition(each.line, each.column)
    ctx.addToSourceMap(
      nodeId,
      'Each',
      sourcePosition,
      { isDefinition: false, isEachTemplate: true }
    )
  }

  return {
    id: nodeId,
    tag: 'div',
    name: 'Each',
    properties: [],
    styles: [],
    events: [],
    children: [],
    each: eachData,
    sourcePosition,
  }
}

/**
 * Transform a Conditional AST node to an IRNode with IRConditional data
 *
 * @param cond The Conditional block
 * @param ctx Transformation context
 * @returns IRNode with conditional data
 */
export function transformConditional(cond: ConditionalBlock, ctx: ControlFlowContext): IRNode {
  const nodeId = ctx.generateId()
  const conditionalData: IRConditional = {
    id: nodeId,
    condition: cond.condition,
    then: cond.then.map((child: Instance | Slot) => ctx.transformInstance(child, nodeId, false, true)),
    else: cond.else?.length
      ? cond.else.map((child: Instance | Slot) => ctx.transformInstance(child, nodeId, false, true))
      : undefined,
  }

  // Track source position for conditional
  let sourcePosition: SourcePosition | undefined
  if (ctx.includeSourceMap && ctx.addToSourceMap) {
    sourcePosition = calculateSourcePosition(cond.line, cond.column)
    ctx.addToSourceMap(
      nodeId,
      'Conditional',
      sourcePosition,
      { isDefinition: false, isConditional: true }
    )
  }

  return {
    id: nodeId,
    tag: 'div',
    name: 'Conditional',
    properties: [],
    styles: [],
    events: [],
    children: [],
    conditional: conditionalData,
    sourcePosition,
  }
}
