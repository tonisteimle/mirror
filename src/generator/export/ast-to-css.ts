/**
 * AST to CSS Converter
 *
 * Converts Mirror AST nodes to CSS stylesheet output.
 */

import type { ASTNode, ComponentTemplate, StateDefinition } from '../../parser/types'
import {
  convertProperties,
  convertHoverProperties,
  hasHoverProperties,
  formatCssBlock,
} from './css-properties'
import type { ExportContext } from './types'

/**
 * Generate CSS for a single node
 */
function nodeToCss(node: ASTNode, ctx: ExportContext): string[] {
  const className = ctx.getClassName(node)
  const selector = `.${className}`
  const blocks: string[] = []

  // Main styles
  const declarations = convertProperties(node.properties)
  const mainBlock = formatCssBlock(selector, declarations)
  if (mainBlock) {
    blocks.push(mainBlock)
  }

  // Hover styles
  if (hasHoverProperties(node.properties)) {
    const hoverDeclarations = convertHoverProperties(node.properties)
    if (!node.properties.cursor) {
      hoverDeclarations.unshift({ property: 'cursor', value: 'pointer' })
    }
    const hoverBlock = formatCssBlock(`${selector}:hover`, hoverDeclarations)
    if (hoverBlock) {
      blocks.push(hoverBlock)
    }
  }

  // Recursively process children
  for (const child of node.children) {
    blocks.push(...nodeToCss(child, ctx))
  }

  return blocks
}

/**
 * Generate CSS for component states
 */
function generateStateCss(
  className: string,
  states: StateDefinition[]
): string[] {
  const blocks: string[] = []

  for (const state of states) {
    const selector = `.${className}--${state.name}`
    const declarations = convertProperties(state.properties)
    const block = formatCssBlock(selector, declarations)
    if (block) {
      blocks.push(block)
    }
  }

  return blocks
}

/**
 * Generate CSS for component definitions (from registry)
 */
function generateDefinitionCss(ctx: ExportContext): string[] {
  const blocks: string[] = []

  for (const def of ctx.interactivity.definitions) {
    const { name, template } = def

    // Create a temporary node to get class name
    const tempNode: ASTNode = {
      type: 'component',
      name,
      id: name,
      properties: template.properties,
      children: [],
    }
    const className = ctx.getClassName(tempNode)

    // Main styles
    const declarations = convertProperties(template.properties)
    const mainBlock = formatCssBlock(`.${className}`, declarations)
    if (mainBlock) {
      blocks.push(mainBlock)
    }

    // State styles
    if (template.states && template.states.length > 0) {
      blocks.push(...generateStateCss(className, template.states))
    }

    // Hover styles
    if (hasHoverProperties(template.properties)) {
      const hoverDeclarations = convertHoverProperties(template.properties)
      if (!template.properties.cursor) {
        hoverDeclarations.unshift({ property: 'cursor', value: 'pointer' })
      }
      const hoverBlock = formatCssBlock(`.${className}:hover`, hoverDeclarations)
      if (hoverBlock) {
        blocks.push(hoverBlock)
      }
    }
  }

  return blocks
}

/**
 * Generate CSS for multiple root nodes
 */
export function generateCss(nodes: ASTNode[], ctx: ExportContext): string {
  const blocks: string[] = []

  // First, generate CSS for component definitions
  blocks.push(...generateDefinitionCss(ctx))

  // Then, generate CSS for rendered nodes
  for (const node of nodes) {
    // Skip definition-only nodes (they're handled above)
    if (node._isExplicitDefinition) continue
    blocks.push(...nodeToCss(node, ctx))
  }

  return blocks.join('\n')
}
