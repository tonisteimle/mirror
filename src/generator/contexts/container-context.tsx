/**
 * Container Context
 *
 * Provides container information for behavior item registration.
 * Used for highlight/select next/prev actions within containers.
 */

import { createContext, useContext } from 'react'

// Re-export utility function for backwards compatibility
export { templateToNode } from './container-utils'

export interface ContainerContextValue {
  containerId: string
  containerName: string
}

export const ContainerContext = createContext<ContainerContextValue | null>(null)

export function useContainerContext() {
  return useContext(ContainerContext)
}
