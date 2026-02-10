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
import { parseStateDefinition, parseVariableDeclaration, parseEventHandler } from './state-parser'
import { parseComponent } from './component-parser'
import { parseLayoutProperty, parseCenterProperty } from './property-parser'
import { createTextNode } from './parser-utils'

/**
 * Parse a component definition: Button: hor cen gap 8 "Label"
 */
export function parseComponentDefinition(ctx: ParserContext): void {
  const componentName = ctx.advance().value
  const template: ComponentTemplate = {
    modifiers: [],
    properties: {},
    children: []
  }

  // Check for "from" keyword: PrimaryButton: from Button bg #EF4444
  if (ctx.current()?.type === 'KEYWORD' && ctx.current()?.value === 'from') {
    ctx.advance() // consume 'from'

    // Get base component name
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const baseComponentName = ctx.advance().value

      // Apply base component template if it exists
      if (ctx.registry.has(baseComponentName)) {
        const baseTemplate = ctx.registry.get(baseComponentName)!
        template.modifiers = [...baseTemplate.modifiers]
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

    if (token.type === 'MODIFIER') {
      template.modifiers.push(ctx.advance().value)
    } else if (token.type === 'PROPERTY') {
      const propName = ctx.advance().value

      // Handle pad/mar/bor with directions or CSS shorthand
      if (propName === 'pad' || propName === 'mar' || propName === 'bor') {
        const directions: string[] = []
        while (ctx.current()?.type === 'DIRECTION') {
          directions.push(...splitDirections(ctx.advance().value))
        }

        const values: number[] = []
        while (ctx.current()?.type === 'NUMBER') {
          values.push(parseInt(ctx.advance().value, 10))
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
      } else {
        const next = ctx.current()
        if (next && (next.type === 'NUMBER' || next.type === 'COLOR')) {
          template.properties[propName] = next.type === 'NUMBER'
            ? parseInt(ctx.advance().value, 10)
            : ctx.advance().value
        } else if (next?.type === 'COMPONENT_NAME' && CSS_COLOR_KEYWORDS.has(next.value.toLowerCase())) {
          // CSS color keyword like 'transparent', 'white', etc.
          template.properties[propName] = ctx.advance().value
        } else {
          template.properties[propName] = true
        }
      }
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
        } else if (afterToken.type === 'MODIFIER') {
          textNode.modifiers.push(ctx.advance().value)
        } else {
          break
        }
      }
      template.children.push(textNode)
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
      else if (ctx.current()?.type === 'COMPONENT_NAME') {
        // Component child - parse it with parent scope
        // Children are instances (not definitions), but they ARE part of a definition
        // so they should register in scoped registry if they have props
        const child = parseComponent(ctx, childIndent, componentName, false, true)
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
    if (token.type === 'COLOR') {
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
