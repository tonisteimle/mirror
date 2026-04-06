/**
 * Mode Debouncing Tests
 *
 * Tests for the mode transition debouncing in DragDropSystem.
 * Verifies that transitions between flex and absolute modes are debounced
 * to prevent visual flicker.
 *
 * Note: These tests use a mock approach since the full DragDropSystem
 * requires strategy modules that have complex dependencies.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/** Debounce delay matches the constant in drag-drop-system.ts */
const MODE_TRANSITION_DEBOUNCE_MS = 80

/**
 * Mock implementation of mode debouncing logic for testing.
 * This mirrors the behavior in DragDropSystem without needing
 * the full strategy registry.
 */
class ModeDebouncer {
  private currentMode: 'flex' | 'absolute' | null = null
  private lastStableMode: 'flex' | 'absolute' | null = null
  private transitionTimer: ReturnType<typeof setTimeout> | null = null
  private debounceDelay: number

  constructor(debounceDelay = MODE_TRANSITION_DEBOUNCE_MS) {
    this.debounceDelay = debounceDelay
  }

  /**
   * Handle mode transition. Returns true if using stable mode (debouncing).
   */
  handleTransition(newMode: 'flex' | 'absolute'): boolean {
    // First mode - no debounce needed
    if (this.currentMode === null) {
      this.currentMode = newMode
      this.lastStableMode = newMode
      return false
    }

    // Same mode - clear timer and update stable
    if (this.currentMode === newMode) {
      this.clearTimer()
      this.lastStableMode = newMode
      return false
    }

    // Mode changed - start debounce
    if (!this.transitionTimer) {
      this.transitionTimer = setTimeout(() => {
        this.currentMode = newMode
        this.lastStableMode = newMode
        this.transitionTimer = null
      }, this.debounceDelay)
    }

    // Return true to indicate we should use stable mode
    return this.lastStableMode !== null
  }

  clearTimer(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer)
      this.transitionTimer = null
    }
  }

  reset(): void {
    this.clearTimer()
    this.currentMode = null
    this.lastStableMode = null
  }

  getCurrentMode(): 'flex' | 'absolute' | null {
    return this.currentMode
  }

  getLastStableMode(): 'flex' | 'absolute' | null {
    return this.lastStableMode
  }

  hasActiveTimer(): boolean {
    return this.transitionTimer !== null
  }
}

