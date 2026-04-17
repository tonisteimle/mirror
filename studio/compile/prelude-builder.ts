/**
 * Prelude Builder
 *
 * Handles prelude code resolution for layout files.
 * Prepends tokens/components to user code.
 */

import type { FileType } from './types'

export interface PreludeResult {
  resolvedCode: string
  preludeOffset: number
}

export interface PreludeDeps {
  getPreludeCode: (file: string) => string
  currentFile: string
}

export class PreludeBuilder {
  constructor(private deps: PreludeDeps) {}

  resolve(code: string, fileType: FileType): PreludeResult {
    if (fileType !== 'layout') {
      return { resolvedCode: code, preludeOffset: 0 }
    }
    return this.resolveLayoutPrelude(code)
  }

  private resolveLayoutPrelude(code: string): PreludeResult {
    const prelude = this.deps.getPreludeCode(this.deps.currentFile)
    if (!prelude) {
      return { resolvedCode: code, preludeOffset: 0 }
    }
    const separator = '\n\n// === ' + this.deps.currentFile + ' ===\n'
    return {
      resolvedCode: prelude + separator + code,
      preludeOffset: prelude.length + separator.length,
    }
  }
}
