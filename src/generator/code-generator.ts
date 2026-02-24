/**
 * React Code Generator
 *
 * Generates React code strings from AST nodes for export functionality.
 */

import type { ASTNode } from '../parser/parser'
import { INTERNAL_NODES } from '../constants'
import { propertiesToStyle } from '../utils/style-converter'
import { sanitizeTextContent } from '../utils/sanitize'
import { toPascalCase } from './utils'

export interface RenderedComponent {
  element: React.ReactNode
  code: string
}

/**
 * Generate React code string from AST nodes.
 * Used for code export functionality.
 */
export function generateReactCode(nodes: ASTNode[], indent = 0): string {
  const spaces = '  '.repeat(indent)
  let code = ''

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.name === INTERNAL_NODES.TEXT) {
      // Apply text properties (col, size, etc.)
      const textStyle = propertiesToStyle(node.properties, false, node.name)
      const hasTextStyle = Object.keys(textStyle).length > 0
      // Check if next node is also _text - if so, add space
      const nextNode = nodes[i + 1]
      const addSpace = nextNode && nextNode.name === INTERNAL_NODES.TEXT ? ' ' : ''
      if (hasTextStyle) {
        const textStyleStr = JSON.stringify(textStyle, null, 2)
          .split('\n')
          .map((line, idx) => (idx === 0 ? line : spaces + '  ' + line))
          .join('\n')
        code += `${spaces}<span style={${textStyleStr}}>${sanitizeTextContent(node.content)}</span>${addSpace}\n`
      } else {
        code += `${spaces}<span>${sanitizeTextContent(node.content)}</span>${addSpace}\n`
      }
      continue
    }

    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
    const hasTextChildren = node.children.length > 0 &&
      node.children.some(child => child.name === INTERNAL_NODES.TEXT)
    const style = propertiesToStyle(node.properties, hasRealChildren, node.name)

    const styleStr = JSON.stringify(style, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : spaces + '    ' + line))
      .join('\n')
    const hasContent = node.content !== undefined

    if (hasRealChildren || hasTextChildren) {
      code += `${spaces}<div className="${node.name}" style={${styleStr}}>\n`
      code += generateReactCode(node.children, indent + 1)
      code += `${spaces}</div>\n`
    } else if (hasContent) {
      code += `${spaces}<div className="${node.name}" style={${styleStr}}>`
      // Use JSON.stringify to safely escape content for JSX
      code += `{${JSON.stringify(node.content)}}`
      code += `</div>\n`
    } else {
      code += `${spaces}<div className="${node.name}" style={${styleStr}} />\n`
    }
  }

  return code
}
