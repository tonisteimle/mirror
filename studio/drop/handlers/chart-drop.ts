/**
 * Chart Drop Handler
 *
 * Handles dropping chart components with dataBlock (sample data).
 * Generates template: DataBlock + empty line + Chart component.
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'

export class ChartDropHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isPaletteDrop(result) && this.hasDataBlock(result)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult> {
    const template = this.buildChartTemplate(result)

    // Add the child component with optional parent property for alignment
    return context.codeModifier.addChildWithTemplate(result.targetNodeId, template, {
      position: result.insertionIndex ?? 'last',
      parentProperty: result.alignment?.zone,
    })
  }

  private hasDataBlock(result: DropResult): boolean {
    return !!result.source.dataBlock
  }

  private buildChartTemplate(result: DropResult): string {
    const { dataBlock, componentName, properties } = result.source
    const { name, content } = dataBlock!
    const dataBlockCode = `${name}:\n${content
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n')}`
    // Build chart code with properties (alignment is on parent now)
    const chartCode = properties ? `${componentName!} ${properties}` : componentName!
    return `${dataBlockCode}\n\n${chartCode}`
  }
}
