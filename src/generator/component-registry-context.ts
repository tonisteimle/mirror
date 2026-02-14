/**
 * Component Registry Context Definition
 *
 * Context for component registry.
 * Separated from provider to avoid react-refresh issues.
 */

import { createContext } from 'react'

// ============================================
// Types
// ============================================

export interface ComponentRegistryEntry {
  id: string
  name: string
  setState: (state: string) => void
  setVariable: (name: string, value: string | number | boolean) => void
  getState: () => string
  getVariable: (name: string) => string | number | boolean | undefined
  toggle: () => void  // Toggle between states
}

export interface ComponentRegistry {
  register: (entry: ComponentRegistryEntry) => void
  unregister: (id: string) => void
  getByName: (name: string) => ComponentRegistryEntry | undefined
  getById: (id: string) => ComponentRegistryEntry | undefined
  onPageNavigate?: (pageName: string) => void
}

// ============================================
// Context
// ============================================

export const ComponentRegistryContext = createContext<ComponentRegistry | null>(null)
