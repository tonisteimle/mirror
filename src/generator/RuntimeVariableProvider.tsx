/**
 * Runtime Variable Provider
 *
 * Provider for runtime variables used in conditional rendering and iteration.
 */

import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { RuntimeVariableContext } from './runtime-context'

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
