/**
 * Mock CodeModifier Adapters
 *
 * Mock implementations of all CodeModifier ports for testing.
 * These run entirely in-memory without real SourceMap instances.
 */

import type {
  SourceMapPort,
  LineParserPort,
  TemplatePort,
  DocumentPort,
  CodeModifierPorts,
  NodeMapping,
  ParsedLine,
  ParsedProperty,
} from '../code-modifier-ports'

// ============================================
// Mock SourceMap Port
// ============================================

export interface MockSourceMapPortConfig {
  /** Initial node mappings */
  nodes?: Map<string, NodeMapping>
  /** Parent-child relationships (parentId -> childIds) */
  children?: Map<string, string[]>
}

export interface MockSourceMapPort extends SourceMapPort {
  // Test helpers - add/modify
  addNode(nodeId: string, mapping: NodeMapping): void
  setChildren(parentId: string, childIds: string[]): void
  addChild(parentId: string, childId: string): void

  // Test helpers - inspection
  getNodes(): Map<string, NodeMapping>
  getChildrenMap(): Map<string, string[]>

  // Test helpers - reset
  reset(): void
}

export function createMockSourceMapPort(config: MockSourceMapPortConfig = {}): MockSourceMapPort {
  const nodes = new Map<string, NodeMapping>(config.nodes ?? [])
  const childrenMap = new Map<string, string[]>(config.children ?? [])

  return {
    // ----------------------------------------
    // SourceMapPort Implementation
    // ----------------------------------------

    getNodeById(nodeId: string): NodeMapping | null {
      return nodes.get(nodeId) ?? null
    },

    getChildren(parentId: string): NodeMapping[] {
      const childIds = childrenMap.get(parentId) ?? []
      return childIds
        .map(id => nodes.get(id))
        .filter((n): n is NodeMapping => n !== undefined)
    },

    isDescendantOf(targetId: string, ancestorId: string): boolean {
      // Simple implementation: walk up the parent chain
      const visited = new Set<string>()

      const findParent = (nodeId: string): string | null => {
        for (const [parentId, children] of childrenMap) {
          if (children.includes(nodeId)) {
            return parentId
          }
        }
        return null
      }

      let current: string | null = targetId
      while (current) {
        if (visited.has(current)) break // cycle detection
        visited.add(current)

        const parent = findParent(current)
        if (parent === ancestorId) return true
        current = parent
      }
      return false
    },

    // ----------------------------------------
    // Test Helpers - Add/Modify
    // ----------------------------------------

    addNode(nodeId: string, mapping: NodeMapping): void {
      nodes.set(nodeId, mapping)
    },

    setChildren(parentId: string, childIds: string[]): void {
      childrenMap.set(parentId, childIds)
    },

    addChild(parentId: string, childId: string): void {
      const existing = childrenMap.get(parentId) ?? []
      if (!existing.includes(childId)) {
        childrenMap.set(parentId, [...existing, childId])
      }
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getNodes(): Map<string, NodeMapping> {
      return new Map(nodes)
    },

    getChildrenMap(): Map<string, string[]> {
      return new Map(childrenMap)
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      nodes.clear()
      childrenMap.clear()
    },
  }
}

// ============================================
// Mock Line Parser Port
// ============================================

export interface MockLineParserPortConfig {
  /** Custom alias map (name -> canonical) */
  aliases?: Map<string, string>
}

export interface MockLineParserPort extends LineParserPort {
  // Test helpers
  setAlias(name: string, canonical: string): void
  reset(): void
  // Internal helper for rebuilding lines
  buildLine(indent: string, elementName: string, textContent: string | null, properties: ParsedProperty[]): string
}

export function createMockLineParserPort(config: MockLineParserPortConfig = {}): MockLineParserPort {
  const aliases = new Map<string, string>(config.aliases ?? [
    // Default common aliases
    ['bg', 'background'],
    ['col', 'color'],
    ['pad', 'padding'],
    ['mar', 'margin'],
    ['rad', 'radius'],
    ['bor', 'border'],
    ['boc', 'border-color'],
    ['fs', 'font-size'],
    ['w', 'width'],
    ['h', 'height'],
    ['hor', 'horizontal'],
    ['ver', 'vertical'],
  ])

  // Helper to parse a simple property
  const parseSimpleProperty = (prop: string, startIndex: number): ParsedProperty | null => {
    const trimmed = prop.trim()
    if (!trimmed) return null

    const parts = trimmed.split(/\s+/)
    const name = parts[0]
    const value = parts.slice(1).join(' ')

    return {
      name,
      value,
      rawName: name,
      start: startIndex,
      end: startIndex + prop.length,
    }
  }

  return {
    // ----------------------------------------
    // LineParserPort Implementation
    // ----------------------------------------

    parseLine(line: string): ParsedLine {
      // Extract indent
      const indentMatch = line.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''
      const content = line.substring(indent.length)

      if (!content) {
        return {
          indent,
          elementName: '',
          textContent: null,
          properties: [],
          originalLine: line,
        }
      }

      // Parse element name (first word, optionally with : for definition)
      const elementMatch = content.match(/^([a-zA-Z][a-zA-Z0-9]*:?)/)
      const elementName = elementMatch ? elementMatch[1] : ''
      let remaining = content.substring(elementName.length)

      // Check for text content (quoted string)
      let textContent: string | null = null
      const textMatch = remaining.match(/^\s*"([^"]*)"/)
      if (textMatch) {
        textContent = textMatch[1]
        remaining = remaining.substring(textMatch[0].length)
      }

      // Parse properties (comma-separated)
      const properties: ParsedProperty[] = []
      if (remaining.startsWith(',')) {
        remaining = remaining.substring(1)
      }

      const propParts = remaining.split(',')
      let currentPos = indent.length + elementName.length + (textContent ? textContent.length + 3 : 0)

      for (const part of propParts) {
        const trimmed = part.trim()
        if (!trimmed) {
          currentPos += part.length + 1
          continue
        }

        const parts = trimmed.split(/\s+/)
        const name = parts[0]
        const value = parts.slice(1).join(' ')

        properties.push({
          name,
          value,
          rawName: name,
          start: currentPos,
          end: currentPos + part.length,
        })

        currentPos += part.length + 1
      }

      return {
        indent,
        elementName,
        textContent,
        properties,
        originalLine: line,
      }
    },

    findProperty(parsedLine: ParsedLine, propName: string): ParsedProperty | null {
      const canonical = aliases.get(propName) ?? propName
      return parsedLine.properties.find(p => {
        const pCanonical = aliases.get(p.name) ?? p.name
        return pCanonical === canonical
      }) ?? null
    },

    updateProperty(parsedLine: ParsedLine, propName: string, newValue: string): string {
      const { indent, elementName, textContent, properties, originalLine } = parsedLine

      // Find and update the property
      const canonical = aliases.get(propName) ?? propName
      const updatedProps = properties.map(p => {
        const pCanonical = aliases.get(p.name) ?? p.name
        if (pCanonical === canonical) {
          return { ...p, value: newValue }
        }
        return p
      })

      // Rebuild line
      return this.buildLine(indent, elementName, textContent, updatedProps)
    },

    addProperty(parsedLine: ParsedLine, propName: string, value: string): string {
      const { indent, elementName, textContent, properties } = parsedLine

      // Add new property
      const newProp: ParsedProperty = {
        name: propName,
        value,
        rawName: propName,
        start: 0,
        end: 0,
      }

      return this.buildLine(indent, elementName, textContent, [...properties, newProp])
    },

    removeProperty(parsedLine: ParsedLine, propName: string): string {
      const { indent, elementName, textContent, properties } = parsedLine

      // Remove property
      const canonical = aliases.get(propName) ?? propName
      const filteredProps = properties.filter(p => {
        const pCanonical = aliases.get(p.name) ?? p.name
        return pCanonical !== canonical
      })

      return this.buildLine(indent, elementName, textContent, filteredProps)
    },

    getCanonicalName(propName: string): string {
      return aliases.get(propName) ?? propName
    },

    isSameProperty(name1: string, name2: string): boolean {
      const canonical1 = aliases.get(name1) ?? name1
      const canonical2 = aliases.get(name2) ?? name2
      return canonical1 === canonical2
    },

    // Helper method to rebuild a line
    buildLine(indent: string, elementName: string, textContent: string | null, properties: ParsedProperty[]): string {
      let line = indent + elementName

      if (textContent !== null) {
        line += ` "${textContent}"`
      }

      if (properties.length > 0) {
        const propStr = properties.map(p => {
          if (p.value) {
            return `${p.name} ${p.value}`
          }
          return p.name
        }).join(', ')

        if (textContent !== null || elementName.endsWith(':')) {
          line += `, ${propStr}`
        } else if (propStr) {
          line += ` ${propStr}`
        }
      }

      return line
    },

    // ----------------------------------------
    // Test Helpers
    // ----------------------------------------

    setAlias(name: string, canonical: string): void {
      aliases.set(name, canonical)
    },

    reset(): void {
      aliases.clear()
    },
  } as MockLineParserPort
}

