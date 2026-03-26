/**
 * Mirror Validator
 *
 * Validates Mirror DSL code against the schema.
 * All validation rules are generated from src/schema/dsl.ts.
 */

import {
  AST,
  Instance,
  Property,
  Event,
  Action,
  State,
  ComponentDefinition,
  TokenDefinition,
  Each,
  Slot,
  TokenReference,
} from '../parser/ast'
import { generateValidationRules } from './generator'
import {
  ValidationResult,
  ValidationError,
  ValidationRules,
  ERROR_CODES,
  ErrorSeverity,
} from './types'

// ============================================================================
// Levenshtein Distance for Suggestions
// ============================================================================

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

function suggestSimilar(input: string, candidates: Iterable<string>, maxDistance = 3): string | undefined {
  let best: string | undefined
  let bestDistance = Infinity

  for (const candidate of candidates) {
    const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase())
    if (distance < bestDistance && distance <= maxDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  return best
}

// ============================================================================
// Validator Class
// ============================================================================

export class Validator {
  private rules: ValidationRules
  private definedComponents: Set<string> = new Set()
  private definedTokens: Set<string> = new Set()
  private usedComponents: Map<string, { line: number; column: number }> = new Map()
  private componentExtends: Map<string, string> = new Map() // For circular reference detection
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []

  constructor() {
    this.rules = generateValidationRules()
  }

  /**
   * Validate an AST and return all errors/warnings.
   */
  validate(ast: AST): ValidationResult {
    // Reset state
    this.definedComponents.clear()
    this.definedTokens.clear()
    this.usedComponents.clear()
    this.componentExtends.clear()
    this.errors = []
    this.warnings = []

    // Phase 1: Collect all definitions
    this.collectDefinitions(ast)

    // Phase 2: Check for circular references
    this.checkCircularReferences()

    // Phase 3: Validate all nodes
    for (const token of ast.tokens) {
      this.validateToken(token)
    }

    for (const component of ast.components) {
      this.validateComponent(component)
    }

    for (const instance of ast.instances) {
      if (instance.type === 'Instance') {
        this.validateInstance(instance)
      } else if (instance.type === 'Each') {
        this.validateEach(instance as Each)
      }
    }

    // Phase 4: Check for undefined references
    this.checkUndefinedReferences()

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
    }
  }

  // ==========================================================================
  // Phase 1: Collect Definitions
  // ==========================================================================

  private collectDefinitions(ast: AST): void {
    // Collect token definitions
    for (const token of ast.tokens) {
      const baseName = token.name.startsWith('$') ? token.name.slice(1) : token.name
      // Handle dotted names like $accent.bg
      const rootName = baseName.split('.')[0]
      this.definedTokens.add(rootName)
      this.definedTokens.add(baseName) // Also add full name
    }

    // Collect component definitions and extends relationships
    for (const component of ast.components) {
      if (this.definedComponents.has(component.name)) {
        this.addError(
          ERROR_CODES.DUPLICATE_DEFINITION,
          `Component "${component.name}" is already defined`,
          component.line,
          component.column
        )
      }
      this.definedComponents.add(component.name)

      // Track extends relationships for circular reference detection
      if (component.extends) {
        this.componentExtends.set(component.name, component.extends)
      }
    }
  }

  /**
   * Check for circular references in component inheritance.
   */
  private checkCircularReferences(): void {
    for (const [name] of this.componentExtends) {
      const visited = new Set<string>()
      let current = name

      while (current && this.componentExtends.has(current)) {
        if (visited.has(current)) {
          this.addError(
            ERROR_CODES.CIRCULAR_REFERENCE,
            `Circular reference detected: ${[...visited, current].join(' → ')}`,
            1, // Line number not easily available here
            1
          )
          break
        }
        visited.add(current)
        current = this.componentExtends.get(current)!
      }
    }
  }

  // ==========================================================================
  // Phase 2: Validation
  // ==========================================================================

  private validateToken(token: TokenDefinition): void {
    // Validate token value based on inferred type
    if (token.tokenType === 'color') {
      if (typeof token.value === 'string' && token.value.startsWith('#')) {
        const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
        if (!hexRegex.test(token.value)) {
          this.addError(
            ERROR_CODES.INVALID_COLOR,
            `Invalid color value "${token.value}". Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA`,
            token.line,
            token.column
          )
        }
      }
    }
  }

  private validateComponent(component: ComponentDefinition): void {
    // Check primitive
    if (component.primitive) {
      const primLower = component.primitive.toLowerCase()
      // Check both direct primitives and aliases
      const isValidPrimitive = this.rules.validPrimitives.has(primLower) ||
                               this.rules.primitiveAliases.has(primLower)
      if (!isValidPrimitive) {
        const suggestion = suggestSimilar(component.primitive, this.rules.validPrimitives)
        this.addError(
          ERROR_CODES.UNKNOWN_COMPONENT,
          `Unknown primitive "${component.primitive}"`,
          component.line,
          component.column,
          suggestion ? `Did you mean "${suggestion}"?` : undefined
        )
      }
    }

    // Check extends
    if (component.extends) {
      const extendsLower = component.extends.toLowerCase()
      const isKnownPrimitive = this.rules.validPrimitives.has(extendsLower) ||
                               this.rules.primitiveAliases.has(extendsLower)
      if (!this.definedComponents.has(component.extends) && !isKnownPrimitive) {
        this.trackUsedComponent(component.extends, component.line, component.column)
      }
    }

    // Validate properties
    for (const prop of component.properties) {
      this.validateProperty(prop)
    }

    // Validate states
    for (const state of component.states) {
      this.validateState(state)
    }

    // Validate events
    for (const event of component.events) {
      this.validateEvent(event)
    }

    // Validate children
    for (const child of component.children) {
      if (child.type === 'Instance') {
        this.validateInstance(child)
      }
    }
  }

  private validateInstance(instance: Instance): void {
    const compLower = instance.component.toLowerCase()

    // Check if this is a state block (e.g., "hover" or "focus" as a child)
    // States like hover, focus, active, disabled can appear as pseudo-instances
    if (this.rules.validStates.has(compLower) || this.rules.systemStates.has(compLower)) {
      this.validateStateBlock(instance)
      return
    }

    // Check if component exists (primitive, alias, or defined component)
    const isPrimitive = this.rules.validPrimitives.has(compLower)
    const isAlias = this.rules.primitiveAliases.has(compLower)
    const isDefined = this.definedComponents.has(instance.component)

    if (!isPrimitive && !isAlias && !isDefined) {
      this.trackUsedComponent(instance.component, instance.line, instance.column)
    }

    // Validate properties
    for (const prop of instance.properties) {
      this.validateProperty(prop)
    }

    // Validate children recursively
    for (const child of instance.children) {
      if (child.type === 'Instance') {
        // Check if child is an event parsed as instance (e.g., "onclick close Dialog")
        if (this.rules.validEvents.has(child.component)) {
          this.validateEventAsInstance(child)
        }
        // Check if child is inline state (e.g., "state hover bg #333")
        else if (child.component === 'state') {
          this.validateStateAsInstance(child)
        }
        else {
          this.validateInstance(child)
        }
      }
    }
  }

  /**
   * Validate an inline state that was parsed as a child instance.
   * E.g., "state hover bg #333" becomes Instance { component: "state", properties: [{ name: "hover", values: [] }, { name: "bg", values: ["#333"] }] }
   */
  private validateStateAsInstance(instance: Instance): void {
    if (instance.properties.length === 0) {
      return
    }

    // First property name is the state name (e.g., "hover")
    const stateNameProp = instance.properties[0]
    const stateName = stateNameProp.name

    // Check if state name is valid
    if (!this.rules.validStates.has(stateName)) {
      const suggestion = suggestSimilar(stateName, this.rules.validStates)
      if (suggestion) {
        this.addWarning(
          ERROR_CODES.UNKNOWN_STATE,
          `State "${stateName}" is not a known state`,
          stateNameProp.line,
          stateNameProp.column,
          `Did you mean "${suggestion}"?`
        )
      }
    }

    // Remaining properties are the style changes (e.g., bg #333)
    for (let i = 1; i < instance.properties.length; i++) {
      const prop = instance.properties[i]
      const propName = prop.name

      const propDef = this.rules.validProperties.get(propName)
      if (!propDef) {
        const knownExtras = new Set(['bg', 'col', 'opacity', 'opa', 'scale', 'bor', 'border', 'boc', 'rad', 'radius'])
        if (!knownExtras.has(propName)) {
          const suggestion = suggestSimilar(propName, this.rules.validProperties.keys())
          this.addError(
            ERROR_CODES.UNKNOWN_PROPERTY,
            `Unknown property "${propName}" in state`,
            prop.line,
            prop.column,
            suggestion ? `Did you mean "${suggestion}"?` : undefined
          )
        }
      }
    }
  }

  /**
   * Validate an event that was parsed as a child instance.
   * E.g., "onclick close Dialog" on its own line becomes Instance { component: "onclick", properties: [{ name: "close", values: ["Dialog"] }] }
   */
  private validateEventAsInstance(instance: Instance): void {
    const eventName = instance.component

    // The properties of this instance represent the action and target
    // e.g., Property { name: "close", values: ["Dialog"] } means action=close, target=Dialog
    for (const prop of instance.properties) {
      const actionName = prop.name
      const target = prop.values[0]

      if (!this.rules.validActions.has(actionName)) {
        const suggestion = suggestSimilar(actionName, this.rules.validActions)
        this.addError(
          ERROR_CODES.UNKNOWN_ACTION,
          `Unknown action "${actionName}"`,
          prop.line,
          prop.column,
          suggestion ? `Did you mean "${suggestion}"?` : undefined
        )
      }
    }

    // If no properties, the event has no action
    if (instance.properties.length === 0) {
      this.addWarning(
        ERROR_CODES.MISSING_ACTION,
        `Event "${eventName}" has no action`,
        instance.line,
        instance.column
      )
    }
  }

  /**
   * Validate a state block (e.g., hover, focus, active as child instance).
   * These are parsed as instances but should be treated as state definitions.
   */
  private validateStateBlock(instance: Instance): void {
    const stateName = instance.component.toLowerCase()

    // Validate properties within the state block
    for (const prop of instance.properties) {
      this.validateProperty(prop)
    }

    // Children in state blocks are actually properties parsed as instances
    // e.g., "hover\n  bg #333" → hover instance with child "bg" instance
    for (const child of instance.children) {
      if (child.type === 'Instance') {
        this.validatePropertyAsInstance(child)
      }
    }
  }

  /**
   * Validate a property that was parsed as an instance.
   * This happens with block syntax: "hover\n  bg #333" parses bg as a child instance.
   */
  private validatePropertyAsInstance(instance: Instance): void {
    const propName = instance.component

    // Check if this looks like a property name
    const propDef = this.rules.validProperties.get(propName)
    if (propDef) {
      // This is a valid property - validate its "properties" as values
      // e.g., bg instance with property "#333" or "1 #ccc"
      for (const prop of instance.properties) {
        // The prop.name might be the value (e.g., "#333")
        // This is unusual parsing but we handle it gracefully
      }
      return
    }

    // Check if it's a known extra property
    const knownExtras = new Set([
      'bg', 'col', 'color', 'opacity', 'opa', 'scale', 'bor', 'border',
      'boc', 'rad', 'radius', 'pad', 'margin', 'w', 'h', 'fs', 'weight'
    ])
    if (knownExtras.has(propName)) {
      return // Valid property used in state block
    }

    // Otherwise report as unknown
    const suggestion = suggestSimilar(propName, this.rules.validProperties.keys())
    this.addError(
      ERROR_CODES.UNDEFINED_COMPONENT,
      `Unknown property "${propName}" in state block`,
      instance.line,
      instance.column,
      suggestion ? `Did you mean "${suggestion}"?` : undefined
    )
  }

  private validateProperty(prop: Property): void {
    const propDef = this.rules.validProperties.get(prop.name)

    // Check if this is an event parsed as a property (e.g., "onclick close Dialog")
    if (this.rules.validEvents.has(prop.name)) {
      // Validate as event - property values are the action and target
      this.validateEventAsProperty(prop)
      return
    }

    // Check if this is an inline state (e.g., "state hover bg #333")
    if (prop.name === 'state' && prop.values.length >= 1) {
      this.validateInlineState(prop)
      return
    }

    // Check for unknown property
    if (!propDef) {
      // Check if it's a known non-schema property
      const knownExtras = new Set([
        'content', 'href', 'src', 'placeholder', 'value', 'type', 'name', 'id',
        'icon-size', 'is', 'icon-color', 'ic', 'icon-weight', 'iw', 'fill',
        'animation', 'anim',
        'hover-bg', 'hover-col', 'hover-opacity', 'hover-opa',
        'hover-scale', 'hover-bor', 'hover-border', 'hover-boc',
        'hover-border-color', 'hover-rad', 'hover-radius',
      ])

      if (!knownExtras.has(prop.name)) {
        const suggestion = suggestSimilar(prop.name, this.rules.validProperties.keys())
        this.addError(
          ERROR_CODES.UNKNOWN_PROPERTY,
          `Unknown property "${prop.name}"`,
          prop.line,
          prop.column,
          suggestion ? `Did you mean "${suggestion}"?` : undefined
        )
      }
      return
    }

    // Extract actual values (handle TokenReference objects)
    const values = prop.values.map(v => {
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'token') {
        return '$' + (v as TokenReference).name
      }
      return v
    }).filter(v => typeof v !== 'object') as (string | number | boolean)[]

    // Validate values
    const validator = this.rules.propertyValueValidators.get(propDef.name)
    if (validator) {
      const result = validator(values)
      for (const err of result.errors) {
        this.addError(
          ERROR_CODES.INVALID_VALUE,
          err,
          prop.line,
          prop.column
        )
      }
    }

    // Check token references
    for (const val of values) {
      if (typeof val === 'string' && val.startsWith('$')) {
        this.validateTokenReference(val, prop.line, prop.column)
      }
    }
  }

  /**
   * Validate an event that was parsed as a property.
   * E.g., "onclick close Dialog" → Property { name: "onclick", values: ["close", "Dialog"] }
   */
  private validateEventAsProperty(prop: Property): void {
    const eventName = prop.name

    // Check if event supports key modifiers (e.g., "onkeydown enter")
    if (this.rules.eventsWithKeys.has(eventName)) {
      // First value might be a key modifier
      const firstVal = prop.values[0]
      if (typeof firstVal === 'string' && this.rules.validKeys.has(firstVal.toLowerCase())) {
        // Has key modifier, rest are action+target
        // Key modifier is valid, continue
      }
    }

    // Validate action (first or second value depending on key)
    const values = prop.values.map(v => String(v))
    let actionIndex = 0

    // Skip key modifier if present
    if (this.rules.eventsWithKeys.has(eventName) && values.length > 0) {
      if (this.rules.validKeys.has(values[0].toLowerCase())) {
        actionIndex = 1
      }
    }

    if (values.length <= actionIndex) {
      this.addWarning(
        ERROR_CODES.MISSING_ACTION,
        `Event "${eventName}" has no action`,
        prop.line,
        prop.column
      )
      return
    }

    const actionName = values[actionIndex]
    if (!this.rules.validActions.has(actionName)) {
      const suggestion = suggestSimilar(actionName, this.rules.validActions)
      this.addError(
        ERROR_CODES.UNKNOWN_ACTION,
        `Unknown action "${actionName}"`,
        prop.line,
        prop.column,
        suggestion ? `Did you mean "${suggestion}"?` : undefined
      )
    }

    // Validate action target
    const target = values[actionIndex + 1]
    if (target) {
      const validTargets = this.rules.actionTargets.get(actionName)
      if (validTargets && !validTargets.includes(target) && !target.startsWith('#')) {
        // Target is a component reference - that's OK
      }
    }
  }

  /**
   * Validate an inline state property.
   * E.g., "state hover bg #333" → Property { name: "state", values: ["hover", "bg", "#333"] }
   */
  private validateInlineState(prop: Property): void {
    const values = prop.values.map(v => String(v))

    if (values.length === 0) {
      return
    }

    const stateName = values[0]

    // Check if state name is valid
    if (!this.rules.validStates.has(stateName)) {
      // Custom states are allowed, but warn if it looks like a typo
      const suggestion = suggestSimilar(stateName, this.rules.validStates)
      if (suggestion) {
        this.addWarning(
          ERROR_CODES.UNKNOWN_STATE,
          `State "${stateName}" is not a known state`,
          prop.line,
          prop.column,
          `Did you mean "${suggestion}"?`
        )
      }
    }

    // Validate the inline properties that follow (e.g., "bg #333")
    // These are property-value pairs within the same property
    for (let i = 1; i < values.length; i += 2) {
      const propName = values[i]
      const propValue = values[i + 1]

      if (propName) {
        const propDef = this.rules.validProperties.get(propName)
        if (!propDef) {
          const knownExtras = new Set(['bg', 'col', 'opacity', 'opa', 'scale', 'bor', 'border', 'boc', 'rad', 'radius'])
          if (!knownExtras.has(propName)) {
            const suggestion = suggestSimilar(propName, this.rules.validProperties.keys())
            this.addError(
              ERROR_CODES.UNKNOWN_PROPERTY,
              `Unknown property "${propName}" in state`,
              prop.line,
              prop.column,
              suggestion ? `Did you mean "${suggestion}"?` : undefined
            )
          }
        }
      }
    }
  }

  private validateTokenReference(tokenRef: string, line: number, column: number): void {
    // Extract token name: $accent.bg → primary or primary.bg
    const name = tokenRef.slice(1) // Remove $
    const rootName = name.split('.')[0]

    if (!this.definedTokens.has(rootName) && !this.definedTokens.has(name)) {
      this.addWarning(
        ERROR_CODES.UNDEFINED_TOKEN,
        `Token "${tokenRef}" is not defined`,
        line,
        column
      )
    }
  }

  private validateState(state: State): void {
    // Check if state name is valid
    if (!this.rules.validStates.has(state.name)) {
      // Custom states are allowed, but warn
      this.addWarning(
        ERROR_CODES.UNKNOWN_STATE,
        `State "${state.name}" is not a known state. Consider using: ${[...this.rules.validStates].slice(0, 5).join(', ')}...`,
        state.line,
        state.column
      )
    }

    // Validate properties within state
    for (const prop of state.properties) {
      this.validateProperty(prop)
    }
  }

  private validateEvent(event: Event): void {
    // Check event name
    if (!this.rules.validEvents.has(event.name)) {
      const suggestion = suggestSimilar(event.name, this.rules.validEvents)
      this.addError(
        ERROR_CODES.UNKNOWN_EVENT,
        `Unknown event "${event.name}"`,
        event.line,
        event.column,
        suggestion ? `Did you mean "${suggestion}"?` : undefined
      )
      return
    }

    // Check key modifier
    if (event.key) {
      if (!this.rules.eventsWithKeys.has(event.name)) {
        this.addWarning(
          ERROR_CODES.UNEXPECTED_KEY,
          `Event "${event.name}" does not support key modifiers`,
          event.line,
          event.column
        )
      } else {
        const keyLower = event.key.toLowerCase()
        if (!this.rules.validKeys.has(keyLower)) {
          const suggestion = suggestSimilar(event.key, this.rules.validKeys)
          this.addError(
            ERROR_CODES.UNKNOWN_KEY,
            `Unknown key "${event.key}"`,
            event.line,
            event.column,
            suggestion ? `Did you mean "${suggestion}"?` : undefined
          )
        }
      }
    }

    // Check actions
    if (event.actions.length === 0) {
      this.addWarning(
        ERROR_CODES.MISSING_ACTION,
        `Event "${event.name}" has no actions`,
        event.line,
        event.column
      )
    }

    for (const action of event.actions) {
      this.validateAction(action)
    }
  }

  private validateAction(action: Action): void {
    if (!this.rules.validActions.has(action.name)) {
      const suggestion = suggestSimilar(action.name, this.rules.validActions)
      this.addError(
        ERROR_CODES.UNKNOWN_ACTION,
        `Unknown action "${action.name}"`,
        action.line,
        action.column,
        suggestion ? `Did you mean "${suggestion}"?` : undefined
      )
      return
    }

    // Check action targets
    const validTargets = this.rules.actionTargets.get(action.name)
    if (validTargets && action.target) {
      if (!validTargets.includes(action.target) && !action.target.startsWith('#')) {
        this.addError(
          ERROR_CODES.INVALID_TARGET,
          `Invalid target "${action.target}" for action "${action.name}". Valid targets: ${validTargets.join(', ')}`,
          action.line,
          action.column
        )
      }
    }
  }

  private validateEach(each: Each): void {
    // Validate children
    for (const child of each.children) {
      if (child.type === 'Instance') {
        this.validateInstance(child)
      }
    }
  }

  // ==========================================================================
  // Phase 3: Check Undefined References
  // ==========================================================================

  private trackUsedComponent(name: string, line: number, column: number): void {
    if (!this.usedComponents.has(name)) {
      this.usedComponents.set(name, { line, column })
    }
  }

  private checkUndefinedReferences(): void {
    for (const [name, pos] of this.usedComponents) {
      const nameLower = name.toLowerCase()
      const isPrimitive = this.rules.validPrimitives.has(nameLower)
      const isAlias = this.rules.primitiveAliases.has(nameLower)
      const isDefined = this.definedComponents.has(name)

      if (!isPrimitive && !isAlias && !isDefined) {
        const suggestion = suggestSimilar(name, [
          ...this.definedComponents,
          ...this.rules.validPrimitives,
          ...this.rules.primitiveAliases.keys(),
        ])
        this.addError(
          ERROR_CODES.UNDEFINED_COMPONENT,
          `Component "${name}" is not defined`,
          pos.line,
          pos.column,
          suggestion ? `Did you mean "${suggestion}"?` : undefined
        )
      }
    }
  }

  // ==========================================================================
  // Error Helpers
  // ==========================================================================

  private addError(
    code: string,
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ): void {
    this.errors.push({
      severity: 'error',
      code,
      message,
      line,
      column,
      suggestion,
    })
  }

  private addWarning(
    code: string,
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ): void {
    this.warnings.push({
      severity: 'warning',
      code,
      message,
      line,
      column,
      suggestion,
    })
  }
}
