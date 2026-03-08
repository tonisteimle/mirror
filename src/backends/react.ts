/**
 * Mirror React Backend
 *
 * Generates clean React/JSX code from Mirror AST.
 * Used for:
 * 1. Exporting Mirror designs to React projects
 * 2. Providing LLM context for consistent code generation
 */

import type {
  AST,
  Program,
  Instance,
  ComponentDefinition,
  Property,
  TokenDefinition
} from '../parser/ast'

export interface ReactExportOptions {
  /** Include token values as CSS variables */
  includeTokens?: boolean
  /** Generate separate components or inline everything */
  separateComponents?: boolean
}

/**
 * Generate React component code from Mirror AST
 */
export function generateReact(
  ast: AST,
  options: ReactExportOptions = {}
): string {
  const program = ast as Program
  const lines: string[] = []
  const { includeTokens = true } = options

  // Header
  lines.push(`import React from 'react'`)
  lines.push(``)

  // Generate CSS variables from tokens
  if (includeTokens && program.tokens && program.tokens.length > 0) {
    lines.push(`// Design Tokens`)
    lines.push(`const tokens = {`)
    for (const token of program.tokens) {
      const value = typeof token.value === 'string' ? `'${token.value}'` : token.value
      lines.push(`  '${token.name}': ${value},`)
    }
    lines.push(`}`)
    lines.push(``)
  }

  // Build component lookup for resolving properties
  const componentMap = new Map<string, ComponentDefinition>()
  if (program.components) {
    for (const comp of program.components) {
      componentMap.set(comp.name, comp)
    }
  }

  // Generate main App component
  lines.push(`export default function App() {`)
  lines.push(`  return (`)

  // Generate JSX for each root instance
  if (program.instances && program.instances.length > 0) {
    for (const instance of program.instances) {
      const jsx = generateJSX(instance, componentMap, program.tokens || [], '    ')
      lines.push(jsx)
    }
  } else {
    lines.push(`    <div />`)
  }

  lines.push(`  )`)
  lines.push(`}`)
  lines.push(``)

  return lines.join('\n')
}

function generateJSX(
  instance: Instance,
  components: Map<string, ComponentDefinition>,
  tokens: TokenDefinition[],
  indent: string
): string {
  // Resolve component definition
  const compDef = components.get(instance.component)

  // Merge properties: component defaults + instance overrides
  const allProps = [...(compDef?.properties || []), ...instance.properties]

  // Generate style object
  const style = generateStyles(allProps, tokens)
  const styleStr = Object.keys(style).length > 0
    ? ` style={${formatStyleObject(style)}}`
    : ''

  // Determine HTML tag based on component type
  const tag = getHtmlTag(instance.component, compDef)

  // Get text content
  const textContent = getTextContent(instance, allProps)

  // Has children?
  const hasChildren = instance.children.length > 0 || textContent

  if (!hasChildren) {
    return `${indent}<${tag}${styleStr} />`
  }

  const lines: string[] = []
  lines.push(`${indent}<${tag}${styleStr}>`)

  // Add text content
  if (textContent) {
    // Use curly braces for JSX text to avoid escaping issues
    lines.push(`${indent}  {${JSON.stringify(textContent)}}`)
  }

  // Add children
  for (const child of instance.children) {
    if (child.type === 'Instance') {
      lines.push(generateJSX(child, components, tokens, indent + '  '))
    } else if (child.type === 'Text') {
      lines.push(`${indent}  {${JSON.stringify(child.content)}}`)
    }
  }

  lines.push(`${indent}</${tag}>`)

  return lines.join('\n')
}

function getHtmlTag(componentName: string, compDef?: ComponentDefinition): string {
  // Check primitive type
  const primitive = compDef?.primitive?.toLowerCase()

  if (primitive === 'button') return 'button'
  if (primitive === 'input') return 'input'
  if (primitive === 'textarea') return 'textarea'
  if (primitive === 'image') return 'img'
  if (primitive === 'link') return 'a'
  if (primitive === 'text') return 'span'

  // Default based on common names
  const name = componentName.toLowerCase()
  if (name.includes('button') || name === 'btn') return 'button'
  if (name.includes('input') || name.includes('field')) return 'input'
  if (name.includes('link')) return 'a'
  if (name.includes('heading') || name.includes('title')) return 'h2'
  if (name.includes('text') || name.includes('label') || name.includes('body')) return 'span'
  if (name.includes('nav')) return 'nav'
  if (name.includes('header')) return 'header'
  if (name.includes('footer')) return 'footer'
  if (name.includes('main')) return 'main'
  if (name.includes('section')) return 'section'
  if (name.includes('aside') || name.includes('sidebar')) return 'aside'

  return 'div'
}

function getTextContent(instance: Instance, properties: Property[]): string | null {
  // Check for content property
  for (const prop of properties) {
    if (prop.name === 'content' && prop.values.length > 0) {
      const val = prop.values[0]
      if (typeof val === 'string') return val
    }
  }

  // Check for text child
  for (const child of instance.children) {
    if (child.type === 'Text') {
      return child.content
    }
  }

  return null
}

