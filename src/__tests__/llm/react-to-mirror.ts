/**
 * React to Mirror Converter
 *
 * Converts React/JSX code to Mirror DSL
 * This is a simplified converter for LLM testing purposes
 */

import type { ConversionResult } from './types'

interface StyleMap {
  [key: string]: string | number
}

interface ParsedElement {
  tag: string
  component?: string
  props: Record<string, unknown>
  style?: StyleMap
  children: (ParsedElement | string)[]
}

// CSS property to Mirror property mapping
const STYLE_TO_MIRROR: Record<string, string> = {
  'padding': 'pad',
  'paddingTop': 'pad top',
  'paddingBottom': 'pad bottom',
  'paddingLeft': 'pad left',
  'paddingRight': 'pad right',
  'margin': 'm',
  'backgroundColor': 'bg',
  'background': 'bg',
  'color': 'col',
  'borderRadius': 'rad',
  'width': 'w',
  'height': 'h',
  'minWidth': 'minw',
  'maxWidth': 'maxw',
  'minHeight': 'minh',
  'maxHeight': 'maxh',
  'gap': 'gap',
  'fontSize': 'font-size',
  'fontWeight': 'weight',
  'fontFamily': 'font',
  'textAlign': 'text-align',
  'display': '_display',
  'flexDirection': '_flexDirection',
  'alignItems': '_alignItems',
  'justifyContent': '_justifyContent',
  'cursor': 'cursor',
  'opacity': 'opacity',
  'border': 'bor',
  'borderColor': 'boc',
  'boxShadow': 'shadow',
}

// Tag to Mirror component mapping
const TAG_TO_COMPONENT: Record<string, string> = {
  'div': 'frame',
  'span': 'text',
  'button': 'button',
  'input': 'input',
  'textarea': 'textarea',
  'img': 'image',
  'a': 'link',
  'nav': 'frame',
  'header': 'frame',
  'footer': 'frame',
  'main': 'frame',
  'section': 'frame',
  'article': 'frame',
  'aside': 'frame',
  'h1': 'text',
  'h2': 'text',
  'h3': 'text',
  'h4': 'text',
  'p': 'text',
  'label': 'text',
  'select': 'frame', // Simplified
}

// Normalize only HTML semantic tags to component-style names
// We preserve semantic names like TaskList, UserCard - they're better than generic names
const HTML_TAG_NORMALIZATION: Record<string, string> = {
  'Aside': 'Sidebar',
  'Ul': 'List',
  'Ol': 'List',
  'Li': 'ListItem',
  'Article': 'Card',
  'Section': 'Section',
  'Main': 'Main',
  'Figure': 'Figure',
  'Figcaption': 'Caption',
  'Nav': 'Nav',
}

function normalizeName(name: string): string {
  // Only normalize HTML tag names, preserve semantic component names
  return HTML_TAG_NORMALIZATION[name] || name
}

export class ReactToMirrorConverter {
  private indentLevel = 0
  private componentDefinitions: Map<string, string> = new Map()
  private usedComponents: Set<string> = new Set()

  /**
   * Convert React code to Mirror DSL
   */
  convert(reactCode: string): ConversionResult {
    try {
      // Reset state for each conversion
      this.componentDefinitions.clear()
      this.usedComponents.clear()
      this.indentLevel = 0

      // Parse the React code (simplified parser)
      const elements = this.parseReact(reactCode)

      // Generate Mirror code
      const mirror = this.generateMirror(elements)

      return {
        mirror,
        errors: [],
      }
    } catch (error) {
      return {
        mirror: '',
        errors: [(error as Error).message],
      }
    }
  }

  /**
   * Parse React code into element tree (simplified)
   */
  private parseReact(code: string): ParsedElement[] {
    const elements: ParsedElement[] = []

    // Extract JSX from return statement using balanced parentheses
    const jsx = this.extractReturnJSX(code)

    // Parse JSX elements
    const rootElement = this.parseJSXElement(jsx.trim())
    if (rootElement) {
      elements.push(rootElement)
    }

    return elements
  }

