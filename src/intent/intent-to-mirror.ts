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
// Component Generation (v1 syntax - space-separated, short aliases)
// =============================================================================

function generateComponents(components: ComponentDefinition[]): string {
  const lines: string[] = []

  for (const comp of components) {
    const styleParts = generateStyleParts(comp.style)
    const hasSlots = comp.slots && comp.slots.length > 0
    const hasStates = comp.states && Object.keys(comp.states).length > 0
    const needsMultiLine = hasSlots || hasStates

    // Build header
    let header = comp.name
    if (comp.base) {
      header = `${comp.name}: ${comp.base}`
    }

    if (needsMultiLine) {
      // Multi-line definition
      if (styleParts.length > 0) {
        lines.push(`${header}: ${styleParts.join(', ')}`)
      } else {
        lines.push(`${header}:`)
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
          if (stateStyleParts.length > 0) {
            lines.push(`  ${stateName} { ${stateStyleParts.join(', ')} }`)
          } else {
            lines.push(`  ${stateName} { }`)
          }
        }
      }
    } else {
      // Single-line definition
      if (styleParts.length > 0) {
        lines.push(`${header}: ${styleParts.join(', ')}`)
      } else {
        lines.push(`${header}:`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Generate style parts in v1 syntax - space-separated with short aliases
 * Example output: w 300, h 400, bg $surface-color, rad 8
 */
function generateStyleParts(style: ComponentStyle): string[] {
  const parts: string[] = []

  // ===================
  // Direction (boolean flags)
  // ===================
  if (style.direction === 'horizontal') parts.push('hor')
  if (style.direction === 'vertical') parts.push('ver')

  // ===================
  // Alignment (boolean flags)
  // ===================
  if (style.alignHorizontal === 'left') parts.push('hor-l')
  if (style.alignHorizontal === 'center') parts.push('hor-cen')
  if (style.alignHorizontal === 'right') parts.push('hor-r')
  if (style.alignVertical === 'top') parts.push('ver-t')
  if (style.alignVertical === 'center') parts.push('ver-cen')
  if (style.alignVertical === 'bottom') parts.push('ver-b')
  if (style.center) parts.push('cen')

  // ===================
  // Flex (boolean flags and value props)
  // ===================
  if (style.grow === true) parts.push('grow')
  if (typeof style.grow === 'number') parts.push(`grow ${style.grow}`)
  if (style.shrink !== undefined) parts.push(`shrink ${style.shrink}`)
  if (style.wrap) parts.push('wrap')
  if (style.between) parts.push('between')
  if (style.stacked) parts.push('stacked')

  // ===================
  // Sizing (v1: w 300, h 400)
  // ===================
  if (style.full) parts.push('full')
  if (style.width !== undefined) parts.push(`w ${formatValue(style.width)}`)
  if (style.height !== undefined) parts.push(`h ${formatValue(style.height)}`)
  if (style.minWidth !== undefined) parts.push(`minw ${formatValue(style.minWidth)}`)
  if (style.maxWidth !== undefined) parts.push(`maxw ${formatValue(style.maxWidth)}`)
  if (style.minHeight !== undefined) parts.push(`minh ${formatValue(style.minHeight)}`)
  if (style.maxHeight !== undefined) parts.push(`maxh ${formatValue(style.maxHeight)}`)

  // ===================
  // Spacing (v1: pad 16, mar 8, gap 12)
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
  // Colors (v1: bg #color, col #text)
  // ===================
  if (style.background !== undefined) parts.push(`bg ${style.background}`)
  if (style.color !== undefined) parts.push(`col ${style.color}`)
  if (style.borderColor !== undefined) parts.push(`boc ${style.borderColor}`)

  // ===================
  // Border (v1: rad 8, bor 1)
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
  if (style.borderTop !== undefined) parts.push(`bor t ${style.borderTop}`)
  if (style.borderRight !== undefined) parts.push(`bor r ${style.borderRight}`)
  if (style.borderBottom !== undefined) parts.push(`bor b ${style.borderBottom}`)
  if (style.borderLeft !== undefined) parts.push(`bor l ${style.borderLeft}`)

  // ===================
  // Typography (v1: size 18, weight bold)
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
  // Visual Effects (v1: shadow md, o 0.5)
  // ===================
  if (style.shadow !== undefined) parts.push(`shadow ${style.shadow}`)
  if (style.opacity !== undefined) parts.push(`o ${style.opacity}`)
  if (style.cursor !== undefined) parts.push(`cursor ${style.cursor}`)

  // ===================
  // Scroll (boolean flags)
  // ===================
  if (style.scroll === 'vertical') parts.push('scroll')
  if (style.scroll === 'horizontal') parts.push('scroll-hor')
  if (style.scroll === 'both') parts.push('scroll-both')
  if (style.clip) parts.push('clip')

  // ===================
  // Position (v1: top 0, left 0)
  // ===================
  if (style.position === 'absolute') parts.push('absolute')
  if (style.position === 'fixed') parts.push('fixed')
  if (style.top !== undefined) parts.push(`top ${style.top}`)
  if (style.right !== undefined) parts.push(`right ${style.right}`)
  if (style.bottom !== undefined) parts.push(`bottom ${style.bottom}`)
  if (style.left !== undefined) parts.push(`left ${style.left}`)
  if (style.zIndex !== undefined) parts.push(`z ${style.zIndex}`)

  // ===================
  // Grid (v1: grid 3)
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
  // Visibility (boolean flags)
  // ===================
  if (style.hidden) parts.push('hidden')
  if (style.disabled) parts.push('disabled')

  // ===================
  // Hover Shorthand (v1: hover-bg #color)
  // ===================
  if (style.hoverBackground !== undefined) parts.push(`hover-bg ${style.hoverBackground}`)
  if (style.hoverColor !== undefined) parts.push(`hover-col ${style.hoverColor}`)
  if (style.hoverScale !== undefined) parts.push(`hover-scale ${style.hoverScale}`)
  if (style.hoverOpacity !== undefined) parts.push(`hover-opa ${style.hoverOpacity}`)
  if (style.hoverBorderColor !== undefined) parts.push(`hover-boc ${style.hoverBorderColor}`)

  // ===================
  // Icons (v1: icon "name")
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
      // v1 inline conditional: if $cond then prop val else prop val2
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
    // Check for data binding (v1 syntax - indented block without braces)
    if (node.dataBinding) {
      const dataStr = generateDataBinding(node.dataBinding)
      lines.push(`${prefix}${dataStr}`)
      // Generate the bound node content at next indent level
      lines.push(generateLayoutNodeContent(node, indent + 1))
      continue
    }

    // Check for iterator (v1 syntax - indented block without braces)
    if (node.iterator) {
      const iterStr = generateIterator(node.iterator)
      lines.push(`${prefix}${iterStr}`)
      // Generate the iterated node content at next indent level
      lines.push(generateLayoutNodeContent(node, indent + 1))
      continue
    }

    // Check for conditional rendering (v1 syntax - indented block without braces)
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

/**
 * Generate layout node content in v1 syntax - comma-separated properties
 * Example: Box w 300, h 400, bg $surface-color
 */
function generateLayoutNodeContent(node: LayoutNode, indent: number): string {
  const lines: string[] = []
  const prefix = '  '.repeat(indent)

  // List item prefix
  const listItemPrefix = node.isListItem ? '- ' : ''

  // Default to "Box" if component is missing
  const componentName = node.component || 'Box'

  // Build the header: Component named Name or - Component
  let header = listItemPrefix + componentName

  // ID (named instance) - comes right after component name
  if (node.id) {
    header += ` named ${node.id}`
  }

  // Collect all inline parts (v1 style: comma-separated)
  const inlineParts: string[] = []

  // Inline styles (v1 syntax from generateStyleParts)
  if (node.style) {
    const styleParts = generateStyleParts(node.style)
    inlineParts.push(...styleParts)
  }

  // Conditional styles: if $active then bg #F00 else bg #333
  if (node.conditionalStyle && node.conditionalStyle.length > 0) {
    const condStyleParts = generateConditionalStyle(node.conditionalStyle)
    inlineParts.push(...condStyleParts)
  }

  // Primitive-specific properties (v1 style)
  const primitiveParts = generatePrimitiveProperties(node)
  inlineParts.push(...primitiveParts)

  // Text content (always last)
  if (node.text) {
    inlineParts.push(`"${node.text}"`)
  }

  // Check if we have multi-line content (events, children, etc.)
  const hasEvents = node.events && Object.keys(node.events).length > 0
  const hasAnimations = node.animations && (node.animations.show || node.animations.hide || node.animations.continuous)
  const hasSlots = node.slots && Object.keys(node.slots).length > 0
  const hasChildren = node.children && node.children.length > 0
  const needsMultiLine = hasEvents || hasAnimations || hasSlots || hasChildren

  if (needsMultiLine) {
    // Multi-line - header with inline parts, then indented children
    if (inlineParts.length > 0) {
      lines.push(`${prefix}${header} ${inlineParts.join(', ')}`)
    } else {
      lines.push(`${prefix}${header}`)
    }

    // Events (indented)
    if (node.events) {
      for (const [event, actions] of Object.entries(node.events)) {
        for (const action of actions) {
          const actionStr = formatAction(action)
          lines.push(`${prefix}  ${event}: ${actionStr}`)
        }
      }
    }

    // Animations (indented)
    if (node.animations) {
      const animLines = generateAnimations(node.animations, prefix + '  ')
      if (animLines.length > 0) {
        lines.push(...animLines)
      }
    }

    // Slots (indented)
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
          lines.push(`${prefix}  ${slotName}`)
          lines.push(generateLayout([slotContent], indent + 2))
        }
      }
    }

    // Children (indented)
    if (node.children && node.children.length > 0) {
      lines.push(generateLayout(node.children, indent + 1))
    }
  } else {
    // Single-line - all parts inline
    if (inlineParts.length > 0) {
      lines.push(`${prefix}${header} ${inlineParts.join(', ')}`)
    } else {
      lines.push(`${prefix}${header}`)
    }
  }

  return lines.join('\n')
}

/**
 * Generate primitive properties in v1 syntax (space-separated)
 * Example: type email, placeholder "Enter email..."
 */
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
