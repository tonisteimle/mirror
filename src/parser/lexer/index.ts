/**
 * @module lexer
 * @description Mirror DSL Lexer - Tokenisiert Quellcode
 *
 * Wandelt DSL-Quellcode in eine Sequenz von Tokens um.
 * Erster Schritt der Parsing-Pipeline.
 *
 * @token-types
 * | Token-Typ         | Pattern                | Beispiel                |
 * |-------------------|------------------------|-------------------------|
 * | COMPONENT_NAME    | [A-Z][a-zA-Z0-9_-]*    | Button, MyCard          |
 * | COMPONENT_DEF     | Name:                  | Button: → Definition    |
 * | MULTIPLE_DEF      | Name*:                 | Item*: → Wiederholbar   |
 * | LIST_ITEM         | - am Zeilenanfang      | - Item "Text"           |
 * | SELECTOR          | :id am Zeilenanfang    | :myBtn show             |
 * | PROPERTY          | Bekannte Property-Namen| padding, bg, rad        |
 * | DIRECTION         | l, r, u, d, t-b, l-r   | padding l 16            |
 * | NUMBER            | [0-9]+(\.[0-9]+)?%?    | 16, 0.5, 50%            |
 * | COLOR             | #hex oder rgba()       | #FF5500, rgba(255,0,0)  |
 * | STRING            | "..."                  | "Click me"              |
 * | MULTILINE_STRING  | '...'                  | 'Multiline\nText'       |
 * | JSON_VALUE        | [...] am Zeilenanfang  | $data: [{...}]          |
 * | TOKEN_VAR_DEF     | $name:                 | $primary: → Definition  |
 * | TOKEN_REF         | $name                  | $primary → Referenz     |
 * | EVENT             | onclick, onhover, ...  | onclick toggle          |
 * | ANIMATION_ACTION  | show, hide, animate    | onclick show Modal      |
 * | CONTROL           | if, else, each, where  | if $isActive            |
 * | KEYWORD           | from, state, events    | Button from Base        |
 * | PAREN_OPEN        | (                      | (hor cen):myStyle       |
 * | PAREN_CLOSE       | )                      | (hor cen):myStyle       |
 * | BRACE_OPEN        | {                      | Button { }              |
 * | BRACE_CLOSE       | }                      | Button { }              |
 * | COLON             | :                      | padding: 12             |
 * | COMMA             | ,                      | padding: 12,            |
 * | SEMICOLON         | ;                      | icon visible; label     |
 * | OPERATOR          | ==, !=, >, <, +, -     | if $x == 1              |
 * | NEWLINE           | \n                     | Zeilenende              |
 * | INDENT            | Leerzeichen am Anfang  | 2 Spaces = 1 Level      |
 * | EOF               | Ende des Inputs        |                         |
 *
 * @sub-lexers
 * - string-lexer.ts: Strings und Multiline-Strings
 * - number-lexer.ts: Zahlen und Prozent
 * - color-lexer.ts: Hex-Farben (#RGB, #RRGGBB) und rgba()/rgb()
 * - identifier-lexer.ts: Komponenten, Properties, Keywords
 * - operator-lexer.ts: Operatoren (==, !=, +, -, etc.)
 * - token-lexer.ts: Token-Referenzen ($name, $obj.prop)
 * - json-lexer.ts: JSON-Arrays für Daten-Tokens
 *
 * @heuristics
 * - looksLikeEvent: Erkennt Tippfehler bei Events (onlick → onclick)
 * - looksLikeProperty: Erkennt Tippfehler bei Properties
 * - levenshteinDistance: Edit-Distanz für Korrekturvorschläge
 *
 * @example
 * tokenize('Button pad 12, "Click"')
 * // → [
 * //   { type: 'COMPONENT_NAME', value: 'Button', line: 0, column: 0 },
 * //   { type: 'PROPERTY', value: 'pad', line: 0, column: 7 },
 * //   { type: 'NUMBER', value: '12', line: 0, column: 11 },
 * //   { type: 'COMMA', value: ',', line: 0, column: 13 },
 * //   { type: 'STRING', value: 'Click', line: 0, column: 15 },
 * //   { type: 'NEWLINE', value: '\n', line: 0, column: 23 },
 * //   { type: 'EOF', value: '', line: 1, column: 0 }
 * // ]
 */

