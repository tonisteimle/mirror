/**
 * Zag Component Parser
 *
 * Handles parsing of Zag UI components (Select, Checkbox, Tabs, etc.)
 * Extracted from the main parser for better modularity.
 *
 * Dependencies:
 * - ParserContext from parser-context.ts for state management
 * - ParserUtils for token manipulation
 * - Callbacks for methods with circular dependencies
 */

import type { Token } from './lexer'
import type {
  ZagNode,
  ZagSlotDef,
  Property,
  Event,
  Instance,
  Slot,
  State,
  TokenReference,
  LoopVarReference,
  Conditional,
  ComputedExpression,
} from './ast'

import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { MAX_ITERATIONS, MAX_LOOKAHEAD } from './ops/limits'
import { getZagPrimitive, isZagSlot } from '../schema/zag-primitives'
import { isPrimitive } from '../schema/dsl'
import {
  PROPERTY_STARTERS,
  ALL_BOOLEAN_PROPERTIES,
  EVENT_NAMES,
  STATE_MODIFIERS,
  STATE_NAMES,
} from '../schema/parser-helpers'

/** Property value type - union of all possible values in Property.values */
type PropertyValue =
  | string
  | number
  | boolean
  | number[]
  | TokenReference
  | LoopVarReference
  | Conditional
  | ComputedExpression

// Shorthand aliases for cleaner code
const U = ParserUtils

/**
 * Callbacks to main parser for methods that can't be extracted
 * due to circular dependencies.
 */
export interface ZagParserCallbacks {
  parseInlineProperties: (properties: Property[], events?: Event[]) => void
  parseProperty: () => Property | null
  parseNumericArray: () => number[]
  parseEvent: () => Event | null
  parseInstance: (nameToken: Token) => Instance | Slot | { type: 'ZagComponent' }
  skipNewlines: () => void
  previous: () => Token | null
  hasColonOnLine: () => boolean
}

/**
 * Parse a Zag component (Select, Accordion, etc.)
 *
 * Syntax:
 *   Select placeholder "Choose..."
 *     Trigger:
 *       pad 12, bg #1e1e2e
 *       hover:
 *         bg #2a2a3e
 *     Content:
 *       bg #2a2a3e, rad 8
 *     Item "Option A"
 *     Item "Option B" disabled
 */
export function parseZagComponent(
  ctx: ParserContext,
  nameToken: Token,
  callbacks: ZagParserCallbacks,
  colonAlreadyConsumed = false
): ZagNode {
  // Consume colon if present and not already consumed
  if (!colonAlreadyConsumed && U.check(ctx, 'COLON')) {
    U.advance(ctx)
  }

  const zagPrimitive = getZagPrimitive(nameToken.value)
  const machineType = zagPrimitive?.machine ?? 'unknown'

  const zagNode: ZagNode = {
    type: 'ZagComponent',
    machine: machineType,
    name: nameToken.value,
    properties: [],
    slots: {},
    items: [],
    events: [],
    line: nameToken.line,
    column: nameToken.column,
  }

  // Parse inline properties (e.g., placeholder "Choose...", multiple, disabled)
  parseZagInlineProperties(ctx, zagNode, callbacks)

  // Extract initial state from properties (same logic as for regular instances).
  // Zag-component-specific properties (from primitiveDef.props) must be excluded
  // here — otherwise a Zag prop without a value (e.g. `DatePicker fixedWeeks`)
  // would be misread as the component's initial state.
  const zagPropNames = new Set(zagPrimitive?.props ?? [])
  const initialStateIndex = zagNode.properties.findIndex(p => {
    const name = p.name
    return (
      p.values.length === 0 &&
      name[0] === name[0].toLowerCase() &&
      !PROPERTY_STARTERS.has(name) &&
      !ALL_BOOLEAN_PROPERTIES.has(name) &&
      !EVENT_NAMES.has(name) &&
      !STATE_MODIFIERS.has(name) &&
      !zagPropNames.has(name) &&
      name !== 'when' &&
      name !== 'as' &&
      name !== 'content'
    )
  })
  if (initialStateIndex !== -1) {
    const stateProp = zagNode.properties[initialStateIndex]
    zagNode.initialState = stateProp.name
    zagNode.properties.splice(initialStateIndex, 1)
  }

  // Check for colon at end of line - this marks it as a DEFINITION, not an instance
  // Select placeholder "...":  → Definition (not rendered)
  // Select placeholder "..."   → Instance (rendered)
  if (U.check(ctx, 'COLON')) {
    U.advance(ctx)
    zagNode.isDefinition = true
  }

  // Skip newline before checking for indented body
  callbacks.skipNewlines()

  // Parse indented body (slots and items)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    parseZagComponentBody(ctx, zagNode, callbacks)
  }

  return zagNode
}

