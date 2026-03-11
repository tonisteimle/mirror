/**
 * Property Change Handler
 *
 * Handles property changes and converts them to code modifications.
 */

import type { CodeModifier, ModificationResult } from './types'

export interface ChangeHandlerDependencies {
  getModifier: () => CodeModifier
  onSourceChange: (result: ModificationResult) => void
}

export class ChangeHandler {
  private deps: ChangeHandlerDependencies

  constructor(deps: ChangeHandlerDependencies) {
    this.deps = deps
  }

  handlePropertyChange(nodeId: string, property: string, value: string): ModificationResult {
    const modifier = this.deps.getModifier()
    const result = modifier.updateProperty(nodeId, property, value)

    if (result.success) {
      this.deps.onSourceChange(result)
    }

    return result
  }

  handlePropertyRemove(nodeId: string, property: string): ModificationResult {
    const modifier = this.deps.getModifier()
    const result = modifier.removeProperty(nodeId, property)

    if (result.success) {
      this.deps.onSourceChange(result)
    }

    return result
  }

  /**
   * Apply a direct modification without going through the command system
   * (for external changes that should be recorded)
   */
  applyDirectChange(result: ModificationResult): void {
    if (result.success) {
      this.deps.onSourceChange(result)
    }
  }
}
