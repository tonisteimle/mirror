/**
 * @module parser
 * @description Mirror DSL Parser - Haupt-Einstiegspunkt
 *
 * Koordiniert das Parsing der DSL durch Delegation an spezialisierte Module.
 * Konvertiert DSL-Quellcode in einen Abstract Syntax Tree (AST).
 *
 * @architecture
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                        parse(input)                                 │
 * │                            │                                        │
 * │    ┌───────────────────────┴───────────────────────┐                │
 * │    ▼                                               ▼                │
 * │ tokenize()                                  createParserContext()   │
 * │ (lexer/index.ts)                            (parser-context.ts)     │
 * │    │                                               │                │
 * │    ▼                                               ▼                │
 * │ Token[]  ────────────────────────────────►  ParserContext           │
 * │                                                    │                │
 * │    ┌──────────────────────┬───────────────────────┼─────────────┐   │
 * │    ▼                      ▼                       ▼             ▼   │
 * │ parseComponent   parseTokenDefinition   parseEventsBlock   ...      │
 * │ (component-      (definition-           (events-parser.ts)          │
 * │  parser/)        parser.ts)                                         │
 * │    │                  │                       │                     │
 * │    ▼                  ▼                       ▼                     │
 * │ ASTNode[]        tokens Map              CentralizedEventHandler[]  │
 * │                                                                     │
 * │    └──────────────────────┴───────────────────────┴─────────────┘   │
 * │                           │                                         │
 * │                           ▼                                         │
 * │                    ParseResult { nodes, tokens, registry, ... }     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * @syntax-overview
 * // Token-Definition
 * $primary: #3B82F6              → tokens.set('primary', '#3B82F6')
 *
 * // Komponenten-Definition (mit Colon)
 * Button: pad 12                 → registry.set('Button', template)
 *
 * // Komponenten-Instanz (ohne Colon)
 * Button "Click me"              → nodes.push(ASTNode)
 *
 * // Events-Block (zentralisiert)
 * events                         → centralizedEvents[]
 *   Btn onclick toggle
 *
 * // Conditionals
 * if $isLoggedIn                 → nodes.push(ConditionalNode)
 *   Dashboard
 *
 * @input DSL-Quellcode als String
 * @output ParseResult { nodes, errors, diagnostics, registry, tokens, ... }
 *
 * @dependencies
 * - lexer/index.ts: Tokenisierung
 * - parser-context.ts: Zustand und Cursor
 * - component-parser/: Komponenten-Parsing
 * - definition-parser.ts: Definitionen
 * - events-parser.ts: Events-Block
 * - children-parser.ts: Conditionals, Iteratoren
 *
 * @example
 * const result = parse('Button pad 12, "Click"')
 * // result.nodes[0] = { name: 'Button', properties: { pad: 12 }, ... }
 *
 * @example
 * const result = parse(`
 *   $primary: #3B82F6
 *   Button: bg $primary
 *   Button "Click"
 * `, { validate: true })
 * // result.tokens.get('primary') = '#3B82F6'
 * // result.registry.has('Button') = true
 * // result.nodes.length = 1
 */

import { tokenize } from './lexer'
import type { Token } from './lexer'

// Re-export types for backwards compatibility
export type {
  Expression,
  StateDefinition,
  VariableDeclaration,
  ActionStatement,
  Conditional,
  ConditionExpr,
  EventHandler,
  CentralizedEventHandler,
  ASTNode,
  ComponentTemplate,
  StyleMixin,
  SelectionCommand,
  ParseResult,
  // Data types
  DataSchema,
  DataField,
  DataRecord,
  DataRecords,
  // Token types
  TokenValue,
  // Runtime types (for Master-Detail pattern)
  RuntimeValue
} from './types'

// Import types for internal use
import type {
  ASTNode,
  SelectionCommand,
  ParseResult,
  CentralizedEventHandler
} from './types'

