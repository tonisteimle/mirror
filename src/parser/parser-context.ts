/**
 * @module parser-context
 * @description Parser Context - Shared Parser State & Cursor Operations
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Zentraler State-Container für alle Parser-Module
 *
 * Der ParserContext ist das Rückgrat des gesamten Parsers:
 * - Token-Stream Navigation (current, peek, advance)
 * - Registries für Tokens, Templates, Styles
 * - Error Collection und Recovery
 * - ID-Generierung für AST-Nodes
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITEKTUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @diagram
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          ParserContext                                  │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │ Token Stream                                                     │   │
 * │  │ ┌───────┬───────┬───────┬───────┬───────┬─────┐                 │   │
 * │  │ │ Token │ Token │ Token │ Token │ Token │ EOF │                 │   │
 * │  │ └───────┴───────┴───────┴───────┴───────┴─────┘                 │   │
 * │  │           ↑                                                      │   │
 * │  │          pos (cursor position)                                   │   │
 * │  └─────────────────────────────────────────────────────────────────┘   │
 * │                                                                         │
 * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
 * │  │ designTokens    │  │ registry        │  │ styleMixins     │         │
 * │  │ Map<name,value> │  │ Map<name,templ> │  │ Map<name,style> │         │
 * │  │ $primary: #3B82 │  │ Button: {...}   │  │ rounded: {...}  │         │
 * │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
 * │                                                                         │
 * │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
 * │  │ errors[]        │  │ errorCollector  │  │ parseIssues[]   │         │
 * │  │ Legacy strings  │  │ Structured      │  │ Error-tolerant  │         │
 * │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CURSOR-OPERATIONEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @method current() → Token | undefined
 *   Gibt aktuelles Token zurück ohne Cursor zu bewegen
 *   Beispiel: ctx.current()?.type === 'COMPONENT_NAME'
 *
 * @method peek(offset) → Token | undefined
 *   Schaut offset Tokens voraus (default: 1)
 *   Beispiel: ctx.peek(1)?.type === 'COLON'
 *
 * @method advance() → Token
 *   Gibt aktuelles Token zurück UND bewegt Cursor um 1
 *   Beispiel: const name = ctx.advance().value
 *
 * @method skipNewlines()
 *   Überspringt alle NEWLINE Tokens
 *   Verwendet für Block-Parsing nach Braces
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ERROR-RECOVERY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @method recover()
 *   Springt zum nächsten Synchronisationspunkt:
 *   - NEWLINE
 *   - COMPONENT_NAME
 *   - COMPONENT_DEF
 *   - TOKEN_VAR_DEF
 *   - EOF
 *
 * @method recoverToNewline()
 *   Einfachere Recovery: Springt nur zum nächsten NEWLINE
 *
 * @example Error Recovery
 *   try {
 *     parseProperty(ctx)
 *   } catch {
 *     ctx.recover() // Skip to next sync point
 *   }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN-EXPANSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @method resolveTokenValue(name, visited?) → Token[]
 *   Löst einen Token-Namen zu seiner Token-Sequenz auf
 *   Erkennt zirkuläre Referenzen via visited Set
 *
 * @method expandTokenSequence(tokens, visited?) → Token[]
 *   Expandiert TOKEN_REF Tokens rekursiv
 *
 * @example Token Expansion
 *   $base: 8
 *   $spacing: $base * 2
 *
 *   resolveTokenValue('spacing')
 *   → [NUMBER "8", ARITHMETIC "*", NUMBER "2"]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ID-GENERIERUNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @method generateId(prefix) → string
 *   Erzeugt eindeutige IDs für AST-Nodes
 *   Format: prefix + incrementing counter
 *
 * @example
 *   ctx.generateId('Button')  → 'Button1'
 *   ctx.generateId('Button')  → 'Button2'
 *   ctx.generateId('Card')    → 'Card1'
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REGISTRIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @registry designTokens Map<string, TokenValue>
 *   Design Tokens (Variablen)
 *   $primary: #3B82F6
 *   $spacing: 16
 *   $complex: l-r 4 (TokenSequence)
 *
 * @registry registry Map<string, ComponentTemplate>
 *   Komponenten-Definitionen
 *   Button: { properties: { pad: 12 }, children: [] }
 *
 * @registry styleMixins Map<string, StyleMixin>
 *   Style Mixins (aktuell wenig genutzt)
 *   rounded: { properties: { rad: 8 } }
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PARSE ISSUES (Error-Tolerant Parsing)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @collection parseIssues ParseIssue[]
 *   Sammelt Probleme ohne Parsing abzubrechen:
 *   - unknown_event: "onclck" (→ "onclick"?)
 *   - unknown_property: "paddin" (→ "padding"?)
 *   - unknown_animation: "slideup" (→ "slide-up"?)
 *
 * @used-by Linter, Editor-Diagnostics, Validation
 */

