/**
 * React to Mirror Converter
 *
 * Converts React/JSX code to Mirror DSL syntax.
 * Used by LLM integration for React-first workflows.
 */

// ============================================
// MAPPING CONSTANTS
// ============================================

export const STYLE_TO_MIRROR: Record<string, string> = {
  padding: 'pad',
  paddingTop: 'pad top',
  paddingBottom: 'pad bottom',
  paddingLeft: 'pad left',
  paddingRight: 'pad right',
  margin: 'm',
  backgroundColor: 'bg',
  background: 'bg',
  color: 'col',
  borderRadius: 'rad',
  width: 'w',
  height: 'h',
  minWidth: 'minw',
  maxWidth: 'maxw',
  minHeight: 'minh',
  maxHeight: 'maxh',
  gap: 'gap',
  fontSize: 'font-size',
  fontWeight: 'weight',
  fontFamily: 'font',
  textAlign: 'text-align',
  display: '_display',
  flexDirection: '_flexDirection',
  alignItems: '_alignItems',
  justifyContent: '_justifyContent',
  cursor: 'cursor',
  opacity: 'opacity',
  border: 'bor',
  borderColor: 'boc',
  boxShadow: 'shadow',
}

export const TAG_TO_COMPONENT: Record<string, string> = {
  div: 'frame',
  span: 'text',
  button: 'button',
  input: 'input',
  textarea: 'textarea',
  img: 'image',
  a: 'link',
  nav: 'frame',
  header: 'frame',
  footer: 'frame',
  main: 'frame',
  section: 'frame',
  article: 'frame',
  aside: 'frame',
  h1: 'text',
  h2: 'text',
  h3: 'text',
  h4: 'text',
  p: 'text',
  label: 'text',
  select: 'frame',
}

export const TAG_TO_NAME: Record<string, string> = {
  div: 'Box',
  span: 'Text',
  button: 'Button',
  input: 'Input',
  nav: 'Nav',
  header: 'Header',
  footer: 'Footer',
  main: 'Main',
  section: 'Section',
  h1: 'Heading',
  h2: 'Heading',
  h3: 'Heading',
  p: 'Text',
  a: 'Link',
  img: 'Image',
  select: 'Select',
  option: 'Option',
}

// ============================================
// TYPES
// ============================================

export interface ConvertResult {
  mirror: string
  errors: string[]
}

interface ParsedElement {
  tag: string
  style: Record<string, string> | null
  children: (ParsedElement | string)[]
}

export interface PromptContext {
  tokens: Array<{ name: string; value: string }>
  components: Array<{ name: string; properties: string[] }>
  editor?: {
    selectedNodeName?: string
    ancestors?: string[]
    insideComponent?: string
    surroundingCode?: { before: string; after: string }
  }
}

// ============================================
// STYLE PARSING
// ============================================

