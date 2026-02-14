/**
 * Inline Properties Parser Module
 *
 * Parses inline properties, events, conditionals, and content
 * on the same line as the component.
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode, EventHandler, DSLProperties } from './types'
import type { Conditional, ActionStatement } from '../types'
import { ACTION_KEYWORDS, KEY_MODIFIERS } from '../../dsl/properties'
import { parseStyleGroup, applyMixin } from '../style-parser'
import { parseInlineChildSlot } from '../slot-parser'
import { parsePropertyValue } from '../property-parser'
import { parseCondition } from '../condition-parser'
import { parseAction } from '../state-parser'
import { getDefaultSugarRegistry } from '../sugar'
import type { SugarContext } from '../sugar'

/**
 * Parse inline properties and content on the same line as the component.
 * Uses the sugar registry for handling implicit property assignments.
 *
 * @param ctx Parser context
 * @param node Target node to add properties to
 * @param componentName Component name for context
 * @param inlineSlots Array to collect inline child slots
 */
export function parseInlineProperties(
  ctx: ParserContext,
  node: ASTNode,
  componentName: string,
  inlineSlots: ASTNode[]
): void {
  const sugarRegistry = getDefaultSugarRegistry()

  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Skip optional comma separators
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    // Style group: (hor cen gap 8):styleName
    if (token.type === 'PAREN_OPEN') {
      ctx.advance() // skip (
      const mixin = parseStyleGroup(ctx)
      if (ctx.current()?.type === 'PAREN_CLOSE') {
        ctx.advance() // skip )
      }
      // Check for inline style definition :name
      if (ctx.current()?.type === 'TOKEN_DEF') {
        const styleName = ctx.advance().value
        ctx.styleMixins.set(styleName, mixin)
      }
      // Apply mixin to current node
      applyMixin(node, mixin)
      continue
    }

    // Check if it's a style reference (component name that exists in styleMixins)
    if (token.type === 'COMPONENT_NAME' && ctx.styleMixins.has(token.value)) {
      const styleName = ctx.advance().value
      const mixin = ctx.styleMixins.get(styleName)!
      applyMixin(node, mixin)
      continue
    }

    // Explicit property handling
    if (token.type === 'PROPERTY') {
      parsePropertyValue(ctx, node)
      continue
    }

    // Inline child slot handling
    if (token.type === 'COMPONENT_NAME') {
      const childNode = parseInlineChildSlot(ctx, componentName)
      if (childNode) {
        inlineSlots.push(childNode)
      }
      continue
    }

    // Try sugar handlers for implicit property assignments
    // (STRING, NUMBER, COLOR, TOKEN_REF)
    if (sugarRegistry.hasHandlerFor(token.type)) {
      const sugarContext: SugarContext = {
        ctx,
        node,
        componentName,
        token
      }
      const result = sugarRegistry.handle(sugarContext)
      if (result.handled) {
        continue
      }
    }

    // Inline conditional properties: if $cond then prop value else prop value
    if (token.type === 'CONTROL' && token.value === 'if') {
      parseInlineConditional(ctx, node)
      continue
    }

    // Inline event handler: onclick assign $var to value
    if (token.type === 'EVENT') {
      const handler = parseInlineEventHandler(ctx)
      if (handler) {
        if (!node.eventHandlers) node.eventHandlers = []
        node.eventHandlers.push(handler)
      }
      continue
    }

    // Unknown token type - exit the loop
    break
  }
}

/**
 * Parse an inline event handler: onclick assign $var to value
 * Also supports conditional actions: onclick if $x page Dashboard else open LoginDialog
 * Also supports key modifiers: onkeydown escape close self
 *
 * @param ctx Parser context
 * @returns Parsed event handler or null
 */
