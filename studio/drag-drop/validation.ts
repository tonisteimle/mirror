/**
 * Input Validation
 *
 * Runtime validation for DragSource and DropResult.
 * Complements TypeScript's compile-time checks with runtime safety.
 */

import type { DragSource, DropResult, Placement } from './types'

// ============================================
// Validation Results
// ============================================

export interface ValidationResult {
  valid: boolean
  error?: string
}

// ============================================
// DragSource Validation
// ============================================

/**
 * Validate a DragSource has all required fields for its type.
 */
export function validateDragSource(source: DragSource): ValidationResult {
  // Type must be 'palette' or 'canvas'
  if (!source.type) {
    return { valid: false, error: 'DragSource missing type' }
  }

  if (source.type !== 'palette' && source.type !== 'canvas') {
    return { valid: false, error: `Invalid DragSource type: ${source.type}` }
  }

  // Palette source requires componentName
  if (source.type === 'palette') {
    if (!source.componentName) {
      return { valid: false, error: 'Palette DragSource requires componentName' }
    }
  }

  // Canvas source requires nodeId
  if (source.type === 'canvas') {
    if (!source.nodeId) {
      return { valid: false, error: 'Canvas DragSource requires nodeId' }
    }
  }

  return { valid: true }
}

// ============================================
// DropResult Validation
// ============================================

const VALID_PLACEMENTS: Placement[] = ['before', 'after', 'inside', 'absolute']

/**
 * Validate a DropResult has all required fields.
 */
export function validateDropResult(result: DropResult): ValidationResult {
  // Must have target
  if (!result.target) {
    return { valid: false, error: 'DropResult missing target' }
  }

  // Must have placement
  if (!result.placement) {
    return { valid: false, error: 'DropResult missing placement' }
  }

  // Placement must be valid
  if (!VALID_PLACEMENTS.includes(result.placement)) {
    return { valid: false, error: `Invalid placement: ${result.placement}` }
  }

  // Before/after placement requires targetId
  if (result.placement === 'before' || result.placement === 'after') {
    if (!result.targetId) {
      return { valid: false, error: `${result.placement} placement requires targetId` }
    }
  }

  // Absolute placement requires position
  if (result.placement === 'absolute') {
    if (!result.position) {
      return { valid: false, error: 'Absolute placement requires position' }
    }
    if (typeof result.position.x !== 'number' || typeof result.position.y !== 'number') {
      return { valid: false, error: 'Invalid position: x and y must be numbers' }
    }
  }

  // Target must have nodeId
  if (!result.target.nodeId) {
    return { valid: false, error: 'DropResult target missing nodeId' }
  }

  return { valid: true }
}

// ============================================
// Combined Validation
// ============================================

/**
 * Validate both source and result for a drop operation.
 */
export function validateDropOperation(
  source: DragSource,
  result: DropResult
): ValidationResult {
  const sourceValidation = validateDragSource(source)
  if (!sourceValidation.valid) {
    return sourceValidation
  }

  const resultValidation = validateDropResult(result)
  if (!resultValidation.valid) {
    return resultValidation
  }

  return { valid: true }
}
