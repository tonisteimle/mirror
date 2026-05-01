/**
 * IRTransformer ops — text-node-builder
 *
 * Extracted from compiler/ir/index.ts. Functions take `this: IRTransformer`
 * and are bound on the class via class-field assignment.
 */

import type { Text } from '../../parser/ast'
import type { IRNode } from '../types'
import type { IRTransformer } from '../index'

export function createTextNode(this: IRTransformer, text: Text): IRNode {
  const nodeId = this.generateId()
  return {
    id: nodeId,
    tag: 'span',
    primitive: 'text',
    properties: [{ name: 'content', value: text.content }],
    styles: [],
    events: [],
    children: [],
  }
}