// ============================================
// Mock Template Port
// ============================================

export interface MockTemplatePort extends TemplatePort {
  // Test helpers
  reset(): void
}

export function createMockTemplatePort(): MockTemplatePort {
  return {
    adjustIndentation(template: string, targetIndent: string): string {
      const lines = template.split('\n')
      if (lines.length === 0) return template

      // Find minimum indent in template
      let minIndent = Infinity
      for (const line of lines) {
        if (line.trim()) {
          const indent = line.match(/^(\s*)/)?.[1].length ?? 0
          minIndent = Math.min(minIndent, indent)
        }
      }
      if (minIndent === Infinity) minIndent = 0

      // Re-indent all lines
      return lines.map(line => {
        if (!line.trim()) return ''
        const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
        const relativeIndent = currentIndent - minIndent
        return targetIndent + ' '.repeat(relativeIndent) + line.trim()
      }).join('\n')
    },

    reset(): void {
      // Nothing to reset
    },
  }
}

// ============================================
// Mock Document Port
// ============================================

export interface MockDocumentPortConfig {
  /** Initial source code */
  source?: string
}

export interface MockDocumentPort extends DocumentPort {
  // Test helpers
  setSource(source: string): void
  reset(): void
}

export function createMockDocumentPort(config: MockDocumentPortConfig = {}): MockDocumentPort {
  let source = config.source ?? ''
  let lines = source.split('\n')

  const updateLines = () => {
    lines = source.split('\n')
  }

  return {
    // ----------------------------------------
    // DocumentPort Implementation
    // ----------------------------------------

    getSource(): string {
      return source
    },

    getLines(): readonly string[] {
      return lines
    },

    getLine(lineNumber: number): string | null {
      const idx = lineNumber - 1
      if (idx < 0 || idx >= lines.length) return null
      return lines[idx]
    },

    getLineCount(): number {
      return lines.length
    },

    getCharacterOffset(line: number, column: number): number {
      let offset = 0
      for (let i = 0; i < line - 1; i++) {
        offset += lines[i].length + 1 // +1 for newline
      }
      offset += column - 1
      return offset
    },

    getLineIndent(line: string): string {
      const match = line.match(/^(\s*)/)
      return match ? match[1] : ''
    },

    applyChange(from: number, to: number, insert: string): string {
      source = source.substring(0, from) + insert + source.substring(to)
      updateLines()
      return source
    },

    // ----------------------------------------
    // Test Helpers
    // ----------------------------------------

    setSource(newSource: string): void {
      source = newSource
      updateLines()
    },

    reset(): void {
      source = ''
      lines = ['']
    },
  }
}

