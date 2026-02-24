/**
 * Mirror Code → Intent Format Converter
 *
 * Konvertiert geparsten Mirror Code (AST) in das Intent-Format,
 * damit das LLM den bestehenden Code verstehen und modifizieren kann.
 */

import { parse } from '../parser/parser'
import type { ParseResult, ASTNode, StateDefinition, ComponentTemplate, ActionStatement, Conditional, ConditionExpr, AnimationDefinition } from '../parser/types'
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
// Main Converter
// =============================================================================

export function mirrorToIntent(
  layoutCode: string,
  componentsCode: string = '',
  tokensCode: string = ''
): Intent {
  // Parse all code sections
  const fullCode = [tokensCode, componentsCode, layoutCode].filter(Boolean).join('\n\n')
  const parseResult = parse(fullCode)

  return {
    tokens: extractTokens(tokensCode),
    components: extractComponents(parseResult),
    layout: extractLayout(parseResult.nodes),
  }
}

// =============================================================================
// Token Extraction
// =============================================================================

function extractTokens(tokensCode: string): TokenDefinitions {
  const tokens: TokenDefinitions = {
    colors: {},
    spacing: {},
    radii: {},
    sizes: {},
  }

  if (!tokensCode) return tokens

  // Parse token definitions: $name: value
  const lines = tokensCode.split('\n')
  for (const line of lines) {
    const match = line.match(/^\$([a-zA-Z0-9-_]+):\s*(.+)$/)
    if (match) {
      const [, name, value] = match
      const trimmedValue = value.trim()

      // Categorize by name or value
      if (isColorValue(trimmedValue) || name.includes('color') || name.includes('primary') || name.includes('surface') || name.includes('text')) {
        tokens.colors![name] = trimmedValue
      } else if (name.includes('spacing') || name.includes('gap') || name.includes('pad') || name.includes('mar')) {
        tokens.spacing![name] = parseFloat(trimmedValue)
      } else if (name.includes('radius') || name.includes('rad')) {
        tokens.radii![name] = parseFloat(trimmedValue)
      } else if (name.includes('size') || name.includes('font')) {
        tokens.sizes![name] = parseFloat(trimmedValue)
      } else if (isColorValue(trimmedValue)) {
        tokens.colors![name] = trimmedValue
      } else {
        // Default to spacing for numbers
        const num = parseFloat(trimmedValue)
        if (!isNaN(num)) {
          tokens.spacing![name] = num
        }
      }
    }
  }

  return tokens
}

function isColorValue(value: string): boolean {
  return value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')
}

// =============================================================================
// Component Extraction
// =============================================================================

function extractComponents(parseResult: ParseResult): ComponentDefinition[] {
  const components: ComponentDefinition[] = []

  // Get all registered component definitions
  parseResult.registry.forEach((node: ComponentTemplate, name: string) => {
    // Skip if it's a qualified name (has dot) - those are slots
    if (name.includes('.')) return

    const comp: ComponentDefinition = {
      name,
      style: extractStyle(node.properties),
    }

    // Extract slots from children definitions
    if (node.children && node.children.length > 0) {
      comp.slots = node.children
        .filter((c: ASTNode) => c.name && c.name !== '_text')
        .map((c: ASTNode) => c.name)
    }

    // Extract states
    if (node.states && node.states.length > 0) {
      comp.states = {}
      for (const state of node.states) {
        comp.states[state.name] = extractStyle(state.properties)
      }
    }

    components.push(comp)
  })

  return components
}

