/**
 * Render Pipeline - Orchestrates the 4-phase render cycle
 *
 * Phase 2 of Preview Architecture Refactoring
 *
 * The render pipeline ensures a clear, sequential flow:
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │                    RENDER PIPELINE                       │
 * │                                                         │
 * │  Phase 1: Compile       source → compiled               │
 * │  Phase 2: Render        compiled.ir → DOM               │
 * │  Phase 3: Measure       DOM → layoutInfo (ONCE)         │
 * │  Phase 4: Overlays      layoutInfo + selection → UI     │
 * │                                                         │
 * └─────────────────────────────────────────────────────────┘
 *
 * This module handles Phase 3 (Measure) and coordinates Phase 4.
 * Phases 1 and 2 are handled by the existing compiler and renderer.
 */

import { events } from '../core/events'
import { extractAndStoreLayout } from './layout-extractor'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('RenderPipeline')

export interface RenderPipelineConfig {
  /**
   * The preview container element where rendered content lives
   */
  container: HTMLElement

  /**
   * Whether to automatically extract layout after compile:completed
   * Default: true
   */
  autoExtract?: boolean

  /**
   * Callback after layout extraction completes
   */
  onLayoutExtracted?: () => void
}

/**
 * RenderPipeline - Manages the measurement phase after render
 *
 * Subscribes to compile:completed and automatically extracts
 * layout information after DOM has been updated.
 */
export class RenderPipeline {
  private container: HTMLElement
  private autoExtract: boolean
  private onLayoutExtracted?: () => void
  private unsubscribeCompile: (() => void) | null = null
  private pendingExtraction: number | null = null

  constructor(config: RenderPipelineConfig) {
    this.container = config.container
    this.autoExtract = config.autoExtract ?? true
    this.onLayoutExtracted = config.onLayoutExtracted

    if (this.autoExtract) {
      this.attach()
    }
  }

  /**
   * Start listening for compile:completed events
   */
  attach(): void {
    if (this.unsubscribeCompile) return // Already attached

    this.unsubscribeCompile = events.on('compile:completed', () => {
      this.scheduleLayoutExtraction()
    })
  }

  /**
   * Stop listening for events
   */
  detach(): void {
    if (this.unsubscribeCompile) {
      this.unsubscribeCompile()
      this.unsubscribeCompile = null
    }

    if (this.pendingExtraction !== null) {
      cancelAnimationFrame(this.pendingExtraction)
      this.pendingExtraction = null
    }
  }

  /**
   * Schedule layout extraction for the next frame
   *
   * Uses requestAnimationFrame to ensure DOM has been painted
   * and layout is stable before measuring.
   */
  scheduleLayoutExtraction(): void {
    // Cancel any pending extraction
    if (this.pendingExtraction !== null) {
      cancelAnimationFrame(this.pendingExtraction)
    }

    // Use double-RAF to ensure layout is truly stable
    // First RAF: browser has received our changes
    // Second RAF: browser has painted
    this.pendingExtraction = requestAnimationFrame(() => {
      this.pendingExtraction = requestAnimationFrame(() => {
        this.extractLayout()
        this.pendingExtraction = null
      })
    })
  }

  /**
   * Extract layout immediately (synchronous)
   *
   * Use this when you know the DOM is already stable,
   * e.g., after a known synchronous update.
   */
  extractLayoutNow(): void {
    this.extractLayout()
  }

  /**
   * Wait for the next frame and then extract layout
   *
   * Returns a promise that resolves when extraction is complete.
   */
  async extractLayoutAsync(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.nextFrame(() => {
        this.extractLayout()
        resolve()
      })
    })
  }

  /**
   * Internal: Perform the actual layout extraction
   */
  private extractLayout(): void {
    try {
      extractAndStoreLayout(this.container)
      events.emit('preview:rendered', { success: true })
      this.onLayoutExtracted?.()
    } catch (error) {
      log.error('Layout extraction failed:', error)
      events.emit('preview:rendered', { success: false })
    }
  }

  /**
   * Helper: Execute callback on next animation frame
   */
  private nextFrame(callback: () => void): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(callback)
    })
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.detach()
  }
}

/**
 * Create a RenderPipeline instance
 */
export function createRenderPipeline(config: RenderPipelineConfig): RenderPipeline {
  return new RenderPipeline(config)
}

/**
 * Utility: Wait for the next animation frame (double-RAF for layout stability)
 *
 * Use this when you need to ensure layout is stable before reading.
 */
export function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}

/**
 * Utility: Wait for a specific number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}
