/**
 * Generate Tools for Mirror Agent
 *
 * Tools for code generation and patterns.
 */

import type { Tool, ToolContext, ToolResult, LLMCommand } from '../types'

// ============================================
// GENERATE COMPONENT TOOL
// ============================================

export const generateComponentTool: Tool = {
  name: 'generate_component',
  description: `Generates a new component based on description.

Example: generate_component("card", "A card with image, title, description and action button")

Returns the generated code to be inserted.`,
  parameters: {
    name: {
      type: 'string',
      description: 'Component name (e.g., "card", "navbar", "form")',
      required: true
    },
    description: {
      type: 'string',
      description: 'Description of what the component should contain',
      required: true
    },
    tokens: {
      type: 'boolean',
      description: 'Use tokens instead of hardcoded values (default: true)',
      required: false
    }
  },
  execute: async ({ name, description, tokens = true }, ctx: ToolContext): Promise<ToolResult> => {
    // Get available tokens for smart generation
    const availableTokens = ctx.getTokens()

    // Generate based on common patterns
    const code = generateFromDescription(name, description, tokens ? availableTokens : {})

    return {
      success: true,
      data: {
        name,
        code,
        instruction: 'Use add_child or update_source to insert this code'
      }
    }
  }
}

// ============================================
// APPLY PATTERN TOOL
// ============================================

export const applyPatternTool: Tool = {
  name: 'apply_pattern',
  description: `Applies a common UI pattern to an element or selection.

Available patterns:
- card: Card with header, content, footer
- list: Vertical list with items
- grid: Grid layout with cells
- form: Form with labels and inputs
- navbar: Navigation bar
- modal: Modal dialog
- tabs: Tab navigation`,
  parameters: {
    pattern: {
      type: 'string',
      description: 'Pattern name',
      required: true,
      enum: ['card', 'list', 'grid', 'form', 'navbar', 'modal', 'tabs']
    },
    selector: {
      type: 'string',
      description: 'Where to insert (selector) or omit for cursor position',
      required: false
    },
    options: {
      type: 'object',
      description: 'Pattern-specific options (e.g., { columns: 3 } for grid)',
      required: false
    }
  },
  execute: async ({ pattern, selector, options }, ctx: ToolContext): Promise<ToolResult> => {
    const tokens = ctx.getTokens()
    const code = generatePattern(pattern, options || {}, tokens)

    if (!code) {
      return { success: false, error: `Unknown pattern: ${pattern}` }
    }

    return {
      success: true,
      data: {
        pattern,
        code,
        instruction: 'Use add_child or update_source to insert this code'
      }
    }
  }
}

// ============================================
// EXTRACT COMPONENT TOOL
// ============================================

