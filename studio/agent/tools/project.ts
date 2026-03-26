/**
 * Project Tools for Mirror Agent
 *
 * Tools for accessing project structure, files, and existing tokens/components.
 * Enables smart integration by understanding project context.
 */

import type { Tool, ToolContext, ToolResult, LLMCommand, FileInfo } from '../types'
import { parseTokens as parseTokensFromSource } from '../../pickers/token/types'

// ============================================
// PROJECT INFO TOOLS
// ============================================

export const getProjectTool: Tool = {
  name: 'get_project',
  description: `Returns project structure: all files with their types and what they contain.

File types:
- tokens: Design tokens (colors, spacing, etc.) - named like "tokens.mirror" or starts with "$"
- components: Reusable component definitions - named like "components.mirror" or contains "as Type:"
- layout: UI layouts and instances - other .mirror files

IMPORTANT: Always check project structure before adding new tokens or components to avoid duplicates.`,
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    const files = ctx.getFiles()
    const currentFile = ctx.getCurrentFile()

    const filesSummary = files.map(f => ({
      name: f.name,
      type: f.type,
      isCurrent: f.name === currentFile,
      lineCount: f.code.split('\n').length,
      preview: f.code.split('\n').slice(0, 3).join('\n')
    }))

    return {
      success: true,
      data: {
        currentFile,
        files: filesSummary,
        totalFiles: files.length
      }
    }
  }
}

export const getFileTool: Tool = {
  name: 'get_file',
  description: `Returns the complete code of a specific file.

Use this to inspect tokens, components, or layout files before making changes.`,
  parameters: {
    filename: {
      type: 'string',
      description: 'Name of the file to read',
      required: true
    }
  },
  execute: async ({ filename }, ctx: ToolContext): Promise<ToolResult> => {
    const files = ctx.getFiles()
    const file = files.find(f => f.name === filename)

    if (!file) {
      const available = files.map(f => f.name).join(', ')
      return {
        success: false,
        error: `File not found: ${filename}. Available files: ${available}`
      }
    }

    return {
      success: true,
      data: {
        name: file.name,
        type: file.type,
        code: file.code
      }
    }
  }
}

export const getAllCodeTool: Tool = {
  name: 'get_all_code',
  description: `Returns ALL code from ALL project files concatenated.

Use this to see the complete project context including all tokens, components, and layouts.
Useful for understanding what's available before making changes.`,
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    const allCode = ctx.getAllCode()
    const files = ctx.getFiles()

    return {
      success: true,
      data: {
        code: allCode,
        fileCount: files.length,
        totalLines: allCode.split('\n').length
      }
    }
  }
}

// ============================================
// EXISTING ELEMENTS TOOLS
// ============================================

export const getTokensTool: Tool = {
  name: 'get_tokens',
  description: `Returns all defined design tokens in the project.

Tokens are values like colors, spacing, etc. defined with $ prefix.
ALWAYS check existing tokens before creating new ones to avoid duplicates.`,
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    // Parse tokens directly from source code
    const allCode = ctx.getAllCode()
    const parsedTokens = parseTokensFromSource(allCode)

    const tokenList = parsedTokens.map(t => ({
      name: t.name,
      value: t.value,
      type: t.type || 'other'
    }))

    return {
      success: true,
      data: {
        tokens: tokenList,
        count: tokenList.length,
        byType: groupByType(tokenList)
      }
    }
  }
}

export const getComponentsTool: Tool = {
  name: 'get_components',
  description: `Returns all defined reusable components in the project.

Components are defined with "Name as Type:" syntax.
ALWAYS check existing components before creating new ones - prefer reuse over duplication.`,
  parameters: {},
  execute: async (_, ctx: ToolContext): Promise<ToolResult> => {
    const allCode = ctx.getAllCode()

    // Parse components directly from source code
    const componentNames = parseComponentsFromSource(allCode)

    // Extract component details from code
    const componentDetails = componentNames.map(name => {
      const definition = extractComponentDefinition(allCode, name)
      return {
        name,
        baseType: definition?.baseType || 'unknown',
        properties: definition?.properties || [],
        hasStates: definition?.hasStates || false
      }
    })

    return {
      success: true,
      data: {
        components: componentDetails,
        count: componentNames.length
      }
    }
  }
}

