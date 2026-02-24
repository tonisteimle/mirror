/**
 * @module theme-parser
 * @description Theme Parser - Parst Theme-Definitionen und Theme-Aktivierungen
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Verarbeitet Theme-Blöcke und `use theme` Statements
 *
 * Themes ermöglichen die Definition von Token-Sets, die als Gruppe
 * aktiviert werden können. Dies unterstützt Dark/Light Mode und
 * andere Design-Varianten.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THEME-DEFINITION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax theme dark:
 *   $primary: #3B82F6
 *   $background: #1a1a1a
 *   $text: #ffffff
 *
 * @algorithm
 * 1. Consume `theme` Keyword
 * 2. Consume Theme-Name (COMPONENT_NAME)
 * 3. Consume `:` (COLON)
 * 4. Parse indentierte Token-Definitionen bis Dedent
 * 5. Speichere in ctx.themeDefinitions
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THEME-AKTIVIERUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax use theme dark
 *
 * @algorithm
 * 1. Consume `use` Keyword
 * 2. Consume `theme` Keyword
 * 3. Consume Theme-Name (COMPONENT_NAME)
 * 4. Überprüfe ob Theme existiert
 * 5. Kopiere Theme-Tokens in ctx.designTokens
 * 6. Setze ctx.activeTheme
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ParserContext } from './parser-context'
import type { Token } from './lexer'
import type { TokenValue } from './types'

/**
 * Parse a theme definition block.
 *
 * @syntax
 * theme dark:
 *   $primary: #3B82F6
 *   $background: #1a1a1a
 *
 * @param ctx The parser context
 */
export function parseThemeDefinition(ctx: ParserContext): void {
  // Consume 'theme' keyword
  ctx.advance()

  // Expect theme name (can be COMPONENT_NAME, UNKNOWN_PROPERTY, COMPONENT_DEF, or other identifier types)
  // Note: PascalCase names like "DarkMode:" get tokenized as COMPONENT_DEF
  const themeNameToken = ctx.current()
  if (!themeNameToken || !['COMPONENT_NAME', 'UNKNOWN_PROPERTY', 'KEYWORD', 'COMPONENT_DEF'].includes(themeNameToken.type)) {
    ctx.addError(
      'T001',
      'Expected theme name after "theme"',
      ctx.current() || { type: 'EOF', value: '', line: 0, column: 0 },
      'Usage: theme dark:'
    )
    ctx.recoverToNewline()
    return
  }

  const themeName = ctx.advance().value

  // If the token was COMPONENT_DEF, the colon is already consumed
  // For other token types, expect colon after theme name
  if (themeNameToken.type === 'COMPONENT_DEF') {
    // Colon already consumed by COMPONENT_DEF tokenization
  } else if (ctx.current()?.type !== 'COLON') {
    ctx.addError(
      'T002',
      `Expected ":" after theme name "${themeName}"`,
      ctx.current() || { type: 'EOF', value: '', line: 0, column: 0 },
      'Usage: theme dark:'
    )
    ctx.recoverToNewline()
    return
  } else {
    ctx.advance() // consume ':' (only for non-COMPONENT_DEF tokens)
  }

  // Skip newline after colon
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Create a new token map for this theme
  const themeTokens = new Map<string, TokenValue>()

  // Parse indented token definitions
  // Look for INDENT + TOKEN_VAR_DEF pattern
  // Skip empty lines (comments are removed by lexer, leaving just INDENTs)
  while (ctx.current()?.type === 'INDENT') {
    ctx.advance() // consume INDENT

    // Skip empty lines (from comments being removed)
    // After an INDENT, if next token is NEWLINE or another INDENT, skip this line
    if (ctx.current()?.type === 'NEWLINE') {
      ctx.advance()
      continue
    }
    if (ctx.current()?.type === 'INDENT') {
      // Next line's INDENT - this line was empty (comment removed)
      continue
    }

    // Check for TOKEN_VAR_DEF (e.g., $primary:)
    if (ctx.current()?.type === 'TOKEN_VAR_DEF') {
      const tokenName = ctx.advance().value

      // Collect all tokens until end of line
      const valueTokens: Token[] = []
      while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
        valueTokens.push(ctx.advance())
      }

      // Store the token value
      const tokenValue = parseTokenValue(valueTokens, ctx)
      if (tokenValue !== undefined) {
        themeTokens.set(tokenName, tokenValue)
      }

      // Consume newline
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      // Not a token definition - we've reached the end of the theme block
      break
    }
  }

  // Check for empty theme (warning)
  if (themeTokens.size === 0) {
    ctx.addWarning(
      'T003',
      `Theme "${themeName}" has no tokens defined`,
      { type: 'COMPONENT_NAME', value: themeName, line: 0, column: 0 },
      'Add token definitions like: $primary: #3B82F6'
    )
  }

  // Store the theme
  ctx.themeDefinitions.set(themeName, themeTokens)
}

