/**
 * Parser Capability
 *
 * Wraps the Mirror DSL parser with a simplified interface.
 */

import { parse, type ParseOptions } from '../../parser/parser'
import type { ParsedCode } from '../types'

export interface ParserOptions {
  /** Enable strict validation */
  strict?: boolean
  /** Skip certain validation types */
  skipValidation?: ParseOptions['skipValidation']
}

/**
 * Parse Mirror DSL code into AST nodes.
 */
export function parseCode(code: string, options?: ParserOptions): ParsedCode {
  const parseOptions: ParseOptions = {
    validate: true,
    strictValidation: options?.strict ?? false,
    skipValidation: options?.skipValidation,
  }

  const result = parse(code, parseOptions)

  const hasErrors = result.errors.length > 0
  // All parse issues are potential problems - treat them as errors when strict
  const hasParseIssues = options?.strict && result.parseIssues.length > 0

  return {
    nodes: result.nodes,
    registry: result.registry,
    tokens: result.tokens,
    valid: !hasErrors && !hasParseIssues,
    errors: [
      ...result.errors,
      ...result.parseIssues.map((issue) => `Line ${issue.line}: ${issue.message}`),
    ],
    source: code,
    _parseResult: result,
  }
}

/**
 * Quick validation check - returns true if code parses without errors.
 */
export function isValidCode(code: string): boolean {
  const result = parseCode(code)
  return result.valid
}

/**
 * Get parse errors as formatted strings.
 */
export function getParseErrors(code: string): string[] {
  const result = parseCode(code)
  return result.errors
}
