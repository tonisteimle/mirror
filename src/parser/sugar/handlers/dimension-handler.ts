/**
 * Dimension Handler
 *
 * Handles NUMBER tokens as implicit width/height properties.
 * Example: Box 300 400 -> Box w 300 h 400
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import { isImageComponent } from '../component-type-matcher'

/**
 * Dimension handler for NUMBER tokens.
 * First number without property becomes w, second becomes h.
 */
export const dimensionHandler: SugarHandler = {
  name: 'dimension',
  priority: 100,
  tokenTypes: ['NUMBER'],

  canHandle(context: SugarContext): boolean {
    // Don't handle if both w and h are already set
    const { node } = context
    return node.properties.w === undefined || node.properties.h === undefined
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context

    if (node.properties.w === undefined) {
      node.properties.w = parseInt(ctx.advance().value, 10)
      return { handled: true }
    }

    if (node.properties.h === undefined) {
      node.properties.h = parseInt(ctx.advance().value, 10)
      return { handled: true }
    }

    return { handled: false }
  }
}

/**
 * Image dimension handler for NUMBER tokens after string (src).
 * Example: Image "photo.jpg" 300 400 -> src, w, h
 * This is handled in the string handler which consumes following numbers.
 */
export const imageDimensionHandler: SugarHandler = {
  name: 'image-dimension',
  priority: 150, // Higher priority for images
  tokenTypes: ['NUMBER'],

  canHandle(context: SugarContext): boolean {
    // Only for image components that already have a src
    const { node } = context
    return (
      isImageComponent(node) &&
      node.properties.src !== undefined &&
      (node.properties.w === undefined || node.properties.h === undefined)
    )
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context

    if (node.properties.w === undefined) {
      node.properties.w = parseInt(ctx.advance().value, 10)
      return { handled: true }
    }

    if (node.properties.h === undefined) {
      node.properties.h = parseInt(ctx.advance().value, 10)
      return { handled: true }
    }

    return { handled: false }
  }
}
