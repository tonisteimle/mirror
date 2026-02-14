/**
 * Definition Parser Module
 *
 * Parses top-level definitions:
 * - Component definitions (Button: hor cen gap 8)
 * - Token definitions ($primary: #3B82F6)
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, ComponentTemplate } from './types'
import { CSS_COLOR_KEYWORDS, splitDirections, applySpacingToProperties } from './parser-utils'
import { parseStateDefinition, parseVariableDeclaration, parseEventHandler, parseBehaviorStateDefinition, parseAnimationAction, parseAction } from './state-parser'
import { ACTION_KEYWORDS, KEY_MODIFIERS } from '../dsl/properties'
import { BEHAVIOR_STATE_KEYWORDS, PROPERTY_KEYWORD_VALUES, SYSTEM_STATES } from '../dsl/properties'
import { parseComponent } from './component-parser'
import { parseLayoutProperty, parseCenterProperty } from './property-parser'
import { createTextNode } from './parser-utils'

/**
 * Parse a component definition: Button: hor cen gap 8 "Label"
 */
export function parseComponentDefinition(ctx: ParserContext): void {
  const componentName = ctx.advance().value
  const template: ComponentTemplate = {
    properties: {},
    children: []
  }

  // Check for "from" keyword: PrimaryButton: from Button col #EF4444
  if (ctx.current()?.type === 'KEYWORD' && ctx.current()?.value === 'from') {
    ctx.advance() // consume 'from'

    // Get base component name
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const baseComponentName = ctx.advance().value

      // Apply base component template if it exists
      if (ctx.registry.has(baseComponentName)) {
        const baseTemplate = ctx.registry.get(baseComponentName)!
        template.properties = { ...baseTemplate.properties }
        if (baseTemplate.content) {
          template.content = baseTemplate.content
        }
        if (baseTemplate.children.length > 0) {
          template.children = baseTemplate.children.map(child => ({ ...child }))
        }
      }
    }
  }

  // Parse properties, modifiers, content on same line
  parseDefinitionInlineProperties(ctx, template)

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse template children (indented lines)
  parseDefinitionChildren(ctx, template, componentName)

  ctx.registry.set(componentName, template)
}

/**
 * Parse inline properties for a component definition.
 */
