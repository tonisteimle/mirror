/**
 * Pure Component Handler
 *
 * Handles dropping Pure Mirror components (Checkbox, Switch, etc.)
 * that are defined in PURE_COMPONENT_DEFINITIONS.
 *
 * These components have their structure defined in pure Mirror syntax,
 * making them visible, editable, and translatable to other frameworks.
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'
import {
  hasPureComponentDefinition,
  getPureComponentDefinition,
} from '../../panels/components/component-templates'

export class PureComponentHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    // Handle palette drops for components that have pure definitions
    // BUT only if no template is provided (template means user wants Zag/custom behavior)
    if (!this.isPaletteDrop(result)) return false

    // If children or mirTemplate are provided, let other handlers handle it
    if (result.source.children && result.source.children.length > 0) return false
    if (result.source.mirTemplate) return false

    const componentName = result.source.componentName
    return !!componentName && hasPureComponentDefinition(componentName)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult | null> {
    const componentName = result.source.componentName!
    const pureDefinition = getPureComponentDefinition(componentName)

    if (!pureDefinition) {
      return null // Should not happen, but fallback to next handler
    }

    // Check if definition already exists using the same mechanism as Zag components
    const existing = context.findExistingZagDefinition(componentName)

    // If definition doesn't exist, add it first and wait for code to stabilize
    if (!existing.exists) {
      // Add definition to code
      const definitionWithSpacing = pureDefinition.structure + '\n\n'
      context.addZagDefinitionToCode(definitionWithSpacing)

      // Wait for editor to update and recompile (debounce is 300ms, so wait 500ms)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Notify user that definition was added
      context.emitNotification('info', `${componentName} Definition hinzugefügt`)

      // Now the codeModifier should be updated - add the instance
      // Note: context.codeModifier is a reference to the global studioCodeModifier,
      // which gets updated after each compile
      return this.createInstance(result, componentName, context)
    }

    // Definition exists, create instance normally
    return this.createInstance(result, componentName, context)
  }

  /**
   * Create an instance of the pure component
   */
  private createInstance(
    result: DropResult,
    componentName: string,
    context: DropContext
  ): ModificationResult {
    // Get pure definition to access defaultLabel
    const pureDefinition = getPureComponentDefinition(componentName)

    // Get text content from source, or use defaultLabel, or fallback to componentName
    const defaultLabel = pureDefinition?.defaultLabel || componentName
    const textContent = result.source.textContent || `"${defaultLabel}"`
    let properties = result.source.properties || ''

    // Add position properties for absolute placement
    if (result.placement === 'absolute' && result.absolutePosition) {
      const pos = result.absolutePosition
      const adjusted = this.adjustForZoom(pos.x, pos.y, context.zoomScale)
      const posProps = `x ${Math.round(adjusted.x)}, y ${Math.round(adjusted.y)}`
      properties = properties ? `${properties}, ${posProps}` : posProps
    }

    // Build instance code with text content
    let instanceCode = componentName
    if (textContent) {
      instanceCode += ` ${textContent}`
    }
    if (properties) {
      instanceCode += `, ${properties}`
    }

    // Add the instance
    return context.codeModifier.addChildWithTemplate(result.targetNodeId, instanceCode, {
      position: result.insertionIndex ?? 'last',
      parentProperty: result.alignment?.zone,
    })
  }

  private adjustForZoom(x: number, y: number, zoomScale: number): { x: number; y: number } {
    if (!zoomScale || zoomScale === 1) return { x, y }
    return { x: x / zoomScale, y: y / zoomScale }
  }
}
