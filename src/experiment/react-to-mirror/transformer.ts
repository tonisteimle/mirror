/**
 * Mirror Document to DSL Transformer
 *
 * Transforms the parsed MirrorDocument schema into Mirror DSL code.
 * This is the final step: React → Schema → Mirror DSL
 */

import type {
  MirrorDocument,
  TokenDefinition,
  ComponentDefinition,
  ComponentInstance,
  Action,
  StateDefinition,
  EventHandlers,
  MirrorStyles,
  Conditional,
  Iterator,
  SlotDefinition,
  InlineConditional,
} from './schema'

// =============================================================================
// COVERAGE TRACKING
// =============================================================================

export interface TransformationCoverage {
  /** Properties that were successfully transformed */
  transformed: Set<string>
  /** Properties that were ignored (not mapped) */
  ignored: Set<string>
  /** Total property occurrences */
  totalProperties: number
  /** Transformed property occurrences */
  transformedCount: number
  /** Ignored property occurrences */
  ignoredCount: number
}

// Global coverage tracker for the current transformation
let currentCoverage: TransformationCoverage | null = null

function resetCoverage(): void {
  currentCoverage = {
    transformed: new Set(),
    ignored: new Set(),
    totalProperties: 0,
    transformedCount: 0,
    ignoredCount: 0,
  }
}

function trackTransformed(property: string): void {
  if (currentCoverage) {
    currentCoverage.transformed.add(property)
    currentCoverage.totalProperties++
    currentCoverage.transformedCount++
  }
}

function trackIgnored(property: string): void {
  if (currentCoverage) {
    currentCoverage.ignored.add(property)
    currentCoverage.totalProperties++
    currentCoverage.ignoredCount++
  }
}

export function getCoverage(): TransformationCoverage | null {
  return currentCoverage
}

export function getCoverageReport(): string {
  if (!currentCoverage) return 'No coverage data available'

  const rate = currentCoverage.totalProperties > 0
    ? Math.round((currentCoverage.transformedCount / currentCoverage.totalProperties) * 100)
    : 100

  const lines = [
    `Coverage: ${rate}% (${currentCoverage.transformedCount}/${currentCoverage.totalProperties})`,
    ``,
    `Transformed properties (${currentCoverage.transformed.size}):`,
    ...Array.from(currentCoverage.transformed).sort().map(p => `  ✓ ${p}`),
  ]

  if (currentCoverage.ignored.size > 0) {
    lines.push(``)
    lines.push(`Ignored properties (${currentCoverage.ignored.size}):`)
    lines.push(...Array.from(currentCoverage.ignored).sort().map(p => `  ✗ ${p}`))
  }

  return lines.join('\n')
}

// =============================================================================
// MAIN TRANSFORMER
// =============================================================================

export function transformToMirror(doc: MirrorDocument): string {
  // Reset coverage tracking
  resetCoverage()
  const lines: string[] = []

  // 1. Generate tokens
  if (doc.tokens.palette.length > 0 || doc.tokens.semantic.length > 0) {
    lines.push(...generateTokens(doc.tokens))
    lines.push('')
  }

  // 2. Generate variables
  if (doc.variables && Object.keys(doc.variables).length > 0) {
    lines.push(...generateVariables(doc.variables))
    lines.push('')
  }

  // 3. Generate component definitions
  if (doc.definitions.length > 0) {
    lines.push(...generateDefinitions(doc.definitions))
    lines.push('')
  }

  // 4. Generate layout instances
  if (doc.layout.length > 0) {
    lines.push(...generateLayout(doc.layout, 0))
  }

  // 5. Generate centralized events (if any)
  if (doc.events && Object.keys(doc.events).length > 0) {
    lines.push('')
    lines.push(...generateCentralizedEvents(doc.events))
  }

  return lines.join('\n').trim()
}

// =============================================================================
// TOKEN NAME CONVERSION
// =============================================================================

/**
 * Normalize token names to Mirror DSL format.
 * Mirror uses dot notation for semantic tokens: $primary.bg, $lg.gap
 *
 * If LLM generates dash format, convert to dots:
 *   $surface-bg → $surface.bg
 *   $primary-col → $primary.col
 *   $lg-gap → $lg.gap
 *   $primary-hover-bg → $primary.hover.bg
 *
 * Keep already valid formats as-is:
 *   $primary.bg → $primary.bg
 *   $blue-500 → $blue-500 (palette token, keep as-is)
 */
