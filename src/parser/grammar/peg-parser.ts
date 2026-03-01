/**
 * PEG Parser Wrapper for Mirror DSL
 *
 * Provides TypeScript interface to the generated PEG parser.
 * Used for grammar verification and equivalence testing.
 */

import * as peggy from 'peggy'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// =============================================================================
// Types
// =============================================================================

export interface PegNode {
  type: string
  [key: string]: unknown
}

export interface PegProgram {
  type: 'Program'
  statements: PegNode[]
}

export interface PegParseResult {
  ast: PegProgram | null
  error: string | null
}

export interface PegParseOptions {
  startRule?: string
  tracer?: {
    trace: (event: unknown) => void
  }
}

// =============================================================================
// Parser Management
// =============================================================================

let parser: peggy.Parser | null = null
let parserError: string | null = null

/**
 * Get or create the PEG parser instance
 */
function getParser(): peggy.Parser | null {
  if (parser) return parser
  if (parserError) return null

  try {
    // Get the grammar file path
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const grammarPath = join(__dirname, 'mirror.pegjs')

    // Read and compile the grammar
    const grammar = readFileSync(grammarPath, 'utf-8')
    parser = peggy.generate(grammar, {
      output: 'parser',
      format: 'es',
      allowedStartRules: ['Program', 'Statement', 'ComponentInstance', 'Property']
    })

    return parser
  } catch (error) {
    parserError = error instanceof Error ? error.message : String(error)
    console.error('Failed to compile PEG grammar:', parserError)
    return null
  }
}

/**
 * Reset the parser (useful for testing)
 */
export function resetParser(): void {
  parser = null
  parserError = null
}

// =============================================================================
// Parse Functions
// =============================================================================

/**
 * Parse Mirror code using the PEG parser
 */
export function pegParse(input: string, options?: PegParseOptions): PegParseResult {
  const p = getParser()

  if (!p) {
    return {
      ast: null,
      error: parserError || 'Parser not available'
    }
  }

  try {
    const ast = p.parse(input, options) as PegProgram
    return { ast, error: null }
  } catch (error) {
    if (error instanceof p.SyntaxError) {
      const syntaxError = error as peggy.parser.SyntaxError
      return {
        ast: null,
        error: `Syntax error at line ${syntaxError.location.start.line}, column ${syntaxError.location.start.column}: ${syntaxError.message}`
      }
    }
    return {
      ast: null,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Check if input is syntactically valid
 */
export function isValidSyntax(input: string): boolean {
  const result = pegParse(input)
  return result.error === null
}

/**
 * Get syntax error details
 */
export function getSyntaxError(input: string): string | null {
  const result = pegParse(input)
  return result.error
}

// =============================================================================
// AST Comparison Helpers
// =============================================================================

/**
 * Extract component names from PEG AST
 */
export function extractComponentNames(ast: PegProgram): string[] {
  const names: string[] = []

  for (const stmt of ast.statements) {
    if (stmt.type === 'ComponentDefinition' || stmt.type === 'ComponentInstance') {
      if (typeof stmt.name === 'string') {
        names.push(stmt.name)
      }
    }
  }

  return names
}

/**
 * Count nodes in PEG AST
 */
export function countNodes(ast: PegProgram): number {
  let count = 0

  function traverse(node: unknown): void {
    if (node === null || node === undefined) return

    if (Array.isArray(node)) {
      node.forEach(traverse)
      return
    }

    if (typeof node === 'object') {
      count++
      for (const value of Object.values(node)) {
        traverse(value)
      }
    }
  }

  traverse(ast)
  return count
}

/**
 * Get maximum depth of PEG AST
 */
export function maxDepth(ast: PegProgram): number {
  let maxD = 0

  function traverse(node: unknown, depth: number): void {
    if (node === null || node === undefined) return

    maxD = Math.max(maxD, depth)

    if (Array.isArray(node)) {
      node.forEach(n => traverse(n, depth))
      return
    }

    if (typeof node === 'object') {
      for (const value of Object.values(node)) {
        traverse(value, depth + 1)
      }
    }
  }

  traverse(ast, 0)
  return maxD
}

// =============================================================================
// Grammar Verification
// =============================================================================

/**
 * Check if the PEG grammar is loaded and working
 */
export function isGrammarLoaded(): boolean {
  return getParser() !== null
}

/**
 * Get grammar loading error if any
 */
export function getGrammarError(): string | null {
  getParser() // Ensure we've tried to load
  return parserError
}

/**
 * Verify grammar can parse basic constructs
 */
export function verifyGrammar(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const testCases = [
    { name: 'Simple component', code: 'Box pad 8' },
    { name: 'Component with children', code: 'Box\n  Text "Hello"' },
    { name: 'Component definition', code: 'Button: pad 12, bg #3B82F6' },
    { name: 'Token definition', code: '$primary: #3B82F6' },
    { name: 'Inheritance', code: 'PrimaryButton: Button bg #3B82F6' },
    { name: 'If block', code: 'if $isLoggedIn\n  Avatar' },
    { name: 'Each loop', code: 'each $item in $items\n  Card' }
  ]

  for (const { name, code } of testCases) {
    const result = pegParse(code)
    if (result.error) {
      errors.push(`${name}: ${result.error}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