function parseDefinitionInlineProperties(ctx: ParserContext, template: ComponentTemplate): void {
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    // Skip optional comma separators
    if (token.type === 'COMMA') {
      ctx.advance()
      continue
    }

    if (token.type === 'PROPERTY') {
      const propName = ctx.advance().value

      // Handle pad/mar/bor with directions or CSS shorthand
      if (propName === 'pad' || propName === 'mar' || propName === 'bor') {
        const directions: string[] = []
        while (ctx.current()?.type === 'DIRECTION') {
          directions.push(...splitDirections(ctx.advance().value))
        }

        const values: number[] = []
        while (ctx.current()?.type === 'NUMBER' || ctx.current()?.type === 'TOKEN_REF') {
          if (ctx.current()?.type === 'NUMBER') {
            values.push(parseInt(ctx.advance().value, 10))
          } else {
            // Token reference - resolve immediately
            const tokenName = ctx.advance().value
            const tokenValue = ctx.designTokens.get(tokenName)
            if (typeof tokenValue === 'number') {
              values.push(tokenValue)
            } else {
              // Token not found or not a number - skip silently
              // (token might be defined later or have wrong type)
            }
          }
        }

        applySpacingToProperties(template.properties, propName, values, directions)
      } else if (propName === 'hor' || propName === 'ver') {
        parseLayoutProperty(ctx, template, propName)
      } else if (propName === 'cen') {
        parseCenterProperty(ctx, template)
      } else if (propName === 'icon') {
        if (ctx.current()?.type === 'STRING') {
          template.properties['icon'] = ctx.advance().value
        }
      } else if (propName === 'font') {
        if (ctx.current()?.type === 'STRING') {
          template.properties['font'] = ctx.advance().value
        }
      } else if (propName === 'weight') {
        // Special handling for weight: accepts NUMBER or 'bold' keyword
        const next = ctx.current()
        if (next?.type === 'NUMBER') {
          template.properties['weight'] = parseInt(ctx.advance().value, 10)
        } else if (next?.type === 'COMPONENT_NAME' && next.value === 'bold') {
          ctx.advance()
          template.properties['weight'] = 700  // Convert 'bold' to numeric weight
        } else if (next?.type === 'TOKEN_REF') {
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (typeof tokenValue === 'number') {
            template.properties['weight'] = tokenValue
          }
        } else {
          template.properties['weight'] = 700  // Default bold weight
        }
      } else {
        const next = ctx.current()
        if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
          template.properties[propName] = next.type === 'NUMBER'
            ? parseInt(ctx.advance().value, 10)
            : ctx.advance().value
        } else if (next?.type === 'TOKEN_REF') {
          // Token reference like $bg-card
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (tokenValue !== undefined && typeof tokenValue !== 'object') {
            template.properties[propName] = tokenValue
          } else {
            // Store as reference for runtime resolution
            template.properties[propName] = `$${tokenName}`
          }
        } else if (next?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(next.value.toLowerCase())) {
          // CSS color keyword like 'transparent', 'white', etc.
          template.properties[propName] = ctx.advance().value
        } else if (next?.type === 'COMPONENT_NAME' && PROPERTY_KEYWORD_VALUES.has(next.value.toLowerCase())) {
          // Property keyword value like 'sm', 'md', 'lg' for shadow, 'cover' for fit, etc.
          template.properties[propName] = ctx.advance().value
        } else {
          template.properties[propName] = true
        }
      }
    } else if (token.type === 'COLOR') {
      // Bare color → col property (shorthand syntax)
      template.properties['col'] = ctx.advance().value
    } else if (token.type === 'TOKEN_REF') {
      // Bare token reference → try to infer property from token name or value
      const tokenName = ctx.advance().value
      const tokenValue = ctx.designTokens.get(tokenName)

      // Check if token name ends with -col suffix
      if (tokenName.toLowerCase().endsWith('-col')) {
        if (typeof tokenValue === 'string') {
          template.properties['col'] = tokenValue
        } else {
          template.properties['col'] = `$${tokenName}`
        }
      } else if (typeof tokenValue === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(tokenValue)) {
        // Token value is a color → col property
        template.properties['col'] = tokenValue
      }
      // Otherwise skip (token might be for other purposes)
    } else if (token.type === 'STRING') {
      const stringToken = token
      const stringValue = ctx.advance().value
      // Create _text child node for the string content
      const textNode = createTextNode(
        stringValue,
        null, // Empty ID - will be generated on instantiation
        stringToken.line,
        stringToken.column
      )
      // Parse properties after the string - they belong to the text node
      while (ctx.current() &&
             ctx.current()!.type !== 'NEWLINE' &&
             ctx.current()!.type !== 'EOF') {
        const afterToken = ctx.current()!
        if (afterToken.type === 'PROPERTY') {
          const propName = ctx.advance().value
          if (ctx.current()?.type === 'NUMBER') {
            textNode.properties[propName] = parseInt(ctx.advance().value, 10)
          } else if (ctx.current()?.type === 'STRING') {
            textNode.properties[propName] = ctx.advance().value
          } else if (ctx.current()?.type === 'COLOR') {
            textNode.properties[propName] = ctx.advance().value
          } else if (ctx.current()?.type === 'TOKEN_REF') {
            textNode.properties[propName] = ctx.advance().value
          } else {
            textNode.properties[propName] = true
          }
        } else if (afterToken.type === 'COLOR') {
          // Bare color after string → text color
          textNode.properties['col'] = ctx.advance().value
        } else if (afterToken.type === 'NUMBER') {
          // Bare number after string → font size
          textNode.properties['size'] = parseInt(ctx.advance().value, 10)
        } else if (afterToken.type === 'TOKEN_REF') {
          // Bare token ref after string → could be color or size
          const tokenName = ctx.advance().value
          const tokenValue = ctx.designTokens.get(tokenName)
          if (typeof tokenValue === 'string') {
            textNode.properties['col'] = tokenValue
          } else if (typeof tokenValue === 'number') {
            textNode.properties['size'] = tokenValue
          }
        } else {
          break
        }
      }
      template.children.push(textNode)
    } else if (token.type === 'EVENT') {
      // Inline event handler: onclick toggle, onhover show Tooltip, etc.
      const eventLine = token.line
      const eventName = ctx.advance().value

      const handler: import('./types').EventHandler = {
        event: eventName,
        actions: [],
        line: eventLine
      }

      // Check for key modifier after onkeydown/onkeyup
      if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
        const possibleModifier = ctx.current()!.value.toLowerCase()
        if (KEY_MODIFIERS.has(possibleModifier)) {
          handler.modifier = ctx.advance().value.toLowerCase()
        }
      }

      // Parse inline action
      const current = ctx.current()
      if (current?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(current.value)) {
        const action = parseAction(ctx)
        if (action) handler.actions.push(action)
      }

      // Add handler to template
      if (!template.eventHandlers) template.eventHandlers = []
      template.eventHandlers.push(handler)
    } else {
      break
    }
  }
}

/**
 * Parse children of a component definition.
 */
