/**
 * @module json-lexer
 * @description JSON-Parsing für den Mirror DSL Lexer
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Parst JSON Arrays/Objects für Data-Token-Werte
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERWENDUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @syntax JSON Array für Data-Token
 *   $tasks: [{ title: "Task 1", done: false }]
 *
 * @syntax Mehrzeiliges JSON
 *   $items: [
 *     { id: 1, name: "Item 1" },
 *     { id: 2, name: "Item 2" }
 *   ]
 *
 * @token JSON_VALUE
 *   value enthält kompletten JSON-String (inkl. Zeilenumbrüche)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSING-LOGIK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @algorithm
 * 1. Zähle öffnende [ und schließende ]
 * 2. Beachte Strings (kein Bracket-Counting in "...")
 * 3. Handle Escape-Sequences (\", \\)
 * 4. Sammle Content über mehrere Zeilen bis Balance = 0
 *
 * @returns newLineNum für korrekten Line-Counter nach Multi-Line JSON
 *
 * @used-by Parser für Data-Token-Definitionen
 * @used-by each-Loops mit JSON-Array-Daten
 */

import type { Token } from './token-types'

export interface JsonLexResult {
  token: Token
  newLineNum: number
}

/**
 * Parse a JSON array value that may span multiple lines.
 * Returns the complete JSON string as a single JSON_VALUE token.
 */
export function parseJsonArray(
  restOfLine: string,
  lineNum: number,
  column: number,
  lines: string[]
): JsonLexResult {
  let jsonValue = restOfLine
  let bracketCount = 0
  let inString = false

  // Count brackets in current line with proper escape handling
  for (let i = 0; i < restOfLine.length; i++) {
    const c = restOfLine[i]
    if (c === '\\' && i + 1 < restOfLine.length) {
      i++ // Skip escaped character
      continue
    }
    if (c === '"') inString = !inString
    if (!inString) {
      if (c === '[') bracketCount++
      if (c === ']') bracketCount--
    }
  }

  let foundEnd = bracketCount === 0

  // If not complete, continue to next lines
  let nextLine = lineNum + 1
  while (!foundEnd && nextLine < lines.length) {
    const nextLineContent = lines[nextLine].trim()
    jsonValue += '\n' + nextLineContent
    for (let i = 0; i < nextLineContent.length; i++) {
      const c = nextLineContent[i]
      if (c === '\\' && i + 1 < nextLineContent.length) {
        i++ // Skip escaped character
        continue
      }
      if (c === '"') inString = !inString
      if (!inString) {
        if (c === '[') bracketCount++
        if (c === ']') bracketCount--
      }
    }
    foundEnd = bracketCount === 0
    nextLine++
  }

  return {
    token: { type: 'JSON_VALUE', value: jsonValue, line: lineNum, column },
    newLineNum: nextLine - 1
  }
}