import {
  PROPERTIES,
  DIRECTIONS
} from '../../dsl/properties'

// Re-export types
export type { Token, TokenType } from './token-types'
export { RESERVED_WORDS } from './token-types'
export type { Token as LexerToken } from './token-types'

// Re-export heuristics for potential external use
export { levenshteinDistance, looksLikeEvent, looksLikeAnimation, looksLikeProperty } from './heuristics'

// Import sub-lexers
import type { Token } from './token-types'
import { parseString, parseMultilineString } from './string-lexer'
import { parseNumber } from './number-lexer'
import { parseJsonArray } from './json-lexer'
import { parseIdentifier } from './identifier-lexer'
import { parseColor, isRgbaColor, parseRgbaColor } from './color-lexer'
import { parseArithmeticOperator, parseComparisonOperator, parseArithmeticMinus } from './operator-lexer'
import { parseTokenRef } from './token-lexer'

/**
 * @doc tokenize
 * @brief Haupt-Funktion - Tokenisiert DSL-Quellcode
 *
 * @input input: string - DSL-Quellcode
 * @output Token[] - Array von Tokens mit type, value, line, column
 *
 * @algorithm
 * 1. Splittet Input in Zeilen
 * 2. Für jede Zeile:
 *    a. Extrahiert Indentation → INDENT Token
 *    b. Prüft Spezialfälle am Zeilenanfang:
 *       - // Kommentar → überspringen
 *       - - Item → LIST_ITEM Token
 *       - :id → SELECTOR Token
 *       - $name: → TOKEN_VAR_DEF Token
 *       - Name: → COMPONENT_DEF Token (außer bei Brace-Syntax)
 *    c. Tokenisiert Rest der Zeile zeichenweise
 *    d. Fügt NEWLINE Token hinzu
 * 3. Fügt EOF Token hinzu
 *
 * @brace-syntax (legacy)
 * - Trackt braceDepth für korrekte Colon-Interpretation
 * - Innerhalb { }: COLON ist Property-Separator
 * - Außerhalb: Name: ist Definition
 *
 * @example
 * tokenize('$primary: #3B82F6\nButton bg $primary')
 * // → [
 * //   { type: 'TOKEN_VAR_DEF', value: 'primary' },
 * //   { type: 'COLOR', value: '#3B82F6' },
 * //   { type: 'NEWLINE' },
 * //   { type: 'COMPONENT_NAME', value: 'Button' },
 * //   { type: 'PROPERTY', value: 'bg' },
 * //   { type: 'TOKEN_REF', value: 'primary' },
 * //   { type: 'NEWLINE' },
 * //   { type: 'EOF' }
 * // ]
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const lines = input.split('\n')

  // Track brace depth for brace-syntax detection (legacy)
  let braceDepth = 0

  // Track prompt blocks: started by a `/` line, includes indented continuations
  let inPromptBlock = false
  let promptBlockIndent = 0

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    // Handle indentation
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0

    let column = indent
    const content = line.slice(indent)

    // Skip whitespace-only lines completely (don't emit INDENT for them)
    // This ensures blank lines (even with spaces) don't confuse indentation parsing
    if (content.trim() === '') {
      // Still emit NEWLINE so parser knows this is a line break
      tokens.push({
        type: 'NEWLINE',
        value: '\n',
        line: lineNum,
        column: 0
      })
      continue
    }

    // Skip comment lines (// comment) and prompt lines (/ prompt)
    // Also skip continuation lines of prompts (indented lines after a / line)
    if (content.trimStart().startsWith('/')) {
      // Start a prompt block - track the indent level
      inPromptBlock = true
      promptBlockIndent = indent
      continue
    }

    // Check if this is a continuation of a prompt block (more indented than the / line)
    if (inPromptBlock) {
      if (indent > promptBlockIndent) {
        // This is a continuation line of the prompt - skip it
        continue
      } else {
        // Less or equal indent - prompt block ends
        inPromptBlock = false
      }
    }

    // Only emit INDENT for lines that have actual content
    if (indent > 0) {
      tokens.push({
        type: 'INDENT',
        value: String(indent),
        line: lineNum,
        column: 0
      })
    }

    // Check for list item at start of line: - Item "value"
    const listItemMatch = content.match(/^-\s+/)
    if (listItemMatch) {
      tokens.push({ type: 'LIST_ITEM', value: '-', line: lineNum, column })
      column += listItemMatch[0].length
    }

    // Check for selector at start of line: :id
    const selectorMatch = content.match(/^:([a-zA-Z_][a-zA-Z0-9_]*)\s*/)
    if (selectorMatch) {
      tokens.push({ type: 'SELECTOR', value: selectorMatch[1], line: lineNum, column })
      column += selectorMatch[0].length
    }

    // Check for token variable definition at start of line: $primary: #3B82F6
    const tokenVarDefMatch = content.match(/^\$([a-zA-Z_][a-zA-Z0-9_-]*):\s*/)
    if (tokenVarDefMatch) {
      tokens.push({ type: 'TOKEN_VAR_DEF', value: tokenVarDefMatch[1], line: lineNum, column })
      column += tokenVarDefMatch[0].length

      // Check if the value starts with [ (JSON array) - collect until matching ]
      const restOfLine = content.slice(tokenVarDefMatch[0].length).trim()
      if (restOfLine.startsWith('[')) {
        const jsonResult = parseJsonArray(restOfLine, lineNum, column, lines)
        tokens.push(jsonResult.token)
        tokens.push({ type: 'NEWLINE', value: '\n', line: jsonResult.newLineNum, column: 0 })

        // Skip to the line after the JSON value
        lineNum = jsonResult.newLineNum
        continue
      }
    }

    // Check for component definition with inheritance: DangerButton from Button: col #EF4444
    // Also supports hyphenated names like Primary-Button from Button:
    const inheritDefMatch = !selectorMatch && !tokenVarDefMatch && !listItemMatch &&
      content.match(/^([A-Z][a-zA-Z0-9_-]*)\s+from\s+([A-Z][a-zA-Z0-9_-]*):\s*/)
    if (inheritDefMatch) {
      // Emit: COMPONENT_NAME, KEYWORD 'from', COMPONENT_NAME, COLON
      // The COLON marks the start of the definition body (properties)
      tokens.push({
        type: 'COMPONENT_NAME',
        value: inheritDefMatch[1],
        line: lineNum,
        column
      })
      const fromPos = column + inheritDefMatch[1].length + 1 // +1 for space
      tokens.push({
        type: 'KEYWORD',
        value: 'from',
        line: lineNum,
        column: fromPos
      })
      const basePos = fromPos + 5 // 'from '
      tokens.push({
        type: 'COMPONENT_NAME',
        value: inheritDefMatch[2],
        line: lineNum,
        column: basePos
      })
      // Emit COLON token - marks start of definition body
      const colonPos = basePos + inheritDefMatch[2].length
      tokens.push({
        type: 'COLON',
        value: ':',
        line: lineNum,
        column: colonPos
      })
      column += inheritDefMatch[0].length
    }

    // Check for component/style definition at start of line: Button: ... or Item*: (repeatable)
    // Skip this check when:
    // - Inside braces (brace-syntax) - colons there are property separators
    // - Followed by { (brace definition: Button: { } should be COMPONENT_NAME + COLON + BRACE_OPEN)
    const componentDefMatch = !inheritDefMatch && !selectorMatch && !tokenVarDefMatch && !listItemMatch && braceDepth === 0 && content.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)(\*)?:\s*/)

    // Check if this is a brace-based definition (Name: {) or inheritance (Name: Parent {)
    // In these cases, don't emit COMPONENT_DEF - let the tokens be separate
    const restAfterDef = componentDefMatch ? content.slice(componentDefMatch[0].length).trim() : ''
    const isV2Syntax = componentDefMatch && (
      restAfterDef.startsWith('{') ||
      /^[A-Z][a-zA-Z0-9_-]*\s*\{/.test(restAfterDef)
    )

    if (componentDefMatch && !isV2Syntax && !PROPERTIES.has(componentDefMatch[1]) && !DIRECTIONS.has(componentDefMatch[1])) {
      const isMultiple = componentDefMatch[2] === '*'
      tokens.push({
        type: isMultiple ? 'MULTIPLE_DEF' : 'COMPONENT_DEF',
        value: componentDefMatch[1],
        line: lineNum,
        column
      })
      column += componentDefMatch[0].length
    }

    // Tokenize the rest of the line
    // Note: When brace-syntax, we don't consume componentDefMatch - let identifier-lexer handle it
    const useComponentDefMatch = componentDefMatch && !isV2Syntax
    let pos = listItemMatch ? listItemMatch[0].length :
              (selectorMatch ? selectorMatch[0].length :
              (tokenVarDefMatch ? tokenVarDefMatch[0].length :
              (inheritDefMatch ? inheritDefMatch[0].length :
              (useComponentDefMatch ? componentDefMatch[0].length : 0))))

    while (pos < content.length) {
      const char = content[pos]

      // Skip whitespace
      if (char === ' ' || char === '\t') {
        pos++
        column++
        continue
      }

      // Inline comment: // rest of line is ignored
      if (char === '/' && content[pos + 1] === '/') {
        break // Skip rest of line
      }

      // Parentheses for style groups
      if (char === '(') {
        tokens.push({ type: 'PAREN_OPEN', value: '(', line: lineNum, column })
        pos++
        column++
        continue
      }

      if (char === ')') {
        tokens.push({ type: 'PAREN_CLOSE', value: ')', line: lineNum, column })
        pos++
        column++

        // Check for inline style definition :name after )
        if (content[pos] === ':' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
          pos++ // skip :
          let styleName = ''
          while (pos < content.length && /[a-zA-Z0-9_]/.test(content[pos])) {
            styleName += content[pos]
            pos++
          }
          tokens.push({ type: 'TOKEN_DEF', value: styleName, line: lineNum, column })
          column += styleName.length + 1
        }
        continue
      }

      // Comma separator (optional between properties)
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',', line: lineNum, column })
        pos++
        column++
        continue
      }

      // Semicolon separator (for inline child overrides in definitions)
      if (char === ';') {
        tokens.push({ type: 'SEMICOLON', value: ';', line: lineNum, column })
        pos++
        column++
        continue
      }

      // Brace tokens for brace-syntax (legacy)
      if (char === '{') {
        tokens.push({ type: 'BRACE_OPEN', value: '{', line: lineNum, column })
        braceDepth++
        pos++
        column++
        continue
      }

      if (char === '}') {
        tokens.push({ type: 'BRACE_CLOSE', value: '}', line: lineNum, column })
        braceDepth = Math.max(0, braceDepth - 1)
        pos++
        column++
        continue
      }

      // Colon token:
      // - Inside braces: property separator (padding: 12)
      // - Outside braces before {: brace definition (Button: { })
      // - Outside braces before Parent {: brace inheritance (Child: Parent { })
      // - After numbers for timing modifiers (debounce 300: filter)
      if (char === ':') {
        const restAfterColon = content.slice(pos + 1).trim()
        // Check if followed by { or Parent { (brace-syntax) or inside braces (property)
        const isV2Colon = braceDepth > 0 ||
          restAfterColon.startsWith('{') ||
          /^[A-Z][a-zA-Z0-9_-]*\s*\{/.test(restAfterColon)
        if (isV2Colon) {
          tokens.push({ type: 'COLON', value: ':', line: lineNum, column })
          pos++
          column++
          continue
        }
        // Check if last token was a NUMBER (timing modifier: debounce 300: action)
        const lastToken = tokens[tokens.length - 1]
        if (lastToken?.type === 'NUMBER') {
          tokens.push({ type: 'COLON', value: ':', line: lineNum, column })
          pos++
          column++
          continue
        }
        // Check if last token was THEME-related (theme name colon)
        // Or if colon is at end of line/before whitespace only (theme definition style)
        const restAfterColonTrimmed = restAfterColon.replace(/^\s*/, '')
        if (restAfterColonTrimmed === '' || lastToken?.type === 'THEME' || lastToken?.type === 'COMPONENT_NAME' || lastToken?.type === 'UNKNOWN_PROPERTY') {
          // This handles cases like "theme dark:" where colon marks end of theme header
          tokens.push({ type: 'COLON', value: ':', line: lineNum, column })
          pos++
          column++
          continue
        }
      }

      // Token reference: $primary, $dark, $user.avatar, $default-pad (with dot notation and hyphens)
      if (char === '$' && /[a-zA-Z]/.test(content[pos + 1] || '')) {
        const result = parseTokenRef(content, pos, column, lineNum)
        tokens.push(result.token)
        pos = result.newPos
        column = result.newColumn
        continue
      }

      // Arithmetic operators: +, *, /
      if (['+', '*', '/'].includes(char)) {
        const result = parseArithmeticOperator(char, pos, column, lineNum)
        tokens.push(result.token)
        pos = result.newPos
        column = result.newColumn
        continue
      }

      // Operators: ==, !=, >=, <=, >, <, =
      if (char === '=' || char === '!' || char === '>' || char === '<') {
        const result = parseComparisonOperator(content, pos, column, lineNum)
        if (result) {
          tokens.push(result.token)
          pos = result.newPos
          column = result.newColumn
          continue
        }
      }

      // Arithmetic minus: - followed by space or number (for expressions like $count - 1)
      if (char === '-') {
        const result = parseArithmeticMinus(content, pos, column, lineNum)
        if (result) {
          tokens.push(result.token)
          pos = result.newPos
          column = result.newColumn
          continue
        }
      }

      // String: "..."
      if (char === '"') {
        const result = parseString(content, pos, column, lineNum)
        tokens.push(...result.tokens)
        pos = result.newPos
        column = result.newColumn
        continue
      }

      // Multiline String: '...' (for doc-mode text blocks)
      if (char === "'") {
        const result = parseMultilineString(content, pos, column, lineNum, lines)
        tokens.push(...result.tokens)
        if (result.newLineNum !== undefined) {
          lineNum = result.newLineNum
        }
        if (result.shouldBreak) {
          break // Exit the while loop, continue with next line
        }
        pos = result.newPos
        column = result.newColumn
        continue
      }

      // Color: #RRGGBB or #RGB, optionally followed by :tokenName
      if (char === '#') {
        const result = parseColor(content, pos, column, lineNum)
        tokens.push(...result.tokens)
        pos = result.newPos
        column = result.newColumn
        continue
      }

      // Number (including decimals like 0.5 and percentages like 20%), optionally followed by :tokenName
      if (/[0-9]/.test(char)) {
        const result = parseNumber(content, pos, column, lineNum)
        tokens.push(...result.tokens)
        pos = result.newPos
        column = result.newColumn
        continue
      }

      // Check for rgba() or rgb() color before identifier parsing
      if (isRgbaColor(content, pos)) {
        const result = parseRgbaColor(content, pos, column, lineNum)
        if (result.tokens.length > 0) {
          tokens.push(...result.tokens)
          pos = result.newPos
          column = result.newColumn
          continue
        }
      }

      // Word (property, direction, keyword, or component name)
      if (/[a-zA-Z_]/.test(char)) {
        const result = parseIdentifier(content, pos, column, lineNum)
        tokens.push(result.token)
        pos = result.newPos
        column = result.newColumn
        continue
      }

      // Unknown character, skip
      pos++
      column++
    }

    tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum, column })
  }

  tokens.push({ type: 'EOF', value: '', line: lines.length, column: 0 })
  return tokens
}
