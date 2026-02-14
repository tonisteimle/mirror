/**
 * Overlay Registry Hooks
 *
 * Hooks for accessing the overlay registry.
 * Separated from provider to avoid react-refresh issues.
 */

import { useContext } from 'react'
import { OverlayRegistryContext } from './overlay-registry-context'

export function useOverlayRegistry() {
  return useContext(OverlayRegistryContext)
}