export function parseInlineEventHandler(ctx: ParserContext): EventHandler | null {
  if (ctx.current()?.type !== 'EVENT') return null

  const eventLine = ctx.current()!.line
  const eventName = ctx.advance().value // onclick, onhover, onkeydown, onclick-outside, etc.

  const handler: EventHandler = {
    event: eventName,
    actions: [],
    line: eventLine
  }

  // Check for key modifier after onkeydown/onkeyup: onkeydown escape close self
  if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
    const possibleModifier = ctx.current()!.value.toLowerCase()
    if (KEY_MODIFIERS.has(possibleModifier)) {
      handler.modifier = ctx.advance().value.toLowerCase()
    }
  }

  // Check for conditional action: onclick if $x then action1 else action2
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
    ctx.advance() // consume 'if'
    const condition = parseCondition(ctx)

    if (condition) {
      const conditional: Conditional = {
        condition,
        thenActions: [],
        line: eventLine
      }

      // Parse then action (action keyword or after 'then')
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'then') {
        ctx.advance() // consume 'then'
      }

      // Parse action for then branch
      const current = ctx.current()
      if (current?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(current.value)) {
        const action = parseAction(ctx)
        if (action) conditional.thenActions.push(action)
      } else if (current?.type === 'ANIMATION_ACTION') {
        const action = parseAction(ctx)
        if (action) conditional.thenActions.push(action)
      }

      // Check for 'else'
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance() // consume 'else'
        conditional.elseActions = []

        const elseToken = ctx.current()
        if (elseToken?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(elseToken.value)) {
          const action = parseAction(ctx)
          if (action) conditional.elseActions.push(action)
        } else if (elseToken?.type === 'ANIMATION_ACTION') {
          const action = parseAction(ctx)
          if (action) conditional.elseActions.push(action)
        }
      }

      handler.actions.push(conditional)
    }
  } else {
    // Parse inline actions (supports comma-chaining: onclick select self, close Menu)
    while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
      const current = ctx.current()

      // Skip comma separators between actions
      if (current?.type === 'COMMA') {
        ctx.advance()
        continue
      }

      // Parse action if it's an action keyword
      if (current?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(current.value)) {
        const action = parseAction(ctx)
        if (action) handler.actions.push(action)
        continue
      } else if (current?.type === 'ANIMATION_ACTION') {
        // Support show/hide as inline actions
        const action = parseAction(ctx)
        if (action) handler.actions.push(action)
        continue
      }

      // Stop if we hit something that's not an action or comma
      break
    }
  }

  return handler
}

/**
 * Parse inline conditional properties: if $cond then prop value [else prop value]
 * Example: if $collapsed then w 64 else w 240
 *
 * @param ctx Parser context
 * @param node Target node to add conditional properties to
 */
export function parseInlineConditional(ctx: ParserContext, node: ASTNode): void {
  ctx.advance() // consume 'if'

  const condition = parseCondition(ctx)
  const currentToken = ctx.current()
  if (!condition) {
    if (currentToken) ctx.addWarning('P002', 'Expected condition after "if"', currentToken)
    return
  }

  // Consume 'then'
  if (currentToken?.type !== 'CONTROL' || currentToken?.value !== 'then') {
    if (currentToken) ctx.addWarning('P003', 'Expected "then" after condition', currentToken)
    return
  }
  ctx.advance() // consume 'then'

  // Parse then properties until 'else' or end of conditional context
  const thenProperties = parseInlineConditionalProperties(ctx)

  let elseProperties: DSLProperties | undefined

  // Check for 'else'
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
    ctx.advance() // consume 'else'
    elseProperties = parseInlineConditionalProperties(ctx)
  }

  // Add to conditionalProperties
  if (!node.conditionalProperties) node.conditionalProperties = []
  node.conditionalProperties.push({
    condition,
    thenProperties,
    elseProperties
  })
}

/**
 * Parse properties for inline conditional (then/else blocks).
 * Captures ALL property-value pairs until 'else', 'if', newline, or EOF.
 *
 * Example: if $cond then col #3B82F6 bor 2 else col #1A1A1A bor 0
 * - then branch: { col: '#3B82F6', bor: 2 }
 * - else branch: { col: '#1A1A1A', bor: 0 }
 *
 * @param ctx Parser context
 * @returns Parsed properties
 */
export function parseInlineConditionalProperties(ctx: ParserContext): DSLProperties {
  const properties: DSLProperties = {}

  while (ctx.current()) {
    const token = ctx.current()!

    if (token.type === 'NEWLINE' || token.type === 'EOF') {
      break
    }

    // Stop at 'else' or another 'if' - these mark the end of the current block
    if (token.type === 'CONTROL' && (token.value === 'else' || token.value === 'if')) {
      break
    }

    // Handle PROPERTY tokens (w, h, col, pad, etc.)
    if (token.type === 'PROPERTY') {
      const propName = ctx.advance().value
      const valueToken = ctx.current()

      if (valueToken && valueToken.type !== 'CONTROL' &&
          valueToken.type !== 'NEWLINE' && valueToken.type !== 'EOF') {
        if (valueToken.type === 'NUMBER') {
          properties[propName] = parseInt(ctx.advance().value, 10)
        } else if (valueToken.type === 'COLOR') {
          properties[propName] = ctx.advance().value
        } else if (valueToken.type === 'STRING') {
          properties[propName] = ctx.advance().value
        } else if (valueToken.type === 'TOKEN_REF') {
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (tokenValue !== undefined) {
            properties[propName] = tokenValue as string | number | boolean
          } else {
            // Keep as reference for runtime resolution
            properties[propName] = `$${tokenName}`
          }
        } else if (valueToken.type === 'COMPONENT_NAME') {
          // Could be a color keyword like 'transparent'
          properties[propName] = ctx.advance().value
        } else if (valueToken.type === 'PROPERTY') {
          // Next is another property, so this one is boolean
          properties[propName] = true
        } else {
          // Boolean property
          properties[propName] = true
        }
      } else {
        properties[propName] = true
      }
      continue
    }

    // Unknown token, break
    break
  }

  return properties
}
