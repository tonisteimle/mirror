/**
 * Visual System Types - Webflow Style
 */

import type { VisualHint } from '../types'

/**
 * Visual System Interface (simplified)
 */
export interface VisualSystem {
  // Indicator (insertion line)
  showIndicator(hint: VisualHint): void
  hideIndicator(): void

  // Legacy no-ops (for compatibility)
  showGhost(): void
  updateGhost(): void
  hideGhost(): void
  showSnapGuides(): void
  hideSnapGuides(): void
  showZoneOverlay(): void
  hideZoneOverlay(): void

  // Cleanup
  clear(): void
  dispose(): void
}

/**
 * Visual element IDs
 */
export const VISUAL_IDS = {
  indicator: 'mirror-drop-indicator',
} as const
