/**
 * Mirror Lexer
 *
 * Tokenizes .mirror source code.
 */

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
  | 'AS'
  | 'EXTENDS'
  | 'NAMED'
  | 'EACH'
  | 'IN'
  | 'IF'
  | 'ELSE'
  | 'WHERE'
  | 'DATA'
  | 'IMPORT'
  | 'KEYS'
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

export class Lexer {
  private source: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private indentStack: number[] = [0]
  private tokens: Token[] = []

  constructor(source: string) {
    this.source = source
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken()
    }

    // Emit remaining DEDENTs
    while (this.indentStack.length > 1) {
      this.indentStack.pop()
      this.addToken('DEDENT', '')
    }

    this.addToken('EOF', '')
    return this.tokens
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

    // Strings
    if (this.peek() === '"') {
      this.scanString()
      return
    }

    // Numbers
    if (this.isDigit(this.peek()) || (this.peek() === '#')) {
      this.scanNumber()
      return
    }

    // Identifiers and keywords
    if (this.isAlpha(this.peek())) {
      this.scanIdentifier()
      return
    }

    // Single characters
    switch (this.peek()) {
      case ':': this.addToken('COLON', ':'); this.advance(); break
      case ',': this.addToken('COMMA', ','); this.advance(); break
      case ';': this.addToken('SEMICOLON', ';'); this.advance(); break
      case '.': this.addToken('DOT', '.'); this.advance(); break
      case '=': this.addToken('EQUALS', '='); this.advance(); break
      case '?': this.addToken('QUESTION', '?'); this.advance(); break
      default:
        // Unknown character, skip
        this.advance()
    }
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

    if (indent > currentIndent) {
      this.indentStack.push(indent)
      this.addToken('INDENT', '')
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop()
        this.addToken('DEDENT', '')
      }
    }

    this.addToken('NEWLINE', '')
  }

  private scanString(): void {
    this.advance() // Opening quote
    let value = ''

    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\' && this.peekNext() === '"') {
        this.advance()
        value += '"'
      } else {
        value += this.peek()
      }
      this.advance()
    }

    this.advance() // Closing quote
    this.addToken('STRING', value)
  }

  private scanNumber(): void {
    let value = ''

    // Hex color
    if (this.peek() === '#') {
      value += this.advance()
      while (this.isHexDigit(this.peek())) {
        value += this.advance()
      }
      this.addToken('NUMBER', value)
      return
    }

    // Regular number
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

  private scanIdentifier(): void {
    let value = ''

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-') {
      value += this.advance()
    }

    // Keywords
    const keywords: Record<string, TokenType> = {
      'as': 'AS',
      'extends': 'EXTENDS',
      'named': 'NAMED',
      'each': 'EACH',
      'in': 'IN',
      'if': 'IF',
      'else': 'ELSE',
      'where': 'WHERE',
      'data': 'DATA',
      'import': 'IMPORT',
      'keys': 'KEYS',
    }

    const type = keywords[value] || 'IDENTIFIER'
    this.addToken(type, value)
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
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c)
  }
}

export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize()
}
