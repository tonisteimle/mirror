/**
 * AST to JSX Converter
 *
 * Converts Mirror AST nodes to JSX string output.
 */

import type { ASTNode, EventHandler, ActionStatement, StateDefinition } from '../../parser/types'
import type { ComponentDefinition } from './analyze-interactivity'
import { escapeHtml } from './utils/escape-html'
import { getHtmlTag, isSelfClosingTag, isPrimitiveNode } from './tag-mapper'
import type { ExportContext } from './types'

/**
 * Generate JSX for a single node
 */
function nodeToJsx(node: ASTNode, ctx: ExportContext, indent: string): string {
  const elementName = node.instanceName || node.name

  // Check if this element is conditionally rendered
  if (ctx.isConditionallyRendered(elementName)) {
    const visState = ctx.getVisibilityState(elementName)
    if (visState && node.properties.hidden) {
      // This is the hidden element itself - wrap in conditional
      const inner = renderElement(node, ctx, indent + '  ')
      return `${indent}{${visState.stateName} && (\n${inner}\n${indent})}`
    }
  }

  return renderElement(node, ctx, indent)
}

/**
 * Render a single element (without conditional wrapper)
 */
function renderElement(node: ASTNode, ctx: ExportContext, indent: string): string {
  const tag = getHtmlTag(node)
  const isDefinedComp = ctx.isDefinedComponent(node.name)

  // Use defined component tag if applicable
  const elementTag = isDefinedComp ? node.name : tag

  // For defined components, don't add className (it's on the internal div)
  let classNameAttr: string
  if (isDefinedComp) {
    classNameAttr = ''
  } else {
    const className = ctx.getClassName(node)
    const componentState = ctx.getComponentState(node.name)

    // Build className - dynamic if has component states
    if (componentState) {
      classNameAttr = `className={\`${className} ${className}--\${${componentState.stateName}}\`}`
    } else {
      classNameAttr = `className="${className}"`
    }
  }

  const attributes = buildAttributes(node, classNameAttr, ctx)
  const hasChildren = node.children.length > 0 || node.content

  // Self-closing tags
  if (isSelfClosingTag(tag) || (!hasChildren && !isPrimitiveNode(node) && !isDefinedComp)) {
    return `${indent}<${elementTag}${attributes} />`
  }

  const lines: string[] = []

  // Opening tag
  lines.push(`${indent}<${elementTag}${attributes}>`)

  // Text content
  if (node.content) {
    if (node.children.length > 0) {
      lines.push(`${indent}  ${escapeHtml(node.content)}`)
    } else {
      // Inline text for simple elements
      const openTag = `<${elementTag}${attributes}>`
      const closeTag = `</${elementTag}>`
      return `${indent}${openTag}${escapeHtml(node.content)}${closeTag}`
    }
  }

  // Children
  for (const child of node.children) {
    lines.push(nodeToJsx(child, ctx, indent + '  '))
  }

  // Closing tag
  lines.push(`${indent}</${elementTag}>`)

  return lines.join('\n')
}

/**
 * Generate onClick handler code
 */
function generateOnClick(handler: EventHandler, ctx: ExportContext): string {
  const actions: string[] = []

  for (const action of handler.actions) {
    if (!('type' in action)) continue
    const stmt = action as ActionStatement

    switch (stmt.type) {
      case 'show':
        if (stmt.target) {
          const visState = ctx.getVisibilityState(stmt.target)
          if (visState) {
            actions.push(`${visState.setterName}(true)`)
          }
        }
        break

      case 'hide':
        if (stmt.target) {
          const visState = ctx.getVisibilityState(stmt.target)
          if (visState) {
            actions.push(`${visState.setterName}(false)`)
          }
        }
        break

      case 'toggle':
        if (stmt.target) {
          const visState = ctx.getVisibilityState(stmt.target)
          if (visState) {
            actions.push(`${visState.setterName}(prev => !prev)`)
          }
          // Also handle component state toggle
          const compState = ctx.getComponentState(stmt.target)
          if (compState && compState.states.length === 2) {
            const [s1, s2] = compState.states
            actions.push(`${compState.stateName} === '${s1}' ? set${capitalize(compState.stateName)}('${s2}') : set${capitalize(compState.stateName)}('${s1}')`)
          }
        }
        // Self toggle for component states
        if (!stmt.target || stmt.target === 'self') {
          // Will be handled at component level
        }
        break
    }
  }

  if (actions.length === 0) return ''
  if (actions.length === 1) return `onClick={() => ${actions[0]}}`
  return `onClick={() => { ${actions.join('; ')} }}`
}

/**
 * Generate onChange handler code
 */
function generateOnChange(handler: EventHandler, ctx: ExportContext): string {
  for (const action of handler.actions) {
    if (!('type' in action)) continue
    const stmt = action as ActionStatement

    if (stmt.type === 'assign' && stmt.target) {
      const varName = stmt.target.replace(/^\$/, '')
      const variable = ctx.interactivity.variables.find((v) => v.name === varName)
      if (variable) {
        return `onChange={(e) => ${variable.setterName}(e.target.value)}`
      }
    }
  }
  return ''
}

/**
 * Build attribute string for an element
 */
