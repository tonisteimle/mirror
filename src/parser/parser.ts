/**
 * Parser Module - Main Entry Point
 *
 * Coordinates parsing of the DSL by delegating to specialized modules.
 * This is the main entry point for parsing DSL source code into an AST.
 *
 * Architecture:
 * - parser-context.ts: Shared parser state and cursor operations
 * - expression-parser.ts: Values and expressions
 * - condition-parser.ts: Conditional expressions
 * - state-parser.ts: States, variables, events, actions
 * - style-parser.ts: Style groups and mixins
 * - command-parser.ts: Selection commands
 * - component-parser.ts: Component parsing
 * - definition-parser.ts: Component and token definitions
 * - parser-utils.ts: Low-level utilities
 * - types.ts: Type definitions
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
  ParseResult
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
import { parseComponent } from './component-parser'
import { parseComponentDefinition, parseTokenDefinition } from './definition-parser'
import { parseSelectionCommand } from './command-parser'
import { parseEventsBlock } from './events-parser'
import { applyCommands } from './parser-utils'
import { validateSemantics, checkCircularReferences } from './semantic-validation'

// Re-export semantic validation
export { validateSemantics, checkCircularReferences } from './semantic-validation'

// Re-export debug tools
export { debugParse, printAST, printTokens, printParseResult } from './debug'

// Re-export error utilities
export { formatError, formatErrors, ErrorCollector, type ParseError } from './errors'

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
 * Resolve forward token references using topological sorting.
 * When tokens reference other tokens (forward or transitive references),
 * this pass resolves them to their actual values using dependency order.
 *
 * Example: $a: $b, $b: $c, $c: 16 resolves to $c=16, $b=16, $a=16
 *
 * Circular references are detected and skipped with a warning.
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
 * Parse DSL source code into an AST.
 *
 * @param input The DSL source code string
 * @returns ParseResult containing nodes, errors, registries, and commands
 */
export function parse(input: string): ParseResult {
  const tokens: Token[] = tokenize(input)
  const ctx = createParserContext(tokens, input)

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

    // Centralized events block: events ...
    if (ctx.current()?.type === 'EVENTS') {
      const handlers = parseEventsBlock(ctx)
      centralizedEvents.push(...handlers)
      continue
    }

    // Component instance
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      const node = parseComponent(ctx, 0)
      if (node) {
        // Named instance definitions of primitives (e.g., Input Email:) are template-only
        // They're detected by having both instanceName and _primitiveType, with explicit definition
        // These define reusable input patterns but shouldn't render at top level
        const isPrimitiveNamedInstanceDef = node.instanceName && node.properties._primitiveType && node._isExplicitDefinition
        if (!isPrimitiveNamedInstanceDef) {
          nodes.push(node)
        }
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

  // Resolve forward token references (e.g., $size: $base where $base is defined later)
  resolveTokenReferences(ctx.designTokens)

  return {
    nodes,
    errors: ctx.errors,
    diagnostics: ctx.errorCollector.getErrors(),
    registry: ctx.registry,
    tokens: ctx.designTokens,
    styles: ctx.styleMixins,
    commands,
    centralizedEvents
  }
}
