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
import { suggestSimilar } from './string-utils'
import {
  KNOWN_STATE_STYLE_EXTRAS,
  KNOWN_NON_SCHEMA_PROPERTIES,
  REQUIRED_PROPERTIES,
  PROPERTY_RANGES,
  ZONE_ALIGNMENT_PROPS,
} from './validation-config'

// ============================================================================
// Validator Class
// ============================================================================

export class Validator {
  private rules: ValidationRules
  private definedComponents: Set<string> = new Set()
  private definedTokens: Set<string> = new Set()
  private usedComponents: Map<string, { line: number; column: number }> = new Map()
  private usedTokens: Set<string> = new Set() // Track actually used tokens
  private componentExtends: Map<string, string> = new Map() // For circular reference detection
  private componentDefinitions: Map<string, { line: number; column: number }> = new Map() // Track definition locations
  private tokenDefinitions: Map<string, { line: number; column: number }> = new Map() // Track token definition locations
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
    this.usedTokens.clear()
    this.componentExtends.clear()
    this.componentDefinitions.clear()
    this.tokenDefinitions.clear()
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

    // Phase 5: Check for unused definitions
    this.checkUnusedDefinitions()

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
      // Track definition location for unused warnings
      this.tokenDefinitions.set(rootName, { line: token.line, column: token.column })
    }

    // First pass: collect all component names
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
      // Track definition location for unused warnings
      this.componentDefinitions.set(component.name, {
        line: component.line,
        column: component.column,
      })
    }

    // Second pass: track extends relationships (need all names first)
    for (const component of ast.components) {
      // Track extends relationships for circular reference detection
      if (component.extends) {
        this.componentExtends.set(component.name, component.extends)
      }
      // Also check primitive - it might reference another component (e.g., "PrimaryBtn as BaseBtn:")
      // The parser uses 'primitive' for both primitives and component references
      if (component.primitive && this.definedComponents.has(component.primitive)) {
        this.componentExtends.set(component.name, component.primitive)
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
    if (
      token.tokenType !== 'color' ||
      typeof token.value !== 'string' ||
      !token.value.startsWith('#')
    )
      return
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

  private validateComponent(component: ComponentDefinition): void {
    // Check primitive
    if (component.primitive) {
      const primLower = component.primitive.toLowerCase()
      // Check both direct primitives and aliases
      const isValidPrimitive =
        this.rules.validPrimitives.has(primLower) || this.rules.primitiveAliases.has(primLower)
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
      const isKnownPrimitive =
        this.rules.validPrimitives.has(extendsLower) ||
        this.rules.primitiveAliases.has(extendsLower)
      if (!this.definedComponents.has(component.extends) && !isKnownPrimitive) {
        this.trackUsedComponent(component.extends, component.line, component.column)
      }
    }

    // Validate property set (layout conflicts, duplicates, required, ranges)
    this.validatePropertySet(
      component.properties,
      component.primitive || component.name,
      component.line,
      component.column
    )

    // Validate individual properties
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

    // Track component usage:
    // - For defined components: track for unused detection
    // - For undefined components: track for E002 error reporting
    if (!isPrimitive && !isAlias) {
      this.trackUsedComponent(instance.component, instance.line, instance.column)
    }

    // Note: We no longer validate child alignment properties because:
    // 1. `center` on a child can mean "center this element's OWN children" (valid)
    // 2. The DROP operation correctly sets alignment on parent (via parentProperty)
    // 3. Existing code with child alignment should still work (backward compat)

    // Validate property set (layout conflicts, duplicates, required, ranges)
    this.validatePropertySet(
      instance.properties,
      instance.component,
      instance.line,
      instance.column
    )

    // Validate individual properties
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
        } else {
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
        if (!KNOWN_STATE_STYLE_EXTRAS.has(propName)) {
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
    instance.properties.forEach(prop => this.validateProperty(prop))
    instance.children
      .filter(c => c.type === 'Instance')
      .forEach(c => this.validatePropertyAsInstance(c as Instance))
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

    // Check if it's a known style property (valid in state blocks)
    if (KNOWN_STATE_STYLE_EXTRAS.has(propName)) {
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
      if (!KNOWN_NON_SCHEMA_PROPERTIES.has(prop.name)) {
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
    const values = prop.values
      .map(v => {
        if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'token') {
          return '$' + (v as TokenReference).name
        }
        return v
      })
      .filter(v => typeof v !== 'object') as (string | number | boolean)[]

    // Validate values
    const validator = this.rules.propertyValueValidators.get(propDef.name)
    if (validator) {
      const result = validator(values)
      for (const err of result.errors) {
        this.addError(ERROR_CODES.INVALID_VALUE, err, prop.line, prop.column)
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
          if (!KNOWN_STATE_STYLE_EXTRAS.has(propName)) {
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
    const name = tokenRef.slice(1),
      rootName = name.split('.')[0]
    this.usedTokens.add(rootName)
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
    if (!this.rules.validStates.has(state.name)) {
      this.addWarning(
        ERROR_CODES.UNKNOWN_STATE,
        `State "${state.name}" is not a known state. Consider using: ${[...this.rules.validStates].slice(0, 5).join(', ')}...`,
        state.line,
        state.column
      )
    }
    state.properties.forEach(prop => this.validateProperty(prop))
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

  /**
   * Check for unused token and component definitions.
   * Reports W501 for unused tokens and W503 for unused components.
   */
  private checkUnusedDefinitions(): void {
    // Check for unused tokens
    for (const [name, pos] of this.tokenDefinitions) {
      if (!this.usedTokens.has(name)) {
        this.addWarning(
          ERROR_CODES.UNUSED_TOKEN,
          `Token "${name}" is defined but never used`,
          pos.line,
          pos.column,
          'Remove unused token or add a reference with $' + name
        )
      }
    }

    // Check for unused components
    // A component is "used" if:
    // 1. It appears in usedComponents (used as instance)
    // 2. It's extended by another component (used as base)
    const usedAsBase = new Set(this.componentExtends.values())

    for (const [name, pos] of this.componentDefinitions) {
      const isUsedAsInstance = this.usedComponents.has(name)
      const isUsedAsBase = usedAsBase.has(name)

      if (!isUsedAsInstance && !isUsedAsBase) {
        this.addWarning(
          ERROR_CODES.UNUSED_COMPONENT,
          `Component "${name}" is defined but never used`,
          pos.line,
          pos.column,
          'Remove unused component or create an instance'
        )
      }
    }
  }

  // ==========================================================================
  // Property Set Validation (Sprint 2)
  // ==========================================================================

  /**
   * Validate a set of properties for conflicts and duplicates.
   */
  private validatePropertySet(
    properties: Property[],
    componentName: string,
    line: number,
    column: number
  ): void {
    this.checkLayoutConflicts(properties, line, column)
    this.checkDuplicateProperties(properties)
    this.checkRequiredProperties(componentName, properties, line, column)
    this.checkPropertyRanges(properties)
  }

  /**
   * Check for conflicting layout properties
   */
  private checkLayoutConflicts(properties: Property[], line: number, column: number): void {
    const propNames = new Set(properties.map(p => p.name.toLowerCase()))

    // Check direction conflicts: hor vs ver
    const hasHor = propNames.has('hor') || propNames.has('horizontal')
    const hasVer = propNames.has('ver') || propNames.has('vertical')
    if (hasHor && hasVer) {
      this.addError(
        ERROR_CODES.LAYOUT_CONFLICT,
        'Layout conflict: cannot use both "hor" and "ver" on the same element',
        line,
        column,
        'Remove one of the direction properties'
      )
    }

    // Check center vs spread
    const hasCenter = propNames.has('center') || propNames.has('cen')
    const hasSpread = propNames.has('spread')
    if (hasCenter && hasSpread) {
      this.addError(
        ERROR_CODES.LAYOUT_CONFLICT,
        'Layout conflict: cannot use both "center" and "spread" on the same element',
        line,
        column,
        'Remove one of the alignment properties'
      )
    }

    // Check grid vs flex direction
    const hasGrid = propNames.has('grid')
    if (hasGrid && (hasHor || hasVer)) {
      this.addError(
        ERROR_CODES.LAYOUT_CONFLICT,
        'Layout conflict: cannot combine "grid" with flex direction ("hor"/"ver")',
        line,
        column,
        'Use either grid or flex layout, not both'
      )
    }

    // Check 9-zone alignment (only one allowed)
    const activeZones = ZONE_ALIGNMENT_PROPS.filter(z => propNames.has(z))
    if (activeZones.length > 1) {
      this.addError(
        ERROR_CODES.LAYOUT_CONFLICT,
        `Layout conflict: cannot use multiple position alignments (${activeZones.join(', ')})`,
        line,
        column,
        'Use only one position alignment'
      )
    }
  }

  /**
   * Check for duplicate property definitions
   */
  private checkDuplicateProperties(properties: Property[]): void {
    const seen = new Map<string, Property>()

    for (const prop of properties) {
      const name = prop.name.toLowerCase()
      const existing = seen.get(name)

      if (existing) {
        this.addWarning(
          ERROR_CODES.DUPLICATE_PROPERTY,
          `Duplicate property "${prop.name}" - previous definition on line ${existing.line}`,
          prop.line,
          prop.column,
          'The second value will override the first'
        )
      } else {
        seen.set(name, prop)
      }
    }
  }

  /**
   * Check that required properties are present
   */
  private checkRequiredProperties(
    componentName: string,
    properties: Property[],
    line: number,
    column: number
  ): void {
    const compLower = componentName.toLowerCase()
    const required = REQUIRED_PROPERTIES[compLower]

    if (!required) return

    const propNames = new Set(properties.map(p => p.name.toLowerCase()))

    for (const req of required) {
      if (!propNames.has(req)) {
        this.addError(
          ERROR_CODES.MISSING_REQUIRED,
          `${componentName} requires "${req}" property`,
          line,
          column,
          `Add ${req} property`
        )
      }
    }
  }

  /**
   * Check numeric property ranges
   */
  private checkPropertyRanges(properties: Property[]): void {
    for (const prop of properties) {
      const range = PROPERTY_RANGES[prop.name.toLowerCase()]
      if (!range) continue

      for (const val of prop.values) {
        // Handle both number and string representations
        let numVal: number | undefined
        if (typeof val === 'number') {
          numVal = val
        } else if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val)) {
          numVal = parseFloat(val)
        }

        if (numVal !== undefined) {
          if (range.min !== undefined && numVal < range.min) {
            this.addError(
              ERROR_CODES.VALUE_OUT_OF_RANGE,
              `"${prop.name}" value ${numVal} is out of range: must be ${range.description}`,
              prop.line,
              prop.column
            )
          }
          if (range.max !== undefined && numVal > range.max) {
            this.addError(
              ERROR_CODES.VALUE_OUT_OF_RANGE,
              `"${prop.name}" value ${numVal} is out of range: must be ${range.description}`,
              prop.line,
              prop.column
            )
          }
        }
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
    this.errors.push({ severity: 'error', code, message, line, column, suggestion })
  }

  private addWarning(
    code: string,
    message: string,
    line: number,
    column: number,
    suggestion?: string
  ): void {
    this.warnings.push({ severity: 'warning', code, message, line, column, suggestion })
  }
}
