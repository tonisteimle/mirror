/**
 * React to Mirror Converter
 *
 * Proper AST-based conversion using Babel parser.
 * Converts JSX/React code to Mirror DSL.
 */

import { parse as babelParse } from '@babel/parser'
import _traverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'

// Handle ESM/CJS interop - Babel exports differ based on bundler

const traverse = (_traverse as { default?: typeof _traverse }).default || _traverse

// ============================================================================
// Types
// ============================================================================

interface MirrorNode {
  name: string
  properties: Map<string, string | number | boolean>
  children: MirrorNode[]
  textContent?: string
}

interface ConversionResult {
  tokens: Map<string, string>
  components: Map<string, MirrorNode>
  instances: MirrorNode[]
  errors: string[]
}

// ============================================================================
// CSS to Mirror Property Mapping
// ============================================================================

const CSS_TO_MIRROR: Record<string, string> = {
  // Layout
  display: '_display',
  flexDirection: '_flexDirection',
  justifyContent: '_justifyContent',
  alignItems: '_alignItems',
  flexWrap: 'wrap',
  gap: 'gap',

  // Sizing
  width: 'w',
  height: 'h',
  minWidth: 'minw',
  maxWidth: 'maxw',
  minHeight: 'minh',
  maxHeight: 'maxh',
  flex: 'flex',

  // Spacing
  padding: 'pad',
  paddingTop: 'pad-top',
  paddingRight: 'pad-right',
  paddingBottom: 'pad-bottom',
  paddingLeft: 'pad-left',
  margin: 'margin',
  marginTop: 'margin-top',
  marginRight: 'margin-right',
  marginBottom: 'margin-bottom',
  marginLeft: 'margin-left',

  // Colors
  color: 'col',
  backgroundColor: 'bg',
  borderColor: 'boc',

  // Border
  border: 'bor',
  borderWidth: 'bor',
  borderRadius: 'rad',
  borderTopLeftRadius: 'rad-tl',
  borderTopRightRadius: 'rad-tr',
  borderBottomLeftRadius: 'rad-bl',
  borderBottomRightRadius: 'rad-br',

  // Typography
  fontSize: 'font-size',
  fontWeight: 'weight',
  fontFamily: 'font',
  lineHeight: 'line',
  textAlign: 'text-align',
  textTransform: '_textTransform',

  // Visual
  opacity: 'opacity',
  cursor: 'cursor',
  overflow: 'overflow',
  overflowX: 'overflow-x',
  overflowY: 'overflow-y',
  boxShadow: 'shadow',
  zIndex: 'z',

  // Position
  position: 'position',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
}

// ============================================================================
// Value Normalization
// ============================================================================

function normalizeValue(value: string | number): string | number {
  if (typeof value === 'number') return value

  // Remove 'px' suffix for numbers
  if (/^\d+px$/.test(value)) {
    return parseInt(value, 10)
  }

  // Handle percentages
  if (value === '100%') return 'full'
  if (value === 'fit-content') return 'hug'

  return value
}

// ============================================================================
// Color Extraction for Tokens
// ============================================================================

function isColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{3,8}$/.test(value) || /^rgb/.test(value) || /^hsl/.test(value)
}

function generateTokenName(value: string, usage: string, tokens: Map<string, string>): string {
  // Check if this color already has a token
  for (const [name, val] of tokens) {
    if (val === value) return name
  }

  // Map usage to semantic token names
  const usageToSemantic: Record<string, string> = {
    bg: 'bg',
    col: 'col',
    boc: 'border',
    rad: 'rad',
  }

  const semantic = usageToSemantic[usage] || usage.replace(/[^a-zA-Z]/g, '')

  // Count existing tokens of this type
  let counter = 0
  for (const name of tokens.keys()) {
    if (name.startsWith(`$${semantic}`)) counter++
  }

  const name = counter === 0 ? `$${semantic}` : `$${semantic}.${counter}`
  tokens.set(name, value)
  return name
}

// ============================================================================
// HTML to Mirror Tag Mapping
// ============================================================================

const HTML_TO_MIRROR: Record<string, string> = {
  // Semantic HTML → Mirror components
  div: 'Box',
  span: 'Text',
  p: 'Text',
  h1: 'Heading',
  h2: 'Heading',
  h3: 'Heading',
  h4: 'Heading',
  h5: 'Heading',
  h6: 'Heading',
  button: 'Button',
  a: 'Link',
  img: 'Image',
  input: 'Input',
  textarea: 'Textarea',
  nav: 'Nav',
  header: 'Header',
  footer: 'Footer',
  main: 'Main',
  aside: 'Sidebar',
  section: 'Section',
  article: 'Article',
  ul: 'List',
  ol: 'List',
  li: 'ListItem',
  label: 'Label',
  form: 'Form',
}

