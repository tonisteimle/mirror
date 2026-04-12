/**
 * LayoutConverter - Converts aligned elements to layout containers
 *
 * Uses CodeModifier.wrapNodes() to wrap aligned elements in a Box
 * with the appropriate layout properties.
 */

import type { AlignmentGroup, LayoutConverterConfig } from './types'
import { CodeModifier } from '../../../compiler'

export interface ConversionResult {
  success: boolean
  newSource?: string
  error?: string
}

export class LayoutConverter {
  private getSource: () => string
  private getSourceMap: () => any
  private onSourceChange: (newSource: string) => void

  constructor(config: LayoutConverterConfig) {
    this.getSource = config.getSource
    this.getSourceMap = config.getSourceMap
    this.onSourceChange = config.onSourceChange
  }

  /**
   * Convert an alignment group to a layout container
   */
  convert(group: AlignmentGroup): ConversionResult {
    const source = this.getSource()
    const sourceMap = this.getSourceMap()

    if (!source || !sourceMap) {
      return {
        success: false,
        error: 'No source or source map available',
      }
    }

    // Get node IDs from the group
    const nodeIds = group.elements.map(e => e.nodeId)

    if (nodeIds.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 elements to convert',
      }
    }

    // Create CodeModifier and wrap nodes
    const codeModifier = new CodeModifier(source, sourceMap)
    const result = codeModifier.wrapNodes(nodeIds, 'Box', group.suggestedDSL)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to wrap nodes',
      }
    }

    // Notify about source change
    if (result.newSource) {
      this.onSourceChange(result.newSource)
    }

    return {
      success: true,
      newSource: result.newSource,
    }
  }

  /**
   * Preview what the DSL would look like (without modifying source)
   */
  preview(group: AlignmentGroup): string {
    const elements = group.elements.map(e => `    // Element: ${e.nodeId}`)
    return `Box ${group.suggestedDSL}\n${elements.join('\n')}`
  }

  /**
   * Dispose
   */
  dispose(): void {
    // Nothing to clean up
  }
}

/**
 * Create a LayoutConverter instance
 */
export function createLayoutConverter(config: LayoutConverterConfig): LayoutConverter {
  return new LayoutConverter(config)
}
