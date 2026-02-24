/**
 * State Override Context
 *
 * Provides parent state child overrides to children.
 * Used for patterns like accordion where parent state affects child visibility:
 *   state collapsed { Content { hidden } }
 *   state expanded { Content { visible } }
 */

import React, { createContext, useContext } from 'react'
import type { StateDefinition } from '../../parser/types'

// Child override from a state definition
export interface StateChildOverride {
  childName: string
  properties: Record<string, unknown>
}

// Context value: map of childName -> properties
export interface StateOverrideContextValue {
  overrides: Map<string, Record<string, unknown>>
}

const defaultValue: StateOverrideContextValue = {
  overrides: new Map()
}

export const StateOverrideContext = createContext<StateOverrideContextValue>(defaultValue)

/**
 * Hook to get state override for a specific child by name.
 */
export function useStateOverride(childName: string): Record<string, unknown> | undefined {
  const context = useContext(StateOverrideContext)
  return context.overrides.get(childName)
}

/**
 * Build state overrides from current active state.
 */
export function buildStateOverrides(
  states: StateDefinition[] | undefined,
  currentState: string
): Map<string, Record<string, unknown>> {
  const overrides = new Map<string, Record<string, unknown>>()

  if (!states) return overrides

  // Find the active state definition
  const activeState = states.find(s => s.name === currentState)
  if (!activeState || !activeState.children) return overrides

  // Extract child overrides from state's children
  for (const child of activeState.children) {
    if (child.name && child.properties) {
      // Merge with existing overrides for this child (in case of multiple overrides)
      const existing = overrides.get(child.name) || {}
      overrides.set(child.name, { ...existing, ...child.properties })
    }
  }

  return overrides
}

/**
 * Provider component for state overrides.
 */
export function StateOverrideProvider({
  states,
  currentState,
  children
}: {
  states: StateDefinition[] | undefined
  currentState: string
  children: React.ReactNode
}) {
  const overrides = buildStateOverrides(states, currentState)
  const value: StateOverrideContextValue = { overrides }

  return (
    <StateOverrideContext.Provider value={value}>
      {children}
    </StateOverrideContext.Provider>
  )
}
