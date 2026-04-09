/**
 * Mirror Language Compiler
 *
 * Parses .mirror files and generates output for various backends.
 */

export { parse } from './parser'
export { toIR } from './ir'
export { generateDOM } from './backends/dom'
export { generateReact } from './backends/react'
// Note: generateStatic removed - incomplete implementation

export type { AST, Node } from './parser/ast'
export type { IR } from './ir/types'
