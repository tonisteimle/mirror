/**
 * Write Tools for Mirror Agent
 *
 * Advanced tools for code manipulation.
 */

import type { Tool, ToolContext, ToolResult, LLMCommand, ElementInfo } from '../types'

// ============================================
// WRAP TOOL
// ============================================

export const wrapInTool: Tool = {
  name: 'wrap_in',
  description: `Wraps an element or selection in a new parent component.

Example: wrap_in("Button", "Box", "hor gap 8, center")
Wraps the Button in a Box with horizontal layout.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element selector to wrap',
      required: true
    },
    wrapper: {
      type: 'string',
      description: 'Component type to wrap with (Box, Frame, etc.)',
      required: true
    },
    properties: {
      type: 'string',
      description: 'Properties for the wrapper',
      required: false
    }
  },
  execute: async ({ selector, wrapper, properties }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    // Build wrapper line
    const indent = getIndent(lines[element.line - 1])
    const wrapperLine = properties
      ? `${indent}${wrapper} ${properties}`
      : `${indent}${wrapper}`

    // Get element content (element + children)
    const elementLines = lines.slice(element.line - 1, element.endLine)

    // Increase indentation of wrapped content
    const wrappedContent = elementLines.map(line => '  ' + line).join('\n')

    // Build new code
    const newContent = wrapperLine + '\n' + wrappedContent

    // Calculate positions
    const startPos = getLineStartPos(code, element.line)
    const endPos = getLineEndPos(code, element.endLine)

    const command: LLMCommand = {
      type: 'UPDATE_SOURCE',
      from: startPos,
      to: endPos,
      insert: newContent
    }

    return {
      success: true,
      data: {
        wrapped: element.type,
        wrapper,
        lines: element.endLine - element.line + 1
      },
      commands: [command]
    }
  }
}

// ============================================
// MOVE TOOL
// ============================================

export const moveElementTool: Tool = {
  name: 'move_element',
  description: `Moves an element to a new location.

Example: move_element("Button", "#container", "first")
Moves the Button to be the first child of #container.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element to move',
      required: true
    },
    target: {
      type: 'string',
      description: 'Target parent selector',
      required: true
    },
    position: {
      type: 'string',
      description: '"first", "last", or "before:selector" / "after:selector"',
      required: false
    }
  },
  execute: async ({ selector, target, position }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')

    const element = findElementBySelector(selector, lines)
    const targetElement = findElementBySelector(target, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }
    if (!targetElement) {
      return { success: false, error: `Target not found: ${target}` }
    }

    const command: LLMCommand = {
      type: 'MOVE_NODE',
      nodeId: element.nodeId || `line-${element.line}`,
      targetId: targetElement.nodeId || `line-${targetElement.line}`,
      placement: position === 'first' ? 'inside' : 'inside'
    }

    return {
      success: true,
      data: {
        moved: element.type,
        to: targetElement.type,
        position: position || 'last'
      },
      commands: [command]
    }
  }
}

// ============================================
// DUPLICATE TOOL
// ============================================

export const duplicateElementTool: Tool = {
  name: 'duplicate_element',
  description: 'Duplicates an element (and its children) after itself.',
  parameters: {
    selector: {
      type: 'string',
      description: 'Element to duplicate',
      required: true
    },
    count: {
      type: 'number',
      description: 'Number of copies (default: 1)',
      required: false
    }
  },
  execute: async ({ selector, count = 1 }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    // Get element content
    const elementLines = lines.slice(element.line - 1, element.endLine)
    const elementContent = elementLines.join('\n')

    // Create duplicates
    let insertContent = ''
    for (let i = 0; i < count; i++) {
      insertContent += '\n' + elementContent
    }

    const insertPos = getLineEndPos(code, element.endLine)

    const command: LLMCommand = {
      type: 'UPDATE_SOURCE',
      from: insertPos,
      to: insertPos,
      insert: insertContent
    }

    return {
      success: true,
      data: {
        duplicated: element.type,
        copies: count,
        lines: element.endLine - element.line + 1
      },
      commands: [command]
    }
  }
}

// ============================================
// REPLACE ELEMENT TOOL
// ============================================

export const replaceElementTool: Tool = {
  name: 'replace_element',
  description: `Replaces an element with new content.

Example: replace_element("Button", "Link", "href /home")
Replaces the Button with a Link.`,
  parameters: {
    selector: {
      type: 'string',
      description: 'Element to replace',
      required: true
    },
    component: {
      type: 'string',
      description: 'New component type',
      required: true
    },
    properties: {
      type: 'string',
      description: 'Properties for new component',
      required: false
    },
    keepChildren: {
      type: 'boolean',
      description: 'Keep existing children (default: true)',
      required: false
    }
  },
  execute: async ({ selector, component, properties, keepChildren = true }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')
    const element = findElementBySelector(selector, lines)

    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const indent = getIndent(lines[element.line - 1])
    let newLine = `${indent}${component}`
    if (properties) {
      newLine += ` ${properties}`
    }

    let newContent: string
    if (keepChildren && element.children.length > 0) {
      // Keep children
      const childLines = lines.slice(element.line, element.endLine)
      newContent = newLine + '\n' + childLines.join('\n')
    } else {
      newContent = newLine
    }

    const startPos = getLineStartPos(code, element.line)
    const endPos = getLineEndPos(code, element.endLine)

    const command: LLMCommand = {
      type: 'UPDATE_SOURCE',
      from: startPos,
      to: endPos,
      insert: newContent
    }

    return {
      success: true,
      data: {
        replaced: element.type,
        with: component,
        keptChildren: keepChildren && element.children.length > 0
      },
      commands: [command]
    }
  }
}

