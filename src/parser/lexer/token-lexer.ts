/**
 * @module token-lexer
 * @description Token-Referenz-Parsing für den Mirror DSL Lexer
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst $variable Referenzen mit Dot-Notation und Bindestrichen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORMATE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax Einfache Variable
 *   $primary, $count, $isActive
 *   Beispiel: background $primary → TOKEN_REF "primary"
 *
 * @syntax Mit Bindestrich (Suffix-Inference)
 *   $blue-color → Inferred als background
 *   $card-padding → Inferred als padding
 *   $heading-size → Inferred als font-size
 *
 * @syntax Dot-Notation (Property Access)
 *   $user.name → Zugriff auf user.name
 *   $data.items.length → Verschachtelter Zugriff
 *   $task.done → Boolean-Property
 *
 * @allowed-chars [a-zA-Z0-9_.\-]
 *   Trailing Punkte/Bindestriche werden entfernt
 *
 * @token TOKEN_REF
 *   value enthält alles NACH dem $ (ohne $)
 *   Beispiel: $user.name → value: "user.name"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERWENDUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @context Token-Definition
 *   $primary: #3B82F6
 *   $spacing: 16
 *
 * @context Token-Referenz
 *   Button background $primary
 *   Card padding $spacing
 *
 * @context Data-Binding
 *   Text $user.name
 *   Icon if $task.done then "check"
 *
 * @context Conditionals
 *   if $isLoggedIn page Dashboard
 *   if $count > 0 show Badge
 */

import type { Token } from './token-types'

export interface TokenRefLexResult {
  token: Token
  newPos: number
  newColumn: number
}

/**
 * Parse a token reference: $primary, $dark, $user.avatar, $default-pad
 * Supports dot notation and hyphens in token names.
 */
export function parseTokenRef(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): TokenRefLexResult {
  let value = ''
  pos++ // skip $

  while (pos < content.length && /[a-zA-Z0-9_.\-]/.test(content[pos])) {
    value += content[pos]
    pos++
  }

  // Remove trailing dot or hyphen if any
  while (value.endsWith('.') || value.endsWith('-')) {
    value = value.slice(0, -1)
    pos--
  }

  return {
    token: { type: 'TOKEN_REF', value, line: lineNum, column },
    newPos: pos,
    newColumn: column + value.length + 1
  }
}
