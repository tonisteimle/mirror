/**
 * Event Transformer
 *
 * Pure functions for transforming event and action AST nodes to IR format.
 * Handles event mapping and action transformation.
 *
 * Extracted from ir/index.ts for modularity.
 */

import type { Event, Action } from '../../parser/ast'
import type { IREvent, IRAction } from '../types'
import { mapEventToDom } from '../../schema/ir-helpers'

// =============================================================================
// Constants
// =============================================================================

/**
 * Built-in state functions that are handled by the runtime.
 * These functions operate on the element's state machine.
 */
const BUILTIN_STATE_FUNCTIONS = new Set(['toggle', 'cycle', 'exclusive'])

// =============================================================================
// Event Transformation
// =============================================================================

/**
 * Transform events to IR format.
 * Maps Mirror event names to DOM event names and transforms actions.
 */
export function transformEvents(events: Event[]): IREvent[] {
  return events.map(event => ({
    name: mapEventToDom(event.name),
    key: event.key,
    actions: event.actions.map(action => transformAction(action)),
    modifiers: event.modifiers,
  }))
}

/**
 * Transform action to IR format.
 * Identifies built-in state functions (toggle, cycle, exclusive).
 *
 * Special case: `toggle(ElementName)` (PascalCase single argument) is
 * *not* a state-machine action — it's a visibility toggle on the named
 * element. Mark it as a regular runtime call so the DOM emitter routes
 * it to `_runtime.toggle(_elements['…'])` instead of synthesizing a
 * state-machine on the click source. See findings.md "toggle(ElementName)".
 */
function transformAction(action: Action): IRAction {
  const isBuiltin = BUILTIN_STATE_FUNCTIONS.has(action.name)
  const isElementNameToggle =
    (action.name === 'toggle' || action.name === 'cycle') &&
    !!action.args &&
    action.args.length === 1 &&
    /^[A-Z]/.test(action.args[0])

  return {
    type: action.name,
    target: action.target,
    args: action.args,
    isFunctionCall: action.isFunctionCall,
    isBuiltinStateFunction: action.isFunctionCall && isBuiltin && !isElementNameToggle,
  }
}
