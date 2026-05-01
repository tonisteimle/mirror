/**
 * DOMGenerator ops — emit-state
 *
 * Extracted from compiler/backends/dom.ts. Functions take `this: DOMGenerator`
 * and are bound on the class via class-field assignment.
 */

import type { IRNode, IRStyle } from '../../../ir/types'
import {
  emitStateMachine as emitStateMachineExtracted,
  emitDeferredWhenWatchers,
} from '../../dom/state-machine-emitter'
import { mapKeyName } from '../../dom/event-emitter'
import { collectNamedNodes as collectNamedNodesExtracted } from '../../dom/api-emitter'
import type { DOMGenerator } from '../../dom'

export function mapKeyNameMethod(this: DOMGenerator, key: string): string {
  return mapKeyName(key)
}

export function emitStateMachine(this: DOMGenerator, varName: string, node: IRNode): void {
  emitStateMachineExtracted(this.createStateMachineContext(), varName, node)
}

export function emitDeferredWhenWatchersMethod(this: DOMGenerator): void {
  emitDeferredWhenWatchers(this.createStateMachineContext(), this.deferredWhenWatchers)
}

export function groupByState(this: DOMGenerator, styles: IRStyle[]): Record<string, IRStyle[]> {
  const result: Record<string, IRStyle[]> = {}
  for (const style of styles) {
    const state = style.state || 'default'
    if (!result[state]) result[state] = []
    result[state].push(style)
  }
  return result
}

export function collectNamedNodes(this: DOMGenerator, nodes: IRNode[]): IRNode[] {
  return collectNamedNodesExtracted(nodes)
}
