/**
 * Intent → Mirror Code Generator
 *
 * Generiert garantiert sauberen, konsistenten Mirror Code aus dem Intent-Format.
 * - Tokens werden immer verwendet (nie hardcoded Werte)
 * - Components werden korrekt definiert
 * - Konsistente Formatierung
 */

import type {
  Intent,
  TokenDefinitions,
  ComponentDefinition,
  ComponentStyle,
  LayoutNode,
  EventAction,
  Condition,
  ConditionalStyle,
  Iterator,
  ElementAnimations,
  Animation,
  DataBinding,
} from './schema'

// =============================================================================
// Main Generator
// =============================================================================

export function intentToMirror(intent: Intent): string {
  const sections: string[] = []

  // 1. Tokens
  const tokensCode = generateTokens(intent.tokens)
  if (tokensCode) {
    sections.push(tokensCode)
  }

  // 2. Components
  const componentsCode = generateComponents(intent.components)
  if (componentsCode) {
    sections.push(componentsCode)
  }

  // 3. Layout
  const layoutCode = generateLayout(intent.layout)
  if (layoutCode) {
    sections.push(layoutCode)
  }

  return sections.join('\n\n')
}

// =============================================================================
// Token Generation
// =============================================================================

function generateTokens(tokens: TokenDefinitions): string {
  const lines: string[] = []

  // Colors
  if (tokens.colors) {
    for (const [name, value] of Object.entries(tokens.colors)) {
      lines.push(`$${name}: ${value}`)
    }
  }

  // Spacing
  if (tokens.spacing) {
    for (const [name, value] of Object.entries(tokens.spacing)) {
      lines.push(`$${name}: ${value}`)
    }
  }

  // Radii
  if (tokens.radii) {
    for (const [name, value] of Object.entries(tokens.radii)) {
      lines.push(`$${name}: ${value}`)
    }
  }

  // Sizes
  if (tokens.sizes) {
    for (const [name, value] of Object.entries(tokens.sizes)) {
      lines.push(`$${name}: ${value}`)
    }
  }

  return lines.join('\n')
}

// =============================================================================
// Component Generation
// =============================================================================

function generateComponents(components: ComponentDefinition[]): string {
  const lines: string[] = []

  for (const comp of components) {
    const styleParts = generateStyleParts(comp.style)
    const styleStr = styleParts.join(' ')

    if (comp.base) {
      // Inheritance: MyButton from Button: ...
      lines.push(`${comp.name} from ${comp.base}: ${styleStr}`)
    } else {
      // Definition: MyComponent: ...
      lines.push(`${comp.name}: ${styleStr}`)
    }

    // Slots
    if (comp.slots) {
      for (const slot of comp.slots) {
        lines.push(`  ${slot}:`)
      }
    }

    // States
    if (comp.states) {
      for (const [stateName, stateStyle] of Object.entries(comp.states)) {
        const stateStyleParts = generateStyleParts(stateStyle)
        lines.push(`  state ${stateName}`)
        for (const part of stateStyleParts) {
          lines.push(`    ${part}`)
        }
      }
    }
  }

  return lines.join('\n')
}

