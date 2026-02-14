/**
 * Global Component Registry for Cross-Component Communication.
 * Enables components to register themselves and communicate with each other.
 */

import React, { useRef, useMemo } from 'react'
import {
  ComponentRegistryContext,
  type ComponentRegistry,
  type ComponentRegistryEntry
} from './component-registry-context'


// ============================================
// Provider
// ============================================

interface ComponentRegistryProviderProps {
  children: React.ReactNode
  onPageNavigate?: (pageName: string) => void
}

export function ComponentRegistryProvider({ children, onPageNavigate }: ComponentRegistryProviderProps) {
  const registryRef = useRef<Map<string, ComponentRegistryEntry>>(new Map())

  const contextValue: ComponentRegistry = useMemo(() => ({
    register: (entry) => {
      registryRef.current.set(entry.id, entry)
    },
    unregister: (id) => {
      registryRef.current.delete(id)
    },
    getByName: (name) => {
      for (const entry of registryRef.current.values()) {
        if (entry.name === name) return entry
      }
      return undefined
    },
    getById: (id) => {
      return registryRef.current.get(id)
    },
    onPageNavigate
  }), [onPageNavigate])

  return (
    <ComponentRegistryContext.Provider value={contextValue}>
      {children}
    </ComponentRegistryContext.Provider>
  )
}

