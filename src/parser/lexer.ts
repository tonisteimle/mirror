/**
 * @module lexer (re-export)
 * @description Re-Export Barrel für modulares Lexer-System
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Backward-Compatible Re-Exports aus lexer/ Untermodulen
 *
 * Die Lexer-Implementierung wurde in spezialisierte Module aufgeteilt.
 * Dieses Barrel re-exportiert alle öffentlichen APIs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SUB-MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @submodule lexer/token-types.ts
 *   Token, TokenType, RESERVED_WORDS
 *
 * @submodule lexer/heuristics.ts
 *   levenshteinDistance, looksLikeEvent, looksLikeAnimation, looksLikeProperty
 *
 * @submodule lexer/string-lexer.ts
 *   parseString, parseMultilineString
 *
 * @submodule lexer/number-lexer.ts
 *   parseNumber (inkl. Prozent und Dezimal)
 *
 * @submodule lexer/json-lexer.ts
 *   parseJsonArray (für Daten-Definitionen)
 *
 * @submodule lexer/identifier-lexer.ts
 *   parseIdentifier (Komponenten, Properties, Keywords)
 *
 * @submodule lexer/color-lexer.ts
 *   parseColor (#RGB, #RRGGBB, #RRGGBBAA)
 *
 * @submodule lexer/operator-lexer.ts
 *   parseArithmeticOperator, parseComparisonOperator
 *
 * @submodule lexer/token-lexer.ts
 *   parseTokenRef ($name, $name.field)
 *
 * @submodule lexer/index.ts
 *   tokenize - Haupt-Funktion
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @export tokenize - Haupt-Tokenisierungsfunktion
 * @export Token, TokenType, LexerToken - Type-Definitionen
 * @export RESERVED_WORDS - Reservierte Wörter
 * @export levenshteinDistance - Edit-Distanz für Korrekturvorschläge
 * @export looksLikeEvent - Erkennt Event-ähnliche Tippfehler
 * @export looksLikeAnimation - Erkennt Animation-ähnliche Tippfehler
 * @export looksLikeProperty - Erkennt Property-ähnliche Tippfehler
 *
 * @used-by parser.ts, block-parser.ts
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