function extractStyle(properties: Record<string, unknown>): ComponentStyle {
  const style: ComponentStyle = {}

  // ===================
  // Direction
  // ===================
  if (properties.hor) style.direction = 'horizontal'
  if (properties.ver) style.direction = 'vertical'

  // ===================
  // Alignment
  // ===================
  if (properties['hor-l']) style.alignHorizontal = 'left'
  if (properties['hor-cen']) style.alignHorizontal = 'center'
  if (properties['hor-r']) style.alignHorizontal = 'right'
  if (properties['ver-t']) style.alignVertical = 'top'
  if (properties['ver-cen']) style.alignVertical = 'center'
  if (properties['ver-b']) style.alignVertical = 'bottom'
  if (properties.cen) style.center = true

  // ===================
  // Flex
  // ===================
  if (properties.grow !== undefined) {
    style.grow = properties.grow === true ? true : properties.grow as number
  }
  if (properties.shrink !== undefined) style.shrink = properties.shrink as number
  if (properties.wrap) style.wrap = true
  if (properties.between) style.between = true
  if (properties.stacked) style.stacked = true

  // ===================
  // Sizing
  // ===================
  if (properties.full) style.full = true
  if (properties.w !== undefined) style.width = properties.w as string | number
  if (properties.h !== undefined) style.height = properties.h as string | number
  if (properties.minw !== undefined) style.minWidth = properties.minw as string | number
  if (properties.maxw !== undefined) style.maxWidth = properties.maxw as string | number
  if (properties.minh !== undefined) style.minHeight = properties.minh as string | number
  if (properties.maxh !== undefined) style.maxHeight = properties.maxh as string | number

  // ===================
  // Spacing
  // ===================
  if (properties.gap !== undefined) style.gap = properties.gap as string | number
  if (properties.g !== undefined) style.gap = properties.g as string | number

  // Padding - could be expanded or single value
  if (properties.pad !== undefined) {
    style.padding = properties.pad as string | number
  } else if (properties.pad_u !== undefined) {
    const pad = [
      properties.pad_u as number,
      properties.pad_r as number,
      properties.pad_d as number,
      properties.pad_l as number,
    ]
    if (pad.every(p => p === pad[0])) {
      style.padding = pad[0]
    } else if (pad[0] === pad[2] && pad[1] === pad[3]) {
      style.padding = [pad[0], pad[1]]
    } else {
      style.padding = pad
    }
  }

  // Margin - same logic as padding
  if (properties.mar !== undefined) {
    style.margin = properties.mar as string | number
  } else if (properties.mar_u !== undefined) {
    const mar = [
      properties.mar_u as number,
      properties.mar_r as number,
      properties.mar_d as number,
      properties.mar_l as number,
    ]
    if (mar.every(m => m === mar[0])) {
      style.margin = mar[0]
    } else if (mar[0] === mar[2] && mar[1] === mar[3]) {
      style.margin = [mar[0], mar[1]]
    } else {
      style.margin = mar
    }
  }

  // ===================
  // Colors
  // ===================
  if (properties.bg !== undefined) style.background = properties.bg as string
  if (properties.col !== undefined) style.color = properties.col as string
  if (properties.boc !== undefined) style.borderColor = properties.boc as string

  // ===================
  // Border
  // ===================
  if (properties.rad !== undefined) style.radius = properties.rad as string | number
  if (properties.bor !== undefined) style.border = properties.bor as number

  // ===================
  // Typography
  // ===================
  if (properties.size !== undefined) style.fontSize = properties.size as string | number
  if (properties.weight !== undefined) style.fontWeight = properties.weight as number | string
  if (properties.font !== undefined) style.fontFamily = properties.font as string
  if (properties.line !== undefined) style.lineHeight = properties.line as number
  if (properties.align !== undefined) style.textAlign = properties.align as 'left' | 'center' | 'right'
  if (properties.italic) style.italic = true
  if (properties.underline) style.underline = true
  if (properties.uppercase) style.uppercase = true
  if (properties.lowercase) style.lowercase = true
  if (properties.truncate) style.truncate = true

  // ===================
  // Visual Effects
  // ===================
  if (properties.shadow !== undefined) style.shadow = properties.shadow as 'sm' | 'md' | 'lg' | number
  if (properties.opa !== undefined) style.opacity = properties.opa as number
  if (properties.cursor !== undefined) style.cursor = properties.cursor as string

  // ===================
  // Scroll
  // ===================
  if (properties.scroll) style.scroll = 'vertical'
  if (properties['scroll-hor']) style.scroll = 'horizontal'
  if (properties['scroll-both']) style.scroll = 'both'
  if (properties.clip) style.clip = true

  // ===================
  // Position
  // ===================
  if (properties.absolute) style.position = 'absolute'
  if (properties.fixed) style.position = 'fixed'
  if (properties.top !== undefined) style.top = properties.top as number
  if (properties.right !== undefined) style.right = properties.right as number
  if (properties.bottom !== undefined) style.bottom = properties.bottom as number
  if (properties.left !== undefined) style.left = properties.left as number
  if (properties.z !== undefined) style.zIndex = properties.z as number

  // ===================
  // Grid
  // ===================
  if (properties.grid !== undefined) style.grid = properties.grid as number | string[]

  // ===================
  // Visibility
  // ===================
  if (properties.hidden) style.hidden = true
  if (properties.disabled) style.disabled = true

  // ===================
  // Hover Shorthand
  // ===================
  if (properties['hover-bg'] !== undefined) style.hoverBackground = properties['hover-bg'] as string
  if (properties['hover-col'] !== undefined) style.hoverColor = properties['hover-col'] as string
  if (properties['hover-scale'] !== undefined) style.hoverScale = properties['hover-scale'] as number
  if (properties['hover-opacity'] !== undefined) style.hoverOpacity = properties['hover-opacity'] as number
  if (properties['hover-boc'] !== undefined) style.hoverBorderColor = properties['hover-boc'] as string

  return style
}

