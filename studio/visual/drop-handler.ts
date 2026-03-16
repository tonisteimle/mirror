/**
 * DropHandler - Connects Drop Events with CodeModifier
 *
 * Provides a clean interface between visual drop operations and code modification.
 * Handles:
 * - Zone-based wrapper insertion (semantic zones)
 * - Sibling insertion (before/after)
 * - Child insertion (inside)
 * - Component type mapping (container → HBox/VBox)
 *
 * NOTE: The DragDropManager in src/studio/ already handles drop-to-code integration
 * internally via its insertComponent() method. This DropHandler class provides an
 * alternative API for scenarios where you want to:
 * - Separate visual feedback from code modification
 * - Use a simpler DropData interface (type/component/direction)
 * - Handle drops from non-DragDropManager sources
 */

import { CodeModifier, ModificationResult } from '../../src/studio/code-modifier'
import type { SourceMap } from '../../src/studio/source-map'
import type { DropZoneInfo } from './drag-drop-visualizer'

/**
 * Data transferred during drag operation
 */
export interface DropData {
  /** Type of item being dropped */
  type: 'component' | 'container' | 'layout'
  /** Component name (for type: 'component') */
  component?: string
  /** Direction for containers */
  direction?: 'horizontal' | 'vertical'
  /** Optional properties string */
  properties?: string
  /** Optional text content */
  textContent?: string
}

/**
 * Options for DropHandler
 */
export interface DropHandlerOptions {
  /** Whether to enable smart sizing for dropped components */
  enableSmartSizing?: boolean
}

/**
 * DropHandler class
 */
export class DropHandler {
  private getCodeModifier: () => CodeModifier | null
  private onCodeChange: (newSource: string) => void
  private options: DropHandlerOptions

  constructor(
    getCodeModifier: () => CodeModifier | null,
    onCodeChange: (newSource: string) => void,
    options: DropHandlerOptions = {}
  ) {
    this.getCodeModifier = getCodeModifier
    this.onCodeChange = onCodeChange
    this.options = options
  }

  /**
   * Handle a drop event
   *
   * @param zone - The drop zone info from DragDropVisualizer
   * @param data - The drag data
   * @returns true if drop was successful
   */
  handleDrop(zone: DropZoneInfo, data: DropData): boolean {
    const codeModifier = this.getCodeModifier()
    if (!codeModifier) {
      console.warn('[DropHandler] CodeModifier not available')
      return false
    }

    // Determine component name from drop data
    const componentName = this.getComponentName(data)

    let result: ModificationResult

    if (zone.placement === 'inside') {
      // Zone-based wrapper insertion
      if (zone.semanticZone && zone.semanticZone !== 'mid-center') {
        result = codeModifier.insertWithWrapper(
          zone.targetId,
          componentName,
          zone.semanticZone,
          {
            properties: data.properties,
            textContent: data.textContent,
          }
        )
      } else {
        // Regular child insertion
        result = codeModifier.addChild(zone.targetId, componentName, {
          position: 'last',
          properties: data.properties,
          textContent: data.textContent,
        })
      }
    } else {
      // Sibling insertion (before/after)
      result = codeModifier.addChildRelativeTo(
        zone.targetId,
        componentName,
        zone.placement,
        {
          properties: data.properties,
          textContent: data.textContent,
        }
      )
    }

    if (result.success) {
      this.onCodeChange(result.newSource)
      return true
    }

    console.warn('[DropHandler] Drop failed:', result.error)
    return false
  }

  /**
   * Convert DropData to component name
   *
   * Maps:
   * - type: 'component' → data.component
   * - type: 'container' → HBox/VBox based on direction
   * - type: 'layout' → Box (default)
   */
  private getComponentName(data: DropData): string {
    if (data.component) {
      return data.component
    }

    if (data.type === 'container') {
      return data.direction === 'horizontal' ? 'HBox' : 'VBox'
    }

    // Default fallback
    return 'Box'
  }
}

/**
 * Create a DropHandler
 *
 * @example
 * ```typescript
 * const dropHandler = createDropHandler(
 *   () => studio.codeModifier,
 *   (newSource) => {
 *     editor.dispatch({
 *       changes: { from: 0, to: editor.state.doc.length, insert: newSource }
 *     })
 *     compile()
 *   }
 * )
 *
 * // In drag handler:
 * onDrop: (zone, data) => dropHandler.handleDrop(zone, data)
 * ```
 */
export function createDropHandler(
  getCodeModifier: () => CodeModifier | null,
  onCodeChange: (newSource: string) => void,
  options?: DropHandlerOptions
): DropHandler {
  return new DropHandler(getCodeModifier, onCodeChange, options)
}
