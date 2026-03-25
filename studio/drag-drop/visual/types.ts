/**
 * Visual System Types
 */

import type { Point, Size, Rect, DragSource, VisualHint, SnapGuide, AlignmentZone } from '../types'

/**
 * Visual System Interface
 */
export interface VisualSystem {
  // Ghost
  showGhost(source: DragSource, position: Point, size?: Size): void
  updateGhost(position: Point): void
  hideGhost(): void

  // Indicators
  showIndicator(hint: VisualHint): void
  hideIndicator(): void

  // Snap Guides
  showSnapGuides(guides: SnapGuide[]): void
  hideSnapGuides(): void

  // Zone overlay (9-zone)
  showZoneOverlay(containerRect: Rect, activeZone?: AlignmentZone): void
  hideZoneOverlay(): void

  // Cleanup
  clear(): void
  dispose(): void
}

/**
 * Visual element IDs
 */
export const VISUAL_IDS = {
  ghost: 'mirror-drag-ghost',
  indicator: 'mirror-drop-indicator',
  snapGuides: 'mirror-snap-guides',
  zoneOverlay: 'mirror-zone-overlay',
} as const
