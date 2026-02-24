/**
 * @module component-parser/inline-properties
 * @description Inline Properties, Events und Conditionals Parser
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst alles auf der gleichen Zeile nach dem Component-Namen
 *
 * Button padding 16 background #3B82F6 onclick toggle "Click"
 *        ↑──────────────────────────────────────────────────↑
 *                    Alles wird hier geparst
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSING-REIHENFOLGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @order
 * 1. COMMA → Überspringen (optionaler Separator)
 * 2. PAREN_OPEN → Style Group: (hor cen gap 8):styleName
 * 3. Style Reference → COMPONENT_NAME in styleMixins
 * 4. PROPERTY → Explizite Property (pad, gap, bg, etc.)
 * 5. State Check → Token matches defined state name
 * 6. Category State → Token matches category, next = state
 * 7. Sugar Handlers → STRING, NUMBER, COLOR, TOKEN_REF
 * 8. CONTROL if → Inline Conditional Properties
 * 9. EVENT → Inline Event Handler
 * 10. Unknown → Loop beenden
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INLINE EVENT HANDLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Simple Action
 *   onclick toggle
 *   onclick page Dashboard
 *   onclick show Panel
 *
 * @syntax With Key Modifier
 *   onkeydown escape close self
 *   onkeydown enter select highlighted
 *   onkeydown arrow-down highlight next
 *
 * @syntax Conditional Action
 *   onclick if $active page Dashboard else open LoginDialog
 *
 * @syntax Comma-Chained Actions
 *   onclick select self, close Menu
 *   onclick highlight self, show Preview
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INLINE CONDITIONAL PROPERTIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax if $condition then property value [else property value]
 *   Button if $active then bg #3B82F6 else bg #333
 *   Card if $collapsed then w 64 else w 240
 *   Text if $count > 0 then col #10B981 else col #666
 *
 * @output conditionalProperties[] auf dem Node
 *   { condition, thenProperties, elseProperties }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTIVE STATE DETECTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Flat State (V8)
 *   Status pending "Waiting"
 *   → activeState: 'pending'
 *
 * @syntax Category State (V9)
 *   Button selection selected
 *   → activeStatesByCategory: { selection: 'selected' }
 *
 * @condition Nur wenn Template States definiert hat
 *
 * @used-by component-parser/index.ts nach Component-Name Parsing
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode, EventHandler, DSLProperties } from './types'
import type { Conditional, ActionStatement } from '../types'
import { ACTION_KEYWORDS, KEY_MODIFIERS } from '../../dsl/properties'
import { parseStyleGroup, applyMixin } from '../style-parser'
import { parseInlineChildSlot } from '../slot-parser'
import { parsePropertyValue } from '../property-parser'
import { parseCondition } from '../condition-parser'
import { parseAction, parseAnimationAction } from '../state-parser'
import { getDefaultSugarRegistry, isIconComponent } from '../sugar'
import type { SugarContext } from '../sugar'

/**
 * Token types that indicate property/content continuation on a new line.
 * These allow multiline component definitions without commas.
 */
const CONTINUATION_TOKEN_TYPES = new Set([
  'PROPERTY',      // vertical, padding, size, color, etc.
  'STRING',        // "text content"
  'NUMBER',        // bare numbers (sugar for dimensions)
  'COLOR',         // #fff (sugar for background/color)
  'TOKEN_REF',     // $token references
])

/**
 * Check if the next line (after NEWLINE) continues with properties/content.
 * Returns true if next indented line starts with a continuation token.
 * This enables multiline property syntax without commas.
 *
 * @param ctx Parser context
 * @param componentIndent The indentation level of the component
 * @returns true if next line is a property continuation
 */
function isPropertyContinuation(ctx: ParserContext, componentIndent: number): boolean {
  // We're at a NEWLINE - peek ahead to see what comes next
  const next1 = ctx.peek(1) // Should be INDENT or EOF
  const next2 = ctx.peek(2) // Should be the first token on the new line

  // Check if next line is indented AND starts with a continuation token
  if (next1?.type === 'INDENT' && next2 && CONTINUATION_TOKEN_TYPES.has(next2.type)) {
    const lineIndent = parseInt(next1.value, 10)
    // Property continuation if indented more than component
    return lineIndent > componentIndent
  }

  // Also handle empty lines followed by continuation lines
  // NEWLINE → INDENT → NEWLINE → INDENT → PROPERTY/STRING/etc.
  if (next1?.type === 'INDENT') {
    const next3 = ctx.peek(3)
    const next4 = ctx.peek(4)
    if (next2?.type === 'NEWLINE' && next3?.type === 'INDENT' && next4 && CONTINUATION_TOKEN_TYPES.has(next4.type)) {
      const lineIndent = parseInt(next3.value, 10)
      return lineIndent > componentIndent
    }
  }

  return false
}

