/**
 * Runtime variable context for conditional rendering and iteration.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

interface RuntimeVariableContextType {
  variables: Record<string, unknown>
  setVariable: (name: string, value: unknown) => void
}

export const RuntimeVariableContext = createContext<RuntimeVariableContextType>({
  variables: {},
  setVariable: () => {}
})

interface RuntimeVariableProviderProps {
  children: ReactNode
  initialVariables?: Record<string, unknown>
}

/**
 * Provider for runtime variables used in conditional rendering and iteration.
 */
export function RuntimeVariableProvider({
  children,
  initialVariables = {}
}: RuntimeVariableProviderProps) {
  const [variables, setVariables] = useState(initialVariables)

  const setVariable = useCallback((name: string, value: unknown) => {
    setVariables(prev => ({ ...prev, [name]: value }))
  }, [])

  const contextValue = useMemo(() => ({ variables, setVariable }), [variables, setVariable])

  return (
    <RuntimeVariableContext.Provider value={contextValue}>
      {children}
    </RuntimeVariableContext.Provider>
  )
}

/**
 * Hook to access runtime variables.
 */
export function useRuntimeVariables() {
  return useContext(RuntimeVariableContext)
}
