/**
 * Body Parser
 *
 * Parses the indented body of an instance declaration. The body holds the
 * full set of constructs an instance can contain:
 *
 *   - Visibility conditions (`if (state)` with optional indented children)
 *   - `each` loops
 *   - `selection`, `bind`, `route` clauses
 *   - `keys` blocks (consumed but not stored — components own keyboard maps)
 *   - Event blocks / inline events (`onclick:` / `onclick action`)
 *   - Boolean properties, property lines, $token property-set references
 *   - State blocks (system / custom / external `Element.state:`)
 *   - Initial state (lowercase identifier without colon)
 *   - Chart slots (`XAxis:` etc., only on chart primitives)
 *   - Child instances and Zag components
 *
 * Extracted from parser.ts (Phase 5 — seventh incremental cut, 7a). The
 * extraction follows the established callback pattern (see zag-parser /
 * inline-property-parser): the wrapper in parser.ts builds a
 * `ParserContext`, defines callbacks that sync `this.pos` ↔ `ctx.pos` for
 * each cross-call into the main parser, and the extracted function uses
 * `ParserUtils` for low-level token operations.
 */

import type { Token } from './lexer'
import type {
  Instance,
  Slot,
  Each,
  Event,
  Expression,
  State,
  StateAnimation,
  StateDependency,
  ChildOverride,
  ZagNode,
  ChartSlotNode,
  ComponentDefinition,
  Property,
} from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { MAX_ITERATIONS } from './ops/limits'
import {
  PROPERTY_STARTERS,
  ALL_BOOLEAN_PROPERTIES,
  KEYBOARD_KEYS,
  STATE_MODIFIERS,
  SYSTEM_STATES,
  EVENT_NAMES,
  ANIMATION_PRESETS,
  EASING_FUNCTIONS,
  parseDuration,
} from '../schema/parser-helpers'
import { isPrimitive } from '../schema/dsl'
import { isChartSlot, isChartPrimitive } from '../schema/chart-primitives'
import { isStateBlockStart } from './state-detector'

/** True when the first character is uppercase A-Z. */
function isUppercase(str: string): boolean {
  if (!str || str.length === 0) return false
  const firstChar = str.charAt(0)
  return firstChar >= 'A' && firstChar <= 'Z'
}

const U = ParserUtils

interface StateBlockHeader {
  modifier?: 'exclusive' | 'toggle' | 'initial'
  trigger?: string
  animation?: StateAnimation
  when?: StateDependency
}

/**
 * Parse the part of a state block between the state-name token and the body:
 * `[modifier] [when <expr>] [trigger [key]] [duration [easing]] : [preset]`.
 *
 * Shared by `parseInstanceBody` and `parseComponentBody`. Component bodies
 * don't support the `when` clause, so they pass no `parseWhenClause` callback.
 * Instance bodies may pre-set `when` (for `Element.state:` external refs);
 * pass it via `initialWhen` so it survives the header parse unchanged.
 */
function parseStateBlockHeader(
  ctx: ParserContext,
  parseWhenClause?: () => StateDependency,
  initialWhen?: StateDependency
): StateBlockHeader {
  let when = initialWhen
  let modifier: 'exclusive' | 'toggle' | 'initial' | undefined
  let trigger: string | undefined
  let animation: StateAnimation | undefined

  // Modifier (exclusive, toggle, initial)
  if (U.check(ctx, 'IDENTIFIER') && STATE_MODIFIERS.has(U.current(ctx).value)) {
    modifier = U.advance(ctx).value as 'exclusive' | 'toggle' | 'initial'
  }

  // 'when' dependency — only for instance bodies
  if (parseWhenClause && U.check(ctx, 'IDENTIFIER') && U.current(ctx).value === 'when') {
    U.advance(ctx) // consume 'when'
    when = parseWhenClause()
  }

  // Trigger (event name, optionally with a key for onkeydown/onkeyup)
  if (U.check(ctx, 'IDENTIFIER') && EVENT_NAMES.has(U.current(ctx).value)) {
    const eventToken = U.advance(ctx)
    trigger = eventToken.value
    if ((trigger === 'onkeydown' || trigger === 'onkeyup') && U.check(ctx, 'IDENTIFIER')) {
      const keyToken = U.current(ctx)
      if (KEYBOARD_KEYS.has(keyToken.value)) {
        trigger += ' ' + U.advance(ctx).value
      }
    }
  }

  // Animation duration (e.g. 0.2s) and optional easing
  if (U.check(ctx, 'NUMBER')) {
    const numToken = U.current(ctx)
    const duration = parseDuration(numToken.value)
    if (duration !== undefined) {
      U.advance(ctx)
      animation = { duration }
      if (U.check(ctx, 'IDENTIFIER') && EASING_FUNCTIONS.has(U.current(ctx).value)) {
        animation.easing = U.advance(ctx).value
      }
    }
  }

  U.advance(ctx) // consume colon

  // Animation preset on the same line after the colon (e.g. `selected onclick: bounce`)
  if (U.check(ctx, 'IDENTIFIER') && !U.check(ctx, 'NEWLINE') && !U.check(ctx, 'INDENT')) {
    const presetToken = U.current(ctx)
    if (ANIMATION_PRESETS.has(presetToken.value)) {
      const preset = U.advance(ctx).value
      if (!animation) {
        animation = { preset }
      } else {
        animation.preset = preset
      }
    }
  }

  return { modifier, trigger, animation, when }
}

