import type { ASTNode } from '../parser/parser'
import { INTERNAL_NODES } from '../constants'

// Generate React component code from AST
export function generateReactCode(nodes: ASTNode[], _componentsCode?: string): string {
  const lines: string[] = []

  // Header
  lines.push(`import React from 'react'`)
  lines.push(``)

  // Generate component
  lines.push(`export default function App() {`)
  lines.push(`  return (`)

  // Generate JSX for each root node
  for (const node of nodes) {
    const jsx = generateJSX(node, '    ')
    lines.push(jsx)
  }

  lines.push(`  )`)
  lines.push(`}`)
  lines.push(``)

  return lines.join('\n')
}

function generateJSX(node: ASTNode, indent: string): string {
  // Text node
  if (node.name === INTERNAL_NODES.TEXT) {
    return node.content ? `${indent}${JSON.stringify(node.content)}` : ''
  }

  // Get styles
  const style = generateStyles(node.properties as Record<string, string | number | boolean>)
  const styleStr = Object.keys(style).length > 0
    ? ` style={${formatStyleObject(style)}}`
    : ''

  // Determine tag
  const tag = 'div'

  // Has children?
  const hasChildren = node.children.length > 0 || node.content

  if (!hasChildren) {
    return `${indent}<${tag}${styleStr} />`
  }

  const lines: string[] = []
  lines.push(`${indent}<${tag}${styleStr}>`)

  // Add text content
  if (node.content) {
    lines.push(`${indent}  {${JSON.stringify(node.content)}}`)
  }

  // Add children
  for (const child of node.children) {
    lines.push(generateJSX(child, indent + '  '))
  }

  lines.push(`${indent}</${tag}>`)

  return lines.join('\n')
}

function generateStyles(props: Record<string, string | number | boolean>): React.CSSProperties {
  const style: React.CSSProperties = {}

  // Layout
  if (props.hor) { style.display = 'flex'; style.flexDirection = 'row' }
  if (props.ver) { style.display = 'flex'; style.flexDirection = 'column' }
  if (props.wrap) { style.flexWrap = 'wrap' }
  if (props.grow) { style.flexGrow = 1 }
  if (props.between) { style.justifyContent = 'space-between' }

  // Alignment
  if (props.cen) { style.display = 'flex'; style.justifyContent = 'center'; style.alignItems = 'center' }
  if (props['hor-l']) style.justifyContent = 'flex-start'
  if (props['hor-r']) style.justifyContent = 'flex-end'
  if (props['hor-cen']) style.justifyContent = 'center'
  if (props['ver-t']) style.alignItems = 'flex-start'
  if (props['ver-b']) style.alignItems = 'flex-end'
  if (props['ver-cen']) style.alignItems = 'center'

  // Spacing
  if (typeof props.gap === 'number') style.gap = `${props.gap}px`
  if (typeof props.pad === 'number') style.padding = `${props.pad}px`
  if (typeof props.mar === 'number') style.margin = `${props.mar}px`

  // Size
  if (typeof props.w === 'number') style.width = `${props.w}px`
  if (typeof props.h === 'number') style.height = `${props.h}px`
  if (typeof props.minw === 'number') style.minWidth = `${props.minw}px`
  if (typeof props.maxw === 'number') style.maxWidth = `${props.maxw}px`
  if (props.full) { style.width = '100%'; style.height = '100%' }

  // Colors: col → text color, bg → background color
  if (typeof props.col === 'string') style.color = props.col
  if (typeof props.bg === 'string') style.backgroundColor = props.bg

  // Border
  if (typeof props.bor === 'number') style.borderWidth = `${props.bor}px`
  if (typeof props.boc === 'string') style.borderColor = props.boc
  if (typeof props.rad === 'number') style.borderRadius = `${props.rad}px`
  if (props.bor) style.borderStyle = 'solid'

  // Typography
  if (typeof props.size === 'number') style.fontSize = `${props.size}px`
  if (typeof props.weight === 'number') style.fontWeight = props.weight
  if (typeof props.font === 'string') style.fontFamily = props.font

  return style
}

function formatStyleObject(style: React.CSSProperties): string {
  const entries = Object.entries(style)
  if (entries.length === 0) return '{}'

  const parts = entries.map(([key, value]) => {
    const formattedValue = typeof value === 'string' ? `'${value}'` : value
    return `${key}: ${formattedValue}`
  })

  return `{ ${parts.join(', ')} }`
}
