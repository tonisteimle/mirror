/**
 * Compiler Module Types
 */

import type { AST, ParseError } from '../../../compiler/parser/ast'
import type { IR } from '../../../compiler/ir/types'
import type { SourceMap } from '../../../compiler/ir/source-map'

export type CompileTarget = 'dom' | 'react' | 'svelte'

export interface CompileOptions {
  target: CompileTarget
  includeRuntime?: boolean
  sourceMap?: boolean
}

export interface CompilationResult {
  success: boolean
  ast: AST | null
  ir: IR | null
  sourceMap: SourceMap | null
  code: string | null
  errors: ParseError[]
  warnings: Warning[]
  timing: CompilationTiming
}

export interface Warning {
  message: string
  line?: number
  column?: number
}

export interface CompilationTiming {
  parse: number
  transform: number
  generate: number
  total: number
}

export interface PreludeResult {
  prelude: string
  offset: number
  tokenCount: number
  componentCount: number
}

export interface CompilerEvents {
  'compile:start': { source: string }
  'compile:complete': CompilationResult
  'compile:error': { errors: ParseError[] }
}
