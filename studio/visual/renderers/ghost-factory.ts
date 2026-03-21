/**
 * GhostFactory - Unified ghost element creation
 *
 * Centralizes ghost element creation for drag operations.
 * Used by DragRenderer for consistent ghost element creation.
 *
 * Ghost Types:
 * - Clone: Full visual copy of the dragged element (for existing elements)
 * - Placeholder: Styled box with component preview (for palette drags)
 *
 * Design Decisions:
 * - Clone is preferred for existing elements (shows exact visual)
 * - Placeholder is used for new components (shows preview with size)
 * - All ghosts use fixed positioning for consistent behavior
 * - Ghosts are appended to document.body for z-index isolation
 */

import type { Rect, Point } from '../models/coordinate'
import { Z_INDEX_GHOST } from '../constants/z-index'

// ============================================================================
// Types
// ============================================================================

export interface GhostConfig {
  /** Opacity of the ghost (0-1, default: 0.7) */
  opacity?: number
  /** Z-index for the ghost (default: 10001) */
  zIndex?: number
  /** Whether to add shadow (default: true) */
  shadow?: boolean
  /** Border radius in pixels (default: 4) */
  borderRadius?: number
  /** Border style for placeholder ghosts */
  borderStyle?: 'solid' | 'dashed'
  /** Border color (default: #3b82f6) */
  borderColor?: string
}

export interface PlaceholderConfig extends GhostConfig {
  /** Component name to display */
  componentName?: string
  /** Background color (default: rgba(59, 130, 246, 0.1)) */
  backgroundColor?: string
  /** Show component name label */
  showLabel?: boolean
}

export type GhostSource =
  | { type: 'element'; element: HTMLElement }
  | { type: 'placeholder'; size: { width: number; height: number }; config?: PlaceholderConfig }

const DEFAULT_CONFIG: Required<GhostConfig> = {
  opacity: 0.7,
  zIndex: Z_INDEX_GHOST,
  shadow: true,
  borderRadius: 4,
  borderStyle: 'solid',
  borderColor: '#3b82f6',
}

const DEFAULT_PLACEHOLDER_SIZE = { width: 100, height: 40 }

// ============================================================================
// GhostFactory
// ============================================================================

export class GhostFactory {
  private config: Required<GhostConfig>
  private activeGhost: HTMLElement | null = null

  constructor(config: GhostConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Create a ghost element from source
   */
  create(source: GhostSource): HTMLElement {
    // Clean up any existing ghost
    this.dispose()

    if (source.type === 'element') {
      this.activeGhost = this.createCloneGhost(source.element)
    } else {
      this.activeGhost = this.createPlaceholderGhost(source.size, source.config)
    }

    document.body.appendChild(this.activeGhost)
    return this.activeGhost
  }

  /**
   * Create a clone ghost from an existing element
   */
  createFromElement(element: HTMLElement): HTMLElement {
    return this.create({ type: 'element', element })
  }

  /**
   * Create a placeholder ghost for palette drags
   */
  createPlaceholder(
    size: { width: number; height: number } = DEFAULT_PLACEHOLDER_SIZE,
    config?: PlaceholderConfig
  ): HTMLElement {
    return this.create({ type: 'placeholder', size, config })
  }

  /**
   * Update ghost position
   */
  setPosition(position: Point): void {
    if (!this.activeGhost) return
    this.activeGhost.style.transform = `translate(${position.x}px, ${position.y}px)`
  }

  /**
   * Update ghost position and size
   */
  setRect(rect: Rect): void {
    if (!this.activeGhost) return
    Object.assign(this.activeGhost.style, {
      transform: `translate(${rect.x}px, ${rect.y}px)`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    })
  }

  /**
   * Get the active ghost element
   */
  getGhost(): HTMLElement | null {
    return this.activeGhost
  }

  /**
   * Check if a ghost is active
   */
  hasGhost(): boolean {
    return this.activeGhost !== null
  }

  /**
   * Remove the ghost element
   */
  dispose(): void {
    if (this.activeGhost) {
      this.activeGhost.remove()
      this.activeGhost = null
    }
  }

  // --------------------------------------------------------------------------
  // Ghost Creation
  // --------------------------------------------------------------------------

  /**
   * Create a clone of an existing element as ghost
   */
  private createCloneGhost(element: HTMLElement): HTMLElement {
    const ghost = element.cloneNode(true) as HTMLElement
    const rect = element.getBoundingClientRect()

    // Remove any selection-related classes
    ghost.classList.remove(
      'studio-selected',
      'studio-hover',
      'studio-multi-selected',
      'studio-drop-target'
    )

    // Remove data attributes that could cause conflicts
    ghost.removeAttribute('data-mirror-id')

    // Apply ghost styles
    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      pointerEvents: 'none',
      opacity: String(this.config.opacity),
      zIndex: String(this.config.zIndex),
      transform: `translate(${rect.left}px, ${rect.top}px)`,
      borderRadius: `${this.config.borderRadius}px`,
      boxSizing: 'border-box',
      // Prevent any transitions during drag
      transition: 'none',
      animation: 'none',
    })

