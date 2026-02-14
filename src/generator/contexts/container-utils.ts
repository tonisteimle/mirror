/**
 * Container Context Utilities
 *
 * Utility functions for container context.
 * Separated from provider to avoid react-refresh issues.
 */

import type { ASTNode, ComponentTemplate } from '../../parser/parser'

/**
 * Convert ComponentTemplate to ASTNode for overlay rendering.
 */
export function templateToNode(name: string, template: ComponentTemplate): ASTNode {
  return {
    type: 'component',
    name,
    id: `overlay-${name}-${Date.now()}`,
    properties: template.properties,
    content: template.content,
    children: template.children,
    states: template.states,
    variables: template.variables,
    eventHandlers: template.eventHandlers,
  }
}