function convertTokenName(name: string): string {
  // Property suffixes that MUST be separated by dots (come at the END of a token)
  const propertySuffixes = ['bg', 'col', 'pad', 'gap', 'rad', 'font', 'size']

  // Known compound prefixes that should stay together with dashes
  // e.g., on-primary, primary-hover are semantic groups
  const compoundPrefixes = ['on', 'primary', 'hover', 'focus', 'active', 'disabled', 'default', 'muted', 'heading', 'surface', 'elevated', 'danger', 'success', 'warning', 'input', 'app']

  // If the name already has dots, trust the existing structure
  if (name.includes('.')) {
    return name
  }

  // Split by dashes
  const parts = name.split('-')

  if (parts.length === 1) {
    return name
  }

  // Find the last property suffix
  let suffixIndex = -1
  for (let i = parts.length - 1; i >= 0; i--) {
    if (propertySuffixes.includes(parts[i])) {
      suffixIndex = i
      break
    }
  }

  if (suffixIndex === -1) {
    // No property suffix found - keep everything with dashes (e.g., blue-500)
    return name
  }

  // Split into prefix (with dashes) and suffix (with dots)
  const prefixParts = parts.slice(0, suffixIndex)
  const suffixParts = parts.slice(suffixIndex)

  const prefix = prefixParts.join('-')
  const suffix = suffixParts.join('.')

  return prefix ? `${prefix}.${suffix}` : suffix
}

/**
 * Convert token references in a string value to proper Mirror format.
 * Converts dash-separated semantic tokens to dot notation.
 */
function convertTokenRefs(value: string): string {
  if (typeof value !== 'string') return value

  // Match $word-word patterns and convert semantic dashes to dots
  return value.replace(/\$[\w.-]+/g, (match) => {
    // Remove the $ prefix, convert, then add it back
    const tokenName = match.slice(1)
    return '$' + convertTokenName(tokenName)
  })
}

// =============================================================================
// TOKEN GENERATION
// =============================================================================

function generateTokens(tokens: { palette: TokenDefinition[]; semantic: TokenDefinition[] }): string[] {
  const lines: string[] = []

  // Palette tokens first (raw values)
  for (const token of tokens.palette) {
    const name = convertTokenName(token.name)
    let value = typeof token.value === 'object' && 'ref' in token.value
      ? token.value.ref
      : token.value
    // Convert any token references in the value
    if (typeof value === 'string') {
      value = convertTokenRefs(value)
    }
    lines.push(`$${name}: ${value}`)
  }

  // Then semantic tokens
  for (const token of tokens.semantic) {
    const name = convertTokenName(token.name)
    let value = typeof token.value === 'object' && 'ref' in token.value
      ? token.value.ref
      : token.value
    // Convert any token references in the value
    if (typeof value === 'string') {
      value = convertTokenRefs(value)
    }
    lines.push(`$${name}: ${value}`)
  }

  return lines
}

// =============================================================================
// VARIABLE GENERATION
// =============================================================================

function generateVariables(variables: Record<string, string | number | boolean | null>): string[] {
  const lines: string[] = []

  for (const [name, value] of Object.entries(variables)) {
    if (value === null) {
      lines.push(`${name}: null`)
    } else if (typeof value === 'string') {
      lines.push(`${name}: "${value}"`)
    } else {
      lines.push(`${name}: ${value}`)
    }
  }

  return lines
}

// =============================================================================
// DEFINITION GENERATION
// =============================================================================

function generateDefinitions(definitions: ComponentDefinition[]): string[] {
  const lines: string[] = []

  for (const def of definitions) {
    lines.push(...generateDefinition(def))
    lines.push('')
  }

  // Remove trailing empty line
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines
}