/**
 * Parse inline properties and content on the same line as the component.
 * Uses the sugar registry for handling implicit property assignments.
 *
 * MULTILINE PROPERTY SYNTAX:
 * Properties can continue on subsequent indented lines without commas.
 * Lines starting with PROPERTY tokens at higher indentation are parsed as properties.
 * Lines starting with COMPONENT_NAME are children (stop property parsing).
 *
 * @example
 * Navigation-Item
 *   vertical
 *   padding top 4 bottom 4
 *
 *   Icon
 *     size 16
 *
 * @param ctx Parser context
 * @param node Target node to add properties to
 * @param componentName Component name for context
 * @param inlineSlots Array to collect inline child slots
 * @param componentIndent Indentation level of the component (for multiline syntax)
 */
export function parseInlineProperties(
  ctx: ParserContext,
  node: ASTNode,
  componentName: string,
  inlineSlots: ASTNode[],
  componentIndent: number = 0
): void {
  const sugarRegistry = getDefaultSugarRegistry()

  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Handle NEWLINE - check if next line continues with properties
    if (token.type === 'NEWLINE') {
      if (isPropertyContinuation(ctx, componentIndent)) {
        ctx.advance() // consume NEWLINE
        // Consume INDENT
        if (ctx.current()?.type === 'INDENT') {
          ctx.advance()
        }
        // Skip empty lines
        while (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
          if (ctx.current()?.type === 'INDENT') {
            ctx.advance()
          }
        }
        continue // continue parsing properties
      } else {
        // No property continuation - stop parsing inline properties
        break
      }
    }

    // Skip optional comma separators
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    // Skip semicolon separators - used for inline child slot syntax
    // e.g., Item Icon "bed-double"; Label "Text"
    if (token.type === 'SEMICOLON') {
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

    // V8: Check if token matches a defined state for this component
    // e.g., Status pending "Waiting" -> activeState: 'pending'
    // V9: Also check for category state syntax: Button selection selected -> activeStatesByCategory: { selection: 'selected' }
    // Handle COMPONENT_NAME and UNKNOWN_PROPERTY (for state names like 'pending' close to 'padding')
    if (token.type === 'COMPONENT_NAME' || token.type === 'UNKNOWN_PROPERTY') {
      const template = ctx.registry.get(componentName)
      if (template?.states) {
        // V9: First check if token matches a category name
        const categories = new Set(template.states.filter(s => s.category).map(s => s.category!))
        if (categories.has(token.value)) {
          const categoryName = token.value
          ctx.advance() // consume category name

          // Next token should be the state name within this category
          const stateToken = ctx.current()
          if (stateToken && (stateToken.type === 'COMPONENT_NAME' || stateToken.type === 'UNKNOWN_PROPERTY')) {
            const stateName = stateToken.value
            // Verify this state exists in the category
            const matchingState = template.states.find(s => s.category === categoryName && s.name === stateName)
            if (matchingState) {
              if (!node.activeStatesByCategory) node.activeStatesByCategory = {}
              node.activeStatesByCategory[categoryName] = stateName
              ctx.advance() // consume state name
              continue
            }
          }
          // Category name without valid state - continue without error
          continue
        }

        // V8: Check if token matches a flat state (no category)
        const matchingState = template.states.find(s => s.name === token.value && !s.category)
        if (matchingState) {
          node.activeState = token.value
          ctx.advance()
          continue
        }
      }
      // Special case: Icon component - COMPONENT_NAME or UNKNOWN_PROPERTY is the icon name
      if (isIconComponent(node) && !node.content) {
        node.content = ctx.advance().value
        continue
      }
      // Inline child slot handling (if not a state) - only for COMPONENT_NAME
      if (token.type === 'COMPONENT_NAME') {
        const childNode = parseInlineChildSlot(ctx, componentName)
        if (childNode) {
          inlineSlots.push(childNode)
        }
      } else {
        // FIX: UNKNOWN_PROPERTY muss auch advanced werden um Endlosschleife zu vermeiden!
        ctx.advance()
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

    // Inline animation: animate spin 1000
    if (token.type === 'ANIMATION_ACTION') {
      const animDef = parseAnimationAction(ctx)
      if (animDef) {
        node.continuousAnimation = animDef
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

  // Check for key after onkeydown/onkeyup: onkeydown escape close self
  if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
    const possibleKey = ctx.current()!.value.toLowerCase()
    if (KEY_MODIFIERS.has(possibleKey)) {
      handler.key = ctx.advance().value.toLowerCase()
    }
  }

  // Check for debounce modifier: oninput debounce 300: filter Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'debounce') {
    ctx.advance() // consume 'debounce'
    if (ctx.current()?.type === 'NUMBER') {
      handler.debounce = parseInt(ctx.advance().value, 10)
    }
  }

  // Check for delay modifier: onblur delay 200: hide Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'delay') {
    ctx.advance() // consume 'delay'
    if (ctx.current()?.type === 'NUMBER') {
      handler.delay = parseInt(ctx.advance().value, 10)
    }
  }

  // Consume optional colon after timing modifiers (debounce 300: action)
  if (ctx.current()?.type === 'COLON') {
    ctx.advance()
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

      // Skip optional colon (brace-syntax: property: value)
      if (ctx.current()?.type === 'COLON') {
        ctx.advance()
      }

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

    // Handle STRING tokens for content conditionals: if $cond then "yes" else "no"
    if (token.type === 'STRING') {
      properties._content = ctx.advance().value
      continue
    }

    // Unknown token, break
    break
  }

  return properties
}
