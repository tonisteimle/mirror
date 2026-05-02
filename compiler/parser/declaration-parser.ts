/**
 * Declaration Parser
 *
 * Pure-leaf parsers for top-level `$`-prefixed declarations:
 *
 *   - `parseSchema` / `parseSchemaField` — `$schema:` definition with typed
 *     fields and constraints (`required`, `max N`, `onDelete cascade|...`).
 *   - `parseIconDefinitions` — `$icons:` block of `name: "<svg-path>"` pairs.
 *
 * No callbacks needed; these don't recurse back into the main parser.
 *
 * Extracted from parser.ts.
 */

import type {
  SchemaDefinition,
  SchemaField,
  SchemaType,
  SchemaConstraint,
  IconDefinition,
} from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { MAX_ITERATIONS } from './ops/limits'

const U = ParserUtils

/* ---------------------------------------------------------------- $schema */

export function parseSchema(ctx: ParserContext): SchemaDefinition | null {
  const startToken = U.advance(ctx) // $schema
  U.advance(ctx) // :

  // Skip newlines if any, then expect INDENT
  while (U.check(ctx, 'NEWLINE')) {
    U.advance(ctx)
  }
  if (!U.check(ctx, 'INDENT')) {
    return {
      fields: [],
      line: startToken.line,
      column: startToken.column,
    }
  }
  U.advance(ctx) // consume INDENT

  // Skip the NEWLINE that often follows INDENT
  if (U.check(ctx, 'NEWLINE')) {
    U.advance(ctx)
  }

  const fields: SchemaField[] = []

  // Parse fields until DEDENT
  for (let iter = 0; !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS; iter++) {
    U.skipNewlines(ctx)
    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // Check for field definition: fieldName: type [, constraints...]
    if (U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'COLON')) {
      const field = parseSchemaField(ctx)
      if (field) fields.push(field)
      continue
    }

    // Unknown content - skip
    U.advance(ctx)
  }

  // Consume DEDENT
  if (U.check(ctx, 'DEDENT')) {
    U.advance(ctx)
  }

  return {
    fields,
    line: startToken.line,
    column: startToken.column,
  }
}

/**
 * Parse a single schema field.
 *
 * Syntax:
 *   fieldName: type [, constraint1] [, constraint2]
 *
 * Types:
 *   - string, number, boolean (primitives)
 *   - $collection (N:1 relation)
 *   - $collection[] (N:N relation)
 *
 * Constraints:
 *   - required
 *   - max N
 *   - onDelete cascade|nullify|restrict
 */
export function parseSchemaField(ctx: ParserContext): SchemaField | null {
  const nameToken = U.advance(ctx) // fieldName
  const line = nameToken.line
  U.advance(ctx) // :

  // Parse type
  let fieldType: SchemaType

  if (U.check(ctx, 'IDENTIFIER')) {
    const typeToken = U.advance(ctx)
    const typeValue = typeToken.value

    // Check for relation type ($users, $projects, etc.)
    if (typeValue.startsWith('$')) {
      // Check for array notation: $users[]
      let isArray = false
      if (U.check(ctx, 'LBRACKET') && U.checkNext(ctx, 'RBRACKET')) {
        U.advance(ctx) // [
        U.advance(ctx) // ]
        isArray = true
      }
      fieldType = { kind: 'relation', target: typeValue, isArray }
    } else {
      // Primitive type: string, number, boolean
      const primitiveType = typeValue as 'string' | 'number' | 'boolean'
      if (!['string', 'number', 'boolean'].includes(primitiveType)) {
        // Unknown type, default to string
        fieldType = { kind: 'primitive', type: 'string' }
      } else {
        fieldType = { kind: 'primitive', type: primitiveType }
      }
    }
  } else {
    // No type specified, default to string
    fieldType = { kind: 'primitive', type: 'string' }
  }

  // Parse constraints
  const constraints: SchemaConstraint[] = []

  while (U.check(ctx, 'COMMA')) {
    U.advance(ctx) // consume ,

    if (U.check(ctx, 'IDENTIFIER')) {
      const constraintToken = U.advance(ctx)
      const constraintName = constraintToken.value

      if (constraintName === 'required') {
        constraints.push({ kind: 'required' })
      } else if (constraintName === 'max' && U.check(ctx, 'NUMBER')) {
        const maxValue = parseInt(U.advance(ctx).value, 10)
        constraints.push({ kind: 'max', value: maxValue })
      } else if (constraintName === 'onDelete' && U.check(ctx, 'IDENTIFIER')) {
        const actionToken = U.advance(ctx)
        const action = actionToken.value as 'cascade' | 'nullify' | 'restrict'
        if (['cascade', 'nullify', 'restrict'].includes(action)) {
          constraints.push({ kind: 'onDelete', action })
        }
      }
    }
  }

  return {
    name: nameToken.value,
    type: fieldType,
    constraints,
    line,
  }
}

/* ----------------------------------------------------------------- $icons */

/**
 * Parse custom icon definitions.
 *
 * Syntax:
 *   $icons:
 *     hbox: "M3 3h18v18H3z M9 3v18"
 *     vbox: "M3 3h18v18H3z M21 9H3"
 *     grid: "M3 3h8v8H3z M13 3h8v8h-8z"
 */
export function parseIconDefinitions(ctx: ParserContext): IconDefinition[] {
  U.advance(ctx) // $icons
  U.advance(ctx) // :

  // Skip newlines if any, then expect INDENT
  while (U.check(ctx, 'NEWLINE')) {
    U.advance(ctx)
  }
  if (!U.check(ctx, 'INDENT')) {
    return []
  }
  U.advance(ctx) // consume INDENT

  // Skip the NEWLINE that often follows INDENT
  if (U.check(ctx, 'NEWLINE')) {
    U.advance(ctx)
  }

  const icons: IconDefinition[] = []

  // Parse icon definitions until DEDENT
  for (let iter = 0; !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS; iter++) {
    U.skipNewlines(ctx)
    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // Check for icon definition: iconName: "path data"
    if (U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'COLON')) {
      const nameToken = U.advance(ctx) // iconName
      const line = nameToken.line
      const column = nameToken.column
      U.advance(ctx) // :

      // Expect STRING with path data
      if (U.check(ctx, 'STRING')) {
        const pathToken = U.advance(ctx)
        icons.push({
          name: nameToken.value,
          path: pathToken.value,
          line,
          column,
        })
      }
      continue
    }

    // Unknown content - skip
    U.advance(ctx)
  }

  // Consume DEDENT
  if (U.check(ctx, 'DEDENT')) {
    U.advance(ctx)
  }

  return icons
}
