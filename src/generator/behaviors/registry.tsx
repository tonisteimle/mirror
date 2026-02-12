import { useState, useCallback, useMemo, createContext, useContext } from 'react'
import type { BehaviorHandler, BehaviorRegistry } from './index'

// Import all behavior handlers
import { DropdownBehavior } from './dropdown'
import { DialogBehavior } from './dialog'
import { TooltipBehavior } from './tooltip'
import { TabsBehavior } from './tabs'
import { AccordionBehavior } from './accordion'
import { SelectBehavior } from './select'
import { PopoverBehavior } from './popover'
import { AlertDialogBehavior } from './alert-dialog'
import { ContextMenuBehavior } from './context-menu'
import { HoverCardBehavior } from './hover-card'
import { SwitchBehavior } from './switch'
import { CheckboxBehavior } from './checkbox'
import { RadioGroupBehavior } from './radio-group'
import { SliderBehavior } from './slider'
import { FormFieldBehavior } from './input'
import { ToastBehavior } from './toast'
import { ProgressBehavior } from './progress'
import { AvatarBehavior } from './avatar'
import { CollapsibleBehavior } from './collapsible'
// Additional Radix behaviors
import { SeparatorBehavior } from './separator'
import { AspectRatioBehavior } from './aspect-ratio'
import { ToggleBehavior } from './toggle'
import { ToggleGroupBehavior } from './toggle-group'
import { ScrollAreaBehavior } from './scroll-area'
import { ToolbarBehavior } from './toolbar'
import { MenubarBehavior } from './menubar'
import { NavigationMenuBehavior } from './navigation-menu'

// All behavior handlers
const BEHAVIOR_HANDLERS: BehaviorHandler[] = [
  // Overlays
  DropdownBehavior,
  DialogBehavior,
  TooltipBehavior,
  PopoverBehavior,
  AlertDialogBehavior,
  ContextMenuBehavior,
  HoverCardBehavior,
  // Navigation
  TabsBehavior,
  AccordionBehavior,
  CollapsibleBehavior,
  // Form
  FormFieldBehavior,
  SelectBehavior,
  SwitchBehavior,
  CheckboxBehavior,
  RadioGroupBehavior,
  SliderBehavior,
  // Feedback
  ToastBehavior,
  ProgressBehavior,
  AvatarBehavior,
  // Layout & Utility
  SeparatorBehavior,
  AspectRatioBehavior,
  ToggleBehavior,
  ToggleGroupBehavior,
  ScrollAreaBehavior,
  ToolbarBehavior,
  MenubarBehavior,
  NavigationMenuBehavior
]

// Map for quick lookup
const handlerMap = new Map<string, BehaviorHandler>()
for (const handler of BEHAVIOR_HANDLERS) {
  handlerMap.set(handler.name, handler)
}

// Get handler by component name
export function getBehaviorHandler(name: string): BehaviorHandler | undefined {
  return handlerMap.get(name)
}

// Context for behavior registry state
interface BehaviorRegistryState {
  states: Map<string, string>
  setState: (id: string, state: string) => void
  toggle: (id: string, availableStates: string[]) => void
}

export const BehaviorRegistryContext = createContext<BehaviorRegistryState | null>(null)

// Provider component
export function BehaviorRegistryProvider({ children }: { children: React.ReactNode }) {
  const [states, setStates] = useState<Map<string, string>>(() => new Map())

  const setState = useCallback((id: string, state: string) => {
    setStates(prev => {
      const next = new Map(prev)
      next.set(id, state)
      return next
    })
  }, [])

  const toggle = useCallback((id: string, availableStates: string[]) => {
    if (availableStates.length < 2) return

    setStates(prev => {
      const currentState = prev.get(id)
      const next = new Map(prev)

      // If no state set yet, set to 'open' (second state)
      // This handles hidden elements: first toggle shows them
      // For visible elements: first toggle marks them as "toggled on" (no visual change)
      if (currentState === undefined) {
        next.set(id, availableStates[1]) // 'open'
      } else {
        // Toggle between states
        const currentIndex = availableStates.indexOf(currentState)
        const nextIndex = (currentIndex + 1) % availableStates.length
        next.set(id, availableStates[nextIndex])
      }

      return next
    })
  }, [])

  const value = useMemo(() => ({
    states,
    setState,
    toggle
  }), [states, setState, toggle])

  return (
    <BehaviorRegistryContext.Provider value={value}>
      {children}
    </BehaviorRegistryContext.Provider>
  )
}

// Hook to use the registry
export function useBehaviorRegistry(): BehaviorRegistry {
  const context = useContext(BehaviorRegistryContext)

  if (!context) {
    // Return a no-op registry if not in provider
    return {
      getHandler: getBehaviorHandler,
      getState: () => 'closed',
      setState: () => {},
      toggle: () => {}
    }
  }

  return {
    getHandler: getBehaviorHandler,
    getState: (id: string) => context.states.get(id) || 'closed',
    setState: context.setState,
    toggle: (id: string) => context.toggle(id, ['closed', 'open'])
  }
}
