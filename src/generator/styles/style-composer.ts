/**
 * Style Composer Module
 *
 * Composes final styles from base styles, state styles,
 * conditional styles, and hover styles.
 */

import type React from 'react'
import type { ConditionalProperty } from '../../parser/parser'
import { evaluateCondition } from '../utils'

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
      if (key === 'bg') style.backgroundColor = String(value)
      else if (key === 'col') style.color = String(value)
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
    cursor: inspectMode ? 'pointer' : undefined,
  }
}