function generateDefinition(def: ComponentDefinition): string[] {
  const lines: string[] = []

  // Definition line with optional inheritance
  let defLine = `${def.name}:`
  if (def.extends) {
    defLine = `${def.name}: ${def.extends}`
  }

  // Add base styles inline if simple
  const baseStyles = generateStyles(def.styles)
  if (baseStyles && !def.states && !def.slots && !def.events && !def.children) {
    defLine += ` ${baseStyles}`
    lines.push(defLine)
    return lines
  }

  // Complex definition - multiline
  if (baseStyles) {
    defLine += ` ${baseStyles}`
  }
  lines.push(defLine)

  // Generate states
  if (def.states && def.states.length > 0) {
    for (const state of def.states) {
      lines.push(...generateState(state, 2))
    }
  }

  // Generate slots as children placeholders
  if (def.slots && def.slots.length > 0) {
    for (const slot of def.slots) {
      lines.push(`  ${slot.name}:`)
    }
  }

  // Generate events
  if (def.events) {
    lines.push(...generateEvents(def.events, 2))
  }

  // Generate children
  if (def.children) {
    for (const child of def.children) {
      if (typeof child === 'string') {
        lines.push(`  "${child}"`)
      } else if ('name' in child && 'defaultContent' in child) {
        // Slot definition
        lines.push(`  ${child.name}:`)
      } else {
        lines.push(...generateInstance(child as ComponentInstance, 2))
      }
    }
  }

  // Generate animations
  if (def.showAnimation) {
    lines.push(`  show ${def.showAnimation.type} ${def.showAnimation.duration}`)
  }
  if (def.hideAnimation) {
    lines.push(`  hide ${def.hideAnimation.type} ${def.hideAnimation.duration}`)
  }
  if (def.animate) {
    lines.push(`  animate ${def.animate.type} ${def.animate.duration}`)
  }

  return lines
}

// =============================================================================
// STYLE GENERATION
// =============================================================================

