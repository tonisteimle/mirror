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
  ZagItem,
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
import { ParserUtils, MAX_ITERATIONS, MAX_LOOKAHEAD } from './parser-context'
import {
  getZagPrimitive,
  isZagSlot,
  isZagItemKeyword,
  isZagGroupKeyword,
} from '../schema/zag-primitives'
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

  // Extract initial state from properties (same logic as for regular instances)
  const initialStateIndex = zagNode.properties.findIndex(p => {
    const name = p.name
    return (
      p.values.length === 0 &&
      name[0] === name[0].toLowerCase() &&
      !PROPERTY_STARTERS.has(name) &&
      !ALL_BOOLEAN_PROPERTIES.has(name) &&
      !EVENT_NAMES.has(name) &&
      !STATE_MODIFIERS.has(name) &&
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

      // Boolean Zag properties (e.g., multiple, searchable, clearable, disabled)
      if (
        validProps.has(propName) &&
        !U.checkNext(ctx, 'STRING') &&
        !U.checkNext(ctx, 'NUMBER') &&
        !U.checkNext(ctx, 'LBRACKET')
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

    // IMPORTANT: Check for Item BEFORE slots, because "Item" can be both a slot and an item keyword
    // Item definitions are distinguished by having: Item "Label" or Item value "x" or Item name "field"
    // Slot definitions look like: Item: (just keyword + colon)
    if (U.check(ctx, 'IDENTIFIER') && isZagItemKeyword(zagNode.name, U.current(ctx).value)) {
      // Check if this looks like an item definition
      const nextToken = ctx.tokens[ctx.pos + 1]
      // Get valid item properties from the primitive definition
      const zagDef = getZagPrimitive(zagNode.name)
      const validItemProps = new Set(zagDef?.itemProps || ['value', 'label'])

      const isItemDefinition =
        nextToken &&
        (nextToken.type === 'STRING' ||
          (nextToken.type === 'IDENTIFIER' && validItemProps.has(nextToken.value)))

      if (isItemDefinition) {
        const item = parseZagItem(ctx, zagNode.name, callbacks)
        if (item) zagNode.items.push(item)
        continue
      }
    }

    // Check for Group definition: Group "Label" or Group label "Label"
    if (U.check(ctx, 'IDENTIFIER') && isZagGroupKeyword(zagNode.name, U.current(ctx).value)) {
      const group = parseZagGroup(ctx, zagNode.name, callbacks)
      if (group) zagNode.items.push(group)
      continue
    }

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

    // Check for Item definition: Item/Tab/Step "Label" or Item value "val" label "Label"
    if (U.check(ctx, 'IDENTIFIER') && isZagItemKeyword(zagNode.name, U.current(ctx).value)) {
      const item = parseZagItem(ctx, zagNode.name, callbacks)
      if (item) zagNode.items.push(item)
      continue
    }

    // Check for Group definition: Group "Label" or Group label "Label"
    if (U.check(ctx, 'IDENTIFIER') && isZagGroupKeyword(zagNode.name, U.current(ctx).value)) {
      const group = parseZagGroup(ctx, zagNode.name, callbacks)
      if (group) zagNode.items.push(group)
      continue
    }

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

    // Check for Item children - add to parent ZagNode's items
    if (
      U.check(ctx, 'IDENTIFIER') &&
      componentName &&
      parentZagNode &&
      isZagItemKeyword(componentName, U.current(ctx).value)
    ) {
      const item = parseZagItem(ctx, componentName, callbacks)
      if (item) parentZagNode.items.push(item)
      continue
    }

    // Check for Group children - add to parent ZagNode's items
    if (
      U.check(ctx, 'IDENTIFIER') &&
      componentName &&
      parentZagNode &&
      isZagGroupKeyword(componentName, U.current(ctx).value)
    ) {
      const group = parseZagGroup(ctx, componentName, callbacks)
      if (group) parentZagNode.items.push(group)
      continue
    }

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

/**
 * Parse a Zag Item (Item, Tab, Step, Slide, etc.)
 *
 * Syntax:
 *   Item "Option A"
 *   Tab "Home"
 *     Text "Welcome content"
 *   Step "Account" target "#signup-form"
 *   Item value "opt-a" label "Option A" disabled
 */
function parseZagItem(
  ctx: ParserContext,
  componentName: string,
  callbacks: ZagParserCallbacks
): ZagItem | null {
  const itemToken = U.advance(ctx) // 'Item'
  const startLine = itemToken.line
  const startColumn = itemToken.column

  const item: ZagItem = {
    sourcePosition: {
      line: startLine,
      column: startColumn,
      endLine: startLine,
      endColumn: startColumn,
    },
  }

  // Layout properties that can be on items
  const layoutProps = [
    'ver',
    'hor',
    'vertical',
    'horizontal',
    'gap',
    'pad',
    'spread',
    'center',
    'g',
    'p',
  ]

  // Parse item content
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

    // String as label (shorthand)
    // Note: value is NOT auto-derived from label here - that happens in IR transformation
    // This ensures loadFromFile is only set when value is explicitly provided
    if (U.check(ctx, 'STRING') && !item.label) {
      const str = U.advance(ctx)
      item.label = str.value
      continue
    }

    // Explicit value: value "val"
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'value') {
      U.advance(ctx)
      if (U.check(ctx, 'STRING')) {
        item.value = U.advance(ctx).value
      }
      continue
    }

    // Explicit label: label "Label"
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'label') {
      U.advance(ctx)
      if (U.check(ctx, 'STRING')) {
        item.label = U.advance(ctx).value
      }
      continue
    }

    // disabled flag
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'disabled') {
      U.advance(ctx)
      item.disabled = true
      continue
    }

    // target property (for Tour steps): target "#element"
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'target') {
      U.advance(ctx)
      if (U.check(ctx, 'STRING')) {
        item.target = U.advance(ctx).value
      }
      continue
    }

    // icon property: icon "star"
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'icon') {
      U.advance(ctx)
      if (U.check(ctx, 'STRING')) {
        item.icon = U.advance(ctx).value
      }
      continue
    }

    // badge property (SideNav): badge "5"
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'badge') {
      U.advance(ctx)
      if (U.check(ctx, 'STRING')) {
        item.badge = U.advance(ctx).value
      }
      continue
    }

    // arrow flag (SideNav): arrow
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'arrow') {
      U.advance(ctx)
      item.arrow = true
      continue
    }

    // show syntax: show ViewName [from FileName]
    // - show Settings → local element or Settings.mirror
    // - show Settings from Content → Settings element from Content.mirror
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'show') {
      U.advance(ctx) // consume 'show'
      if (U.check(ctx, 'IDENTIFIER')) {
        item.shows = U.advance(ctx).value
        // Check for "from FileName"
        if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'from') {
          U.advance(ctx) // consume 'from'
          if (U.check(ctx, 'IDENTIFIER')) {
            item.showsFrom = U.advance(ctx).value
          }
        }
      }
      continue
    }

    // Legacy: shows property (SideNav): shows ViewName
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'shows') {
      U.advance(ctx)
      if (U.check(ctx, 'IDENTIFIER')) {
        item.shows = U.advance(ctx).value
      }
      continue
    }

    // navigate(ViewName) function call syntax - convert to shows property
    // This allows: NavItem "Dashboard", navigate(DashboardView)
    if (
      U.check(ctx, 'IDENTIFIER') &&
      U.current(ctx).value === 'navigate' &&
      U.checkNext(ctx, 'LPAREN')
    ) {
      U.advance(ctx) // consume 'navigate'
      U.advance(ctx) // consume '('
      if (U.check(ctx, 'IDENTIFIER')) {
        item.shows = U.advance(ctx).value
      }
      if (U.check(ctx, 'RPAREN')) {
        U.advance(ctx) // consume ')'
      }
      continue
    }

    // Layout properties (ver, hor, gap, pad, spread, etc.)
    if (U.check(ctx, 'IDENTIFIER') && layoutProps.includes(U.current(ctx).value)) {
      // Initialize properties array if needed
      if (!item.properties) item.properties = []
      const propToken = U.current(ctx)
      const propName = U.advance(ctx).value
      // Check for value(s)
      const values: (string | number | boolean)[] = []
      while (U.check(ctx, 'NUMBER') || U.check(ctx, 'STRING')) {
        const valToken = U.advance(ctx)
        values.push(valToken.type === 'NUMBER' ? Number(valToken.value) : valToken.value)
      }
      // If no values, treat as boolean flag (e.g., "ver" = true)
      if (values.length === 0) values.push(true)
      item.properties.push({
        type: 'Property',
        name: propName,
        values,
        line: propToken.line,
        column: propToken.column,
      })
      continue
    }

    // Dynamic item properties from primitive definition (name, placeholder, multiline, etc.)
    const zagDef = getZagPrimitive(componentName)
    const validItemProps = new Set(zagDef?.itemProps || [])
    if (U.check(ctx, 'IDENTIFIER') && validItemProps.has(U.current(ctx).value)) {
      const propToken = U.current(ctx)
      const propName = U.advance(ctx).value

      // Check for value - can be STRING, NUMBER, or boolean (no value)
      // Use type assertion for dynamic property assignment on ZagItem
      const itemRecord = item as unknown as Record<string, unknown>
      if (U.check(ctx, 'STRING')) {
        const value = U.advance(ctx).value
        // Set directly on item for these well-known properties
        itemRecord[propName] = value
      } else if (U.check(ctx, 'NUMBER')) {
        const value = Number(U.advance(ctx).value)
        itemRecord[propName] = value
      } else {
        // Boolean flag (e.g., "multiline", "required")
        itemRecord[propName] = true
      }
      continue
    }

    // Unknown, stop parsing properties
    break
  }

  // Check for colon (indicates inline or indented children)
  if (U.check(ctx, 'COLON')) {
    U.advance(ctx)
    item.children = []

    // Parse inline children on same line
    // Children are separated by commas followed by capitalized component names
    // e.g., "Box w 8, h 8, bg #fff, Text "label"" - commas between props don't separate children
    while (
      !U.check(ctx, 'NEWLINE') &&
      !U.check(ctx, 'INDENT') &&
      !U.check(ctx, 'DEDENT') &&
      !U.isAtEnd(ctx)
    ) {
      // Skip leading commas
      if (U.check(ctx, 'COMMA')) {
        U.advance(ctx)
        continue
      }

      // Check if this looks like a component (capitalized identifier)
      if (U.check(ctx, 'IDENTIFIER')) {
        const name = U.current(ctx).value
        const isComponent = name.charAt(0) === name.charAt(0).toUpperCase()

        if (isComponent) {
          const childName = U.advance(ctx)

          // Create child instance
          const child: Instance = {
            type: 'Instance',
            component: childName.value,
            name: null,
            properties: [],
            children: [],
            line: childName.line,
            column: childName.column,
          }

          // Parse child's properties until we hit a comma followed by another component
          while (
            !U.check(ctx, 'NEWLINE') &&
            !U.check(ctx, 'INDENT') &&
            !U.check(ctx, 'DEDENT') &&
            !U.isAtEnd(ctx)
          ) {
            // Check for comma - if followed by capitalized identifier, it's a new child
            if (U.check(ctx, 'COMMA')) {
              const nextToken = ctx.tokens[ctx.pos + 1]
              if (nextToken && nextToken.type === 'IDENTIFIER') {
                const nextName = nextToken.value
                const isNextComponent = nextName.charAt(0) === nextName.charAt(0).toUpperCase()
                if (isNextComponent) {
                  // This comma separates children - break to outer loop
                  break
                }
              }
              // Comma between properties - skip it and continue
              U.advance(ctx)
              continue
            }

            // String content
            if (U.check(ctx, 'STRING')) {
              const str = U.advance(ctx)
              child.properties.push({
                type: 'Property',
                name: 'content',
                values: [str.value],
                line: str.line,
                column: str.column,
              })
              continue
            }

            // Property (lowercase identifier)
            if (U.check(ctx, 'IDENTIFIER')) {
              const prop = callbacks.parseProperty()
              if (prop) child.properties.push(prop)
              continue
            }

            break
          }

          item.children.push(child)
        } else {
          // Lowercase - not a component, stop parsing
          break
        }
      } else {
        break
      }
    }
  }

  // Skip newline
  callbacks.skipNewlines()

  // Check for indented children (custom item content)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx)
    if (!item.children) item.children = []
    for (
      let iter = 0;
      !U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && iter < MAX_ITERATIONS;
      iter++
    ) {
      callbacks.skipNewlines()
      if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

      if (U.check(ctx, 'IDENTIFIER')) {
        const name = U.advance(ctx)
        const child = callbacks.parseInstance(name)
        if (child.type !== 'ZagComponent') {
          item.children.push(child as Instance)
        }
      } else {
        U.advance(ctx)
      }
    }
    if (U.check(ctx, 'DEDENT')) U.advance(ctx)
  }

  // Update end position
  const prevToken = callbacks.previous()
  if (prevToken) {
    item.sourcePosition.endLine = prevToken.line
    item.sourcePosition.endColumn = prevToken.column
  }

  return item
}

