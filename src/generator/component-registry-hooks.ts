/**
 * Component Registry Hooks
 *
 * Hooks for accessing the component registry.
 * Separated from provider to avoid react-refresh issues.
 */

import { useContext } from 'react'
import { ComponentRegistryContext } from './component-registry-context'

export function useComponentRegistry() {
  return useContext(ComponentRegistryContext)
}
