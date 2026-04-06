/**
 * Rename Engine
 *
 * Core logic for IDE-style "Rename Symbol" (F2) functionality.
 * Finds symbols at cursor position and all their references across files.
 */

import { tokenize, type Token } from '../../compiler/parser/lexer'

export type SymbolType = 'component' | 'token'

export interface SymbolInfo {
  name: string
  type: SymbolType
  /** For tokens, the full definition name including suffix (e.g., "$primary.bg") */
  fullName?: string
}

export interface SymbolLocation {
  file: string
  line: number
  column: number
  length: number
  type: 'definition' | 'reference' | 'inheritance'
  /** The actual text found at this location */
  text: string
}

export interface RenameResult {
  symbol: SymbolInfo
  locations: SymbolLocation[]
}

export interface FileInfo {
  name: string
  content: string
}

/**
 * Rename Engine - finds symbols and their references
 */
export class RenameEngine {
  /**
   * Get symbol at cursor position
   *
   * Identifies components and tokens based on context:
   * - Component definition: `Btn:` → "Btn"
   * - Component usage: `Btn "Text"` → "Btn"
   * - Component inheritance: `PrimaryBtn as Btn:` → "Btn" (when cursor on Btn)
   * - Token definition: `$primary.bg:` → "$primary"
   * - Token reference: `bg $primary` → "$primary"
   */
  getSymbolAtPosition(source: string, line: number, column: number): SymbolInfo | null {
    const lines = source.split('\n')
    if (line < 1 || line > lines.length) return null

    const lineText = lines[line - 1]
    if (column < 1 || column > lineText.length + 1) return null

    // Find word boundaries around cursor (0-based column)
    const col = column - 1
    let start = col
    let end = col

    // Expand left - include $ for tokens, alphanumeric and underscores
    while (start > 0) {
      const char = lineText[start - 1]
      if (this.isSymbolChar(char) || (start === col + 1 && char === '$')) {
        start--
      } else if (char === '$') {
        start--
        break
      } else {
        break
      }
    }

    // Expand right - alphanumeric, underscores, dots for tokens
    while (end < lineText.length) {
      const char = lineText[end]
      if (this.isSymbolChar(char)) {
        end++
      } else {
        break
      }
    }

    if (start === end) return null

    const word = lineText.substring(start, end)
    if (!word) return null

    // Determine symbol type based on context
    return this.classifySymbol(word, lineText, start, lines, line)
  }

  /**
   * Find all references to a symbol in a single file
   */
  findReferencesInFile(
    source: string,
    filename: string,
    symbolName: string,
    symbolType: SymbolType
  ): SymbolLocation[] {
    const locations: SymbolLocation[] = []
    const lines = source.split('\n')

    if (symbolType === 'component') {
      this.findComponentReferences(lines, filename, symbolName, locations)
    } else {
      this.findTokenReferences(lines, filename, symbolName, locations)
    }

    return locations
  }

