/**
 * Overlay Registry Module
 *
 * Manages overlay state for user-defined components that can be opened/closed.
 * Provides a React context for tracking active overlays with their animation settings.
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { ASTNode } from '../parser/types'

export type OverlayPosition = 'below' | 'above' | 'left' | 'right' | 'center'

export interface OverlayState {
  node: ASTNode
  animation?: string
  duration?: number
  position?: OverlayPosition
  triggerRect?: DOMRect  // Position of the trigger element
  isClosing?: boolean
}

interface OverlayOpenOptions {
  animation?: string
  duration?: number
  position?: OverlayPosition
  triggerRect?: DOMRect
}

export interface OverlayRegistry {
  overlays: Map<string, OverlayState>
  open: (name: string, node: ASTNode, options?: OverlayOpenOptions) => void
  close: (name?: string, animation?: string, duration?: number) => void
  isOpen: (name: string) => boolean
}

// Internal alias for the context
type OverlayRegistryState = OverlayRegistry

const OverlayRegistryContext = createContext<OverlayRegistryState | null>(null)

export function OverlayRegistryProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Map<string, OverlayState>>(new Map())
  const closeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Cleanup all timers on unmount to prevent memory leaks
  useEffect(() => {
    const timers = closeTimers.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  const open = useCallback((name: string, node: ASTNode, options?: OverlayOpenOptions) => {
    // Cancel any pending close timer for this overlay
    const existingTimer = closeTimers.current.get(name)
    if (existingTimer) {
      clearTimeout(existingTimer)
      closeTimers.current.delete(name)
    }

    setOverlays(prev => {
      const next = new Map(prev)
      next.set(name, {
        node,
        animation: options?.animation,
        duration: options?.duration,
        position: options?.position || 'center',
        triggerRect: options?.triggerRect,
      })
      return next
    })
  }, [])

  const close = useCallback((name?: string, animation?: string, duration?: number) => {
    const animDuration = duration || 200
    const targetKey = name || Array.from(overlays.keys()).pop()

    if (!targetKey) return

    // Cancel existing timer to prevent race conditions
    const existingTimer = closeTimers.current.get(targetKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
      closeTimers.current.delete(targetKey)
    }

    const state = overlays.get(targetKey)
    if (!state) return

    if (animation) {
      // Mark as closing for animation
      setOverlays(prev => {
        const next = new Map(prev)
        next.set(targetKey, { ...state, isClosing: true, animation, duration: animDuration })
        return next
      })

      // Schedule removal
      const timer = setTimeout(() => {
        setOverlays(p => {
          const n = new Map(p)
          n.delete(targetKey)
          return n
        })
        closeTimers.current.delete(targetKey)
      }, animDuration)

      closeTimers.current.set(targetKey, timer)
    } else {
      setOverlays(prev => {
        const next = new Map(prev)
        next.delete(targetKey)
        return next
      })
    }
  }, [overlays])

  const isOpen = useCallback((name: string) => {
    const state = overlays.get(name)
    return state !== undefined && !state.isClosing
  }, [overlays])

  return (
    <OverlayRegistryContext.Provider value={{ overlays, open, close, isOpen }}>
      {children}
    </OverlayRegistryContext.Provider>
  )
}

export function useOverlayRegistry() {
  return useContext(OverlayRegistryContext)
}