function generateStyleParts(style: ComponentStyle): string[] {
  const parts: string[] = []

  // ===================
  // Direction
  // ===================
  if (style.direction === 'horizontal') parts.push('hor')
  if (style.direction === 'vertical') parts.push('ver')

  // ===================
  // Alignment
  // ===================
  if (style.alignHorizontal === 'left') parts.push('hor-l')
  if (style.alignHorizontal === 'center') parts.push('hor-cen')
  if (style.alignHorizontal === 'right') parts.push('hor-r')
  if (style.alignVertical === 'top') parts.push('ver-t')
  if (style.alignVertical === 'center') parts.push('ver-cen')
  if (style.alignVertical === 'bottom') parts.push('ver-b')
  if (style.center) parts.push('cen')

  // ===================
  // Flex
  // ===================
  if (style.grow === true) parts.push('grow')
  if (typeof style.grow === 'number') parts.push(`grow ${style.grow}`)
  if (style.shrink !== undefined) parts.push(`shrink ${style.shrink}`)
  if (style.wrap) parts.push('wrap')
  if (style.between) parts.push('between')
  if (style.stacked) parts.push('stacked')

  // ===================
  // Sizing
  // ===================
  if (style.full) parts.push('full')
  if (style.width !== undefined) parts.push(`w ${formatValue(style.width)}`)
  if (style.height !== undefined) parts.push(`h ${formatValue(style.height)}`)
  if (style.minWidth !== undefined) parts.push(`minw ${formatValue(style.minWidth)}`)
  if (style.maxWidth !== undefined) parts.push(`maxw ${formatValue(style.maxWidth)}`)
  if (style.minHeight !== undefined) parts.push(`minh ${formatValue(style.minHeight)}`)
  if (style.maxHeight !== undefined) parts.push(`maxh ${formatValue(style.maxHeight)}`)

  // ===================
  // Spacing
  // ===================
  if (style.gap !== undefined) parts.push(`gap ${formatValue(style.gap)}`)
  if (style.padding !== undefined) {
    if (Array.isArray(style.padding)) {
      parts.push(`pad ${style.padding.join(' ')}`)
    } else {
      parts.push(`pad ${formatValue(style.padding)}`)
    }
  }
  if (style.margin !== undefined) {
    if (Array.isArray(style.margin)) {
      parts.push(`mar ${style.margin.join(' ')}`)
    } else {
      parts.push(`mar ${formatValue(style.margin)}`)
    }
  }

  // ===================
  // Colors
  // ===================
  if (style.background !== undefined) parts.push(`bg ${style.background}`)
  if (style.color !== undefined) parts.push(`col ${style.color}`)
  if (style.borderColor !== undefined) parts.push(`boc ${style.borderColor}`)

  // ===================
  // Border
  // ===================
  if (style.radius !== undefined) {
    if (Array.isArray(style.radius)) {
      parts.push(`rad ${style.radius.join(' ')}`)
    } else {
      parts.push(`rad ${formatValue(style.radius)}`)
    }
  }
  if (style.border !== undefined) {
    if (typeof style.border === 'number') {
      parts.push(`bor ${style.border}`)
    } else {
      const { width = 1, style: borderStyle, color } = style.border
      const borderParts: (string | number)[] = [width]
      if (borderStyle) borderParts.push(borderStyle)
      if (color) borderParts.push(color)
      parts.push(`bor ${borderParts.join(' ')}`)
    }
  }
  if (style.borderTop !== undefined) parts.push(`bor u ${style.borderTop}`)
  if (style.borderRight !== undefined) parts.push(`bor r ${style.borderRight}`)
  if (style.borderBottom !== undefined) parts.push(`bor d ${style.borderBottom}`)
  if (style.borderLeft !== undefined) parts.push(`bor l ${style.borderLeft}`)

  // ===================
  // Typography
  // ===================
  if (style.fontSize !== undefined) parts.push(`size ${formatValue(style.fontSize)}`)
  if (style.fontWeight !== undefined) parts.push(`weight ${style.fontWeight}`)
  if (style.fontFamily !== undefined) parts.push(`font "${style.fontFamily}"`)
  if (style.lineHeight !== undefined) parts.push(`line ${style.lineHeight}`)
  if (style.textAlign !== undefined) parts.push(`align ${style.textAlign}`)
  if (style.italic) parts.push('italic')
  if (style.underline) parts.push('underline')
  if (style.uppercase) parts.push('uppercase')
  if (style.lowercase) parts.push('lowercase')
  if (style.truncate) parts.push('truncate')

  // ===================
  // Visual Effects
  // ===================
  if (style.shadow !== undefined) parts.push(`shadow ${style.shadow}`)
  if (style.opacity !== undefined) parts.push(`opa ${style.opacity}`)
  if (style.cursor !== undefined) parts.push(`cursor ${style.cursor}`)

  // ===================
  // Scroll
  // ===================
  if (style.scroll === 'vertical') parts.push('scroll')
  if (style.scroll === 'horizontal') parts.push('scroll-hor')
  if (style.scroll === 'both') parts.push('scroll-both')
  if (style.clip) parts.push('clip')

  // ===================
  // Position
  // ===================
  if (style.position === 'absolute') parts.push('absolute')
  if (style.position === 'fixed') parts.push('fixed')
  if (style.top !== undefined) parts.push(`top ${style.top}`)
  if (style.right !== undefined) parts.push(`right ${style.right}`)
  if (style.bottom !== undefined) parts.push(`bottom ${style.bottom}`)
  if (style.left !== undefined) parts.push(`left ${style.left}`)
  if (style.zIndex !== undefined) parts.push(`z ${style.zIndex}`)

  // ===================
  // Grid
  // ===================
  if (style.grid !== undefined) {
    if (Array.isArray(style.grid)) {
      parts.push(`grid ${style.grid.join(' ')}`)
    } else {
      parts.push(`grid ${style.grid}`)
    }
  }
  if (style.gridGap !== undefined) parts.push(`gap ${formatValue(style.gridGap)}`)

  // ===================
  // Visibility
  // ===================
  if (style.hidden) parts.push('hidden')
  if (style.disabled) parts.push('disabled')

  // ===================
  // Hover Shorthand
  // ===================
  if (style.hoverBackground !== undefined) parts.push(`hover-bg ${style.hoverBackground}`)
  if (style.hoverColor !== undefined) parts.push(`hover-col ${style.hoverColor}`)
  if (style.hoverScale !== undefined) parts.push(`hover-scale ${style.hoverScale}`)
  if (style.hoverOpacity !== undefined) parts.push(`hover-opacity ${style.hoverOpacity}`)
  if (style.hoverBorderColor !== undefined) parts.push(`hover-boc ${style.hoverBorderColor}`)

  // ===================
  // Icons
  // ===================
  if (style.icon !== undefined) parts.push(`icon "${style.icon}"`)

  return parts
}

