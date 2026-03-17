/**
 * Core Tools for Mirror Agent
 *
 * Read and write tools that return LLMCommands.
 */

import type { Tool, ToolContext, ToolResult, ElementInfo, LLMCommand } from '../types'

// ============================================
// READ TOOLS
// ============================================

export const getCodeTool: Tool = {
  name: 'get_code',
  description: 'Returns the complete current Mirror DSL code.',
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    return {
      success: true,
      data: { code: ctx.getCode() }
    }
  }
}

export const getElementTool: Tool = {
  name: 'get_element',
  description: `Returns details about a specific element.

Selectors:
- @N: Element at line N (e.g., @5)
- #id: Element with ID/name (e.g., #header)
- Type: First element of type (e.g., Button)
- Type:N: Nth element of type (e.g., Button:2)`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector (@line, #id, Type, or Type:N)',
      required: true
    }
  },
  execute: async ({ selector }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    return { success: true, data: element }
  }
}

export const getContextTool: Tool = {
  name: 'get_context',
  description: 'Returns context info: total lines, element count, available tokens.',
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const elementCount = lines.filter(line => {
      const trimmed = line.trim()
      return trimmed && /^[A-Z]/.test(trimmed)
    }).length

    return {
      success: true,
      data: {
        totalLines: lines.length,
        elementCount,
        availableTokens: Object.keys(ctx.getTokens()),
        codeLength: code.length
      }
    }
  }
}

// ============================================
// WRITE TOOLS (return commands)
// ============================================

export const setPropertyTool: Tool = {
  name: 'set_property',
  description: `Sets a property on an element.

Common properties:
- Layout: hor, ver, gap, center, spread
- Size: w, h, minw, maxw
- Spacing: pad, margin
- Visual: bg, col, bor, rad, shadow
- Typography: fs, weight, line

Use selectors to target elements (@line, #id, Type, Type:N).`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector (@line, #id, or Type)',
      required: true
    },
    property: {
      type: 'string',
      description: 'Property name (bg, pad, gap, etc.)',
      required: true
    },
    value: {
      type: 'string',
      description: 'New value',
      required: true
    }
  },
  execute: async ({ selector, property, value }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const command: LLMCommand = {
      type: 'SET_PROPERTY',
      nodeId: element.nodeId || `line-${element.line}`,
      property,
      value
    }

    return {
      success: true,
      data: { element: element.type, line: element.line, property, value },
      commands: [command]
    }
  }
}

export const removePropertyTool: Tool = {
  name: 'remove_property',
  description: 'Removes a property from an element.',
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector',
      required: true
    },
    property: {
      type: 'string',
      description: 'Property name to remove',
      required: true
    }
  },
  execute: async ({ selector, property }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const command: LLMCommand = {
      type: 'REMOVE_PROPERTY',
      nodeId: element.nodeId || `line-${element.line}`,
      property
    }

    return {
      success: true,
      data: { element: element.type, line: element.line, property },
      commands: [command]
    }
  }
}

export const addChildTool: Tool = {
  name: 'add_child',
  description: `Adds a new child element to a parent.

Example: add_child("@3", "Button", "bg #007bff, pad 12")`,
  parameters: {
    parent: {
      type: 'string',
      description: 'Parent selector',
      required: true
    },
    component: {
      type: 'string',
      description: 'Component type (Box, Text, Button, etc.)',
      required: true
    },
    properties: {
      type: 'string',
      description: 'Properties string (e.g., "bg #fff, pad 16")',
      required: false
    },
    position: {
      type: 'string',
      description: 'Position: "first", "last", or line number',
      required: false
    }
  },
  execute: async ({ parent, component, properties, position }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const parentElement = findElementBySelector(parent, lines)

    if (!parentElement) {
      return { success: false, error: `Parent not found: ${parent}` }
    }

    const command: LLMCommand = {
      type: 'INSERT_COMPONENT',
      parentId: parentElement.nodeId || `line-${parentElement.line}`,
      component,
      properties: properties || '',
      position: position === 'first' ? 'first' : 'last'
    }

    return {
      success: true,
      data: { parent: parentElement.type, component, properties },
      commands: [command]
    }
  }
}

export const deleteElementTool: Tool = {
  name: 'delete_element',
  description: 'Deletes an element and all its children.',
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector',
      required: true
    }
  },
  execute: async ({ selector }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const command: LLMCommand = {
      type: 'DELETE_NODE',
      nodeId: element.nodeId || `line-${element.line}`
    }

    return {
      success: true,
      data: { element: element.type, line: element.line },
      commands: [command]
    }
  }
}

export const updateSourceTool: Tool = {
  name: 'update_source',
  description: `Directly update source code at specific positions.
Use this for complex edits that can't be done with property tools.`,
  parameters: {
    from: {
      type: 'number',
      description: 'Start character position',
      required: true
    },
    to: {
      type: 'number',
      description: 'End character position',
      required: true
    },
    insert: {
      type: 'string',
      description: 'Text to insert',
      required: true
    }
  },
  execute: async ({ from, to, insert }): Promise<ToolResult> => {
    const command: LLMCommand = {
      type: 'UPDATE_SOURCE',
      from,
      to,
      insert
    }

    return {
      success: true,
      data: { from, to, insertLength: insert.length },
      commands: [command]
    }
  }
}

