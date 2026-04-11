/**
 * Production CodeModifier Adapters
 *
 * Production implementations of CodeModifier ports.
 * These wrap the existing SourceMap and line parser utilities.
 */

import type { SourceMap, NodeMapping as SourceMapNodeMapping } from '../../ir/source-map'
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
import {
  parseLine as parseLineFn,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
  getCanonicalName,
  isSameProperty,
  type ParsedLine as OriginalParsedLine,
  type ParsedProperty as OriginalParsedProperty,
} from '../line-property-parser'
import { adjustTemplateIndentation } from '../../schema/component-templates'

// ============================================
// Production SourceMap Port
// ============================================

/**
 * Create a SourceMapPort from a real SourceMap instance
 */
export function createSourceMapPort(sourceMap: SourceMap): SourceMapPort {
  return {
    getNodeById(nodeId: string): NodeMapping | null {
      const node = sourceMap.getNodeById(nodeId)
      if (!node) return null

      return {
        nodeId: node.nodeId,
        componentName: node.componentName,
        position: {
          line: node.position.line,
          column: node.position.column,
          endLine: node.position.endLine,
          endColumn: node.position.endColumn,
        },
      }
    },

    getChildren(parentId: string): NodeMapping[] {
      const children = sourceMap.getChildren(parentId)
      return children.map(node => ({
        nodeId: node.nodeId,
        componentName: node.componentName,
        position: {
          line: node.position.line,
          column: node.position.column,
          endLine: node.position.endLine,
          endColumn: node.position.endColumn,
        },
      }))
    },

    isDescendantOf(targetId: string, ancestorId: string): boolean {
      return sourceMap.isDescendantOf(targetId, ancestorId)
    },
  }
}

// ============================================
// Production Line Parser Port
// ============================================

/**
 * Convert original ParsedProperty to port ParsedProperty
 */
function convertParsedProperty(original: OriginalParsedProperty): ParsedProperty {
  return {
    name: original.canonicalName,
    value: original.value,
    rawName: original.name,
    start: original.startIndex,
    end: original.endIndex,
  }
}

/**
 * Convert original ParsedLine to port ParsedLine
 */
function convertParsedLine(original: OriginalParsedLine): ParsedLine {
  // Extract element name from componentPart
  const elementName = original.componentPart || ''

  return {
    indent: original.indent,
    elementName,
    textContent: original.textContent,
    properties: original.properties.map(convertParsedProperty),
    originalLine: original.original,
  }
}

/**
 * Create a LineParserPort using the production line-property-parser
 */
export function createLineParserPort(): LineParserPort {
  return {
    parseLine(line: string): ParsedLine {
      const original = parseLineFn(line)
      return convertParsedLine(original)
    },

    findProperty(parsedLine: ParsedLine, propName: string): ParsedProperty | null {
      // Re-parse with original parser to use its findProperty
      const original = parseLineFn(parsedLine.originalLine)
      const found = findPropertyInLine(original, propName)
      if (!found) return null
      return convertParsedProperty(found)
    },

    updateProperty(parsedLine: ParsedLine, propName: string, newValue: string): string {
      const original = parseLineFn(parsedLine.originalLine)
      return updatePropertyInLine(original, propName, newValue)
    },

    addProperty(parsedLine: ParsedLine, propName: string, value: string): string {
      const original = parseLineFn(parsedLine.originalLine)
      return addPropertyToLine(original, propName, value)
    },

    removeProperty(parsedLine: ParsedLine, propName: string): string {
      const original = parseLineFn(parsedLine.originalLine)
      return removePropertyFromLine(original, propName)
    },

    getCanonicalName,
    isSameProperty,
  }
}

// ============================================
// Production Template Port
// ============================================

/**
 * Create a TemplatePort using the production template utilities
 */
export function createTemplatePort(): TemplatePort {
  return {
    adjustIndentation(template: string, targetIndent: string): string {
      return adjustTemplateIndentation(template, targetIndent)
    },
  }
}

// ============================================
// Production Document Port
// ============================================

/**
 * Create a DocumentPort from source code string
 */
export function createDocumentPort(initialSource: string): DocumentPort & {
  /** Update the source (for state management) */
  setSource(source: string): void
} {
  let source = initialSource
  let lines = source.split('\n')

  const updateLines = () => {
    lines = source.split('\n')
  }

  return {
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
      for (let i = 0; i < line - 1 && i < lines.length; i++) {
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

    setSource(newSource: string): void {
      source = newSource
      updateLines()
    },
  }
}

// ============================================
// Combined Production Ports
// ============================================

export interface CreateCodeModifierPortsConfig {
  sourceMap: SourceMap
  source: string
}

/**
 * Create all production ports for CodeModifier
 */
export function createCodeModifierPorts(config: CreateCodeModifierPortsConfig): CodeModifierPorts {
  return {
    sourceMap: createSourceMapPort(config.sourceMap),
    lineParser: createLineParserPort(),
    template: createTemplatePort(),
    document: createDocumentPort(config.source),
  }
}

// ============================================
// Exports
// ============================================

export type {
  SourceMapPort,
  LineParserPort,
  TemplatePort,
  DocumentPort,
  CodeModifierPorts,
}
