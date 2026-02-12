/**
 * String Handler
 *
 * Handles STRING tokens based on component type.
 * - Image: string becomes src, following numbers become w/h
 * - Input/Textarea: string becomes placeholder
 * - Link: string becomes href
 * - Item/Option: string becomes content
 * - Others: creates a _text child node
 *
 * Inline Span Syntax:
 * - *text*:bold → bold text
 * - *text*:italic → italic text
 * - *text*:underline → underlined text
 * - *text*:$token → styled with token properties
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import type { ASTNode } from '../../types'
import type { ParserContext } from '../../parser-context'
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
 * Inline span segment from parsing a string
 */
interface InlineSpan {
  text: string
  style?: string // 'bold', 'italic', 'underline', or '$tokenName'
}

/**
 * Built-in style mappings for inline spans
 */
const BUILTIN_STYLES: Record<string, Record<string, unknown>> = {
  bold: { weight: 700 },
  italic: { italic: true },
  underline: { underline: true },
}

/**
 * Parse a string for inline spans with syntax: *text*:style
 * Returns array of segments, each with text and optional style
 *
 * Rules:
 * - *text*:style → styled span (bold, italic, underline, $token)
 * - *text* without :style → treated as literal text
 * - \* → escaped asterisk
 */
export function parseInlineSpans(input: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  let pos = 0
  let currentText = ''

  while (pos < input.length) {
    // Check for escape sequence
    if (input[pos] === '\\' && pos + 1 < input.length && input[pos + 1] === '*') {
      currentText += '*'
      pos += 2
      continue
    }

    // Check for potential span start
    if (input[pos] === '*') {
      // Find the closing *
      const spanStart = pos + 1
      let spanEnd = -1
      for (let i = spanStart; i < input.length; i++) {
        if (input[i] === '\\' && i + 1 < input.length && input[i + 1] === '*') {
          i++ // Skip escaped *
          continue
        }
        if (input[i] === '*') {
          spanEnd = i
          break
        }
      }

      if (spanEnd === -1) {
        // No closing * found, treat as literal
        currentText += input[pos]
        pos++
        continue
      }

      // Check if there's a :style after the closing *
      const afterClose = spanEnd + 1
      if (afterClose < input.length && input[afterClose] === ':') {
        // Check for valid style name
        let styleStart = afterClose + 1
        let styleName = ''
        if (styleStart < input.length && input[styleStart] === '$') {
          styleName = '$'
          styleStart++
        }
        while (styleStart < input.length && /[a-zA-Z0-9_-]/.test(input[styleStart])) {
          styleName += input[styleStart]
          styleStart++
        }

        if (styleName) {
          // Valid styled span found - save preceding text and create span
          if (currentText) {
            spans.push({ text: currentText })
            currentText = ''
          }

          // Extract span text (handle escapes)
          let spanText = ''
          for (let i = spanStart; i < spanEnd; i++) {
            if (input[i] === '\\' && i + 1 < input.length && input[i + 1] === '*') {
              spanText += '*'
              i++
            } else {
              spanText += input[i]
            }
          }

          spans.push({ text: spanText, style: styleName })
          pos = styleStart
          continue
        }
      }

      // No valid :style found - treat *...* as literal text
      currentText += input[pos]
      pos++
    } else {
      currentText += input[pos]
      pos++
    }
  }

  // Add remaining text
  if (currentText) {
    spans.push({ text: currentText })
  }

  return spans
}

/**
 * Check if a value is a token sequence
 */
interface TokenSequence {
  type: 'sequence'
  tokens: Array<{ type: string; value: string }>
}

function isTokenSequence(value: unknown): value is TokenSequence {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: unknown }).type === 'sequence' &&
    'tokens' in value
  )
}

/**
 * Convert a token sequence to properties
 * Parses property-value pairs: col #234 weight 700 → { col: '#234', weight: 700 }
 */
function sequenceToProperties(sequence: TokenSequence): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const tokens = sequence.tokens
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === 'PROPERTY') {
      const propName = token.value
      // Look for value in next token
      if (i + 1 < tokens.length) {
        const valueToken = tokens[i + 1]
        if (valueToken.type === 'COLOR' || valueToken.type === 'STRING') {
          properties[propName] = valueToken.value
          i += 2
          continue
        } else if (valueToken.type === 'NUMBER') {
          properties[propName] = parseInt(valueToken.value, 10)
          i += 2
          continue
        }
      }
      // Property without value (boolean flag)
      properties[propName] = true
      i++
    } else {
      // Skip non-property tokens
      i++
    }
  }

  return properties
}