export const extractComponentTool: Tool = {
  name: 'extract_component',
  description: `Extracts selected code into a reusable component definition.

Creates a named component that can be instantiated multiple times.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element to extract',
      required: true
    },
    name: {
      type: 'string',
      description: 'Name for the new component',
      required: true
    }
  },
  execute: async ({ selector, name }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    // Get element code
    const elementLines = lines.slice(element.line - 1, element.endLine)
    const elementCode = elementLines.join('\n')

    // Create component definition
    const componentDef = `${name}: =\n${elementLines.map(l => '  ' + l.trim()).join('\n')}`

    // Create usage
    const usage = name

    return {
      success: true,
      data: {
        componentDefinition: componentDef,
        usage,
        originalLines: element.line + '-' + element.endLine,
        instruction: 'Add the component definition at the top, then replace the original with the usage'
      }
    }
  }
}

// ============================================
// GENERATE FROM EXISTING TOOL
// ============================================

export const generateSimilarTool: Tool = {
  name: 'generate_similar',
  description: `Generates a new element similar to an existing one.

Useful for creating consistent elements based on an example.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element to base the new one on',
      required: true
    },
    changes: {
      type: 'object',
      description: 'Properties to change (e.g., { text: "New Text", bg: "#ff0000" })',
      required: false
    }
  },
  execute: async ({ selector, changes }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    // Get element code
    let newCode = lines.slice(element.line - 1, element.endLine).join('\n')

    // Apply changes
    if (changes) {
      for (const [prop, value] of Object.entries(changes)) {
        if (prop === 'text') {
          // Replace text content
          newCode = newCode.replace(/"[^"]*"/, `"${value}"`)
        } else {
          // Replace or add property
          const propRegex = new RegExp(`\\b${prop}\\s+[^,\\n]+`)
          if (propRegex.test(newCode)) {
            newCode = newCode.replace(propRegex, `${prop} ${value}`)
          } else {
            // Add property after component name
            const firstLine = newCode.split('\n')[0]
            const restLines = newCode.split('\n').slice(1)
            const match = firstLine.match(/^(\s*)([A-Z][a-zA-Z0-9]*)(.*)$/)
            if (match) {
              const [, indent, comp, rest] = match
              const newFirst = `${indent}${comp}${rest ? rest + ', ' : ' '}${prop} ${value}`
              newCode = [newFirst, ...restLines].join('\n')
            }
          }
        }
      }
    }

    return {
      success: true,
      data: {
        basedOn: element.type,
        code: newCode,
        instruction: 'Use add_child or update_source to insert this code'
      }
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface ElementInfo {
  type: string
  line: number
  endLine: number
  properties: Record<string, string>
  code: string
}

function findElementBySelector(selector: string, lines: string[]): ElementInfo | null {
  if (selector.startsWith('@')) {
    const lineNum = parseInt(selector.slice(1), 10)
    return getElementAtLine(lines, lineNum)
  }

  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`named ${id}`)) {
        return getElementAtLine(lines, i + 1)
      }
    }
    return null
  }

  const typeMatch = selector.match(/^([A-Z][a-zA-Z0-9]*)(?::(\d+))?$/)
  if (typeMatch) {
    const typeName = typeMatch[1]
    const index = typeMatch[2] ? parseInt(typeMatch[2], 10) : 1
    let count = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith(typeName + ' ') || line === typeName) {
        count++
        if (count === index) {
          return getElementAtLine(lines, i + 1)
        }
      }
    }
  }

  return null
}

function getElementAtLine(lines: string[], lineNum: number): ElementInfo | null {
  if (lineNum < 1 || lineNum > lines.length) return null

  const line = lines[lineNum - 1]
  const trimmed = line.trim()
  if (!trimmed || !/^[A-Z]/.test(trimmed)) return null

  const type = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)?.[1] || ''
  const indent = line.match(/^(\s*)/)?.[1] || ''

  let endLine = lineNum
  for (let i = lineNum; i < lines.length; i++) {
    const nextLine = lines[i]
    if (nextLine.trim() === '') continue
    const nextIndent = nextLine.match(/^(\s*)/)?.[1] || ''
    if (nextIndent.length <= indent.length && i > lineNum - 1) break
    endLine = i + 1
  }

  return { type, line: lineNum, endLine, properties: {}, code: trimmed }
}

function generateFromDescription(name: string, description: string, tokens: Record<string, string>): string {
  const lower = description.toLowerCase()

  // Card pattern
  if (lower.includes('card') || lower.includes('image') && lower.includes('title')) {
    return generatePattern('card', {
      hasImage: lower.includes('image'),
      hasButton: lower.includes('button') || lower.includes('action'),
      hasDescription: lower.includes('description')
    }, tokens)
  }

  // Form pattern
  if (lower.includes('form') || lower.includes('input') && lower.includes('label')) {
    return generatePattern('form', {
      fields: extractFieldNames(description)
    }, tokens)
  }

  // List pattern
  if (lower.includes('list') || lower.includes('items')) {
    return generatePattern('list', {
      itemCount: 3
    }, tokens)
  }

  // Grid pattern
  if (lower.includes('grid')) {
    const colMatch = description.match(/(\d+)\s*col/i)
    return generatePattern('grid', {
      columns: colMatch ? parseInt(colMatch[1]) : 3
    }, tokens)
  }

  // Navbar pattern
  if (lower.includes('nav') || lower.includes('header') && lower.includes('menu')) {
    return generatePattern('navbar', {}, tokens)
  }

  // Modal pattern
  if (lower.includes('modal') || lower.includes('dialog') || lower.includes('popup')) {
    return generatePattern('modal', {
      hasForm: lower.includes('form')
    }, tokens)
  }

  // Default: basic box
  return `Box ver pad 16 gap 12
  Text "${name}"`
}

function extractFieldNames(description: string): string[] {
  const fields: string[] = []
  const common = ['email', 'password', 'name', 'username', 'phone', 'address', 'message']

  for (const field of common) {
    if (description.toLowerCase().includes(field)) {
      fields.push(field)
    }
  }

  return fields.length > 0 ? fields : ['email', 'password']
}

