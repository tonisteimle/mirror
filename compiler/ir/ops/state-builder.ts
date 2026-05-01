/**
 * IRTransformer ops — state-builder
 *
 * Extracted from compiler/ir/index.ts. Functions take `this: IRTransformer`
 * and are bound on the class via class-field assignment.
 */

import type { Instance, State } from '../../parser/ast'
import type { IRNode, IREvent, IRStateMachine } from '../types'
import {
  buildStateMachine as buildStateMachineExtracted,
  type StateMachineTransformContext,
} from '../transformers/state-machine-transformer'
import { extractHTMLProperties as extractHTMLPropertiesExtracted } from '../transformers/value-resolver'
import {
  transformStateChild as transformStateChildExtracted,
  type StateChildContext,
} from '../transformers/state-child-transformer'
import type { IRTransformer } from '../index'

export function buildStateMachine(
  this: IRTransformer,
  states: State[],
  events?: IREvent[]
): IRStateMachine | undefined {
  // Create context for the extracted function
  const ctx: StateMachineTransformContext = {
    propertyToCSS: prop => this.propertyToCSS(prop),
    transformStateChild: instance => this.transformStateChild(instance),
  }
  return buildStateMachineExtracted(states, ctx, events)
}

/**
 * Transform a state child (Instance) to IRNode
 * Delegates to extracted state-child-transformer.ts
 */
export function transformStateChild(this: IRTransformer, instance: Instance): IRNode | null {
  const ctx: StateChildContext = {
    generateNodeId: () => `state-child-${this.stateChildCounter++}`,
    transformProperties: (props, prim) => this.transformProperties(props, prim),
    extractHtmlProperties: (props, prim) =>
      extractHTMLPropertiesExtracted(props, this.tokenSet, prim),
  }
  return transformStateChildExtracted(instance, ctx)
}
