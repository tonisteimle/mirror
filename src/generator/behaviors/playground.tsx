/**
 * Playground Behavior
 *
 * Renders Mirror code as both syntax-highlighted code view
 * AND a live preview of the rendered components.
 */

import React, { useMemo } from 'react'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import type { ASTNode } from '../../parser/types'
import { parse } from '../../parser/parser'
import { normalizeIndent } from '../../parser/doc-text-parser'
import { useTokens, useTemplateRegistry } from '../contexts'

/**
 * Syntax highlight Mirror code
 */
function highlightMirrorCode(code: string): React.ReactNode[] {
  const lines = code.split('\n')
  const elements: React.ReactNode[] = []

  const colors = {
    component: '#5ba8f5',
    property: '#888',
    value: '#b96',
    string: '#a88',
    keyword: '#2271c1',
    token: '#5ba8f5',
    comment: '#555',
  }

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      elements.push(<br key={`br-${lineIndex}`} />)
    }

    // Simple tokenization for highlighting
    let pos = 0
    const tokens: React.ReactNode[] = []
    const tokenIndex = 0

    // Skip leading whitespace (preserve indentation)
    const indentMatch = line.match(/^(\s*)/)
    if (indentMatch && indentMatch[1]) {
      tokens.push(
        <span key={`indent-${lineIndex}`} style={{ whiteSpace: 'pre' }}>
          {indentMatch[1]}
        </span>
      )
      pos = indentMatch[1].length
    }

    // Check for comment
    const commentIndex = line.indexOf('//')
    if (commentIndex !== -1 && commentIndex >= pos) {
      // Add content before comment
      if (commentIndex > pos) {
        tokens.push(...tokenizeLine(line.slice(pos, commentIndex), lineIndex, tokenIndex, colors))
      }
      // Add comment
      tokens.push(
        <span key={`comment-${lineIndex}`} style={{ color: colors.comment }}>
          {line.slice(commentIndex)}
        </span>
      )
    } else {
      tokens.push(...tokenizeLine(line.slice(pos), lineIndex, tokenIndex, colors))
    }

    elements.push(...tokens)
  })

  return elements
}

/**
 * Tokenize a line segment for syntax highlighting
 */
function tokenizeLine(
  text: string,
  lineIndex: number,
  startIndex: number,
  colors: Record<string, string>
): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let pos = 0
  let index = startIndex

  // Regex patterns
  const patterns = [
    { regex: /^"[^"]*"/, type: 'string' },
    { regex: /^#[0-9a-fA-F]{3,8}/, type: 'value' },
    { regex: /^\$[a-zA-Z_][a-zA-Z0-9_-]*/, type: 'token' },
    { regex: /^[A-Z][a-zA-Z0-9_-]*/, type: 'component' },
    { regex: /^(if|else|each|in|from|to|state|events|onclick|onhover|onchange|oninput|onfocus|onblur)\b/, type: 'keyword' },
    { regex: /^[0-9]+(%)?/, type: 'value' },
    { regex: /^[a-z][a-z0-9-]*/, type: 'property' },
  ]

  while (pos < text.length) {
    // Skip whitespace
    const wsMatch = text.slice(pos).match(/^\s+/)
    if (wsMatch) {
      tokens.push(
        <span key={`ws-${lineIndex}-${index++}`} style={{ whiteSpace: 'pre' }}>
          {wsMatch[0]}
        </span>
      )
      pos += wsMatch[0].length
      continue
    }

    // Try each pattern
    let matched = false
    for (const { regex, type } of patterns) {
      const match = text.slice(pos).match(regex)
      if (match) {
        tokens.push(
          <span
            key={`token-${lineIndex}-${index++}`}
            style={{ color: colors[type] || '#ccc' }}
          >
            {match[0]}
          </span>
        )
        pos += match[0].length
        matched = true
        break
      }
    }

    // If no pattern matched, add single character
    if (!matched) {
      tokens.push(
        <span key={`char-${lineIndex}-${index++}`}>
          {text[pos]}
        </span>
      )
      pos++
    }
  }

  return tokens
}

/**
 * Internal React component for Playground rendering
 * Separated to allow proper React hook usage
 */
interface PlaygroundRendererProps {
  node: ASTNode
  renderFn: RenderFn
}

function PlaygroundRenderer({ node, renderFn }: PlaygroundRendererProps): React.ReactNode {
  // Get parent context for token/registry inheritance
  const parentTokens = useTokens()
  const parentRegistry = useTemplateRegistry()

  // Get the multiline string content
  const content = node.properties._docContent as string || node.content || ''

  // Normalize indentation
  const normalizedCode = normalizeIndent(content)

  // Parse the code for preview with parent context
  const parseResult = useMemo(() => {
    if (!content) return null
    try {
      return parse(normalizedCode, {
        parentTokens: parentTokens ?? undefined,
        parentRegistry: parentRegistry ?? undefined
      })
    } catch {
      return null
    }
  }, [normalizedCode, content, parentTokens, parentRegistry])

  if (!content) {
    return null
  }

  // Layout mode
  const layout = node.properties.layout as string || 'vertical'
  const isHorizontal = layout === 'hor' || layout === 'horizontal'
  const codeOnly = node.properties['code-only'] === true
  const previewOnly = node.properties['preview-only'] === true

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    gap: '16px',
    margin: '24px 0',
  }

  const codeStyle: React.CSSProperties = {
    backgroundColor: '#0a0a0a',
    border: '1px solid #222',
    borderRadius: '4px',
    padding: '16px',
    fontFamily: '"SF Mono", "Consolas", monospace',
    fontSize: '12px',
    lineHeight: 1.6,
    overflow: 'auto',
    flex: isHorizontal ? 1 : undefined,
  }

  const previewStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #222',
    borderRadius: '4px',
    padding: '12px',
    flex: isHorizontal ? 1 : undefined,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
  }

  const labelStyle: React.CSSProperties = {
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontSize: '11px',
    color: '#666',
    marginBottom: '6px',
  }

  // Render preview
  const renderPreview = () => {
    if (!parseResult || parseResult.errors.length > 0) {
      return (
        <div style={{ color: '#ef4444', fontSize: '12px' }}>
          {parseResult?.errors.map((e, i) => (
            <div key={i}>{e}</div>
          )) || 'Parse error'}
        </div>
      )
    }

    return parseResult.nodes.map((childNode, index) => (
      <React.Fragment key={childNode.id || index}>
        {renderFn(childNode)}
      </React.Fragment>
    ))
  }

  return (
    <div style={containerStyle} data-source-line={node.line}>
      {!previewOnly && (
        <div>
          <div style={labelStyle}>Code</div>
          <pre style={codeStyle}>
            <code>{highlightMirrorCode(normalizedCode)}</code>
          </pre>
        </div>
      )}
      {!codeOnly && (
        <div>
          <div style={labelStyle}>Preview</div>
          <div style={previewStyle}>{renderPreview()}</div>
        </div>
      )}
    </div>
  )
}

/**
 * Playground Behavior Handler
 */
const PlaygroundBehavior: BehaviorHandler = {
  name: 'playground',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ): React.ReactNode {
    return <PlaygroundRenderer node={node} renderFn={renderFn} />
  }
}

// Export behavior handler - use named export for clarity
export { PlaygroundBehavior }
