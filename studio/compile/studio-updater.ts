/**
 * Studio Updater
 *
 * Updates studio state after compilation.
 */

import type { AST, SourceMap, Studio, Component } from './types'
import { resetSelectionForEmptyCode, type SelectionManager } from './empty-state'

export interface UpdaterDeps {
  studio: Studio
  studioSelectionManager?: SelectionManager
  updateStudio: (ast: AST, ir: unknown, sourceMap: SourceMap, code: string) => void
  setIconTriggerPrimitives: (map: Map<string, string>) => void
}

export class StudioUpdater {
  constructor(private deps: UpdaterDeps) {}

  updateState(resolvedCode: string, preludeOffset: number): void {
    if (!this.deps.studio?.state) return

    const preludeLineCount = this.calculatePreludeLines(resolvedCode, preludeOffset)
    this.deps.studio.state.set({
      resolvedSource: resolvedCode,
      preludeOffset: preludeOffset, // Character offset for position adjustments
      preludeLineOffset: preludeLineCount, // Line offset for line-based operations
    })
  }

  private calculatePreludeLines(code: string, charOffset: number): number {
    if (charOffset <= 0) return 0
    return code.substring(0, charOffset).split('\n').length - 1
  }

  updateComponentPrimitives(ast: AST): Map<string, string> {
    const primitives = new Map<string, string>()

    for (const comp of ast.components) {
      primitives.set(comp.name, this.getPrimitive(comp))
    }

    this.deps.setIconTriggerPrimitives(primitives)
    return primitives
  }

  private getPrimitive(comp: Component): string {
    return comp.primitive || comp.name.toLowerCase()
  }

  updateAfterCompile(ast: AST, ir: unknown, sourceMap: SourceMap, code: string): void {
    this.deps.updateStudio(ast, ir, sourceMap, code)
  }

  refreshPreview(): void {
    this.deps.studio.preview?.refresh()
  }

  triggerSync(): void {
    this.deps.studio.sync?.triggerInitialSync()
  }

  handleEmptyCode(): void {
    resetSelectionForEmptyCode(this.deps.studioSelectionManager)
    this.refreshPreview()
  }
}
