/**
 * State Machine Transformer
 *
 * Builds state machine configurations from AST state definitions.
 * Handles triggers, transitions, when-dependencies, and state animations.
 *
 * Extracted from ir/index.ts for modularity.
 */

import type {
  State,
  Instance,
  Property,
} from '../../parser/ast'
import type {
  IRStateMachine,
  IRStateDefinition,
  IRStateTransition,
  IREvent,
  IRNode,
  IRStyle,
} from '../types'
import { SYSTEM_STATES } from '../../schema/parser-helpers'
import { convertStateAnimation, convertStateDependency } from './data-transformer'

/**
 * Context interface for state machine transformation.
 * Provides callbacks to the IRTransformer instance.
 */
export interface StateMachineTransformContext {
  /** Convert a property to CSS styles */
  propertyToCSS: (prop: Property) => IRStyle[]
  /** Transform a state child instance to IR node */
  transformStateChild: (instance: Instance) => IRNode | null
}

/**
 * Build a state machine configuration from AST states and events.
 *
 * @param states Array of state definitions from AST
 * @param ctx Context with callbacks to the transformer
 * @param events Optional array of IR events to check for state machine functions
 * @returns State machine configuration or undefined if no state machine needed
 */
export function buildStateMachine(
  states: State[],
  ctx: StateMachineTransformContext,
  events?: IREvent[]
): IRStateMachine | undefined {
  // Filter states that have triggers or when dependencies (these form the state machine)
  const interactiveStates = states.filter(s => s.trigger || s.when)

  // Filter custom states for state machine:
  // 1. States NOT in SYSTEM_STATES (like "on", "open", "loading"), OR
  // 2. States in SYSTEM_STATES but used as custom states (have properties defined)
  //    e.g., "active: bg #2271C1" is a custom state, not CSS :active pseudo-class
  const customStates = states.filter(s =>
    !SYSTEM_STATES.has(s.name) ||
    (s.properties && s.properties.length > 0)
  )

  // Check if any event has a state machine function (toggle, exclusive)
  const hasStateMachineEvents = events?.some(e =>
    e.actions?.some(a => a.isBuiltinStateFunction)
  ) ?? false

  // Build state machine if:
  // 1. There are interactive states (with triggers), OR
  // 2. There are custom states AND state machine events
  if (interactiveStates.length === 0 && !(customStates.length > 0 && hasStateMachineEvents)) {
    return undefined
  }

  // Build state definitions
  const stateDefinitions: Record<string, IRStateDefinition> = {}
  const transitions: IRStateTransition[] = []

  // First pass: collect all unique state names and their styles
  for (const state of states) {
    // For synthetic 'when' states that have a targetState, transfer their
    // enter/exit animations to the target state (e.g., Btn.open: visible enter: fade-in)
    if (state.when && state.targetState && state.name.startsWith('_')) {
      // Ensure target state exists
      if (!stateDefinitions[state.targetState]) {
        stateDefinitions[state.targetState] = {
          name: state.targetState,
          styles: [],
          isInitial: false,
        }
      }
      // Transfer enter/exit animations to the target state
      if (state.enter) {
        stateDefinitions[state.targetState].enter = convertStateAnimation(state.enter)
      }
      if (state.exit) {
        stateDefinitions[state.targetState].exit = convertStateAnimation(state.exit)
      }
      // Transfer styles from the synthetic state to the target state
      for (const prop of state.properties) {
        const cssStyles = ctx.propertyToCSS(prop)
        for (const style of cssStyles) {
          stateDefinitions[state.targetState].styles.push(style)
        }
      }
      continue
    }

    if (!stateDefinitions[state.name]) {
      stateDefinitions[state.name] = {
        name: state.name,
        styles: [],
        isInitial: state.modifier === 'initial',
      }
    }

    // Add styles to the state definition
    for (const prop of state.properties) {
      const cssStyles = ctx.propertyToCSS(prop)
      for (const style of cssStyles) {
        stateDefinitions[state.name].styles.push(style)
      }
    }

    // Add children to state definition (like Figma Variants)
    if (state.children && state.children.length > 0) {
      const stateChildren: IRNode[] = []
      for (const child of state.children) {
        // Only transform Instance children (skip Slots for now)
        if (child.type === 'Instance') {
          const irChild = ctx.transformStateChild(child as Instance)
          if (irChild) {
            stateChildren.push(irChild)
          }
        }
      }
      if (stateChildren.length > 0) {
        stateDefinitions[state.name].children = stateChildren
      }
    }

    // Add enter/exit animations to state definition
    if (state.enter) {
      stateDefinitions[state.name].enter = convertStateAnimation(state.enter)
    }
    if (state.exit) {
      stateDefinitions[state.name].exit = convertStateAnimation(state.exit)
    }
  }

  // Second pass: create transitions from interactive states
  for (const state of interactiveStates) {
    // Handle trigger-based transitions
    if (state.trigger) {
      // Parse trigger (e.g., "onclick", "onkeydown escape")
      const triggerParts = state.trigger.split(' ')
      const trigger = triggerParts[0]
      const key = triggerParts[1] // for keyboard events

      const transition: IRStateTransition = {
        to: state.name,
        trigger,
        modifier: state.modifier,
        key,
      }

      // Add animation to transition if present
      if (state.animation) {
        transition.animation = convertStateAnimation(state.animation)
      }

      transitions.push(transition)
    }

    // Handle 'when' dependency transitions
    if (state.when) {
      // Use targetState if specified (e.g., SearchInput.searching: searching)
      // Otherwise fall back to the synthetic state name
      const targetState = state.targetState || state.name
      const transition: IRStateTransition = {
        to: targetState,
        trigger: '', // No trigger, it's dependency-based
        modifier: state.modifier,
        when: convertStateDependency(state.when),
      }

      // Add animation to transition if present
      if (state.animation) {
        transition.animation = convertStateAnimation(state.animation)
      }

      transitions.push(transition)
    }
  }

  // Third pass: create transitions from events with builtin state functions
  // This handles the case where toggle() or exclusive() is used as a property
  // without an explicit trigger on a state (e.g., "Button toggle()" instead of "on onclick:")
  if (events) {
    for (const event of events) {
      for (const action of event.actions) {
        if (action.isBuiltinStateFunction) {
          // Determine the target state
          // Priority: 'on' if exists, otherwise first custom state (excluding CSS pseudo-states)
          // System states (hover, focus, active, disabled) are CSS-driven and should not be toggle targets
          const customStateNames = Object.keys(stateDefinitions).filter(s =>
            s !== 'default' && !SYSTEM_STATES.has(s)
          )
          const targetState = customStateNames.includes('on') ? 'on' : (customStateNames[0] || 'on')

          // Determine the modifier based on the action type
          let modifier: 'exclusive' | 'toggle' | undefined
          if (action.type === 'exclusive') {
            modifier = 'exclusive'
          } else if (action.type === 'toggle' || action.type === 'cycle') {
            modifier = 'toggle'
          }

          // Create the transition
          const transition: IRStateTransition = {
            to: targetState,
            trigger: `on${event.name}`,  // e.g., 'onclick' for click event
            modifier,
          }

          // Ensure the target state exists in stateDefinitions
          // This handles the case where toggle() is used without defining states
          if (!stateDefinitions[targetState]) {
            stateDefinitions[targetState] = {
              name: targetState,
              styles: [],
              isInitial: false,
            }
          }

          // Check if this transition already exists (avoid duplicates)
          const exists = transitions.some(t =>
            t.trigger === transition.trigger &&
            t.to === transition.to &&
            t.modifier === transition.modifier
          )

          if (!exists) {
            transitions.push(transition)
          }
        }
      }
    }
  }

  // Determine initial state
  // Priority:
  // 1. explicit 'initial' modifier
  // 2. OLD syntax: state without trigger when other states have triggers
  // 3. NEW syntax (function calls): 'default'
  let initial: string | undefined

  // Check for explicit 'initial' modifier
  for (const [name, def] of Object.entries(stateDefinitions)) {
    if (def.isInitial) {
      initial = name
      break
    }
  }

  // If no explicit initial, check for OLD syntax pattern:
  // Some states have explicit triggers, some don't → one without trigger is initial
  // This does NOT apply when interactive states only have 'when' dependencies
  const statesWithExplicitTriggers = states.filter(s => s.trigger && !SYSTEM_STATES.has(s.name))
  if (!initial && statesWithExplicitTriggers.length > 0) {
    const statesWithoutTriggers = states.filter(s => !s.trigger && !s.when && !SYSTEM_STATES.has(s.name))
    if (statesWithoutTriggers.length > 0) {
      initial = statesWithoutTriggers[0].name
    }
  }

  // If still no initial, determine based on number of custom states:
  // - If states have no triggers: use 'default' (transitions controlled by events like cycle())
  // - If some states have triggers: use OLD syntax logic
  if (!initial) {
    // Get custom states (non-system states, excluding synthetic 'when' states)
    // Synthetic 'when' states start with '_' and have a 'when' dependency
    const syntheticStateNames = new Set(
      states.filter(s => s.when && s.name.startsWith('_')).map(s => s.name)
    )
    const customStateNames = Object.keys(stateDefinitions).filter(
      s => s !== 'default' && !syntheticStateNames.has(s)
    )

    // Check if any custom state has a trigger attached
    // If none do, transitions are controlled by events (cycle(), toggle(), etc.)
    // and initial state should be 'default'
    const anyStateHasTrigger = states.some(s =>
      !SYSTEM_STATES.has(s.name) && !syntheticStateNames.has(s.name) && s.trigger
    )

    if (customStateNames.length >= 2 && anyStateHasTrigger) {
      // Multi-state with triggers: start in first defined state (cycle behavior)
      // Use states array to preserve definition order
      const firstCustomState = states.find(s =>
        !SYSTEM_STATES.has(s.name) && !syntheticStateNames.has(s.name)
      )
      initial = firstCustomState?.name || customStateNames[0]
    } else {
      // Single state, no states, or states controlled by events: use 'default'
      initial = 'default'
    }

    // Create default state if it doesn't exist (needed for binary toggle)
    if (!stateDefinitions['default']) {
      stateDefinitions['default'] = {
        name: 'default',
        styles: [], // No styles - uses base element styles
        isInitial: initial === 'default',
      }
    }
  }

  return {
    initial,
    states: stateDefinitions,
    transitions,
  }
}
