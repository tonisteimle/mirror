/**
 * Mirror DSL Lexer
 *
 * This module tokenizes Mirror DSL source code into tokens for parsing.
 * The lexer handles:
 * - Component definitions and names
 * - Properties and keywords
 * - Strings (single and multi-line)
 * - Numbers (integers, decimals, percentages)
 * - Colors (#RGB, #RRGGBB, #RRGGBBAA)
 * - Token references ($variable)
 * - JSON arrays for data definitions
 * - Operators and arithmetic
 * - Events and state keywords
 * - Heuristic error detection for typos
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
import { parseColor } from './color-lexer'
import { parseArithmeticOperator, parseComparisonOperator, parseArithmeticMinus } from './operator-lexer'
import { parseTokenRef } from './token-lexer'

/**
 * Tokenize Mirror DSL source code into an array of tokens.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const lines = input.split('\n')

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]

    // Handle indentation
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch ? indentMatch[1].length : 0

    if (indent > 0) {
      tokens.push({
        type: 'INDENT',
        value: String(indent),
        line: lineNum,
        column: 0
      })
    }

    let column = indent
    const content = line.slice(indent)

    if (content.trim() === '') {
      continue
    }

    // Skip comment lines: // comment
    if (content.trimStart().startsWith('//')) {
      continue
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
      // Emit: COMPONENT_DEF, KEYWORD 'from', COMPONENT_NAME
      tokens.push({
        type: 'COMPONENT_DEF',
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
      column += inheritDefMatch[0].length
    }

    // Check for component/style definition at start of line: Button: ... or Item*: (repeatable)
    const componentDefMatch = !inheritDefMatch && !selectorMatch && !tokenVarDefMatch && !listItemMatch && content.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\*)?:\s*/)
    if (componentDefMatch && !PROPERTIES.has(componentDefMatch[1]) && !DIRECTIONS.has(componentDefMatch[1])) {
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
    let pos = listItemMatch ? listItemMatch[0].length :
              (selectorMatch ? selectorMatch[0].length :
              (tokenVarDefMatch ? tokenVarDefMatch[0].length :
              (inheritDefMatch ? inheritDefMatch[0].length :
              (componentDefMatch ? componentDefMatch[0].length : 0))))

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