function mapHtmlToMirror(tagName: string): string {
  const lower = tagName.toLowerCase()
  return HTML_TO_MIRROR[lower] || tagName.charAt(0).toUpperCase() + tagName.slice(1)
}

// ============================================================================
// AST Parsing
// ============================================================================

function parseStyleObject(
  node: t.ObjectExpression,
  tokens: Map<string, string>
): Map<string, string | number | boolean> {
  const properties = new Map<string, string | number | boolean>()

  for (const prop of node.properties) {
    if (!t.isObjectProperty(prop)) continue

    const key = t.isIdentifier(prop.key)
      ? prop.key.name
      : t.isStringLiteral(prop.key)
        ? prop.key.value
        : null

    if (!key) continue

    let value: string | number | null = null

    if (t.isStringLiteral(prop.value)) {
      value = prop.value.value
    } else if (t.isNumericLiteral(prop.value)) {
      value = prop.value.value
    } else if (t.isTemplateLiteral(prop.value) && prop.value.quasis.length === 1) {
      value = prop.value.quasis[0].value.raw
    }

    if (value === null) continue

    const mirrorProp = CSS_TO_MIRROR[key]
    if (!mirrorProp || mirrorProp.startsWith('_')) {
      // Handle special cases
      if (key === 'display' && value === 'flex') continue // Implicit in hor/ver
      if (key === 'flexDirection') {
        if (value === 'row') properties.set('_layout', 'hor')
        if (value === 'column') properties.set('_layout', 'ver')
        continue
      }
      if (key === 'justifyContent') {
        if (value === 'center') properties.set('_hAlign', 'hor-center')
        if (value === 'flex-start') properties.set('_hAlign', 'left')
        if (value === 'flex-end') properties.set('_hAlign', 'right')
        if (value === 'space-between') properties.set('_hAlign', 'spread')
        continue
      }
      if (key === 'alignItems') {
        if (value === 'center') properties.set('_vAlign', 'ver-center')
        if (value === 'flex-start') properties.set('_vAlign', 'top')
        if (value === 'flex-end') properties.set('_vAlign', 'bottom')
        continue
      }
      if (key === 'textTransform') {
        if (value === 'uppercase') properties.set('uppercase', true)
        if (value === 'lowercase') properties.set('lowercase', true)
        continue
      }
      continue
    }

    // Convert colors to tokens
    if (typeof value === 'string' && isColor(value)) {
      const tokenName = generateTokenName(value, mirrorProp, tokens)
      properties.set(mirrorProp, tokenName)
    } else {
      properties.set(mirrorProp, normalizeValue(value))
    }
  }

  return properties
}

function parseJSXElement(node: t.JSXElement, tokens: Map<string, string>): MirrorNode {
  const opening = node.openingElement
  const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : 'Unknown'

  // Convert tag to Mirror component name
  const name = mapHtmlToMirror(tagName)
  const properties = new Map<string, string | number | boolean>()
  const children: MirrorNode[] = []
  let textContent: string | undefined

  // Parse attributes
  for (const attr of opening.attributes) {
    if (!t.isJSXAttribute(attr)) continue
    if (!t.isJSXIdentifier(attr.name)) continue

    const attrName = attr.name.name

    // Handle style attribute
    if (attrName === 'style' && t.isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression
      if (t.isObjectExpression(expr)) {
        const styleProps = parseStyleObject(expr, tokens)
        for (const [k, v] of styleProps) {
          properties.set(k, v)
        }
      }
    }

    // Handle className (for reference, not converted)
    if (attrName === 'className' && t.isStringLiteral(attr.value)) {
      // Could parse Tailwind classes here
    }
  }

  // Parse children
  for (const child of node.children) {
    if (t.isJSXElement(child)) {
      children.push(parseJSXElement(child, tokens))
    } else if (t.isJSXText(child)) {
      const text = child.value.trim()
      if (text) {
        textContent = text
      }
    } else if (t.isJSXExpressionContainer(child)) {
      if (t.isStringLiteral(child.expression)) {
        textContent = child.expression.value
      }
    }
  }

  return { name, properties, children, textContent }
}

// ============================================================================
// Mirror Code Generation
// ============================================================================