function parseStyleObject(styleStr: string): Record<string, string> {
  const style: Record<string, string> = {}
  const pairs = styleStr
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':')
    if (colonIndex === -1) continue

    const key = pair.slice(0, colonIndex).trim().replace(/['"]/g, '')
    const value = pair
      .slice(colonIndex + 1)
      .trim()
      .replace(/['"]/g, '')
      .replace(/,\s*$/, '')
    style[key] = value
  }
  return style
}

function styleToMirrorProps(style: Record<string, string>): string[] {
  const props: string[] = []
  let layout = 'ver'

  for (const [key, value] of Object.entries(style)) {
    const mirrorKey = STYLE_TO_MIRROR[key]
    if (!mirrorKey) continue

    if (mirrorKey === '_display' && value === 'flex') continue

    if (mirrorKey === '_flexDirection') {
      layout = value === 'row' ? 'hor' : 'ver'
      continue
    }

    if (mirrorKey === '_alignItems') {
      const map: Record<string, string> = {
        center: 'ver-center',
        'flex-start': 'top',
        'flex-end': 'bottom',
      }
      if (map[value]) props.push(map[value])
      continue
    }

    if (mirrorKey === '_justifyContent') {
      const map: Record<string, string> = {
        center: 'hor-center',
        'space-between': 'spread',
        'flex-start': 'left',
        'flex-end': 'right',
      }
      if (map[value]) props.push(map[value])
      continue
    }

    let mirrorValue = String(value).replace(/px/g, '').trim()
    if (mirrorValue.startsWith('var(--')) {
      const tokenName = mirrorValue.match(/var\(--([^)]+)\)/)?.[1]
      mirrorValue = tokenName ? `$${tokenName}` : mirrorValue
    }

    props.push(`${mirrorKey} ${mirrorValue}`)
  }

  if (layout === 'hor') props.unshift('hor')
  return props
}

// ============================================
// BRACE MATCHING
// ============================================

function findMatchingBrace(str: string, openPos: number): number {
  if (str[openPos] !== '{') return -1

  let depth = 1
  let pos = openPos + 1

  while (pos < str.length && depth > 0) {
    const char = str[pos]
    if (char === '{') depth++
    else if (char === '}') depth--

    if (char === '"' || char === "'" || char === '`') {
      const quote = char
      pos++
      while (pos < str.length && str[pos] !== quote) {
        if (str[pos] === '\\') pos++
        pos++
      }
    }
    pos++
  }

  return depth === 0 ? pos - 1 : -1
}

// ============================================
// JSX EXTRACTION
// ============================================

function extractReturnJSX(code: string): string {
  const returnIndex = code.indexOf('return')
  if (returnIndex === -1) return code

  let pos = returnIndex + 6
  while (pos < code.length && code[pos] !== '(' && code[pos] !== '<') pos++

  if (code[pos] === '<') {
    const jsxStart = pos
    const tag = code.slice(pos).match(/^<(\w+)/)?.[1]
    if (tag) {
      const closeTag = `</${tag}>`
      const closeIndex = code.lastIndexOf(closeTag)
      if (closeIndex > jsxStart) return code.slice(jsxStart, closeIndex + closeTag.length).trim()
    }
    return code.slice(pos).trim()
  }

  if (code[pos] !== '(') return code

  let depth = 1
  pos++

  while (pos < code.length && depth > 0) {
    const char = code[pos]
    if (char === '"' || char === "'" || char === '`') {
      const quote = char
      pos++
      while (pos < code.length && code[pos] !== quote) {
        if (code[pos] === '\\') pos++
        pos++
      }
    } else if (char === '(') depth++
    else if (char === ')') depth--
    pos++
  }

  return code.slice(returnIndex + 7, pos - 1).trim()
}

// ============================================
// JSX PARSING
// ============================================

function parseJSXElement(jsx: string): ParsedElement | null {
  if (!jsx || !jsx.startsWith('<')) return null

  const openTagMatch = jsx.match(/^<(\w+)([^>]*?)(?:\/>|>)/)
  if (!openTagMatch) return null

  const tag = openTagMatch[1].toLowerCase()
  const propsStr = openTagMatch[2]
  const isSelfClosing = jsx.includes('/>')

  let style: Record<string, string> | null = null
  const styleMatch = propsStr.match(/style=\{\{([^}]+)\}\}/)
  if (styleMatch) style = parseStyleObject(styleMatch[1])

  const element: ParsedElement = { tag, style, children: [] }

  if (!isSelfClosing) {
    const childrenMatch = jsx.match(
      new RegExp(`<${openTagMatch[1]}[^>]*>([\\s\\S]*)<\\/${openTagMatch[1]}>`, 'i')
    )
    if (childrenMatch) {
      element.children = parseChildren(childrenMatch[1])
    }
  }

  return element
}

