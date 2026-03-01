/**
 * JSON Schema Validation for the Pipeline
 *
 * Validates the JSON at each stage of the pipeline to ensure
 * correct structure before conversion to Mirror DSL.
 */

import type {
  StructureJSON,
  StructureComponent,
  PropertiesJSON,
  FullComponent,
  MirrorProperty,
  MirrorState,
  MirrorEvent,
  ValidationError,
  JSONValidationResult,
  AnalysisContext,
} from './types'

import {
  SYSTEM_STATES,
  BEHAVIOR_STATES,
  EVENT_KEYWORDS,
  ACTION_KEYWORDS,
  PROPERTIES,
} from '../../dsl/properties'

// =============================================================================
// Structure JSON Validation (Stage 1)
// =============================================================================

export function validateStructureJSON(json: unknown): JSONValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!json || typeof json !== 'object') {
    errors.push({ path: '', message: 'Root must be an object' })
    return { valid: false, errors, warnings }
  }

  const obj = json as Record<string, unknown>

  if (!Array.isArray(obj.components)) {
    errors.push({ path: 'components', message: 'components must be an array' })
    return { valid: false, errors, warnings }
  }

  // Validate each component
  obj.components.forEach((comp, i) => {
    validateStructureComponent(comp, `components[${i}]`, errors, warnings)
  })

  return { valid: errors.length === 0, errors, warnings }
}

function validateStructureComponent(
  comp: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!comp || typeof comp !== 'object') {
    errors.push({ path, message: 'Component must be an object' })
    return
  }

  const c = comp as Record<string, unknown>

  // Required: type
  if (typeof c.type !== 'string' || !c.type) {
    errors.push({
      path: `${path}.type`,
      message: 'type is required and must be a non-empty string',
    })
  } else {
    // Type should start with uppercase (component names are PascalCase)
    if (!/^[A-Z]/.test(c.type)) {
      warnings.push({
        path: `${path}.type`,
        message: `Component type "${c.type}" should start with uppercase letter`,
        suggestion: c.type.charAt(0).toUpperCase() + c.type.slice(1),
      })
    }
  }

  // Optional: name (for definitions)
  if (c.name !== undefined && typeof c.name !== 'string') {
    errors.push({ path: `${path}.name`, message: 'name must be a string' })
  }

  // Optional: isDefinition
  if (c.isDefinition !== undefined && typeof c.isDefinition !== 'boolean') {
    errors.push({ path: `${path}.isDefinition`, message: 'isDefinition must be a boolean' })
  }

  // Optional: content
  if (c.content !== undefined && typeof c.content !== 'string') {
    errors.push({ path: `${path}.content`, message: 'content must be a string' })
  }

  // Validate children recursively
  if (c.children !== undefined) {
    if (!Array.isArray(c.children)) {
      errors.push({ path: `${path}.children`, message: 'children must be an array' })
    } else {
      c.children.forEach((child, i) => {
        validateStructureComponent(child, `${path}.children[${i}]`, errors, warnings)
      })
    }
  }
}

// =============================================================================
// Properties JSON Validation (Stage 2)
// =============================================================================