function generateMirrorProperties(props: Map<string, string | number | boolean>): string {
  const parts: string[] = []

  // Handle layout first
  const layout = props.get('_layout')
  if (layout) parts.push(layout as string)
  props.delete('_layout')

  // Handle alignment
  const hAlign = props.get('_hAlign')
  const vAlign = props.get('_vAlign')
  if (hAlign === 'hor-center' && vAlign === 'ver-center') {
    parts.push('center')
  } else {
    if (hAlign) parts.push(hAlign as string)
    if (vAlign) parts.push(vAlign as string)
  }
  props.delete('_hAlign')
  props.delete('_vAlign')

  // Handle remaining properties
  for (const [key, value] of props) {
    if (key.startsWith('_')) continue
    // Standalone properties (boolean true means just the property name)
    if (value === true) {
      parts.push(key)
    } else if (value !== false) {
      parts.push(`${key} ${value}`)
    }
  }

  return parts.join(', ')
}

function generateMirrorCode(node: MirrorNode, indent: number = 0): string {
  const indentStr = '  '.repeat(indent)
  const props = generateMirrorProperties(new Map(node.properties))

  let line = `${indentStr}${node.name}`
  if (props) line += ` ${props}`
  if (node.textContent) line += ` "${node.textContent}"`

  const lines = [line]

  for (const child of node.children) {
    lines.push(generateMirrorCode(child, indent + 1))
  }

  return lines.join('\n')
}

function generateTokens(tokens: Map<string, string>): string {
  if (tokens.size === 0) return ''

  const lines = ['// Tokens']
  for (const [name, value] of tokens) {
    lines.push(`${name}: ${value}`)
  }
  return lines.join('\n')
}

// ============================================================================
// Main Conversion Function
// ============================================================================

export function convertReactToMirror(reactCode: string): ConversionResult {
  const errors: string[] = []
  const tokens = new Map<string, string>()
  const components = new Map<string, MirrorNode>()
  const instances: MirrorNode[] = []
  const processedFunctions = new Set<string>()

  try {
    // Parse with Babel
    const ast = babelParse(reactCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    // First pass: find function/arrow components
    traverse(ast, {
      // Handle function components
      FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
        const name = path.node.id?.name
        if (!name) return
        processedFunctions.add(name)

        // Find return statement with JSX
        path.traverse({
          ReturnStatement(returnPath: NodePath<t.ReturnStatement>) {
            const arg = returnPath.node.argument
            if (t.isJSXElement(arg)) {
              const node = parseJSXElement(arg, tokens)
              node.name = name // Use function name
              instances.push(node)
            } else if (t.isJSXFragment(arg)) {
              // Handle fragments - take first child
              for (const child of arg.children) {
                if (t.isJSXElement(child)) {
                  const node = parseJSXElement(child, tokens)
                  instances.push(node)
                }
              }
            }
          },
        })
      },

      // Handle arrow function components
      VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
        if (!t.isIdentifier(path.node.id)) return
        const name = path.node.id.name

        const init = path.node.init
        if (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init)) return

        processedFunctions.add(name)

        // Find JSX in body
        if (t.isJSXElement(init.body)) {
          const node = parseJSXElement(init.body, tokens)
          node.name = name
          instances.push(node)
        } else if (t.isBlockStatement(init.body)) {
          path.traverse({
            ReturnStatement(returnPath: NodePath<t.ReturnStatement>) {
              const arg = returnPath.node.argument
              if (t.isJSXElement(arg)) {
                const node = parseJSXElement(arg, tokens)
                node.name = name
                instances.push(node)
              }
            },
          })
        }
      },
    })

    // Only process standalone JSX if no functions found
    if (instances.length === 0) {
      traverse(ast, {
        JSXElement(path: NodePath<t.JSXElement>) {
          // Only process root-level JSX (not nested)
          if (path.parentPath.isJSXElement()) return

          const node = parseJSXElement(path.node, tokens)
          instances.push(node)
        },
      })
    }
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { tokens, components, instances, errors }
}

export function convertToMirrorCode(reactCode: string): string {
  const result = convertReactToMirror(reactCode)

  if (result.errors.length > 0) {
    return `// Conversion errors:\n// ${result.errors.join('\n// ')}`
  }

  const lines: string[] = []

  // Add tokens
  const tokenCode = generateTokens(result.tokens)
  if (tokenCode) {
    lines.push(tokenCode)
    lines.push('')
  }

  // Add instances
  for (const instance of result.instances) {
    lines.push(generateMirrorCode(instance))
    lines.push('')
  }

  return lines.join('\n').trim()
}