// ============================================
// SMART INTEGRATION TOOLS
// ============================================

export const addTokenTool: Tool = {
  name: 'add_token',
  description: `Adds a new design token to the project's token file.

IMPORTANT:
1. First check if a similar token already exists using get_tokens
2. Use semantic names WITH property suffix:
   - Colors: $primary.bg, $text.col, $border.boc
   - Spacing: $sm.pad, $md.gap, $lg.margin
   - Radius: $sm.rad, $md.rad
3. Token will be added to the tokens file automatically

Example: add_token("primary.bg", "#3B82F6")
Example: add_token("md.pad", "16")`,
  parameters: {
    name: {
      type: 'string',
      description: 'Token name (without $ prefix)',
      required: true
    },
    value: {
      type: 'string',
      description: 'Token value (color, number, etc.)',
      required: true
    }
  },
  execute: async ({ name, value }, ctx: ToolContext): Promise<ToolResult> => {
    // Parse tokens directly from source to check for duplicates
    const allCode = ctx.getAllCode()
    const existingTokens = parseTokensFromSource(allCode)
    const tokenName = name.startsWith('$') ? name.slice(1) : name

    // Check if token already exists
    const existingToken = existingTokens.find(t =>
      t.name === `$${tokenName}` ||
      t.name === tokenName ||
      t.name.endsWith(`.${tokenName}`)
    )

    if (existingToken) {
      return {
        success: false,
        error: `Token already exists: ${existingToken.name} = ${existingToken.value}. Use existing token instead of creating duplicate.`
      }
    }

    const command: LLMCommand = {
      type: 'ADD_TOKEN',
      tokenName,
      tokenValue: value
    }

    return {
      success: true,
      data: {
        added: `$${tokenName}: ${value}`,
        message: 'Token will be added to tokens file'
      },
      commands: [command]
    }
  }
}

export const addComponentTool: Tool = {
  name: 'add_component',
  description: `Adds a new reusable component definition to the project's components file.

IMPORTANT:
1. First check if a similar component exists using get_components
2. Use PascalCase names: Card, PrimaryButton, NavItem
3. Component will be added to the components file automatically
4. Use existing tokens instead of hardcoded values

Example: add_component("Card", "Frame", "pad $spacing, bg $surface, rad 8")`,
  parameters: {
    name: {
      type: 'string',
      description: 'Component name (PascalCase)',
      required: true
    },
    baseType: {
      type: 'string',
      description: 'Base type to extend (Frame, Box, Text, Button, etc.)',
      required: true
    },
    properties: {
      type: 'string',
      description: 'Properties string (e.g., "pad 16, bg #fff, rad 8")',
      required: false
    }
  },
  execute: async ({ name, baseType, properties }, ctx: ToolContext): Promise<ToolResult> => {
    // Parse components directly from source to check for duplicates
    const allCode = ctx.getAllCode()
    const existingComponents = parseComponentsFromSource(allCode)

    if (existingComponents.includes(name)) {
      return {
        success: false,
        error: `Component already exists: ${name}. Use existing component instead of creating duplicate.`
      }
    }

    // Format properties: "pad 16, bg #fff" -> "pad 16\n  bg #fff"
    const formattedProps = properties
      ? properties.split(',').map((p: string) => p.trim()).join('\n  ')
      : ''

    const definition = formattedProps
      ? `${name} as ${baseType}:\n  ${formattedProps}`
      : `${name} as ${baseType}:`

    const command: LLMCommand = {
      type: 'ADD_COMPONENT',
      componentName: name,
      componentDefinition: definition
    }

    return {
      success: true,
      data: {
        added: definition,
        message: 'Component will be added to components file'
      },
      commands: [command]
    }
  }
}

