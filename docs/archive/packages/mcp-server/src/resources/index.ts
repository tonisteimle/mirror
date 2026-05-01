import type { MirrorBridge } from '../bridge.js'
import {
  parseMirror,
  generateStructureSummary,
  getElementAtLine,
  type MirrorStructure
} from '../parser/mirror-parser.js'

/**
 * Resource definitions for MCP
 */
export interface ResourceDefinition {
  uri: string
  name: string
  description: string
  mimeType: string
}

export const RESOURCES: ResourceDefinition[] = [
  {
    uri: 'mirror://file',
    name: 'Current File',
    description: 'The currently open Mirror file content and path',
    mimeType: 'text/plain',
  },
  {
    uri: 'mirror://selection',
    name: 'Selection',
    description: 'Currently selected element with line, type, and properties',
    mimeType: 'application/json',
  },
  {
    uri: 'mirror://tokens',
    name: 'Tokens',
    description: 'All defined design tokens with their values and types',
    mimeType: 'application/json',
  },
  {
    uri: 'mirror://components',
    name: 'Components',
    description: 'All defined components with slots, states, and inheritance',
    mimeType: 'application/json',
  },
  {
    uri: 'mirror://structure',
    name: 'Structure',
    description: 'Full structural analysis of the Mirror file - element tree, components, tokens',
    mimeType: 'text/markdown',
  },
  {
    uri: 'mirror://element-at-line',
    name: 'Element at Line',
    description: 'Get detailed info about element at a specific line (use with ?line=N)',
    mimeType: 'application/json',
  },
  {
    uri: 'mirror://context',
    name: 'Full Context',
    description: 'Complete context for AI assistance - file, structure, selection, errors',
    mimeType: 'text/markdown',
  },
  {
    uri: 'mirror://errors',
    name: 'Errors',
    description: 'Current validation errors and warnings',
    mimeType: 'application/json',
  },
  {
    uri: 'mirror://dsl-reference',
    name: 'DSL Reference',
    description: 'Quick reference for Mirror DSL syntax, primitives, and properties',
    mimeType: 'text/markdown',
  },
]

// Cache parsed structure
let cachedContent: string | null = null
let cachedStructure: MirrorStructure | null = null

function getStructure(content: string | null): MirrorStructure | null {
  if (!content) return null

  if (content === cachedContent && cachedStructure) {
    return cachedStructure
  }

  cachedContent = content
  cachedStructure = parseMirror(content)
  return cachedStructure
}

/**
 * Get resource content by URI
 */
export function getResourceContent(
  uri: string,
  bridge: MirrorBridge
): string {
  const state = bridge.getState()
  const structure = getStructure(state.fileContent)

  // Handle query parameters
  const [baseUri, query] = uri.split('?')
  const params = new URLSearchParams(query || '')

  switch (baseUri) {
    case 'mirror://file':
      return JSON.stringify({
        path: state.filePath,
        content: state.fileContent,
        lineCount: state.fileContent?.split('\n').length || 0,
        connected: bridge.isConnected(),
      }, null, 2)

    case 'mirror://selection':
      if (!state.selection || !structure) {
        return JSON.stringify({
          selected: false,
          message: 'No element selected',
        }, null, 2)
      }

      const selectedElement = getElementAtLine(structure, state.selection.line)
      return JSON.stringify({
        selected: true,
        line: state.selection.line,
        column: state.selection.column,
        element: selectedElement ? {
          type: selectedElement.type,
          name: selectedElement.name,
          content: selectedElement.content,
          properties: selectedElement.properties,
          states: selectedElement.states,
          childCount: selectedElement.children.length,
        } : null,
      }, null, 2)

    case 'mirror://tokens':
      if (!structure) {
        return JSON.stringify({ tokens: [], count: 0 }, null, 2)
      }

      // Group tokens by category
      const tokensByCategory: Record<string, typeof structure.tokens> = {}
      for (const token of structure.tokens) {
        const category = token.suffix || 'other'
        if (!tokensByCategory[category]) {
          tokensByCategory[category] = []
        }
        tokensByCategory[category].push(token)
      }

      return JSON.stringify({
        tokens: structure.tokens,
        count: structure.tokens.length,
        byCategory: tokensByCategory,
        categories: Object.keys(tokensByCategory),
      }, null, 2)

    case 'mirror://components':
      if (!structure) {
        return JSON.stringify({ components: [], count: 0 }, null, 2)
      }

      return JSON.stringify({
        components: structure.components.map(c => ({
          name: c.name,
          extends: c.extends,
          slots: c.slots,
          states: c.states,
          properties: c.properties.map(p => `${p.name}: ${p.value}`),
          lineRange: `${c.line}-${c.endLine}`,
        })),
        count: structure.components.length,
      }, null, 2)

    case 'mirror://structure':
      if (!structure) {
        return '# No file loaded\n\nOpen a .mirror file to see the structure.'
      }
      return generateStructureSummary(structure)

    case 'mirror://element-at-line':
      const lineParam = params.get('line')
      if (!lineParam || !structure) {
        return JSON.stringify({
          error: 'Specify line number with ?line=N',
          example: 'mirror://element-at-line?line=5',
        }, null, 2)
      }

      const line = parseInt(lineParam, 10)
      const element = getElementAtLine(structure, line)

      if (!element) {
        return JSON.stringify({
          found: false,
          line,
          message: `No element found at line ${line}`,
        }, null, 2)
      }

      return JSON.stringify({
        found: true,
        line,
        element: {
          type: element.type,
          name: element.name,
          content: element.content,
          properties: element.properties,
          states: element.states,
          indent: element.indent,
          children: element.children.map(c => ({
            name: c.name,
            line: c.line,
          })),
          parent: element.parent ? {
            name: element.parent.name,
            line: element.parent.line,
          } : null,
        },
      }, null, 2)

    case 'mirror://context':
      return generateFullContext(state, structure, bridge.isConnected())

    case 'mirror://errors':
      return JSON.stringify({
        errors: state.errors,
        count: state.errors.length,
        hasErrors: state.errors.some(e => e.severity === 'error'),
      }, null, 2)

    case 'mirror://dsl-reference':
      return getDSLReference()

    default:
      return JSON.stringify({ error: `Unknown resource: ${uri}` })
  }
}