function formatValue(value: string | number): string {
  if (typeof value === 'string') {
    return value // Token reference like "$spacing-md"
  }
  return String(value)
}

// =============================================================================
// Condition Generation
// =============================================================================

function generateCondition(condition: Condition): string {
  switch (condition.type) {
    case 'var':
      return condition.variable || ''

    case 'not':
      if (condition.operand) {
        return `not ${generateCondition(condition.operand)}`
      }
      return ''

    case 'and':
      if (condition.left && condition.right) {
        return `${generateCondition(condition.left)} and ${generateCondition(condition.right)}`
      }
      return ''

    case 'or':
      if (condition.left && condition.right) {
        return `(${generateCondition(condition.left)} or ${generateCondition(condition.right)})`
      }
      return ''

    case 'comparison':
      if (condition.left && condition.operator !== undefined && condition.value !== undefined) {
        const leftStr = generateCondition(condition.left)
        const valueStr = typeof condition.value === 'string' ? `"${condition.value}"` : String(condition.value)
        return `${leftStr} ${condition.operator} ${valueStr}`
      }
      return ''

    default:
      return ''
  }
}

function generateConditionalStyle(conditionalStyles: ConditionalStyle[]): string[] {
  const parts: string[] = []
  for (const cs of conditionalStyles) {
    const condStr = generateCondition(cs.condition)
    const thenParts = generateStyleParts(cs.then)
    if (cs.else) {
      const elseParts = generateStyleParts(cs.else)
      parts.push(`if ${condStr} then ${thenParts.join(' ')} else ${elseParts.join(' ')}`)
    } else {
      parts.push(`if ${condStr} then ${thenParts.join(' ')}`)
    }
  }
  return parts
}