// =============================================================================
// Condition Extraction
// =============================================================================

function extractCondition(expr: ConditionExpr): Condition {
  const condition: Condition = {
    type: expr.type,
  }

  if (expr.type === 'var' && expr.name) {
    condition.variable = expr.name
  }

  if (expr.type === 'not' && expr.operand) {
    condition.operand = extractCondition(expr.operand)
  }

  if ((expr.type === 'and' || expr.type === 'or') && expr.left && expr.right) {
    condition.left = extractCondition(expr.left)
    condition.right = extractCondition(expr.right)
  }

  if (expr.type === 'comparison') {
    if (expr.left) condition.left = extractCondition(expr.left)
    if (expr.right) condition.right = extractCondition(expr.right)
    if (expr.operator) condition.operator = expr.operator
    if (expr.value !== undefined) condition.value = expr.value
  }

  return condition
}

function extractConditionalStyle(conditionalProps: NonNullable<ASTNode['conditionalProperties']>): ConditionalStyle[] {
  return conditionalProps.map(cp => ({
    condition: extractCondition(cp.condition),
    then: extractStyle(cp.thenProperties),
    ...(cp.elseProperties ? { else: extractStyle(cp.elseProperties) } : {}),
  }))
}

function extractAnimation(animDef: AnimationDefinition): Animation {
  return {
    types: animDef.animations,
    ...(animDef.duration !== undefined ? { duration: animDef.duration } : {}),
  }
}

function extractAnimations(node: ASTNode): ElementAnimations {
  const animations: ElementAnimations = {}

  if (node.showAnimation) {
    animations.show = extractAnimation(node.showAnimation)
  }
  if (node.hideAnimation) {
    animations.hide = extractAnimation(node.hideAnimation)
  }
  if (node.continuousAnimation) {
    animations.continuous = extractAnimation(node.continuousAnimation)
  }

  return animations
}

function extractPrimitiveProperties(node: ASTNode, layoutNode: LayoutNode): void {
  const props = node.properties

  // Input type
  if (props.type && typeof props.type === 'string') {
    layoutNode.inputType = props.type as LayoutNode['inputType']
  }

  // Placeholder
  if (props.placeholder && typeof props.placeholder === 'string') {
    layoutNode.placeholder = props.placeholder
  }

  // Rows (textarea)
  if (props.rows !== undefined && typeof props.rows === 'number') {
    layoutNode.rows = props.rows
  }

  // Image properties
  if (props.src && typeof props.src === 'string') {
    layoutNode.src = props.src
  }
  if (props.alt && typeof props.alt === 'string') {
    layoutNode.alt = props.alt
  }
  if (props.fit && typeof props.fit === 'string') {
    layoutNode.fit = props.fit as LayoutNode['fit']
  }

  // Link properties
  if (props.href && typeof props.href === 'string') {
    layoutNode.href = props.href
  }
  if (props.target && typeof props.target === 'string') {
    layoutNode.target = props.target as LayoutNode['target']
  }

  // Slider/range properties
  if (props.min !== undefined && typeof props.min === 'number') {
    layoutNode.min = props.min
  }
  if (props.max !== undefined && typeof props.max === 'number') {
    layoutNode.max = props.max
  }
  if (props.step !== undefined && typeof props.step === 'number') {
    layoutNode.step = props.step
  }
  if (props.value !== undefined) {
    layoutNode.value = props.value as string | number
  }
}

// =============================================================================
// Layout Extraction
// =============================================================================

function extractLayout(nodes: ASTNode[]): LayoutNode[] {
  return nodes.map(node => extractLayoutNode(node))
}