function generateStyles(
  properties: Property[],
  tokens: TokenDefinition[]
): Record<string, string | number> {
  const style: Record<string, string | number> = {}
  const tokenMap = new Map<string, string | number>()

  for (const token of tokens) {
    // Store with both formats for flexible lookup
    const nameWithoutPrefix = token.name.startsWith('$') ? token.name.slice(1) : token.name
    const nameWithPrefix = '$' + nameWithoutPrefix

    // Resolve nested token references in the value
    let resolvedValue = token.value
    if (typeof resolvedValue === 'string' && resolvedValue.startsWith('$')) {
      const refName = resolvedValue.slice(1)
      const found = tokens.find(t => {
        const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
        return n === refName
      })
      if (found) resolvedValue = found.value
    }

    tokenMap.set(nameWithoutPrefix, resolvedValue)
    tokenMap.set(nameWithPrefix, resolvedValue)
  }

  // Helper to resolve token references
  const resolve = (value: string | number | boolean | object): string | number => {
    // Handle TokenReference objects
    if (typeof value === 'object' && value !== null && 'name' in value) {
      const tokenName = (value as { name: string }).name
      const cleanName = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
      return tokenMap.get(cleanName) ?? tokenMap.get('$' + cleanName) ?? `$${cleanName}`
    }
    // Handle string token references
    if (typeof value === 'string' && value.startsWith('$')) {
      const cleanName = value.slice(1)
      return tokenMap.get(cleanName) ?? tokenMap.get(value) ?? value
    }
    if (typeof value === 'boolean') return value ? 1 : 0
    return value as string | number
  }

  for (const prop of properties) {
    // Handle flag properties (no values) first
    if (prop.values.length === 0) {
      switch (prop.name) {
        case 'hor':
        case 'horizontal':
          style.display = 'flex'
          style.flexDirection = 'row'
          break
        case 'ver':
        case 'vertical':
          style.display = 'flex'
          style.flexDirection = 'column'
          break
        case 'center':
        case 'cen':
          style.display = 'flex'
          style.justifyContent = 'center'
          style.alignItems = 'center'
          break
        case 'spread':
          style.justifyContent = 'space-between'
          break
        case 'wrap':
          style.flexWrap = 'wrap'
          break
        case 'scroll':
          style.overflowY = 'auto'
          break
        case 'hidden':
          style.display = 'none'
          break
      }
      continue
    }

    const rawValue = prop.values[0]
    const value = resolve(rawValue)

    switch (prop.name) {
      // Layout (with values - less common)
      case 'hor':
      case 'horizontal':
        style.display = 'flex'
        style.flexDirection = 'row'
        break
      case 'ver':
      case 'vertical':
        style.display = 'flex'
        style.flexDirection = 'column'
        break
      case 'wrap':
        style.flexWrap = 'wrap'
        break
      case 'spread':
        style.justifyContent = 'space-between'
        break
      case 'center':
      case 'cen':
        style.display = 'flex'
        style.justifyContent = 'center'
        style.alignItems = 'center'
        break

      // Alignment
      case 'left':
        style.justifyContent = 'flex-start'
        break
      case 'right':
        style.justifyContent = 'flex-end'
        break
      case 'top':
        style.alignItems = 'flex-start'
        break
      case 'bottom':
        style.alignItems = 'flex-end'
        break

      // Spacing
      case 'gap':
      case 'g':
        style.gap = typeof value === 'number' ? `${value}px` : value
        break
      case 'pad':
      case 'padding':
      case 'p':
        style.padding = typeof value === 'number' ? `${value}px` : value
        break
      case 'margin':
      case 'm':
        style.margin = typeof value === 'number' ? `${value}px` : value
        break

      // Size
      case 'w':
      case 'width':
        if (value === 'full') {
          style.width = '100%'
        } else if (value === 'hug') {
          style.width = 'fit-content'
        } else {
          style.width = typeof value === 'number' ? `${value}px` : value
        }
        break
      case 'h':
      case 'height':
        if (value === 'full') {
          style.height = '100%'
        } else if (value === 'hug') {
          style.height = 'fit-content'
        } else {
          style.height = typeof value === 'number' ? `${value}px` : value
        }
        break
      case 'minw':
      case 'min-width':
        style.minWidth = typeof value === 'number' ? `${value}px` : value
        break
      case 'maxw':
      case 'max-width':
        style.maxWidth = typeof value === 'number' ? `${value}px` : value
        break
      case 'minh':
      case 'min-height':
        style.minHeight = typeof value === 'number' ? `${value}px` : value
        break
      case 'maxh':
      case 'max-height':
        style.maxHeight = typeof value === 'number' ? `${value}px` : value
        break

      // Colors
      case 'col':
      case 'color':
      case 'c':
        style.color = String(value)
        break
      case 'bg':
      case 'background':
        style.backgroundColor = String(value)
        break

      // Border
      case 'bor':
      case 'border':
        style.border = typeof value === 'number' ? `${value}px solid` : String(value)
        break
      case 'boc':
      case 'border-color':
        style.borderColor = String(value)
        break
      case 'rad':
      case 'radius':
        style.borderRadius = typeof value === 'number' ? `${value}px` : value
        break

      // Typography
      case 'font-size':
      case 'fs':
        style.fontSize = typeof value === 'number' ? `${value}px` : value
        break
      case 'weight':
        style.fontWeight = value
        break
      case 'font':
        style.fontFamily = String(value)
        break
      case 'line':
      case 'line-height':
        style.lineHeight = value
        break

      // Visual
      case 'opacity':
      case 'o':
        style.opacity = value
        break
      case 'cursor':
        style.cursor = String(value)
        break
      case 'overflow':
        style.overflow = String(value)
        break
      case 'scroll':
        style.overflowY = 'auto'
        break
      case 'hidden':
        style.display = 'none'
        break
    }
  }

  return style
}

function formatStyleObject(style: Record<string, string | number>): string {
  const entries = Object.entries(style)
  if (entries.length === 0) return '{}'

  const parts = entries.map(([key, value]) => {
    const formattedValue = typeof value === 'string' ? `'${value}'` : value
    return `${key}: ${formattedValue}`
  })

  return `{ ${parts.join(', ')} }`
}