  /**
   * Extract JSX from return statement by finding balanced parentheses
   */
  private extractReturnJSX(code: string): string {
    const returnIndex = code.indexOf('return')
    if (returnIndex === -1) return code

    // Find the opening parenthesis after return
    let pos = returnIndex + 6 // 'return'.length
    while (pos < code.length && code[pos] !== '(' && code[pos] !== '<') {
      pos++
    }

    // If no parenthesis, look for direct JSX
    if (code[pos] === '<') {
      // Return is directly followed by JSX, find the end
      const jsxStart = pos
      const tag = code.slice(pos).match(/^<(\w+)/)?.[1]
      if (tag) {
        const closeTag = `</${tag}>`
        const closeIndex = code.lastIndexOf(closeTag)
        if (closeIndex > jsxStart) {
          return code.slice(jsxStart, closeIndex + closeTag.length).trim()
        }
      }
      return code.slice(pos).trim()
    }

    if (code[pos] !== '(') return code

    // Find matching closing parenthesis
    const openParen = pos
    let depth = 1
    pos++

    while (pos < code.length && depth > 0) {
      const char = code[pos]

      // Skip strings
      if (char === '"' || char === "'" || char === '`') {
        const quote = char
        pos++
        while (pos < code.length && code[pos] !== quote) {
          if (code[pos] === '\\') pos++
          pos++
        }
      } else if (char === '(') {
        depth++
      } else if (char === ')') {
        depth--
      }
      pos++
    }

    // Extract content between parentheses (excluding them)
    return code.slice(openParen + 1, pos - 1).trim()
  }

