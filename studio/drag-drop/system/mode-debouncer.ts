/**
 * Mode Debouncer
 *
 * Handles debouncing of mode transitions (flex ↔ absolute) during drag operations.
 *
 * When dragging near container edges, the cursor can rapidly cross the boundary
 * between flex and absolute drop zones, causing visual flickering. This debouncer
 * prevents mode switches until the cursor has "settled" in the new zone.
 */

import type { DropResult, DropTarget } from '../types'

// ============================================
// Types
// ============================================

export type DropMode = 'flex' | 'absolute'

interface ModeDebounceState {
  currentMode: DropMode | null
  lastStableModel: { result: DropResult; mode: DropMode } | null
  timer: ReturnType<typeof setTimeout> | null
}

// ============================================
// Constants
// ============================================

/**
 * Debounce delay for mode transitions (flex ↔ absolute).
 *
 * Value derived empirically:
 * - 50ms: Still allows some flickering during fast diagonal drags
 * - 80ms: Good balance between responsiveness and stability
 * - 100ms+: Feels sluggish, noticeable delay when intentionally switching modes
 */
const MODE_TRANSITION_DEBOUNCE_MS = 80

// ============================================
// ModeDebouncer Class
// ============================================

export class ModeDebouncer {
  private state: ModeDebounceState = {
    currentMode: null,
    lastStableModel: null,
    timer: null,
  }

  /**
   * Determine the drop mode for a target.
   */
  getDropMode(target: DropTarget): DropMode {
    return target.layoutType === 'positioned' ? 'absolute' : 'flex'
  }

  /**
   * Handle mode transition with debouncing.
   * Returns the effective DropResult (may be from previous stable state during transition).
   */
  handleTransition(newMode: DropMode, newResult: DropResult): DropResult {
    // Initialize mode on first calculation
    if (this.state.currentMode === null) {
      this.state.currentMode = newMode
      this.state.lastStableModel = { result: newResult, mode: newMode }
      return newResult
    }

    // Same mode - no transition needed
    if (this.state.currentMode === newMode) {
      this.clearTimer()
      this.state.lastStableModel = { result: newResult, mode: newMode }
      return newResult
    }

    // Mode changed - start debounce timer
    if (!this.state.timer) {
      this.state.timer = setTimeout(() => {
        this.state.currentMode = newMode
        this.state.lastStableModel = { result: newResult, mode: newMode }
        this.state.timer = null
      }, MODE_TRANSITION_DEBOUNCE_MS)
    }

    // During transition, use last stable model if available
    return this.state.lastStableModel?.result ?? newResult
  }

  /**
   * Clear the debounce timer.
   */
  clearTimer(): void {
    if (this.state.timer) {
      clearTimeout(this.state.timer)
      this.state.timer = null
    }
  }

  /**
   * Reset all state (call when drag ends).
   */
  reset(): void {
    this.clearTimer()
    this.state.currentMode = null
    this.state.lastStableModel = null
  }

  /**
   * Get current mode (for testing).
   */
  getCurrentMode(): DropMode | null {
    return this.state.currentMode
  }
}

/**
 * Factory function for creating ModeDebouncer instances.
 */
export function createModeDebouncer(): ModeDebouncer {
  return new ModeDebouncer()
}
