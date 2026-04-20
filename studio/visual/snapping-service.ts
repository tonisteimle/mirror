/**
 * SnappingService - Token and Grid Snapping for Handle Dragging
 *
 * Provides intelligent snapping during drag operations:
 * - Token-Snapping: Padding/Margin/Gap snap to design token values
 * - Grid-Snapping: Resize/Position snap to configurable grid (4px, 8px)
 *
 * Modifier keys:
 * - Cmd/Ctrl: Bypass all snapping (free drag)
 */

import { handleSnapSettings, gridSettings, events } from '../core'

// ============================================================================
// Types
// ============================================================================

export interface SnapResult {
  /** The snapped value (or original if no snap occurred) */
  value: number
  /** Whether snapping occurred */
  snapped: boolean
  /** Token name if snapped to a token (e.g., "$s") */
  tokenName?: string
  /** Whether this was a grid snap */
  gridSnapped?: boolean
}

export interface SpacingToken {
  /** Short name (e.g., "s", "m", "l") */
  name: string
  /** Full name with suffix (e.g., "s.pad", "m.mar") */
  fullName: string
  /** Numeric value */
  value: number
  /** Property suffix (e.g., "pad", "mar", "gap") */
  suffix: string
}

export type SpacingPropertyType = 'pad' | 'mar' | 'gap'

// ============================================================================
// SnappingService Class
// ============================================================================

export class SnappingService {
  private spacingTokens: SpacingToken[] = []
  private getSource: () => string
  private cachedSourceHash: string = ''

  constructor(getSource: () => string) {
    this.getSource = getSource
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Hash source for cache invalidation
   */
  private hashSource(source: string): string {
    let hash = 0
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * Refresh tokens from source code
   */
  refreshTokens(): void {
    const source = this.getSource()
    const hash = this.hashSource(source)

    // Skip if source hasn't changed
    if (hash === this.cachedSourceHash) return

    this.cachedSourceHash = hash
    this.spacingTokens = this.parseSpacingTokens(source)
  }

  /**
   * Parse spacing tokens from source code
   * Looks for patterns like: s.pad: 4, m.mar: 8, l.gap: 16
   */
  private parseSpacingTokens(source: string): SpacingToken[] {
    const tokens: SpacingToken[] = []
    const lines = source.split('\n')

    // Match patterns like: s.pad: 4 or $s.pad: 4
    const suffixes = ['pad', 'mar', 'gap']
    for (const suffix of suffixes) {
      const regex = new RegExp(`^\\$?([a-zA-Z0-9_-]+)\\.${suffix}\\s*:\\s*(\\d+)`, 'gm')
      let match

      while ((match = regex.exec(source)) !== null) {
        const name = match[1]
        const value = parseInt(match[2], 10)

        // Avoid duplicates
        if (!tokens.some(t => t.fullName === `${name}.${suffix}`)) {
          tokens.push({
            name,
            fullName: `${name}.${suffix}`,
            value,
            suffix,
          })
        }
      }
    }

    // Sort by value for consistent snapping order
    return tokens.sort((a, b) => a.value - b.value)
  }

  /**
   * Get spacing tokens filtered by property type
   */
  getSpacingTokens(propertyType?: SpacingPropertyType): SpacingToken[] {
    this.refreshTokens()

    if (propertyType) {
      return this.spacingTokens.filter(t => t.suffix === propertyType)
    }
    return this.spacingTokens
  }

  // ============================================================================
  // Token Snapping
  // ============================================================================

  /**
   * Snap a value to the nearest spacing token
   *
   * @param value - The current value to potentially snap
   * @param propertyType - The property type ('pad', 'mar', 'gap')
   * @returns SnapResult with snapped value and token info
   */
  snapToToken(value: number, propertyType: SpacingPropertyType): SnapResult {
    const settings = handleSnapSettings.get()

    // Check if token snapping is enabled
    if (!settings.enabled || !settings.tokenSnapping) {
      return { value, snapped: false }
    }

    const threshold = settings.threshold
    const relevantTokens = this.getSpacingTokens(propertyType)

    // Find the CLOSEST token within threshold (not just the first one)
    let closestToken: SpacingToken | null = null
    let closestDistance = Infinity

    for (const token of relevantTokens) {
      const distance = Math.abs(value - token.value)
      if (distance <= threshold && distance < closestDistance) {
        closestToken = token
        closestDistance = distance
      }
    }

    if (closestToken) {
      return {
        value: closestToken.value,
        snapped: true,
        tokenName: `$${closestToken.name}`,
      }
    }

    return { value, snapped: false }
  }

  // ============================================================================
  // Grid Snapping
  // ============================================================================

  /**
   * Snap a value to the grid
   *
   * @param value - The current value to potentially snap
   * @returns SnapResult with snapped value
   */
  snapToGrid(value: number): SnapResult {
    const settings = gridSettings.get()

    if (!settings.enabled) {
      return { value, snapped: false }
    }

    const gridSize = settings.size
    const snappedValue = Math.round(value / gridSize) * gridSize

    return {
      value: snappedValue,
      snapped: snappedValue !== value,
      gridSnapped: true,
    }
  }

  /**
   * Snap both width and height to grid
   */
  snapSizeToGrid(width: number, height: number): { width: SnapResult; height: SnapResult } {
    return {
      width: this.snapToGrid(width),
      height: this.snapToGrid(height),
    }
  }

  // ============================================================================
  // Combined Snapping
  // ============================================================================

  /**
   * Snap a spacing value to tokens
   *
   * Logic:
   * - If tokens exist for this property type → snap ONLY to tokens
   * - If NO tokens exist for this property type → fall back to grid snapping
   *
   * @param value - The current value
   * @param propertyType - The property type
   * @returns SnapResult
   */
  snapSpacing(value: number, propertyType: SpacingPropertyType): SnapResult {
    const relevantTokens = this.getSpacingTokens(propertyType)

    // If tokens exist for this property type, ONLY snap to tokens (no grid fallback)
    if (relevantTokens.length > 0) {
      return this.snapToToken(value, propertyType)
    }

    // No tokens defined for this property type → fall back to grid snapping
    const handleSettings = handleSnapSettings.get()
    if (handleSettings.enabled) {
      const gridSize = handleSettings.gridSize
      const snappedValue = Math.round(value / gridSize) * gridSize

      if (snappedValue !== value) {
        return {
          value: snappedValue,
          snapped: true,
          gridSnapped: true,
        }
      }
    }

    return { value, snapped: false }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let snappingServiceInstance: SnappingService | null = null

/**
 * Get or create the snapping service singleton
 */
export function getSnappingService(getSource?: () => string): SnappingService | null {
  if (!snappingServiceInstance && getSource) {
    snappingServiceInstance = new SnappingService(getSource)
  }
  return snappingServiceInstance
}

/**
 * Initialize the snapping service
 */
export function initSnappingService(getSource: () => string): SnappingService {
  snappingServiceInstance = new SnappingService(getSource)
  return snappingServiceInstance
}

/**
 * Reset the snapping service (for testing)
 */
export function resetSnappingService(): void {
  snappingServiceInstance = null
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Check if modifier key is pressed to bypass snapping
 */
export function shouldBypassSnapping(e: MouseEvent | KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey
}
