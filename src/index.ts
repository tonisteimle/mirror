/**
 * Mirror Language Compiler
 *
 * Parses .mirror files and generates output for various backends.
 */

export { parse } from './parser'
export { toIR, SourceMap, SourceMapBuilder } from './ir'
export type { IRResult } from './ir'
export { generateDOM } from './backends/dom'
export { generateFramework } from './backends/framework'
export { generateReact } from './backends/react'
export { generateStatic } from './backends/static'
export { combineProjectFiles, combineFiles, DIRECTORY_ORDER } from './preprocessor'
export type { ReadFileFn, ListFilesFn } from './preprocessor'

export type { AST, Node } from './parser/ast'
export type { IR, SourcePosition, PropertySourceMap, IRZagNode, IRSlot, IRItem } from './ir/types'

// Studio module exports for bidirectional editing
export * from './studio'

// Zag integration exports
export * from './schema/zag-primitives'
export * from './compiler/zag'

import { parse } from './parser'
import { generateDOM } from './backends/dom'
import { combineProjectFiles, ReadFileFn, ListFilesFn } from './preprocessor'

export interface CompileOptions {
  /** For simple single-file compilation (no project structure) */
  code?: string
}

export interface CompileProjectOptions {
  /** Function to list .mirror files in a directory */
  listFiles: ListFilesFn
  /** Function to read file contents by path */
  readFile: ReadFileFn
}

/**
 * Compile Mirror code to DOM JavaScript.
 *
 * @param code - The Mirror source code
 * @returns Generated JavaScript code
 */
export function compile(code: string): string {
  const ast = parse(code)
  return generateDOM(ast)
}

/**
 * Compile a Mirror project with fixed directory structure.
 * Files are processed in order: data/ → tokens/ → components/ → layouts/
 *
 * @param options - Project compilation options
 * @returns Generated JavaScript code
 */
export function compileProject(options: CompileProjectOptions): string {
  const combinedCode = combineProjectFiles(options.listFiles, options.readFile)
  const ast = parse(combinedCode)
  return generateDOM(ast)
}
