/**
 * Compiler Module
 *
 * Wraps the Mirror compiler with Studio-specific functionality.
 */

import type {
  CompileOptions,
  CompilationResult,
  PreludeResult,
  CompilerEvents,
  Warning,
  CompilationTiming,
} from './types'
import { buildPrelude, countPreludeLines, adjustLineNumber } from './prelude-builder'
import type { AST, ParseError, IR, SourceMap } from '../../../compiler'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('Compiler')

export type { CompileOptions, CompilationResult, PreludeResult, CompilerEvents, Warning }
export { buildPrelude, countPreludeLines, adjustLineNumber }

type EventCallback<K extends keyof CompilerEvents> = (payload: CompilerEvents[K]) => void

export interface Compiler {
  // Compilation
  compile(source: string, options?: Partial<CompileOptions>): CompilationResult
  compileWithPrelude(source: string, prelude: PreludeResult): CompilationResult

  // Prelude
  buildPrelude(
    files: Record<string, string>,
    currentFile: string,
    getFileType: (filename: string) => 'tokens' | 'component' | 'layout'
  ): PreludeResult

  // State
  getLastResult(): CompilationResult | null
  getErrors(): ParseError[]

  // Events
  on<K extends keyof CompilerEvents>(event: K, callback: EventCallback<K>): () => void

  // Configuration
  setOptions(options: Partial<CompileOptions>): void
  getOptions(): CompileOptions
}

/**
 * Interface for the global Mirror compiler object (loaded via script tag)
 */
interface MirrorGlobal {
  parse(source: string): AST
  toIR(ast: AST, withSourceMap: true): { ir: IR; sourceMap: SourceMap }
  toIR(ast: AST, withSourceMap: false): IR
  toIR(ast: AST, withSourceMap: boolean): IR | { ir: IR; sourceMap: SourceMap }
  generateDOM(ast: AST): string
  generateReact(ast: AST): string
  generateFramework?(ast: AST, target: string): string
}

// Get Mirror from global scope (loaded via script tag)
function getMirror(): MirrorGlobal {
  if (typeof window !== 'undefined' && (window as unknown as { Mirror?: MirrorGlobal }).Mirror) {
    return (window as unknown as { Mirror: MirrorGlobal }).Mirror
  }
  throw new Error('Mirror compiler not loaded')
}

export function createCompiler(initialOptions: Partial<CompileOptions> = {}): Compiler {
  let options: CompileOptions = {
    target: 'dom',
    includeRuntime: true,
    sourceMap: true,
    ...initialOptions,
  }

  let lastResult: CompilationResult | null = null
  const eventHandlers = new Map<keyof CompilerEvents, Set<EventCallback<any>>>()

  function on<K extends keyof CompilerEvents>(event: K, callback: EventCallback<K>): () => void {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set())
    }
    eventHandlers.get(event)!.add(callback)
    return () => {
      eventHandlers.get(event)?.delete(callback)
    }
  }

  function emit<K extends keyof CompilerEvents>(event: K, payload: CompilerEvents[K]): void {
    const handlers = eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          log.error(`Error in ${event} handler:`, error)
        }
      })
    }
  }

  function doCompile(source: string, preludeOffset: number = 0): CompilationResult {
    const Mirror = getMirror()
    const timing: CompilationTiming = { parse: 0, transform: 0, generate: 0, total: 0 }
    const startTotal = performance.now()

    let ast: AST | null = null
    let ir: IR | null = null
    let sourceMap: SourceMap | null = null
    let code: string | null = null
    const errors: ParseError[] = []
    const warnings: Warning[] = []

    try {
      // Parse
      const startParse = performance.now()
      ast = Mirror.parse(source)
      timing.parse = performance.now() - startParse

      // Check for parse errors
      if (ast && ast.errors && ast.errors.length > 0) {
        errors.push(...ast.errors.map((e: ParseError) => ({
          ...e,
          line: preludeOffset > 0 ? adjustLineNumber(e.line, countPreludeLines(source.slice(0, preludeOffset))) : e.line,
        })))
      }

      // Transform to IR
      const startTransform = performance.now()
      if (ast) {
        if (options.sourceMap) {
          const irResult = Mirror.toIR(ast, true)
          ir = irResult.ir
          sourceMap = irResult.sourceMap
        } else {
          ir = Mirror.toIR(ast, false)
        }
      }
      timing.transform = performance.now() - startTransform

      // Generate code
      const startGenerate = performance.now()
      if (ast) {
        switch (options.target) {
          case 'dom':
            code = Mirror.generateDOM(ast)
            break
          case 'react':
            code = Mirror.generateReact(ast)
            break
          case 'svelte':
            if (Mirror.generateFramework) {
              code = Mirror.generateFramework(ast, 'svelte')
            } else {
              warnings.push({ message: 'Svelte target not available' })
              code = Mirror.generateDOM(ast)
            }
            break
        }
      }
      timing.generate = performance.now() - startGenerate

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push({
        message: errorMessage,
        line: 1,
        column: 1,
      } as ParseError)
    }

    timing.total = performance.now() - startTotal

    const result: CompilationResult = {
      success: errors.length === 0,
      ast,
      ir,
      sourceMap,
      code,
      errors,
      warnings,
      timing,
    }

    lastResult = result
    return result
  }

  return {
    compile(source: string, overrideOptions?: Partial<CompileOptions>): CompilationResult {
      const prevOptions = options
      if (overrideOptions) {
        options = { ...options, ...overrideOptions }
      }

      emit('compile:start', { source })

      const result = doCompile(source)

      if (result.success) {
        emit('compile:complete', result)
      } else {
        emit('compile:error', { errors: result.errors })
      }

      if (overrideOptions) {
        options = prevOptions
      }

      return result
    },

    compileWithPrelude(source: string, prelude: PreludeResult): CompilationResult {
      const combinedSource = prelude.prelude
        ? `${prelude.prelude}\n${source}`
        : source

      emit('compile:start', { source: combinedSource })

      const result = doCompile(combinedSource, prelude.offset)

      if (result.success) {
        emit('compile:complete', result)
      } else {
        emit('compile:error', { errors: result.errors })
      }

      return result
    },

    buildPrelude(
      files: Record<string, string>,
      currentFile: string,
      getFileType: (filename: string) => 'tokens' | 'component' | 'layout'
    ): PreludeResult {
      return buildPrelude({ files, currentFile, getFileType })
    },

    getLastResult(): CompilationResult | null {
      return lastResult
    },

    getErrors(): ParseError[] {
      return lastResult?.errors ?? []
    },

    on,

    setOptions(newOptions: Partial<CompileOptions>): void {
      options = { ...options, ...newOptions }
    },

    getOptions(): CompileOptions {
      return { ...options }
    },
  }
}

// Singleton instance
let defaultInstance: Compiler | null = null

export function getCompiler(options?: Partial<CompileOptions>): Compiler {
  if (!defaultInstance) {
    defaultInstance = createCompiler(options)
  }
  return defaultInstance
}

export function resetCompiler(): void {
  defaultInstance = null
}