/**
 * Format a style value, converting any token references from dot to dash format.
 * Also handles string representations of arrays like "['$sm-pad', '$lg-pad']"
 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) return ''

  if (typeof value === 'string') {
    // Check if the string looks like a JSON array: ['value1', 'value2'] or ["value1", "value2"]
    const arrayMatch = value.match(/^\s*\[([^\]]+)\]\s*$/)
    if (arrayMatch) {
      // Parse the array-like string and format each element
      const elements = arrayMatch[1]
        .split(',')
        .map(s => s.trim().replace(/^['"]|['"]$/g, '')) // Remove quotes
        .map(s => convertTokenRefs(s))
      return elements.join(' ')
    }
    return convertTokenRefs(value)
  }

  if (Array.isArray(value)) {
    return value.map(v => formatValue(v)).join(' ')
  }

  return String(value)
}

// Set of all properties that generateStyles handles
const HANDLED_PROPERTIES = new Set([
  'layout', 'direction', 'gridTemplateColumns', 'align', 'alignItems', 'justifyContent',
  'gap', 'wrap', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'grow', 'flex', 'flexGrow', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'background', 'backgroundColor', 'color', 'borderColor',
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderRadius', 'radius',
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'textAlign', 'italic', 'underline',
  'truncate', 'uppercase', 'lowercase', 'opacity', 'shadow', 'boxShadow', 'cursor', 'zIndex', 'hidden',
  'disabled', 'rotate', 'transform', 'overflow', 'scroll', 'clip', 'position', 'top', 'right',
  'bottom', 'left',
])

function generateStyles(styles: MirrorStyles): string {
  const parts: string[] = []

  // Layout
  if (styles.layout === 'horizontal' || styles.direction === 'row') {
    parts.push('hor')
  }
  if (styles.layout === 'stacked') {
    parts.push('stacked')
  }

  // Grid layout - extract column count from gridTemplateColumns
  if (styles.gridTemplateColumns) {
    const colMatch = styles.gridTemplateColumns.match(/repeat\((\d+)/)
    if (colMatch) {
      parts.push(`grid ${colMatch[1]}`)
    }
  }

  // Alignment
  if (styles.align === 'center' || (styles.alignItems === 'center' && styles.justifyContent === 'center')) {
    parts.push('center')
  } else {
    if (styles.alignItems === 'center') {
      parts.push('ver-center')
    } else if (styles.alignItems === 'start' || styles.alignItems === 'flex-start') {
      parts.push('top')
    } else if (styles.alignItems === 'end' || styles.alignItems === 'flex-end') {
      parts.push('bottom')
    } else if (styles.alignItems === 'stretch') {
      parts.push('stretch')
    }

    if (styles.justifyContent === 'center') {
      parts.push('hor-center')
    } else if (styles.justifyContent === 'between' || styles.justifyContent === 'space-between') {
      parts.push('spread')
    } else if (styles.justifyContent === 'start' || styles.justifyContent === 'flex-start') {
      parts.push('left')
    } else if (styles.justifyContent === 'end' || styles.justifyContent === 'flex-end') {
      parts.push('right')
    } else if (styles.justifyContent === 'around' || styles.justifyContent === 'space-around') {
      parts.push('around')
    } else if (styles.justifyContent === 'evenly' || styles.justifyContent === 'space-evenly') {
      parts.push('evenly')
    }
  }

  // Wrap (before gap for better grouping)
  if (styles.wrap) {
    parts.push('wrap')
  }

  // Gap
  if (styles.gap !== undefined) {
    parts.push(`gap ${formatValue(styles.gap)}`)
  }

  // Sizing
  if (styles.width !== undefined) {
    if (styles.width === 'full') {
      parts.push('w full')
    } else if (styles.width === 'hug') {
      parts.push('w hug')
    } else {
      parts.push(`w ${formatValue(styles.width)}`)
    }
  }

  if (styles.height !== undefined) {
    if (styles.height === 'full') {
      parts.push('h full')
    } else if (styles.height === 'hug') {
      parts.push('h hug')
    } else {
      parts.push(`h ${formatValue(styles.height)}`)
    }
  }

  if (styles.minWidth !== undefined) {
    parts.push(`min-w ${formatValue(styles.minWidth)}`)
  }
  if (styles.maxWidth !== undefined) {
    parts.push(`max-w ${formatValue(styles.maxWidth)}`)
  }
  if (styles.minHeight !== undefined) {
    parts.push(`min-h ${formatValue(styles.minHeight)}`)
  }
  if (styles.maxHeight !== undefined) {
    parts.push(`max-h ${formatValue(styles.maxHeight)}`)
  }

  if (styles.grow) {
    parts.push('grow')
  }

  // Flex shorthand (flex: 1 → grow)
  if (styles.flex !== undefined && (styles.flex === 1 || styles.flex === '1')) {
    parts.push('grow')
  }

  // flexGrow
  if (styles.flexGrow !== undefined && styles.flexGrow) {
    parts.push('grow')
  }

  // Padding
  if (styles.padding !== undefined) {
    parts.push(`pad ${formatValue(styles.padding)}`)
  }

  // Directional padding
  if (styles.paddingTop !== undefined) {
    parts.push(`pad top ${formatValue(styles.paddingTop)}`)
  }
  if (styles.paddingRight !== undefined) {
    parts.push(`pad right ${formatValue(styles.paddingRight)}`)
  }
  if (styles.paddingBottom !== undefined) {
    parts.push(`pad bottom ${formatValue(styles.paddingBottom)}`)
  }
  if (styles.paddingLeft !== undefined) {
    parts.push(`pad left ${formatValue(styles.paddingLeft)}`)
  }

  // Margin
  if (styles.margin !== undefined) {
    parts.push(`mar ${formatValue(styles.margin)}`)
  }

  // Directional margin
  if (styles.marginTop !== undefined) {
    parts.push(`mar top ${formatValue(styles.marginTop)}`)
  }
  if (styles.marginRight !== undefined) {
    parts.push(`mar right ${formatValue(styles.marginRight)}`)
  }
  if (styles.marginBottom !== undefined) {
    parts.push(`mar bottom ${formatValue(styles.marginBottom)}`)
  }
  if (styles.marginLeft !== undefined) {
    parts.push(`mar left ${formatValue(styles.marginLeft)}`)
  }

  // Colors
  if (styles.background || styles.backgroundColor) {
    const bg = styles.background || styles.backgroundColor
    parts.push(`bg ${formatValue(bg)}`)
  }

  if (styles.color) {
    parts.push(`col ${formatValue(styles.color)}`)
  }

  if (styles.borderColor) {
    parts.push(`boc ${formatValue(styles.borderColor)}`)
  }

  // Border
  if (styles.border !== undefined) {
    parts.push(`bor ${formatValue(styles.border)}`)
  }

  // Directional borders
  if (styles.borderTop !== undefined) {
    parts.push(`bor top ${formatValue(styles.borderTop)}`)
  }
  if (styles.borderRight !== undefined) {
    parts.push(`bor right ${formatValue(styles.borderRight)}`)
  }
  if (styles.borderBottom !== undefined) {
    parts.push(`bor bottom ${formatValue(styles.borderBottom)}`)
  }
  if (styles.borderLeft !== undefined) {
    parts.push(`bor left ${formatValue(styles.borderLeft)}`)
  }

  // Border radius
  if (styles.borderRadius !== undefined || styles.radius !== undefined) {
    const rad = styles.borderRadius || styles.radius
    parts.push(`rad ${formatValue(rad)}`)
  }

  // Typography
  if (styles.fontSize !== undefined) {
    parts.push(`size ${formatValue(styles.fontSize)}`)
  }

  if (styles.fontWeight !== undefined) {
    parts.push(`weight ${formatValue(styles.fontWeight)}`)
  }

  if (styles.fontFamily !== undefined) {
    parts.push(`font "${styles.fontFamily}"`)
  }

  if (styles.lineHeight !== undefined) {
    parts.push(`line ${styles.lineHeight}`)
  }

  if (styles.textAlign !== undefined) {
    parts.push(`align ${styles.textAlign}`)
  }

  if (styles.italic) {
    parts.push('italic')
  }

  if (styles.underline) {
    parts.push('underline')
  }

  if (styles.truncate) {
    parts.push('truncate')
  }

  if (styles.uppercase) {
    parts.push('uppercase')
  }

  if (styles.lowercase) {
    parts.push('lowercase')
  }

  // Visuals
  if (styles.opacity !== undefined) {
    parts.push(`o ${styles.opacity}`)
  }

  if (styles.shadow !== undefined && styles.shadow !== 'none') {
    parts.push(`shadow ${styles.shadow}`)
  }

  // boxShadow → shadow (map CSS naming to Mirror naming)
  if (styles.boxShadow !== undefined) {
    // Try to extract shadow size from CSS box-shadow
    const shadowStr = String(styles.boxShadow).toLowerCase()
    if (shadowStr.includes('lg') || shadowStr.includes('24px') || shadowStr.includes('16px')) {
      parts.push('shadow lg')
    } else if (shadowStr.includes('sm') || shadowStr.includes('2px') || shadowStr.includes('1px')) {
      parts.push('shadow sm')
    } else {
      parts.push('shadow md') // Default to medium
    }
  }

  if (styles.cursor !== undefined && styles.cursor !== 'default') {
    parts.push(`cursor ${styles.cursor}`)
  }

  if (styles.zIndex !== undefined) {
    parts.push(`z ${styles.zIndex}`)
  }

  if (styles.hidden) {
    parts.push('hidden')
  }

  if (styles.disabled) {
    parts.push('disabled')
  }

  // Transform
  if (styles.rotate !== undefined) {
    parts.push(`rot ${styles.rotate}`)
  }

  if (styles.transform !== undefined) {
    parts.push(`transform ${styles.transform}`)
  }

  // Overflow
  if (styles.overflow === 'scroll' || styles.scroll) {
    parts.push('scroll')
  } else if (styles.overflow === 'hidden' || styles.clip) {
    parts.push('clip')
  }

  // Position
  if (styles.position === 'absolute') {
    parts.push('absolute')
  } else if (styles.position === 'fixed') {
    parts.push('fixed')
  } else if (styles.position === 'relative') {
    parts.push('relative')
  }

  if (styles.top !== undefined) {
    parts.push(`top ${styles.top}`)
  }
  if (styles.right !== undefined) {
    parts.push(`right ${styles.right}`)
  }
  if (styles.bottom !== undefined) {
    parts.push(`bottom ${styles.bottom}`)
  }
  if (styles.left !== undefined) {
    parts.push(`left ${styles.left}`)
  }

  // Track coverage: check which properties were actually in the styles object
  // and mark them as transformed or ignored
  for (const key of Object.keys(styles)) {
    if ((styles as Record<string, unknown>)[key] !== undefined) {
      if (HANDLED_PROPERTIES.has(key)) {
        trackTransformed(key)
      } else {
        trackIgnored(key)
      }
    }
  }

  return parts.join(', ')
}

// =============================================================================
// STATE GENERATION
// =============================================================================

function generateState(state: StateDefinition, indent: number): string[] {
  const lines: string[] = []
  const spaces = ' '.repeat(indent)
  const styles = generateStyles(state.styles)

  // System states (hover, focus, active, disabled) use short form
  const systemStates = ['hover', 'focus', 'active', 'disabled']
  if (systemStates.includes(state.name as string)) {
    lines.push(`${spaces}${state.name}`)
    if (styles) {
      lines.push(`${spaces}  ${styles}`)
    }
  } else {
    // Behavior states use "state" prefix
    lines.push(`${spaces}state ${state.name}`)
    if (styles) {
      lines.push(`${spaces}  ${styles}`)
    }
  }

  return lines
}

// =============================================================================
// EVENT GENERATION
// =============================================================================

function generateEvents(events: EventHandlers, indent: number): string[] {
  const lines: string[] = []
  const spaces = ' '.repeat(indent)

  const eventMap: Record<string, string> = {
    onClick: 'onclick',
    onClickOutside: 'onclick-outside',
    onHover: 'onhover',
    onChange: 'onchange',
    onInput: 'oninput',
    onFocus: 'onfocus',
    onBlur: 'onblur',
    onLoad: 'onload',
  }

  for (const [eventKey, eventValue] of Object.entries(events)) {
    if (!eventValue) continue

    const mirrorEvent = eventMap[eventKey] || eventKey.toLowerCase()
    const actions = Array.isArray(eventValue) ? eventValue : [eventValue]

    if (eventKey === 'onKeyDown' || eventKey === 'onKeyUp') {
      // Keyboard events with key modifiers
      const keyHandlers = eventValue as Record<string, Action | Action[]>
      for (const [key, keyActions] of Object.entries(keyHandlers)) {
        const keyActionsList = Array.isArray(keyActions) ? keyActions : [keyActions]
        const mirrorKey = key.replace('-', '-')
        for (const action of keyActionsList) {
          lines.push(`${spaces}${mirrorEvent} ${mirrorKey}: ${generateAction(action)}`)
        }
      }
    } else {
      // Regular events
      for (const action of actions) {
        lines.push(`${spaces}${mirrorEvent}: ${generateAction(action)}`)
      }
    }
  }

  return lines
}

function generateAction(action: Action): string {
  const parts: string[] = [action.action]

  if (action.target && action.target !== 'self') {
    parts.push(action.target)
  } else if (action.target === 'self') {
    parts.push('self')
  }

  if (action.variable && action.expression) {
    // assign action: assign $var to expr
    return `assign ${action.variable} to ${action.expression}`
  }

  if (action.toState) {
    parts.push('to', action.toState)
  }

  if (action.position) {
    parts.push(action.position)
  }

  if (action.animation) {
    parts.push(action.animation)
  }

  if (action.duration) {
    parts.push(String(action.duration))
  }

  if (action.message) {
    parts.push(`"${action.message}"`)
  }

  if (action.function) {
    return `call ${action.function}`
  }

  return parts.join(' ')
}

// =============================================================================
// LAYOUT GENERATION
// =============================================================================

function generateLayout(
  items: (ComponentInstance | Conditional | Iterator)[],
  indent: number
): string[] {
  const lines: string[] = []

  for (const item of items) {
    if (item.type === 'conditional') {
      lines.push(...generateConditional(item as Conditional, indent))
    } else if (item.type === 'iterator') {
      lines.push(...generateIterator(item as Iterator, indent))
    } else {
      lines.push(...generateInstance(item as ComponentInstance, indent))
    }
  }

  return lines
}

function generateInstance(instance: ComponentInstance, indent: number): string[] {
  const lines: string[] = []
  const spaces = ' '.repeat(indent)

  // Build instance line
  let line = ''

  // List item prefix
  if (instance.isListItem) {
    line += '- '
  }

  // Component name
  line += instance.component

  // Named instance
  if (instance.name) {
    line += ` named ${instance.name}`
  }

  // Inline define (as)
  if (instance.as) {
    line += ` as ${instance.as}`
  }

  // Styles
  const styleStr = instance.props ? generateStyles(instance.props as MirrorStyles) : ''

  // Props that aren't styles
  const propParts: string[] = []
  if (instance.props) {
    if (instance.props.placeholder) {
      propParts.push(`placeholder "${instance.props.placeholder}"`)
    }
    if (instance.props.inputType) {
      propParts.push(`type ${instance.props.inputType}`)
    }
    if (instance.props.src) {
      propParts.push(`"${instance.props.src}"`)
    }
    if (instance.props.href) {
      propParts.push(`href "${instance.props.href}"`)
    }
    if (instance.props.icon) {
      propParts.push(`"${instance.props.icon}"`)
    }
    if (instance.props.material) {
      propParts.push('material')
    }
  }

  // Combine all props
  const allProps = [styleStr, ...propParts].filter(Boolean).join(', ')
  if (allProps) {
    line += ` ${allProps}`
  }

  // Text content comes last
  if (instance.props?.text) {
    line += ` "${instance.props.text}"`
  }

  // Check for simple text children
  const textChild = instance.children?.find(c => typeof c === 'string' && !c.startsWith('$'))
  const hasSimpleTextOnly = textChild && instance.children?.length === 1 && typeof textChild === 'string'
  const hasEventsOrStates = instance.events || (instance.states && instance.states.length > 0)

  // Add text content to line if it's the only child
  if (hasSimpleTextOnly) {
    if (textChild.startsWith('$')) {
      line += ` ${textChild}`
    } else {
      line += ` "${textChild}"`
    }
  }

  lines.push(spaces + line)

  // Generate states
  if (instance.states && instance.states.length > 0) {
    for (const state of instance.states) {
      lines.push(...generateState(state, indent + 2))
    }
  }

  // Generate events
  if (instance.events) {
    lines.push(...generateEvents(instance.events, indent + 2))
  }

  // If we already added the text inline and there are no events/states, we're done
  if (hasSimpleTextOnly && !hasEventsOrStates) {
    return lines
  }

  // Generate children (skip text if already added inline)
  if (instance.children && instance.children.length > 0) {
    for (const child of instance.children) {
      if (typeof child === 'string') {
        // Skip if this text was already added inline
        if (hasSimpleTextOnly && child === textChild) {
          continue
        }
        if (child.startsWith('$')) {
          // Variable reference as text
          lines.push(`${spaces}  Text ${child}`)
        } else {
          // Just text - might be embedded in parent
          lines.push(`${spaces}  "${child}"`)
        }
      } else if (child.type === 'conditional') {
        lines.push(...generateConditional(child as Conditional, indent + 2))
      } else if (child.type === 'iterator') {
        lines.push(...generateIterator(child as Iterator, indent + 2))
      } else {
        lines.push(...generateInstance(child as ComponentInstance, indent + 2))
      }
    }
  }

  // Generate data binding
  if (instance.data) {
    const dataLine = `${spaces}  data ${instance.data.collection}`
    if (instance.data.where) {
      const { field, operator, value } = instance.data.where
      const valueStr = typeof value === 'string' ? `"${value}"` : value
      lines.push(`${dataLine} where ${field} ${operator} ${valueStr}`)
    } else {
      lines.push(dataLine)
    }
  }

  return lines
}

// =============================================================================
// CONDITIONAL GENERATION
// =============================================================================

function generateConditional(cond: Conditional, indent: number): string[] {
  const lines: string[] = []
  const spaces = ' '.repeat(indent)

  // If block
  lines.push(`${spaces}if ${cond.condition}`)

  // Then branch
  const thenItems = Array.isArray(cond.then) ? cond.then : [cond.then]
  for (const item of thenItems) {
    lines.push(...generateInstance(item, indent + 2))
  }

  // Else branch
  if (cond.else) {
    lines.push(`${spaces}else`)
    const elseItems = Array.isArray(cond.else) ? cond.else : [cond.else]
    for (const item of elseItems) {
      lines.push(...generateInstance(item, indent + 2))
    }
  }

  return lines
}

// =============================================================================
// ITERATOR GENERATION
// =============================================================================

function generateIterator(iter: Iterator, indent: number): string[] {
  const lines: string[] = []
  const spaces = ' '.repeat(indent)

  // Each line
  lines.push(`${spaces}each ${iter.itemVar} in ${iter.listVar}`)

  // Template
  lines.push(...generateInstance(iter.template, indent + 2))

  return lines
}

// =============================================================================
// CENTRALIZED EVENTS GENERATION
// =============================================================================

function generateCentralizedEvents(events: Record<string, EventHandlers>): string[] {
  const lines: string[] = ['events']

  for (const [componentName, handlers] of Object.entries(events)) {
    const eventLines = generateEvents(handlers, 2)
    if (eventLines.length > 0) {
      // Insert component name before first event
      const [firstEvent, ...rest] = eventLines
      lines.push(`  ${componentName} ${firstEvent.trim()}`)
      lines.push(...rest)
    }
  }

  return lines
}

// =============================================================================
// EXPORTS
// =============================================================================

export default transformToMirror