export function validatePropertiesJSON(
  json: unknown,
  context?: AnalysisContext
): JSONValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!json || typeof json !== 'object') {
    errors.push({ path: '', message: 'Root must be an object' })
    return { valid: false, errors, warnings }
  }

  const obj = json as Record<string, unknown>

  if (!Array.isArray(obj.components)) {
    errors.push({ path: 'components', message: 'components must be an array' })
    return { valid: false, errors, warnings }
  }

  // Get valid token names from context
  const validTokens = new Set<string>()
  if (context?.tokens) {
    for (const token of context.tokens) {
      // Token names can be with or without $ prefix
      validTokens.add(token.name.replace(/^\$/, ''))
    }
  }

  // Validate each component
  obj.components.forEach((comp, i) => {
    validateFullComponent(comp, `components[${i}]`, errors, warnings, context, validTokens)
  })

  // Validate tokens (if present)
  if (obj.tokens !== undefined) {
    if (typeof obj.tokens !== 'object' || obj.tokens === null) {
      errors.push({ path: 'tokens', message: 'tokens must be an object' })
    }
  }

  // Validate variables (if present)
  if (obj.variables !== undefined) {
    if (typeof obj.variables !== 'object' || obj.variables === null) {
      errors.push({ path: 'variables', message: 'variables must be an object' })
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateFullComponent(
  comp: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[],
  context: AnalysisContext | undefined,
  validTokens: Set<string>
): void {
  if (!comp || typeof comp !== 'object') {
    errors.push({ path, message: 'Component must be an object' })
    return
  }

  const c = comp as Record<string, unknown>

  // Required: type
  if (typeof c.type !== 'string' || !c.type) {
    errors.push({
      path: `${path}.type`,
      message: 'type is required and must be a non-empty string',
    })
  }

  // Validate properties
  if (c.properties !== undefined) {
    if (!Array.isArray(c.properties)) {
      errors.push({ path: `${path}.properties`, message: 'properties must be an array' })
    } else {
      c.properties.forEach((prop, i) => {
        validateProperty(prop, `${path}.properties[${i}]`, errors, warnings, context, validTokens)
      })
    }
  }

  // Validate states
  if (c.states !== undefined) {
    if (!Array.isArray(c.states)) {
      errors.push({ path: `${path}.states`, message: 'states must be an array' })
    } else {
      c.states.forEach((state, i) => {
        validateState(state, `${path}.states[${i}]`, errors, warnings, context, validTokens)
      })
    }
  }

  // Validate events
  if (c.events !== undefined) {
    if (!Array.isArray(c.events)) {
      errors.push({ path: `${path}.events`, message: 'events must be an array' })
    } else {
      c.events.forEach((event, i) => {
        validateEvent(event, `${path}.events[${i}]`, errors, warnings)
      })
    }
  }

  // Validate children recursively
  if (c.children !== undefined) {
    if (!Array.isArray(c.children)) {
      errors.push({ path: `${path}.children`, message: 'children must be an array' })
    } else {
      c.children.forEach((child, i) => {
        validateFullComponent(child, `${path}.children[${i}]`, errors, warnings, context, validTokens)
      })
    }
  }
}

function validateProperty(
  prop: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[],
  context: AnalysisContext | undefined,
  validTokens: Set<string>
): void {
  if (!prop || typeof prop !== 'object') {
    errors.push({ path, message: 'Property must be an object' })
    return
  }

  const p = prop as Record<string, unknown>

  // Required: name
  if (typeof p.name !== 'string' || !p.name) {
    errors.push({ path: `${path}.name`, message: 'Property name is required' })
  } else {
    // Validate property name against the FULL properties set (not filtered)
    // The filtered validProperties is for LLM guidance, not strict validation
    if (!PROPERTIES.has(p.name)) {
      warnings.push({
        path: `${path}.name`,
        message: `Unknown property "${p.name}"`,
      })
    }
  }

  // Required: value
  if (p.value === undefined) {
    errors.push({ path: `${path}.value`, message: 'Property value is required' })
  } else if (
    typeof p.value !== 'string' &&
    typeof p.value !== 'number' &&
    typeof p.value !== 'boolean'
  ) {
    errors.push({
      path: `${path}.value`,
      message: 'Property value must be a string, number, or boolean',
    })
  }

  // Optional: isToken
  if (p.isToken !== undefined && typeof p.isToken !== 'boolean') {
    errors.push({ path: `${path}.isToken`, message: 'isToken must be a boolean' })
  }

  // If isToken is true, validate token exists
  if (p.isToken === true && typeof p.value === 'string') {
    const tokenName = p.value.replace(/^\$/, '')
    if (validTokens.size > 0 && !validTokens.has(tokenName)) {
      warnings.push({
        path: `${path}.value`,
        message: `Token "$${tokenName}" not found in design tokens`,
      })
    }
  }
}

function validateState(
  state: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[],
  context: AnalysisContext | undefined,
  validTokens: Set<string>
): void {
  if (!state || typeof state !== 'object') {
    errors.push({ path, message: 'State must be an object' })
    return
  }

  const s = state as Record<string, unknown>

  // Required: name
  if (typeof s.name !== 'string' || !s.name) {
    errors.push({ path: `${path}.name`, message: 'State name is required' })
  } else {
    // Validate state name
    const allStates = new Set([...SYSTEM_STATES, ...BEHAVIOR_STATES])
    if (!allStates.has(s.name)) {
      warnings.push({
        path: `${path}.name`,
        message: `Unknown state "${s.name}"`,
      })
    }
  }

  // Required: properties
  if (!Array.isArray(s.properties)) {
    errors.push({ path: `${path}.properties`, message: 'State properties must be an array' })
  } else {
    s.properties.forEach((prop, i) => {
      validateProperty(prop, `${path}.properties[${i}]`, errors, warnings, context, validTokens)
    })
  }
}

function validateEvent(
  event: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!event || typeof event !== 'object') {
    errors.push({ path, message: 'Event must be an object' })
    return
  }

  const e = event as Record<string, unknown>

  // Required: event
  if (typeof e.event !== 'string' || !e.event) {
    errors.push({ path: `${path}.event`, message: 'Event type is required' })
  } else {
    // Validate event name
    if (!EVENT_KEYWORDS.has(e.event)) {
      warnings.push({
        path: `${path}.event`,
        message: `Unknown event "${e.event}"`,
      })
    }
  }

  // Optional: key
  if (e.key !== undefined && typeof e.key !== 'string') {
    errors.push({ path: `${path}.key`, message: 'Event key must be a string' })
  }

  // Required: actions
  if (!Array.isArray(e.actions)) {
    errors.push({ path: `${path}.actions`, message: 'Event actions must be an array' })
  } else {
    e.actions.forEach((action, i) => {
      if (typeof action !== 'string') {
        errors.push({
          path: `${path}.actions[${i}]`,
          message: 'Action must be a string',
        })
      }
    })
  }
}

// =============================================================================
// Type Guards
// =============================================================================

export function isStructureJSON(json: unknown): json is StructureJSON {
  const result = validateStructureJSON(json)
  return result.valid
}

export function isPropertiesJSON(json: unknown): json is PropertiesJSON {
  const result = validatePropertiesJSON(json)
  return result.valid
}

// =============================================================================
// Auto-Fix Utilities
// =============================================================================

/**
 * Attempt to fix common JSON issues automatically
 */
export function autoFixJSON(json: unknown): { fixed: unknown; fixes: string[] } {
  const fixes: string[] = []

  if (!json || typeof json !== 'object') {
    return { fixed: json, fixes }
  }

  const obj = { ...json } as Record<string, unknown>

  // Ensure components is an array
  if (!Array.isArray(obj.components)) {
    if (typeof obj.components === 'object' && obj.components !== null) {
      obj.components = [obj.components]
      fixes.push('Wrapped single component in array')
    } else {
      obj.components = []
      fixes.push('Created empty components array')
    }
  }

  // Fix component types
  if (Array.isArray(obj.components)) {
    obj.components = obj.components.map((comp, i) => fixComponent(comp, fixes, i))
  }

  return { fixed: obj, fixes }
}

function fixComponent(
  comp: unknown,
  fixes: string[],
  index: number
): unknown {
  if (!comp || typeof comp !== 'object') {
    return comp
  }

  const c = { ...comp } as Record<string, unknown>

  // Fix type to PascalCase
  if (typeof c.type === 'string' && !/^[A-Z]/.test(c.type)) {
    const fixed = c.type.charAt(0).toUpperCase() + c.type.slice(1)
    fixes.push(`Fixed component[${index}].type: "${c.type}" → "${fixed}"`)
    c.type = fixed
  }

  // Fix properties array
  if (c.properties !== undefined && !Array.isArray(c.properties)) {
    if (typeof c.properties === 'object' && c.properties !== null) {
      c.properties = [c.properties]
      fixes.push(`Wrapped component[${index}].properties in array`)
    }
  }

  // Fix children recursively
  if (Array.isArray(c.children)) {
    c.children = c.children.map((child, i) => fixComponent(child, fixes, i))
  }

  return c
}