// =============================================================================
// Layout Generation
// =============================================================================

function generateLayout(nodes: LayoutNode[], indent = 0): string {
  const lines: string[] = []
  const prefix = '  '.repeat(indent)

  for (const node of nodes) {
    // Check for data binding
    if (node.dataBinding) {
      const dataStr = generateDataBinding(node.dataBinding)
      lines.push(`${prefix}${dataStr}`)
      // Generate the bound node content at next indent level
      lines.push(generateLayoutNodeContent(node, indent + 1))
      continue
    }

    // Check for iterator
    if (node.iterator) {
      const iterStr = generateIterator(node.iterator)
      lines.push(`${prefix}${iterStr}`)
      // Generate the iterated node content at next indent level
      lines.push(generateLayoutNodeContent(node, indent + 1))
      continue
    }

    // Check for conditional rendering
    if (node.condition) {
      const condStr = generateCondition(node.condition)
      lines.push(`${prefix}if ${condStr}`)
      // Generate the conditioned node content at next indent level
      lines.push(generateLayoutNodeContent(node, indent + 1))
      // Handle else branch
      if (node.elseChildren && node.elseChildren.length > 0) {
        lines.push(`${prefix}else`)
        lines.push(generateLayout(node.elseChildren, indent + 1))
      }
      continue
    }

    lines.push(generateLayoutNodeContent(node, indent))
  }

  return lines.join('\n')
}

function generateDataBinding(dataBinding: DataBinding): string {
  // Generate: data Tasks
  // or: data Tasks where done == false
  let result = `data ${dataBinding.typeName}`
  if (dataBinding.filter) {
    result += ` where ${generateCondition(dataBinding.filter)}`
  }
  return result
}

function generateIterator(iterator: Iterator): string {
  // Generate: each $item in $items
  // or: each $item in $data.items
  const source = iterator.sourcePath
    ? `$${iterator.sourcePath.join('.')}`
    : iterator.source
  return `each ${iterator.itemVariable} in ${source}`
}

function generateAnimations(animations: ElementAnimations, prefix: string): string[] {
  const lines: string[] = []

  // Show animation: show fade slide-up 300
  if (animations.show) {
    const parts = ['show', ...animations.show.types]
    if (animations.show.duration !== undefined) {
      parts.push(String(animations.show.duration))
    }
    lines.push(prefix + parts.join(' '))
  }

  // Hide animation: hide fade 200
  if (animations.hide) {
    const parts = ['hide', ...animations.hide.types]
    if (animations.hide.duration !== undefined) {
      parts.push(String(animations.hide.duration))
    }
    lines.push(prefix + parts.join(' '))
  }

  // Continuous animation: animate spin 1000
  if (animations.continuous) {
    const parts = ['animate', ...animations.continuous.types]
    if (animations.continuous.duration !== undefined) {
      parts.push(String(animations.continuous.duration))
    }
    lines.push(prefix + parts.join(' '))
  }

  return lines
}

function generatePrimitiveProperties(node: LayoutNode): string[] {
  const parts: string[] = []

  // Input type: type email
  if (node.inputType) {
    parts.push(`type ${node.inputType}`)
  }

  // Placeholder: placeholder "Enter email..."
  if (node.placeholder) {
    parts.push(`placeholder "${node.placeholder}"`)
  }

  // Rows (textarea): rows 5
  if (node.rows !== undefined) {
    parts.push(`rows ${node.rows}`)
  }

  // Image properties
  if (node.src) {
    parts.push(`src "${node.src}"`)
  }
  if (node.alt) {
    parts.push(`alt "${node.alt}"`)
  }
  if (node.fit) {
    parts.push(`fit ${node.fit}`)
  }

  // Link properties
  if (node.href) {
    parts.push(`href "${node.href}"`)
  }
  if (node.target) {
    parts.push(`target ${node.target}`)
  }

  // Slider/range properties
  if (node.min !== undefined) {
    parts.push(`min ${node.min}`)
  }
  if (node.max !== undefined) {
    parts.push(`max ${node.max}`)
  }
  if (node.step !== undefined) {
    parts.push(`step ${node.step}`)
  }
  if (node.value !== undefined) {
    if (typeof node.value === 'string') {
      parts.push(`value "${node.value}"`)
    } else {
      parts.push(`value ${node.value}`)
    }
  }

  return parts
}