// Import modules
import { createParserContext } from './parser-context'
import { parseComponent, HTML_PRIMITIVES } from './component-parser'
import { parseComponentDefinition, parseInlineDefinition, parseLibraryDefinition, parseLibraryDefinitionV1, parseTokenDefinition } from './definition-parser'
import { parseSelectionCommand } from './command-parser'
import { parseEventsBlock } from './events-parser'
import { parseThemeDefinition, parseUseTheme } from './theme-parser'
import { applyCommands } from './parser-utils'
import { parseTopLevelConditional, parseTopLevelIterator } from './children-parser'
import { validateSemantics, checkCircularReferences } from './semantic-validation'
import type { EventHandler } from './types'

// ============================================
// Apply Centralized Events to Nodes
// ============================================

/**
 * @doc applyCentralizedEvents
 * @brief Wendet zentralisierte Event-Handler auf passende Nodes an
 *
 * @syntax
 * events
 *   Btn onclick toggle          → findet Node mit instanceName='Btn'
 *   Button onclick show Modal   → findet alle Nodes mit name='Button'
 *
 * @input
 * - nodes: ASTNode[] - Alle geparsten Top-Level-Nodes
 * - centralizedEvents: CentralizedEventHandler[] - Handler aus events-Block
 *
 * @output Modifiziert nodes in-place, fügt eventHandlers hinzu
 *
 * @algorithm
 * 1. Indexiert alle Nodes rekursiv nach instanceName und name
 * 2. Für jeden CentralizedEventHandler:
 *    - Sucht passende Nodes im Index
 *    - Konvertiert zu EventHandler
 *    - Fügt zu node.eventHandlers hinzu
 *
 * @example
 * // Input: events { Btn onclick toggle }
 * // Node: { name: 'Button', instanceName: 'Btn' }
 * // Output: node.eventHandlers = [{ event: 'onclick', actions: [...] }]
 */
function applyCentralizedEvents(
  nodes: ASTNode[],
  centralizedEvents: CentralizedEventHandler[]
): void {
  if (centralizedEvents.length === 0) return

  // Build an index of nodes by instanceName and name for quick lookup
  const nodesByName = new Map<string, ASTNode[]>()

  function indexNode(node: ASTNode): void {
    // Index by instanceName if present
    if (node.instanceName) {
      const existing = nodesByName.get(node.instanceName) || []
      existing.push(node)
      nodesByName.set(node.instanceName, existing)
    }
    // Also index by name (component type)
    const existingByName = nodesByName.get(node.name) || []
    existingByName.push(node)
    nodesByName.set(node.name, existingByName)

    // Recursively index children
    for (const child of node.children) {
      indexNode(child)
    }
  }

  // Index all nodes
  for (const node of nodes) {
    indexNode(node)
  }

  // Apply each centralized event to matching nodes
  for (const event of centralizedEvents) {
    const targetNodes = nodesByName.get(event.targetInstance)
    if (!targetNodes || targetNodes.length === 0) {
      // Node not found - validation will catch this
      continue
    }

    // Convert CentralizedEventHandler to EventHandler
    const handler: EventHandler = {
      event: event.event,
      key: event.key,
      debounce: event.debounce,
      delay: event.delay,
      actions: event.actions,
      line: event.line
    }

    // Attach to all matching nodes (usually just one)
    for (const node of targetNodes) {
      if (!node.eventHandlers) {
        node.eventHandlers = []
      }
      node.eventHandlers.push(handler)
    }
  }
}

// Re-export semantic validation
export { validateSemantics, checkCircularReferences } from './semantic-validation'

// ============================================

// Re-export debug tools
export { debugParse, printAST, printTokens, printParseResult } from './debug'

// Re-export error utilities
export { formatError, formatErrors, ErrorCollector, type ParseError } from './errors'

// ============================================
// Parse Options
// ============================================

export interface ParseOptions {
  /**
   * Run comprehensive validation after parsing.
   * Adds property, reference, event, action, library, state,
   * animation, and type validation diagnostics.
   */
  validate?: boolean

  /**
   * Treat validation warnings as errors (strict mode).
   * Only applies when validate is true.
   */
  strictValidation?: boolean

