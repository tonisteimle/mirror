/**
 * Palette interaction fragments — visually navigate the palette before a drop.
 */

import type { DemoAction } from '../types'

export interface PaletteHighlightOptions {
  /** Highlight duration in ms (default 1200) — long enough for the viewer
   *  to register *which* palette item is being picked up before the drag. */
  duration?: number
  /** Extra wait after the highlight, before the next action. Helps separate
   *  the "I'm picking this up" beat from the drag motion. Default 250ms. */
  postWait?: number
}

/**
 * Move the demo cursor to a palette item, hover it, and highlight it for
 * long enough that the viewer can see *what* is about to be dragged. Use
 * right before a `dropFromPalette`.
 *
 * @param componentId  e.g. 'comp-frame', 'comp-h1', 'comp-text', 'comp-button'
 */
export function paletteHighlight(
  componentId: string,
  opts: PaletteHighlightOptions = {}
): DemoAction[] {
  // Palette items render as `.component-panel-item` with `dataset.id` —
  // selector must be [data-id="..."], NOT [data-component-id]. (The earlier
  // typo silently matched nothing, so the cursor visited an empty point.)
  const selector = `#components-panel [data-id="${componentId}"]`
  return [
    { action: 'moveTo', target: selector },
    { action: 'highlight', target: selector, duration: opts.duration ?? 1200 },
    { action: 'wait', duration: opts.postWait ?? 250 },
  ]
}