function generateLayoutNodeContent(node: LayoutNode, indent: number): string {
  const lines: string[] = []
  const prefix = '  '.repeat(indent)

  // List item prefix
  const listItemPrefix = node.isListItem ? '- ' : ''

  // Default to "Box" if component is missing
  const componentName = node.component || 'Box'
  const parts: string[] = [listItemPrefix + componentName]

  // ID (named instance)
  if (node.id) {
    parts.push(`named ${node.id}`)
  }

  // Inline styles
  if (node.style) {
    const styleParts = generateStyleParts(node.style)
    parts.push(...styleParts)
  }

  // Conditional styles: if $active then bg #F00 else bg #333
  if (node.conditionalStyle && node.conditionalStyle.length > 0) {
    const condStyleParts = generateConditionalStyle(node.conditionalStyle)
    parts.push(...condStyleParts)
  }

  // Primitive-specific properties
  const primitiveParts = generatePrimitiveProperties(node)
  parts.push(...primitiveParts)

  // Text content (always last)
  if (node.text) {
    parts.push(`"${node.text}"`)
  }

  lines.push(prefix + parts.join(' '))

  // Events
  if (node.events) {
    for (const [event, actions] of Object.entries(node.events)) {
      for (const action of actions) {
        const actionStr = formatAction(action)
        lines.push(`${prefix}  ${event} ${actionStr}`)
      }
    }
  }

  // Animations
  if (node.animations) {
    const animLines = generateAnimations(node.animations, prefix + '  ')
    if (animLines.length > 0) {
      lines.push(...animLines)
    }
  }

  // Slots
  if (node.slots) {
    for (const [slotName, slotContent] of Object.entries(node.slots)) {
      if (typeof slotContent === 'string') {
        lines.push(`${prefix}  ${slotName} "${slotContent}"`)
      } else if (Array.isArray(slotContent)) {
        lines.push(`${prefix}  ${slotName}`)
        for (const child of slotContent) {
          lines.push(generateLayout([child], indent + 2))
        }
      } else {
        const childLines = generateLayout([slotContent], indent + 1)
        // Replace first line's component with slot name
        const childParts = childLines.split('\n')
        if (childParts[0]) {
          childParts[0] = `${prefix}  ${slotName} ${childParts[0].trim().split(' ').slice(1).join(' ')}`.trim()
        }
        lines.push(childParts.join('\n'))
      }
    }
  }

  // Children
  if (node.children && node.children.length > 0) {
    lines.push(generateLayout(node.children, indent + 1))
  }

  return lines.join('\n')
}

function formatAction(action: EventAction): string {
  // Handle conditional actions
  if (action.condition) {
    const condStr = generateCondition(action.condition)
    const parts: string[] = [`if ${condStr}`, action.action]
    if (action.target) parts.push(action.target)
    if (action.position) parts.push(action.position)
    if (action.animation) parts.push(action.animation)
    if (action.duration) parts.push(String(action.duration))
    if (action.value) parts.push(action.value)
    return parts.join(' ')
  }

  const parts: string[] = [action.action]

  if (action.target) parts.push(action.target)
  if (action.position) parts.push(action.position)
  if (action.animation) parts.push(action.animation)
  if (action.duration) parts.push(String(action.duration))
  if (action.value) parts.push(action.value)

  return parts.join(' ')
}