/**
 * Callbacks back to the main parser for methods not yet extracted.
 * Each callback wrapper in parser.ts must keep `this.pos` in sync with
 * `ctx.pos` before delegating, and pull the result back after.
 */
export interface InstanceBodyCallbacks {
  parseExpression(): Expression
  parseInstance(name: Token): Instance | Slot | ZagNode
  parseEach(): Each | null
  parseSelectionVar(): string | null
  parseBindPath(): string | null
  parseRouteClause(): string | null
  parseEvent(): Event | null
  parseInlineProperties(
    properties: Instance['properties'],
    events?: Event[],
    options?: { stopAtSemicolon?: boolean }
  ): void
  parseWhenClause(): StateDependency
  parseStateChildOverride(): ChildOverride | null
  parseStateChildInstance(): Instance | null
  parseChartSlot(slotToken: Token): ChartSlotNode | null
  createTextChild(token: Token): Instance
}

/* ------------------------------------------------------------------ entry */

export function parseInstanceBody(
  ctx: ParserContext,
  instance: Instance,
  callbacks: InstanceBodyCallbacks
): void {
  // Boolean properties that can appear in instance body
  // Using module-level constant (derived from schema via parser-helpers.ts)
  const booleanProperties = ALL_BOOLEAN_PROPERTIES

  while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
    U.skipNewlines(ctx)

    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // Visibility condition: if (state) with or without children
    if (U.check(ctx, 'IF')) {
      U.advance(ctx) // consume IF
      const condition = callbacks.parseExpression()
      U.skipNewlines(ctx)

      // Extract state name from condition like "(open)" → "open"
      const match = condition.match(/^\(?\s*(\w+)\s*\)?$/)
      const visibleWhen = match ? match[1] : condition

      // If NOT followed by INDENT, it's a visibility condition for current instance
      if (!U.check(ctx, 'INDENT')) {
        instance.visibleWhen = visibleWhen
        continue
      }

      // Has children - parse them and set visibleWhen on each
      U.advance(ctx) // consume INDENT
      for (
        let iter = 0;
        !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS;
        iter++
      ) {
        U.skipNewlines(ctx)
        if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

        // Child instance (including Zag components)
        if (U.check(ctx, 'IDENTIFIER')) {
          const name = U.advance(ctx)
          const child = callbacks.parseInstance(name)
          if (child.type === 'Instance') {
            child.visibleWhen = visibleWhen
          }
          if (!instance.children) instance.children = []
          if (child.type === 'Instance' || child.type === 'Slot') {
            instance.children.push(child)
          } else if (child.type === 'ZagComponent') {
            instance.children.push(child as ZagNode)
          }
          continue
        }

        U.advance(ctx)
      }
      if (U.check(ctx, 'DEDENT')) U.advance(ctx)

      // Check for optional 'else' block - set visibleWhen to negated condition
      U.skipNewlines(ctx)
      if (U.check(ctx, 'ELSE')) {
        U.advance(ctx) // consume ELSE
        U.skipNewlines(ctx)
        const negatedCondition = '!(' + visibleWhen + ')'
        if (U.check(ctx, 'INDENT')) {
          U.advance(ctx) // consume INDENT
          for (
            let iter = 0;
            !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS;
            iter++
          ) {
            U.skipNewlines(ctx)
            if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

            // Child instance in else block
            if (U.check(ctx, 'IDENTIFIER')) {
              const name = U.advance(ctx)
              const child = callbacks.parseInstance(name)
              if (child.type === 'Instance') {
                child.visibleWhen = negatedCondition
              }
              if (!instance.children) instance.children = []
              if (child.type === 'Instance' || child.type === 'Slot') {
                instance.children.push(child)
              } else if (child.type === 'ZagComponent') {
                instance.children.push(child as ZagNode)
              }
              continue
            }

            U.advance(ctx)
          }
          if (U.check(ctx, 'DEDENT')) U.advance(ctx)
        }
      }
      continue
    }

    // Each loop: each item in collection
    // Note: Each is treated as a special child type (not standard Instance.children)
    if (U.check(ctx, 'EACH')) {
      const each = callbacks.parseEach()
      if (each) {
        if (!instance.children) instance.children = []
        // Each loops are handled specially in IR transformation
        instance.children.push(each as unknown as Instance)
      }
      continue
    }

    // Selection binding: selection $variable
    if (U.check(ctx, 'SELECTION')) {
      const varName = callbacks.parseSelectionVar()
      if (varName !== null) instance.selection = varName
      continue
    }

    // Bind: bind varName (or dot-path: bind user.email)
    if (U.check(ctx, 'BIND')) {
      const path = callbacks.parseBindPath()
      if (path !== null) instance.bind = path
      continue
    }

    // Route: route TargetComponent or route path/to/page
    if (U.check(ctx, 'ROUTE')) {
      const routePath = callbacks.parseRouteClause()
      if (routePath) instance.route = routePath
      continue
    }

    // Keys block
    if (U.check(ctx, 'KEYS')) {
      // Note: Instances skip keys blocks - keyboard events are defined in component definitions
      // This is intentional: instances inherit behavior from their components
      U.advance(ctx)
      U.skipNewlines(ctx)
      if (U.check(ctx, 'INDENT')) {
        U.advance(ctx)
        while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
          U.skipNewlines(ctx)
          if (U.check(ctx, 'DEDENT')) break
          U.advance(ctx)
        }
        if (U.check(ctx, 'DEDENT')) U.advance(ctx)
      }
      continue
    }

    // Check for identifier-based parsing
    if (U.check(ctx, 'IDENTIFIER')) {
      const name = U.current(ctx).value

      // Event block: onclick: or inline event: onclick action
      // Must check BEFORE state block handling
      if (EVENT_NAMES.has(name)) {
        if (!instance.events) instance.events = []
        const event = callbacks.parseEvent()
        if (event) instance.events.push(event)
        continue
      }

      // Boolean property (focusable, etc.)
      // Skip if it looks like a state block (visible when X open:)
      if (booleanProperties.has(name) && !isStateBlockStart(ctx)) {
        const token = U.advance(ctx)
        instance.properties.push({
          type: 'Property',
          name: token.value,
          values: [true],
          line: token.line,
          column: token.column,
        })
        continue
      }

      // Property line (lowercase identifier that is a known property)
      if (PROPERTY_STARTERS.has(name)) {
        callbacks.parseInlineProperties(instance.properties)
        continue
      }

      // State block: hover: or selected: or selected onclick: or visible when Menu open:
      // Also handles external state reference: MenuBtn.open:
      // Allow ANY identifier as state name if followed by state block pattern (when, modifier, trigger)
      if (isStateBlockStart(ctx)) {
        const stateToken = U.advance(ctx)

        // Check for external state reference: ElementName.state:
        // Pattern: we already consumed ElementName, now check for DOT IDENTIFIER COLON
        let externalStateName: string | undefined
        let externalWhen: StateDependency | undefined
        if (U.check(ctx, 'DOT')) {
          U.advance(ctx) // consume DOT
          if (U.check(ctx, 'IDENTIFIER')) {
            const externalState = U.advance(ctx).value
            // Create a 'when' dependency pointing to the external element's state
            externalWhen = {
              target: stateToken.value, // The element name (e.g., MenuBtn)
              state: externalState, // The state name (e.g., open)
            }
            // Use a synthetic state name for this block (e.g., "_MenuBtn_open")
            externalStateName = `_${stateToken.value}_${externalState}`
          }
        }

        const { modifier, trigger, animation, when } = parseStateBlockHeader(
          ctx,
          callbacks.parseWhenClause,
          externalWhen
        )

        const state: State = {
          type: 'State',
          name: externalStateName || stateToken.value,
          modifier,
          trigger,
          when,
          animation,
          properties: [],
          childOverrides: [],
          line: stateToken.line,
          column: stateToken.column,
        }

        // Parse inline state properties
        callbacks.parseInlineProperties(state.properties, instance.events)

        // Parse block properties (indented)
        U.skipNewlines(ctx)
        if (U.check(ctx, 'INDENT')) {
          U.advance(ctx)
          let stateBodyIter = 0
          while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && stateBodyIter < MAX_ITERATIONS) {
            stateBodyIter++
            const iterStartPos = ctx.pos
            U.skipNewlines(ctx)
            if (U.check(ctx, 'DEDENT')) break

            // Parse properties on each line
            if (U.check(ctx, 'IDENTIFIER')) {
              const propName = U.current(ctx).value

              // Check for enter:/exit: animation pseudo-properties
              if ((propName === 'enter' || propName === 'exit') && U.checkNext(ctx, 'COLON')) {
                const animType = U.advance(ctx).value as 'enter' | 'exit'
                U.advance(ctx) // consume colon

                // Parse animation value: preset, duration, easing
                const anim: StateAnimation = {}

                // Check for preset (e.g., slide-in, fade-out)
                if (U.check(ctx, 'IDENTIFIER')) {
                  const token = U.current(ctx)
                  if (ANIMATION_PRESETS.has(token.value)) {
                    anim.preset = U.advance(ctx).value
                  }
                }

                // Check for duration (e.g., 0.2s)
                if (U.check(ctx, 'NUMBER')) {
                  const duration = parseDuration(U.current(ctx).value)
                  if (duration !== undefined) {
                    U.advance(ctx)
                    anim.duration = duration
                  }
                }

                // Check for easing (e.g., ease-out)
                if (U.check(ctx, 'IDENTIFIER')) {
                  const token = U.current(ctx)
                  if (EASING_FUNCTIONS.has(token.value)) {
                    anim.easing = U.advance(ctx).value
                  }
                }

                state[animType] = anim
                continue
              }

              // Check for child overrides or children (capitalized names)
              if (propName[0] === propName[0].toUpperCase()) {
                // New child: IDENTIFIER followed by STRING (e.g., Text "hello", Icon "check")
                // ChildOverride: IDENTIFIER followed by COLON or properties (e.g., Value:, Value col #fff)
                if (U.checkNext(ctx, 'STRING')) {
                  // This is a new child instance with content
                  const child = callbacks.parseStateChildInstance()
                  if (child) {
                    if (!state.children) state.children = []
                    state.children.push(child)
                  }
                } else {
                  // This is a childOverride (slot or property override)
                  const childOverride = callbacks.parseStateChildOverride()
                  if (childOverride) state.childOverrides.push(childOverride)
                }
              } else {
                // Check if this is a target state reference for 'when' dependencies
                // Syntax: SearchInput.searching:
                //           searching        ← this is the target state
                // But NOT if it's a known property like 'visible', 'hidden', etc.
                if (
                  state.when &&
                  !state.targetState &&
                  propName[0] === propName[0].toLowerCase() &&
                  !ALL_BOOLEAN_PROPERTIES.has(propName) &&
                  (U.checkNext(ctx, 'NEWLINE') || U.checkNext(ctx, 'DEDENT') || U.isAtEnd(ctx))
                ) {
                  // This is a target state reference
                  state.targetState = U.advance(ctx).value
                } else if (isStateBlockStart(ctx)) {
                  // Nested state block (e.g. `hover:` inside `on:`) is not
                  // supported. Skip the header so the body loop makes progress
                  // instead of hanging in parseInlineProperties.
                  U.advance(ctx)
                  if (U.check(ctx, 'COLON')) U.advance(ctx)
                } else {
                  // Regular property
                  callbacks.parseInlineProperties(state.properties)
                }
              }
            } else if (U.check(ctx, 'STRING')) {
              // Handle string content as Text child
              if (!state.children) state.children = []
              state.children.push(callbacks.createTextChild(U.advance(ctx)))
            } else {
              // Skip any other tokens to prevent infinite loops
              U.advance(ctx)
            }

            // Belt-and-suspenders: if no branch advanced the cursor, force-advance
            // so a malformed inner block can't hang the parser forever.
            if (ctx.pos === iterStartPos) U.advance(ctx)
          }
          if (U.check(ctx, 'DEDENT')) U.advance(ctx)
        }

        if (!instance.states) instance.states = []
        instance.states.push(state)
        continue
      }

      // Token reference as property set: $cardstyle applies styles from the token
      // For text content, use quotes: "$firstName" or "Hello $firstName"
      if (name.startsWith('$')) {
        const token = U.advance(ctx)
        instance.properties.push({
          type: 'Property',
          name: 'propset', // Property set reference, expanded in IR
          values: [{ kind: 'token' as const, name: token.value.slice(1) }],
          line: token.line,
          column: token.column,
        })
        continue
      }

      // Initial state: any lowercase identifier that isn't a known keyword
      // This allows setting states defined in components: Button selected, Dialog closed
      // Must be lowercase (PascalCase = child component) and not a known property/event/modifier
      if (
        name[0] === name[0].toLowerCase() &&
        !EVENT_NAMES.has(name) &&
        !booleanProperties.has(name) &&
        !PROPERTY_STARTERS.has(name) &&
        !STATE_MODIFIERS.has(name) &&
        name !== 'when' &&
        name !== 'as'
      ) {
        const token = U.advance(ctx)
        instance.initialState = token.value
        continue
      }

      // Chart slot: XAxis:, YAxis:, Legend:, etc.
      // Only parse if this is a chart primitive and the identifier is a valid chart slot
      const isChartSlotSyntax =
        isChartSlot(name) && U.checkNext(ctx, 'COLON') && isChartPrimitive(instance.component)

      if (isChartSlotSyntax) {
        const slotToken = U.advance(ctx) // consume slot name
        U.advance(ctx) // consume :

        const chartSlot = callbacks.parseChartSlot(slotToken)
        if (chartSlot) {
          if (!instance.chartSlots) instance.chartSlots = {}
          instance.chartSlots[chartSlot.name] = chartSlot
        }
        continue
      }

      // Child instance (including Zag components)
      const child = callbacks.parseInstance(U.advance(ctx))
      if (child.type === 'Instance' || child.type === 'Slot') {
        instance.children.push(child)
      } else if (child.type === 'ZagComponent') {
        instance.children.push(child as ZagNode)
      }
      continue
    }

    U.advance(ctx)
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)
}

