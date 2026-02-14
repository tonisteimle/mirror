/**
 * Template Registry Hooks
 *
 * Hooks for accessing template registry context.
 * Separated from provider to avoid react-refresh issues.
 */

import { useContext } from 'react'
import { TemplateRegistryContext } from './template-registry-context'

export function useTemplateRegistry() {
  return useContext(TemplateRegistryContext)
}
