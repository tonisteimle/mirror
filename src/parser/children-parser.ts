/**
 * Children Parser Module
 *
 * Parses children of a component (indented lines).
 * Handles:
 * - Text content (strings)
 * - State definitions
 * - Event handlers
 * - Variable declarations
 * - Conditional blocks (if/else)
 * - Iterator blocks (each)
 * - List items (- prefix)
 * - Child components
 *
 * Uses dependency injection to avoid circular dependencies.
 */

import type { ParserContext } from './parser-context'
import type { ASTNode, ConditionExpr } from './types'
import { parseStateDefinition, parseVariableDeclaration, parseEventHandler, parseAnimationAction } from './state-parser'
import { parseCondition } from './condition-parser'
import { createTextNode } from './parser-utils'
import { isTokenSequence } from './types'
import { INTERNAL_NODES } from '../constants'

/**
 * Type for the component parser function (dependency injection).
 */
export type ComponentParserFn = (
  ctx: ParserContext,
  baseIndent: number,
  parentScope?: string
) => ASTNode | null

/**
 * Type for the iterator parser function (dependency injection).
 */
export type IteratorParserFn = (
  ctx: ParserContext,
  childIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
) => ASTNode

/**
 * Parse children of a component (indented lines).
 */
export function parseChildren(
  ctx: ParserContext,
  node: ASTNode,
  baseIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn,
  parseIteratorFn: IteratorParserFn
): ASTNode[] {
  const instanceChildren: ASTNode[] = []

  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const childIndent = parseInt(token.value, 10)

      if (childIndent > baseIndent) {
        ctx.advance() // consume indent

        // Check if it's strings with properties (inline text styling)
        // Handles: "Normal" "bold" weight 600 "normal again"
        if (ctx.current()?.type === 'STRING') {
          // Process all consecutive strings with their properties
          while (ctx.current()?.type === 'STRING') {
            const stringToken = ctx.current()!
            const textNode = createTextNode(
              ctx.advance().value,
              ctx.generateId.bind(ctx),
              stringToken.line,
              stringToken.column
            )

            // Parse properties after this string (stop at next STRING or NEWLINE)
            while (
              ctx.current() &&
              ctx.current()!.type !== 'NEWLINE' &&
              ctx.current()!.type !== 'EOF' &&
              ctx.current()!.type !== 'STRING'
            ) {
              const afterToken = ctx.current()!
              if (afterToken.type === 'PROPERTY') {
                const propName = ctx.advance().value
                // Parse property value
                const valueToken = ctx.current()
                if (valueToken?.type === 'NUMBER') {
                  textNode.properties[propName] = parseInt(ctx.advance().value, 10)
                } else if (valueToken?.type === 'COLOR') {
                  textNode.properties[propName] = ctx.advance().value
                } else if (valueToken?.type === 'TOKEN_REF') {
                  const tokenName = ctx.advance().value
                  const tokenValue = ctx.designTokens.get(tokenName)
                  if (tokenValue !== undefined && !isTokenSequence(tokenValue)) {
                    textNode.properties[propName] = tokenValue
                  }
                } else if (valueToken?.type === 'STRING') {
                  textNode.properties[propName] = ctx.advance().value
                } else {
                  // Boolean property (no value)
                  textNode.properties[propName] = true
                }
              } else if (afterToken.type === 'COLOR') {
                // Bare color → text color
                textNode.properties['col'] = ctx.advance().value
              } else if (afterToken.type === 'NUMBER') {
                // Bare number → font size
                textNode.properties['size'] = parseInt(ctx.advance().value, 10)
              } else if (afterToken.type === 'TOKEN_REF') {
                // Bare token ref → could be color or size
                const tokenName = ctx.advance().value
                const tokenValue = ctx.designTokens.get(tokenName)
                if (typeof tokenValue === 'string') {
                  textNode.properties['col'] = tokenValue
                } else if (typeof tokenValue === 'number') {
                  textNode.properties['size'] = tokenValue
                }
              } else {
                // Unknown token - stop parsing properties
                break
              }
            }

            instanceChildren.push(textNode)
          }

          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
        // V2: Check for state definition
        else if (ctx.current()?.type === 'STATE') {
          const stateDef = parseStateDefinition(ctx, childIndent)
          if (stateDef) {
            if (!node.states) node.states = []
            node.states.push(stateDef)
          }
        }
        // V2: Check for event handler
        else if (ctx.current()?.type === 'EVENT') {
          const handler = parseEventHandler(ctx, childIndent)
          if (handler) {
            if (!node.eventHandlers) node.eventHandlers = []
            node.eventHandlers.push(handler)
          }
        }
        // V6: Check for animation action (show/hide/animate)
        else if (ctx.current()?.type === 'ANIMATION_ACTION') {
          const animDef = parseAnimationAction(ctx)
          if (animDef) {
            if (animDef.type === 'show') {
              node.showAnimation = animDef
            } else if (animDef.type === 'hide') {
              node.hideAnimation = animDef
            } else if (animDef.type === 'animate') {
              node.continuousAnimation = animDef
            }
          }
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
        // V2: Check for variable declaration ($name = value)
        else if (ctx.current()?.type === 'TOKEN_REF' && ctx.peek(1)?.type === 'ASSIGNMENT') {
          const varDecl = parseVariableDeclaration(ctx)
          if (varDecl) {
            if (!node.variables) node.variables = []
            node.variables.push(varDecl)
          }
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
        // V3: Check for 'if' conditional
        else if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
          const condChild = parseConditional(ctx, node, childIndent, componentName, parseComponentFn)
          if (condChild) {
            instanceChildren.push(condChild)
          }
        }
        // V3: Check for 'each' iterator
        else if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'each') {
          const iterChild = parseIteratorFn(ctx, childIndent, componentName, parseComponentFn)
          if (iterChild) {
            instanceChildren.push(iterChild)
          }
        }
        // V4: Check for list item (- prefix for new instance)
        else if (ctx.current()?.type === 'LIST_ITEM') {
          ctx.advance() // consume '-'
          if (ctx.current()?.type === 'COMPONENT_NAME') {
            const child = parseComponentFn(ctx, childIndent, componentName)
            if (child) {
              child._isListItem = true
              instanceChildren.push(child)
            }
          }
        }
        else if (ctx.current()?.type === 'COMPONENT_NAME') {
          const child = parseComponentFn(ctx, childIndent, componentName)
          if (child) {
            instanceChildren.push(child)
          }
        }
        else {
          if (ctx.current()?.type === 'NEWLINE') {
            ctx.advance()
          }
        }
      } else {
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else if (token.type === 'COMPONENT_NAME') {
      break
    } else if (token.type === 'STRING') {
      const stringToken = ctx.current()!
      const textNode = createTextNode(
        ctx.advance().value,
        ctx.generateId.bind(ctx),
        stringToken.line,
        stringToken.column
      )
      instanceChildren.push(textNode)

      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  return instanceChildren
}

/**
 * Parse a conditional (if/else) block.
 */
function parseConditional(
  ctx: ParserContext,
  node: ASTNode,
  childIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
): ASTNode | null {
  const ifLine = ctx.current()!.line
  ctx.advance() // consume 'if'
  const condition = parseCondition(ctx)

  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  let isPropertyConditional = false
  if (ctx.current()?.type === 'INDENT') {
    const peekIndent = parseInt(ctx.current()!.value, 10)
    if (peekIndent > childIndent) {
      const nextTokenType = ctx.peek(1)?.type
      isPropertyConditional = nextTokenType === 'PROPERTY'
    }
  }

  if (isPropertyConditional && condition) {
    parseConditionalProperties(ctx, node, condition, childIndent)
    return null
  } else {
    return parseConditionalChildren(ctx, condition, ifLine, childIndent, componentName, parseComponentFn)
  }
}

/**
 * Parse a simple property value (NUMBER, COLOR, TOKEN_REF, COMPONENT_NAME, or boolean).
 * Returns the parsed value or true as default.
 */
function parseSimplePropertyValue(
  ctx: ParserContext
): string | number | boolean {
  const next = ctx.current()
  if (next?.type === 'NUMBER') {
    return parseInt(ctx.advance().value, 10)
  } else if (next?.type === 'COLOR') {
    return ctx.advance().value
  } else if (next?.type === 'TOKEN_REF') {
    const tokenName = ctx.advance().value
    const tokenValue = ctx.designTokens.get(tokenName)
    if (tokenValue !== undefined && !isTokenSequence(tokenValue)) {
      return tokenValue
    }
    return true
  } else if (next?.type === 'COMPONENT_NAME') {
    return ctx.advance().value
  }
  return true
}

/**
 * Parse properties block (for conditional then/else).
 * Returns parsed properties object.
 */
function parsePropertiesBlock(
  ctx: ParserContext,
  childIndent: number
): Record<string, string | number | boolean> {
  const properties: Record<string, string | number | boolean> = {}

  while (ctx.current()?.type === 'INDENT') {
    const propIndent = parseInt(ctx.current()!.value, 10)
    if (propIndent > childIndent) {
      ctx.advance()
      while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
        if (ctx.current()!.type === 'PROPERTY') {
          const propName = ctx.advance().value
          properties[propName] = parseSimplePropertyValue(ctx)
        } else {
          break
        }
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  return properties
}

/**
 * Parse conditional properties (if $cond then props else props).
 */
function parseConditionalProperties(
  ctx: ParserContext,
  node: ASTNode,
  condition: ConditionExpr,
  childIndent: number
): void {
  const thenProperties = parsePropertiesBlock(ctx, childIndent)
  let elseProperties: Record<string, string | number | boolean> | undefined

  // Check for 'else' block
  if (ctx.current()?.type === 'INDENT') {
    const elseIndent = parseInt(ctx.current()!.value, 10)
    if (elseIndent === childIndent) {
      const savedPos = ctx.pos
      ctx.advance()
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance()

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }

        elseProperties = parsePropertiesBlock(ctx, childIndent)
      } else {
        ctx.pos = savedPos
      }
    }
  }

  if (!node.conditionalProperties) node.conditionalProperties = []
  node.conditionalProperties.push({
    condition,
    thenProperties,
    elseProperties
  })
}

/**
 * Parse a child inside a conditional block (handles nested if, components, strings).
 */
function parseConditionalBlockChild(
  ctx: ParserContext,
  innerIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
): ASTNode | null {
  // Check for nested 'if' conditional
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
    const ifLine = ctx.current()!.line
    ctx.advance() // consume 'if'
    const nestedCondition = parseCondition(ctx)

    if (ctx.current()?.type === 'NEWLINE') {
      ctx.advance()
    }

    return parseConditionalChildren(ctx, nestedCondition, ifLine, innerIndent, componentName, parseComponentFn)
  }

  // Check for string content
  if (ctx.current()?.type === 'STRING') {
    const stringToken = ctx.current()!
    const textNode = createTextNode(
      ctx.advance().value,
      ctx.generateId.bind(ctx),
      stringToken.line,
      stringToken.column
    )
    return textNode
  }

  // Parse component
  if (ctx.current()?.type === 'COMPONENT_NAME') {
    return parseComponentFn(ctx, innerIndent, componentName)
  }

  return null
}

/**
 * Parse conditional child components (if/else with component children).
 */
function parseConditionalChildren(
  ctx: ParserContext,
  condition: ConditionExpr | null,
  ifLine: number,
  childIndent: number,
  componentName: string,
  parseComponentFn: ComponentParserFn
): ASTNode {
  const condNode: ASTNode = {
    type: 'component',
    name: INTERNAL_NODES.CONDITIONAL,
    id: ctx.generateId('cond'),
    properties: {},
    children: [],
    condition: condition || undefined,
    line: ifLine
  }

  while (ctx.current()?.type === 'INDENT') {
    const thenIndent = parseInt(ctx.current()!.value, 10)
    if (thenIndent > childIndent) {
      ctx.advance()
      const thenChild = parseConditionalBlockChild(ctx, thenIndent, componentName, parseComponentFn)
      if (thenChild) {
        condNode.children.push(thenChild)
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  if (ctx.current()?.type === 'INDENT') {
    const elseIndent = parseInt(ctx.current()!.value, 10)
    if (elseIndent === childIndent) {
      const savedPos = ctx.pos
      ctx.advance()
      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance()
        condNode.elseChildren = []

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }

        while (ctx.current()?.type === 'INDENT') {
          const elseChildIndent = parseInt(ctx.current()!.value, 10)
          if (elseChildIndent > childIndent) {
            ctx.advance()
            const elseChild = parseConditionalBlockChild(ctx, elseChildIndent, componentName, parseComponentFn)
            if (elseChild) {
              condNode.elseChildren.push(elseChild)
            }
            if (ctx.current()?.type === 'NEWLINE') {
              ctx.advance()
            }
          } else {
            break
          }
        }
      } else {
        ctx.pos = savedPos
      }
    }
  }

  return condNode
}
