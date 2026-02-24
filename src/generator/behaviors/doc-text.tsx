/**
 * Doc Text Behavior
 *
 * Renders formatted text blocks for doc-mode.
 * Handles $token block-level and $token[phrase] inline formatting.
 *
 * Token Override System:
 * - Default styles for $h1, $p, etc. are defined in doc-tokens.ts
 * - Users can override these by defining tokens with the same name in the Tokens tab
 * - Custom tokens are merged with defaults (custom values take precedence)
 */

import React from 'react'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import type { ASTNode, TokenValue } from '../../parser/types'
import { parseDocText, normalizeIndent, type TextSegment } from '../../parser/doc-text-parser'
import { getDocToken, docTokenToStyles, isBlockToken, type DocTokenDef } from '../../parser/doc-tokens'
import { useTokens } from '../contexts'

/**
 * Build a DocTokenDef from related tokens in the token map.
 *
 * Supports two patterns:
 * 1. Direct token: $h1 with object value -> uses value directly
 * 2. Property tokens: $h1-size, $h1-col, etc. -> merged into h1 token
 *
 * Property name mapping:
 * - size -> size (font size)
 * - col/color -> col (text color)
 * - bg -> bg (background)
 * - weight -> weight (font weight)
 * - line -> line (line height)
 * - mar/margin -> mar (margin)
 * - pad/padding -> pad (padding)
 * - rad/radius -> rad (border radius)
 */
function buildDocTokenFromMap(
  tokenName: string,
  tokens: Map<string, TokenValue> | null
): DocTokenDef | null {
  if (!tokens) return null

  const result: DocTokenDef = {}

  // Check for direct token value (e.g., $h1 as object)
  const directValue = tokens.get(tokenName)
  if (directValue && typeof directValue === 'object' && directValue !== null) {
    // If it's a token sequence, convert it
    if ('type' in directValue && directValue.type === 'sequence') {
      const seqTokens = directValue.tokens || []
      for (let i = 0; i < seqTokens.length; i++) {
        const token = seqTokens[i]
        if (token.type === 'PROPERTY' && i + 1 < seqTokens.length) {
          const nextToken = seqTokens[i + 1]
          if (nextToken.type === 'NUMBER' || nextToken.type === 'STRING' || nextToken.type === 'COLOR') {
            (result as Record<string, unknown>)[token.value as string] = nextToken.value
            i++
          }
        }
      }
    } else {
      // Direct object
      Object.assign(result, directValue)
    }
  }

  // Property mapping for suffixed tokens
  const propertyMap: Record<string, keyof DocTokenDef> = {
    'size': 'size',
    'font-size': 'size',
    'fs': 'size',
    'col': 'col',
    'color': 'col',
    'bg': 'bg',
    'weight': 'weight',
    'line': 'line',
    'mar': 'mar',
    'margin': 'mar',
    'pad': 'pad',
    'padding': 'pad',
    'rad': 'rad',
    'radius': 'rad',
    'font': 'font',
    'align': 'align',
    'maxw': 'maxw',
  }

  // Look for suffixed tokens (e.g., $h1-size, $h1-col)
  for (const [suffix, propName] of Object.entries(propertyMap)) {
    const suffixedToken = tokens.get(`${tokenName}-${suffix}`)
    if (suffixedToken !== undefined) {
      // Simple value (number or string)
      if (typeof suffixedToken === 'number' || typeof suffixedToken === 'string') {
        (result as Record<string, unknown>)[propName] = suffixedToken
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

interface RenderSegmentOptions {
  customTokens?: Map<string, TokenValue> | null
  isChild?: boolean
}

/**
 * Render a text segment with its token styles
 * @param isChild - true when rendering children of a block (should not wrap in <p>)
 */
function renderSegment(
  segment: TextSegment,
  index: number,
  options: RenderSegmentOptions = {}
): React.ReactNode {
  const { customTokens, isChild = false } = options

  // Get styles from token
  let styles: React.CSSProperties = {}

  if (segment.token) {
    // Start with default doc token styles
    const defaultToken = getDocToken(segment.token)
    let mergedToken: DocTokenDef = defaultToken ? { ...defaultToken } : {}

    // Check for custom token override (from Tokens tab)
    // Supports: $h1 with object value, or $h1-size, $h1-col, etc.
    const customToken = buildDocTokenFromMap(segment.token, customTokens ?? null)
    if (customToken) {
      // Merge: custom values override defaults
      mergedToken = { ...mergedToken, ...customToken }
    }

    // Convert merged token to CSS styles
    if (Object.keys(mergedToken).length > 0) {
      styles = docTokenToStyles(mergedToken)
    }
  }

  // Handle link type
  if (segment.type === 'link' && segment.url) {
    return (
      <a
        key={index}
        href={segment.url}
        style={styles}
        target="_blank"
        rel="noopener noreferrer"
      >
        {segment.content}
      </a>
    )
  }

  // Handle block type (creates a new block element)
  if (segment.type === 'block') {
    const isBlock = segment.token ? isBlockToken(segment.token) : false
    const Tag = isBlock ? 'div' : 'span'

    // If has children (inline tokens within), render them as inline (isChild=true)
    if (segment.children && segment.children.length > 0) {
      return (
        <Tag key={index} style={styles}>
          {segment.children.map((child, i) => renderSegment(child, i, { ...options, isChild: true }))}
        </Tag>
      )
    }

    return (
      <Tag key={index} style={styles}>
        {segment.content}
      </Tag>
    )
  }

  // Handle inline type
  if (segment.type === 'inline') {
    return (
      <span key={index} style={styles}>
        {segment.content}
      </span>
    )
  }

  // Plain text - render as span if child of block, otherwise as paragraph
  if (isChild) {
    return <span key={index}>{segment.content}</span>
  }
  return <p key={index} style={{ margin: 0 }}>{segment.content}</p>
}

/**
 * Internal React component for DocText rendering
 * Separated to allow proper React hook usage (useTokens)
 */
interface DocTextRendererProps {
  node: ASTNode
}

function DocTextRenderer({ node }: DocTextRendererProps): React.ReactNode {
  // Get custom tokens from context (defined in Tokens tab)
  const customTokens = useTokens()

  // Get the multiline string content
  const content = node.properties._docContent as string || node.content || ''

  if (!content) {
    return null
  }

  // Normalize indentation and parse the content
  const normalizedContent = normalizeIndent(content)
  const segments = parseDocText(normalizedContent)

  // Container styles - gap separates paragraphs
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75em',
  }

  // Render options
  const renderOptions: RenderSegmentOptions = {
    customTokens,
  }

  return (
    <div style={containerStyle} data-source-line={node.line}>
      {segments.map((segment, index) => renderSegment(segment, index, renderOptions))}
    </div>
  )
}

/**
 * Doc Text Behavior Handler
 */
const DocTextBehavior: BehaviorHandler = {
  name: 'text',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    _renderFn: RenderFn,
    _registry: BehaviorRegistry
  ): React.ReactNode {
    return <DocTextRenderer node={node} />
  }
}

// Export behavior handler - use named export for clarity
export { DocTextBehavior }
