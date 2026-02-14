/**
 * Intent Validator
 *
 * Validates Intent objects to ensure they conform to the schema
 * before conversion to Mirror code.
 */

import type {
  Intent,
  TokenDefinitions,
  ComponentDefinition,
  ComponentStyle,
  LayoutNode,
  Condition,
  EventAction,
  Iterator,
  DataBinding,
  ElementAnimations,
  Animation,
  ConditionalStyle,
} from './schema'

// =============================================================================
// Validation Result
// =============================================================================

export interface ValidationError {
  path: string            // e.g., "layout[0].children[2].style.padding"
  message: string         // Human-readable error message
  value?: unknown         // The invalid value
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// =============================================================================
// Main Validator
// =============================================================================

export function validateIntent(intent: unknown): ValidationResult {
  const errors: ValidationError[] = []

  if (intent === null || intent === undefined) {
    return { valid: false, errors: [{ path: '', message: 'Intent is null or undefined' }] }
  }

  if (typeof intent !== 'object') {
    return { valid: false, errors: [{ path: '', message: 'Intent must be an object' }] }
  }

  const obj = intent as Record<string, unknown>

  // Validate tokens
  if (obj.tokens !== undefined) {
    validateTokens(obj.tokens, 'tokens', errors)
  }

  // Validate components
  if (obj.components !== undefined) {
    if (!Array.isArray(obj.components)) {
      errors.push({ path: 'components', message: 'components must be an array' })
    } else {
      obj.components.forEach((comp, i) => {
        validateComponentDefinition(comp, `components[${i}]`, errors)
      })
    }
  }

  // Validate layout
  if (obj.layout !== undefined) {
    if (!Array.isArray(obj.layout)) {
      errors.push({ path: 'layout', message: 'layout must be an array' })
    } else {
      obj.layout.forEach((node, i) => {
        validateLayoutNode(node, `layout[${i}]`, errors)
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

// =============================================================================
// Token Validation
// =============================================================================

function validateTokens(tokens: unknown, path: string, errors: ValidationError[]): void {
  if (tokens === null || typeof tokens !== 'object') {
    errors.push({ path, message: 'tokens must be an object' })
    return
  }

  const t = tokens as TokenDefinitions

  if (t.colors !== undefined) {
    validateStringRecord(t.colors, `${path}.colors`, errors, isValidColor)
  }

  if (t.spacing !== undefined) {
    validateNumberRecord(t.spacing, `${path}.spacing`, errors)
  }

  if (t.radii !== undefined) {
    validateNumberRecord(t.radii, `${path}.radii`, errors)
  }

  if (t.sizes !== undefined) {
    validateNumberRecord(t.sizes, `${path}.sizes`, errors)
  }
}

function validateStringRecord(
  record: unknown,
  path: string,
  errors: ValidationError[],
  valueValidator?: (v: string) => boolean
): void {
  if (record === null || typeof record !== 'object') {
    errors.push({ path, message: 'must be an object' })
    return
  }

  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (typeof value !== 'string') {
      errors.push({ path: `${path}.${key}`, message: 'must be a string', value })
    } else if (valueValidator && !valueValidator(value)) {
      errors.push({ path: `${path}.${key}`, message: 'invalid value', value })
    }
  }
}

function validateNumberRecord(record: unknown, path: string, errors: ValidationError[]): void {
  if (record === null || typeof record !== 'object') {
    errors.push({ path, message: 'must be an object' })
    return
  }

  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (typeof value !== 'number') {
      errors.push({ path: `${path}.${key}`, message: 'must be a number', value })
    }
  }
}

function isValidColor(color: string): boolean {
  // Allow hex colors, token references, and named colors
  if (color.startsWith('$')) return true
  if (color.startsWith('#')) {
    return /^#[0-9A-Fa-f]{3,8}$/.test(color)
  }
  // Allow common color names
  const namedColors = ['transparent', 'white', 'black', 'red', 'blue', 'green', 'inherit']
  return namedColors.includes(color.toLowerCase())
}

// =============================================================================
// Component Definition Validation
// =============================================================================

function validateComponentDefinition(comp: unknown, path: string, errors: ValidationError[]): void {
  if (comp === null || typeof comp !== 'object') {
    errors.push({ path, message: 'component definition must be an object' })
    return
  }

  const c = comp as ComponentDefinition

  // name is required
  if (!c.name || typeof c.name !== 'string') {
    errors.push({ path: `${path}.name`, message: 'name is required and must be a string' })
  } else if (!/^[A-Z][a-zA-Z0-9]*$/.test(c.name)) {
    errors.push({ path: `${path}.name`, message: 'component name must start with uppercase letter', value: c.name })
  }

  // base is optional
  if (c.base !== undefined && typeof c.base !== 'string') {
    errors.push({ path: `${path}.base`, message: 'base must be a string' })
  }

  // style is required
  if (c.style === undefined) {
    errors.push({ path: `${path}.style`, message: 'style is required' })
  } else {
    validateComponentStyle(c.style, `${path}.style`, errors)
  }

  // slots is optional
  if (c.slots !== undefined) {
    if (!Array.isArray(c.slots)) {
      errors.push({ path: `${path}.slots`, message: 'slots must be an array' })
    } else {
      c.slots.forEach((slot, i) => {
        if (typeof slot !== 'string') {
          errors.push({ path: `${path}.slots[${i}]`, message: 'slot name must be a string' })
        }
      })
    }
  }

  // states is optional
  if (c.states !== undefined) {
    if (typeof c.states !== 'object' || c.states === null) {
      errors.push({ path: `${path}.states`, message: 'states must be an object' })
    } else {
      for (const [stateName, stateStyle] of Object.entries(c.states)) {
        validateComponentStyle(stateStyle, `${path}.states.${stateName}`, errors)
      }
    }
  }
}

// =============================================================================
// Component Style Validation
// =============================================================================

const VALID_DIRECTIONS = ['horizontal', 'vertical']
const VALID_H_ALIGN = ['left', 'center', 'right']
const VALID_V_ALIGN = ['top', 'center', 'bottom']
const VALID_TEXT_ALIGN = ['left', 'center', 'right']
const VALID_SCROLL = ['vertical', 'horizontal', 'both']
const VALID_POSITION = ['relative', 'absolute', 'fixed']
const VALID_SHADOW = ['sm', 'md', 'lg']
const VALID_FIT = ['cover', 'contain', 'fill', 'none', 'scale-down']

function validateComponentStyle(style: unknown, path: string, errors: ValidationError[]): void {
  if (style === null || typeof style !== 'object') {
    errors.push({ path, message: 'style must be an object' })
    return
  }

  const s = style as ComponentStyle

  // Direction
  if (s.direction !== undefined && !VALID_DIRECTIONS.includes(s.direction)) {
    errors.push({ path: `${path}.direction`, message: `must be one of: ${VALID_DIRECTIONS.join(', ')}`, value: s.direction })
  }

  // Alignment
  if (s.alignHorizontal !== undefined && !VALID_H_ALIGN.includes(s.alignHorizontal)) {
    errors.push({ path: `${path}.alignHorizontal`, message: `must be one of: ${VALID_H_ALIGN.join(', ')}`, value: s.alignHorizontal })
  }
  if (s.alignVertical !== undefined && !VALID_V_ALIGN.includes(s.alignVertical)) {
    errors.push({ path: `${path}.alignVertical`, message: `must be one of: ${VALID_V_ALIGN.join(', ')}`, value: s.alignVertical })
  }

  // Numeric/string values
  validateSizeValue(s.gap, `${path}.gap`, errors)
  validateSizeValue(s.width, `${path}.width`, errors)
  validateSizeValue(s.height, `${path}.height`, errors)
  validateSizeValue(s.minWidth, `${path}.minWidth`, errors)
  validateSizeValue(s.maxWidth, `${path}.maxWidth`, errors)
  validateSizeValue(s.minHeight, `${path}.minHeight`, errors)
  validateSizeValue(s.maxHeight, `${path}.maxHeight`, errors)

  // Spacing
  validateSpacingValue(s.padding, `${path}.padding`, errors)
  validateSpacingValue(s.margin, `${path}.margin`, errors)

  // Colors
  if (s.background !== undefined) validateColorValue(s.background, `${path}.background`, errors)
  if (s.color !== undefined) validateColorValue(s.color, `${path}.color`, errors)
  if (s.borderColor !== undefined) validateColorValue(s.borderColor, `${path}.borderColor`, errors)

  // Typography
  if (s.textAlign !== undefined && !VALID_TEXT_ALIGN.includes(s.textAlign)) {
    errors.push({ path: `${path}.textAlign`, message: `must be one of: ${VALID_TEXT_ALIGN.join(', ')}`, value: s.textAlign })
  }

  // Scroll
  if (s.scroll !== undefined && !VALID_SCROLL.includes(s.scroll)) {
    errors.push({ path: `${path}.scroll`, message: `must be one of: ${VALID_SCROLL.join(', ')}`, value: s.scroll })
  }

  // Position
  if (s.position !== undefined && !VALID_POSITION.includes(s.position)) {
    errors.push({ path: `${path}.position`, message: `must be one of: ${VALID_POSITION.join(', ')}`, value: s.position })
  }

  // Shadow
  if (s.shadow !== undefined) {
    if (typeof s.shadow === 'string' && !VALID_SHADOW.includes(s.shadow)) {
      errors.push({ path: `${path}.shadow`, message: `string value must be one of: ${VALID_SHADOW.join(', ')}`, value: s.shadow })
    } else if (typeof s.shadow !== 'string' && typeof s.shadow !== 'number') {
      errors.push({ path: `${path}.shadow`, message: 'must be a string preset or number', value: s.shadow })
    }
  }

  // Opacity
  if (s.opacity !== undefined) {
    if (typeof s.opacity !== 'number' || s.opacity < 0 || s.opacity > 1) {
      errors.push({ path: `${path}.opacity`, message: 'must be a number between 0 and 1', value: s.opacity })
    }
  }

  // Boolean values
  const booleanProps = ['center', 'grow', 'wrap', 'between', 'stacked', 'full', 'italic', 'underline', 'uppercase', 'lowercase', 'truncate', 'clip', 'hidden', 'disabled'] as const
  for (const prop of booleanProps) {
    const value = (s as Record<string, unknown>)[prop]
    if (value !== undefined && typeof value !== 'boolean' && typeof value !== 'number') {
      errors.push({ path: `${path}.${prop}`, message: 'must be a boolean', value })
    }
  }
}

function validateSizeValue(value: unknown, path: string, errors: ValidationError[]): void {
  if (value === undefined) return

  if (typeof value === 'number') return
  if (typeof value === 'string') {
    // Allow: "100%", "$token", "full", "auto", "100vh", "100vw", etc.
    if (value.startsWith('$')) return
    if (value.endsWith('%')) return
    if (value.endsWith('vh') || value.endsWith('vw')) return
    if (value.endsWith('px') || value.endsWith('em') || value.endsWith('rem')) return
    if (['full', 'auto', 'fit-content', 'max-content', 'min-content'].includes(value)) return
    errors.push({ path, message: 'invalid size value', value })
  } else {
    errors.push({ path, message: 'must be a number or string', value })
  }
}

function validateSpacingValue(value: unknown, path: string, errors: ValidationError[]): void {
  if (value === undefined) return

  if (typeof value === 'number') return
  if (typeof value === 'string') {
    if (value.startsWith('$')) return
    // Check if it's a valid number string
    if (!isNaN(Number(value))) return
    // Allow "auto" for margin centering
    if (value === 'auto') return
    // Allow CSS units
    if (value.endsWith('px') || value.endsWith('em') || value.endsWith('rem')) return
    errors.push({ path, message: 'invalid spacing value', value })
  } else if (Array.isArray(value)) {
    if (value.length < 1 || value.length > 4) {
      errors.push({ path, message: 'spacing array must have 1-4 values', value })
    } else {
      value.forEach((v, i) => {
        if (typeof v !== 'number') {
          errors.push({ path: `${path}[${i}]`, message: 'array values must be numbers', value: v })
        }
      })
    }
  } else {
    errors.push({ path, message: 'must be a number, string, or array', value })
  }
}

function validateColorValue(value: unknown, path: string, errors: ValidationError[]): void {
  if (value === undefined) return

  if (typeof value !== 'string') {
    errors.push({ path, message: 'color must be a string', value })
    return
  }

  if (!isValidColor(value)) {
    errors.push({ path, message: 'invalid color value', value })
  }
}

// =============================================================================
// Layout Node Validation
// =============================================================================

function validateLayoutNode(node: unknown, path: string, errors: ValidationError[]): void {
  if (node === null || typeof node !== 'object') {
    errors.push({ path, message: 'layout node must be an object' })
    return
  }

  const n = node as LayoutNode

  // component is required
  if (!n.component || typeof n.component !== 'string') {
    errors.push({ path: `${path}.component`, message: 'component is required and must be a string' })
  }

  // id is optional
  if (n.id !== undefined && typeof n.id !== 'string') {
    errors.push({ path: `${path}.id`, message: 'id must be a string' })
  }

  // text is optional
  if (n.text !== undefined && typeof n.text !== 'string') {
    errors.push({ path: `${path}.text`, message: 'text must be a string' })
  }

  // style is optional
  if (n.style !== undefined) {
    validateComponentStyle(n.style, `${path}.style`, errors)
  }

  // children is optional
  if (n.children !== undefined) {
    if (!Array.isArray(n.children)) {
      errors.push({ path: `${path}.children`, message: 'children must be an array' })
    } else {
      n.children.forEach((child, i) => {
        validateLayoutNode(child, `${path}.children[${i}]`, errors)
      })
    }
  }

  // elseChildren is optional
  if (n.elseChildren !== undefined) {
    if (!Array.isArray(n.elseChildren)) {
      errors.push({ path: `${path}.elseChildren`, message: 'elseChildren must be an array' })
    } else {
      n.elseChildren.forEach((child, i) => {
        validateLayoutNode(child, `${path}.elseChildren[${i}]`, errors)
      })
    }
  }

  // condition is optional
  if (n.condition !== undefined) {
    validateCondition(n.condition, `${path}.condition`, errors)
  }

  // conditionalStyle is optional
  if (n.conditionalStyle !== undefined) {
    if (!Array.isArray(n.conditionalStyle)) {
      errors.push({ path: `${path}.conditionalStyle`, message: 'conditionalStyle must be an array' })
    } else {
      n.conditionalStyle.forEach((cs, i) => {
        validateConditionalStyle(cs, `${path}.conditionalStyle[${i}]`, errors)
      })
    }
  }

  // iterator is optional
  if (n.iterator !== undefined) {
    validateIterator(n.iterator, `${path}.iterator`, errors)
  }

  // dataBinding is optional
  if (n.dataBinding !== undefined) {
    validateDataBinding(n.dataBinding, `${path}.dataBinding`, errors)
  }

  // animations is optional
  if (n.animations !== undefined) {
    validateAnimations(n.animations, `${path}.animations`, errors)
  }

  // events is optional
  if (n.events !== undefined) {
    validateEvents(n.events, `${path}.events`, errors)
  }

  // Primitive properties
  validatePrimitiveProperties(n, path, errors)
}

// =============================================================================
// Condition Validation
// =============================================================================

const VALID_CONDITION_TYPES = ['var', 'not', 'and', 'or', 'comparison']
const VALID_OPERATORS = ['==', '!=', '>', '<', '>=', '<=']

function validateCondition(cond: unknown, path: string, errors: ValidationError[]): void {
  if (cond === null || typeof cond !== 'object') {
    errors.push({ path, message: 'condition must be an object' })
    return
  }

  const c = cond as Condition

  if (!c.type || !VALID_CONDITION_TYPES.includes(c.type)) {
    errors.push({ path: `${path}.type`, message: `type must be one of: ${VALID_CONDITION_TYPES.join(', ')}`, value: c.type })
    return
  }

  switch (c.type) {
    case 'var':
      if (!c.variable || typeof c.variable !== 'string') {
        errors.push({ path: `${path}.variable`, message: 'variable is required for type="var"' })
      } else if (!c.variable.startsWith('$')) {
        errors.push({ path: `${path}.variable`, message: 'variable must start with $', value: c.variable })
      }
      break

    case 'not':
      if (!c.operand) {
        errors.push({ path: `${path}.operand`, message: 'operand is required for type="not"' })
      } else {
        validateCondition(c.operand, `${path}.operand`, errors)
      }
      break

    case 'and':
    case 'or':
      if (!c.left) {
        errors.push({ path: `${path}.left`, message: `left is required for type="${c.type}"` })
      } else {
        validateCondition(c.left, `${path}.left`, errors)
      }
      if (!c.right) {
        errors.push({ path: `${path}.right`, message: `right is required for type="${c.type}"` })
      } else {
        validateCondition(c.right, `${path}.right`, errors)
      }
      break

    case 'comparison':
      if (!c.left) {
        errors.push({ path: `${path}.left`, message: 'left is required for comparison' })
      } else {
        validateCondition(c.left, `${path}.left`, errors)
      }
      if (!c.operator || !VALID_OPERATORS.includes(c.operator)) {
        errors.push({ path: `${path}.operator`, message: `operator must be one of: ${VALID_OPERATORS.join(', ')}`, value: c.operator })
      }
      if (c.value === undefined) {
        errors.push({ path: `${path}.value`, message: 'value is required for comparison' })
      }
      break
  }
}

function validateConditionalStyle(cs: unknown, path: string, errors: ValidationError[]): void {
  if (cs === null || typeof cs !== 'object') {
    errors.push({ path, message: 'conditionalStyle entry must be an object' })
    return
  }

  const c = cs as ConditionalStyle

  if (!c.condition) {
    errors.push({ path: `${path}.condition`, message: 'condition is required' })
  } else {
    validateCondition(c.condition, `${path}.condition`, errors)
  }

  if (!c.then) {
    errors.push({ path: `${path}.then`, message: 'then is required' })
  } else {
    validateComponentStyle(c.then, `${path}.then`, errors)
  }

  if (c.else !== undefined) {
    validateComponentStyle(c.else, `${path}.else`, errors)
  }
}

// =============================================================================
// Iterator Validation
// =============================================================================

function validateIterator(iter: unknown, path: string, errors: ValidationError[]): void {
  if (iter === null || typeof iter !== 'object') {
    errors.push({ path, message: 'iterator must be an object' })
    return
  }

  const i = iter as Iterator

  if (!i.itemVariable || typeof i.itemVariable !== 'string') {
    errors.push({ path: `${path}.itemVariable`, message: 'itemVariable is required and must be a string' })
  } else if (!i.itemVariable.startsWith('$')) {
    errors.push({ path: `${path}.itemVariable`, message: 'itemVariable must start with $', value: i.itemVariable })
  }

  if (!i.source || typeof i.source !== 'string') {
    errors.push({ path: `${path}.source`, message: 'source is required and must be a string' })
  } else if (!i.source.startsWith('$')) {
    errors.push({ path: `${path}.source`, message: 'source must start with $', value: i.source })
  }

  if (i.sourcePath !== undefined) {
    if (!Array.isArray(i.sourcePath)) {
      errors.push({ path: `${path}.sourcePath`, message: 'sourcePath must be an array' })
    } else {
      i.sourcePath.forEach((p, idx) => {
        if (typeof p !== 'string') {
          errors.push({ path: `${path}.sourcePath[${idx}]`, message: 'sourcePath elements must be strings' })
        }
      })
    }
  }
}

// =============================================================================
// Data Binding Validation
// =============================================================================

function validateDataBinding(db: unknown, path: string, errors: ValidationError[]): void {
  if (db === null || typeof db !== 'object') {
    errors.push({ path, message: 'dataBinding must be an object' })
    return
  }

  const d = db as DataBinding

  if (!d.typeName || typeof d.typeName !== 'string') {
    errors.push({ path: `${path}.typeName`, message: 'typeName is required and must be a string' })
  }

  if (d.filter !== undefined) {
    validateCondition(d.filter, `${path}.filter`, errors)
  }
}

// =============================================================================
// Animation Validation
// =============================================================================

const VALID_ANIMATION_TYPES = ['fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'spin', 'pulse', 'bounce', 'none']

function validateAnimation(anim: unknown, path: string, errors: ValidationError[]): void {
  if (anim === null || typeof anim !== 'object') {
    errors.push({ path, message: 'animation must be an object' })
    return
  }

  const a = anim as Animation

  if (!a.types || !Array.isArray(a.types)) {
    errors.push({ path: `${path}.types`, message: 'types is required and must be an array' })
  } else {
    a.types.forEach((t, i) => {
      if (typeof t !== 'string') {
        errors.push({ path: `${path}.types[${i}]`, message: 'animation type must be a string' })
      } else if (!VALID_ANIMATION_TYPES.includes(t)) {
        errors.push({ path: `${path}.types[${i}]`, message: `must be one of: ${VALID_ANIMATION_TYPES.join(', ')}`, value: t })
      }
    })
  }

  if (a.duration !== undefined && typeof a.duration !== 'number') {
    errors.push({ path: `${path}.duration`, message: 'duration must be a number', value: a.duration })
  }
}

function validateAnimations(anims: unknown, path: string, errors: ValidationError[]): void {
  if (anims === null || typeof anims !== 'object') {
    errors.push({ path, message: 'animations must be an object' })
    return
  }

  const a = anims as ElementAnimations

  if (a.show !== undefined) {
    validateAnimation(a.show, `${path}.show`, errors)
  }
  if (a.hide !== undefined) {
    validateAnimation(a.hide, `${path}.hide`, errors)
  }
  if (a.continuous !== undefined) {
    validateAnimation(a.continuous, `${path}.continuous`, errors)
  }
}

// =============================================================================
// Event Validation
// =============================================================================

const VALID_ACTIONS = [
  'navigate', 'page',
  'toggle', 'show', 'hide', 'open', 'close',
  'assign', 'change',
  'highlight', 'select', 'deselect', 'clear-selection',
  'activate', 'deactivate', 'deactivate-siblings', 'toggle-state',
  'filter', 'focus', 'validate', 'reset',
]

const VALID_POSITIONS = ['below', 'above', 'left', 'right', 'center']

function validateEventAction(action: unknown, path: string, errors: ValidationError[]): void {
  if (action === null || typeof action !== 'object') {
    errors.push({ path, message: 'event action must be an object' })
    return
  }

  const a = action as EventAction

  if (!a.action || !VALID_ACTIONS.includes(a.action)) {
    errors.push({ path: `${path}.action`, message: `action must be one of: ${VALID_ACTIONS.join(', ')}`, value: a.action })
  }

  if (a.target !== undefined && typeof a.target !== 'string') {
    errors.push({ path: `${path}.target`, message: 'target must be a string', value: a.target })
  }

  if (a.value !== undefined && typeof a.value !== 'string') {
    errors.push({ path: `${path}.value`, message: 'value must be a string', value: a.value })
  }

  if (a.position !== undefined && !VALID_POSITIONS.includes(a.position)) {
    errors.push({ path: `${path}.position`, message: `position must be one of: ${VALID_POSITIONS.join(', ')}`, value: a.position })
  }

  if (a.animation !== undefined && typeof a.animation !== 'string') {
    errors.push({ path: `${path}.animation`, message: 'animation must be a string', value: a.animation })
  }

  if (a.duration !== undefined && typeof a.duration !== 'number') {
    errors.push({ path: `${path}.duration`, message: 'duration must be a number', value: a.duration })
  }

  if (a.condition !== undefined) {
    validateCondition(a.condition, `${path}.condition`, errors)
  }
}

function validateEvents(events: unknown, path: string, errors: ValidationError[]): void {
  if (events === null || typeof events !== 'object') {
    errors.push({ path, message: 'events must be an object' })
    return
  }

  for (const [eventName, actions] of Object.entries(events as Record<string, unknown>)) {
    if (!Array.isArray(actions)) {
      errors.push({ path: `${path}.${eventName}`, message: 'event actions must be an array' })
    } else {
      actions.forEach((action, i) => {
        validateEventAction(action, `${path}.${eventName}[${i}]`, errors)
      })
    }
  }
}

// =============================================================================
// Primitive Property Validation
// =============================================================================

const VALID_INPUT_TYPES = ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time']
const VALID_TARGETS = ['_blank', '_self', '_parent', '_top']

function validatePrimitiveProperties(node: LayoutNode, path: string, errors: ValidationError[]): void {
  // Input type
  if (node.inputType !== undefined && !VALID_INPUT_TYPES.includes(node.inputType)) {
    errors.push({ path: `${path}.inputType`, message: `must be one of: ${VALID_INPUT_TYPES.join(', ')}`, value: node.inputType })
  }

  // Placeholder
  if (node.placeholder !== undefined && typeof node.placeholder !== 'string') {
    errors.push({ path: `${path}.placeholder`, message: 'must be a string', value: node.placeholder })
  }

  // Rows
  if (node.rows !== undefined) {
    if (typeof node.rows !== 'number' || node.rows < 1) {
      errors.push({ path: `${path}.rows`, message: 'must be a positive number', value: node.rows })
    }
  }

  // src
  if (node.src !== undefined && typeof node.src !== 'string') {
    errors.push({ path: `${path}.src`, message: 'must be a string', value: node.src })
  }

  // alt
  if (node.alt !== undefined && typeof node.alt !== 'string') {
    errors.push({ path: `${path}.alt`, message: 'must be a string', value: node.alt })
  }

  // fit
  if (node.fit !== undefined && !VALID_FIT.includes(node.fit)) {
    errors.push({ path: `${path}.fit`, message: `must be one of: ${VALID_FIT.join(', ')}`, value: node.fit })
  }

  // href
  if (node.href !== undefined && typeof node.href !== 'string') {
    errors.push({ path: `${path}.href`, message: 'must be a string', value: node.href })
  }

  // target
  if (node.target !== undefined && !VALID_TARGETS.includes(node.target)) {
    errors.push({ path: `${path}.target`, message: `must be one of: ${VALID_TARGETS.join(', ')}`, value: node.target })
  }

  // min, max, step
  if (node.min !== undefined && typeof node.min !== 'number') {
    errors.push({ path: `${path}.min`, message: 'must be a number', value: node.min })
  }
  if (node.max !== undefined && typeof node.max !== 'number') {
    errors.push({ path: `${path}.max`, message: 'must be a number', value: node.max })
  }
  if (node.step !== undefined && typeof node.step !== 'number') {
    errors.push({ path: `${path}.step`, message: 'must be a number', value: node.step })
  }

  // value
  if (node.value !== undefined && typeof node.value !== 'string' && typeof node.value !== 'number') {
    errors.push({ path: `${path}.value`, message: 'must be a string or number', value: node.value })
  }
}

// =============================================================================
// Export
// =============================================================================

export { validateComponentStyle, validateLayoutNode, validateCondition, validateEventAction }
