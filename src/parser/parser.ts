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

/**
 * Resolve forward token references.
 * When tokens reference other tokens that were defined later (forward references),
 * this pass resolves them to their actual values.
 *
 * Example: $size: $base where $base: 16 is defined after $size
 */
function resolveTokenReferences(tokens: Map<string, unknown>): void {
  // Keep iterating until no more changes (handles transitive references)
  let changed = true
  let iterations = 0
  const maxIterations = 10 // Prevent infinite loops on circular references

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    for (const [name, value] of tokens) {
      // Check if value is a sequence with a single token reference
      if (
        value &&
        typeof value === 'object' &&
        'type' in value &&
        (value as { type: string }).type === 'sequence' &&
        'tokens' in value
      ) {
        const seq = value as { type: 'sequence'; tokens: Array<{ type: string; value: string }> }
        // Only resolve single token references
        if (seq.tokens.length === 1 && seq.tokens[0].type === 'TOKEN_REF') {
          const refName = seq.tokens[0].value
          const refValue = tokens.get(refName)
          // Only resolve if referenced token is now a simple value
          if (refValue !== undefined && typeof refValue !== 'object') {
            tokens.set(name, refValue)
            changed = true
          }
        }
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
  const ctx = createParserContext(tokens)

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
      ctx.advance() // skip unknown token
    }
  }

  // Apply selection commands to the AST
  applyCommands(nodes, commands, ctx.generateId.bind(ctx))

  // Resolve forward token references (e.g., $size: $base where $base is defined later)
  resolveTokenReferences(ctx.designTokens)

  return {
    nodes,
    errors: ctx.errors,
    registry: ctx.registry,
    tokens: ctx.designTokens,
    styles: ctx.styleMixins,
    commands,
    centralizedEvents
  }
}
