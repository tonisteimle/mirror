/**
 * @module slot-parser
 * @description Inline Slot Parser für Component-Instanzen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst Inline-Child-Slots in Component-Zeilen
 *
 * Ermöglicht das Befüllen von Slots auf einer Zeile:
 * ProductTile Name "Product A" Price "€29.99"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SYNTAX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Inline Slot mit Content
 *   Card Title "Welcome" Description "Get started"
 *        ↑     ↑        ↑           ↑
 *        Slot  Content  Slot        Content
 *
 * @syntax Inline Slot mit Properties
 *   Card Title size 24 "Big Title" Badge bg #3B82F6 "NEW"
 *
 * @syntax Nested Inline Slots (2 Ebenen)
 *   Card Header Title "Nested" Badge "!"
 *        ↑      ↑     ↑
 *        Slot   Nested Slot
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function parseInlineChildSlot(ctx, componentName) → ASTNode | null
 *   Parst einen Inline-Slot:
 *   1. Konsumiert Slot-Namen
 *   2. Erstellt Child-Node
 *   3. Wendet Template an (falls vorhanden)
 *   4. Parst Properties/Content bis String oder nächster Slot
 *   5. Registriert als Template (falls Props vorhanden)
 *
 * @function parseNestedInlineChild(ctx, childName) → ASTNode | null
 *   Parst verschachtelte Inline-Slots (2. Ebene)
 *   Begrenzt auf 2 Ebenen für Übersichtlichkeit
 *
 * @internal parseInlineChildProperty(ctx, childNode)
 *   Parst Property für Inline-Child
 *   Handhabt pad/mar/bor mit CSS-Shorthand
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Definition
 *   ProductTile: vertical padding 16
 *     Name: size 18 weight 600
 *     Price: color #10B981
 *     Badge: background #3B82F6 radius 4
 *
 * @example Inline Usage
 *   ProductTile Name "iPhone" Price "€999" Badge "Sale"
 *
 * @output Parsed AST
 *   ProductTile
 *     Name { content: "iPhone" }
 *     Price { content: "€999" }
 *     Badge { content: "Sale" }
 */

import type { ParserContext } from './parser-context'
import type { ASTNode } from './types'
import { splitDirections, applySpacingToProperties, applyTemplate, createTemplateFromNode } from './parser-utils'
import { parseBlockContent } from './block-parser'
import { isIconComponent } from './sugar'

/**
 * Parse an inline child slot (e.g., "ProductTile Name "text" Price "price"")
 */
export function parseInlineChildSlot(ctx: ParserContext, componentName: string): ASTNode | null {
  const token = ctx.current()!
  const childName = token.value
  const scopedChildName = `${componentName}.${childName}`

  ctx.advance() // consume child name

  const childNode: ASTNode = {
    type: 'component',
    name: childName,
    id: ctx.generateId(childName),
    properties: {},
    children: [],
    line: token.line,
    column: token.column
  }

  // Apply template if exists
  applyTemplate(ctx.registry, childNode, scopedChildName, childName)

  // Parse inline properties and content for this child
  // Stop at SEMICOLON - it separates sibling slots in inline instance syntax
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF' && ctx.current()!.type !== 'SEMICOLON') {
    const childToken = ctx.current()!

    if (childToken.type === 'PROPERTY') {
      parseInlineChildProperty(ctx, childNode)
    } else if (childToken.type === 'STRING') {
      childNode.content = ctx.advance().value
      // Continue parsing - there might be properties AFTER the string content
      // e.g., label "Label" col #5B5B5B size 16
      // Only break when we hit another COMPONENT_NAME (next inline slot) or other non-property token
    } else if ((childToken.type === 'COMPONENT_NAME' || childToken.type === 'UNKNOWN_PROPERTY') && isIconComponent(childNode) && !childNode.content) {
      // Icon child: COMPONENT_NAME or UNKNOWN_PROPERTY becomes icon name (without quotes)
      childNode.content = ctx.advance().value
    } else if (childToken.type === 'BRACE_OPEN') {
      // Block syntax: Icon { "check", hidden }
      ctx.advance() // consume {
      parseBlockContent(ctx, childNode)
      if (ctx.current()?.type === 'BRACE_CLOSE') {
        ctx.advance() // consume }
      }
      break // Block syntax ends this child's inline parsing
    } else if (childToken.type === 'COMPONENT_NAME') {
      // This is a nested child - add as child of current childNode
      const nestedNode = parseNestedInlineChild(ctx, childName)
      if (nestedNode) {
        childNode.children.push(nestedNode)
      }
    } else {
      break
    }
  }

  // Register child as template if it has properties
  const childHasDef = Object.keys(childNode.properties).length > 0
  if (childHasDef) {
    ctx.registry.set(childName, createTemplateFromNode(childNode))
  }

  return childNode
}

/**
 * Parse property for inline child.
 */
function parseInlineChildProperty(ctx: ParserContext, childNode: ASTNode): void {
  const propName = ctx.advance().value

  // Handle pad/mar/bor with CSS shorthand
  if (propName === 'pad' || propName === 'mar' || propName === 'bor') {
    const directions: string[] = []
    while (ctx.current()?.type === 'DIRECTION') {
      directions.push(...splitDirections(ctx.advance().value))
    }
    const values: number[] = []
    while (ctx.current()?.type === 'NUMBER') {
      values.push(parseInt(ctx.advance().value, 10))
    }
    applySpacingToProperties(childNode.properties, propName, values, directions)
  } else {
    const next = ctx.current()
    if (next && next.type === 'NUMBER') {
      childNode.properties[propName] = parseInt(ctx.advance().value, 10)
    } else if (next && (next.type === 'COLOR' || next.type === 'STRING')) {
      // Handle COLOR (#fff) and STRING values ("Inter" for font)
      childNode.properties[propName] = ctx.advance().value
    } else if (next && next.type === 'TOKEN_REF') {
      // Handle token references ($primary, $spacing)
      childNode.properties[propName] = `$${ctx.advance().value}`
    } else if (propName === 'visible') {
      // 'visible' is the inverse of 'hidden' - normalize to single property
      childNode.properties['hidden'] = false
    } else {
      childNode.properties[propName] = true
    }
  }
}

/**
 * Parse nested inline child (2 levels deep).
 */
export function parseNestedInlineChild(ctx: ParserContext, childName: string): ASTNode | null {
  const token = ctx.current()!
  const nestedName = token.value
  const nestedScopedName = `${childName}.${nestedName}`
  ctx.advance() // consume nested child name

  const nestedNode: ASTNode = {
    type: 'component',
    name: nestedName,
    id: ctx.generateId(nestedName),
    properties: {},
    children: [],
    line: token.line,
    column: token.column
  }

  // Apply template if exists
  applyTemplate(ctx.registry, nestedNode, nestedScopedName, nestedName)

  // Parse properties for nested child
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const nt = ctx.current()!
    if (nt.type === 'PROPERTY') {
      parseInlineChildProperty(ctx, nestedNode)
    } else if (nt.type === 'STRING') {
      nestedNode.content = ctx.advance().value
    } else if (nt.type === 'COMPONENT_NAME') {
      // Further nesting - for now just break (2 levels deep is enough for most cases)
      break
    } else {
      break
    }
  }

  // Register nested child as template if it has properties
  const nestedHasDef = Object.keys(nestedNode.properties).length > 0
  if (nestedHasDef) {
    ctx.registry.set(nestedName, createTemplateFromNode(nestedNode))
  }

  return nestedNode
}