import type { Token } from './lexer'
import type { ComponentTemplate, StyleMixin, ASTNode, TokenValue, ParseIssue, TokenSequence } from './types'
import { isTokenSequence } from './types'
import { ErrorCollector, type ParseError, createError, ErrorCodes } from './errors'
import { getBestMatch } from '../validator/utils/suggestion-engine'
import { PROPERTIES, EVENT_KEYWORDS, ANIMATION_KEYWORDS } from '../dsl/properties'

/**
 * Parser Context - shared state and operations for parsing.
 */
export interface ParserContext {
  // Token stream
  readonly tokens: Token[]
  pos: number

  // Source text for error context
  readonly source: string
  readonly sourceLines: string[]

  // Registries
  readonly registry: Map<string, ComponentTemplate>
  readonly designTokens: Map<string, TokenValue>
  readonly styleMixins: Map<string, StyleMixin>
  readonly idCounters: Map<string, number>

  // Theme support
  readonly themeDefinitions: Map<string, Map<string, TokenValue>>
  activeTheme: string | null

  // Error handling (backwards compatible)
  readonly errors: string[]

  // Structured error collection
  readonly errorCollector: ErrorCollector

  // V7: Parse issues (error-tolerant parsing)
  readonly parseIssues: ParseIssue[]

  // Cursor methods
  current(): Token | undefined
  peek(offset?: number): Token | undefined
  advance(): Token
  skipNewlines(): void

  // Error recovery - skip to next synchronization point
  recover(): void
  recoverToNewline(): void

  // ID generation
  generateId(prefix: string): string

  // Token expansion - resolves token sequences with nested token references
  resolveTokenValue(name: string, visited?: Set<string>): Token[]
  expandTokenSequence(tokens: Token[], visited?: Set<string>): Token[]

  // Error helpers
  addError(code: string, message: string, token: Token, hint?: string): void
  addWarning(code: string, message: string, token: Token, hint?: string): void
}

/**
 * Options for creating a parser context with pre-populated values.
 */
export interface ParserContextOptions {
  /** Parent tokens to inherit (e.g., from outer document) */
  parentTokens?: Map<string, TokenValue>
  /** Parent registry to inherit (e.g., from outer document) */
  parentRegistry?: Map<string, ComponentTemplate>
}

/**
 * @doc createParserContext
 * @brief Erstellt einen neuen ParserContext aus einem Token-Stream
 * @input tokens Token[] - Lexer-Output
 * @input source string - Original-Quellcode (für Error-Context)
 * @input options ParserContextOptions - Optional: Parent-Tokens/Registry
 * @output ParserContext - Vollständiger Parser-State
 *
 * @algorithm
 * 1. Initialisiere leere Registries (tokens, templates, styles)
 * 2. Pre-populate aus Parent-Context (falls vorhanden)
 * 3. Sammle Lexer-Errors und heuristische Parse-Issues
 * 4. Erstelle Context-Objekt mit allen Methoden
 *
 * @example Basic Usage
 *   const tokens = tokenize('Button "Click"')
 *   const ctx = createParserContext(tokens, source)
 *   while (ctx.current()?.type !== 'EOF') {
 *     // parse tokens
 *   }
 *
 * @example With Parent Context (für eingebettete Playgrounds)
 *   const ctx = createParserContext(tokens, source, {
 *     parentTokens: outerDoc.tokens,
 *     parentRegistry: outerDoc.registry
 *   })
 *
 * @error-handling
 *   - Sammelt ERROR Tokens vom Lexer
 *   - Sammelt UNKNOWN_* Tokens als ParseIssues
 *   - Generiert Suggestions via getBestMatch
 */
