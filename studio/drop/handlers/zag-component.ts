/**
 * Zag Component Handler
 *
 * Handles dropping Zag components with 4 cases:
 * 1. Component exists + .com file → Show info message
 * 2. Component doesn't exist + .com file → Create definition only
 * 3. Component exists + .mir file → Create instance only
 * 4. Component doesn't exist + .mir file → Create definition in .com + instance
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'

export class ZagComponentHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isPaletteDrop(result) && this.hasChildren(result)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult | null> {
    // Verify this is actually a Zag component (not just any component with children)
    if (!context.isZagComponent(result.source.children!)) {
      return null // Let PaletteDropHandler handle regular components
    }

    if (context.isComponentsFile(context.currentFile)) {
      return this.handleComponentsFile(result, context)
    }
    return this.handleMirrorFile(result, context)
  }

  private hasChildren(result: DropResult): boolean {
    return !!(result.source.children && result.source.children.length > 0)
  }

  // === .COM FILE HANDLING ===

  private handleComponentsFile(
    result: DropResult,
    context: DropContext
  ): ModificationResult | null {
    const componentName = result.source.componentName!
    const existing = context.findExistingZagDefinition(componentName)

    if (existing.exists) {
      return this.handleExistingInComFile(existing.definitionName!, context)
    }
    return this.handleNewInComFile(result, context)
  }

  private handleExistingInComFile(definitionName: string, context: DropContext): null {
    context.emitNotification('info', `${definitionName} ist bereits definiert`)
    return null
  }

  private handleNewInComFile(result: DropResult, context: DropContext): null {
    const { name, code } = this.generateDefinition(result, context)
    context.addZagDefinitionToCode(code)
    context.emitNotification('success', `${name} wurde erstellt`)
    return null
  }

  // === .MIR FILE HANDLING ===

  private async handleMirrorFile(
    result: DropResult,
    context: DropContext
  ): Promise<ModificationResult> {
    const componentName = result.source.componentName!
    const existing = context.findExistingZagDefinition(componentName)

    const instanceName = existing.exists
      ? existing.definitionName!
      : await this.createDefinitionInComFile(result, context)

    return this.createInstance(result, instanceName, context)
  }

  private async createDefinitionInComFile(
    result: DropResult,
    context: DropContext
  ): Promise<string> {
    const { name, code } = this.generateDefinition(result, context)
    await this.addDefinitionToComponentsFile(code, context)
    return name
  }

  private async addDefinitionToComponentsFile(code: string, context: DropContext): Promise<void> {
    const componentsFile = await context.findOrCreateComponentsFile()
    if (componentsFile) {
      const success = await context.addZagDefinitionToComponentsFile(code, componentsFile)
      if (!success) this.emitError(context)
    } else {
      context.addZagDefinitionToCode(code)
    }
  }

  private emitError(context: DropContext): void {
    context.emitNotification('error', 'Konnte Definition nicht erstellen')
  }

  // === INSTANCE CREATION ===

  private createInstance(
    result: DropResult,
    componentName: string,
    context: DropContext
  ): ModificationResult {
    const properties = this.buildProperties(result, context)
    const instanceCode = context.generateZagInstanceCode(
      componentName,
      properties,
      result.source.children!
    )
    return context.codeModifier.addChildWithTemplate(result.targetNodeId, instanceCode, {
      position: result.insertionIndex ?? 'last',
    })
  }

  // === HELPERS ===

  private generateDefinition(
    result: DropResult,
    context: DropContext
  ): { name: string; code: string } {
    const componentName = result.source.componentName!
    const name = context.generateZagComponentName(componentName)
    const code = context.generateZagDefinitionCode(name, componentName, result.source.children!)
    return { name, code }
  }

  private buildProperties(result: DropResult, context: DropContext): string {
    let properties = result.source.properties || ''
    if (this.needsPositionProperties(result)) {
      properties = this.addPositionProperties(properties, result, context)
    }
    if (this.needsAlignmentProperty(result)) {
      properties = this.addAlignmentProperty(properties, result)
    }
    return properties
  }

  private needsAlignmentProperty(result: DropResult): boolean {
    return !!result.alignment?.zone
  }

  private addAlignmentProperty(properties: string, result: DropResult): string {
    const alignProp = result.alignment!.zone!
    return properties ? `${properties}, ${alignProp}` : alignProp
  }

  private needsPositionProperties(result: DropResult): boolean {
    return result.placement === 'absolute' && !!result.absolutePosition
  }

  private addPositionProperties(
    properties: string,
    result: DropResult,
    context: DropContext
  ): string {
    const pos = result.absolutePosition!
    const adjusted = this.adjustForZoom(pos.x, pos.y, context.zoomScale)
    const posProps = `x ${Math.round(adjusted.x)}, y ${Math.round(adjusted.y)}`
    return properties ? `${properties}, ${posProps}` : posProps
  }

  private adjustForZoom(x: number, y: number, zoomScale: number): { x: number; y: number } {
    if (!zoomScale || zoomScale === 1) return { x, y }
    return { x: x / zoomScale, y: y / zoomScale }
  }
}