  /**
   * Skip certain validation categories.
   * Only applies when validate is true.
   */
  skipValidation?: Array<'property' | 'library' | 'reference' | 'event' | 'action' | 'animation' | 'type' | 'state'>

  /**
   * Parent tokens to inherit from outer document.
   * Used by Playground to access global tokens.
   */
  parentTokens?: Map<string, import('./types').TokenValue>

  /**
   * Parent registry to inherit from outer document.
   * Used by Playground to access global component definitions.
   */
  parentRegistry?: Map<string, import('./types').ComponentTemplate>
}

/**
 * Extract the token reference name from a value, if it's a single token reference.
 * Returns null if the value is not a token reference.
 */
function getTokenRefName(value: unknown): string | null {
  if (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    (value as { type: string }).type === 'sequence' &&
    'tokens' in value
  ) {
    const seq = value as { type: 'sequence'; tokens: Array<{ type: string; value: string }> }
    if (seq.tokens.length === 1 && seq.tokens[0].type === 'TOKEN_REF') {
      return seq.tokens[0].value
    }
  }
  return null
}

/**
 * @doc resolveTokenReferences
 * @brief Löst Forward-Token-Referenzen mittels topologischer Sortierung auf
 *
 * @syntax
 * $a: $b         → $a referenziert $b (Forward-Referenz)
 * $b: $c         → $b referenziert $c (Transitive Referenz)
 * $c: 16         → $c ist ein Wert (Basis)
 * // Auflösung: $c=16, $b=16, $a=16
 *
 * @input
 * - tokens: Map<string, unknown> - Token-Map aus ParserContext
 * - errors: Array - Optional, für Circular-Reference-Warnungen
 *
 * @output Modifiziert tokens Map in-place
 *
 * @algorithm
 * 1. Baut Abhängigkeitsgraph: token → referenziertes token
 * 2. Kahn's Algorithmus für topologische Sortierung:
 *    - Startet mit Tokens ohne Abhängigkeiten
 *    - Löst abhängige Tokens der Reihe nach auf
 * 3. Erkennt zirkuläre Referenzen (nicht auflösbare Tokens)
 *
 * @example
 * tokens = { a: {type:'sequence', tokens:[{type:'TOKEN_REF', value:'b'}]}, b: 16 }
 * resolveTokenReferences(tokens)
 * // tokens = { a: 16, b: 16 }
 *
 * @warning Zirkuläre Referenzen erzeugen Warnung, Token bleibt unaufgelöst
 */
function resolveTokenReferences(tokens: Map<string, unknown>, errors?: Array<{ message: string; severity: string }>): void {
  // Build dependency graph: token -> token it depends on
  const dependencies = new Map<string, string>()
  const dependents = new Map<string, Set<string>>() // reverse graph

  for (const [name, value] of tokens) {
    const refName = getTokenRefName(value)
    if (refName && tokens.has(refName)) {
      dependencies.set(name, refName)
      if (!dependents.has(refName)) {
        dependents.set(refName, new Set())
      }
      dependents.get(refName)!.add(name)
    }
  }

  // Topological sort using Kahn's algorithm
  // Find tokens with no dependencies (can be resolved immediately)
  const resolved = new Set<string>()
  const queue: string[] = []

  for (const [name] of tokens) {
    if (!dependencies.has(name)) {
      queue.push(name)
      resolved.add(name)
    }
  }

  // Process in dependency order
  while (queue.length > 0) {
    const current = queue.shift()!

    // Check all tokens that depend on this one
    const deps = dependents.get(current)
    if (deps) {
      for (const dependent of deps) {
        if (resolved.has(dependent)) continue

        // This dependent was waiting for 'current' - now we can resolve it
        const refName = dependencies.get(dependent)!
        const refValue = tokens.get(refName)

        // Only resolve if the referenced value is now a simple value (not an object)
        if (refValue !== undefined && typeof refValue !== 'object') {
          tokens.set(dependent, refValue)
        }

        resolved.add(dependent)
        queue.push(dependent)
      }
    }
  }

  // Check for circular references (tokens that couldn't be resolved)
  for (const [name] of dependencies) {
    if (!resolved.has(name)) {
      // Circular reference detected
      if (errors) {
        errors.push({
          message: `Circular token reference detected: $${name}`,
          severity: 'warning'
        })
      }
    }
  }
}

