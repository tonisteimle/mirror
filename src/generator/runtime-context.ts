/**
 * Runtime Variable Context Definition
 *
 * Context for runtime variables used in conditional rendering and iteration.
 * Separated from provider to avoid react-refresh issues.
 */

import { createContext, useContext } from 'react'

export interface RuntimeVariableContextType {
  variables: Record<string, unknown>
  setVariable: (name: string, value: unknown) => void
}

export const RuntimeVariableContext = createContext<RuntimeVariableContextType>({
  variables: {},
  setVariable: () => {}
})

/**
 * Hook to access runtime variables from the context
 */
export function useRuntimeVariables() {
  return useContext(RuntimeVariableContext)
}

// Re-export provider for convenience
export { RuntimeVariableProvider } from './RuntimeVariableProvider'
