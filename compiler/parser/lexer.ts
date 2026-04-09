/**
 * Mirror Lexer
 *
 * Tokenizes .mirror source code.
 *
 * Keywords are imported from the DSL schema (src/schema/dsl.ts)
 */

import { DSL } from '../schema/dsl'

export type TokenType =
  | 'IDENTIFIER'
  | 'STRING'
  | 'NUMBER'
  | 'COLON'
  | 'COMMA'
  | 'SEMICOLON'
  | 'DOT'
  | 'EQUALS'
  | 'QUESTION'
  | 'AT'           // @
  | 'LPAREN'       // (
  | 'RPAREN'       // )
  | 'LBRACKET'     // [
  | 'RBRACKET'     // ]
  | 'LBRACE'       // {
  | 'RBRACE'       // }
  | 'GT'           // >
  | 'LT'           // <
  | 'GTE'          // >=
  | 'LTE'          // <=
  | 'NOT_EQUAL'    // !=
  | 'STRICT_EQUAL' // ===
  | 'STRICT_NOT_EQUAL' // !==
  | 'AND_AND'      // &&
  | 'OR_OR'        // ||
  | 'BANG'         // !
  | 'AS'
  | 'EXTENDS'
  | 'NAMED'
  | 'EACH'
  | 'IN'
  | 'IF'
  | 'ELSE'
  | 'WHERE'
  | 'BY'
  | 'ASC'
  | 'DESC'
  | 'GROUPED'
  | 'DATA'
  | 'KEYS'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'THEN'
  | 'SELECTION'
  | 'BIND'          // bind varName (track active exclusive() child content)
  | 'ROUTE'
  | 'WITH'
  | 'ANIMATION'    // animation keyword for animation definitions
  | 'USE'           // use filename (imports components from another file)
  | 'SLASH'
  | 'PLUS'         // + (addition/concatenation)
  | 'MINUS'        // - (subtraction)
  | 'STAR'         // * (multiplication)
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF'
  | 'SECTION'      // --- Name ---
  | 'COMMENT'

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

export interface LexerError {
  message: string
  line: number
  column: number
  hint?: string
}

export interface LexerResult {
  tokens: Token[]
  errors: LexerError[]
}

export class Lexer {
  private source: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private indentStack: number[] = [0]
  private tokens: Token[] = []
  private errors: LexerError[] = []

  // Indentation consistency tracking
  // The first indentation defines the standard unit (typically 2 or 4 spaces)
  private indentUnit: number | null = null
  // Tracks initial file indentation (for unusual files that start indented)
  private initialIndent: number = 0

  // Maximum indentation depth to prevent infinite loops
  // Set to 51 to allow 50 levels of nesting (stack starts with [0])
  private static readonly MAX_INDENT_DEPTH = 51

  constructor(source: string) {
    // Normalize line endings: convert \r\n (Windows) and \r (old Mac) to \n
    this.source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  }

  /**
   * Tokenize and return only tokens (for backwards compatibility).
   * Use tokenizeWithErrors() to also get lexer errors.
   */
  tokenize(): Token[] {
    return this.tokenizeWithErrors().tokens
  }

  /**
   * Tokenize and return both tokens and errors.
   */
  tokenizeWithErrors(): LexerResult {
    // Handle initial indentation at start of file
    // This ensures the first line's indentation sets the unit
    if (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t')) {
      this.handleInitialIndentation()
    }

    while (!this.isAtEnd()) {
      this.scanToken()
    }

    // Emit remaining DEDENTs
    // Stop at initialIndent level (don't emit DEDENT for initial file indentation)
    while (this.indentStack.length > 1 &&
           this.indentStack[this.indentStack.length - 1] > this.initialIndent) {
      this.indentStack.pop()
      this.addToken('DEDENT', '')
    }
    // Pop the initial indent level without emitting DEDENT
    if (this.indentStack.length > 1 &&
        this.indentStack[this.indentStack.length - 1] === this.initialIndent) {
      this.indentStack.pop()
    }

    this.addToken('EOF', '')
    return {
      tokens: this.tokens,
      errors: this.errors
    }
  }

  private addError(message: string, hint?: string): void {
    this.errors.push({
      message,
      line: this.line,
      column: this.column,
      hint
    })
  }