/**
 * Check if a value is a token reference object
 */
function isTokenReference(value: unknown): value is { type: 'token'; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 'token' &&
    typeof (value as Record<string, unknown>).name === 'string'
  )
}

/**
 * Property to token suffix mapping for context-aware resolution.
 * When resolving $s for 'pad', first try $s.pad, then $s
 */
const PROPERTY_TOKEN_SUFFIXES: Record<string, string[]> = {
  // Spacing
  'pad': ['pad', 'padding'],
  'padding': ['pad', 'padding'],
  'p': ['pad', 'padding'],
  'mar': ['mar', 'margin'],
  'margin': ['mar', 'margin'],
  'm': ['mar', 'margin'],
  'gap': ['gap'],
  'g': ['gap'],
  // Radius
  'rad': ['rad', 'radius'],
  'radius': ['rad', 'radius'],
  // Size (font-size)
  'size': ['size'],
  'fs': ['size'],
  'font-size': ['size'],
  // Icon Size
  'is': ['is', 'icon-size'],
  'icon-size': ['is', 'icon-size'],
  // Border
  'bor': ['bor.width', 'bor', 'border.width', 'border'],
  'border': ['bor.width', 'bor', 'border.width', 'border'],
  'border-width': ['bor.width', 'border.width'],
  // Font
  'font': ['font'],
  'font-family': ['font'],
  // Dimensions
  'w': ['w', 'width'],
  'width': ['w', 'width'],
  'h': ['h', 'height'],
  'height': ['h', 'height'],
}

/**
 * Resolve a token name with context-aware fallback.
 * For property 'pad' and token '$s', tries: $s.pad, $s.padding, $s
 */
function resolveTokenWithContext(
  tokenName: string,
  propertyKey: string,
  tokens: Map<string, unknown>
): unknown {
  const suffixes = PROPERTY_TOKEN_SUFFIXES[propertyKey.toLowerCase()]

  if (suffixes) {
    // Try property-specific tokens first
    for (const suffix of suffixes) {
      const contextualName = `${tokenName}.${suffix}`
      const value = tokens.get(contextualName)
      if (value !== undefined) {
        return value
      }
    }
  }

  // Fall back to direct token name
  return tokens.get(tokenName)
}

/**
 * @doc resolvePropertyTokens
 * @brief Löst Token-Referenzen in Node-Properties auf
 *
 * @input nodes - AST Nodes mit Properties die Token-Referenzen enthalten können
 * @input tokens - Aufgelöste Design-Tokens Map
 *
 * @syntax { type: 'token', name: 'primary' } → '#3B82F6'
 *
 * @description
 * Nach dem Parsing können Properties Token-Referenz-Objekte enthalten:
 * - Button bg $primary → properties.bg = { type: 'token', name: 'primary' }
 *
 * Diese Funktion ersetzt alle Token-Referenzen durch ihre aufgelösten Werte.
 * Wird rekursiv auf alle Kinder und States angewendet.
 *
 * Context-aware resolution: For property 'pad' with token '$s',
 * first tries $s.pad, then falls back to $s.
 *
 * @warning Nicht-aufgelöste Tokens (undefined) werden übersprungen
 */
function resolvePropertyTokens(nodes: ASTNode[], tokens: Map<string, unknown>): void {
  for (const node of nodes) {
    // Resolve tokens in properties
    for (const [key, value] of Object.entries(node.properties)) {
      if (isTokenReference(value)) {
        const tokenValue = resolveTokenWithContext(value.name, key, tokens)
        if (tokenValue !== undefined) {
          node.properties[key] = tokenValue
        }
      }
    }

    // Resolve tokens in states
    if (node.states) {
      for (const state of node.states) {
        for (const [key, value] of Object.entries(state.properties)) {
          if (isTokenReference(value)) {
            const tokenValue = resolveTokenWithContext(value.name, key, tokens)
            if (tokenValue !== undefined) {
              state.properties[key] = tokenValue
            }
          }
        }
      }
    }

    // Recursively process children
    if (node.children.length > 0) {
      resolvePropertyTokens(node.children, tokens)
    }
  }
}

