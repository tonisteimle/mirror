/**
 * LayoutInferenceManager - Orchestrates layout inference detection and conversion
 *
 * Features:
 * - Debounced detection (non-intrusive)
 * - Automatic refresh after compile
 * - Cleanup on selection change
 */

import type { LayoutInferenceManagerConfig, AlignmentGroup } from './types'
import { AlignmentDetector, createAlignmentDetector } from './alignment-detector'
import { InferenceIndicator, createInferenceIndicator } from './inference-indicator'
import { LayoutConverter, createLayoutConverter, type ConversionResult } from './layout-converter'
import { events } from '../../core'

const DEFAULT_DEBOUNCE_DELAY = 500 // ms

export class LayoutInferenceManager {
  private container: HTMLElement
  private detector: AlignmentDetector
  private indicator: InferenceIndicator
  private converter: LayoutConverter

  private debounceDelay: number
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private isEnabled: boolean = true
  private currentGroups: AlignmentGroup[] = []

  // Event unsubscribers
  private unsubscribers: Array<() => void> = []

  constructor(config: LayoutInferenceManagerConfig) {
    this.container = config.container
    this.debounceDelay = config.debounceDelay ?? DEFAULT_DEBOUNCE_DELAY

    // Create detector
    this.detector = createAlignmentDetector({
      container: config.container,
    })

    // Create indicator with convert callback
    this.indicator = createInferenceIndicator({
      container: config.container,
      onConvert: (group) => this.handleConvert(group),
    })

    // Create converter
    this.converter = createLayoutConverter({
      getSource: config.getSource,
      getSourceMap: config.getSourceMap,
      onSourceChange: config.onSourceChange,
    })

    // Subscribe to relevant events
    this.setupEventListeners()
  }

  /**
   * Set up event listeners for automatic detection
   */
  private setupEventListeners(): void {
    // Detect after compile completes (debounced)
    const compileUnsub = events.on('preview:rendered', () => {
      this.scheduleDetection()
    })
    this.unsubscribers.push(compileUnsub)

    // Hide indicators on selection change (user is interacting)
    const selectionUnsub = events.on('selection:changed', () => {
      this.hideIndicators()
    })
    this.unsubscribers.push(selectionUnsub)

    // Re-detect when preview content changes
    const sourceUnsub = events.on('source:changed', () => {
      this.hideIndicators()
      this.scheduleDetection()
    })
    this.unsubscribers.push(sourceUnsub)
  }

  /**
   * Schedule a detection run (debounced)
   */
  private scheduleDetection(): void {
    if (!this.isEnabled) return

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.detect()
    }, this.debounceDelay)
  }

  /**
   * Run detection and show indicators
   */
  detect(): void {
    if (!this.isEnabled) return

    // Ensure indicator overlay is in DOM
    this.indicator.ensureOverlay()

    const result = this.detector.detect()
    this.currentGroups = result.groups

    if (result.groups.length > 0) {
      this.indicator.showGroups(result.groups)
      events.emit('layout-inference:detected', { groups: result.groups })
    } else {
      this.indicator.hideAll()
    }
  }

  /**
   * Handle conversion request from indicator click
   */
  private handleConvert(group: AlignmentGroup): ConversionResult {
    const result = this.converter.convert(group)

    if (result.success) {
      // Hide indicators after successful conversion
      this.hideIndicators()

      // Emit event
      events.emit('layout-inference:converted', {
        group,
        newSource: result.newSource,
      })
    } else {
      // Emit error event
      events.emit('layout-inference:error', {
        group,
        error: result.error,
      })
    }

    return result
  }

  /**
   * Hide all indicators
   */
  hideIndicators(): void {
    this.indicator.hideAll()
    this.currentGroups = []
  }

  /**
   * Enable/disable the manager
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled) {
      this.hideIndicators()
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
        this.debounceTimer = null
      }
    }
  }

  /**
   * Check if currently enabled
   */
  getEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Get current detected groups
   */
  getCurrentGroups(): AlignmentGroup[] {
    return this.currentGroups
  }

  /**
   * Force a refresh (call after preview DOM updates)
   */
  refresh(): void {
    this.indicator.ensureOverlay()
    if (this.currentGroups.length > 0) {
      this.detect()
    }
  }

  /**
   * Dispose
   */
  dispose(): void {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Unsubscribe from events
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers = []

    // Dispose components
    this.detector.dispose()
    this.indicator.dispose()
    this.converter.dispose()
  }
}

/**
 * Create a LayoutInferenceManager instance
 */
export function createLayoutInferenceManager(
  config: LayoutInferenceManagerConfig
): LayoutInferenceManager {
  return new LayoutInferenceManager(config)
}
