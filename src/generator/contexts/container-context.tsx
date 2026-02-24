/**
 * Container Context
 *
 * Provides container information for behavior item registration.
 * Used for highlight/select next/prev actions within containers.
 * Also provides state toggling for accordion patterns where children
 * need to toggle parent's state.
 */

import { createContext, useContext } from 'react'
import type { StateDefinition } from '../../parser/types'

// Re-export utility function for backwards compatibility
export { templateToNode } from './container-utils'

export interface ContainerContextValue {
  containerId: string
  containerName: string
  // State toggle support for accordion patterns
  parentStates?: StateDefinition[]
  parentCurrentState?: string
  toggleParentState?: () => void
}

export const ContainerContext = createContext<ContainerContextValue | null>(null)

export function useContainerContext() {
  return useContext(ContainerContext)
}