  /**
   * Find all references across all files
   */
  findAllReferences(
    files: FileInfo[],
    symbolName: string,
    symbolType: SymbolType
  ): RenameResult {
    const locations: SymbolLocation[] = []

    for (const file of files) {
      const fileLocations = this.findReferencesInFile(
        file.content,
        file.name,
        symbolName,
        symbolType
      )
      locations.push(...fileLocations)
    }

    // Sort by file, then line, then column
    locations.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file)
      if (a.line !== b.line) return a.line - b.line
      return a.column - b.column
    })

    return {
      symbol: { name: symbolName, type: symbolType },
      locations,
    }
  }

  /**
   * Apply rename to source content
   *
   * Applies changes in reverse order (bottom to top) to preserve positions
   */
  applyRename(
    source: string,
    locations: SymbolLocation[],
    newName: string
  ): string {
    // Sort locations in reverse order (bottom-right to top-left)
    const sortedLocations = [...locations].sort((a, b) => {
      if (a.line !== b.line) return b.line - a.line
      return b.column - a.column
    })

    const lines = source.split('\n')

    for (const loc of sortedLocations) {
      const lineIndex = loc.line - 1
      if (lineIndex < 0 || lineIndex >= lines.length) continue

      const line = lines[lineIndex]
      const colIndex = loc.column - 1

      // Replace the symbol at this location
      const before = line.substring(0, colIndex)
      const after = line.substring(colIndex + loc.length)
      lines[lineIndex] = before + newName + after
    }

    return lines.join('\n')
  }

  /**
   * Validate a new name for a symbol
   */
  validateName(name: string, symbolType: SymbolType): { valid: boolean; error?: string } {
    if (!name || name.trim() === '') {
      return { valid: false, error: 'Name cannot be empty' }
    }

    const trimmed = name.trim()

    if (symbolType === 'token') {
      // Token names must start with $
      if (!trimmed.startsWith('$')) {
        return { valid: false, error: 'Token names must start with $' }
      }
      // Check for valid token name (no spaces, valid chars)
      if (!/^\$[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmed)) {
        return { valid: false, error: 'Invalid token name format' }
      }
    } else {
      // Component names must start with uppercase
      if (!/^[A-Z]/.test(trimmed)) {
        return { valid: false, error: 'Component names must start with uppercase letter' }
      }
      // No spaces or special characters
      if (!/^[A-Z][a-zA-Z0-9_]*$/.test(trimmed)) {
        return { valid: false, error: 'Invalid component name format' }
      }
      // Check for reserved words
      const reserved = ['Frame', 'Text', 'Button', 'Input', 'Icon', 'Image', 'Link', 'Box']
      if (reserved.includes(trimmed)) {
        return { valid: false, error: `"${trimmed}" is a reserved primitive name` }
      }
    }

    return { valid: true }
  }

  // ============================================
  // Private helpers
  // ============================================

  private isSymbolChar(char: string): boolean {
    return /[a-zA-Z0-9_-]/.test(char)
  }

  private classifySymbol(
    word: string,
    lineText: string,
    wordStart: number,
    lines: string[],
    lineNum: number
  ): SymbolInfo | null {
    // Token (starts with $)
    if (word.startsWith('$')) {
      // Extract base name without suffix
      // e.g., "$primary.bg" → "$primary", "$primary" → "$primary"
      const baseName = this.extractTokenBaseName(word)
      return {
        name: baseName,
        type: 'token',
        fullName: word,
      }
    }

    // Check if it's a component name (starts with uppercase)
    if (/^[A-Z]/.test(word)) {
      // Determine if it's a definition or reference by checking context

      // Definition: `Btn:` (word followed by colon)
      const afterWord = lineText.substring(wordStart + word.length).trim()
      if (afterWord.startsWith(':')) {
        return { name: word, type: 'component' }
      }

      // Inheritance: `PrimaryBtn as Btn:` (word followed by colon after "as")
      // Or `Btn as OtherBtn:` (word before "as")
      const beforeWord = lineText.substring(0, wordStart).trim()
      if (beforeWord.endsWith('as')) {
        return { name: word, type: 'component' }
      }

      // Check if this line has "as Word:" pattern
      const asMatch = lineText.match(/as\s+([A-Z][a-zA-Z0-9_]*)\s*:/)
      if (asMatch && asMatch[1] === word) {
        return { name: word, type: 'component' }
      }

      // Instance/reference: `Btn "Text"` or just `Btn` at start of line
      return { name: word, type: 'component' }
    }

    return null
  }

  /**
   * Extract base token name without suffix
   * e.g., "$primary.bg" → "$primary"
   */
  private extractTokenBaseName(token: string): string {
    // Token format: $name or $name.suffix
    // We want just $name
    const dotIndex = token.indexOf('.')
    if (dotIndex === -1) return token
    return token.substring(0, dotIndex)
  }

  private findComponentReferences(
    lines: string[],
    filename: string,
    componentName: string,
    locations: SymbolLocation[]
  ): void {
    // Pattern for component definition: `Name:` or `Name as Base:`
    const defPattern = new RegExp(`^(\\s*)${this.escapeRegex(componentName)}\\s*(?:as\\s+[A-Z][a-zA-Z0-9_]*\\s*)?:`, 'm')

    // Pattern for inheritance base: `SomeName as Name:`
    const inheritPattern = new RegExp(`as\\s+${this.escapeRegex(componentName)}\\s*:`)

    // Pattern for instance: `Name` at start of expression (after indent or comma)
    // Must be followed by space, comma, newline, or end of line
    const instancePattern = new RegExp(`(?:^|\\s|,)${this.escapeRegex(componentName)}(?:\\s|,|$|")`)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Check for definition
      const defMatch = line.match(new RegExp(`^(\\s*)(${this.escapeRegex(componentName)})\\s*:`))
      if (defMatch) {
        const col = defMatch[1].length + 1
        locations.push({
          file: filename,
          line: lineNum,
          column: col,
          length: componentName.length,
          type: 'definition',
          text: componentName,
        })
        continue
      }

      // Check for definition with inheritance: `Name as Base:`
      const defWithInheritMatch = line.match(new RegExp(`^(\\s*)(${this.escapeRegex(componentName)})\\s+as\\s+`))
      if (defWithInheritMatch) {
        const col = defWithInheritMatch[1].length + 1
        locations.push({
          file: filename,
          line: lineNum,
          column: col,
          length: componentName.length,
          type: 'definition',
          text: componentName,
        })
      }

      // Check for inheritance base: `SomeName as Name:`
      const inheritMatch = line.match(new RegExp(`as\\s+(${this.escapeRegex(componentName)})\\s*:`))
      if (inheritMatch) {
        const col = line.indexOf(inheritMatch[0]) + inheritMatch[0].indexOf(componentName) + 1
        locations.push({
          file: filename,
          line: lineNum,
          column: col,
          length: componentName.length,
          type: 'inheritance',
          text: componentName,
        })
        continue
      }

      // Check for instances (usage without colon)
      // Use a more precise matching to find all occurrences
      let searchStart = 0
      while (searchStart < line.length) {
        const idx = line.indexOf(componentName, searchStart)
        if (idx === -1) break

        // Check boundaries - must be a word boundary
        const before = idx > 0 ? line[idx - 1] : ' '
        const after = idx + componentName.length < line.length ? line[idx + componentName.length] : ' '

        const isWordBoundaryBefore = /[\s,(\[]/.test(before) || idx === 0 || before === '='
        const isWordBoundaryAfter = /[\s,)\]:"]/.test(after) || idx + componentName.length === line.length

        // Not a definition (followed by colon with optional whitespace)
        const restOfLine = line.substring(idx + componentName.length)
        const isDefinition = /^\s*:/.test(restOfLine) || /^\s+as\s+/.test(restOfLine)

        // Not inheritance base (already handled above)
        const beforeText = line.substring(0, idx)
        const isInheritance = /as\s+$/.test(beforeText)

        if (isWordBoundaryBefore && isWordBoundaryAfter && !isDefinition && !isInheritance) {
          // Avoid duplicates
          const alreadyAdded = locations.some(
            loc => loc.file === filename && loc.line === lineNum && loc.column === idx + 1
          )
          if (!alreadyAdded) {
            locations.push({
              file: filename,
              line: lineNum,
              column: idx + 1,
              length: componentName.length,
              type: 'reference',
              text: componentName,
            })
          }
        }

        searchStart = idx + 1
      }
    }
  }

  private findTokenReferences(
    lines: string[],
    filename: string,
    tokenBaseName: string,
    locations: SymbolLocation[]
  ): void {
    // Token definition pattern: `$name.suffix:` (e.g., `$primary.bg:`)
    // Token reference pattern: `$name` (e.g., `bg $primary`)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Find all occurrences of the token
      let searchStart = 0
      while (searchStart < line.length) {
        const idx = line.indexOf(tokenBaseName, searchStart)
        if (idx === -1) break

        // Check what follows - could be `.suffix:` (definition), `.suffix` (part of ref), or nothing
        const after = line.substring(idx + tokenBaseName.length)

        // Check if it's a definition: `$name.suffix:`
        const defMatch = after.match(/^(\.[a-zA-Z_][a-zA-Z0-9_-]*)\s*:/)
        if (defMatch) {
          locations.push({
            file: filename,
            line: lineNum,
            column: idx + 1,
            length: tokenBaseName.length,
            type: 'definition',
            text: tokenBaseName,
          })
          searchStart = idx + tokenBaseName.length + defMatch[0].length
          continue
        }

        // Check if it's a reference (not followed by colon directly)
        // Must be at word boundary before
        const before = idx > 0 ? line[idx - 1] : ' '
        const isWordBoundaryBefore = /[\s,=:]/.test(before) || idx === 0

        // After can be: end of line, whitespace, comma, or just not a colon
        const isWordBoundaryAfter = /^(\s|,|$)/.test(after) || /^\.[a-zA-Z]/.test(after)
        const isNotDefinition = !/^(\.[a-zA-Z_][a-zA-Z0-9_-]*)?\s*:/.test(after)

        if (isWordBoundaryBefore && (isWordBoundaryAfter || isNotDefinition)) {
          // Avoid duplicates
          const alreadyAdded = locations.some(
            loc => loc.file === filename && loc.line === lineNum && loc.column === idx + 1
          )
          if (!alreadyAdded) {
            locations.push({
              file: filename,
              line: lineNum,
              column: idx + 1,
              length: tokenBaseName.length,
              type: 'reference',
              text: tokenBaseName,
            })
          }
        }

        searchStart = idx + 1
      }
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

/**
 * Singleton instance
 */
let renameEngineInstance: RenameEngine | null = null

export function getRenameEngine(): RenameEngine {
  if (!renameEngineInstance) {
    renameEngineInstance = new RenameEngine()
  }
  return renameEngineInstance
}

export function createRenameEngine(): RenameEngine {
  return new RenameEngine()
}