    if (this.config.shadow) {
      ghost.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
    }

    // Add visual indicator that this is being dragged
    ghost.style.outline = `2px ${this.config.borderStyle} ${this.config.borderColor}`
    ghost.style.outlineOffset = '-2px'

    return ghost
  }

  /**
   * Create a placeholder ghost for new components
   */
  private createPlaceholderGhost(
    size: { width: number; height: number },
    config?: PlaceholderConfig
  ): HTMLElement {
    const ghost = document.createElement('div')
    ghost.className = 'mirror-ghost-placeholder'

    const mergedConfig = { ...this.config, ...config }
    const bgColor = config?.backgroundColor ?? 'rgba(59, 130, 246, 0.1)'

    Object.assign(ghost.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: `${size.width}px`,
      height: `${size.height}px`,
      pointerEvents: 'none',
      opacity: String(mergedConfig.opacity),
      zIndex: String(mergedConfig.zIndex),
      transform: 'translate(0, 0)',
      border: `2px ${mergedConfig.borderStyle} ${mergedConfig.borderColor}`,
      borderRadius: `${mergedConfig.borderRadius}px`,
      backgroundColor: bgColor,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'none',
    })

    if (mergedConfig.shadow) {
      ghost.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
    }

    // Add component name label if configured
    if (config?.showLabel && config?.componentName) {
      const label = document.createElement('span')
      label.textContent = config.componentName
      Object.assign(label.style, {
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
        color: mergedConfig.borderColor,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        userSelect: 'none',
      })
      ghost.appendChild(label)
    }

    return ghost
  }
}

// ============================================================================
// Singleton & Factory Functions
// ============================================================================

let defaultFactory: GhostFactory | null = null

/**
 * Get or create the default ghost factory
 */
export function getGhostFactory(config?: GhostConfig): GhostFactory {
  if (!defaultFactory) {
    defaultFactory = new GhostFactory(config)
  }
  return defaultFactory
}

/**
 * Create a new ghost factory with custom config
 */
export function createGhostFactory(config?: GhostConfig): GhostFactory {
  return new GhostFactory(config)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate ghost position from cursor and grab offset
 */
export function calculateGhostPosition(
  cursorPosition: Point,
  grabOffset: Point,
  elementRect: Rect
): Point {
  return {
    x: cursorPosition.x - grabOffset.x,
    y: cursorPosition.y - grabOffset.y,
  }
}

/**
 * Calculate ghost rect for element drags
 */
export function calculateElementGhostRect(
  cursorPosition: Point,
  grabOffset: Point,
  originalRect: Rect
): Rect {
  return {
    x: cursorPosition.x - grabOffset.x,
    y: cursorPosition.y - grabOffset.y,
    width: originalRect.width,
    height: originalRect.height,
  }
}

/**
 * Calculate ghost rect for palette drags (centered on cursor)
 */
export function calculatePaletteGhostRect(
  cursorPosition: Point,
  size: { width: number; height: number }
): Rect {
  return {
    x: cursorPosition.x - size.width / 2,
    y: cursorPosition.y - size.height / 2,
    width: size.width,
    height: size.height,
  }
}

/**
 * Default sizes for common component types
 */
export const COMPONENT_DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  // Basic components
  Box: { width: 100, height: 100 },
  Text: { width: 80, height: 24 },
  Button: { width: 80, height: 36 },
  Input: { width: 200, height: 36 },
  Textarea: { width: 200, height: 100 },
  Image: { width: 100, height: 100 },
  Icon: { width: 24, height: 24 },

  // Layout components
  'V-Box': { width: 200, height: 150 },
  'H-Box': { width: 200, height: 60 },
  Grid: { width: 200, height: 150 },
  ZStack: { width: 150, height: 150 },

  // Semantic components
  Header: { width: 300, height: 60 },
  Footer: { width: 300, height: 48 },
  Nav: { width: 200, height: 300 },
  Section: { width: 300, height: 200 },
}

/**
 * Get default size for a component type
 */
export function getDefaultSize(componentName: string): { width: number; height: number } {
  return COMPONENT_DEFAULT_SIZES[componentName] ?? { width: 100, height: 40 }
}
