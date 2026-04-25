/**
 * Palette interaction fragments — visually navigate the palette before a drop.
 */

import type { DemoAction } from '../types'

export interface PaletteHighlightOptions {
  /** Highlight duration in ms (default 400) */
  duration?: number
}

/**
 * Move the demo cursor to a palette item and highlight it briefly. Use right
 * before a `dropFromPalette` to make the source obvious in video.
 *
 * @param componentId  e.g. 'comp-frame', 'comp-h1', 'comp-text', 'comp-button'
 */
export function paletteHighlight(
  componentId: string,
  opts: PaletteHighlightOptions = {}
): DemoAction[] {
  const selector = `#components-panel [data-component-id="${componentId}"]`
  return [
    { action: 'moveTo', target: selector },
    { action: 'highlight', target: selector, duration: opts.duration ?? 400 },
  ]
}