  private scanToken(): void {
    // Handle newlines and indentation
    if (this.peek() === '\n') {
      this.advance()
      this.line++
      this.column = 1
      this.handleIndentation()
      return
    }

    // Skip spaces (not at line start)
    if (this.peek() === ' ' || this.peek() === '\t') {
      this.advance()
      return
    }

    // Comments
    if (this.peek() === '/' && this.peekNext() === '/') {
      this.skipComment()
      return
    }

    // Section headers: --- Name ---
    if (this.peek() === '-' && this.peekNext() === '-') {
      this.scanSection()
      return
    }

    // Negative numbers: -123, -45.6
    if (this.peek() === '-' && this.isDigit(this.peekNext())) {
      this.scanNegativeNumber()
      return
    }

    // Strings (double or single quotes)
    if (this.peek() === '"' || this.peek() === "'") {
      this.scanString()
      return
    }

    // Numbers (including leading decimal like .5)
    if (this.isDigit(this.peek()) || (this.peek() === '#')) {
      this.scanNumber()
      return
    }

    // Leading decimal: .5 → 0.5
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.scanLeadingDecimal()
      return
    }

    // Selection bindings and item references starting with $ (e.g., $selected, $item.title)
    if (this.peek() === '$') {
      this.scanDollarIdentifier()
      return
    }

    // Identifiers and keywords
    if (this.isAlpha(this.peek())) {
      this.scanIdentifier()
      return
    }