// ============================================
// Combined Mock Ports
// ============================================

export interface MockCodeModifierPorts extends CodeModifierPorts {
  sourceMap: MockSourceMapPort
  lineParser: MockLineParserPort
  template: MockTemplatePort
  document: MockDocumentPort
}

export interface CreateMockCodeModifierPortsConfig {
  source?: string
  nodes?: Map<string, NodeMapping>
  children?: Map<string, string[]>
}

/**
 * Create all mock ports for CodeModifier testing
 */
export function createMockCodeModifierPorts(
  config: CreateMockCodeModifierPortsConfig = {}
): MockCodeModifierPorts {
  return {
    sourceMap: createMockSourceMapPort({
      nodes: config.nodes,
      children: config.children,
    }),
    lineParser: createMockLineParserPort(),
    template: createMockTemplatePort(),
    document: createMockDocumentPort({ source: config.source }),
  }
}

// ============================================
// Test Fixture Helpers
// ============================================

/**
 * Create a simple node mapping for testing
 */
export function createNodeMapping(
  nodeId: string,
  componentName: string,
  line: number,
  column = 1,
  endLine?: number
): NodeMapping {
  return {
    nodeId,
    componentName,
    position: {
      line,
      column,
      endLine: endLine ?? line,
    },
  }
}

/**
 * Create a test fixture with source code and matching node mappings
 */
export function createTestFixture(source: string, nodeSpecs: Array<{
  nodeId: string
  componentName: string
  line: number
  parentId?: string
}>): MockCodeModifierPorts {
  const nodes = new Map<string, NodeMapping>()
  const children = new Map<string, string[]>()

  for (const spec of nodeSpecs) {
    nodes.set(spec.nodeId, createNodeMapping(
      spec.nodeId,
      spec.componentName,
      spec.line
    ))

    if (spec.parentId) {
      const existing = children.get(spec.parentId) ?? []
      children.set(spec.parentId, [...existing, spec.nodeId])
    }
  }

  return createMockCodeModifierPorts({ source, nodes, children })
}
