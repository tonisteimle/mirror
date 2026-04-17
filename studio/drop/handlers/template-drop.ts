/**
 * Template Drop Handler
 *
 * Handles dropping preset components with mirTemplate (multi-line templates).
 * Uses addChildWithTemplate() for direct template insertion.
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'

export class TemplateDropHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isPaletteDrop(result) && this.hasMirTemplate(result)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult> {
    let template = result.source.mirTemplate!
    // Add alignment property to template if present
    if (result.alignment?.zone) {
      template = this.addAlignmentToTemplate(template, result.alignment.zone)
    }
    return context.codeModifier.addChildWithTemplate(result.targetNodeId, template, {
      position: result.insertionIndex ?? 'last',
    })
  }

  private hasMirTemplate(result: DropResult): boolean {
    return !!result.source.mirTemplate
  }

  /**
   * Add alignment property to the first line of a template
   * e.g., "Frame gap 12" + "center" → "Frame gap 12, center"
   */
  private addAlignmentToTemplate(template: string, alignProp: string): string {
    const lines = template.split('\n')
    if (lines.length === 0) return template
    // Add alignment to the first line
    const firstLine = lines[0]
    // Check if first line already has properties (contains a comma or space after component name)
    const hasProps = firstLine.includes(',') || /^\w+\s+\S/.test(firstLine)
    lines[0] = hasProps ? `${firstLine}, ${alignProp}` : `${firstLine} ${alignProp}`
    return lines.join('\n')
  }
}