describe('Mode Debouncing', () => {
  let debouncer: ModeDebouncer

  beforeEach(() => {
    vi.useFakeTimers()
    debouncer = new ModeDebouncer()
  })

  afterEach(() => {
    debouncer.reset()
    vi.useRealTimers()
  })

  // ============================================
  // Basic debouncing behavior
  // ============================================

  describe('basic debouncing', () => {
    it('applies debounce delay when switching from flex to absolute mode', () => {
      // Start in flex mode
      debouncer.handleTransition('flex')
      expect(debouncer.getCurrentMode()).toBe('flex')

      // Switch to absolute - should start debounce
      const useStable = debouncer.handleTransition('absolute')
      expect(useStable).toBe(true) // Should use stable mode during debounce

      // Timer should be active
      expect(debouncer.hasActiveTimer()).toBe(true)

      // Mode should still be flex (debouncing)
      expect(debouncer.getLastStableMode()).toBe('flex')
    })

    it('commits to new mode after debounce delay', () => {
      // Start in flex
      debouncer.handleTransition('flex')

      // Switch to absolute
      debouncer.handleTransition('absolute')

      // Fast forward past debounce delay
      vi.advanceTimersByTime(MODE_TRANSITION_DEBOUNCE_MS + 10)

      // Now should be committed to absolute mode
      expect(debouncer.getCurrentMode()).toBe('absolute')
      expect(debouncer.getLastStableMode()).toBe('absolute')
      expect(debouncer.hasActiveTimer()).toBe(false)
    })

    it('clears debounce timer on reset', () => {
      // Start mode change
      debouncer.handleTransition('flex')
      debouncer.handleTransition('absolute')
      expect(debouncer.hasActiveTimer()).toBe(true)

      // Reset (simulates drag end)
      debouncer.reset()

      // Timer should be cleared
      expect(debouncer.hasActiveTimer()).toBe(false)

      // Advance timers - should not cause errors
      expect(() => {
        vi.advanceTimersByTime(MODE_TRANSITION_DEBOUNCE_MS + 10)
      }).not.toThrow()
    })
  })

  // ============================================
  // Same mode transitions
  // ============================================

  describe('same mode transitions', () => {
    it('updates immediately when staying in same mode', () => {
      // First transition to flex
      debouncer.handleTransition('flex')

      // Multiple transitions staying in flex - no debounce
      let useStable = debouncer.handleTransition('flex')
      expect(useStable).toBe(false)
      expect(debouncer.hasActiveTimer()).toBe(false)

      useStable = debouncer.handleTransition('flex')
      expect(useStable).toBe(false)
      expect(debouncer.hasActiveTimer()).toBe(false)
    })

    it('does not start debounce timer when mode stays the same', () => {
      // Start in flex
      debouncer.handleTransition('flex')

      // Stay in flex
      debouncer.handleTransition('flex')
      debouncer.handleTransition('flex')
      debouncer.handleTransition('flex')

      // No debounce timer should be running
      expect(debouncer.hasActiveTimer()).toBe(false)
    })
  })

  // ============================================
  // Rapid mode changes
  // ============================================

  describe('rapid mode changes', () => {
    it('handles rapid flex-absolute-flex transitions', () => {
      // Rapid transitions should not cause errors
      expect(() => {
        debouncer.handleTransition('flex')
        debouncer.handleTransition('absolute')
        debouncer.handleTransition('flex')
        debouncer.handleTransition('absolute')
        debouncer.handleTransition('flex')
      }).not.toThrow()
    })

    it('maintains stable mode during rapid transitions', () => {
      // Start in flex
      debouncer.handleTransition('flex')

      // Rapid changes
      debouncer.handleTransition('absolute') // Starts timer
      vi.advanceTimersByTime(10)
      debouncer.handleTransition('flex')     // Timer still running
      vi.advanceTimersByTime(10)
      debouncer.handleTransition('absolute')

      // Last stable mode should still be flex
      expect(debouncer.getLastStableMode()).toBe('flex')
    })

    it('uses last stable model during mode changes', () => {
      // Start in flex
      debouncer.handleTransition('flex')

      // Multiple rapid transitions
      const results: { mode: string; useStable: boolean }[] = []

      for (let i = 0; i < 10; i++) {
        const mode = i % 2 === 0 ? 'flex' : 'absolute'
        const useStable = debouncer.handleTransition(mode)
        results.push({ mode, useStable })

        vi.advanceTimersByTime(10) // Less than debounce delay
      }

      // Even iterations (0, 2, 4, ...) are 'flex' - same as currentMode, should NOT use stable
      // Odd iterations (1, 3, 5, ...) are 'absolute' - different from currentMode, should use stable
      for (let i = 0; i < results.length; i++) {
        if (i % 2 === 0) {
          // Same mode as current - no debouncing
          expect(results[i].useStable).toBe(false)
        } else {
          // Different mode - use stable during debounce
          expect(results[i].useStable).toBe(true)
        }
      }

      // Current mode should still be flex (never committed to absolute)
      expect(debouncer.getLastStableMode()).toBe('flex')
    })
  })

  // ============================================
  // Timer cleanup
  // ============================================

  describe('timer cleanup', () => {
    it('clears timer on reset', () => {
      // Start a mode transition
      debouncer.handleTransition('flex')
      debouncer.handleTransition('absolute')

      // Reset before timer fires
      debouncer.reset()

      // Advance timers - should not cause errors
      expect(() => {
        vi.advanceTimersByTime(MODE_TRANSITION_DEBOUNCE_MS + 100)
      }).not.toThrow()

      // State should be cleared
      expect(debouncer.getCurrentMode()).toBeNull()
      expect(debouncer.getLastStableMode()).toBeNull()
    })

    it('can be reused after reset', () => {
      // Use the debouncer
      debouncer.handleTransition('flex')
      debouncer.handleTransition('absolute')

      // Reset
      debouncer.reset()

      // Use again
      debouncer.handleTransition('absolute')
      expect(debouncer.getCurrentMode()).toBe('absolute')
    })
  })

  // ============================================
  // First mode selection
  // ============================================

  describe('first mode selection', () => {
    it('sets mode immediately on first call', () => {
      const useStable = debouncer.handleTransition('flex')

      expect(useStable).toBe(false) // No debouncing for first call
      expect(debouncer.getCurrentMode()).toBe('flex')
      expect(debouncer.getLastStableMode()).toBe('flex')
      expect(debouncer.hasActiveTimer()).toBe(false)
    })

    it('works with absolute as first mode', () => {
      const useStable = debouncer.handleTransition('absolute')

      expect(useStable).toBe(false)
      expect(debouncer.getCurrentMode()).toBe('absolute')
      expect(debouncer.getLastStableMode()).toBe('absolute')
    })
  })
})
