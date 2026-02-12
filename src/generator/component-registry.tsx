/**
 * Global Component Registry for Cross-Component Communication.
 * Enables components to register themselves and communicate with each other.
 */

import React, { createContext, useContext, useRef, useMemo } from 'react'

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

// Alias for internal use
type ComponentRegistryContextType = ComponentRegistry

// ============================================
// Context
// ============================================

const ComponentRegistryContext = createContext<ComponentRegistryContextType | null>(null)

// ============================================
// Provider
// ============================================

interface ComponentRegistryProviderProps {
  children: React.ReactNode
  onPageNavigate?: (pageName: string) => void
}

export function ComponentRegistryProvider({ children, onPageNavigate }: ComponentRegistryProviderProps) {
  const registryRef = useRef<Map<string, ComponentRegistryEntry>>(new Map())

  const contextValue: ComponentRegistryContextType = useMemo(() => ({
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

// ============================================
// Hook
// ============================================

export function useComponentRegistry() {
  return useContext(ComponentRegistryContext)
}
