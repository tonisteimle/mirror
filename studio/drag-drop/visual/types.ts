/**
 * Visual System Types
 */

import type { VisualHint } from '../types'

/**
 * Visual System Interface (simplified)
 */
export interface VisualSystem {
  // Indicator (insertion line)
  showIndicator(hint: VisualHint): void
  hideIndicator(): void

  // Parent outline (shows which container receives the drop)
  showParentOutline(rect: { x: number; y: number; width: number; height: number }): void
  hideParentOutline(): void

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

  // Test API
  getState(): {
    indicatorVisible: boolean
    indicatorRect: { x: number; y: number; width: number; height: number } | null
    parentOutlineVisible: boolean
    parentOutlineRect: { x: number; y: number; width: number; height: number } | null
    ghostVisible: boolean
    ghostRect: { x: number; y: number; width: number; height: number } | null
  }
}

/**
 * Visual element IDs
 */
export const VISUAL_IDS = {
  indicator: 'mirror-drop-indicator',
  parentOutline: 'mirror-drop-parent-outline',
  ghost: 'mirror-drop-ghost',
} as const
