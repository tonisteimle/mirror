/**
 * State Styles Transformer
 *
 * Functions for transforming state definitions to CSS styles.
 * Extracted from IRTransformer for modularity.
 */

import type { State, Property } from '../../parser/ast'
import type { IRStyle, IRNode } from '../types'

// System states that are handled by CSS pseudo-classes
const SYSTEM_STATES = new Set(['hover', 'focus', 'active', 'disabled', 'focus-within', 'focus-visible'])

/**
 * Context for state transformation functions
 */
export interface StateStylesContext {
  propertyToCSS: (prop: Property) => IRStyle[]
}

/**
 * Transform states to CSS styles with state attribute
 *
 * @param states Array of state definitions from AST
 * @param ctx Context with propertyToCSS function
 * @returns Array of IR styles with state conditions
 */
export function transformStates(states: State[], ctx: StateStylesContext): IRStyle[] {
  const styles: IRStyle[] = []

  // Collect transition info for system states with animation/duration
  const transitionProps: Map<string, { duration: number; easing?: string }> = new Map()

  for (const state of states) {
    for (const prop of state.properties) {
      const cssStyles = ctx.propertyToCSS(prop)
      for (const style of cssStyles) {
        styles.push({ ...style, state: state.name })

        // Track CSS properties that need transitions for system states
        if (SYSTEM_STATES.has(state.name) && state.animation?.duration) {
          transitionProps.set(style.property, {
            duration: state.animation.duration,
            easing: state.animation.easing,
          })
        }
      }
    }
    // Note: childOverrides are handled separately in applyStateChildOverrides
  }

  // Generate CSS transition property for base element if any system states have animations
  if (transitionProps.size > 0) {
    const transitions: string[] = []
    for (const [prop, { duration, easing }] of transitionProps) {
      const durationMs = duration * 1000
      const easingStr = easing || 'ease'
      transitions.push(`${prop} ${durationMs}ms ${easingStr}`)
    }
    // Add transition style without state (applies to base element)
    styles.push({
      property: 'transition',
      value: transitions.join(', '),
    })
  }

  return styles
}

/**
 * Apply state childOverrides to children
 *
 * When a state has childOverrides like:
 *   state filled
 *     Value col #fff
 *
 * This adds state-conditional styles to the matching child node.
 *
 * @param children Array of IR nodes (children of the component)
 * @param states Array of state definitions with potential childOverrides
 * @param ctx Context with propertyToCSS function
 */
export function applyStateChildOverrides(
  children: IRNode[],
  states: State[],
  ctx: StateStylesContext
): void {
  for (const state of states) {
    for (const override of state.childOverrides) {
      // Find matching child by name
      const matchingChild = children.find(
        child => child.name === override.childName
      )

      if (matchingChild) {
        // Convert override properties to CSS styles with state condition
        for (const prop of override.properties) {
          const cssStyles = ctx.propertyToCSS(prop)
          for (const style of cssStyles) {
            matchingChild.styles.push({
              ...style,
              state: state.name,
            })
          }
        }
      }
    }
  }
}