    // Single and multi-character operators
    switch (this.peek()) {
      case ':': this.addToken('COLON', ':'); this.advance(); break
      case ',': this.addToken('COMMA', ','); this.advance(); break
      case ';': this.addToken('SEMICOLON', ';'); this.advance(); break
      case '.': this.addToken('DOT', '.'); this.advance(); break
      case '?': this.addToken('QUESTION', '?'); this.advance(); break
      case '@': this.addToken('AT', '@'); this.advance(); break
      case '(': this.addToken('LPAREN', '('); this.advance(); break
      case ')': this.addToken('RPAREN', ')'); this.advance(); break
      case '[': this.addToken('LBRACKET', '['); this.advance(); break
      case ']': this.addToken('RBRACKET', ']'); this.advance(); break
      case '{': this.addToken('LBRACE', '{'); this.advance(); break
      case '}': this.addToken('RBRACE', '}'); this.advance(); break
      case '=':
        this.advance()
        if (this.peek() === '=' && this.peekNext() === '=') {
          this.advance()
          this.advance()
          this.addToken('STRICT_EQUAL', '===')
        } else if (this.peek() === '=') {
          this.advance()
          this.addToken('EQUALS', '==')  // == as single token
        } else {
          this.addToken('EQUALS', '=')
        }
        break
      case '&':
        this.advance()
        if (this.peek() === '&') {
          this.advance()
          this.addToken('AND_AND', '&&')
        }
        break
      case '|':
        this.advance()
        if (this.peek() === '|') {
          this.advance()
          this.addToken('OR_OR', '||')
        }
        break
      case '>':
        this.advance()
        if (this.peek() === '=') {
          this.advance()
          this.addToken('GTE', '>=')
        } else {
          this.addToken('GT', '>')
        }
        break
      case '<':
        this.advance()
        if (this.peek() === '=') {
          this.advance()
          this.addToken('LTE', '<=')
        } else {
          this.addToken('LT', '<')
        }
        break
      case '!':
        this.advance()
        if (this.peek() === '=' && this.peekNext() === '=') {
          this.advance()
          this.advance()
          this.addToken('STRICT_NOT_EQUAL', '!==')
        } else if (this.peek() === '=') {
          this.advance()
          this.addToken('NOT_EQUAL', '!=')
        } else {
          this.addToken('BANG', '!')
        }
        break
      case '/':
        // Single slash (comments are handled earlier)
        this.addToken('SLASH', '/')
        this.advance()
        break
      case '+':
        this.addToken('PLUS', '+')
        this.advance()
        break
      case '-':
        // Check if this is a negative number or subtraction operator
        // Only treat as MINUS if not followed by a digit (negative numbers are handled in scanNumber)
        if (this.peekNext() >= '0' && this.peekNext() <= '9') {
          this.scanNumber()
        } else {
          this.addToken('MINUS', '-')
          this.advance()
        }
        break
      case '*':
        this.addToken('STAR', '*')
        this.advance()
        break
      default:
        // Unknown character - report error
        const unknownChar = this.peek()
        this.addError(
          `Unexpected character '${unknownChar}'`,
          `Remove this character or check for typos`
        )
        this.advance()
    }
  }

  /**
   * Handle indentation at the very start of a file (before any newlines).
   * This sets the indentation unit based on the first line's indentation.
   * We also update the indent stack (without emitting tokens) so that
   * subsequent indentation consistency checks are measured correctly.
   */
  private handleInitialIndentation(): void {
    let indent = 0
    const startPos = this.pos
    while (this.peek() === ' ') {
      indent++
      this.advance()
    }
    while (this.peek() === '\t') {
      indent += 4
      this.advance()
    }

    // If there's initial indentation:
    // 1. Set the unit for consistency checking
    // 2. Update indent stack so subsequent increments are measured from this base
    //    (but don't emit INDENT token - the file structure doesn't change)
    if (indent > 0) {
      if (this.indentUnit === null) {
        this.indentUnit = indent
      }
      // Track initial indent so we don't emit DEDENT for it at EOF
      this.initialIndent = indent
      // Push to stack for correct increment measurement
      this.indentStack.push(indent)
    }

    // Reset position - the spaces will be skipped by scanToken
    this.pos = startPos
    this.column = 1
  }

  private handleIndentation(): void {
    let indent = 0
    while (this.peek() === ' ') {
      indent++
      this.advance()
    }
    while (this.peek() === '\t') {
      indent += 4 // Treat tab as 4 spaces
      this.advance()
    }

    // Skip empty lines
    if (this.peek() === '\n' || this.isAtEnd()) {
      return
    }

    const currentIndent = this.indentStack[this.indentStack.length - 1]

    // Check indentation consistency
    // The first indent increment defines the standard unit
    if (indent > currentIndent) {
      const increment = indent - currentIndent
      if (this.indentUnit === null) {
        // First indentation increment defines the standard unit
        this.indentUnit = increment
      } else if (increment !== this.indentUnit) {
        // Indentation increment doesn't match the standard unit
        // Note: This is detected as a warning by the validator via isLexerWarning()
        this.addError(
          `Inconsistent indentation: expected ${this.indentUnit} spaces, got ${increment}`,
          `Use consistent indentation of ${this.indentUnit} spaces`
        )
      }
    }

    if (indent > currentIndent) {
      // Check for excessive indentation depth
      if (this.indentStack.length >= Lexer.MAX_INDENT_DEPTH) {
        this.addError(
          `Indentation too deep (maximum ${Lexer.MAX_INDENT_DEPTH} levels)`,
          `Reduce nesting or refactor into separate components`
        )
        // Don't push more indentation, treat as same level
      } else {
        this.indentStack.push(indent)
        this.addToken('INDENT', '')
      }
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop()
        this.addToken('DEDENT', '')
      }
    }

    this.addToken('NEWLINE', '')
  }

  private scanString(): void {
    const quote = this.peek() // Remember which quote type (" or ')
    const startLine = this.line
    const startColumn = this.column
    this.advance() // Opening quote
    let value = ''

    while (!this.isAtEnd() && this.peek() !== quote && this.peek() !== '\n') {
      // Handle escaped quotes
      if (this.peek() === '\\' && this.peekNext() === quote) {
        this.advance()
        value += quote
      } else {
        value += this.peek()
      }
      this.advance()
    }

    // Check for unclosed string
    if (this.isAtEnd() || this.peek() === '\n') {
      this.errors.push({
        message: `Unclosed string starting at line ${startLine}, column ${startColumn}`,
        line: startLine,
        column: startColumn,
        hint: `Add a closing ${quote} to complete the string`
      })
      // Still emit the token with what we have
      this.addToken('STRING', value)
      return
    }

    this.advance() // Closing quote
    this.addToken('STRING', value)
  }

  private scanNumber(): void {
    let value = ''

    // Hex color
    if (this.peek() === '#') {
      const startColumn = this.column
      value += this.advance()
      while (this.isHexDigit(this.peek())) {
        value += this.advance()
      }

      // Validate hex color length: #RGB (3), #RGBA (4), #RRGGBB (6), or #RRGGBBAA (8)
      const hexLength = value.length - 1 // excluding #
      if (hexLength === 0) {
        this.addError(
          `Invalid color: '#' must be followed by hex digits`,
          `Use format #RGB, #RRGGBB, or #RRGGBBAA`
        )
      } else if (hexLength !== 3 && hexLength !== 4 && hexLength !== 6 && hexLength !== 8) {
        this.addError(
          `Invalid color "${value}": expected 3, 4, 6, or 8 hex digits, got ${hexLength}`,
          `Use format #RGB, #RRGGBB, or #RRGGBBAA`
        )
      }

      this.addToken('NUMBER', value)
      return
    }

    // Regular number
    while (this.isDigit(this.peek())) {
      value += this.advance()
    }

    // Handle decimal part
    if (this.peek() === '.') {
      if (this.isDigit(this.peekNext())) {
        // Valid decimal: 1.5
        value += this.advance() // .
        while (this.isDigit(this.peek())) {
          value += this.advance()
        }

        // Check for multiple decimals: 1.2.3
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
          this.addError(
            `Invalid number "${value}.${this.peekNext()}...": multiple decimal points`,
            `Remove the extra decimal point`
          )
        }
      } else {
        // Trailing decimal: 5. (warn but continue)
        this.addError(
          `Trailing decimal point in "${value}."`,
          `Use "${value}.0" or remove the decimal point`
        )
      }
    }

    // Include % suffix for percentages
    if (this.peek() === '%') {
      value += this.advance()
    }

    // Include time unit suffixes (s, ms) for durations
    if (this.peek() === 's') {
      value += this.advance()
    } else if (this.peek() === 'm' && this.peekNext() === 's') {
      value += this.advance() // m
      value += this.advance() // s
    }

    // Include fraction notation for aspect ratios (e.g., 16/9, 4/3)
    if (this.peek() === '/' && this.isDigit(this.peekNext())) {
      value += this.advance() // /
      while (this.isDigit(this.peek())) {
        value += this.advance()
      }
    }

    this.addToken('NUMBER', value)
  }

  private scanNegativeNumber(): void {
    let value = this.advance() // consume -

    // Regular number after the minus
    while (this.isDigit(this.peek())) {
      value += this.advance()
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance() // .
      while (this.isDigit(this.peek())) {
        value += this.advance()
      }
    }

    this.addToken('NUMBER', value)
  }

  private scanLeadingDecimal(): void {
    // .5 → parse as 0.5
    this.advance() // consume .
    let value = '0.'

    while (this.isDigit(this.peek())) {
      value += this.advance()
    }

    // Warn about leading decimal
    this.addError(
      `Leading decimal ".${value.slice(2)}" - consider using "${value}"`,
      `Add a leading zero for clarity`
    )

    this.addToken('NUMBER', value)
  }

  private scanDollarIdentifier(): void {
    let value = this.advance() // consume $

    // Read the rest of the identifier (e.g., $selected, $item.title)
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-' || this.peek() === '.') {
      value += this.advance()
    }

    this.addToken('IDENTIFIER', value)
  }

  private scanIdentifier(): void {
    let value = ''

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-') {
      value += this.advance()
    }

    // Keywords from schema - maps lowercase keyword to UPPERCASE TokenType
    // Schema defines: ['as', 'extends', 'named', ...] → TokenTypes: AS, EXTENDS, NAMED, ...
    const type = this.getKeywordTokenType(value) || 'IDENTIFIER'
    this.addToken(type, value)
  }

  /**
   * Get TokenType for a keyword from the schema.
   * Returns undefined if not a keyword.
   */
  private getKeywordTokenType(word: string): TokenType | undefined {
    // Check if word is in schema's reserved keywords
    if (DSL.keywords.reserved.includes(word as any)) {
      // Convert to uppercase TokenType (e.g., 'as' → 'AS', 'each' → 'EACH')
      return word.toUpperCase() as TokenType
    }
    return undefined
  }

  private scanSection(): void {
    // Skip ---
    while (this.peek() === '-') {
      this.advance()
    }

    // Skip whitespace
    while (this.peek() === ' ') {
      this.advance()
    }

    // Get name
    let name = ''
    while (this.peek() !== '-' && this.peek() !== '\n' && !this.isAtEnd()) {
      name += this.advance()
    }

    // Skip trailing ---
    while (this.peek() === '-' || this.peek() === ' ') {
      this.advance()
    }

    this.addToken('SECTION', name.trim())
  }

  private skipComment(): void {
    while (this.peek() !== '\n' && !this.isAtEnd()) {
      this.advance()
    }
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column,
    })
  }

  private peek(): string {
    return this.source[this.pos] || '\0'
  }

  private peekNext(): string {
    return this.source[this.pos + 1] || '\0'
  }

  private advance(): string {
    const char = this.source[this.pos]
    this.pos++
    this.column++
    return char
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9'
  }

  private isHexDigit(c: string): boolean {
    return this.isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')
  }

  private isAlpha(c: string): boolean {
    // Support ASCII letters, underscore, and unicode letters (äöüÄÖÜß etc.)
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_' || /\p{L}/u.test(c)
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c)
  }
}

export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize()
}

export function tokenizeWithErrors(source: string): LexerResult {
  return new Lexer(source).tokenizeWithErrors()
}
