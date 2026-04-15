/**
 * Prelude Builder
 *
 * Handles prelude code resolution for layout files.
 * Prepends tokens/components and wraps code in implicit App root.
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

    if (this.shouldSkipWrapping(code)) {
      return this.prependPrelude(code, prelude)
    }
    return this.wrapWithAppRoot(code, prelude)
  }

  private shouldSkipWrapping(code: string): boolean {
    return this.startsWithApp(code) || this.hasRootComponentDefs(code)
  }

  private startsWithApp(code: string): boolean {
    return code.trimStart().startsWith('App')
  }

  private hasRootComponentDefs(code: string): boolean {
    return code.split('\n').some(line => this.isRootComponentDef(line))
  }

  private isRootComponentDef(line: string): boolean {
    const trimmed = line.trim()
    const isComponentDef = /^[A-Z][a-zA-Z0-9]*:/.test(trimmed)
    const isRootLevel = !line.startsWith(' ') && !line.startsWith('\t')
    return isComponentDef && isRootLevel
  }

  private prependPrelude(code: string, prelude: string): PreludeResult {
    if (!prelude) {
      return { resolvedCode: code, preludeOffset: 0 }
    }
    const separator = this.createSeparator()
    const resolvedCode = prelude + separator + code
    return {
      resolvedCode,
      preludeOffset: prelude.length + separator.length,
    }
  }

  private wrapWithAppRoot(code: string, prelude: string): PreludeResult {
    const indentedCode = this.indentCode(code)
    const rootWrapper = 'App'
    const indent = 2 // Must match indentCode's indent

    if (!prelude) {
      const resolvedCode = rootWrapper + '\n' + indentedCode
      return {
        resolvedCode,
        // +indent: account for the 2-space indentation added to user code
        preludeOffset: rootWrapper.length + 1 + indent,
      }
    }

    const separator = this.createSeparator()
    const resolvedCode = prelude + separator + rootWrapper + '\n' + indentedCode
    return {
      resolvedCode,
      // +indent: account for the 2-space indentation added to user code
      preludeOffset: prelude.length + separator.length + rootWrapper.length + 1 + indent,
    }
  }

  private createSeparator(): string {
    return '\n\n// === ' + this.deps.currentFile + ' ===\n'
  }

  private indentCode(code: string): string {
    return code
      .split('\n')
      .map(line => (line ? '  ' + line : ''))
      .join('\n')
  }
}