  /**
   * Parse a single JSX element
   */
  private parseJSXElement(jsx: string): ParsedElement | null {
    if (!jsx || jsx.trim() === '') return null

    // Check for text content
    if (!jsx.startsWith('<')) {
      return null // Plain text will be handled by parent
    }

    // Parse opening tag
    const openTagMatch = jsx.match(/^<(\w+)([^>]*?)(?:\/>|>)/)
    if (!openTagMatch) return null

    const tag = openTagMatch[1]
    const propsStr = openTagMatch[2]
    const isSelfClosing = jsx.includes('/>')

    // Parse props
    const props = this.parseProps(propsStr)
    const style = props.style as StyleMap | undefined
    delete props.style

    const element: ParsedElement = {
      tag: tag.toLowerCase(),
      component: this.isComponent(tag) ? tag : undefined,
      props,
      style,
      children: [],
    }

    // Parse children if not self-closing
    if (!isSelfClosing) {
      const childrenMatch = jsx.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*)<\\/${tag}>`, 'i'))
      if (childrenMatch) {
        element.children = this.parseChildren(childrenMatch[1])
      }
    }

    return element
  }

  /**
   * Parse props string into object
   */
  private parseProps(propsStr: string): Record<string, unknown> {
    const props: Record<string, unknown> = {}

    // Match style={{ ... }}
    const styleMatch = propsStr.match(/style=\{\{([^}]+)\}\}/)
    if (styleMatch) {
      props.style = this.parseStyleObject(styleMatch[1])
    }

    // Match string props
    const stringProps = propsStr.matchAll(/(\w+)="([^"]*)"/g)
    for (const match of stringProps) {
      props[match[1]] = match[2]
    }

    // Match boolean props
    const boolProps = propsStr.matchAll(/\s(\w+)(?=\s|$|>)/g)
    for (const match of boolProps) {
      if (!match[1].includes('=')) {
        props[match[1]] = true
      }
    }

    return props
  }

  /**
   * Parse inline style object
   */
  private parseStyleObject(styleStr: string): StyleMap {
    const style: StyleMap = {}

    // Handle various style formats
    const pairs = styleStr.split(',').map(s => s.trim()).filter(Boolean)

    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':')
      if (colonIndex === -1) continue

      let key = pair.slice(0, colonIndex).trim().replace(/['"]/g, '')
      let value = pair.slice(colonIndex + 1).trim().replace(/['"]/g, '')

      // Remove trailing comma
      value = value.replace(/,\s*$/, '')

      // Handle quoted values
      if (value.startsWith("'") || value.startsWith('"')) {
        value = value.slice(1, -1)
      }

      style[key] = value
    }

    return style
  }

  /**
   * Parse children content using stack-based approach for proper nesting
   */
  private parseChildren(content: string): (ParsedElement | string)[] {
    const children: (ParsedElement | string)[] = []
    const trimmed = content.trim()

    if (!trimmed) return children

    // Simple text content
    if (!trimmed.includes('<')) {
      // Handle JSX expressions
      const textMatch = trimmed.match(/\{([^}]+)\}|([^{]+)/g)
      if (textMatch) {
        for (const match of textMatch) {
          if (match.startsWith('{')) {
            // Expression - use as placeholder
            children.push(`{${match.slice(1, -1).trim()}}`)
          } else if (match.trim()) {
            children.push(match.trim())
          }
        }
      }
      return children
    }

    // Stack-based parsing for proper nesting
    let pos = 0
    let textStart = 0

    while (pos < trimmed.length) {
      // Skip over {expression} blocks - they may contain JSX we can't parse
      if (trimmed[pos] === '{') {
        const exprEnd = this.findMatchingBrace(trimmed, pos)
        if (exprEnd > pos) {
          pos = exprEnd + 1
          textStart = pos
          continue
        }
      }

      // Look for opening tag
      const openTagStart = trimmed.indexOf('<', pos)

      if (openTagStart === -1) {
        // No more tags, rest is text
        const text = trimmed.slice(textStart).trim()
        if (text && !text.startsWith('{') && !text.startsWith('</')) {
          children.push(text)
        }
        break
      }

      // Check if tag is inside a {expression} - skip to end of expression
      const braceBeforeTag = trimmed.lastIndexOf('{', openTagStart)
      if (braceBeforeTag >= textStart) {
        const braceEnd = this.findMatchingBrace(trimmed, braceBeforeTag)
        if (braceEnd > openTagStart) {
          // Tag is inside expression, skip entire expression
          pos = braceEnd + 1
          textStart = pos
          continue
        }
      }

      // Check if it's a closing tag - skip it
      if (trimmed[openTagStart + 1] === '/') {
        pos = trimmed.indexOf('>', openTagStart) + 1
        textStart = pos
        continue
      }

      // Capture text before this element
      if (openTagStart > textStart) {
        const text = trimmed.slice(textStart, openTagStart).trim()
        if (text && !text.startsWith('{') && !text.startsWith('</')) {
          children.push(text)
        }
      }

      // Parse the opening tag to get tag name
      const tagNameMatch = trimmed.slice(openTagStart).match(/^<(\w+)/)
      if (!tagNameMatch) {
        pos = openTagStart + 1
        continue
      }

      const tagName = tagNameMatch[1]

      // Check for self-closing tag
      const selfCloseMatch = trimmed.slice(openTagStart).match(new RegExp(`^<${tagName}[^>]*/>`))
      if (selfCloseMatch) {
        const element = this.parseJSXElement(selfCloseMatch[0])
        if (element) {
          children.push(element)
        }
        pos = openTagStart + selfCloseMatch[0].length
        textStart = pos
        continue
      }

      // Find matching closing tag using stack
      const closeTag = `</${tagName}>`
      const openTag = new RegExp(`<${tagName}(?:\\s|>|/>)`)
      let depth = 1
      let searchPos = openTagStart + 1

      while (depth > 0 && searchPos < trimmed.length) {
        // Skip over {expression} blocks while searching
        if (trimmed[searchPos] === '{') {
          const exprEnd = this.findMatchingBrace(trimmed, searchPos)
          if (exprEnd > searchPos) {
            searchPos = exprEnd + 1
            continue
          }
        }

        const nextOpen = trimmed.slice(searchPos).search(openTag)
        const nextClose = trimmed.indexOf(closeTag, searchPos)

        if (nextClose === -1) {
          // No closing tag found, bail
          depth = 0
          searchPos = trimmed.length
          break
        }

        if (nextOpen !== -1 && searchPos + nextOpen < nextClose) {
          // Found another opening tag before close
          // Check if it's self-closing
          const checkPos = searchPos + nextOpen
          const selfCheck = trimmed.slice(checkPos).match(new RegExp(`^<${tagName}[^>]*/>`))
          if (!selfCheck) {
            depth++
          }
          searchPos = checkPos + 1
        } else {
          // Found closing tag
          depth--
          if (depth === 0) {
            // Extract the full element
            const fullElement = trimmed.slice(openTagStart, nextClose + closeTag.length)
            const element = this.parseJSXElement(fullElement)
            if (element) {
              children.push(element)
            }
            pos = nextClose + closeTag.length
            textStart = pos
          } else {
            searchPos = nextClose + closeTag.length
          }
        }
      }

      if (depth !== 0) {
        // Couldn't find proper nesting, move on
        pos = openTagStart + 1
      }
    }

    return children
  }

  /**
   * Find the matching closing brace for an opening brace
   */
  private findMatchingBrace(str: string, openPos: number): number {
    if (str[openPos] !== '{') return -1

    let depth = 1
    let pos = openPos + 1

    while (pos < str.length && depth > 0) {
      const char = str[pos]
      if (char === '{') {
        depth++
      } else if (char === '}') {
        depth--
      }
      // Skip string contents
      if (char === '"' || char === "'" || char === '`') {
        const quote = char
        pos++
        while (pos < str.length && str[pos] !== quote) {
          if (str[pos] === '\\') pos++ // Skip escaped char
          pos++
        }
      }
      pos++
    }

    return depth === 0 ? pos - 1 : -1
  }

  /**
   * Check if a tag is a custom component
   */
  private isComponent(tag: string): boolean {
    return tag[0] === tag[0].toUpperCase()
  }

  /**
   * Generate Mirror code from parsed elements
   */
  private generateMirror(elements: ParsedElement[]): string {
    const lines: string[] = []

    // Generate component definitions first
    for (const element of elements) {
      this.collectComponentDefinitions(element)
    }

    // Output definitions
    for (const [name, def] of this.componentDefinitions) {
      lines.push(def)
      lines.push('')
    }

    // Generate instances
    for (const element of elements) {
      const instance = this.generateElement(element, 0)
      lines.push(instance)
    }

    return lines.join('\n').trim()
  }

  /**
   * Collect component definitions from element tree
   */
  private collectComponentDefinitions(element: ParsedElement): void {
    const name = normalizeName(element.component || this.tagToComponentName(element.tag))

    if (!this.componentDefinitions.has(name) && element.style) {
      const baseTag = TAG_TO_COMPONENT[element.tag] || 'frame'
      const props = this.styleToMirrorProps(element.style)

      if (props.length > 0) {
        this.componentDefinitions.set(name, `${name} as ${baseTag}:\n  ${props.join(', ')}`)
      }
    }

    // Recurse into children
    for (const child of element.children) {
      if (typeof child !== 'string') {
        this.collectComponentDefinitions(child)
      }
    }
  }

  /**
   * Generate Mirror code for a single element
   */
  private generateElement(element: ParsedElement, depth: number): string {
    const indent = '  '.repeat(depth)
    const name = normalizeName(element.component || this.tagToComponentName(element.tag))
    const parts: string[] = []

    // Component name
    parts.push(name)

    // Inline props - always include for nested elements with styles
    if (element.style) {
      const props = this.styleToMirrorProps(element.style)
      // Only add inline props if this element is nested (depth > 0) or has no definition
      if (depth > 0 || !this.componentDefinitions.has(name)) {
        if (props.length > 0) {
          parts.push(props.join(', '))
        }
      }
    }

    // Text content
    const textChildren = element.children.filter(c => typeof c === 'string')
    if (textChildren.length > 0) {
      const text = textChildren.join(' ').trim()
      if (text && !text.startsWith('{')) {
        parts.push(`"${text}"`)
      }
    }

    let line = indent + parts.join(' ')

    // Element children
    const elementChildren = element.children.filter(c => typeof c !== 'string') as ParsedElement[]
    if (elementChildren.length > 0) {
      const childLines = elementChildren.map(child =>
        this.generateElement(child, depth + 1)
      )
      line += '\n' + childLines.join('\n')
    }

    return line
  }

  /**
   * Convert tag to Mirror component name
   */
  private tagToComponentName(tag: string): string {
    const mapping: Record<string, string> = {
      'div': 'Box',
      'span': 'Text',
      'button': 'Button',
      'input': 'Input',
      'nav': 'Nav',
      'header': 'Header',
      'footer': 'Footer',
      'main': 'Main',
      'section': 'Section',
      'h1': 'Heading',
      'h2': 'Heading',
      'h3': 'Heading',
      'p': 'Text',
      'a': 'Link',
    }
    return mapping[tag] || tag.charAt(0).toUpperCase() + tag.slice(1)
  }

  /**
   * Convert style object to Mirror properties
   */
  private styleToMirrorProps(style: StyleMap): string[] {
    const props: string[] = []
    let layout = 'ver' // Default vertical

    for (const [key, value] of Object.entries(style)) {
      const mirrorKey = STYLE_TO_MIRROR[key]

      if (!mirrorKey) continue

      // Handle layout properties
      if (mirrorKey === '_display' && value === 'flex') {
        continue // Implied by frame
      }
      if (mirrorKey === '_flexDirection') {
        layout = value === 'row' ? 'hor' : 'ver'
        continue
      }
      if (mirrorKey === '_alignItems') {
        const alignMap: Record<string, string> = {
          'center': 'ver-center',
          'flex-start': 'top',
          'flex-end': 'bottom',
        }
        if (alignMap[value as string]) {
          props.push(alignMap[value as string])
        }
        continue
      }
      if (mirrorKey === '_justifyContent') {
        const justifyMap: Record<string, string> = {
          'center': 'hor-center',
          'space-between': 'spread',
          'flex-start': 'left',
          'flex-end': 'right',
        }
        if (justifyMap[value as string]) {
          props.push(justifyMap[value as string])
        }
        continue
      }

      // Format value
      let mirrorValue = this.formatMirrorValue(key, value)

      props.push(`${mirrorKey} ${mirrorValue}`)
    }

    // Add layout at the beginning if horizontal
    if (layout === 'hor') {
      props.unshift('hor')
    }

    return props
  }

  /**
   * Format a value for Mirror
   */
  private formatMirrorValue(key: string, value: string | number): string {
    let strValue = String(value)

    // Handle CSS variable references
    if (strValue.startsWith('var(--')) {
      const tokenName = strValue.match(/var\(--([^\)]+)\)/)?.[1]
      return tokenName ? `$${tokenName}` : strValue
    }

    // Remove all px suffixes
    strValue = strValue.replace(/px/g, '')

    // Handle percentage values - keep as is
    if (strValue.includes('%')) {
      return strValue
    }

    // Clean up any remaining whitespace
    strValue = strValue.trim()

    return strValue
  }
}

/**
 * Create a converter instance
 */
export function createConverter(): ReactToMirrorConverter {
  return new ReactToMirrorConverter()
}

/**
 * Quick convert function
 */
export function reactToMirror(reactCode: string): ConversionResult {
  return new ReactToMirrorConverter().convert(reactCode)
}