function generatePattern(pattern: string, options: any, tokens: Record<string, string>): string {
  const bg = tokens['$bg'] || tokens['$surface.bg'] || tokens['$card.bg'] || '#fff'
  const primary = tokens['$primary'] || tokens['$accent.bg'] || tokens['$primary.bg'] || '#007bff'
  const text = tokens['$text'] || tokens['$text.col'] || tokens['$col'] || '#333'
  const muted = tokens['$muted'] || tokens['$muted.col'] || tokens['$text.muted'] || '#666'

  switch (pattern) {
    case 'card':
      return `Box ver pad 16 bg ${bg} rad 8 shadow sm${options.hasImage ? `
  Image w full h 160 rad 4` : ''}
  Box ver gap 8${options.hasImage ? ' pad-top 12' : ''}
    Text "Title" fs 18 weight bold col ${text}${options.hasDescription ? `
    Text "Description text goes here" col ${muted} line 1.5` : ''}${options.hasButton ? `
  Box hor gap 8 pad-top 12
    Button bg ${primary} col white pad 8 12 rad 4
      Text "Action"` : ''}`

    case 'list':
      const itemCount = options.itemCount || 3
      let listItems = ''
      for (let i = 0; i < itemCount; i++) {
        listItems += `
  Box hor gap 12 pad 12 bg ${bg}
    Box w 40 h 40 bg ${muted} rad 20
    Box ver gap 4 grow
      Text "Item ${i + 1}" weight medium
      Text "Description" fs 12 col ${muted}`
      }
      return `Box ver gap 1 bg #e5e5e5${listItems}`

    case 'grid':
      const cols = options.columns || 3
      let gridItems = ''
      for (let i = 0; i < cols; i++) {
        gridItems += `
  Box ver pad 16 bg ${bg} rad 8
    Text "Cell ${i + 1}"`
      }
      return `Box grid ${cols} gap 16${gridItems}`

    case 'form':
      const fields = options.fields || ['email', 'password']
      let formFields = ''
      for (const field of fields) {
        const type = field === 'password' ? 'type password' : field === 'email' ? 'type email' : ''
        formFields += `
  Box ver gap 4
    Label "${field.charAt(0).toUpperCase() + field.slice(1)}" fs 12 col ${muted}
    Input ${type} pad 12 bor 1 boc #ddd rad 4`
      }
      return `Box ver gap 16 pad 24 bg ${bg} rad 8${formFields}
  Button bg ${primary} col white pad 12 rad 4 w full
    Text "Submit"`

    case 'navbar':
      return `Header hor spread pad 16 bg #1a1a1f
  Box hor gap 8 center
    Text "Logo" fs 20 weight bold col white
  Nav hor gap 24
    Link "Home" col white
    Link "About" col #888
    Link "Contact" col #888
  Button bg ${primary} col white pad 8 16 rad 4
    Text "Sign In"`

    case 'modal':
      return `Box stacked w full h full
  Box w full h full bg #000 opacity 0.5 onclick hide modal
  Box ver pad 24 bg ${bg} rad 12 shadow lg w 400 center named modal
    Box hor spread
      H3 "Dialog Title"
      Button onclick hide modal
        Icon "close"
    Text "Dialog content goes here." pad-top 16${options.hasForm ? `
    Box ver gap 12 pad-top 16
      Input pad 12 bor 1 boc #ddd rad 4
      Button bg ${primary} col white pad 12 rad 4 w full
        Text "Confirm"` : `
    Box hor gap 8 pad-top 24
      Button pad 12 bor 1 boc #ddd rad 4 grow onclick hide modal
        Text "Cancel"
      Button bg ${primary} col white pad 12 rad 4 grow
        Text "Confirm"`}`

    case 'tabs':
      return `Box ver
  Box hor gap 0 bg #f5f5f5
    Button pad 12 24 bg ${bg} bor-bottom 2 boc ${primary}
      Text "Tab 1" col ${primary}
    Button pad 12 24 bg transparent
      Text "Tab 2" col ${muted}
    Button pad 12 24 bg transparent
      Text "Tab 3" col ${muted}
  Box ver pad 16
    Text "Tab content goes here."`

    default:
      return ''
  }
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const generateTools: Tool[] = [
  generateComponentTool,
  applyPatternTool,
  extractComponentTool,
  generateSimilarTool
]