/**
 * Parse inline properties specific to Zag components
 */
function parseZagInlineProperties(
  ctx: ParserContext,
  zagNode: ZagNode,
  callbacks: ZagParserCallbacks
): void {
  const zagPrimitive = getZagPrimitive(zagNode.name)
  const validProps = new Set(zagPrimitive?.props ?? [])

  // Handle leading STRING as label (e.g., Checkbox "Verrechenbar" → label: "Verrechenbar")
  if (U.check(ctx, 'STRING') && validProps.has('label')) {
    const token = U.advance(ctx)
    zagNode.properties.push({
      type: 'Property',
      name: 'label',
      values: [token.value],
      line: token.line,
      column: token.column,
    })
  }

  while (
    !U.check(ctx, 'NEWLINE') &&
    !U.check(ctx, 'INDENT') &&
    !U.check(ctx, 'DEDENT') &&
    !U.check(ctx, 'COLON') &&
    !U.isAtEnd(ctx)
  ) {
    // Skip commas
    if (U.check(ctx, 'COMMA') || U.check(ctx, 'SEMICOLON')) {
      U.advance(ctx)
      continue
    }

    // Check for Zag-specific properties
    if (U.check(ctx, 'IDENTIFIER')) {
      const propName = U.current(ctx).value

      // Boolean Zag properties (e.g., multiple, searchable, clearable, disabled).
      // The Mirror lexer emits `true`/`false` as IDENTIFIER tokens — they are an
      // explicit value for the current property, not the next property. So we
      // peek for them and exclude that case from the bare-boolean path.
      const nextTok = U.peekAt(ctx, 1)
      const nextIsExplicitBool =
        nextTok?.type === 'IDENTIFIER' && (nextTok.value === 'true' || nextTok.value === 'false')
      if (
        validProps.has(propName) &&
        !U.checkNext(ctx, 'STRING') &&
        !U.checkNext(ctx, 'NUMBER') &&
        !U.checkNext(ctx, 'LBRACKET') &&
        !nextIsExplicitBool
      ) {
        const token = U.advance(ctx)
        zagNode.properties.push({
          type: 'Property',
          name: propName,
          values: [true],
          line: token.line,
          column: token.column,
        })
        continue
      }

      // Zag property with value (e.g., placeholder "Choose...", defaultValue [20, 80])
      if (validProps.has(propName)) {
        const token = U.advance(ctx)
        const values: PropertyValue[] = []

        // Parse value(s) - stop at COLON (end of Select line), NEWLINE, INDENT, COMMA, SEMICOLON
        while (
          !U.check(ctx, 'NEWLINE') &&
          !U.check(ctx, 'INDENT') &&
          !U.check(ctx, 'COMMA') &&
          !U.check(ctx, 'SEMICOLON') &&
          !U.check(ctx, 'COLON') &&
          !U.isAtEnd(ctx)
        ) {
          if (U.check(ctx, 'STRING')) {
            values.push(U.advance(ctx).value)
          } else if (U.check(ctx, 'NUMBER')) {
            values.push(parseFloat(U.advance(ctx).value))
          } else if (
            U.check(ctx, 'IDENTIFIER') &&
            (U.current(ctx).value === 'true' || U.current(ctx).value === 'false')
          ) {
            // Explicit boolean value (`closeOnSelect false`, `disabled true`)
            values.push(U.advance(ctx).value === 'true')
          } else if (U.check(ctx, 'LBRACKET')) {
            // Array value: [20, 80]
            values.push(callbacks.parseNumericArray())
          } else if (U.check(ctx, 'IDENTIFIER') && validProps.has(U.current(ctx).value)) {
            // Next property starting
            break
          } else {
            values.push(U.advance(ctx).value)
          }
        }

        zagNode.properties.push({
          type: 'Property',
          name: propName,
          // Cast needed: PropertyValue includes number[] for array props (e.g., slider defaultValue [20, 80])
          values: values as Property['values'],
          line: token.line,
          column: token.column,
        })
        continue
      }
    }

    // Fall through to regular property parsing
    const properties: Property[] = []
    callbacks.parseInlineProperties(properties)
    zagNode.properties.push(...properties)
    break
  }
}

