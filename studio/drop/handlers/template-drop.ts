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
    const template = result.source.mirTemplate!
    return context.codeModifier.addChildWithTemplate(result.targetNodeId, template, {
      position: result.insertionIndex ?? 'last',
    })
  }

  private hasMirTemplate(result: DropResult): boolean {
    return !!result.source.mirTemplate
  }
}
