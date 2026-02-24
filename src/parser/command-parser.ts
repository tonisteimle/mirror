/**
 * @module command-parser
 * @description Command Parser - Selection Commands für AST-Manipulation
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Selection Commands zur nachträglichen AST-Modifikation
 *
 * Selection Commands ermöglichen gezielte Änderungen an existierenden Nodes
 * über ihre ID-Referenz.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Modify Property
 *   :id property value
 *   :button-1 col #3B82F6
 *   :card-2 pad 24
 *
 * @syntax Add Child
 *   :id ComponentName "content"
 *   :container-1 Button "Click me"
 *   :menu-1 Item pad 12 "New Item"
 *
 * @syntax Add Before/After
 *   :id after ComponentName "content"
 *   :id before ComponentName "content"
 *   :item-2 after Item "Inserted After"
 *   :item-2 before Divider
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * COMMAND TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @type modify
 *   Ändert eine Property eines existierenden Nodes
 *   { type: 'modify', targetId, property, value }
 *
 * @type addChild
 *   Fügt ein Kind zum Node hinzu
 *   { type: 'addChild', targetId, component }
 *
 * @type addBefore
 *   Fügt Geschwister vor dem Node ein
 *   { type: 'addBefore', targetId, component }
 *
 * @type addAfter
 *   Fügt Geschwister nach dem Node ein
 *   { type: 'addAfter', targetId, component }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseSelectionCommand(ctx, targetId) → SelectionCommand | null
 *   Parst einen Command für die gegebene Target-ID
 *
 * @algorithm
 *   1. Prüfe auf KEYWORD (after/before) → Add-Command
 *   2. Prüfe auf PROPERTY → Modify-Command
 *   3. Prüfe auf COMPONENT_NAME → AddChild-Command
 *   4. Parse Rest der Zeile für Properties/Content
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VALUE RESOLUTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @supports NUMBER → parseInt
 * @supports COLOR → direkter Wert
 * @supports TOKEN_REF → Lookup in designTokens
 * @supports Component.property → Template-Property-Referenz
 *
 * @used-by parser.ts für :id Selection Commands
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