function parseChildren(content: string): (ParsedElement | string)[] {
  const children: (ParsedElement | string)[] = []
  const trimmed = content.trim()
  if (!trimmed) return children

  if (!trimmed.includes('<')) {
    if (trimmed && !trimmed.startsWith('{')) children.push(trimmed)
    return children
  }

  let pos = 0
  let textStart = 0

  while (pos < trimmed.length) {
    if (trimmed[pos] === '{') {
      const exprEnd = findMatchingBrace(trimmed, pos)
      if (exprEnd > pos) {
        pos = exprEnd + 1
        textStart = pos
        continue
      }
    }

    const openTagStart = trimmed.indexOf('<', pos)
    if (openTagStart === -1) {
      const text = trimmed.slice(textStart).trim()
      if (text && !text.startsWith('{') && !text.startsWith('</')) children.push(text)
      break
    }

    const braceBeforeTag = trimmed.lastIndexOf('{', openTagStart)
    if (braceBeforeTag >= textStart) {
      const braceEnd = findMatchingBrace(trimmed, braceBeforeTag)
      if (braceEnd > openTagStart) {
        pos = braceEnd + 1
        textStart = pos
        continue
      }
    }

    if (trimmed[openTagStart + 1] === '/') {
      pos = trimmed.indexOf('>', openTagStart) + 1
      textStart = pos
      continue
    }

    if (openTagStart > textStart) {
      const text = trimmed.slice(textStart, openTagStart).trim()
      if (text && !text.startsWith('{') && !text.startsWith('</')) children.push(text)
    }

    const tagNameMatch = trimmed.slice(openTagStart).match(/^<(\w+)/)
    if (!tagNameMatch) {
      pos = openTagStart + 1
      continue
    }

    const tagName = tagNameMatch[1]
    const selfCloseMatch = trimmed.slice(openTagStart).match(new RegExp(`^<${tagName}[^>]*/>`))

    if (selfCloseMatch) {
      const element = parseJSXElement(selfCloseMatch[0])
      if (element) children.push(element)
      pos = openTagStart + selfCloseMatch[0].length
      textStart = pos
      continue
    }

    const closeTag = `</${tagName}>`
    let depth = 1
    let searchPos = openTagStart + 1

    while (depth > 0 && searchPos < trimmed.length) {
      if (trimmed[searchPos] === '{') {
        const exprEnd = findMatchingBrace(trimmed, searchPos)
        if (exprEnd > searchPos) {
          searchPos = exprEnd + 1
          continue
        }
      }

      const nextClose = trimmed.indexOf(closeTag, searchPos)
      if (nextClose === -1) {
        depth = 0
        break
      }

      const nextOpenSearch = trimmed.slice(searchPos).search(new RegExp(`<${tagName}(?:\\s|>|/>)`))
      if (nextOpenSearch !== -1 && searchPos + nextOpenSearch < nextClose) {
        const checkPos = searchPos + nextOpenSearch
        if (!trimmed.slice(checkPos).match(new RegExp(`^<${tagName}[^>]*/>`))) depth++
        searchPos = checkPos + 1
      } else {
        depth--
        if (depth === 0) {
          const fullElement = trimmed.slice(openTagStart, nextClose + closeTag.length)
          const element = parseJSXElement(fullElement)
          if (element) children.push(element)
          pos = nextClose + closeTag.length
          textStart = pos
        } else {
          searchPos = nextClose + closeTag.length
        }
      }
    }

    if (depth !== 0) pos = openTagStart + 1
  }

  return children
}

// ============================================
// CODE GENERATION
// ============================================

function generateElement(
  element: ParsedElement,
  depth: number,
  componentDefinitions: Map<string, string>
): string {
  const indent = '  '.repeat(depth)
  const name =
    TAG_TO_NAME[element.tag] || element.tag.charAt(0).toUpperCase() + element.tag.slice(1)
  const parts = [name]

  if (element.style) {
    const props = styleToMirrorProps(element.style)
    if (depth > 0 || !componentDefinitions.has(name)) {
      if (props.length > 0) parts.push(props.join(', '))
    }
  }

  const textChildren = element.children.filter((c): c is string => typeof c === 'string')
  if (textChildren.length > 0) {
    const text = textChildren.join(' ').trim()
    if (text && !text.startsWith('{')) parts.push(`"${text}"`)
  }

  let line = indent + parts.join(' ')
  const elementChildren = element.children.filter((c): c is ParsedElement => typeof c !== 'string')

  if (elementChildren.length > 0) {
    const childLines = elementChildren.map(child =>
      generateElement(child, depth + 1, componentDefinitions)
    )
    line += '\n' + childLines.join('\n')
  }

  return line
}