/**
 * Parse a `use theme X` statement.
 *
 * @syntax use theme dark
 *
 * @param ctx The parser context
 */
export function parseUseTheme(ctx: ParserContext): void {
  // The 'use' keyword has already been recognized as KEYWORD
  const useToken = ctx.advance() // consume 'use'

  // Expect 'theme' keyword
  if (ctx.current()?.type !== 'THEME') {
    ctx.addError(
      'T004',
      'Expected "theme" after "use"',
      ctx.current() || { type: 'EOF', value: '', line: 0, column: 0 },
      'Usage: use theme dark'
    )
    ctx.recoverToNewline()
    return
  }
  ctx.advance() // consume 'theme'

  // Expect theme name (can be COMPONENT_NAME, UNKNOWN_PROPERTY, or other identifier types)
  const themeNameToken = ctx.current()
  if (!themeNameToken || !['COMPONENT_NAME', 'UNKNOWN_PROPERTY', 'KEYWORD'].includes(themeNameToken.type)) {
    ctx.addError(
      'T005',
      'Expected theme name after "use theme"',
      ctx.current() || { type: 'EOF', value: '', line: 0, column: 0 },
      'Usage: use theme dark'
    )
    ctx.recoverToNewline()
    return
  }

  const themeName = ctx.advance().value

  // Check if theme exists (forward reference check)
  if (!ctx.themeDefinitions.has(themeName)) {
    ctx.addError(
      'T006',
      `Theme "${themeName}" is not defined`,
      { type: 'COMPONENT_NAME', value: themeName, line: useToken.line, column: useToken.column },
      'Define the theme before using it: theme ' + themeName + ':'
    )
    ctx.recoverToNewline()
    return
  }

  // Apply theme tokens to designTokens (theme tokens override global tokens)
  const themeTokens = ctx.themeDefinitions.get(themeName)!
  for (const [name, value] of themeTokens) {
    ctx.designTokens.set(name, value)
  }

  // Set active theme
  ctx.activeTheme = themeName

  // Consume trailing newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }
}

/**
 * Parse a single token value from collected tokens.
 * Similar to parseTokenDefinition but returns the value instead of storing directly.
 */
function parseTokenValue(valueTokens: Token[], ctx: ParserContext): TokenValue | undefined {
  if (valueTokens.length === 0) {
    return undefined
  }

  if (valueTokens.length === 1) {
    const token = valueTokens[0]
    if (token.type === 'JSON_VALUE') {
      try {
        return JSON.parse(token.value)
      } catch {
        return token.value
      }
    } else if (token.type === 'COLOR') {
      return token.value
    } else if (token.type === 'NUMBER') {
      return parseInt(token.value, 10)
    } else if (token.type === 'STRING') {
      return token.value
    } else if (token.type === 'TOKEN_REF') {
      // Token reference - check in theme tokens first, then global
      const referencedValue = ctx.designTokens.get(token.value)
      if (referencedValue !== undefined && typeof referencedValue !== 'object') {
        return referencedValue
      }
      // Forward reference - store as sequence
      return { type: 'sequence', tokens: valueTokens }
    } else if (token.type === 'COMPONENT_NAME') {
      if (token.value === 'true' || token.value === 'false') {
        return token.value
      }
      return token.value
    } else {
      return { type: 'sequence', tokens: valueTokens }
    }
  }

  // Multiple tokens - store as sequence
  return { type: 'sequence', tokens: valueTokens }
}
