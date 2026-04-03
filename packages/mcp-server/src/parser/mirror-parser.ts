/**
 * Simple Mirror Parser for MCP Server
 *
 * Extracts structure from Mirror code without full compilation.
 * Designed to give Claude Code enough context to understand and modify the code.
 */

export interface MirrorElement {
  type: 'element' | 'component-def' | 'component-instance' | 'slot-def' | 'state' | 'token' | 'comment'
  name: string
  line: number
  column: number
  indent: number
  content?: string
  properties: MirrorProperty[]
  extends?: string
  states: string[]
  children: MirrorElement[]
  parent?: MirrorElement
}

export interface MirrorProperty {
  name: string
  value: string
  line: number
}

export interface MirrorStructure {
  tokens: MirrorToken[]
  components: MirrorComponent[]
  elements: MirrorElement[]
  tree: MirrorElement[]
  errors: MirrorError[]
}

export interface MirrorToken {
  name: string
  fullName: string  // with $
  suffix: string    // bg, col, pad, etc.
  value: string
  line: number
}

export interface MirrorComponent {
  name: string
  extends: string | null
  slots: string[]
  states: string[]
  properties: MirrorProperty[]
  line: number
  endLine: number
}

export interface MirrorError {
  line: number
  column: number
  message: string
}

// Known primitives
const PRIMITIVES = new Set([
  'Frame', 'Text', 'Button', 'Input', 'Textarea', 'Label', 'Image', 'Img',
  'Icon', 'Link', 'Slot', 'Divider', 'Spacer', 'Header', 'Nav', 'Main',
  'Section', 'Article', 'Aside', 'Footer', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'Box' // alias
])

// Known Zag components
const ZAG_COMPONENTS = new Set([
  'Dialog', 'Tooltip', 'Popover', 'HoverCard', 'Menu', 'ContextMenu',
  'Select', 'Combobox', 'Tabs', 'Accordion', 'Collapsible', 'Checkbox',
  'Switch', 'RadioGroup', 'Slider', 'NumberInput', 'PinInput', 'TagsInput',
  'DatePicker', 'FileUpload', 'Avatar', 'Progress', 'Toast', 'Carousel',
  'TreeView', 'Pagination', 'Steps', 'Rating', 'Clipboard', 'QRCode'
])

// System states (auto-triggered)
const SYSTEM_STATES = new Set(['hover', 'focus', 'active', 'disabled'])

/**
 * Parse Mirror source code into a structured representation
 */
export function parseMirror(source: string): MirrorStructure {
  const lines = source.split('\n')
  const tokens: MirrorToken[] = []
  const components: MirrorComponent[] = []
  const elements: MirrorElement[] = []
  const tree: MirrorElement[] = []
  const errors: MirrorError[] = []

  const elementStack: MirrorElement[] = []
  let currentComponent: MirrorComponent | null = null
  let componentStartLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) continue

    // Calculate indent (2 spaces = 1 level)
    const indent = (line.length - line.trimStart().length) / 2

    // Comment
    if (trimmed.startsWith('//')) {
      continue
    }

    // Token definition: $name.suffix: value
    const tokenMatch = trimmed.match(/^\$([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*):\s*(.+)$/)
    if (tokenMatch) {
      const fullName = tokenMatch[1]
      const parts = fullName.split('.')
      const suffix = parts[parts.length - 1]
      tokens.push({
        name: parts.slice(0, -1).join('.') || fullName,
        fullName: '$' + fullName,
        suffix,
        value: tokenMatch[2].trim(),
        line: lineNum
      })
      continue
    }

    // State definition: stateName:
    const stateMatch = trimmed.match(/^([a-z][a-zA-Z0-9]*):$/)
    if (stateMatch && indent > 0) {
      const stateName = stateMatch[1]
      // Add state to parent element/component
      const parent = elementStack[elementStack.length - 1]
      if (parent) {
        parent.states.push(stateName)
      }
      if (currentComponent && indent === 1) {
        currentComponent.states.push(stateName)
      }
      continue
    }

    // Component definition: Name: or Name as Parent: or Name: = Primitive
    const compDefMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s*(?:as\s+([A-Z][a-zA-Z0-9]*)\s*)?:\s*(?:=\s*([A-Z][a-zA-Z0-9]*))?\s*(.*)$/)
    if (compDefMatch && indent === 0) {
      // Save previous component
      if (currentComponent) {
        currentComponent.endLine = lineNum - 1
        components.push(currentComponent)
      }

      const name = compDefMatch[1]
      const parent = compDefMatch[2] || null
      const primitive = compDefMatch[3] || null
      const propsStr = compDefMatch[4] || ''

      currentComponent = {
        name,
        extends: primitive || parent,
        slots: [],
        states: [],
        properties: parseProperties(propsStr, lineNum),
        line: lineNum,
        endLine: lineNum
      }

      componentStartLine = lineNum
      continue
    }

    // Slot definition (inside component): SlotName: props
    const slotDefMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*):(.*)$/)
    if (slotDefMatch && indent > 0 && currentComponent) {
      const slotName = slotDefMatch[1]
      currentComponent.slots.push(slotName)
      continue
    }

    // Element or component instance
    const elementMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s*(.*)$/)
    if (elementMatch) {
      const name = elementMatch[1]
      const rest = elementMatch[2]

      // Determine type
      let type: MirrorElement['type'] = 'element'
      if (PRIMITIVES.has(name)) {
        type = 'element'
      } else if (ZAG_COMPONENTS.has(name)) {
        type = 'element'
      } else {
        type = 'component-instance'
      }

      // Parse content (string in quotes) and properties
      let content: string | undefined
      let propsStr = rest

      const contentMatch = rest.match(/^"([^"]*)"(.*)$/)
      if (contentMatch) {
        content = contentMatch[1]
        propsStr = contentMatch[2].replace(/^,?\s*/, '')
      }

      const element: MirrorElement = {
        type,
        name,
        line: lineNum,
        column: line.indexOf(name) + 1,
        indent,
        content,
        properties: parseProperties(propsStr, lineNum),
        states: [],
        children: []
      }

      // Find parent based on indent
      while (elementStack.length > 0 && elementStack[elementStack.length - 1].indent >= indent) {
        elementStack.pop()
      }

      if (elementStack.length > 0) {
        const parent = elementStack[elementStack.length - 1]
        parent.children.push(element)
        element.parent = parent
      } else {
        tree.push(element)
      }

      elements.push(element)
      elementStack.push(element)
    }
  }

  // Save last component
  if (currentComponent) {
    currentComponent.endLine = lines.length
    components.push(currentComponent)
  }

  return { tokens, components, elements, tree, errors }
}

