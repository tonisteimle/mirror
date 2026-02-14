/**
 * Animation Validator
 *
 * Validates animation definitions on components.
 */

import type { ASTNode, ParseResult, AnimationDefinition } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'
import { didYouMean } from '../utils/suggestion-engine'
import {
  isValidAnimation,
  getValidAnimations,
  findSimilarAnimation,
  canCombineAnimations,
  TRANSITION_ANIMATIONS,
  CONTINUOUS_ANIMATIONS
} from '../schemas/event-schema'

// ============================================
// Animation Validator
// ============================================

/**
 * Validate all animations in the parse result
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateAnimations(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []

  // Validate all nodes
  for (const node of result.nodes) {
    validateNodeAnimations(node, diagnostics)
  }

  // Separate by severity
  const errors = diagnostics.filter(d => d.severity === 'error')
  const warnings = diagnostics.filter(d => d.severity === 'warning')
  const info = diagnostics.filter(d => d.severity === 'info')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info
  }
}

function validateNodeAnimations(node: ASTNode, diagnostics: ValidationDiagnostic[]): void {
  const line = node.line || 0

  // Validate show animation
  if (node.showAnimation) {
    validateAnimationDefinition(node.showAnimation, 'show', line, diagnostics)
  }

  // Validate hide animation
  if (node.hideAnimation) {
    validateAnimationDefinition(node.hideAnimation, 'hide', line, diagnostics)
  }

  // Validate continuous animation
  if (node.continuousAnimation) {
    validateAnimationDefinition(node.continuousAnimation, 'animate', line, diagnostics)

    // Check that continuous animations use appropriate types
    for (const anim of node.continuousAnimation.animations) {
      if (TRANSITION_ANIMATIONS.has(anim) && !CONTINUOUS_ANIMATIONS.has(anim)) {
        diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.INCOMPATIBLE_ANIMATIONS, 'animation')
            .message(`Animation "${anim}" is a transition animation, not a continuous animation`)
            .at(node.continuousAnimation.line || line, 0)
            .source(anim)
            .withValidOptions(Array.from(CONTINUOUS_ANIMATIONS))
            .build()
        )
      }
    }
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNodeAnimations(child, diagnostics)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNodeAnimations(child, diagnostics)
    }
  }
}

function validateAnimationDefinition(
  animDef: AnimationDefinition,
  type: 'show' | 'hide' | 'animate',
  nodeLine: number,
  diagnostics: ValidationDiagnostic[]
): void {
  const line = animDef.line || nodeLine

  // Validate each animation name
  for (const anim of animDef.animations) {
    if (!isValidAnimation(anim)) {
      const similar = findSimilarAnimation(anim)
      const suggestions = similar
        ? [{ label: `Did you mean "${similar}"?`, replacement: similar }]
        : didYouMean(anim, getValidAnimations())

      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.UNKNOWN_ANIMATION, 'animation')
          .message(`Unknown animation "${anim}"`)
          .at(line, 0)
          .source(anim)
          .withValidOptions(getValidAnimations())
          .suggestAll(suggestions)
          .build()
      )
    }
  }

  // Check animation compatibility
  if (animDef.animations.length > 1) {
    for (let i = 0; i < animDef.animations.length; i++) {
      for (let j = i + 1; j < animDef.animations.length; j++) {
        const anim1 = animDef.animations[i]
        const anim2 = animDef.animations[j]

        if (!canCombineAnimations(anim1, anim2)) {
          diagnostics.push(
            DiagnosticBuilder
              .warning(ValidatorErrorCodes.INCOMPATIBLE_ANIMATIONS, 'animation')
              .message(`Animations "${anim1}" and "${anim2}" cannot be combined`)
              .at(line, 0)
              .build()
          )
        }
      }
    }
  }

  // Validate duration
  if (animDef.duration !== undefined) {
    if (typeof animDef.duration !== 'number' || animDef.duration < 0) {
      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.INVALID_ANIMATION_DURATION, 'animation')
          .message('Animation duration must be a positive number in milliseconds')
          .at(line, 0)
          .build()
      )
    } else if (animDef.duration > 10000) {
      diagnostics.push(
        DiagnosticBuilder
          .info(ValidatorErrorCodes.INVALID_ANIMATION_DURATION, 'animation')
          .message(`Animation duration of ${animDef.duration}ms is unusually long`)
          .at(line, 0)
          .build()
      )
    }
  }
}