function collectComponentDefinitions(
  element: ParsedElement,
  componentDefinitions: Map<string, string>
): void {
  const name =
    TAG_TO_NAME[element.tag] || element.tag.charAt(0).toUpperCase() + element.tag.slice(1)

  if (!componentDefinitions.has(name) && element.style) {
    const baseTag = TAG_TO_COMPONENT[element.tag] || 'frame'
    const props = styleToMirrorProps(element.style)
    if (props.length > 0) {
      componentDefinitions.set(name, `${name} as ${baseTag}:\n  ${props.join(', ')}`)
    }
  }

  for (const child of element.children) {
    if (typeof child !== 'string') {
      collectComponentDefinitions(child, componentDefinitions)
    }
  }
}

// ============================================
// MAIN CONVERTER
// ============================================

export function convertReactToMirror(reactCode: string): ConvertResult {
  const componentDefinitions = new Map<string, string>()

  try {
    const jsx = extractReturnJSX(reactCode)
    const rootElement = parseJSXElement(jsx.trim())

    if (!rootElement) {
      return { mirror: '', errors: ['Failed to parse JSX'] }
    }

    componentDefinitions.clear()
    collectComponentDefinitions(rootElement, componentDefinitions)

    const lines: string[] = []
    for (const [, def] of componentDefinitions) {
      lines.push(def)
      lines.push('')
    }
    lines.push(generateElement(rootElement, 0, componentDefinitions))

    return { mirror: lines.join('\n').trim(), errors: [] }
  } catch (error) {
    return { mirror: '', errors: [(error as Error).message] }
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

export function buildReactSystemPrompt(context: PromptContext): string {
  let prompt = `You are a UI developer. Generate React/JSX code for the requested UI.

IMPORTANT RULES:
1. Return ONLY JSX code inside a functional component
2. Use inline styles with camelCase properties
3. Use semantic HTML elements (div, button, span, nav, header, etc.)
4. Keep the code clean and minimal
5. Do NOT include imports or exports
6. Do NOT include explanations - just the code

EXAMPLE OUTPUT:
\`\`\`jsx
function Component() {
  return (
<div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
  <span style={{ color: '#E4E4E7' }}>Hello World</span>
</div>
  )
}
\`\`\`

STYLE GUIDELINES:
- Use hex colors (e.g., '#5BA8F5')
- Use pixel values for spacing (e.g., '16px', '12px 24px')
- Common properties: padding, backgroundColor, color, borderRadius, display, flexDirection, gap, alignItems, justifyContent`

  if (context.tokens.length > 0) {
    prompt += '\n\nAVAILABLE DESIGN TOKENS (use as CSS variables):\n'
    for (const token of context.tokens.slice(0, 20)) {
      prompt += `- var(--${token.name}): ${token.value}\n`
    }
  }

  if (context.components.length > 0) {
    prompt += '\n\nEXISTING COMPONENTS (for style consistency):\n'
    for (const comp of context.components.slice(0, 10)) {
      prompt += `- ${comp.name}: ${comp.properties.slice(0, 5).join(', ')}\n`
    }
  }

  if (context.editor) {
    const ctx = context.editor
    if (ctx.selectedNodeName) {
      prompt += `\n\nEDITOR CONTEXT:\nSelected element: "${ctx.selectedNodeName}"`
      if (ctx.ancestors && ctx.ancestors.length > 0) {
        prompt += `\nLocation: ${ctx.ancestors.join(' → ')} → ${ctx.selectedNodeName}`
      }
    }
    if (ctx.insideComponent) {
      prompt += `\nCursor is inside: "${ctx.insideComponent}"`
    }
    if (ctx.surroundingCode) {
      prompt += `\n\nSurrounding code context:\n${ctx.surroundingCode.before}\n--- CURSOR ---\n${ctx.surroundingCode.after}`
    }
    prompt += `\n\nIMPORTANT: When user says "here", "this", "add X", they refer to the current position/selection.`
  }

  return prompt
}
