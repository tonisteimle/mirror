/**
 * IRTransformer ops — state-builder
 *
 * Extracted from compiler/ir/index.ts. Functions take `this: IRTransformer`
 * and are bound on the class via class-field assignment.
 */

import type { Instance, State } from '../../parser/ast'
import type { IRNode, IREvent, IRStateMachine } from '../types'
import * as StateMachineTransformer from '../transformers/state-machine-transformer'
import * as StateChildTransformer from '../transformers/state-child-transformer'
import { extractHTMLProperties } from '../transformers/value-resolver'
import type { IRTransformer } from '../index'

export function buildStateMachine(
  this: IRTransformer,
  states: State[],
  events?: IREvent[]
): IRStateMachine | undefined {
  const ctx: StateMachineTransformer.StateMachineTransformContext = {
    propertyToCSS: prop => this.propertyToCSS(prop),
    transformStateChild: instance => this.transformStateChild(instance),
  }
  return StateMachineTransformer.buildStateMachine(states, ctx, events)
}

/**
 * Transform a state child (Instance) to IRNode.
 * Wires the IRTransformer's `this`-bound helpers into the pure transformer.
 */
export function transformStateChild(this: IRTransformer, instance: Instance): IRNode | null {
  const ctx: StateChildTransformer.StateChildContext = {
    generateNodeId: () => `state-child-${this.stateChildCounter++}`,
    transformProperties: (props, prim) => this.transformProperties(props, prim),
    extractHtmlProperties: (props, prim) => extractHTMLProperties(props, this.tokenSet, prim),
  }
  return StateChildTransformer.transformStateChild(instance, ctx)
}