export function createParserContext(
  tokens: Token[],
  source: string = '',
  options?: ParserContextOptions
): ParserContext {
  const registry = new Map<string, ComponentTemplate>()
  const designTokens = new Map<string, TokenValue>()
  const styleMixins = new Map<string, StyleMixin>()
  const idCounters = new Map<string, number>()
  const themeDefinitions = new Map<string, Map<string, TokenValue>>()
  let activeTheme: string | null = null
  const errors: string[] = []
  const sourceLines = source.split('\n')
  const errorCollector = new ErrorCollector(source)
  const parseIssues: ParseIssue[] = []

  // Pre-populate with parent context (local definitions can override)
  if (options?.parentTokens) {
    for (const [key, value] of options.parentTokens) {
      designTokens.set(key, value)
    }
  }
  if (options?.parentRegistry) {
    for (const [key, value] of options.parentRegistry) {
      registry.set(key, value)
    }
  }

  // Collect lexer errors and parse issues from heuristic token types
  for (const token of tokens) {
    if (token.type === 'ERROR') {
      errors.push(`Line ${token.line + 1}: ${token.value}`)
      errorCollector.addError(
        ErrorCodes.UNTERMINATED_STRING,
        token.value,
        token.line,
        token.column
      )
    }

    // V7: Collect UNKNOWN_* tokens as parse issues
    if (token.type === 'UNKNOWN_EVENT') {
      const suggestion = getBestMatch(token.value, Array.from(EVENT_KEYWORDS))
      parseIssues.push({
        type: 'unknown_event',
        value: token.value,
        line: token.line,
        column: token.column,
        message: `Unknown event "${token.value}"`,
        suggestion: suggestion ? `Did you mean "${suggestion}"?` : undefined
      })
    }

    if (token.type === 'UNKNOWN_PROPERTY') {
      const suggestion = getBestMatch(token.value, Array.from(PROPERTIES))
      parseIssues.push({
        type: 'unknown_property',
        value: token.value,
        line: token.line,
        column: token.column,
        message: `Unknown property "${token.value}"`,
        suggestion: suggestion ? `Did you mean "${suggestion}"?` : undefined
      })
    }

    if (token.type === 'UNKNOWN_ANIMATION') {
      const suggestion = getBestMatch(token.value, Array.from(ANIMATION_KEYWORDS))
      parseIssues.push({
        type: 'unknown_animation',
        value: token.value,
        line: token.line,
        column: token.column,
        message: `Unknown animation "${token.value}"`,
        suggestion: suggestion ? `Did you mean "${suggestion}"?` : undefined
      })
    }
  }

  let pos = 0

  const ctx: ParserContext = {
    tokens,
    get pos() { return pos },
    set pos(value: number) { pos = value },

    source,
    sourceLines,

    registry,
    designTokens,
    styleMixins,
    idCounters,
    themeDefinitions,
    get activeTheme() { return activeTheme },
    set activeTheme(value: string | null) { activeTheme = value },
    errors,
    errorCollector,
    parseIssues,

    current(): Token | undefined {
      return tokens[pos]
    },

    peek(offset = 1): Token | undefined {
      return tokens[pos + offset]
    },

    advance(): Token {
      return tokens[pos++]
    },

    skipNewlines(): void {
      while (ctx.current()?.type === 'NEWLINE' || ctx.current()?.type === 'INDENT') {
        ctx.advance()
      }
    },

    /**
     * Recover from an error by skipping to the next synchronization point.
     * Synchronization points are: newlines, EOF, or start of new component/definition.
     */
    recover(): void {
      while (ctx.current() && ctx.current()!.type !== 'EOF') {
        const tokenType = ctx.current()!.type
        // Stop at synchronization points
        if (
          tokenType === 'NEWLINE' ||
          tokenType === 'COMPONENT_NAME' ||
          tokenType === 'COMPONENT_DEF' ||
          tokenType === 'TOKEN_VAR_DEF'
        ) {
          break
        }
        ctx.advance()
      }
    },

    /**
     * Recover to the next newline (simpler recovery).
     */
    recoverToNewline(): void {
      while (ctx.current() && ctx.current()!.type !== 'EOF' && ctx.current()!.type !== 'NEWLINE') {
        ctx.advance()
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    },

    generateId(name: string): string {
      const count = (idCounters.get(name) || 0) + 1
      idCounters.set(name, count)
      return `${name}${count}`
    },

    /**
     * Add an error to both the legacy string array and structured collector.
     */
    addError(code: string, message: string, token: Token, hint?: string): void {
      const fullMessage = hint ? `${message}. ${hint}` : message
      errors.push(`Error: Line ${token.line + 1}: ${fullMessage}`)
      errorCollector.addError(code, message, token.line, token.column, {
        hint,
        source: token.value,
        endColumn: token.column + token.value.length,
      })
    },

    /**
     * Add a warning to both the legacy string array and structured collector.
     */
    addWarning(code: string, message: string, token: Token, hint?: string): void {
      const fullMessage = hint ? `${message}. ${hint}` : message
      errors.push(`Warning: Line ${token.line + 1}: ${fullMessage}`)
      errorCollector.addWarning(code, message, token.line, token.column, {
        hint,
        source: token.value,
      })
    },

    /**
     * Resolve a token name to its expanded token sequence.
     * If the token is a simple value, wraps it in a single-element array.
     * If the token is a sequence, expands any nested token references.
     * @param visited - Set of already visited token names for cycle detection
     */
    resolveTokenValue(name: string, visited: Set<string> = new Set()): Token[] {
      // Cycle detection: prevent infinite loops from circular references
      if (visited.has(name)) {
        // Create synthetic token for position info when we don't have a source token
        const syntheticToken: Token = { type: 'TOKEN_REF', value: name, line: 0, column: 0 }
        ctx.addWarning(
          'CIRCULAR_REFERENCE',
          `Circular token reference detected: $${name}`,
          syntheticToken,
          `Token chain: ${[...visited].join(' → ')} → ${name}`
        )
        return []
      }
      visited.add(name)

      const value = designTokens.get(name)
      if (value === undefined) {
        return []
      }

      // Simple value - create a synthetic token
      if (typeof value === 'number') {
        return [{ type: 'NUMBER', value: String(value), line: 0, column: 0 }]
      }
      if (typeof value === 'string') {
        // Check if it's a color
        if (value.startsWith('#')) {
          return [{ type: 'COLOR', value, line: 0, column: 0 }]
        }
        return [{ type: 'STRING', value, line: 0, column: 0 }]
      }

      // Token sequence - expand nested references
      if (isTokenSequence(value)) {
        return ctx.expandTokenSequence(value.tokens, visited)
      }

      return []
    },

    /**
     * Expand a token sequence by recursively resolving any TOKEN_REF tokens.
     * @param visited - Set of already visited token names for cycle detection
     */
    expandTokenSequence(tokenSeq: Token[], visited: Set<string> = new Set()): Token[] {
      const result: Token[] = []

      for (const token of tokenSeq) {
        if (token.type === 'TOKEN_REF') {
          // Recursively resolve the referenced token with cycle detection
          const expanded = ctx.resolveTokenValue(token.value, visited)
          result.push(...expanded)
        } else {
          result.push(token)
        }
      }

      return result
    }
  }

  return ctx
}

/**
 * @constant MAX_CLONE_DEPTH
 * @brief Maximale Rekursionstiefe für Child-Cloning
 * @value 50
 * @purpose Verhindert Stack Overflow bei tief verschachtelten Templates
 */
const MAX_CLONE_DEPTH = 50

/**
 * @doc cloneChildrenWithNewIds
 * @brief Klont Children mit neuen IDs für Template-Instanziierung
 * @input children ASTNode[] - Zu klonende Kinder
 * @input generateId (name: string) => string - ID-Generator
 * @input depth number - Aktuelle Rekursionstiefe (intern)
 * @output ASTNode[] - Geklonte Kinder mit neuen IDs
 *
 * @purpose
 *   Wenn ein Template instanziiert wird, müssen alle Children
 *   neue IDs bekommen, damit sie eindeutig sind.
 *
 * @algorithm
 * 1. Prüfe MAX_CLONE_DEPTH (Schutz vor Stack Overflow)
 * 2. Für jedes Kind:
 *    a. Erstelle Shallow Copy
 *    b. Generiere neue ID
 *    c. Deep-Clone Properties (verhindert shared references)
 *    d. Rekursiv Children klonen
 *
 * @example
 *   // Template: Card mit 2 Children
 *   Card: vertical
 *     Title "Default"
 *     Content "..."
 *
 *   // Bei Instanziierung:
 *   Card "My Card"
 *   // → Title bekommt neue ID (Title2 statt Title1)
 *   // → Content bekommt neue ID (Content2 statt Content1)
 *
 * @edge-cases
 *   - Leeres children Array → Leeres Array zurück
 *   - MAX_CLONE_DEPTH erreicht → Flaches Klonen (Warning)
 *   - Zirkuläre Referenzen → Nicht möglich (AST ist Tree)
 */
export function cloneChildrenWithNewIds(
  children: ASTNode[],
  generateId: (name: string) => string,
  depth: number = 0
): ASTNode[] {
  if (depth >= MAX_CLONE_DEPTH) {
    // Performance safeguard: prevent excessive recursion in pathological cases.
    // This is a defensive measure that should rarely trigger in normal usage.
    // Note: No parser context available here - console.warn is acceptable for debugging.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Parser] Max clone depth (${MAX_CLONE_DEPTH}) reached - using shallow clone`)
    }
    return children.map(child => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _isExplicitDefinition, ...rest } = child
      return {
        ...rest,
        id: generateId(child.name),
        properties: { ...child.properties }
      }
    })
  }
  return children.map(child => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _isExplicitDefinition, ...rest } = child
    return {
      ...rest,
      id: generateId(child.name),
      // Deep clone properties to avoid shared references
      properties: { ...child.properties },
      children: cloneChildrenWithNewIds(child.children, generateId, depth + 1)
    }
  })
}
