/**
 * String Handler
 *
 * Handles STRING tokens based on component type.
 * - Image: string becomes src, following numbers become w/h
 * - Input/Textarea: string becomes placeholder
 * - Link: string becomes href
 * - Item/Option: string becomes content
 * - Others: creates a _text child node
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import type { ASTNode } from '../../types'
import { INTERNAL_NODES } from '../../../constants'
import { parsePropertyValue } from '../../property-parser'
import {
  isImageComponent,
  isInputComponent,
  isTextareaComponent,
  isLinkComponent,
  isItemComponent
} from '../component-type-matcher'

/**
 * Image string handler - string becomes src.
 */
export const imageStringHandler: SugarHandler = {
  name: 'image-string',
  priority: 200, // High priority for specific component types
  tokenTypes: ['STRING'],

  canHandle(context: SugarContext): boolean {
    return isImageComponent(context.node)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context
    const stringValue = ctx.advance().value
    node.properties.src = stringValue

    // Check for width
    if (ctx.current()?.type === 'NUMBER') {
      node.properties.w = parseInt(ctx.advance().value, 10)
      // Check for height
      if (ctx.current()?.type === 'NUMBER') {
        node.properties.h = parseInt(ctx.advance().value, 10)
      }
    }

    return { handled: true }
  }
}

/**
 * Input string handler - string becomes placeholder.
 */
export const inputStringHandler: SugarHandler = {
  name: 'input-string',
  priority: 200,
  tokenTypes: ['STRING'],

  canHandle(context: SugarContext): boolean {
    return isInputComponent(context.node)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context
    node.properties.placeholder = ctx.advance().value
    return { handled: true }
  }
}

/**
 * Textarea string handler - string becomes placeholder.
 */
export const textareaStringHandler: SugarHandler = {
  name: 'textarea-string',
  priority: 200,
  tokenTypes: ['STRING'],

  canHandle(context: SugarContext): boolean {
    return isTextareaComponent(context.node)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context
    node.properties.placeholder = ctx.advance().value
    return { handled: true }
  }
}

/**
 * Link string handler - string becomes href.
 */
export const linkStringHandler: SugarHandler = {
  name: 'link-string',
  priority: 200,
  tokenTypes: ['STRING'],

  canHandle(context: SugarContext): boolean {
    return isLinkComponent(context.node)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context
    node.properties.href = ctx.advance().value
    return { handled: true }
  }
}

/**
 * Item/Option string handler - string becomes content.
 */
export const itemStringHandler: SugarHandler = {
  name: 'item-string',
  priority: 200,
  tokenTypes: ['STRING'],

  canHandle(context: SugarContext): boolean {
    return isItemComponent(context.node)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context
    node.content = ctx.advance().value
    return { handled: true }
  }
}

/**
 * Default string handler - creates a _text child node.
 * Properties/modifiers after the string belong to this text node.
 */
export const defaultStringHandler: SugarHandler = {
  name: 'default-string',
  priority: 50, // Low priority - runs after specific handlers
  tokenTypes: ['STRING'],

  canHandle(_context: SugarContext): boolean {
    // Always handle if no specific handler matched
    return true
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node, token } = context
    const stringValue = ctx.advance().value

    // Create _text child node
    const textNode: ASTNode = {
      type: 'component',
      name: INTERNAL_NODES.TEXT,
      id: ctx.generateId('text'),
      modifiers: [],
      properties: {},
      content: stringValue,
      children: [],
      line: token.line,
      column: token.column
    }

    // Parse properties after the string - they belong to the text node
    while (
      ctx.current() &&
      ctx.current()!.type !== 'NEWLINE' &&
      ctx.current()!.type !== 'EOF'
    ) {
      const afterToken = ctx.current()!
      if (afterToken.type === 'PROPERTY') {
        parsePropertyValue(ctx, textNode)
      } else if (afterToken.type === 'MODIFIER') {
        textNode.modifiers.push(ctx.advance().value)
      } else {
        // Not a property or modifier - stop parsing text properties
        break
      }
    }

    node.children.push(textNode)
    return { handled: true }
  }
}
