/**
 * Command Parser Module
 *
 * Parses selection commands:
 * - Modify: :id property value
 * - Add child: :id ComponentName "content"
 * - Add before/after: :id after/before ComponentName "content"
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, SelectionCommand } from './types'
import { isTokenSequence } from './types'

/**
 * Parse selection command: :id property value OR :id component "content" OR :id after/before component "content"
 */
export function parseSelectionCommand(ctx: ParserContext, targetId: string): SelectionCommand | null {
  const token = ctx.current()

  // Check for keyword (after/before)
  if (token?.type === 'KEYWORD') {
    const keyword = ctx.advance().value // 'after' or 'before'

    // Next should be a component name
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const componentName = ctx.advance().value
      const component: Omit<ASTNode, 'id'> & { id?: string } = {
        type: 'component',
        name: componentName,
        properties: {},
        children: []
      }

      // Parse rest of line (properties, content)
      while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
        const t = ctx.current()!
        if (t.type === 'PROPERTY') {
          const propName = ctx.advance().value
          const next = ctx.current()
          if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
            component.properties[propName] = next.type === 'NUMBER'
              ? parseInt(ctx.advance().value, 10)
              : ctx.advance().value
          } else {
            component.properties[propName] = true
          }
        } else if (t.type === 'STRING') {
          component.content = ctx.advance().value
        } else {
          break
        }
      }

      return {
        type: keyword === 'after' ? 'addAfter' : 'addBefore',
        targetId,
        component
      }
    }
    return null
  }

  // Check for property (modify command): :id col #F00
  if (token?.type === 'PROPERTY') {
    const propName = ctx.advance().value
    const next = ctx.current()

    let value: string | number | undefined

    if (next?.type === 'NUMBER') {
      value = parseInt(ctx.advance().value, 10)
    } else if (next?.type === 'COLOR') {
      value = ctx.advance().value
    } else if (next?.type === 'TOKEN_REF') {
      const tokenName = ctx.advance().value
      const tokenValue = ctx.designTokens.get(tokenName)
      if (tokenValue !== undefined && !isTokenSequence(tokenValue)) {
        value = tokenValue
      } else if (tokenValue === undefined) {
        // Check for component property reference: $Card.rad
        const parts = tokenName.split('.')
        if (parts.length >= 2) {
          const compName = parts[0]
          const propPath = parts.slice(1).join('_')
          const compTemplate = ctx.registry.get(compName)
          if (compTemplate) {
            const refValue = compTemplate.properties[propPath]
            if (refValue !== undefined) {
              value = refValue as string | number
            }
          }
        }
      }
    }

    if (value !== undefined) {
      return {
        type: 'modify',
        targetId,
        property: propName,
        value
      }
    }
    return null
  }

  // Check for component name (add child): :id item "content"
  if (token?.type === 'COMPONENT_NAME') {
    const componentName = ctx.advance().value
    const component: Omit<ASTNode, 'id'> & { id?: string } = {
      type: 'component',
      name: componentName,
      properties: {},
      children: []
    }

    // Parse rest of line
    while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
      const t = ctx.current()!
      if (t.type === 'PROPERTY') {
        const propName = ctx.advance().value
        const next = ctx.current()
        if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
          component.properties[propName] = next.type === 'NUMBER'
            ? parseInt(ctx.advance().value, 10)
            : ctx.advance().value
        } else {
          component.properties[propName] = true
        }
      } else if (t.type === 'STRING') {
        component.content = ctx.advance().value
      } else {
        break
      }
    }

    // Apply template if component is known and has no definition
    const hasDefinition = Object.keys(component.properties).length > 0
    if (!hasDefinition && ctx.registry.has(componentName)) {
      const template = ctx.registry.get(componentName)!
      component.properties = { ...template.properties }
    }

    return {
      type: 'addChild',
      targetId,
      component
    }
  }

  return null
}
