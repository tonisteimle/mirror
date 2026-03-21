/**
 * InferenceIndicator - Visual indicators for layout inference
 *
 * Renders dashed lines between aligned elements with hover action buttons.
 * Uses emerald color (#10B981) to distinguish from selection (blue).
 */

import type { AlignmentGroup, InferenceIndicatorConfig, ElementBounds } from './types'
import { Z_INDEX_INFERENCE, Z_INDEX_INFERENCE_TEXT } from '../constants/z-index'

const DEFAULT_COLOR = '#10B981' // Emerald

export class InferenceIndicator {
  private container: HTMLElement
  private color: string
  private onConvert?: (group: AlignmentGroup) => void
  private overlay: HTMLElement | null = null
  private activeGroups: Map<string, { connectors: HTMLElement[]; action: HTMLElement }> = new Map()

  constructor(config: InferenceIndicatorConfig) {
    this.container = config.container
    this.color = config.color ?? DEFAULT_COLOR
    this.onConvert = config.onConvert

    this.createOverlay()
  }

  /**
   * Create the overlay container for indicators
   */
  private createOverlay(): void {
    this.overlay = document.createElement('div')
    this.overlay.className = 'inference-overlay'
    Object.assign(this.overlay.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: String(Z_INDEX_INFERENCE), // Below handles but above content
    })

    // Ensure container has positioning
    const containerStyle = window.getComputedStyle(this.container)
    if (containerStyle.position === 'static') {
      this.container.style.position = 'relative'
    }

    this.container.appendChild(this.overlay)
  }

  /**
   * Show indicators for alignment groups
   */
  showGroups(groups: AlignmentGroup[]): void {
    this.hideAll()

    for (const group of groups) {
      this.renderGroup(group)
    }
  }

  /**
   * Render indicators for a single alignment group
   */
  private renderGroup(group: AlignmentGroup): void {
    if (!this.overlay) return

    const containerRect = this.container.getBoundingClientRect()
    const connectors: HTMLElement[] = []

    // Create connectors between adjacent elements
    for (let i = 0; i < group.elements.length - 1; i++) {
      const connector = this.createConnector(
        group.elements[i],
        group.elements[i + 1],
        containerRect,
        group
      )
      connectors.push(connector)
      this.overlay.appendChild(connector)
    }

    // Create action button (positioned at center of the group)
    const action = this.createActionButton(group, containerRect)
    this.overlay.appendChild(action)

    // Store references
    this.activeGroups.set(group.id, { connectors, action })

    // Setup hover behavior - show action on connector hover
    for (const connector of connectors) {
      connector.addEventListener('mouseenter', () => {
        action.style.opacity = '1'
        action.style.pointerEvents = 'auto'
      })
      connector.addEventListener('mouseleave', (e) => {
        // Check if we're moving to another connector or the action button
        const relatedTarget = e.relatedTarget as HTMLElement
        if (relatedTarget === action || connectors.includes(relatedTarget)) {
          return
        }
        action.style.opacity = '0'
        action.style.pointerEvents = 'none'
      })
    }

    action.addEventListener('mouseenter', () => {
      action.style.opacity = '1'
      action.style.pointerEvents = 'auto'
    })
    action.addEventListener('mouseleave', () => {
      action.style.opacity = '0'
      action.style.pointerEvents = 'none'
    })
  }

  /**
   * Create a dashed connector line between two elements
   */
  private createConnector(
    a: ElementBounds,
    b: ElementBounds,
    containerRect: DOMRect,
    group: AlignmentGroup
  ): HTMLElement {
    const connector = document.createElement('div')
    connector.className = 'inference-connector'

    // Calculate position relative to container
    const x1 = a.rect.right - containerRect.left
    const x2 = b.rect.left - containerRect.left
    const y = (a.centerY + b.centerY) / 2 - containerRect.top

    const width = x2 - x1

    Object.assign(connector.style, {
      position: 'absolute',
      left: `${x1}px`,
      top: `${y - 1}px`,
      width: `${width}px`,
      height: '2px',
      background: `repeating-linear-gradient(90deg, ${this.color}, ${this.color} 4px, transparent 4px, transparent 8px)`,
      opacity: '0.6',
      transition: 'opacity 150ms',
      cursor: 'pointer',
      pointerEvents: 'auto',
    })

    // Hover effect
    connector.addEventListener('mouseenter', () => {
      connector.style.opacity = '1'
    })
    connector.addEventListener('mouseleave', () => {
      connector.style.opacity = '0.6'
    })

    return connector
  }

  /**
   * Create the action button for converting to a layout
   */
  private createActionButton(group: AlignmentGroup, containerRect: DOMRect): HTMLElement {
    const action = document.createElement('div')
    action.className = 'inference-action'

    // Position at center of group
    const minX = Math.min(...group.elements.map(e => e.rect.left))
    const maxX = Math.max(...group.elements.map(e => e.rect.right))
    const avgY = group.elements.reduce((sum, e) => sum + e.centerY, 0) / group.elements.length

    const centerX = (minX + maxX) / 2 - containerRect.left
    const y = avgY - containerRect.top - 24 // Position above the line

    // Format label based on alignment type
    const layoutLabel = group.type === 'horizontal' ? 'HStack' : 'VStack'
    const label = `→ ${layoutLabel} gap ${group.inferredGap}`

    action.textContent = label

    Object.assign(action.style, {
      position: 'absolute',
      left: `${centerX}px`,
      top: `${y}px`,
      transform: 'translateX(-50%)',
      padding: '4px 8px',
      background: this.color,
      color: 'white',
      fontSize: '11px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: '500',
      borderRadius: '4px',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 150ms',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      zIndex: String(Z_INDEX_INFERENCE_TEXT),
    })

    // Click handler
    action.addEventListener('click', (e) => {
      e.stopPropagation()
      this.onConvert?.(group)
    })

    return action
  }

  /**
   * Hide a specific group's indicators
   */
  hideGroup(groupId: string): void {
    const groupElements = this.activeGroups.get(groupId)
    if (groupElements) {
      for (const connector of groupElements.connectors) {
        connector.remove()
      }
      groupElements.action.remove()
      this.activeGroups.delete(groupId)
    }
  }

  /**
   * Hide all indicators
   */
  hideAll(): void {
    for (const groupId of this.activeGroups.keys()) {
      this.hideGroup(groupId)
    }
  }

  /**
   * Ensure overlay is in DOM (call after preview refresh)
   */
  ensureOverlay(): void {
    if (!this.overlay || !this.container.contains(this.overlay)) {
      this.createOverlay()
    }
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.hideAll()
    this.overlay?.remove()
    this.overlay = null
  }
}

/**
 * Create an InferenceIndicator instance
 */
export function createInferenceIndicator(config: InferenceIndicatorConfig): InferenceIndicator {
  return new InferenceIndicator(config)
}
