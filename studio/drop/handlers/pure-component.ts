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
  type PureComponentDefinition,
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

    // If definition doesn't exist, we need to add both in ONE atomic operation
    // to avoid node ID shift issues when the definition is added first
    if (!existing.exists) {
      // First, add the instance using the code modifier - this returns a ModificationResult
      // with the change that needs to be applied
      const instanceCode = this.buildInstanceCode(result, componentName, pureDefinition)
      const instanceResult = context.codeModifier.addChildWithTemplate(
        result.targetNodeId,
        instanceCode,
        {
          position: result.insertionIndex ?? 'last',
          parentProperty: result.alignment?.zone,
        }
      )

      if (!instanceResult.success || !instanceResult.newSource || !instanceResult.change) {
        return instanceResult
      }

      // Now we have the source with the instance added. We need to prepend the definition.
      const definitionCode = pureDefinition.structure + '\n\n'
      const combinedSource = definitionCode + instanceResult.newSource

      // Calculate the original source length before any changes
      // The instanceResult.change is an insertion (from == to), so original length is:
      // newSource.length - inserted.length
      const originalSourceLength =
        instanceResult.newSource.length - instanceResult.change.insert.length

      // Notify user that definition was added
      context.emitNotification('info', `${componentName} Definition hinzugefügt`)

      // Return a result that replaces the entire original source with the combined code
      return {
        success: true,
        newSource: combinedSource,
        change: {
          from: 0,
          to: originalSourceLength,
          insert: combinedSource,
        },
      }
    }

    // Definition exists, create instance normally
    return this.createInstance(result, componentName, context)
  }

  /**
   * Build the instance code string with positioning
   */
  private buildInstanceCode(
    result: DropResult,
    componentName: string,
    pureDefinition: PureComponentDefinition
  ): string {
    // Get text content from source, or use defaultLabel, or fallback to componentName
    const defaultLabel = pureDefinition.defaultLabel || componentName
    const textContent = result.source.textContent || `"${defaultLabel}"`
    let properties = result.source.properties || ''

    // Add position properties for absolute placement
    if (result.placement === 'absolute' && result.absolutePosition) {
      const posProps = `x ${Math.round(result.absolutePosition.x)}, y ${Math.round(result.absolutePosition.y)}`
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

    return instanceCode
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
      const posProps = `x ${Math.round(pos.x)}, y ${Math.round(pos.y)}`
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
}
