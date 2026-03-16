/**
 * DragDropVisualizer - Visual feedback for drag & drop operations
 *
 * Implements the Prototype's unified container model:
 * - 9-Zone Dots are ALWAYS shown when hovering over a container
 * - Sibling Insert Lines shown when at edge (15% threshold)
 * - Zone Indicator shows context: "Box | Top Left" or "Parent (als Schwester)"
 *
 * Key concept from prototype: EVERYTHING is a container that can have children.
 */

import { OverlayManager, SemanticZone } from './overlay-manager'

export interface DropZoneInfo {
  targetId: string
  placement: 'before' | 'after' | 'inside'
  semanticZone?: SemanticZone
  targetRect: DOMRect
  parentDirection?: 'horizontal' | 'vertical'
  targetName?: string
  /** Parent container name (for sibling insert context) */
  parentName?: string
}

export interface DragDropVisualizerConfig {
  container: HTMLElement
  overlayManager: OverlayManager
}

export class DragDropVisualizer {
  private container: HTMLElement
  private overlayManager: OverlayManager
  private isActive = false
  private currentZone: DropZoneInfo | null = null

  constructor(config: DragDropVisualizerConfig) {
    this.container = config.container
    this.overlayManager = config.overlayManager
  }

  /**
   * Show visual feedback for a drop zone
   *
   * PROTOTYPE BEHAVIOR (corrected):
   * - CHILD MODE (inside): Show 9-zone dots + drop zone highlight
   * - SIBLING MODE (before/after): Show ONLY sibling line, NO dots
   *
   * This matches the prototype exactly.
   */
  showDropZone(zone: DropZoneInfo): void {
    this.isActive = true
    this.currentZone = zone

    const containerRect = this.container.getBoundingClientRect()
    const relRect = {
      left: zone.targetRect.left - containerRect.left,
      top: zone.targetRect.top - containerRect.top,
      width: zone.targetRect.width,
      height: zone.targetRect.height,
    }

    if (zone.placement === 'inside') {
      // CHILD MODE: Show drop zone highlight + 9-zone dots
      this.overlayManager.showDropZone(relRect)
      this.overlayManager.showSemanticDots(relRect, zone.semanticZone || null)
      this.overlayManager.hideSiblingLine()

      // Zone indicator shows target + zone
      const zoneName = this.getZoneDisplayName(zone.semanticZone)
      this.overlayManager.showZoneIndicator(
        zone.targetName || 'Container',
        zoneName
      )
    } else {
      // SIBLING MODE: Show ONLY sibling line, NO dots (prototype behavior!)
      this.overlayManager.hideDropZone()
      this.overlayManager.hideSemanticDots()

      const direction = zone.parentDirection || 'vertical'
      this.overlayManager.showSiblingLine(relRect, zone.placement, direction)

      // Zone indicator shows parent context
      const positionText = zone.placement === 'before' ? 'davor' : 'danach'
      this.overlayManager.showZoneIndicator(
        zone.parentName || zone.targetName || 'Element',
        `als Schwester (${positionText})`
      )
    }
  }

  /**
   * Hide all visual feedback
   */
  hideDropZone(): void {
    this.isActive = false
    this.currentZone = null
    this.overlayManager.hideSemanticDots()
    this.overlayManager.hideSiblingLine()
    this.overlayManager.hideDropZone()
    this.overlayManager.hideZoneIndicator()
  }

  /**
   * Get human-readable zone name
   */
  private getZoneDisplayName(zone?: SemanticZone): string {
    if (!zone) return 'center'

    const names: Record<SemanticZone, string> = {
      'top-left': 'Top Left',
      'top-center': 'Top Center',
      'top-right': 'Top Right',
      'mid-left': 'Middle Left',
      'mid-center': 'Center',
      'mid-right': 'Middle Right',
      'bot-left': 'Bottom Left',
      'bot-center': 'Bottom Center',
      'bot-right': 'Bottom Right',
    }

    return names[zone] || 'center'
  }

  /**
   * Check if visualizer is currently showing
   */
  isShowing(): boolean {
    return this.isActive
  }

  /**
   * Get current zone info
   */
  getCurrentZone(): DropZoneInfo | null {
    return this.currentZone
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.hideDropZone()
  }
}

export function createDragDropVisualizer(config: DragDropVisualizerConfig): DragDropVisualizer {
  return new DragDropVisualizer(config)
}
