#!/usr/bin/env npx tsx
/**
 * Tutorial Validator - Deep Code Analysis
 *
 * Parst Mirror-Code und erstellt präzise Erwartungen für jeden Node.
 * Validiert: Hierarchie, alle Properties, Text, Tags, Styles.
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Types
// =============================================================================

interface ParsedNode {
  id: string // node-1, node-2, ...
  line: number // Zeile im Code
  indent: number // Einrückung (0, 2, 4, ...)
  primitive: string // Frame, Text, Button, ...
  text: string | null // "Speichern", null
  properties: Map<string, string | number | boolean>
  children: ParsedNode[]
  parent: ParsedNode | null
  isComponent: boolean // Definition (Btn:) vs Usage (Btn)
  isComponentUsage: boolean
}

interface ExpectedStyles {
  [cssProperty: string]: string
}

interface NodeExpectation {
  nodeId: string
  tag: string
  text: string | null
  styles: ExpectedStyles
  childCount: number
  childIds: string[]
  parentId: string | null
  attributes: Record<string, string>
}

interface CodeExpectation {
  totalNodes: number
  nodes: NodeExpectation[]
  hierarchy: Record<string, string[]> // parentId -> childIds
}

// =============================================================================
// Primitive → HTML Tag Mapping
// =============================================================================

const PRIMITIVE_TAGS: Record<string, string> = {
  Frame: 'div',
  Box: 'div',
  Text: 'span',
  Button: 'button',
  Input: 'input',
  Textarea: 'textarea',
  Label: 'label',
  Image: 'img',
  Img: 'img',
  Icon: 'span',
  Link: 'a',
  Divider: 'hr',
  Spacer: 'div',
  Header: 'header',
  Nav: 'nav',
  Main: 'main',
  Section: 'section',
  Article: 'article',
  Aside: 'aside',
  Footer: 'footer',
  H1: 'h1',
  H2: 'h2',
  H3: 'h3',
  H4: 'h4',
  H5: 'h5',
  H6: 'h6',
  // Zag components render as div
  Dialog: 'div',
  Tooltip: 'div',
  Tabs: 'div',
  Tab: 'div',
  Select: 'div',
  Option: 'div',
  Checkbox: 'div',
  Switch: 'div',
  RadioGroup: 'div',
  RadioItem: 'div',
  Slider: 'div',
  DatePicker: 'div',
  Table: 'div',
  Row: 'div',
  Column: 'div',
}

// =============================================================================
// Property → CSS Mapping
// =============================================================================

interface CSSMapping {
  property: string
  transform?: (value: string | number) => string
}

const PROPERTY_CSS: Record<string, CSSMapping> = {
  // Background & Color
  bg: { property: 'backgroundColor', transform: colorToRgb },
  col: { property: 'color', transform: colorToRgb },
  c: { property: 'color', transform: colorToRgb },

  // Sizing
  w: { property: 'width', transform: sizeToPixels },
  h: { property: 'height', transform: sizeToPixels },
  minw: { property: 'minWidth', transform: v => `${v}px` },
  maxw: { property: 'maxWidth', transform: v => `${v}px` },
  minh: { property: 'minHeight', transform: v => `${v}px` },
  maxh: { property: 'maxHeight', transform: v => `${v}px` },

  // Spacing
  gap: { property: 'gap', transform: v => `${v}px` },
  g: { property: 'gap', transform: v => `${v}px` },

  // Border
  rad: { property: 'borderRadius', transform: v => `${v}px` },
  bor: { property: 'borderWidth', transform: v => `${v}px` },
  boc: { property: 'borderColor', transform: colorToRgb },

  // Typography
  fs: { property: 'fontSize', transform: v => `${v}px` },

  // Effects
  opacity: { property: 'opacity', transform: v => String(v) },
  o: { property: 'opacity', transform: v => String(v) },

  // Layout direction
  hor: { property: 'flexDirection', transform: () => 'row' },
  horizontal: { property: 'flexDirection', transform: () => 'row' },
  ver: { property: 'flexDirection', transform: () => 'column' },
  vertical: { property: 'flexDirection', transform: () => 'column' },
}

// =============================================================================
// Color Conversion
// =============================================================================

const NAMED_COLORS: Record<string, string> = {
  white: 'rgb(255, 255, 255)',
  black: 'rgb(0, 0, 0)',
  red: 'rgb(255, 0, 0)',
  green: 'rgb(0, 128, 0)',
  blue: 'rgb(0, 0, 255)',
  yellow: 'rgb(255, 255, 0)',
  orange: 'rgb(255, 165, 0)',
  purple: 'rgb(128, 0, 128)',
  gray: 'rgb(128, 128, 128)',
  grey: 'rgb(128, 128, 128)',
  transparent: 'rgba(0, 0, 0, 0)',
}

function colorToRgb(value: string | number): string {
  const str = String(value).toLowerCase().trim()

  // Named color
  if (NAMED_COLORS[str]) {
    return NAMED_COLORS[str]
  }

  // Hex color
  if (str.startsWith('#')) {
    return hexToRgb(str)
  }

  // Already rgb/rgba
  if (str.startsWith('rgb')) {
    return str
  }

  return str
}

function hexToRgb(hex: string): string {
  let h = hex.replace('#', '')

  // Short hex (#fff -> #ffffff)
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }

  // 6-digit hex
  if (h.length === 6) {
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    return `rgb(${r}, ${g}, ${b})`
  }

  // 8-digit hex with alpha
  if (h.length === 8) {
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    const a = parseInt(h.substring(6, 8), 16) / 255
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
  }

  return hex
}

function sizeToPixels(value: string | number): string {
  if (value === 'full') return '100%'
  if (value === 'hug') return 'fit-content'
  return `${value}px`
}

// =============================================================================
// Mirror Code Parser
// =============================================================================

class MirrorParser {
  private lines: string[]
  private nodeCounter = 0
  private componentDefs = new Map<string, ParsedNode>()

  constructor(code: string) {
    this.lines = code.split('\n')
  }

  parse(): ParsedNode[] {
    const roots: ParsedNode[] = []
    const stack: ParsedNode[] = []

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i]
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) continue

      // Skip data definitions (name: value on single line without primitive)
      if (this.isDataDefinition(trimmed)) continue

      // Skip token definitions (name.suffix: value)
      if (this.isTokenDefinition(trimmed)) continue

      // Calculate indent
      const indent = line.search(/\S/)
      if (indent === -1) continue

      // Parse the line
      const node = this.parseLine(trimmed, i + 1, indent)
      if (!node) continue

      // Component definition - store for later
      if (node.isComponent) {
        this.componentDefs.set(node.primitive, node)
        // Component definitions still render, so we continue
      }

      // Find parent based on indent
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }

      if (stack.length === 0) {
        roots.push(node)
      } else {
        const parent = stack[stack.length - 1]
        node.parent = parent
        parent.children.push(node)
      }

      stack.push(node)

      // Handle inline children (semicolon syntax)
      this.parseInlineChildren(trimmed, node)
    }

    // Assign node IDs
    this.assignNodeIds(roots)

    return roots
  }

  private isDataDefinition(line: string): boolean {
    // Pattern: name: value (but not Primitive: ...)
    // Data defs start with lowercase or are pure value assignments
    if (line.match(/^[a-z_]\w*:\s*$/)) return true // Empty block start
    if (line.match(/^[a-z_]\w*:\s*\S+/)) return true // name: value
    if (line.match(/^\w+:\s*$/)) {
      // Could be component def or data block - check if starts with uppercase
      const name = line.split(':')[0].trim()
      if (name[0] === name[0].toLowerCase()) return true
    }
    return false
  }

  private isTokenDefinition(line: string): boolean {
    // Pattern: name.suffix: value
    return /^\w+\.\w+:\s*.+$/.test(line)
  }

  private parseLine(line: string, lineNum: number, indent: number): ParsedNode | null {
    // Check for component definition (Name: props)
    const compDefMatch = line.match(/^([A-Z]\w*)\s*:\s*(.*)$/)
    if (compDefMatch) {
      const [, name, rest] = compDefMatch
      const { text, properties } = this.parseProperties(rest)
      return {
        id: '',
        line: lineNum,
        indent,
        primitive: name,
        text,
        properties,
        children: [],
        parent: null,
        isComponent: true,
        isComponentUsage: false,
      }
    }

    // Check for inheritance (PrimaryBtn as Button: props)
    const inheritMatch = line.match(/^([A-Z]\w*)\s+as\s+([A-Z]\w*)\s*:\s*(.*)$/)
    if (inheritMatch) {
      const [, name, base, rest] = inheritMatch
      const { text, properties } = this.parseProperties(rest)
      // Inherit from base primitive
      const tag = PRIMITIVE_TAGS[base] || 'div'
      return {
        id: '',
        line: lineNum,
        indent,
        primitive: name,
        text,
        properties,
        children: [],
        parent: null,
        isComponent: true,
        isComponentUsage: false,
      }
    }

    // Regular element: Primitive "text", props
    const elemMatch = line.match(/^([A-Z]\w*)(.*)$/)
    if (!elemMatch) return null

    const [, primitive, rest] = elemMatch

    // Check if this is using a component
    const isComponentUsage = !PRIMITIVE_TAGS[primitive] && !line.includes(':')

    const { text, properties } = this.parseProperties(rest)

    return {
      id: '',
      line: lineNum,
      indent,
      primitive,
      text,
      properties,
      children: [],
      parent: null,
      isComponent: false,
      isComponentUsage,
    }
  }

  private parseProperties(str: string): {
    text: string | null
    properties: Map<string, string | number | boolean>
  } {
    const properties = new Map<string, string | number | boolean>()
    let text: string | null = null

    // Remove inline children (after ;)
    const mainPart = str.split(';')[0].trim()

    // Extract quoted text
    const textMatch = mainPart.match(/"([^"]*)"/)
    if (textMatch) {
      text = textMatch[1]
    }

    // Remove text and split by comma
    const withoutText = mainPart.replace(/"[^"]*"/g, '').trim()
    const parts = withoutText
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)

    for (const part of parts) {
      const tokens = part.split(/\s+/)
      if (tokens.length === 0) continue

      const propName = tokens[0]

      // Standalone boolean properties
      if (tokens.length === 1) {
        if (
          [
            'hor',
            'ver',
            'horizontal',
            'vertical',
            'center',
            'spread',
            'wrap',
            'grow',
            'shrink',
            'hidden',
            'visible',
            'clip',
            'scroll',
            'italic',
            'underline',
            'uppercase',
            'lowercase',
            'truncate',
            'fill',
            'stacked',
            'checked',
            'disabled',
          ].includes(propName)
        ) {
          properties.set(propName, true)
        }
        continue
      }

      // Property with value(s)
      const value = tokens.slice(1).join(' ')

      // Parse numeric values
      if (/^\d+(\.\d+)?$/.test(value)) {
        properties.set(propName, parseFloat(value))
      } else {
        properties.set(propName, value)
      }
    }

    return { text, properties }
  }

  private parseInlineChildren(line: string, parent: ParsedNode): void {
    const parts = line.split(';')
    if (parts.length <= 1) return

    // First part is already parsed as parent, rest are children
    for (let i = 1; i < parts.length; i++) {
      const childLine = parts[i].trim()
      if (!childLine) continue

      const node = this.parseLine(childLine, parent.line, parent.indent + 2)
      if (node) {
        node.parent = parent
        parent.children.push(node)
      }
    }
  }

  private assignNodeIds(nodes: ParsedNode[], prefix = ''): void {
    for (const node of nodes) {
      this.nodeCounter++
      node.id = `node-${this.nodeCounter}`
      this.assignNodeIds(node.children, node.id)
    }
  }
}

// =============================================================================
// Expectation Generator
// =============================================================================

function generateExpectations(code: string): CodeExpectation {
  const parser = new MirrorParser(code)
  const roots = parser.parse()

  const nodes: NodeExpectation[] = []
  const hierarchy: Record<string, string[]> = {}

  function processNode(node: ParsedNode): void {
    const tag = PRIMITIVE_TAGS[node.primitive] || 'div'
    const styles = computeStyles(node)

    const expectation: NodeExpectation = {
      nodeId: node.id,
      tag,
      text: node.text,
      styles,
      childCount: node.children.length,
      childIds: node.children.map(c => c.id),
      parentId: node.parent?.id || null,
      attributes: computeAttributes(node),
    }

    nodes.push(expectation)
    hierarchy[node.id] = node.children.map(c => c.id)

    for (const child of node.children) {
      processNode(child)
    }
  }

  for (const root of roots) {
    processNode(root)
  }

  return {
    totalNodes: nodes.length,
    nodes,
    hierarchy,
  }
}

function computeStyles(node: ParsedNode): ExpectedStyles {
  const styles: ExpectedStyles = {}

  // Default styles for Frame/Box
  if (node.primitive === 'Frame' || node.primitive === 'Box') {
    styles['display'] = 'flex'
    styles['flexDirection'] = 'column' // Default
  }

  for (const [prop, value] of node.properties) {
    const mapping = PROPERTY_CSS[prop]
    if (mapping) {
      const cssValue = mapping.transform
        ? mapping.transform(value as string | number)
        : String(value)
      styles[mapping.property] = cssValue
    }

    // Handle multi-value padding
    if (prop === 'pad' || prop === 'padding' || prop === 'p') {
      const padValues = String(value)
        .split(' ')
        .map(v => parseInt(v))
      if (padValues.length === 1) {
        styles['padding'] = `${padValues[0]}px`
      } else if (padValues.length === 2) {
        styles['paddingTop'] = `${padValues[0]}px`
        styles['paddingBottom'] = `${padValues[0]}px`
        styles['paddingLeft'] = `${padValues[1]}px`
        styles['paddingRight'] = `${padValues[1]}px`
      } else if (padValues.length === 4) {
        styles['paddingTop'] = `${padValues[0]}px`
        styles['paddingRight'] = `${padValues[1]}px`
        styles['paddingBottom'] = `${padValues[2]}px`
        styles['paddingLeft'] = `${padValues[3]}px`
      }
    }

    // Handle multi-value margin
    if (prop === 'mar' || prop === 'margin' || prop === 'm') {
      const marValues = String(value)
        .split(' ')
        .map(v => parseInt(v))
      if (marValues.length === 1) {
        styles['margin'] = `${marValues[0]}px`
      } else if (marValues.length === 2) {
        styles['marginTop'] = `${marValues[0]}px`
        styles['marginBottom'] = `${marValues[0]}px`
        styles['marginLeft'] = `${marValues[1]}px`
        styles['marginRight'] = `${marValues[1]}px`
      }
    }

    // Handle weight
    if (prop === 'weight') {
      const weights: Record<string, string> = {
        thin: '100',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900',
      }
      styles['fontWeight'] = weights[String(value)] || String(value)
    }
  }

  return styles
}

function computeAttributes(node: ParsedNode): Record<string, string> {
  const attrs: Record<string, string> = {}

  if (node.properties.has('placeholder')) {
    attrs['placeholder'] = String(node.properties.get('placeholder'))
  }
  if (node.properties.has('href')) {
    attrs['href'] = String(node.properties.get('href'))
  }
  if (node.properties.has('src')) {
    attrs['src'] = String(node.properties.get('src'))
  }

  return attrs
}

// =============================================================================
// Test Code Generator
// =============================================================================

function generateTestCode(example: any, expectation: CodeExpectation): string {
  const { id, section, code } = example
  const testName = `[${example.chapter}] ${section}: Example ${example.index}`

  const assertions: string[] = []

  // 1. Verify total node count
  assertions.push(`    // Verify compilation: ${expectation.totalNodes} elements expected`)
  assertions.push(`    const nodeIds = api.preview.getNodeIds()`)
  assertions.push(
    `    api.assert.ok(nodeIds.length === ${expectation.totalNodes}, \`Expected ${expectation.totalNodes} nodes, got \${nodeIds.length}\`)`
  )
  assertions.push(``)

  // 2. Verify each node
  for (const node of expectation.nodes) {
    assertions.push(`    // === ${node.nodeId} ===`)
    assertions.push(
      `    const ${node.nodeId.replace('-', '_')} = api.preview.inspect('${node.nodeId}')`
    )
    assertions.push(
      `    api.assert.ok(${node.nodeId.replace('-', '_')} !== null, '${node.nodeId} should exist')`
    )

    // Tag
    assertions.push(
      `    api.assert.ok(${node.nodeId.replace('-', '_')}?.tagName === '${node.tag}', \`${node.nodeId} should be <${node.tag}>, got \${${node.nodeId.replace('-', '_')}?.tagName}\`)`
    )

    // Text
    if (node.text) {
      const escapedText = node.text.replace(/'/g, "\\'")
      assertions.push(`    api.assert.hasText('${node.nodeId}', '${escapedText}')`)
    }

    // Styles
    for (const [cssProp, cssValue] of Object.entries(node.styles)) {
      assertions.push(`    api.assert.hasStyle('${node.nodeId}', '${cssProp}', '${cssValue}')`)
    }

    // Children count
    if (node.childCount > 0) {
      assertions.push(`    api.assert.hasChildren('${node.nodeId}', ${node.childCount})`)
    }

    // Attributes
    for (const [attr, value] of Object.entries(node.attributes)) {
      const escapedValue = value.replace(/'/g, "\\'")
      assertions.push(`    api.assert.hasAttribute('${node.nodeId}', '${attr}', '${escapedValue}')`)
    }

    assertions.push(``)
  }

  // 3. Verify hierarchy
  if (Object.keys(expectation.hierarchy).length > 0) {
    assertions.push(`    // === Hierarchy Verification ===`)
    for (const [parentId, childIds] of Object.entries(expectation.hierarchy)) {
      if (childIds.length > 0) {
        assertions.push(`    // ${parentId} has children: ${childIds.join(', ')}`)
      }
    }
  }

  return assertions.join('\n')
}

// =============================================================================
// Main
// =============================================================================

function main() {
  // Test with a simple example
  const testCode = `Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6`

  console.log('📋 Parsing:', testCode)
  console.log('')

  const expectation = generateExpectations(testCode)
  console.log('📊 Expectations:')
  console.log(JSON.stringify(expectation, null, 2))
  console.log('')

  // More complex example
  const complexCode = `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Eine Überschrift", col white, fs 18
  Text "Normaler Text darunter", col #888
  Button "Klick mich", bg #2271C1, col white, pad 10 20, rad 6`

  console.log('📋 Parsing:', complexCode)
  console.log('')

  const complexExpectation = generateExpectations(complexCode)
  console.log('📊 Complex Expectations:')
  console.log(JSON.stringify(complexExpectation, null, 2))
  console.log('')

  // Generate test code
  const testCodeOutput = generateTestCode(
    { id: 'test', chapter: '01-elemente', section: 'Test', index: 1, code: complexCode },
    complexExpectation
  )
  console.log('🧪 Generated Test Assertions:')
  console.log(testCodeOutput)
}

main()