/**
 * Parse property string into structured properties
 */
function parseProperties(propsStr: string, line: number): MirrorProperty[] {
  if (!propsStr.trim()) return []

  const properties: MirrorProperty[] = []

  // Simple regex-based parsing
  // Handles: name value, name, name "string"
  const propRegex = /([a-z][a-zA-Z0-9-]*)\s*(?:([^,]+?))?(?:,|$)/g
  let match

  while ((match = propRegex.exec(propsStr)) !== null) {
    const name = match[1]
    let value = (match[2] || '').trim()

    // Handle standalone boolean properties
    if (!value) {
      value = 'true'
    }

    properties.push({ name, value, line })
  }

  return properties
}

/**
 * Get element at a specific line
 */
export function getElementAtLine(structure: MirrorStructure, line: number): MirrorElement | null {
  for (const element of structure.elements) {
    if (element.line === line) {
      return element
    }
  }
  return null
}

/**
 * Get component definition by name
 */
export function getComponent(structure: MirrorStructure, name: string): MirrorComponent | null {
  return structure.components.find(c => c.name === name) || null
}

/**
 * Get token by name
 */
export function getToken(structure: MirrorStructure, name: string): MirrorToken | null {
  const searchName = name.startsWith('$') ? name : '$' + name
  return structure.tokens.find(t => t.fullName === searchName) || null
}

/**
 * Generate a structural summary for Claude Code
 */
export function generateStructureSummary(structure: MirrorStructure): string {
  const lines: string[] = []

  // Tokens
  if (structure.tokens.length > 0) {
    lines.push('## Tokens')
    for (const token of structure.tokens) {
      lines.push(`- ${token.fullName}: ${token.value} (line ${token.line})`)
    }
    lines.push('')
  }

  // Components
  if (structure.components.length > 0) {
    lines.push('## Components')
    for (const comp of structure.components) {
      let def = `- ${comp.name}`
      if (comp.extends) def += ` extends ${comp.extends}`
      def += ` (lines ${comp.line}-${comp.endLine})`
      lines.push(def)

      if (comp.slots.length > 0) {
        lines.push(`  Slots: ${comp.slots.join(', ')}`)
      }
      if (comp.states.length > 0) {
        lines.push(`  States: ${comp.states.join(', ')}`)
      }
    }
    lines.push('')
  }

  // Element tree
  lines.push('## Element Tree')
  function printTree(elements: MirrorElement[], indent = 0) {
    for (const el of elements) {
      const prefix = '  '.repeat(indent)
      let desc = `${prefix}- ${el.name}`
      if (el.content) desc += ` "${el.content}"`
      if (el.properties.length > 0) {
        const props = el.properties.slice(0, 3).map(p => `${p.name}: ${p.value}`).join(', ')
        desc += ` (${props}${el.properties.length > 3 ? ', ...' : ''})`
      }
      desc += ` [line ${el.line}]`
      lines.push(desc)

      if (el.children.length > 0) {
        printTree(el.children, indent + 1)
      }
    }
  }
  printTree(structure.tree)

  return lines.join('\n')
}