// ============================================
// BATCH EDIT TOOL
// ============================================

export const batchEditTool: Tool = {
  name: 'batch_edit',
  description: `Apply the same change to multiple elements.

Example: batch_edit("Button", "bg", "#007bff")
Sets bg #007bff on all Button elements.`,
  parameters: {
    type: {
      type: 'string',
      description: 'Component type to find (e.g., "Button")',
      required: true
    },
    property: {
      type: 'string',
      description: 'Property to set',
      required: true
    },
    value: {
      type: 'string',
      description: 'Value to set',
      required: true
    }
  },
  execute: async ({ type, property, value }, ctx: ToolContext): Promise<ToolResult> => {
    const code = ctx.getCode()
    const lines = code.split('\n')

    const elements = findAllElementsByType(type, lines)

    if (elements.length === 0) {
      return { success: false, error: `No ${type} elements found` }
    }

    const commands: LLMCommand[] = elements.map(el => ({
      type: 'SET_PROPERTY' as const,
      nodeId: el.nodeId || `line-${el.line}`,
      property,
      value
    }))

    return {
      success: true,
      data: {
        type,
        property,
        value,
        count: elements.length
      },
      commands
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function findElementBySelector(selector: string, lines: string[]): ElementInfo | null {
  if (selector.startsWith('@')) {
    const lineNum = parseInt(selector.slice(1), 10)
    return getElementAtLine(lines, lineNum)
  }

  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`named ${id}`) || lines[i].includes(`named "${id}"`)) {
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

function findAllElementsByType(type: string, lines: string[]): ElementInfo[] {
  const elements: ElementInfo[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith(type + ' ') || line === type) {
      const el = getElementAtLine(lines, i + 1)
      if (el) elements.push(el)
    }
  }
  return elements
}

function getElementAtLine(lines: string[], lineNum: number): ElementInfo | null {
  if (lineNum < 1 || lineNum > lines.length) return null

  const line = lines[lineNum - 1]
  const trimmed = line.trim()

  if (!trimmed || !/^[A-Z]/.test(trimmed)) return null

  const typeMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)
  if (!typeMatch) return null

  const type = typeMatch[1]
  const indent = getIndent(line)

  let endLine = lineNum
  for (let i = lineNum; i < lines.length; i++) {
    const nextLine = lines[i]
    if (nextLine.trim() === '') continue
    const nextIndent = getIndent(nextLine)
    if (nextIndent.length <= indent.length && i > lineNum - 1) break
    endLine = i + 1
  }

  const children: { type: string; line: number }[] = []
  const childIndent = indent + '  '
  for (let i = lineNum; i < endLine; i++) {
    const childLine = lines[i]
    if (getIndent(childLine) === childIndent) {
      const childType = childLine.trim().match(/^([A-Z][a-zA-Z0-9]*)/)?.[1]
      if (childType) children.push({ type: childType, line: i + 1 })
    }
  }

  const props = parseProperties(trimmed.slice(type.length))

  return {
    type,
    line: lineNum,
    endLine,
    properties: props,
    children,
    code: trimmed,
    nodeId: props['named'] || `line-${lineNum}`
  }
}

function parseProperties(propString: string): Record<string, string> {
  const props: Record<string, string> = {}
  propString = propString.replace(/^\s*"[^"]*"\s*,?\s*/, '')
  const parts = propString.split(',').map(p => p.trim()).filter(Boolean)
  for (const part of parts) {
    const tokens = part.split(/\s+/)
    if (tokens.length >= 1) {
      props[tokens[0]] = tokens.slice(1).join(' ') || 'true'
    }
  }
  return props
}

function getIndent(line: string): string {
  return line.match(/^(\s*)/)?.[1] || ''
}

function getLineStartPos(code: string, lineNum: number): number {
  const lines = code.split('\n')
  let pos = 0
  for (let i = 0; i < lineNum - 1; i++) {
    pos += lines[i].length + 1
  }
  return pos
}

function getLineEndPos(code: string, lineNum: number): number {
  const lines = code.split('\n')
  let pos = 0
  for (let i = 0; i < lineNum; i++) {
    pos += lines[i].length + 1
  }
  return pos - 1 // Don't include the newline
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const writeTools: Tool[] = [
  wrapInTool,
  moveElementTool,
  duplicateElementTool,
  replaceElementTool,
  batchEditTool
]