/**
 * Parse a Zag Group (container for related items)
 *
 * Syntax:
 *   Group "Fruits"
 *     Item "Apple"
 *     Item "Banana"
 *   Group label "Vegetables"
 *     Item "Carrot"
 *     Item "Tomato"
 */
function parseZagGroup(
  ctx: ParserContext,
  componentName: string,
  callbacks: ZagParserCallbacks
): ZagItem | null {
  const groupToken = U.advance(ctx) // 'Group'
  const startLine = groupToken.line
  const startColumn = groupToken.column

  const group: ZagItem = {
    isGroup: true,
    items: [],
    sourcePosition: {
      line: startLine,
      column: startColumn,
      endLine: startLine,
      endColumn: startColumn,
    },
  }

  // Parse group properties (label)
  while (
    !U.check(ctx, 'NEWLINE') &&
    !U.check(ctx, 'INDENT') &&
    !U.check(ctx, 'DEDENT') &&
    !U.isAtEnd(ctx)
  ) {
    // Skip commas
    if (U.check(ctx, 'COMMA') || U.check(ctx, 'SEMICOLON')) {
      U.advance(ctx)
      continue
    }

    // String as label (shorthand): Group "Fruits"
    if (U.check(ctx, 'STRING') && !group.label) {
      const str = U.advance(ctx)
      group.label = str.value
      continue
    }

    // Explicit label: label "Fruits"
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'label') {
      U.advance(ctx)
      if (U.check(ctx, 'STRING')) {
        group.label = U.advance(ctx).value
      }
      continue
    }

    // collapsible flag (SideNav groups)
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'collapsible') {
      U.advance(ctx)
      group.collapsible = true
      continue
    }

    // defaultOpen flag (SideNav groups)
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'defaultOpen') {
      U.advance(ctx)
      group.defaultOpen = true
      continue
    }

    break
  }

  // Consume newline
  if (U.check(ctx, 'NEWLINE')) U.advance(ctx)

  // Parse indented children (Items)
  if (U.check(ctx, 'INDENT')) {
    U.advance(ctx) // consume INDENT

    for (
      let iter = 0;
      !U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && iter < MAX_ITERATIONS;
      iter++
    ) {
      callbacks.skipNewlines()
      if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

      // Check for Item
      if (U.check(ctx, 'IDENTIFIER') && isZagItemKeyword(componentName, U.current(ctx).value)) {
        const item = parseZagItem(ctx, componentName, callbacks)
        if (item) group.items!.push(item)
        continue
      }

      // Skip unknown tokens
      U.advance(ctx)
    }

    if (U.check(ctx, 'DEDENT')) U.advance(ctx)
  }

  // Update end position
  const prevToken = callbacks.previous()
  if (prevToken) {
    group.sourcePosition.endLine = prevToken.line
    group.sourcePosition.endColumn = prevToken.column
  }

  return group
}
