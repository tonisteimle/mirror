import type { MirrorBridge } from '../bridge.js'
import {
  parseMirror,
  getElementAtLine,
  getComponent,
  getToken,
} from '../parser/mirror-parser.js'

/**
 * Tool definitions for MCP
 */
export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const TOOLS: ToolDefinition[] = [
  // === Query Tools ===
  {
    name: 'mirror_get_status',
    description: 'Check connection status and get basic info about the current file',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mirror_get_element',
    description: 'Get detailed information about an element at a specific line number',
    inputSchema: {
      type: 'object',
      properties: {
        line: {
          type: 'number',
          description: 'Line number (1-indexed)',
        },
      },
      required: ['line'],
    },
  },
  {
    name: 'mirror_find_element',
    description: 'Find elements by name or type. Returns all matching elements with their line numbers.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Element or component name to search for (e.g., "Button", "Card")',
        },
        type: {
          type: 'string',
          enum: ['element', 'component-def', 'component-instance', 'all'],
          description: 'Filter by element type',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'mirror_get_component',
    description: 'Get detailed info about a component definition',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Component name',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'mirror_get_token',
    description: 'Get a token value by name',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Token name (with or without $)',
        },
      },
      required: ['name'],
    },
  },

  // === Navigation Tools ===
  {
    name: 'mirror_select_element',
    description: 'Select an element in Mirror Studio by line number. This highlights it in the editor and preview.',
    inputSchema: {
      type: 'object',
      properties: {
        line: {
          type: 'number',
          description: 'Line number (1-indexed)',
        },
      },
      required: ['line'],
    },
  },

  // === Code Modification Tools ===
  {
    name: 'mirror_update_property',
    description: 'Update a property value on an element at a specific line',
    inputSchema: {
      type: 'object',
      properties: {
        line: {
          type: 'number',
          description: 'Line number of the element',
        },
        property: {
          type: 'string',
          description: 'Property name (e.g., "bg", "pad", "col")',
        },
        value: {
          type: 'string',
          description: 'New value for the property',
        },
      },
      required: ['line', 'property', 'value'],
    },
  },
  {
    name: 'mirror_add_property',
    description: 'Add a new property to an element at a specific line',
    inputSchema: {
      type: 'object',
      properties: {
        line: {
          type: 'number',
          description: 'Line number of the element',
        },
        property: {
          type: 'string',
          description: 'Property name',
        },
        value: {
          type: 'string',
          description: 'Property value',
        },
      },
      required: ['line', 'property', 'value'],
    },
  },
  {
    name: 'mirror_remove_property',
    description: 'Remove a property from an element at a specific line',
    inputSchema: {
      type: 'object',
      properties: {
        line: {
          type: 'number',
          description: 'Line number of the element',
        },
        property: {
          type: 'string',
          description: 'Property name to remove',
        },
      },
      required: ['line', 'property'],
    },
  },
  {
    name: 'mirror_add_element',
    description: 'Add a new element as a child of an existing element',
    inputSchema: {
      type: 'object',
      properties: {
        parentLine: {
          type: 'number',
          description: 'Line number of the parent element',
        },
        element: {
          type: 'string',
          description: 'Element type (e.g., "Frame", "Text", "Button")',
        },
        content: {
          type: 'string',
          description: 'Text content for the element (optional)',
        },
        properties: {
          type: 'string',
          description: 'Properties as a comma-separated string (e.g., "bg #2563eb, pad 12")',
        },
        position: {
          type: 'string',
          enum: ['first', 'last'],
          description: 'Where to insert among siblings (default: last)',
        },
      },
      required: ['parentLine', 'element'],
    },
  },
  {
    name: 'mirror_add_token',
    description: 'Add a new design token',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Token name without $ (e.g., "primary.bg", "spacing.pad")',
        },
        value: {
          type: 'string',
          description: 'Token value (e.g., "#2563eb", "16")',
        },
      },
      required: ['name', 'value'],
    },
  },
  {
    name: 'mirror_add_component',
    description: 'Create a new component definition',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Component name (PascalCase)',
        },
        extends: {
          type: 'string',
          description: 'Base primitive or component to extend (e.g., "Button", "Frame")',
        },
        properties: {
          type: 'string',
          description: 'Properties as a comma-separated string',
        },
        slots: {
          type: 'array',
          items: { type: 'string' },
          description: 'Slot names for container components',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'mirror_wrap_element',
    description: 'Wrap an element in a container (Frame)',
    inputSchema: {
      type: 'object',
      properties: {
        line: {
          type: 'number',
          description: 'Line number of the element to wrap',
        },
        wrapper: {
          type: 'string',
          description: 'Wrapper element type (default: "Frame")',
        },
        properties: {
          type: 'string',
          description: 'Properties for the wrapper',
        },
      },
      required: ['line'],
    },
  },
  {
    name: 'mirror_add_state',
    description: 'Add a state to a component definition',
    inputSchema: {
      type: 'object',
      properties: {
        line: {
          type: 'number',
          description: 'Line number of the component definition',
        },
        stateName: {
          type: 'string',
          description: 'State name (e.g., "hover", "active", "open")',
        },
        properties: {
          type: 'string',
          description: 'Properties for the state (e.g., "bg #444")',
        },
      },
      required: ['line', 'stateName'],
    },
  },

  // === Validation Tools ===
  {
    name: 'mirror_validate',
    description: 'Validate the current Mirror file and return any errors',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // === Code Generation ===
  {
    name: 'mirror_generate_component',
    description: 'Generate Mirror code for a component based on a description',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of the component to generate',
        },
        style: {
          type: 'string',
          enum: ['minimal', 'detailed'],
          description: 'Code style preference',
        },
      },
      required: ['description'],
    },
  },
]

