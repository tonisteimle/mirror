/**
 * Style Composer Module
 *
 * Composes final styles from base styles, state styles,
 * conditional styles, and hover styles.
 */

import type React from 'react'
import type { AnimationDefinition, ConditionExpr } from '../../parser/types'
import type { DSLProperties } from '../../types/dsl-properties'
import { evaluateCondition } from '../utils'

// Conditional property structure (matches ASTNode.conditionalProperties element)
export interface ConditionalProperty {
  condition: ConditionExpr
  thenProperties: DSLProperties
  elseProperties?: DSLProperties
}

/**
 * Compose conditional styles based on variable values.
 */
export function composeConditionalStyles(
  conditionalProperties: ConditionalProperty[] | undefined,
  variables: Record<string, unknown>
): React.CSSProperties {
  if (!conditionalProperties || conditionalProperties.length === 0) {
    return {}
  }

  const style: React.CSSProperties = {}

  for (const condProp of conditionalProperties) {
    const shouldApplyThen = evaluateCondition(condProp.condition, variables)
    const propsToApply = shouldApplyThen ? condProp.thenProperties : (condProp.elseProperties || {})

    for (const [key, value] of Object.entries(propsToApply)) {
      // col → always text color, bg → always background color
      if (key === 'col') style.color = String(value)
      else if (key === 'bg') style.backgroundColor = String(value)
      else if (key === 'w') style.width = typeof value === 'number' ? `${value}px` : String(value)
      else if (key === 'h') style.height = typeof value === 'number' ? `${value}px` : String(value)
      else if (key === 'pad') style.padding = typeof value === 'number' ? `${value}px` : String(value)
      else if (key === 'rad') style.borderRadius = typeof value === 'number' ? `${value}px` : String(value)
      else if (key === 'border') style.border = String(value)
      else if (key === 'op') style.opacity = Number(value)
      else if (key === 'shadow') style.boxShadow = `0 ${value}px ${Number(value) * 2}px rgba(0,0,0,0.15)`
    }
  }

  return style
}

/**
 * Compose final style from all style sources.
 */
export function composeFinalStyle(
  highlightStyle: React.CSSProperties,
  stateStyle: React.CSSProperties,
  conditionalStyle: React.CSSProperties,
  hoverStyle: React.CSSProperties,
  isHovered: boolean
): React.CSSProperties {
  let style = { ...highlightStyle, ...stateStyle, ...conditionalStyle }

  if (isHovered && Object.keys(hoverStyle).length > 0) {
    style = { ...style, ...hoverStyle }
  }

  return style
}

/**
 * Create highlight style for inspect mode.
 */
export function createHighlightStyle(
  baseStyle: React.CSSProperties,
  isHovered: boolean,
  isSelected: boolean,
  inspectMode?: boolean
): React.CSSProperties {
  return {
    ...baseStyle,
    outline: isHovered ? '2px solid #3B82F6' : isSelected ? '2px solid #10B981' : undefined,
    outlineOffset: isHovered || isSelected ? '2px' : undefined,
    // Only override cursor for inspect mode - preserve baseStyle cursor otherwise
    ...(inspectMode ? { cursor: 'pointer' } : {}),
  }
}

/**
 * Animation name to CSS keyframe mapping
 */
const ANIMATION_KEYFRAMES: Record<string, { in: string; out: string }> = {
  'fade': { in: 'fadeIn', out: 'fadeOut' },
  'slide-up': { in: 'content-slide-up', out: 'content-slide-up-out' },
  'slide-down': { in: 'content-slide-down', out: 'content-slide-down-out' },
  'slide-left': { in: 'content-slide-left', out: 'content-slide-left-out' },
  'slide-right': { in: 'content-slide-right', out: 'content-slide-right-out' },
  'scale': { in: 'scaleIn', out: 'content-scale-out' },
}

const CONTINUOUS_KEYFRAMES: Record<string, string> = {
  'spin': 'spin',
  'pulse': 'pulse',
  'bounce': 'bounce',
}

/**
 * Convert AnimationDefinition to CSS animation style.
 *
 * For show animations: applies entrance animation
 * For hide animations: applies exit animation
 * For continuous animations: applies infinite loop animation
 */
export function getAnimationStyle(
  animDef: AnimationDefinition | undefined,
  isShowing: boolean = true
): React.CSSProperties {
  if (!animDef) return {}

  const duration = animDef.duration || (animDef.type === 'animate' ? 1000 : 300)

  // Continuous animation (spin, pulse, bounce)
  if (animDef.type === 'animate') {
    const keyframes = animDef.animations
      .map(anim => CONTINUOUS_KEYFRAMES[anim])
      .filter(Boolean)
      .join(', ')

    if (!keyframes) return {}

    return {
      animation: `${keyframes} ${duration}ms ease-in-out infinite`,
    }
  }

  // Show/hide animations
  const direction = animDef.type === 'show' ? 'in' : 'out'

  // Combine multiple animations (e.g., fade + slide-up)
  const keyframes = animDef.animations
    .map(anim => ANIMATION_KEYFRAMES[anim]?.[direction])
    .filter(Boolean)

  if (keyframes.length === 0) return {}

  // For multiple animations, we need to combine them
  // CSS animation property can have multiple animations separated by comma
  const animations = keyframes.map(kf => `${kf} ${duration}ms ease-out forwards`)

  return {
    animation: animations.join(', '),
  }
}

/**
 * Get CSS class names for animations (alternative to inline styles).
 * Returns array of class names to apply.
 */
export function getAnimationClasses(
  animDef: AnimationDefinition | undefined,
  isShowing: boolean = true
): string[] {
  if (!animDef) return []

  // Continuous animation (spin, pulse, bounce)
  if (animDef.type === 'animate') {
    return animDef.animations
      .filter(anim => CONTINUOUS_KEYFRAMES[anim])
      .map(anim => `mirror-anim-${anim}`)
  }

  // Show/hide animations
  const suffix = animDef.type === 'show' ? 'in' : 'out'
  return animDef.animations
    .filter(anim => ANIMATION_KEYFRAMES[anim])
    .map(anim => `mirror-anim-${anim}-${suffix}`)
}
