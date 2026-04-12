/**
 * Validation Functions
 *
 * Functions for validating properties and collecting warnings.
 * Extracted from IRTransformer for modularity.
 */

import type { IRWarning, SourcePosition } from '../types'
import { findProperty } from '../../schema/dsl'
import { PROPERTY_TO_CSS, NON_CSS_PROPERTIES } from '../../schema/ir-helpers'

/**
 * Context for validation functions
 */
export interface ValidationContext {
  warnings: IRWarning[]
}

/**
 * Add a validation warning to the context.
 * Avoids duplicate warnings with same type, message, and property.
 *
 * @param ctx Validation context with warnings array
 * @param warning The warning to add
 */
export function addWarning(ctx: ValidationContext, warning: IRWarning): void {
  // Avoid duplicate warnings
  const isDuplicate = ctx.warnings.some(w =>
    w.type === warning.type &&
    w.message === warning.message &&
    w.property === warning.property
  )
  if (!isDuplicate) {
    ctx.warnings.push(warning)
  }
}

/**
 * Check if a property is known (without emitting warnings).
 * Checks against NON_CSS_PROPERTIES, schema, and PROPERTY_TO_CSS.
 *
 * @param propName The property name to check
 * @returns True if the property is known
 */
export function isKnownProperty(propName: string): boolean {
  if (NON_CSS_PROPERTIES.has(propName)) return true
  if (findProperty(propName)) return true
  if (PROPERTY_TO_CSS[propName]) return true
  return false
}

/**
 * Validate a property name against the schema.
 * Returns true if valid, false if unknown. Emits warnings for unknown properties.
 *
 * @param propName The property name to validate
 * @param ctx Validation context for warnings
 * @param position Optional source position for the warning
 * @returns True if valid, false if unknown
 */
export function validateProperty(
  propName: string,
  ctx: ValidationContext,
  position?: SourcePosition
): boolean {
  // Non-CSS properties are always valid
  if (NON_CSS_PROPERTIES.has(propName)) {
    return true
  }

  // For hover- prefix, validate the base property
  if (propName.startsWith('hover-')) {
    const baseProp = propName.replace('hover-', '')
    if (isKnownProperty(baseProp)) {
      return true
    }
    addWarning(ctx, {
      type: 'unknown-property',
      message: `Unknown property: '${propName}'`,
      property: propName,
      position,
    })
    return false
  }

  // Use isKnownProperty for the actual check (avoids duplication)
  if (isKnownProperty(propName)) {
    return true
  }

  // Unknown property - add warning
  addWarning(ctx, {
    type: 'unknown-property',
    message: `Unknown property: '${propName}'`,
    property: propName,
    position,
  })

  return false
}
