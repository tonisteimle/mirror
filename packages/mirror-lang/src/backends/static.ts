/**
 * Mirror Static Backend
 *
 * Generates static HTML output.
 * For SSG/SSR scenarios.
 */

import type { AST } from '../parser/ast'
import { toIR } from '../ir'

/**
 * Generate static HTML from Mirror AST
 *
 * TODO: Implement full HTML generation with inline styles
 */
export function generateStatic(ast: AST): string {
  const ir = toIR(ast)

  const lines: string[] = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Mirror App</title>',
    '  <style>',
    '    /* TODO: Generate CSS from tokens and styles */',
    '  </style>',
    '</head>',
    '<body>',
    ''
  ]

  // Generate HTML for each node
  for (const node of ir.nodes) {
    lines.push(`  <!-- ${node.name || node.tag} -->`)
    lines.push(`  <${node.tag}></${node.tag}>`)
  }

  lines.push('')
  lines.push('</body>')
  lines.push('</html>')
  lines.push('')

  return lines.join('\n')
}