/**
 * Resolve style properties for an inline span
 */
export function resolveSpanStyle(
  style: string,
  ctx: ParserContext
): Record<string, unknown> {
  // Check built-in styles first
  if (BUILTIN_STYLES[style]) {
    return { ...BUILTIN_STYLES[style] }
  }

  // Check for token reference
  if (style.startsWith('$')) {
    const tokenName = style.slice(1)
    const tokenValue = ctx.designTokens.get(tokenName)

    if (tokenValue) {
      // Handle token sequence (col #234 weight 700)
      if (isTokenSequence(tokenValue)) {
        return sequenceToProperties(tokenValue)
      }

      // Handle object with properties
      if (typeof tokenValue === 'object' && !Array.isArray(tokenValue)) {
        return { ...(tokenValue as Record<string, unknown>) }
      }
    }
  }

  // Unknown style, return empty
  return {}
}

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
 * Link string handler - first string becomes href, subsequent strings become content.
 */
export const linkStringHandler: SugarHandler = {
  name: 'link-string',
  priority: 200,
  tokenTypes: ['STRING'],

  canHandle(context: SugarContext): boolean {
    return isLinkComponent(context.node)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node, token } = context
    const stringValue = ctx.advance().value

    // If href is already set, this string becomes content (text child)
    if (node.properties.href) {
      const textNode: ASTNode = {
        type: 'component',
        name: INTERNAL_NODES.TEXT,
        id: ctx.generateId('text'),
        properties: {},
        content: stringValue,
        children: [],
        line: token.line,
        column: token.column
      }
      node.children.push(textNode)
    } else {
      // First string becomes href
      node.properties.href = stringValue
    }
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
 * Default string handler - creates _text child nodes.
 * Handles consecutive strings with properties: "Normal" "bold" weight 600 "normal"
 * Each string becomes a span, properties after a string apply to that span.
 * Consecutive strings are rendered inline with spaces between them.
 *
 * Inline spans: "text *styled*:bold more text"
 * - *text*:bold → bold
 * - *text*:italic → italic
 * - *text*:underline → underline
 * - *text*:$token → custom style token
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
    const { ctx, node } = context

    // For the first string, check if there's an existing _text child from template
    let isFirstString = true
    const existingTextIndex = node.children.findIndex(c => c.name === INTERNAL_NODES.TEXT)

    // Process all consecutive STRING tokens
    while (ctx.current()?.type === 'STRING') {
      const stringToken = ctx.current()!
      const stringValue = ctx.advance().value

      // Parse inline spans from the string
      const spans = parseInlineSpans(stringValue)

      // Create _text nodes for each span
      for (let i = 0; i < spans.length; i++) {
        const span = spans[i]

        // Get style properties for this span
        const spanProperties: Record<string, unknown> = span.style
          ? resolveSpanStyle(span.style, ctx)
          : {}

        // Create _text child node
        let textNode: ASTNode
        if (isFirstString && i === 0 && existingTextIndex >= 0) {
          // Replace existing template text node for first span of first string
          textNode = {
            ...node.children[existingTextIndex],
            content: span.text,
            properties: { ...node.children[existingTextIndex].properties, ...spanProperties }
          }
          node.children[existingTextIndex] = textNode
        } else {
          textNode = {
            type: 'component',
            name: INTERNAL_NODES.TEXT,
            id: ctx.generateId('text'),
            properties: spanProperties,
            content: span.text,
            children: [],
            line: stringToken.line,
            column: stringToken.column
          }
          node.children.push(textNode)
        }

        // For the last span in this string, parse trailing properties
        if (i === spans.length - 1) {
          // Parse properties/colors after the string - they belong to this text node
          // Stop when we hit another STRING (which will be processed in next iteration)
          while (
            ctx.current() &&
            ctx.current()!.type !== 'NEWLINE' &&
            ctx.current()!.type !== 'EOF' &&
            ctx.current()!.type !== 'STRING'
          ) {
            const afterToken = ctx.current()!
            if (afterToken.type === 'COMMA') {
              // Skip comma separators
              ctx.advance()
              continue
            } else if (afterToken.type === 'PROPERTY') {
              parsePropertyValue(ctx, textNode)
            } else if (afterToken.type === 'COLOR') {
              // Bare color after string → text color
              textNode.properties['col'] = ctx.advance().value
            } else if (afterToken.type === 'NUMBER') {
              // Bare number after string → font size
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
              // Not a text-related token - stop parsing
              break
            }
          }
        }
      }

      isFirstString = false
    }

    return { handled: true }
  }
}
