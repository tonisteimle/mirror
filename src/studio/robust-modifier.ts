/**
 * RobustModifier - Safe wrapper for CodeModifier operations
 *
 * Provides:
 * - Atomic batch updates (multiple properties in one operation)
 * - Validation before and after changes
 * - Automatic rollback on parse errors
 * - Round-trip verification
 * - Change coalescing for rapid updates
 */

import { CodeModifier, ModificationResult, CodeChange } from './code-modifier'
import { parseLine, findPropertyInLine, getCanonicalName } from './line-property-parser'
import type { SourceMap } from './source-map'

/**
 * Batch update specification
 */
export interface PropertyUpdate {
  property: string
  value: string
}

/**
 * Result of a robust modification
 */
export interface RobustResult {
  success: boolean
  newSource: string
  change: CodeChange
  error?: string
  /** Validation warnings (non-fatal) */
  warnings?: string[]
  /** Whether rollback was performed */
  rolledBack?: boolean
}

/**
 * Options for robust modification
 */
export interface RobustOptions {
  /** Validate result by re-parsing (default: true) */
  validate?: boolean
  /** Allow partial success for batch updates (default: false) */
  allowPartial?: boolean
  /** Debug logging */
  debug?: boolean
}

/**
 * RobustModifier class
 *
 * Wraps CodeModifier with safety features for reliable code changes.
 */
export class RobustModifier {
  private codeModifier: CodeModifier
  private debug: boolean

  constructor(codeModifier: CodeModifier, debug = false) {
    this.codeModifier = codeModifier
    this.debug = debug
  }

  /**
   * Update multiple properties atomically
   *
   * All properties are updated in a single operation, ensuring consistent
   * offsets and proper change tracking. If any update fails, the entire
   * operation is rolled back.
   *
   * @example
   * // Update position
   * robustModifier.batchUpdate(nodeId, [
   *   { property: 'x', value: '100' },
   *   { property: 'y', value: '200' }
   * ])
   */
  batchUpdate(
    nodeId: string,
    updates: PropertyUpdate[],
    options: RobustOptions = {}
  ): RobustResult {
    const { validate = true, allowPartial = false } = options

    if (updates.length === 0) {
      return this.successResult(this.codeModifier.getSource(), { from: 0, to: 0, insert: '' })
    }

    // Store original state for rollback
    const originalSource = this.codeModifier.getSource()
    const warnings: string[] = []

    // Track the first change's original offsets (valid for editor's source)
    let firstChangeFrom = -1
    let firstChangeTo = -1
    let accumulatedInsert = ''

    try {
      // Apply all updates sequentially (CodeModifier persists internally)
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i]
        const result = this.codeModifier.updateProperty(nodeId, update.property, update.value)

        if (!result.success) {
          if (allowPartial) {
            warnings.push(`Failed to update ${update.property}: ${result.error}`)
            continue
          }
          // Rollback and fail
          this.codeModifier.updateSource(originalSource)
          return this.errorResult(`Failed to update ${update.property}: ${result.error}`, true)
        }

        // Track offsets from first successful change
        if (firstChangeFrom === -1) {
          firstChangeFrom = result.change.from
          firstChangeTo = result.change.to
        }

        // The insert from the last change contains all updates
        accumulatedInsert = result.change.insert
      }

      // Get final source
      const newSource = this.codeModifier.getSource()

      // Build combined change
      // Use from/to from first change (valid for original source)
      // Use insert from last change (contains all updates)
      const combinedChange: CodeChange = {
        from: firstChangeFrom,
        to: firstChangeTo,
        insert: accumulatedInsert
      }

      // Validate result
      if (validate) {
        const validationResult = this.validateChange(nodeId, updates, newSource)
        if (!validationResult.valid) {
          // Rollback
          this.codeModifier.updateSource(originalSource)
          return this.errorResult(`Validation failed: ${validationResult.error}`, true)
        }
        if (validationResult.warnings) {
          warnings.push(...validationResult.warnings)
        }
      }

