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
    return context.codeModifier.addChildWithTemplate(result.targetNodeId, template, {
      position: result.insertionIndex ?? 'last',
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
    // Build chart code with properties and alignment
    let chartCode = properties ? `${componentName!} ${properties}` : componentName!
    if (result.alignment?.zone) {
      chartCode = properties
        ? `${chartCode}, ${result.alignment.zone}`
        : `${chartCode} ${result.alignment.zone}`
    }
    return `${dataBlockCode}\n\n${chartCode}`
  }
}