// Validator integration - set by validator module to avoid circular deps
let _validateCode: ((result: ParseResult, source: string, options?: unknown) => { errors: Array<{ message: string }>; warnings: Array<{ message: string }> }) | null = null
let _diagnosticToParseError: ((d: unknown) => import('./errors').ParseError) | null = null

/**
 * Register the validator functions (called by validator module).
 * This avoids circular dependency issues.
 */
export function registerValidator(
  validateFn: typeof _validateCode,
  convertFn: typeof _diagnosticToParseError
): void {
  _validateCode = validateFn
  _diagnosticToParseError = convertFn
}

/**
 * Run validation on a parse result.
 */
function runValidation(result: ParseResult, input: string, options: ParseOptions): void {
  if (!_validateCode || !_diagnosticToParseError) {
    // Validator not registered - skip validation
    return
  }

  const validation = _validateCode!(result, input, {
    strictMode: options.strictValidation,
    skip: options.skipValidation
  })

  // Add validation diagnostics to the result
  for (const error of validation.errors) {
    result.diagnostics.push(_diagnosticToParseError!(error))
    result.errors.push(error.message)
  }
  for (const warning of validation.warnings) {
    result.diagnostics.push(_diagnosticToParseError!(warning))
  }
}

/**
 * @doc parse
 * @brief Haupt-Einstiegspunkt - Parst DSL-Quellcode in einen AST
 *
 * @syntax
 * // Token-Definition
 * $primary: #3B82F6
 *
 * // Komponenten-Definition
 * Button: pad 12, bg $primary
 *
 * // Komponenten-Instanz
 * Button "Click me"
 *
 * // Events-Block
 * events
 *   Btn onclick toggle
 *
 * // Conditionals
 * if $isLoggedIn
 *   Dashboard
 * else
 *   LoginForm
 *
 * @input
 * - input: string - DSL-Quellcode
 * - options?: ParseOptions
 *   - validate?: boolean - Umfassende Validierung aktivieren
 *   - strictValidation?: boolean - Warnings als Errors behandeln
 *   - skipValidation?: string[] - Kategorien überspringen
 *   - parentTokens?: Map - Tokens von außen erben (Playground)
 *   - parentRegistry?: Map - Registry von außen erben
 *
 * @output ParseResult
 * - nodes: ASTNode[] - Gerenderte Komponenten-Instanzen
 * - errors: string[] - Fehlermeldungen
 * - diagnostics: ParseError[] - Strukturierte Fehler
 * - registry: Map<string, ComponentTemplate> - Definitionen
 * - tokens: Map<string, TokenValue> - Design-Tokens
 * - centralizedEvents: CentralizedEventHandler[] - Events-Block
 *
 * @algorithm
 * 1. tokenize(input) → Token[]
 * 2. createParserContext(tokens) → ParserContext
 * 3. Loop über Tokens:
 *    - SELECTOR → parseSelectionCommand (:id ...)
 *    - TOKEN_VAR_DEF → parseTokenDefinition ($name: value)
 *    - COMPONENT_DEF → parseComponentDefinition (Name: props)
 *    - COMPONENT_NAME + 'as' + COMPONENT_DEF → parseLibraryDefinitionV1 (Name as Type:)
 *    - COMPONENT_NAME + 'as' + COMPONENT_NAME + COLON + BRACE → parseLibraryDefinition
 *    - COMPONENT_NAME + COLON + BRACE → parseInlineDefinition (brace-syntax)
 *    - EVENTS → parseEventsBlock
 *    - CONTROL 'if' → parseTopLevelConditional
 *    - CONTROL 'each' → parseTopLevelIterator
 *    - COMPONENT_NAME + MULTILINE_STRING → parseComponent (doc-mode: text, playground)
 *    - COMPONENT_NAME → parseComponent
 * 4. applyCentralizedEvents() - Events an Nodes anhängen
 * 5. resolveTokenReferences() - Forward-Referenzen auflösen
 * 6. Optional: runValidation()
 *
 * @example
 * // Einfaches Parsing
 * const result = parse('Button "Click"')
 *
 * // Mit Validierung
 * const result = parse(code, { validate: true })
 *
 * // Strict Mode (Warnings = Errors)
 * const result = parse(code, { validate: true, strictValidation: true })
 */