function buildAttributes(node: ASTNode, classNameAttr: string, ctx: ExportContext): string {
  const attrs: string[] = []

  // ClassName is first (if present)
  if (classNameAttr) {
    attrs.push(classNameAttr)
  }

  // Event handlers
  if (node.eventHandlers) {
    for (const handler of node.eventHandlers) {
      if (handler.event === 'onclick') {
        const onClick = generateOnClick(handler, ctx)
        if (onClick) attrs.push(onClick)
      }
      if (handler.event === 'onchange') {
        const onChange = generateOnChange(handler, ctx)
        if (onChange) attrs.push(onChange)

        // Add value binding for controlled input
        for (const action of handler.actions) {
          if ('type' in action && (action as ActionStatement).type === 'assign') {
            const varName = ((action as ActionStatement).target || '').replace(/^\$/, '')
            const variable = ctx.interactivity.variables.find((v) => v.name === varName)
            if (variable) {
              attrs.push(`value={${variable.stateName}}`)
            }
          }
        }
      }
    }
  }

  // Primitive-specific attributes
  const tag = getHtmlTag(node)

  if (tag === 'button') {
    attrs.push('type="button"')
  }

  if (tag === 'input') {
    // For Input primitives, content is the placeholder text
    const placeholder = (node.properties.placeholder as string | undefined) || node.content
    if (placeholder) {
      attrs.push(`placeholder="${escapeHtml(placeholder)}"`)
    }
    if (node.properties.type) {
      attrs.push(`type="${node.properties.type}"`)
    }
  }

  if (tag === 'textarea') {
    // For Textarea primitives, content is the placeholder text
    const placeholder = (node.properties.placeholder as string | undefined) || node.content
    if (placeholder) {
      attrs.push(`placeholder="${escapeHtml(placeholder)}"`)
    }
    if (typeof node.properties.rows === 'number') {
      attrs.push(`rows={${node.properties.rows}}`)
    }
  }

  if (tag === 'img') {
    if (node.content) {
      attrs.push(`src="${node.content}"`)
    } else if (node.properties.src) {
      attrs.push(`src="${node.properties.src}"`)
    }
    attrs.push('alt=""')
  }

  if (tag === 'a') {
    if (node.properties.href) {
      attrs.push(`href="${node.properties.href}"`)
    } else if (node.content && node.content.startsWith('http')) {
      attrs.push(`href="${node.content}"`)
    }
  }

  return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generate useState declarations
 */
function generateStateDeclarations(ctx: ExportContext): string[] {
  const lines: string[] = []

  // Visibility states
  for (const vs of ctx.interactivity.visibilityStates) {
    lines.push(`const [${vs.stateName}, ${vs.setterName}] = useState(${vs.initialVisible})`)
  }

  // Component states
  for (const cs of ctx.interactivity.componentStates) {
    lines.push(`const [${cs.stateName}, ${cs.setterName}] = useState<'${cs.states.join("' | '")}'>('${cs.initialState}')`)
  }

  // Variable states (only those that are written to)
  for (const v of ctx.interactivity.variables) {
    if (v.writers.length > 0) {
      const initialValue = typeof v.initialValue === 'string' ? `'${v.initialValue}'` : v.initialValue
      lines.push(`const [${v.stateName}, ${v.setterName}] = useState(${initialValue})`)
    }
  }

  return lines
}

/**
 * Generate component definition
 */
function generateComponentDefinition(def: ComponentDefinition, ctx: ExportContext): string {
  const lines: string[] = []
  const { name, template } = def

  // Props interface
  lines.push(`interface ${name}Props {`)
  lines.push(`  children?: React.ReactNode`)
  lines.push(`}`)
  lines.push('')

  // Function component
  lines.push(`function ${name}({ children }: ${name}Props) {`)

  // State for component states
  if (template.states && template.states.length > 0) {
    const stateNames = template.states.map((s: StateDefinition) => s.name)
    lines.push(`  const [state, setState] = useState<'${stateNames.join("' | '")}'>('${stateNames[0]}')`)
    lines.push('')
  }

  // Return JSX
  const className = ctx.getClassName({ name, id: name, type: 'component', properties: template.properties, children: [] } as ASTNode)

  if (template.states && template.states.length > 0) {
    lines.push(`  return (`)
    lines.push(`    <div className={\`${className} ${className}--\${state}\`} onClick={() => setState(state === '${template.states[0].name}' ? '${template.states[1]?.name || template.states[0].name}' : '${template.states[0].name}')}>`)
    lines.push(`      {children}`)
    lines.push(`    </div>`)
    lines.push(`  )`)
  } else {
    lines.push(`  return <div className="${className}">{children}</div>`)
  }

  lines.push(`}`)

  return lines.join('\n')
}

/**
 * Generate JSX for multiple root nodes
 */
export function generateJsx(nodes: ASTNode[], ctx: ExportContext): string {
  const lines: string[] = []
  const indent = '    '

  // Filter out nodes that are only definitions
  const renderableNodes = nodes.filter((n) => !n._isExplicitDefinition)

  if (renderableNodes.length === 0) {
    return `${indent}<></>`
  }

  if (renderableNodes.length === 1) {
    return nodeToJsx(renderableNodes[0], ctx, indent)
  }

  // Multiple root nodes need a fragment
  lines.push(`${indent}<>`)
  for (const node of renderableNodes) {
    lines.push(nodeToJsx(node, ctx, indent + '  '))
  }
  lines.push(`${indent}</>`)

  return lines.join('\n')
}

/**
 * Generate the complete App.tsx file content
 */
export function generateAppTsx(nodes: ASTNode[], ctx: ExportContext): string {
  const lines: string[] = []

  // Imports
  if (ctx.interactivity.needsUseState) {
    lines.push("import { useState } from 'react'")
    lines.push('')
  }

  // Component definitions
  for (const def of ctx.interactivity.definitions) {
    lines.push(generateComponentDefinition(def, ctx))
    lines.push('')
  }

  // App component
  lines.push('export function App() {')

  // State declarations
  const stateDecls = generateStateDeclarations(ctx)
  if (stateDecls.length > 0) {
    for (const decl of stateDecls) {
      lines.push(`  ${decl}`)
    }
    lines.push('')
  }

  // Return JSX
  lines.push('  return (')
  lines.push(generateJsx(nodes, ctx))
  lines.push('  )')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}
