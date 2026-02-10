/**
 * Color Handler
 *
 * Handles COLOR tokens as implicit color properties.
 * Uses inferColorProperty to determine the correct property.
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import { inferColorProperty } from '../../property-inference'

/**
 * Color handler for COLOR tokens.
 * Infers the appropriate color property from component type.
 */
export const colorHandler: SugarHandler = {
  name: 'color',
  priority: 100,
  tokenTypes: ['COLOR'],

  canHandle(_context: SugarContext): boolean {
    // Always handle COLOR tokens
    return true
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node, componentName } = context
    const colorValue = ctx.advance().value
    const inferredProp = inferColorProperty(componentName, node.properties)
    node.properties[inferredProp] = colorValue
    return { handled: true }
  }
}
