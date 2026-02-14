/**
 * Mirror DSL Lexer
 *
 * This file re-exports the modular lexer for backward compatibility.
 * The lexer implementation has been refactored into smaller modules:
 *
 * - lexer/token-types.ts    - Token type definitions and constants
 * - lexer/heuristics.ts     - Error-tolerant parsing heuristics
 * - lexer/string-lexer.ts   - String parsing logic
 * - lexer/number-lexer.ts   - Number parsing logic
 * - lexer/json-lexer.ts     - JSON array/object parsing
 * - lexer/identifier-lexer.ts - Identifier/keyword parsing
 * - lexer/color-lexer.ts    - Color parsing logic
 * - lexer/operator-lexer.ts - Operator parsing logic
 * - lexer/token-lexer.ts    - Token reference parsing
 * - lexer/index.ts          - Main tokenize function
 */

// Re-export everything from the modular lexer
export {
  // Main function
  tokenize,
  // Constants
  RESERVED_WORDS,
  // Heuristic functions (for potential external use)
  levenshteinDistance,
  looksLikeEvent,
  looksLikeAnimation,
  looksLikeProperty
} from './lexer/index'

// Re-export types
export type { Token, TokenType, LexerToken } from './lexer/index'