// ============================================
// ANALYZE TOOLS
// ============================================

export const validateTool: Tool = {
  name: 'validate',
  description: 'Validates the current code for syntax errors.',
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()

    try {
      const lines = code.split('\n')
      const errors: { line: number; message: string }[] = []
      let prevIndent = 0

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('$')) {
          continue
        }

        // Check indentation
        const indent = line.match(/^(\s*)/)?.[1].length || 0

        if (indent > prevIndent + 2 && prevIndent > 0) {
          errors.push({
            line: i + 1,
            message: `Invalid indentation (jumped more than 2 spaces)`
          })
        }

        // Check for valid component start
        if (!/^[A-Z$]/.test(trimmed) && !/^import\s/.test(trimmed)) {
          errors.push({
            line: i + 1,
            message: `Line should start with a component name (uppercase)`
          })
        }

        prevIndent = indent
      }

      const elementCount = lines.filter(line => {
        const trimmed = line.trim()
        return trimmed && /^[A-Z]/.test(trimmed)
      }).length

      if (errors.length > 0) {
        return {
          success: false,
          error: `Found ${errors.length} error(s)`,
          data: { valid: false, errors, elementCount }
        }
      }

      return {
        success: true,
        data: { valid: true, elementCount, message: `Code is valid with ${elementCount} elements.` }
      }
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        data: { valid: false, error: e.message }
      }
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function findElementBySelector(selector: string, lines: string[]): ElementInfo | null {
  // @N - Line number
  if (selector.startsWith('@')) {
    const lineNum = parseInt(selector.slice(1), 10)
    return getElementAtLine(lines, lineNum)
  }

  // #id - Named element
  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    return findNamedElement(lines, id)
  }

  // Type or Type:N
  const typeMatch = selector.match(/^([A-Z][a-zA-Z0-9]*)(?::(\d+))?$/)
  if (typeMatch) {
    const typeName = typeMatch[1]
    const index = typeMatch[2] ? parseInt(typeMatch[2], 10) : 1
    return findElementByType(lines, typeName, index)
  }

  // Try as line number
  const lineNum = parseInt(selector, 10)
  if (!isNaN(lineNum)) {
    return getElementAtLine(lines, lineNum)
  }

  return null
}

function getElementAtLine(lines: string[], lineNum: number): ElementInfo | null {
  if (lineNum < 1 || lineNum > lines.length) {
    return null
  }

  const line = lines[lineNum - 1]
  const trimmed = line.trim()

  if (!trimmed || !/^[A-Z]/.test(trimmed)) {
    return null
  }

  const typeMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)
  if (!typeMatch) {
    return null
  }

  const type = typeMatch[1]
  const properties = parseProperties(trimmed.slice(type.length))
  const indent = line.match(/^(\s*)/)?.[1] || ''

  // Find end line
  let endLine = lineNum
  for (let i = lineNum; i < lines.length; i++) {
    const nextLine = lines[i]
    if (nextLine.trim() === '') continue

    const nextIndent = nextLine.match(/^(\s*)/)?.[1] || ''
    if (nextIndent.length <= indent.length && i > lineNum - 1) {
      break
    }
    endLine = i + 1
  }

  // Find children
  const children: { type: string; line: number }[] = []
  const childIndent = indent + '  '
  for (let i = lineNum; i < endLine; i++) {
    const childLine = lines[i]
    const childLineIndent = childLine.match(/^(\s*)/)?.[1] || ''
    if (childLineIndent === childIndent) {
      const childType = childLine.trim().match(/^([A-Z][a-zA-Z0-9]*)/)?.[1]
      if (childType) {
        children.push({ type: childType, line: i + 1 })
      }
    }
  }

  // Generate nodeId from line content
  const nodeId = properties['named'] || `line-${lineNum}`

  return {
    type,
    line: lineNum,
    endLine,
    properties,
    children,
    code: trimmed,
    nodeId
  }
}

function findNamedElement(lines: string[], id: string): ElementInfo | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes(`named ${id}`) || line.includes(`named "${id}"`)) {
      return getElementAtLine(lines, i + 1)
    }
  }
  return null
}

function findElementByType(lines: string[], typeName: string, index: number): ElementInfo | null {
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
  return null
}

function parseProperties(propString: string): Record<string, string> {
  const props: Record<string, string> = {}

  // Remove leading text content if present
  propString = propString.replace(/^\s*"[^"]*"\s*,?\s*/, '')

  // Split by comma
  const parts = propString.split(',').map(p => p.trim()).filter(Boolean)

  for (const part of parts) {
    const tokens = part.split(/\s+/)
    if (tokens.length >= 1) {
      const name = tokens[0]
      const value = tokens.slice(1).join(' ') || 'true'
      props[name] = value
    }
  }

  return props
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const coreTools: Tool[] = [
  getCodeTool,
  getElementTool,
  getContextTool,
  setPropertyTool,
  removePropertyTool,
  addChildTool,
  deleteElementTool,
  updateSourceTool,
  validateTool
]
