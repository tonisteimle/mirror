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
// Note: generateStatic is not exported - it's an incomplete stub
export { combineProjectFiles, combineProjectFilesWithData, combineFiles, DIRECTORY_ORDER } from './preprocessor'
export type { ReadFileFn, ListFilesFn, ProjectFiles } from './preprocessor'

// Data parser for .data files
export { parseDataFile, parseDataFiles, mergeDataFiles, serializeDataForJS } from './parser/data-parser'
export type { DataFile, DataEntry, DataAttribute, DataMarkdownBlock, DataParseError, DataValue } from './parser/data-types'

export type { AST, Node } from './parser/ast'
export type { IR, SourcePosition, PropertySourceMap, IRZagNode, IRSlot, IRItem } from './ir/types'

// Studio module exports for bidirectional editing
export * from './studio'

// Zag integration exports
export * from './schema/zag-primitives'
export * from './compiler/zag'

import { parse } from './parser'
import { generateDOM } from './backends/dom'
import { combineProjectFiles, combineProjectFilesWithData, ReadFileFn, ListFilesFn } from './preprocessor'
import { parseDataFiles, mergeDataFiles } from './parser/data-parser'
import type { DataFile } from './parser/data-types'

export interface CompileOptions {
  /** For simple single-file compilation (no project structure) */
  code?: string
  /** Optional parsed data files to include in output */
  dataFiles?: DataFile[]
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
 * @param options - Optional compile options (dataFiles)
 * @returns Generated JavaScript code
 */
export function compile(code: string, options?: { dataFiles?: DataFile[] }): string {
  const ast = parse(code)
  return generateDOM(ast, { dataFiles: options?.dataFiles })
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

/**
 * Compile a Mirror project with .data file support.
 * Parses .data files and includes them in the output.
 *
 * @param options - Project compilation options
 * @returns Generated JavaScript code with data
 */
export function compileProjectWithData(options: CompileProjectOptions): string {
  const { mirrorCode, dataFiles: rawDataFiles } = combineProjectFilesWithData(
    options.listFiles,
    options.readFile
  )
  const ast = parse(mirrorCode)
  const dataFiles = parseDataFiles(rawDataFiles)
  return generateDOM(ast, { dataFiles })
}