/* ============================================================== component */

/**
 * Callbacks back to the main parser for component-body parsing.
 * Each callback wrapper in parser.ts must keep `this.pos` in sync with
 * `ctx.pos` before delegating, and pull the result back after.
 */
export interface ComponentBodyCallbacks {
  parseExpression(): Expression
  parseInstance(name: Token): Instance | Slot | ZagNode
  parseInstanceBody(instance: Instance): void
  parseSelectionVar(): string | null
  parseBindPath(): string | null
  parseRouteClause(): string | null
  parseEvent(): Event | null
  parseProperty(): Property | null
  parseInlineProperties(
    properties: Property[],
    events?: Event[],
    options?: { stopAtSemicolon?: boolean }
  ): void
  parseStateChildOverride(): ChildOverride | null
  parseStateChildInstance(): Instance | null
  parseDataBindingValues(): { collection: string; filter?: Expression } | null
  parseKeysBlock(events: Event[]): void
  parseComponentDefinition(name: Token): ComponentDefinition | null
  parseImplicitOnclick(): Event | null
  isImplicitOnclickCandidate(name: string): boolean
  createTextChild(token: Token): Instance
  peekAt(offset: number): Token | null
}

/* ------------------------------------------------------------------ entry */

export function parseComponentBody(
  ctx: ParserContext,
  component: ComponentDefinition,
  callbacks: ComponentBodyCallbacks
): void {
  while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
    U.skipNewlines(ctx)

    if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

    // Skip commas between properties
    if (U.check(ctx, 'COMMA') || U.check(ctx, 'SEMICOLON')) {
      U.advance(ctx)
      continue
    }

    // Data binding: data Collection where condition
    if (U.check(ctx, 'DATA')) {
      const dataToken = U.advance(ctx)
      const binding = callbacks.parseDataBindingValues()
      if (binding) {
        // Data binding values have special structure (collection + optional filter)
        const values: unknown[] = [binding.collection]
        if (binding.filter) {
          values.push({ filter: binding.filter })
        }
        component.properties.push({
          type: 'Property',
          name: 'data',
          values: values as Property['values'],
          line: dataToken.line,
          column: dataToken.column,
        })
      }
      continue
    }

    // Selection binding: selection $variable
    if (U.check(ctx, 'SELECTION')) {
      const varName = callbacks.parseSelectionVar()
      if (varName !== null) component.selection = varName
      continue
    }

    // Bind: bind varName (or dot-path: bind user.email)
    if (U.check(ctx, 'BIND')) {
      const path = callbacks.parseBindPath()
      if (path !== null) component.bind = path
      continue
    }

    // Route: route TargetComponent or route path/to/page
    if (U.check(ctx, 'ROUTE')) {
      const routePath = callbacks.parseRouteClause()
      if (routePath) component.route = routePath
      continue
    }

    // Note: SYSTEM_STATES is imported from parser-helpers.ts
    // It is derived from the schema (dsl.ts) to ensure consistency.

    // Initial state keywords: closed, open, collapsed, expanded
    // These set the component's initial state when used as standalone properties
    const INITIAL_STATE_KEYWORDS = new Set(['closed', 'open', 'collapsed', 'expanded'])
    if (U.check(ctx, 'IDENTIFIER') && INITIAL_STATE_KEYWORDS.has(U.current(ctx).value)) {
      // Check that this is not followed by a colon (which would make it a state block)
      if (!isStateBlockStart(ctx)) {
        component.initialState = U.advance(ctx).value
        continue
      }
    }

    // Boolean properties (use module-level constant including position booleans)
    const booleanProperties = ALL_BOOLEAN_PROPERTIES

    // State block with trigger: selected onclick: or selected toggle onclick:
    // Use isStateBlockStart() to detect complex state patterns
    if (U.check(ctx, 'IDENTIFIER') && isStateBlockStart(ctx)) {
      const stateToken = U.advance(ctx)
      const { modifier, trigger, animation } = parseStateBlockHeader(ctx)

      const state: State = {
        type: 'State',
        name: stateToken.value,
        modifier,
        trigger,
        animation,
        properties: [],
        childOverrides: [],
        line: stateToken.line,
        column: stateToken.column,
      }

      // Parse inline state properties
      callbacks.parseInlineProperties(state.properties)

      // Parse block properties, children, and child overrides (indented)
      U.skipNewlines(ctx)
      if (U.check(ctx, 'INDENT')) {
        U.advance(ctx)
        let stateBodyIter = 0
        while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && stateBodyIter < MAX_ITERATIONS) {
          stateBodyIter++
          const iterStartPos = ctx.pos
          U.skipNewlines(ctx)
          if (U.check(ctx, 'DEDENT')) break

          // Handle string content as Text child
          if (U.check(ctx, 'STRING')) {
            if (!state.children) state.children = []
            state.children.push(callbacks.createTextChild(U.advance(ctx)))
            continue
          }

          if (U.check(ctx, 'IDENTIFIER')) {
            const propName = U.current(ctx).value

            // Check for child overrides or children (capitalized names)
            if (propName[0] === propName[0].toUpperCase()) {
              // Distinguish between:
              // 1. ChildOverride: Name followed by COLON (Icon: ic white)
              // 2. State child: primitive followed by STRING or properties (Icon "plus", Frame hor)
              // 3. ChildOverride: unknown name (not primitive)
              //
              // Priority: COLON check first - if Name: then always childOverride
              if (U.checkNext(ctx, 'COLON')) {
                // Name followed by COLON is always a childOverride
                const childOverride = callbacks.parseStateChildOverride()
                if (childOverride) state.childOverrides.push(childOverride)
              } else if (isPrimitive(propName)) {
                // Primitive without colon - this is a new state child
                const child = callbacks.parseStateChildInstance()
                if (child) {
                  if (!state.children) state.children = []
                  state.children.push(child)
                }
              } else {
                // Unknown capitalized name without colon - treat as property override
                const childOverride = callbacks.parseStateChildOverride()
                if (childOverride) state.childOverrides.push(childOverride)
              }
            } else if (isStateBlockStart(ctx)) {
              // Nested state block (e.g. `hover:` inside `on:`) is not
              // supported. Skip the header so the body loop makes progress
              // instead of hanging in parseInlineProperties.
              U.advance(ctx)
              if (U.check(ctx, 'COLON')) U.advance(ctx)
            } else {
              callbacks.parseInlineProperties(state.properties)
            }
          } else {
            U.advance(ctx)
          }

          // Belt-and-suspenders: if no branch advanced the cursor, force-advance
          // so a malformed inner block can't hang the parser forever.
          if (ctx.pos === iterStartPos) U.advance(ctx)
        }
        if (U.check(ctx, 'DEDENT')) U.advance(ctx)
      }

      component.states.push(state)
      continue
    }

    if (U.check(ctx, 'IDENTIFIER') && !U.checkNext(ctx, 'COLON') && !U.checkNext(ctx, 'AS')) {
      const name = U.current(ctx).value

      // System state without colon: hover\n  bg #333
      if (SYSTEM_STATES.has(name)) {
        // Check if followed by newline and indent (block state)
        const savedPos = ctx.pos
        const stateToken = U.advance(ctx)
        U.skipNewlines(ctx)

        if (U.check(ctx, 'INDENT')) {
          // It's a state block
          U.advance(ctx) // consume INDENT

          const state: State = {
            type: 'State',
            name: stateToken.value,
            properties: [],
            childOverrides: [],
            line: stateToken.line,
            column: stateToken.column,
          }

          // Parse state properties, child overrides, and state children
          while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
            U.skipNewlines(ctx)
            if (U.check(ctx, 'DEDENT')) break

            // Handle string content as Text child
            if (U.check(ctx, 'STRING')) {
              if (!state.children) state.children = []
              state.children.push(callbacks.createTextChild(U.advance(ctx)))
              continue
            }

            if (U.check(ctx, 'IDENTIFIER')) {
              const token = U.current(ctx)
              // Check if this is uppercase (component/child)
              if (token && isUppercase(token.value)) {
                // New child: IDENTIFIER followed by STRING (e.g., Text "hello", Icon "check")
                // ChildOverride: IDENTIFIER followed by COLON or properties (e.g., Value:, Value col #fff)
                if (U.checkNext(ctx, 'STRING')) {
                  // This is a new child instance with content
                  const child = callbacks.parseStateChildInstance()
                  if (child) {
                    if (!state.children) state.children = []
                    state.children.push(child)
                  }
                } else {
                  // This is a childOverride (slot or property override)
                  const childOverride = callbacks.parseStateChildOverride()
                  if (childOverride) state.childOverrides.push(childOverride)
                }
              } else {
                const prop = callbacks.parseProperty()
                if (prop) state.properties.push(prop)
              }
            } else {
              U.advance(ctx)
            }
          }
          if (U.check(ctx, 'DEDENT')) U.advance(ctx)

          component.states.push(state)
          continue
        } else {
          // Not a state block, restore position
          ctx.pos = savedPos
        }
      }

      // Behavior state with "state" keyword: state highlighted\n  bg #333
      // or inline: state highlighted bg #333
      if (name === 'state') {
        const savedPos = ctx.pos
        U.advance(ctx) // consume 'state'

        if (U.check(ctx, 'IDENTIFIER')) {
          const stateNameToken = U.advance(ctx)

          const state: State = {
            type: 'State',
            name: stateNameToken.value,
            properties: [],
            childOverrides: [],
            line: stateNameToken.line,
            column: stateNameToken.column,
          }

          // Check for inline properties: state highlighted bg #333
          if (U.check(ctx, 'IDENTIFIER') || U.check(ctx, 'NUMBER') || U.check(ctx, 'STRING')) {
            callbacks.parseInlineProperties(state.properties)
          }

          // Check for block properties, children, and child overrides
          U.skipNewlines(ctx)
          if (U.check(ctx, 'INDENT')) {
            U.advance(ctx) // consume INDENT
            while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
              U.skipNewlines(ctx)
              if (U.check(ctx, 'DEDENT')) break

              // Handle string content as Text child
              if (U.check(ctx, 'STRING')) {
                if (!state.children) state.children = []
                state.children.push(callbacks.createTextChild(U.advance(ctx)))
                continue
              }

              if (U.check(ctx, 'IDENTIFIER')) {
                const token = U.current(ctx)
                // Check if this is uppercase (component/child)
                if (token && isUppercase(token.value)) {
                  // New child: IDENTIFIER followed by STRING (e.g., Text "hello", Icon "check")
                  // ChildOverride: IDENTIFIER followed by COLON or properties (e.g., Value:, Value col #fff)
                  if (U.checkNext(ctx, 'STRING')) {
                    // This is a new child instance with content
                    const child = callbacks.parseStateChildInstance()
                    if (child) {
                      if (!state.children) state.children = []
                      state.children.push(child)
                    }
                  } else {
                    // This is a childOverride (slot or property override)
                    const childOverride = callbacks.parseStateChildOverride()
                    if (childOverride) state.childOverrides.push(childOverride)
                  }
                } else {
                  const prop = callbacks.parseProperty()
                  if (prop) state.properties.push(prop)
                }
              } else {
                U.advance(ctx)
              }
            }
            if (U.check(ctx, 'DEDENT')) U.advance(ctx)
          }

          component.states.push(state)
          continue
        } else {
          // Not a valid state, restore position
          ctx.pos = savedPos
        }
      }

      // Handle boolean properties (no value)
      if (booleanProperties.has(name)) {
        const token = U.advance(ctx)
        component.properties.push({
          type: 'Property',
          name: token.value,
          values: [true],
          line: token.line,
          column: token.column,
        })
        continue
      }

      // Known properties that take any identifier value (including PascalCase like "Arial")
      const propertiesWithAnyValue = new Set([
        'font',
        'cursor',
        'align',
        'weight',
        'animation',
        'anim',
      ])

      // Property line: identifier followed by values (NUMBER, STRING, IDENTIFIER)
      const next = callbacks.peekAt(1)
      // If next token looks like a value (NUMBER, STRING, or simple IDENTIFIER not starting with uppercase)
      // then it's a property
      if (
        next &&
        (next.type === 'NUMBER' ||
          next.type === 'STRING' ||
          (next.type === 'IDENTIFIER' && !U.current(ctx).value.startsWith('on')))
      ) {
        // Check if it's likely a property (next is value) vs child instance (next is STRING only)
        // Property: pad 16, bg #FFF, col white, font Arial
        // Instance: Button "Click", Text "Hello"
        // Heuristic: if name is lowercase and next is number/identifier, it's a property
        // Exception: known properties like "font" can take PascalCase values
        const isLikelyProperty =
          name[0] === name[0].toLowerCase() &&
          (next.type === 'NUMBER' ||
            propertiesWithAnyValue.has(name) ||
            (next.type === 'IDENTIFIER' && next.value[0] === next.value[0].toLowerCase()))

        if (isLikelyProperty) {
          const prop = callbacks.parseProperty()
          if (prop) component.properties.push(prop)
          continue
        }
      }
    }

    // Event with colon: onclick: action
    // Events are "on" + event name (onclick, onhover, etc.)
    // NOT just "on" or "off" which are state names
    const isEventName = (n: string) => n.startsWith('on') && n.length > 2 && n !== 'on'
    if (
      U.check(ctx, 'IDENTIFIER') &&
      U.checkNext(ctx, 'COLON') &&
      isEventName(U.current(ctx).value)
    ) {
      const event = callbacks.parseEvent()
      if (event) component.events.push(event)
      continue
    }

    // State or Slot: Name:
    // States are lowercase (hover, focus, active, selected, on, off, etc.)
    // Slots are capitalized (Title, Content, Header, etc.)
    if (U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'COLON')) {
      const name = U.current(ctx).value
      const isLikelyState = name[0] === name[0].toLowerCase()

      if (isLikelyState) {
        // Parse as state
        const stateName = U.advance(ctx)
        U.advance(ctx) // :

        const state: State = {
          type: 'State',
          name: stateName.value,
          properties: [],
          childOverrides: [],
          line: stateName.line,
          column: stateName.column,
        }

        // Inline state properties
        callbacks.parseInlineProperties(state.properties)

        // Block state properties
        U.skipNewlines(ctx)
        if (U.check(ctx, 'INDENT')) {
          U.advance(ctx)
          while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx)) {
            U.skipNewlines(ctx)
            if (U.check(ctx, 'DEDENT')) break

            if (U.check(ctx, 'IDENTIFIER')) {
              const prop = callbacks.parseProperty()
              if (prop) state.properties.push(prop)
            } else {
              U.advance(ctx)
            }
          }
          if (U.check(ctx, 'DEDENT')) U.advance(ctx)
        }

        component.states.push(state)
        continue
      } else {
        // Capitalized name - likely a slot: Title:
        const slotName = U.advance(ctx)
        U.advance(ctx) // :

        const slot: Instance = {
          type: 'Instance',
          component: slotName.value,
          name: null,
          properties: [],
          children: [],
          line: slotName.line,
          column: slotName.column,
        }

        callbacks.parseInlineProperties(slot.properties)
        U.skipNewlines(ctx)
        if (U.check(ctx, 'INDENT')) {
          U.advance(ctx)
          callbacks.parseInstanceBody(slot)
        }

        component.children.push(slot)
        continue
      }
    }

    // Event: onclick action
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value.startsWith('on')) {
      const event = callbacks.parseEvent()
      if (event) component.events.push(event)
      continue
    }

    // Keys block
    if (U.check(ctx, 'KEYS')) {
      callbacks.parseKeysBlock(component.events)
      continue
    }

    // Visibility condition: if (state) with or without children
    if (U.check(ctx, 'IF')) {
      U.advance(ctx) // consume IF
      const condition = callbacks.parseExpression()
      U.skipNewlines(ctx)

      // Extract state name from condition like "(open)" → "open"
      const match = condition.match(/^\(?\s*(\w+)\s*\)?$/)
      const visibleWhen = match ? match[1] : condition

      // If NOT followed by INDENT, it's a visibility condition for current component
      if (!U.check(ctx, 'INDENT')) {
        component.visibleWhen = visibleWhen
        continue
      }

      // Has children - parse them and set visibleWhen on each
      U.advance(ctx) // consume INDENT
      for (
        let iter = 0;
        !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS;
        iter++
      ) {
        U.skipNewlines(ctx)
        if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

        // Child component definition: ChildName as primitive:
        if (U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'AS')) {
          const childName = U.advance(ctx)
          const child = callbacks.parseComponentDefinition(childName)
          if (child) {
            child.visibleWhen = visibleWhen
            // ComponentDefinition children are treated as Instances in this context
            component.children.push(child as unknown as Instance)
          }
          continue
        }

        // Child instance
        if (U.check(ctx, 'IDENTIFIER')) {
          const name = U.advance(ctx)
          const child = callbacks.parseInstance(name)
          if (child.type === 'Instance') {
            child.visibleWhen = visibleWhen
            component.children.push(child)
          } else if (child.type === 'Slot') {
            component.children.push(child)
          }
          continue
        }

        U.advance(ctx)
      }
      if (U.check(ctx, 'DEDENT')) U.advance(ctx)

      // Check for optional 'else' block - set visibleWhen to negated condition
      U.skipNewlines(ctx)
      if (U.check(ctx, 'ELSE')) {
        U.advance(ctx) // consume ELSE
        U.skipNewlines(ctx)
        const negatedCondition = '!(' + visibleWhen + ')'
        if (U.check(ctx, 'INDENT')) {
          U.advance(ctx) // consume INDENT
          for (
            let iter = 0;
            !U.isAtEnd(ctx) && !U.check(ctx, 'DEDENT') && iter < MAX_ITERATIONS;
            iter++
          ) {
            U.skipNewlines(ctx)
            if (U.check(ctx, 'DEDENT') || U.isAtEnd(ctx)) break

            // Child component definition in else block: ChildName as primitive:
            if (U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'AS')) {
              const childName = U.advance(ctx)
              const child = callbacks.parseComponentDefinition(childName)
              if (child) {
                child.visibleWhen = negatedCondition
                component.children.push(child as unknown as Instance)
              }
              continue
            }

            // Child instance in else block
            if (U.check(ctx, 'IDENTIFIER')) {
              const name = U.advance(ctx)
              const child = callbacks.parseInstance(name)
              if (child.type === 'Instance') {
                child.visibleWhen = negatedCondition
                component.children.push(child)
              } else if (child.type === 'Slot') {
                component.children.push(child)
              }
              continue
            }

            U.advance(ctx)
          }
          if (U.check(ctx, 'DEDENT')) U.advance(ctx)
        }
      }
      continue
    }

    // Child component definition: ChildName as primitive:
    if (U.check(ctx, 'IDENTIFIER') && U.checkNext(ctx, 'AS')) {
      const childName = U.advance(ctx)
      const child = callbacks.parseComponentDefinition(childName)
      if (child) {
        // ComponentDefinition children are treated as Instances in this context
        component.children.push(child as unknown as Instance)
      }
      continue
    }

    // String content as Text child (for component definitions)
    if (U.check(ctx, 'STRING')) {
      component.children.push(callbacks.createTextChild(U.advance(ctx)))
      continue
    }

    // Implicit onclick action: identifier followed by `(` that is a known
    // action function (toggle/show/hide/toast/...). Mirror's instance-body
    // parser turns `Btn toggle(), toast()` into TWO onclick events; for
    // consistency the component-body parser does the same. Without this
    // branch, the identifier falls through to parseInstance below and
    // becomes a phantom child component (e.g. `Base as Btn: onclick t(), s()`
    // would parse `s` as a child instance instead of a second onclick event).
    if (
      U.check(ctx, 'IDENTIFIER') &&
      U.checkNext(ctx, 'LPAREN') &&
      callbacks.isImplicitOnclickCandidate(U.current(ctx).value)
    ) {
      const implicitEvent = callbacks.parseImplicitOnclick()
      if (implicitEvent) {
        component.events.push(implicitEvent)
        continue
      }
    }

    // Property-set reference at start of line: `$lay` in Component-Body
    // composes the referenced property-set's properties into the component.
    // Without this, `$lay` falls through to parseInstance below and becomes
    // a phantom child component named `$lay`.
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value.startsWith('$')) {
      const refToken = U.advance(ctx)
      const refName = refToken.value.slice(1)
      component.properties.push({
        type: 'Property',
        name: 'propset',
        values: [{ kind: 'token', name: refName }],
        line: refToken.line,
        column: refToken.column,
      })
      continue
    }

    // Child instance (without COLON - those are handled above as slots/states)
    if (U.check(ctx, 'IDENTIFIER')) {
      const name = U.advance(ctx)
      const child = callbacks.parseInstance(name)
      if (child.type !== 'ZagComponent') {
        component.children.push(child as Instance | Slot)
      }
      continue
    }

    U.advance(ctx)
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)
}