/**
 * Execute a tool
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  bridge: MirrorBridge
): Promise<string> {
  const state = bridge.getState()
  const content = state.fileContent || ''
  const lines = content.split('\n')
  const structure = content ? parseMirror(content) : null

  switch (name) {
    // === Query Tools ===
    case 'mirror_get_status': {
      return JSON.stringify({
        connected: bridge.isConnected(),
        hasFile: !!state.filePath,
        filePath: state.filePath,
        lineCount: lines.length,
        hasSelection: !!state.selection,
        selectionLine: state.selection?.line,
        tokenCount: structure?.tokens.length || 0,
        componentCount: structure?.components.length || 0,
        elementCount: structure?.elements.length || 0,
        errorCount: state.errors.length,
      }, null, 2)
    }

    case 'mirror_get_element': {
      const line = args.line as number
      if (!structure) {
        return JSON.stringify({ error: 'No file open' })
      }

      const element = getElementAtLine(structure, line)
      if (!element) {
        return JSON.stringify({
          found: false,
          line,
          lineContent: lines[line - 1] || '',
          message: `No element found at line ${line}`,
        })
      }

      return JSON.stringify({
        found: true,
        line,
        lineContent: lines[line - 1],
        element: {
          type: element.type,
          name: element.name,
          content: element.content,
          properties: element.properties,
          states: element.states,
          indent: element.indent,
          childCount: element.children.length,
          parentName: element.parent?.name,
        },
      }, null, 2)
    }

    case 'mirror_find_element': {
      const searchName = args.name as string
      const filterType = (args.type as string) || 'all'

      if (!structure) {
        return JSON.stringify({ error: 'No file open' })
      }

      const matches = structure.elements.filter(el => {
        const nameMatch = el.name.toLowerCase() === searchName.toLowerCase()
        const typeMatch = filterType === 'all' || el.type === filterType
        return nameMatch && typeMatch
      })

      return JSON.stringify({
        query: searchName,
        count: matches.length,
        elements: matches.map(el => ({
          line: el.line,
          type: el.type,
          name: el.name,
          content: el.content,
          preview: lines[el.line - 1]?.trim().slice(0, 60),
        })),
      }, null, 2)
    }

    case 'mirror_get_component': {
      const compName = args.name as string
      if (!structure) {
        return JSON.stringify({ error: 'No file open' })
      }

      const comp = getComponent(structure, compName)
      if (!comp) {
        return JSON.stringify({
          found: false,
          name: compName,
          available: structure.components.map(c => c.name),
        })
      }

      // Get the component's source code
      const sourceLines = lines.slice(comp.line - 1, comp.endLine)

      return JSON.stringify({
        found: true,
        component: {
          name: comp.name,
          extends: comp.extends,
          slots: comp.slots,
          states: comp.states,
          properties: comp.properties.map(p => `${p.name}: ${p.value}`),
          lineRange: `${comp.line}-${comp.endLine}`,
        },
        source: sourceLines.join('\n'),
      }, null, 2)
    }

    case 'mirror_get_token': {
      const tokenName = args.name as string
      if (!structure) {
        return JSON.stringify({ error: 'No file open' })
      }

      const token = getToken(structure, tokenName)
      if (!token) {
        return JSON.stringify({
          found: false,
          name: tokenName,
          available: structure.tokens.map(t => t.fullName),
        })
      }

      return JSON.stringify({
        found: true,
        token: {
          name: token.name,
          fullName: token.fullName,
          suffix: token.suffix,
          value: token.value,
          line: token.line,
        },
      }, null, 2)
    }

    // === Navigation Tools ===
    case 'mirror_select_element': {
      const line = args.line as number
      if (!bridge.isConnected()) {
        return JSON.stringify({ error: 'Not connected to Mirror Studio' })
      }

      bridge.selectElement(line)
      return JSON.stringify({
        success: true,
        message: `Selected element at line ${line}`,
        lineContent: lines[line - 1]?.trim(),
      })
    }

    // === Code Modification Tools ===
    case 'mirror_update_property': {
      const line = args.line as number
      const prop = args.property as string
      const value = args.value as string

      if (line < 1 || line > lines.length) {
        return JSON.stringify({ error: `Line ${line} out of range` })
      }

      const currentLine = lines[line - 1]

      // Find and replace property
      const propRegex = new RegExp(`(${prop})\\s+[^,\\n]+`, 'g')
      let newLine: string

      if (propRegex.test(currentLine)) {
        newLine = currentLine.replace(propRegex, `${prop} ${value}`)
      } else {
        // Property doesn't exist, add it
        // Find where to insert (after element name or last property)
        const insertPos = currentLine.lastIndexOf(',') > 0
          ? currentLine.lastIndexOf(',') + 1
          : currentLine.length
        newLine = currentLine.slice(0, insertPos) + `, ${prop} ${value}` + currentLine.slice(insertPos)
      }

      return JSON.stringify({
        action: 'update_property',
        line,
        property: prop,
        value,
        before: currentLine.trim(),
        after: newLine.trim(),
        instruction: `Replace line ${line} with:\n${newLine}`,
      }, null, 2)
    }

    case 'mirror_add_property': {
      const line = args.line as number
      const prop = args.property as string
      const value = args.value as string

      if (line < 1 || line > lines.length) {
        return JSON.stringify({ error: `Line ${line} out of range` })
      }

      const currentLine = lines[line - 1]
      const newLine = currentLine.trimEnd() + `, ${prop} ${value}`

      return JSON.stringify({
        action: 'add_property',
        line,
        property: prop,
        value,
        before: currentLine.trim(),
        after: newLine.trim(),
        instruction: `Replace line ${line} with:\n${newLine}`,
      }, null, 2)
    }

    case 'mirror_remove_property': {
      const line = args.line as number
      const prop = args.property as string

      if (line < 1 || line > lines.length) {
        return JSON.stringify({ error: `Line ${line} out of range` })
      }

      const currentLine = lines[line - 1]
      // Remove property and its value, including comma
      const propRegex = new RegExp(`,?\\s*${prop}\\s+[^,\\n]+`, 'g')
      const newLine = currentLine.replace(propRegex, '').replace(/,\s*$/, '')

      return JSON.stringify({
        action: 'remove_property',
        line,
        property: prop,
        before: currentLine.trim(),
        after: newLine.trim(),
        instruction: `Replace line ${line} with:\n${newLine}`,
      }, null, 2)
    }

    case 'mirror_add_element': {
      const parentLine = args.parentLine as number
      const elementType = args.element as string
      const elementContent = args.content as string | undefined
      const props = args.properties as string | undefined
      const position = (args.position as string) || 'last'

      if (parentLine < 1 || parentLine > lines.length) {
        return JSON.stringify({ error: `Line ${parentLine} out of range` })
      }

      // Calculate indent (parent indent + 2)
      const parentLineContent = lines[parentLine - 1]
      const parentIndent = parentLineContent.length - parentLineContent.trimStart().length
      const childIndent = '  '.repeat((parentIndent / 2) + 1)

      // Build the new element line
      let newElement = `${childIndent}${elementType}`
      if (elementContent) {
        newElement += ` "${elementContent}"`
      }
      if (props) {
        newElement += `, ${props}`
      }

      // Find insertion point
      let insertLine = parentLine
      if (position === 'last') {
        // Find the last child of the parent
        for (let i = parentLine; i < lines.length; i++) {
          const lineIndent = lines[i].length - lines[i].trimStart().length
          if (lines[i].trim() && lineIndent <= parentIndent && i > parentLine) {
            insertLine = i
            break
          }
          insertLine = i + 1
        }
      } else {
        insertLine = parentLine + 1
      }

      return JSON.stringify({
        action: 'add_element',
        parentLine,
        insertAtLine: insertLine,
        element: newElement.trim(),
        instruction: `Insert after line ${insertLine - 1}:\n${newElement}`,
      }, null, 2)
    }

    case 'mirror_add_token': {
      const tokenName = args.name as string
      const tokenValue = args.value as string

      // Tokens go at the top of the file
      const newToken = `$${tokenName}: ${tokenValue}`

      // Find where tokens end (first non-token, non-empty, non-comment line)
      let insertLine = 1
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line.startsWith('$') || line === '' || line.startsWith('//')) {
          insertLine = i + 2
        } else {
          break
        }
      }

      return JSON.stringify({
        action: 'add_token',
        name: `$${tokenName}`,
        value: tokenValue,
        insertAtLine: insertLine,
        instruction: `Insert at line ${insertLine}:\n${newToken}`,
      }, null, 2)
    }

    case 'mirror_add_component': {
      const compName = args.name as string
      const extendsBase = args.extends as string | undefined
      const props = args.properties as string | undefined
      const slots = args.slots as string[] | undefined

      // Build component definition
      const lines: string[] = []

      let defLine = `${compName}:`
      if (extendsBase) {
        defLine += ` = ${extendsBase}`
      }
      if (props) {
        defLine += ` ${props}`
      }
      lines.push(defLine)

      if (slots && slots.length > 0) {
        for (const slot of slots) {
          lines.push(`  ${slot}:`)
        }
      }

      return JSON.stringify({
        action: 'add_component',
        name: compName,
        code: lines.join('\n'),
        instruction: `Add this component definition:\n\n${lines.join('\n')}`,
      }, null, 2)
    }

    case 'mirror_wrap_element': {
      const line = args.line as number
      const wrapper = (args.wrapper as string) || 'Frame'
      const wrapperProps = args.properties as string | undefined

      if (line < 1 || line > lines.length) {
        return JSON.stringify({ error: `Line ${line} out of range` })
      }

      const targetLine = lines[line - 1]
      const currentIndent = targetLine.length - targetLine.trimStart().length
      const indentStr = ' '.repeat(currentIndent)

      // Build wrapper
      let wrapperLine = `${indentStr}${wrapper}`
      if (wrapperProps) {
        wrapperLine += ` ${wrapperProps}`
      }

      // Increase indent of wrapped element
      const wrappedLine = '  ' + targetLine

      return JSON.stringify({
        action: 'wrap_element',
        line,
        wrapper,
        before: targetLine.trim(),
        instruction: `Replace line ${line} with:\n${wrapperLine}\n${wrappedLine}`,
      }, null, 2)
    }

    case 'mirror_add_state': {
      const line = args.line as number
      const stateName = args.stateName as string
      const stateProps = args.properties as string | undefined

      if (line < 1 || line > lines.length) {
        return JSON.stringify({ error: `Line ${line} out of range` })
      }

      const targetLine = lines[line - 1]
      const currentIndent = targetLine.length - targetLine.trimStart().length
      const stateIndent = ' '.repeat(currentIndent + 2)
      const propIndent = ' '.repeat(currentIndent + 4)

      const stateLines = [`${stateIndent}${stateName}:`]
      if (stateProps) {
        stateLines.push(`${propIndent}${stateProps}`)
      }

      // Find where to insert (after the component definition line)
      let insertAfter = line
      for (let i = line; i < lines.length; i++) {
        const lineContent = lines[i]
        const lineIndent = lineContent.length - lineContent.trimStart().length
        if (lineContent.trim() && lineIndent <= currentIndent && i > line) {
          insertAfter = i
          break
        }
        insertAfter = i + 1
      }

      return JSON.stringify({
        action: 'add_state',
        line,
        stateName,
        insertAfterLine: insertAfter - 1,
        code: stateLines.join('\n'),
        instruction: `Insert after line ${insertAfter - 1}:\n${stateLines.join('\n')}`,
      }, null, 2)
    }

    // === Validation ===
    case 'mirror_validate': {
      return JSON.stringify({
        errors: state.errors,
        errorCount: state.errors.length,
        valid: state.errors.length === 0,
        message: state.errors.length === 0
          ? 'File is valid'
          : `Found ${state.errors.length} error(s)`,
      }, null, 2)
    }

    // === Code Generation ===
    case 'mirror_generate_component': {
      const description = args.description as string
      const style = (args.style as string) || 'minimal'

      // This provides guidance, not actual generation
      return JSON.stringify({
        description,
        style,
        guidance: `To generate a "${description}" component:

1. Start with a component definition: \`ComponentName:\`
2. Add base properties for layout and styling
3. Define slots for customizable parts
4. Add states for interactivity (hover, active, etc.)

Example structure:
\`\`\`mirror
${description.replace(/\s+/g, '')}:
  // Base styles
  // Slots
  // States
\`\`\`

Use mirror://dsl-reference for syntax help.`,
      }, null, 2)
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}