/**
 * Parse the body of a Zag component (slots and items)
 */
function parseZagComponentBody(
  ctx: ParserContext,
  zagNode: ZagNode,
  callbacks: ZagParserCallbacks
): void {
  for (let iter = 0; !U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && iter < MAX_ITERATIONS; iter++) {
    callbacks.skipNewlines()
    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // Note: Item/Group keywords are no longer routed here. After the 2026-04-25
    // Zag-Cleanup only DatePicker remains, which has neither items nor groups
    // (`itemKeywords: []` in the schema). Both parseZagItem and parseZagGroup
    // were removed as dead code.

    // Check for slot definition: SlotName: or SlotName, props: or SlotName with indented children
    // Slots can have inline properties before the colon (e.g., "Trigger, hor, spread:")
    if (U.check(ctx, 'IDENTIFIER')) {
      const slotName = U.current(ctx).value

      // Verify this is a valid slot for this Zag component
      if (isZagSlot(zagNode.name, slotName)) {
        // Check for colon on line OR just slot name followed by NEWLINE+INDENT (children follow)
        const hasColon = callbacks.hasColonOnLine()
        const hasIndentedChildren = U.checkNext(ctx, 'NEWLINE') || U.checkNext(ctx, 'INDENT')

        if (hasColon || hasIndentedChildren) {
          U.advance(ctx) // slot name
          // Parse inline properties until we hit the colon or newline
          const properties: Property[] = []
          while (
            !U.check(ctx, 'COLON') &&
            !U.check(ctx, 'NEWLINE') &&
            !U.check(ctx, 'INDENT') &&
            !U.isAtEnd(ctx)
          ) {
            if (U.check(ctx, 'COMMA')) {
              U.advance(ctx)
              continue
            }
            if (U.check(ctx, 'IDENTIFIER')) {
              const prop = callbacks.parseProperty()
              if (prop) properties.push(prop)
            } else {
              U.advance(ctx)
            }
          }
          if (U.check(ctx, 'COLON')) {
            U.advance(ctx) // consume colon
          }
          const slot = parseZagSlot(ctx, zagNode.name, slotName, callbacks, zagNode)
          // Merge parsed properties into slot
          slot.properties = [...properties, ...slot.properties]
          zagNode.slots[slotName] = slot
          continue
        }
      }
    }

    // Check for Zag properties (placeholder, defaultValue, disabled, etc.)
    const zagPrimitive = getZagPrimitive(zagNode.name)
    const validProps = new Set(zagPrimitive?.props ?? [])
    if (U.check(ctx, 'IDENTIFIER') && validProps.has(U.current(ctx).value)) {
      const propName = U.current(ctx).value
      const token = U.advance(ctx)

      // Boolean property (no value following)
      if (U.check(ctx, 'NEWLINE') || U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) {
        zagNode.properties.push({
          type: 'Property',
          name: propName,
          values: [true],
          line: token.line,
          column: token.column,
        })
        continue
      }

      // Property with value(s)
      const values: PropertyValue[] = []
      while (!U.check(ctx, 'NEWLINE') && !U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
        if (U.check(ctx, 'STRING')) {
          values.push(U.advance(ctx).value)
        } else if (U.check(ctx, 'NUMBER')) {
          values.push(parseFloat(U.advance(ctx).value))
        } else if (U.check(ctx, 'COMMA')) {
          U.advance(ctx)
        } else if (U.check(ctx, 'IDENTIFIER') && validProps.has(U.current(ctx).value)) {
          break // Next property
        } else {
          values.push(U.advance(ctx).value)
        }
      }

      if (values.length > 0) {
        zagNode.properties.push({
          type: 'Property',
          name: propName,
          values: values as Property['values'],
          line: token.line,
          column: token.column,
        })
      } else {
        // Boolean if no values parsed
        zagNode.properties.push({
          type: 'Property',
          name: propName,
          values: [true],
          line: token.line,
          column: token.column,
        })
      }
      continue
    }

    // Item/Group keywords removed (see parseZagComponentBody comment above).

    // Check for events (onclick, onchange, etc.)
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value.startsWith('on')) {
      const event = callbacks.parseEvent()
      if (event) zagNode.events.push(event)
      continue
    }

    // Skip unknown tokens
    U.advance(ctx)
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)
}

