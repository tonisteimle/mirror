/**
 * Content Edit Context
 *
 * Context for enabling direct text editing in preview.
 * Provides edit mode state and callback for syncing changes back to source.
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react'

export interface ContentEditContextValue {
  /** Whether content edit mode is active */
  enabled: boolean
  /** Callback when text content changes - receives source line and new text */
  onTextChange?: (sourceLine: number, newText: string, token?: string) => void
}

const defaultValue: ContentEditContextValue = { enabled: false }

export const ContentEditContext = createContext<ContentEditContextValue>(defaultValue)

export function useContentEditMode(): boolean {
  return useContext(ContentEditContext).enabled
}

export function useContentEditContext(): ContentEditContextValue {
  return useContext(ContentEditContext)
}

interface ContentEditProviderProps {
  children: ReactNode
  enabled: boolean
  onTextChange?: (sourceLine: number, newText: string, token?: string) => void
}

export function ContentEditProvider({ children, enabled, onTextChange }: ContentEditProviderProps) {
  const value: ContentEditContextValue = {
    enabled,
    onTextChange,
  }

  return (
    <ContentEditContext.Provider value={value}>
      {children}
    </ContentEditContext.Provider>
  )
}