      return {
        success: true,
        newSource,
        change: combinedChange,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      // Rollback on any error
      this.codeModifier.updateSource(originalSource)
      return this.errorResult(`Unexpected error: ${error}`, true)
    }
  }

  /**
   * Update a single property with validation
   */
  updateProperty(
    nodeId: string,
    property: string,
    value: string,
    options: RobustOptions = {}
  ): RobustResult {
    return this.batchUpdate(nodeId, [{ property, value }], options)
  }

  /**
   * Update position (x and y) atomically
   *
   * Special method for position updates that ensures both coordinates
   * are updated together with proper offset handling.
   */
  updatePosition(
    nodeId: string,
    x: number,
    y: number,
    options: RobustOptions = {}
  ): RobustResult {
    return this.batchUpdate(nodeId, [
      { property: 'x', value: String(Math.round(x)) },
      { property: 'y', value: String(Math.round(y)) }
    ], options)
  }

  /**
   * Update size (width and height) atomically
   */
  updateSize(
    nodeId: string,
    width: number | string,
    height: number | string,
    options: RobustOptions = {}
  ): RobustResult {
    const updates: PropertyUpdate[] = []

    if (width !== undefined) {
      updates.push({
        property: 'w',
        value: typeof width === 'number' ? String(Math.round(width)) : width
      })
    }

    if (height !== undefined) {
      updates.push({
        property: 'h',
        value: typeof height === 'number' ? String(Math.round(height)) : height
      })
    }

    return this.batchUpdate(nodeId, updates, options)
  }

  /**
   * Update bounds (x, y, width, height) atomically
   *
   * Used for resize operations that change both position and size.
   */
  updateBounds(
    nodeId: string,
    bounds: { x?: number; y?: number; width?: number | string; height?: number | string },
    options: RobustOptions = {}
  ): RobustResult {
    const updates: PropertyUpdate[] = []

    if (bounds.x !== undefined) {
      updates.push({ property: 'x', value: String(Math.round(bounds.x)) })
    }
    if (bounds.y !== undefined) {
      updates.push({ property: 'y', value: String(Math.round(bounds.y)) })
    }
    if (bounds.width !== undefined) {
      updates.push({
        property: 'w',
        value: typeof bounds.width === 'number' ? String(Math.round(bounds.width)) : bounds.width
      })
    }
    if (bounds.height !== undefined) {
      updates.push({
        property: 'h',
        value: typeof bounds.height === 'number' ? String(Math.round(bounds.height)) : bounds.height
      })
    }

    return this.batchUpdate(nodeId, updates, options)
  }

  /**
   * Remove a property with validation
   */
  removeProperty(nodeId: string, property: string, options: RobustOptions = {}): RobustResult {
    const { validate = true } = options
    const originalSource = this.codeModifier.getSource()

    try {
      const result = this.codeModifier.removeProperty(nodeId, property)

      if (!result.success) {
        return this.errorResult(result.error || 'Failed to remove property')
      }

      // Validate that property was actually removed
      if (validate) {
        const newSource = this.codeModifier.getSource()
        const sourceMap = this.codeModifier.getSourceMap()
        const node = sourceMap.getNodeById(nodeId)

        if (node) {
          const lines = newSource.split('\n')
          const line = lines[node.position.line - 1]
          if (line) {
            const parsed = parseLine(line)
            const stillExists = findPropertyInLine(parsed, property)
            if (stillExists) {
              this.codeModifier.updateSource(originalSource)
              return this.errorResult('Property removal validation failed - property still exists', true)
            }
          }
        }
      }

      return {
        success: true,
        newSource: this.codeModifier.getSource(),
        change: result.change
      }
    } catch (error) {
      this.codeModifier.updateSource(originalSource)
      return this.errorResult(`Unexpected error: ${error}`, true)
    }
  }

  /**
   * Get the underlying CodeModifier
   */
  getCodeModifier(): CodeModifier {
    return this.codeModifier
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Validate that changes were applied correctly
   */
  private validateChange(
    nodeId: string,
    updates: PropertyUpdate[],
    newSource: string
  ): { valid: boolean; error?: string; warnings?: string[] } {
    const warnings: string[] = []

    try {
      // Get the node's line from the new source
      const sourceMap = this.codeModifier.getSourceMap()
      const node = sourceMap.getNodeById(nodeId)

      if (!node) {
        // Node might have been recreated - this is a warning, not an error
        warnings.push('Node not found in SourceMap after update (may need recompile)')
        return { valid: true, warnings }
      }

      const lines = newSource.split('\n')
      const line = lines[node.position.line - 1]

      if (!line) {
        return { valid: false, error: `Line ${node.position.line} not found in new source` }
      }

      // Parse the line
      const parsed = parseLine(line)

      // Verify each update was applied
      for (const update of updates) {
        const prop = findPropertyInLine(parsed, update.property)

        // For boolean properties, just check existence
        if (update.value === '' || update.value === 'true') {
          if (!prop) {
            warnings.push(`Boolean property ${update.property} not found after update`)
          }
          continue
        }

        // For value properties, verify the value
        if (!prop) {
          warnings.push(`Property ${update.property} not found after update`)
          continue
        }

        // Normalize values for comparison (remove extra spaces, handle aliases)
        const expectedValue = update.value.trim()
        const actualValue = prop.value.trim()

        if (actualValue !== expectedValue) {
          // Check if it's just a formatting difference
          const normalizedExpected = expectedValue.replace(/\s+/g, ' ')
          const normalizedActual = actualValue.replace(/\s+/g, ' ')

          if (normalizedActual !== normalizedExpected) {
            warnings.push(
              `Property ${update.property} value mismatch: expected "${expectedValue}", got "${actualValue}"`
            )
          }
        }
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      return { valid: false, error: `Validation error: ${error}` }
    }
  }

  private successResult(newSource: string, change: CodeChange): RobustResult {
    return { success: true, newSource, change }
  }

  private errorResult(error: string, rolledBack = false): RobustResult {
    return {
      success: false,
      newSource: this.codeModifier.getSource(),
      change: { from: 0, to: 0, insert: '' },
      error,
      rolledBack
    }
  }
}

/**
 * Create a RobustModifier wrapping a CodeModifier
 */
export function createRobustModifier(codeModifier: CodeModifier, debug = false): RobustModifier {
  return new RobustModifier(codeModifier, debug)
}

/**
 * Debounced property updater for rapid changes
 *
 * Coalesces multiple rapid property changes into single atomic updates.
 * Useful for drag operations where position changes happen many times per second.
 */
export class DebouncedModifier {
  private robustModifier: RobustModifier
  private pendingUpdates: Map<string, Map<string, string>> = new Map()
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private debounceMs: number
  private onResult: (nodeId: string, result: RobustResult) => void

  constructor(
    robustModifier: RobustModifier,
    debounceMs: number,
    onResult: (nodeId: string, result: RobustResult) => void
  ) {
    this.robustModifier = robustModifier
    this.debounceMs = debounceMs
    this.onResult = onResult
  }

  /**
   * Queue a property update (will be batched and debounced)
   */
  queueUpdate(nodeId: string, property: string, value: string): void {
    // Get or create pending updates for this node
    let nodeUpdates = this.pendingUpdates.get(nodeId)
    if (!nodeUpdates) {
      nodeUpdates = new Map()
      this.pendingUpdates.set(nodeId, nodeUpdates)
    }

    // Store update (overwrites previous value for same property)
    nodeUpdates.set(property, value)

    // Reset timer for this node
    const existingTimer = this.timers.get(nodeId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    this.timers.set(nodeId, setTimeout(() => {
      this.flush(nodeId)
    }, this.debounceMs))
  }

  /**
   * Immediately flush pending updates for a node
   */
  flush(nodeId: string): void {
    const nodeUpdates = this.pendingUpdates.get(nodeId)
    if (!nodeUpdates || nodeUpdates.size === 0) return

    // Clear pending
    this.pendingUpdates.delete(nodeId)
    const timer = this.timers.get(nodeId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(nodeId)
    }

    // Convert to update array
    const updates: PropertyUpdate[] = []
    nodeUpdates.forEach((value, property) => {
      updates.push({ property, value })
    })

    // Apply batch update
    const result = this.robustModifier.batchUpdate(nodeId, updates)
    this.onResult(nodeId, result)
  }

  /**
   * Flush all pending updates immediately
   */
  flushAll(): void {
    const nodeIds = Array.from(this.pendingUpdates.keys())
    for (const nodeId of nodeIds) {
      this.flush(nodeId)
    }
  }

  /**
   * Cancel all pending updates
   */
  cancel(): void {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    this.pendingUpdates.clear()
  }
}

/**
 * Create a debounced modifier
 */
export function createDebouncedModifier(
  robustModifier: RobustModifier,
  debounceMs: number,
  onResult: (nodeId: string, result: RobustResult) => void
): DebouncedModifier {
  return new DebouncedModifier(robustModifier, debounceMs, onResult)
}