export function parse(input: string, options?: ParseOptions): ParseResult {
  // v1 inline syntax is standard - no normalization needed
  const tokens: Token[] = tokenize(input)

  const ctx = createParserContext(tokens, input, {
    parentTokens: options?.parentTokens,
    parentRegistry: options?.parentRegistry
  })

  const nodes: ASTNode[] = []
  const commands: SelectionCommand[] = []
  const centralizedEvents: CentralizedEventHandler[] = []

  ctx.skipNewlines()

  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    ctx.skipNewlines()

    // Selection command: :id ...
    if (ctx.current()?.type === 'SELECTOR') {
      const targetId = ctx.advance().value
      const command = parseSelectionCommand(ctx, targetId)
      if (command) {
        commands.push(command)
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
      continue
    }

    // Token variable definition: $primary: #3B82F6
    if (ctx.current()?.type === 'TOKEN_VAR_DEF') {
      parseTokenDefinition(ctx)
      continue
    }

    // Component definition: Button: hor cen gap 8 "Label"
    // Definitions register templates but don't create nodes directly
    if (ctx.current()?.type === 'COMPONENT_DEF') {
      parseComponentDefinition(ctx)
      continue
    }

    // Inline Definition: Button: pad 12
    // Note: "from" inheritance syntax has been removed. Use "Name as Parent:" instead.
    // Pattern: COMPONENT_NAME + COLON + properties (inline) or + BRACE_OPEN (brace-syntax)
    if (ctx.current()?.type === 'COMPONENT_NAME' &&
        ctx.peek(1)?.type === 'COLON') {
      const peekAfterColon = ctx.peek(2)
      // Check for brace-based definition patterns
      if (peekAfterColon?.type === 'BRACE_OPEN' ||
          (peekAfterColon?.type === 'COMPONENT_NAME' && ctx.peek(3)?.type === 'BRACE_OPEN')) {
        parseInlineDefinition(ctx)
        continue
      }
    }

    // Library Definition (brace-syntax): OptionsMenu as Dropdown: { w 200 }
    // Pattern: COMPONENT_NAME + 'as' + COMPONENT_NAME + COLON + BRACE_OPEN
    if (ctx.current()?.type === 'COMPONENT_NAME' &&
        ctx.peek(1)?.type === 'KEYWORD' && ctx.peek(1)?.value === 'as' &&
        ctx.peek(2)?.type === 'COMPONENT_NAME' &&
        ctx.peek(3)?.type === 'COLON' &&
        ctx.peek(4)?.type === 'BRACE_OPEN') {
      parseLibraryDefinition(ctx)
      continue
    }

    // Library Definition (inline syntax): OptionsMenu as Dropdown: w 200
    // Pattern: COMPONENT_NAME + 'as' + COMPONENT_DEF (e.g., "Tooltip:")
    // Also accepts: COMPONENT_NAME + 'as' + COMPONENT_NAME + COLON (when COMPONENT_DEF not at line start)
    // BUT NOT for HTML primitives like: SmallIcon as Icon: "circle" (handled by parseComponent)
    if (ctx.current()?.type === 'COMPONENT_NAME' &&
        ctx.peek(1)?.type === 'KEYWORD' && ctx.peek(1)?.value === 'as' &&
        (ctx.peek(2)?.type === 'COMPONENT_DEF' ||
         (ctx.peek(2)?.type === 'COMPONENT_NAME' && ctx.peek(3)?.type === 'COLON' && ctx.peek(4)?.type !== 'BRACE_OPEN'))) {
      // Extract type name from COMPONENT_DEF or COMPONENT_NAME
      const typeToken = ctx.peek(2)
      const typeName = typeToken?.type === 'COMPONENT_DEF'
        ? typeToken.value.replace(/:$/, '')
        : typeToken?.value
      // Use parseLibraryDefinitionV1 for:
      // 1. Non-primitive types (custom components)
      // 2. Primitive types that have a custom template registered (e.g., Button: with children)
      if (typeName && (!HTML_PRIMITIVES.includes(typeName) || ctx.registry.has(typeName))) {
        parseLibraryDefinitionV1(ctx)
        continue
      }
    }

    // Theme definition: theme dark: ...
    if (ctx.current()?.type === 'THEME') {
      parseThemeDefinition(ctx)
      continue
    }

    // Use theme: use theme dark
    if (ctx.current()?.type === 'KEYWORD' && ctx.current()?.value === 'use' &&
        ctx.peek(1)?.type === 'THEME') {
      parseUseTheme(ctx)
      continue
    }

    // Centralized events block: events ...
    if (ctx.current()?.type === 'EVENTS') {
      const handlers = parseEventsBlock(ctx)
      centralizedEvents.push(...handlers)
      continue
    }

    // Top-level conditional: if $condition ...
    if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
      const condNode = parseTopLevelConditional(ctx, (innerCtx, indent, scope) => parseComponent(innerCtx, indent, scope))
      if (condNode) {
        nodes.push(condNode)
      }
      continue
    }

    // Top-level iterator: each $item in $collection ...
    if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'each') {
      const iterNode = parseTopLevelIterator(ctx, (innerCtx, indent, scope) => parseComponent(innerCtx, indent, scope))
      if (iterNode) {
        nodes.push(iterNode)
      }
      continue
    }

    // Component instance
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const node = parseComponent(ctx, 0)
      if (node) {
        // Skip explicit definitions (with colon) - they're only templates, not rendered nodes
        if (node._isExplicitDefinition) {
          continue
        }

        // Doc-mode: Check for MULTILINE_STRING after text/playground components
        // This handles the case where the string is on the next line with or without indentation
        if ((node.name === 'text' || node.name === 'playground') && !node.properties._docContent) {
          // Skip newlines and indent to find MULTILINE_STRING
          ctx.skipNewlines()
          if (ctx.current()?.type === 'INDENT') {
            ctx.advance() // skip indent
          }
          if (ctx.current()?.type === 'MULTILINE_STRING') {
            node.properties._docContent = ctx.advance().value
            node._isLibrary = true
            node._libraryType = node.name
          }
        }

        nodes.push(node)
      }
    } else if (ctx.current()?.type === 'EOF') {
      break
    } else {
      // Unknown token - use error recovery instead of silent skip
      const unknownToken = ctx.current()!
      ctx.addWarning(
        'P001',
        `Unexpected token "${unknownToken.value}"`,
        unknownToken,
        'This token was skipped'
      )
      ctx.recover()
    }
  }

  // Apply selection commands to the AST
  applyCommands(nodes, commands, ctx.generateId.bind(ctx))

  // Apply centralized events from the `events` block to matching nodes
  applyCentralizedEvents(nodes, centralizedEvents)

  // Resolve forward token references (e.g., $size: $base where $base is defined later)
  resolveTokenReferences(ctx.designTokens)

  // Resolve token references in node properties (e.g., background: $primary → background: '#3B82F6')
  resolvePropertyTokens(nodes, ctx.designTokens)

  const result: ParseResult = {
    nodes,
    errors: ctx.errors,
    diagnostics: ctx.errorCollector.getErrors(),
    parseIssues: ctx.parseIssues,
    registry: ctx.registry,
    tokens: ctx.designTokens,
    styles: ctx.styleMixins,
    commands,
    centralizedEvents,
    themes: ctx.themeDefinitions,
    activeTheme: ctx.activeTheme
  }

  // Run comprehensive validation if requested
  if (options?.validate) {
    runValidation(result, input, options)
  }

  return result
}
