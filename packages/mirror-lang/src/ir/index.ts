/**
 * Mirror IR Generator
 *
 * Transforms AST to Intermediate Representation.
 */

import type { AST } from '../parser/ast'
import type { IR } from './types'

export type { IR } from './types'

/**
 * Transform AST to IR
 *
 * TODO: Implement full transformation
 */
export function toIR(ast: AST): IR {
  // Placeholder - transform tokens
  const tokens = ast.tokens.map(t => ({
    name: t.name,
    type: t.tokenType,
    value: t.value
  }))

  // Placeholder - transform instances to IR nodes
  const nodes = ast.instances.map(instance => ({
    id: `${instance.component}-${instance.line}`,
    tag: mapPrimitiveToTag(instance.component),
    name: instance.component,
    instanceName: instance.name ?? undefined,
    properties: [],
    styles: [],
    events: [],
    children: []
  }))

  return { nodes, tokens }
}

/**
 * Map Mirror primitives to HTML tags
 */
function mapPrimitiveToTag(primitive: string): string {
  const mapping: Record<string, string> = {
    frame: 'div',
    text: 'span',
    button: 'button',
    input: 'input',
    textarea: 'textarea',
    image: 'img',
    link: 'a',
    icon: 'span'
  }
  return mapping[primitive.toLowerCase()] || 'div'
}