function parseDefinitionChildren(ctx: ParserContext, template: ComponentTemplate, componentName: string): void {
  while (ctx.current() && ctx.current()!.type === 'INDENT') {
    const childIndent = parseInt(ctx.current()!.value, 10)
    if (childIndent > 0) {
      ctx.advance() // consume indent

      if (ctx.current()?.type === 'STRING') {
        // Text child
        const stringToken = ctx.current()!
        const textNode = createTextNode(
          ctx.advance().value,
          null, // Empty ID - will be generated on instantiation
          stringToken.line,
          stringToken.column
        )
        template.children.push(textNode)
      }
      // V2: Check for state definition
      else if (ctx.current()?.type === 'STATE') {
        const stateDef = parseStateDefinition(ctx, childIndent)
        if (stateDef) {
          if (!template.states) template.states = []
          template.states.push(stateDef)
        }
      }
      // V8: Check for behavior state block (highlight, select) or system state (hover, focus, active, disabled)
      // These are state blocks where the keyword IS the state name
      // e.g., `highlight` followed by newline and indented properties
      else if (
        ctx.current()?.type === 'COMPONENT_NAME' &&
        (BEHAVIOR_STATE_KEYWORDS.has(ctx.current()!.value) || SYSTEM_STATES.has(ctx.current()!.value)) &&
        ctx.peek(1)?.type === 'NEWLINE'
      ) {
        const stateDef = parseBehaviorStateDefinition(ctx, childIndent)
        if (stateDef) {
          if (!template.states) template.states = []
          template.states.push(stateDef)
        }
      }
      // V2: Check for event handler
      else if (ctx.current()?.type === 'EVENT') {
        const handler = parseEventHandler(ctx, childIndent)
        if (handler) {
          if (!template.eventHandlers) template.eventHandlers = []
          template.eventHandlers.push(handler)
        }
      }
      // V2: Check for variable declaration ($name = value)
      else if (ctx.current()?.type === 'TOKEN_REF' && ctx.peek(1)?.type === 'ASSIGNMENT') {
        const varDecl = parseVariableDeclaration(ctx)
        if (varDecl) {
          if (!template.variables) template.variables = []
          template.variables.push(varDecl)
        }
        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      }
      // V6: Check for animation action (show/hide/animate)
      else if (ctx.current()?.type === 'ANIMATION_ACTION') {
        const animDef = parseAnimationAction(ctx)
        if (animDef) {
          if (animDef.type === 'show') {
            template.showAnimation = animDef
          } else if (animDef.type === 'hide') {
            template.hideAnimation = animDef
          } else if (animDef.type === 'animate') {
            template.continuousAnimation = animDef
          }
        }
        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      }
      // V4: Check for list item (- prefix for new instance)
      else if (ctx.current()?.type === 'LIST_ITEM') {
        ctx.advance() // consume '-'
        if (ctx.current()?.type === 'COMPONENT_NAME') {
          const child = parseComponent(ctx, childIndent, componentName, false, true)
          if (child) {
            child._isListItem = true
            template.children.push(child)
          }
        }
      }
      else if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'COMPONENT_DEF') {
        // Component child - parse it with parent scope
        // Children are instances (not definitions), but they ARE part of a definition
        // so they should register in scoped registry if they have props
        // Note: COMPONENT_DEF handles cases like "Item:" which defines a slot template
        const isChildDef = ctx.current()?.type === 'COMPONENT_DEF'
        const child = parseComponent(ctx, childIndent, componentName, isChildDef, true)
        if (child) {
          template.children.push(child)
        }
      }

      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }
}

/**
 * Parse a token variable definition: $primary: #3B82F6
 *
 * Now supports:
 * - Simple values: $size: 16, $color: #FF0000
 * - Complex sequences: $default-pad: l-r 4
 * - Nested tokens: $lg-pad: $base-pad 8
 */
export function parseTokenDefinition(ctx: ParserContext): void {
  const tokenName = ctx.advance().value

  // Collect all tokens until end of line
  const valueTokens: import('./lexer').Token[] = []

  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    valueTokens.push(ctx.advance())
  }

  // Determine how to store the value
  if (valueTokens.length === 0) {
    // No value - skip
  } else if (valueTokens.length === 1) {
    // Single token - store as simple value for backwards compatibility
    const token = valueTokens[0]
    if (token.type === 'JSON_VALUE') {
      // Parse JSON array/object value
      try {
        const jsonValue = JSON.parse(token.value)
        ctx.designTokens.set(tokenName, jsonValue)
      } catch {
        // If JSON parsing fails, store as string
        ctx.designTokens.set(tokenName, token.value)
      }
    } else if (token.type === 'COLOR') {
      ctx.designTokens.set(tokenName, token.value)
    } else if (token.type === 'NUMBER') {
      ctx.designTokens.set(tokenName, parseInt(token.value, 10))
    } else if (token.type === 'STRING') {
      ctx.designTokens.set(tokenName, token.value)
    } else if (token.type === 'TOKEN_REF') {
      // Single token reference - resolve immediately if referenced token is a simple value
      const referencedValue = ctx.designTokens.get(token.value)
      if (referencedValue !== undefined && typeof referencedValue !== 'object') {
        // Referenced token is a simple value (number, string, color) - copy directly
        ctx.designTokens.set(tokenName, referencedValue)
      } else {
        // Forward reference or complex value - store as sequence for later resolution
        ctx.designTokens.set(tokenName, { type: 'sequence', tokens: valueTokens })
      }
    } else if (token.type === 'COMPONENT_NAME') {
      // CSS value like font name
      ctx.designTokens.set(tokenName, token.value)
    } else {
      // Store as sequence for other single tokens (MODIFIER, DIRECTION, etc.)
      ctx.designTokens.set(tokenName, { type: 'sequence', tokens: valueTokens })
    }
  } else {
    // Multiple tokens - store as sequence
    ctx.designTokens.set(tokenName, { type: 'sequence', tokens: valueTokens })
  }

  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }
}