/**
 * Generate full context for AI assistance
 */
function generateFullContext(
  state: ReturnType<MirrorBridge['getState']>,
  structure: MirrorStructure | null,
  connected: boolean
): string {
  const lines: string[] = []

  lines.push('# Mirror Studio Context')
  lines.push('')

  // Connection status
  lines.push(`**Status:** ${connected ? '🟢 Connected' : '🔴 Disconnected'}`)
  lines.push(`**File:** ${state.filePath || 'No file open'}`)
  lines.push('')

  // Selection
  if (state.selection) {
    lines.push('## Current Selection')
    lines.push(`Line ${state.selection.line}, Column ${state.selection.column}`)
    if (structure) {
      const el = getElementAtLine(structure, state.selection.line)
      if (el) {
        lines.push(`Element: **${el.name}**${el.content ? ` "${el.content}"` : ''}`)
        if (el.properties.length > 0) {
          lines.push(`Properties: ${el.properties.map(p => `${p.name}=${p.value}`).join(', ')}`)
        }
      }
    }
    lines.push('')
  }

  // Structure summary
  if (structure) {
    lines.push(generateStructureSummary(structure))
  }

  // Errors
  if (state.errors.length > 0) {
    lines.push('')
    lines.push('## Errors')
    for (const err of state.errors) {
      lines.push(`- Line ${err.line}: ${err.message}`)
    }
  }

  // Current file content
  lines.push('')
  lines.push('## File Content')
  lines.push('```mirror')
  lines.push(state.fileContent || '// Empty file')
  lines.push('```')

  return lines.join('\n')
}

/**
 * Quick DSL reference
 */
function getDSLReference(): string {
  return `# Mirror DSL Quick Reference

## Primitives
\`Frame\`, \`Text\`, \`Button\`, \`Input\`, \`Textarea\`, \`Image\`, \`Icon\`, \`Link\`

## Layout Properties
- \`hor\` / \`ver\` - Direction
- \`gap N\` - Space between children
- \`pad N\` or \`pad T R B L\` - Padding
- \`center\` - Center children
- \`spread\` - Distribute to edges
- \`wrap\` - Wrap overflow
- \`w N\` / \`h N\` - Width/height (pixels)
- \`w full\` / \`h full\` - Fill available space
- \`w hug\` / \`h hug\` - Fit content

## Styling Properties
- \`bg #hex\` - Background color
- \`col #hex\` - Text color
- \`rad N\` - Border radius
- \`bor N\` - Border width
- \`boc #hex\` - Border color
- \`fs N\` - Font size
- \`weight bold/500/etc\` - Font weight
- \`opacity N\` - Opacity (0-1)
- \`shadow sm/md/lg\` - Box shadow

## Icons
\`\`\`mirror
Icon "name", ic #color, is 24
\`\`\`
- \`ic\` - Icon color
- \`is\` - Icon size
- \`fill\` - Filled variant
- \`material\` - Use Material Icons

## Tokens
\`\`\`mirror
// Definition (with suffix)
$primary.bg: #2563eb
$spacing.pad: 16

// Usage (without suffix)
Frame bg $primary, pad $spacing
\`\`\`

## Components
\`\`\`mirror
// Simple component
Btn: = Button bg #2563eb, col white, pad 12 24, rad 6

// With slots
Card: bg #1a1a1a, pad 16, rad 8
  Title: col white, fs 16, weight 500
  Body: col #888

// Usage
Btn "Click me"
Card
  Title "Hello"
  Body "World"
\`\`\`

## States
\`\`\`mirror
Btn: pad 12, bg #333, toggle()
  hover:
    bg #444
  on:
    bg #2563eb

Btn "Click me"
Btn "Active", on   // Start in 'on' state
\`\`\`

## Functions
- \`toggle()\` - Toggle state on click
- \`exclusive()\` - Only one active (tabs, radio)
- \`show(Element)\` / \`hide(Element)\` - Visibility
- \`navigate(View)\` - Switch views

## Events
\`\`\`mirror
Button "Save"
  onclick: save()
  onenter: submit()
\`\`\`
`
}