function extractLayoutNode(node: ASTNode): LayoutNode {
  const layoutNode: LayoutNode = {
    component: node.name,
  }

  // Named instance
  if (node.instanceName) {
    layoutNode.id = node.instanceName
  }

  // List item (new instance with - prefix)
  if (node._isListItem) {
    layoutNode.isListItem = true
  }

  // Text content - check both node.content and _text child
  if (node.content) {
    layoutNode.text = node.content
  } else if (node.children) {
    const textChild = node.children.find((c: ASTNode) => c.name === '_text')
    if (textChild?.content) {
      layoutNode.text = textChild.content
    }
  }

  // Inline styles (only if there are properties)
  const style = extractStyle(node.properties)
  if (Object.keys(style).length > 0) {
    layoutNode.style = style
  }

  // Conditional rendering: if $isLoggedIn
  if (node.condition) {
    layoutNode.condition = extractCondition(node.condition)
  }

  // Else branch
  if (node.elseChildren && node.elseChildren.length > 0) {
    layoutNode.elseChildren = node.elseChildren.map((c: ASTNode) => extractLayoutNode(c))
  }

  // Conditional styles: if $active then bg #F00 else bg #333
  if (node.conditionalProperties && node.conditionalProperties.length > 0) {
    layoutNode.conditionalStyle = extractConditionalStyle(node.conditionalProperties)
  }

  // Iterator: each $item in $items
  if (node.iteration) {
    layoutNode.iterator = {
      itemVariable: node.iteration.itemVar,
      source: node.iteration.collectionVar,
      ...(node.iteration.collectionPath ? { sourcePath: node.iteration.collectionPath } : {}),
    }
  }

  // Animations
  if (node.showAnimation || node.hideAnimation || node.continuousAnimation) {
    layoutNode.animations = extractAnimations(node)
  }

  // Data binding
  if (node.dataBinding) {
    layoutNode.dataBinding = {
      typeName: node.dataBinding.typeName,
      ...(node.dataBinding.filter ? { filter: extractCondition(node.dataBinding.filter) } : {}),
    }
  }

  // Primitive-specific properties
  extractPrimitiveProperties(node, layoutNode)

  // Events
  if (node.eventHandlers && node.eventHandlers.length > 0) {
    layoutNode.events = {}
    for (const handler of node.eventHandlers) {
      const eventName = handler.key
        ? `${handler.event} ${handler.key}`
        : handler.event

      layoutNode.events[eventName] = extractEventActions(handler.actions)
    }
  }

  // Children
  if (node.children && node.children.length > 0) {
    const realChildren = node.children.filter((c: ASTNode) => c.name !== '_text')
    if (realChildren.length > 0) {
      layoutNode.children = realChildren.map((c: ASTNode) => extractLayoutNode(c))
    }
  }

  return layoutNode
}

function extractEventActions(actions: (ActionStatement | Conditional)[]): EventAction[] {
  const result: EventAction[] = []

  for (const action of actions) {
    if ('condition' in action) {
      // Conditional action: if $x then show A else hide B
      const conditional = action as Conditional
      for (const thenAction of conditional.thenActions) {
        result.push({
          action: thenAction.type as EventAction['action'],
          target: thenAction.target,
          value: typeof thenAction.value === 'string' ? thenAction.value : undefined,
          condition: extractCondition(conditional.condition),
        })
      }
      // Also extract else actions (with negated condition)
      if (conditional.elseActions) {
        for (const elseAction of conditional.elseActions) {
          result.push({
            action: elseAction.type as EventAction['action'],
            target: elseAction.target,
            value: typeof elseAction.value === 'string' ? elseAction.value : undefined,
            condition: {
              type: 'not',
              operand: extractCondition(conditional.condition),
            },
          })
        }
      }
    } else if ('type' in action) {
      // Regular action
      const stmt = action as ActionStatement
      const eventAction: EventAction = {
        action: stmt.type as EventAction['action'],
        target: stmt.target,
        value: typeof stmt.value === 'string' ? stmt.value : undefined,
      }
      // Add animation, position, and duration if present
      if (stmt.animation) eventAction.animation = stmt.animation
      if (stmt.duration) eventAction.duration = stmt.duration
      if (stmt.position) eventAction.position = stmt.position
      result.push(eventAction)
    }
  }

  return result
}