/**
 * Parse a Zag slot definition
 *
 * Syntax:
 *   Trigger:
 *     pad 12, bg #1e1e2e
 *     hover:
 *       bg #2a2a3e
 */
function parseZagSlot(
  ctx: ParserContext,
  componentName: string,
  slotName: string,
  callbacks: ZagParserCallbacks,
  parentZagNode?: ZagNode
): ZagSlotDef {
  const prev = callbacks.previous()
  const startLine = prev?.line ?? 1
  const startColumn = prev?.column ?? 1

  const slot: ZagSlotDef = {
    name: slotName,
    properties: [],
    states: [],
    children: [],
    sourcePosition: {
      line: startLine,
      column: startColumn,
      endLine: startLine,
      endColumn: startColumn,
    },
  }

  // Check if what follows the colon is a primitive element (Button, Text, Frame, etc.)
  // In this case, parse it as a child instance, not as properties
  // Example: Trigger: Button "Toggle" -> Button is a child, not a property
  if (U.check(ctx, 'IDENTIFIER') && isPrimitive(U.current(ctx).value)) {
    const nameToken = U.advance(ctx)
    const child = callbacks.parseInstance(nameToken)
    if (child.type !== 'ZagComponent') {
      slot.children.push(child as Instance | Slot)
    }
  } else {
    // Parse inline properties after colon
    callbacks.parseInlineProperties(slot.properties)
  }

  // Skip newline before checking for indented body
  callbacks.skipNewlines()

  // Parse indented body (properties, states, children)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    parseZagSlotBody(ctx, slot, callbacks, componentName, parentZagNode)
  }

  return slot
}

/**
 * Parse the body of a Zag slot
 */
function parseZagSlotBody(
  ctx: ParserContext,
  slot: ZagSlotDef,
  callbacks: ZagParserCallbacks,
  componentName?: string,
  parentZagNode?: ZagNode
): void {
  for (let iter = 0; !U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && iter < MAX_ITERATIONS; iter++) {
    callbacks.skipNewlines()
    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // State block: hover: or selected:
    if (U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'COLON')) {
      const stateName = U.current(ctx).value
      // Check if this looks like a state (from schema)
      if (STATE_NAMES.has(stateName)) {
        const stateToken = U.advance(ctx)
        U.advance(ctx) // colon

        const state: State = {
          type: 'State',
          name: stateToken.value,
          properties: [],
          childOverrides: [],
          line: stateToken.line,
          column: stateToken.column,
        }

        // Parse inline properties
        callbacks.parseInlineProperties(state.properties)

        // Parse block properties
        callbacks.skipNewlines()
        if (U.check(ctx, 'INDENT')) {
          U.advance(ctx)
          while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
            callbacks.skipNewlines()
            if (U.check(ctx, 'DEDENT')) break

            const properties: Property[] = []
            callbacks.parseInlineProperties(properties)
            state.properties.push(...properties)
          }
          if (U.check(ctx, 'DEDENT')) U.advance(ctx)
        }

        slot.states.push(state)
        continue
      }
    }

    // Property line
    if (U.check(ctx, 'IDENTIFIER') && PROPERTY_STARTERS.has(U.current(ctx).value)) {
      const properties: Property[] = []
      callbacks.parseInlineProperties(properties)
      slot.properties.push(...properties)
      continue
    }

    // Item/Group child handling removed — DatePicker has neither (see top).

    // Child instance
    if (U.check(ctx, 'IDENTIFIER')) {
      const name = U.advance(ctx)
      const child = callbacks.parseInstance(name)
      if (child.type !== 'ZagComponent') {
        slot.children.push(child as Instance | Slot)
      }
      continue
    }

    U.advance(ctx)
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)
}