export const useComponentTool: Tool = {
  name: 'use_component',
  description: `Creates an instance of an existing component in the current layout.

ALWAYS prefer using existing components over creating new elements with duplicate properties.`,
  parameters: {
    component: {
      type: 'string',
      description: 'Component name to instantiate',
      required: true
    },
    parent: {
      type: 'string',
      description: 'Parent selector (@line, #id, or Type)',
      required: false
    },
    content: {
      type: 'string',
      description: 'Text content or child content',
      required: false
    },
    properties: {
      type: 'string',
      description: 'Additional instance properties',
      required: false
    }
  },
  execute: async ({ component, parent, content, properties }, ctx: ToolContext): Promise<ToolResult> => {
    // Parse components directly from source
    const allCode = ctx.getAllCode()
    const existingComponents = parseComponentsFromSource(allCode)

    if (!existingComponents.includes(component)) {
      return {
        success: false,
        error: `Component not found: ${component}. Available: ${existingComponents.join(', ')}`
      }
    }

    // Build the instance line
    let instanceLine = component
    if (content) {
      instanceLine += ` "${content}"`
    }
    if (properties) {
      instanceLine += ` ${properties}`  // Space, not comma
    }

    const command: LLMCommand = {
      type: 'USE_COMPONENT',
      component,
      parentId: parent,
      properties: instanceLine
    }

    return {
      success: true,
      data: {
        instance: instanceLine,
        message: parent ? `Will add ${component} to ${parent}` : `Will add ${component} to current file`
      },
      commands: [command]
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function detectTokenType(value: string): string {
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
    return 'color'
  }
  if (/^\d+$/.test(value)) {
    return 'number'
  }
  if (/^\d+px$/.test(value)) {
    return 'size'
  }
  return 'other'
}

function groupByType(tokens: { name: string; value: string; type: string }[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const token of tokens) {
    if (!groups[token.type]) {
      groups[token.type] = []
    }
    groups[token.type].push(token.name)
  }
  return groups
}

/**
 * Parse component definitions from source code
 * Matches patterns like: "Name as Type:" or "Name as Type"
 */
function parseComponentsFromSource(code: string): string[] {
  const components: string[] = []
  const lines = code.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//')) continue

    // Match component definition: "Name as Type:" or "Name as Type"
    const match = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s+as\s+[A-Z][a-zA-Z0-9]*:?/)
    if (match) {
      components.push(match[1])
    }
  }

  return components
}

function extractComponentDefinition(code: string, name: string): {
  baseType: string
  properties: string[]
  hasStates: boolean
} | null {
  const regex = new RegExp(`^${name}\\s+as\\s+(\\w+):?(.*)$`, 'm')
  const match = code.match(regex)

  if (!match) return null

  const baseType = match[1]
  const propsLine = match[2]?.trim() || ''

  // Extract properties from the line after
  const lines = code.split('\n')
  const defLine = lines.findIndex(l => l.match(regex))
  const properties: string[] = []
  let hasStates = false

  if (defLine >= 0) {
    for (let i = defLine + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.startsWith('  ')) break // End of definition

      const trimmed = line.trim()
      if (['hover', 'focus', 'active', 'disabled'].some(s => trimmed.startsWith(s))) {
        hasStates = true
      } else if (trimmed && !trimmed.startsWith('//')) {
        // Extract property names
        const props = trimmed.split(',').map(p => p.trim().split(/\s+/)[0])
        properties.push(...props.filter(Boolean))
      }
    }
  }

  return { baseType, properties, hasStates }
}

// ============================================
// EXPORT ALL TOOLS
// ============================================

export const projectTools: Tool[] = [
  getProjectTool,
  getFileTool,
  getAllCodeTool,
  getTokensTool,
  getComponentsTool,
  addTokenTool,
  addComponentTool,
  useComponentTool
]
