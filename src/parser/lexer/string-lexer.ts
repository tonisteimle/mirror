/**
 * String parsing logic for the Mirror DSL lexer.
 * Handles both regular strings ("...") and multiline strings ('...').
 */

import type { Token, TokenType } from './token-types'

export interface StringLexResult {
  tokens: Token[]
  newPos: number
  newColumn: number
  newLineNum?: number  // For multiline strings that span lines
  shouldBreak?: boolean  // Signal to break the line tokenization loop
}

/**
 * Parse a regular double-quoted string: "..."
 */
export function parseString(
  content: string,
  pos: number,
  column: number,
  lineNum: number
): StringLexResult {
  const tokens: Token[] = []
  let value = ''
  const startColumn = column
  pos++ // skip opening quote

  while (pos < content.length && content[pos] !== '"') {
    value += content[pos]
    pos++
  }

  if (pos >= content.length) {
    // Unterminated string - reached end of line without closing quote
    tokens.push({
      type: 'ERROR',
      value: `Unterminated string: "${value}`,
      line: lineNum,
      column: startColumn
    })
    return {
      tokens,
      newPos: pos,
      newColumn: column + value.length + 1
    }
  }

  pos++ // skip closing quote
  tokens.push({ type: 'STRING', value, line: lineNum, column: startColumn })

  return {
    tokens,
    newPos: pos,
    newColumn: column + value.length + 2
  }
}

/**
 * Parse a multiline single-quoted string: '...'
 * Can span multiple lines and supports escape sequences.
 */
export function parseMultilineString(
  content: string,
  pos: number,
  column: number,
  lineNum: number,
  lines: string[]
): StringLexResult {
  const tokens: Token[] = []
  let value = ''
  const startColumn = column
  const startLine = lineNum
  pos++ // skip opening quote

  // Collect content until closing quote, potentially spanning multiple lines
  let foundEnd = false
  let currentLine = content
  let currentLineNum = lineNum

  while (!foundEnd) {
    while (pos < currentLine.length) {
      // Handle escape sequence \'
      if (currentLine[pos] === '\\' && currentLine[pos + 1] === "'") {
        value += "'"
        pos += 2
        continue
      }
      // Found closing quote
      if (currentLine[pos] === "'") {
        pos++ // skip closing quote
        foundEnd = true
        break
      }
      value += currentLine[pos]
      pos++
    }

    // If not found on this line, continue to next line
    if (!foundEnd) {
      value += '\n'
      currentLineNum++
      if (currentLineNum >= lines.length) {
        // Unterminated multiline string
        tokens.push({
          type: 'ERROR',
          value: `Unterminated multiline string starting at line ${startLine + 1}`,
          line: startLine,
          column: startColumn
        })
        break
      }
      // Move to next line
      currentLine = lines[currentLineNum]
      pos = 0
    }
  }

  if (foundEnd) {
    tokens.push({ type: 'MULTILINE_STRING', value, line: startLine, column: startColumn })
  }

  // Add newline token for the line where the string ends
  tokens.push({ type: 'NEWLINE', value: '\n', line: currentLineNum, column: pos })

  return {
    tokens,
    newPos: pos,
    newColumn: pos,
    newLineNum: currentLineNum,
    shouldBreak: true  // Signal to break the while loop and continue with next line
  }
}
