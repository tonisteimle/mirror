/**
 * Action Executor Module
 *
 * Executes actions from event handlers.
 * Handles: change, open, close, toggle, assign, page
 */

import type { ActionStatement, Expression, ComponentTemplate, ASTNode, RuntimeValue } from '../../parser/parser'
import type { BehaviorRegistry } from '../behaviors'
import type { ComponentRegistry, ComponentRegistryEntry } from '../component-registry-context'
import type { OverlayRegistry } from '../overlay-registry-context'
import { evaluateExpression } from '../utils'

/**
 * Container context for highlight/select actions.
 */
export interface ContainerContextInfo {
  containerId: string
  containerName: string
  // For accordion patterns: toggle parent's state from child
  toggleParentState?: () => void
}

/**
 * Context required for action execution.
 */
export interface ActionExecutorContext {
  node: ASTNode
  currentState: string
  setCurrentState: (state: string) => void
  // V9: Category state management
  categoryStates?: Record<string, string>
  setCategoryStates?: React.Dispatch<React.SetStateAction<Record<string, string>>>
  variables: Record<string, RuntimeValue>
  setVariables: React.Dispatch<React.SetStateAction<Record<string, RuntimeValue>>>
  registry: ComponentRegistry | null
  behaviorRegistry: BehaviorRegistry
  overlayRegistry: OverlayRegistry | null
  templateRegistry: Map<string, ComponentTemplate> | null
  containerContext?: ContainerContextInfo | null
}

/**
 * Convert ComponentTemplate to ASTNode for overlay rendering.
 */
export function templateToNode(name: string, template: ComponentTemplate): ASTNode {
  return {
    type: 'component',
    name,
    id: `overlay-${name}-${Date.now()}`,
    properties: template.properties,
    content: template.content,
    children: template.children,
    states: template.states,
    variables: template.variables,
    eventHandlers: template.eventHandlers,
  }
}

/**
 * Helper to find a component by name or id.
 * First tries getByName, then falls back to getById.
 * This supports both component names (e.g., "Options") and named instances (e.g., "Box named Panel").
 */
function getTarget(registry: ComponentRegistry | null, target: string): ComponentRegistryEntry | undefined {
  if (!registry) return undefined
  // Try by name first (for component names like "Options")
  const byName = registry.getByName(target)
  if (byName) return byName
  // Fall back to by id (for named instances like "Box named Panel" → id="Panel")
  return registry.getById(target)
}

/**
 * Execute a single action.
 */
export function executeAction(
  action: ActionStatement,
  context: ActionExecutorContext,
  event?: React.SyntheticEvent
): void {
  const {
    node,
    currentState,
    setCurrentState,
    variables,
    setVariables,
    registry,
    behaviorRegistry,
    overlayRegistry,
    templateRegistry,
    containerContext
  } = context

  switch (action.type) {
    case 'change':
      if (action.target === 'self' || action.target === node.name || !action.target) {
        if (action.toState) {
          setCurrentState(action.toState)
        }
      } else if (action.target) {
        behaviorRegistry.setState(action.target, action.toState || '')
        if (registry) {
          const targetEntry = getTarget(registry, action.target)
          if (targetEntry && action.toState) targetEntry.setState(action.toState)
        }
      }
      break

    case 'open':
      if (action.target) {
        // First: Check if it's a user-defined component template (overlay)
        const componentTemplate = templateRegistry?.get(action.target)
        if (componentTemplate && overlayRegistry) {
          const overlayNode = templateToNode(action.target, componentTemplate)
          // Get trigger element's position for dropdown-style positioning
          const triggerRect = event?.currentTarget instanceof Element
            ? event.currentTarget.getBoundingClientRect()
            : undefined
          overlayRegistry.open(action.target, overlayNode, {
            animation: action.animation,
            duration: action.duration,
            position: action.position as 'below' | 'above' | 'left' | 'right' | 'center' | undefined,
            triggerRect,
          })
        } else {
          // Fallback: Library component behavior
          behaviorRegistry.setState(action.target, 'open')
          if (registry) {
            const targetEntry = getTarget(registry, action.target)
            if (targetEntry) targetEntry.setState('visible')
          }
        }
      }
      break

    case 'close':
      // Implicit self: close without target means close self
      const closeTarget = action.target || 'self'
      if (closeTarget === 'self') {
        // Close self - use node.instanceName (for named instances) or node.name
        const selfTarget = node.instanceName || node.name
        behaviorRegistry.setState(selfTarget, 'closed')
        if (registry) {
          const targetEntry = getTarget(registry, selfTarget)
          if (targetEntry) targetEntry.setState('hidden')
        }
      } else {
        // First: Check if it's an open overlay
        if (overlayRegistry?.isOpen(closeTarget)) {
          overlayRegistry.close(closeTarget, action.animation, action.duration)
        } else {
          // Fallback: Library component behavior
          behaviorRegistry.setState(closeTarget, 'closed')
          if (registry) {
            const targetEntry = getTarget(registry, closeTarget)
            if (targetEntry) targetEntry.setState('hidden')
          }
        }
      }
      break

    case 'toggle':
      if (action.target === 'self' || action.target === node.name || !action.target) {
        if (node.states && node.states.length >= 2) {
          const currentIndex = node.states.findIndex(s => s.name === currentState)
          const nextIndex = (currentIndex + 1) % node.states.length
          setCurrentState(node.states[nextIndex].name)
        }
      } else if (action.target) {
        // Check if target has 'hidden' property to determine toggle direction
        // Elements with 'hidden' start hidden (state undefined), first toggle shows them
        // Elements without 'hidden' start visible, first toggle should hide them
        const targetTemplate = templateRegistry?.get(action.target)
        const targetHasHidden = targetTemplate?.properties?.hidden === true
        const currentTargetState = behaviorRegistry.getState(action.target)

        let newState: string
        if (currentTargetState === undefined) {
          // First toggle - direction depends on whether element starts hidden
          newState = targetHasHidden ? 'open' : 'closed'
        } else if (currentTargetState === 'open') {
          newState = 'closed'
        } else {
          // closed or any other state → open
          newState = 'open'
        }

        behaviorRegistry.setState(action.target, newState)
        if (registry) {
          const targetEntry = getTarget(registry, action.target)
          if (targetEntry) targetEntry.setState(newState === 'open' ? 'visible' : 'hidden')
        }
      }
      break

    case 'assign':
      if (action.target && action.value !== undefined) {
        const actionValue = action.value
        let resolvedValue: RuntimeValue
        if (typeof actionValue === 'object' && actionValue !== null && 'type' in actionValue) {
          // Evaluate expression - supports $item for Master-Detail pattern
          resolvedValue = evaluateExpression(actionValue as Expression, variables as Record<string, unknown>, event) as RuntimeValue
        } else {
          resolvedValue = actionValue as RuntimeValue
        }
        setVariables(prev => {
          return { ...prev, [action.target!]: resolvedValue }
        })
      }
      break

    case 'page':
      if (action.target && registry?.onPageNavigate) {
        registry.onPageNavigate(action.target)
      }
      break

    case 'alert':
      if (action.target) {
        window.alert(action.target)
      }
      break

    case 'show':
      {
        // Implicit self: show without target means show self
        const showTarget = action.target || 'self'
        const showName = showTarget === 'self' ? (node.instanceName || node.name) : showTarget
        // Use 'open' state - this is what ToggleableNode checks for visibility
        behaviorRegistry.setState(showName, 'open')
        if (registry) {
          const targetEntry = getTarget(registry, showName)
          if (targetEntry) targetEntry.setState('open')
        }
      }
      break

    case 'hide':
      {
        // Implicit self: hide without target means hide self
        const hideTarget = action.target || 'self'
        const hideName = hideTarget === 'self' ? (node.instanceName || node.name) : hideTarget
        // Use 'closed' state - this is what ToggleableNode checks for hiding
        behaviorRegistry.setState(hideName, 'closed')
        if (registry) {
          const targetEntry = getTarget(registry, hideName)
          if (targetEntry) targetEntry.setState('closed')
        }
      }
      break

    case 'highlight':
      // Highlight behavior: highlight self, next, prev, first, last, self-and-before, all, none
      if (action.target) {
        const containerId = action.inContainer ||
          (action.target === 'self' || action.target === 'self-and-before' ? context.containerContext?.containerName : null) ||
          (node.instanceName || node.name)
        if (action.target === 'self') {
          behaviorRegistry.highlight(node.id, containerId)
        } else if (action.target === 'next') {
          behaviorRegistry.highlightNext(containerId)
        } else if (action.target === 'prev') {
          behaviorRegistry.highlightPrev(containerId)
        } else if (action.target === 'first') {
          behaviorRegistry.highlightFirst(containerId)
        } else if (action.target === 'last') {
          behaviorRegistry.highlightLast(containerId)
        } else if (action.target === 'self-and-before') {
          behaviorRegistry.highlightSelfAndBefore(node.id, containerId)
        } else if (action.target === 'all') {
          behaviorRegistry.highlightAll(containerId)
        } else if (action.target === 'none') {
          behaviorRegistry.highlightNone(containerId)
        } else {
          behaviorRegistry.highlight(action.target, containerId)
        }
      }
      break

    case 'select':
      // Select behavior: select self, highlighted, self-and-before, all, none
      if (action.target) {
        const containerId = action.inContainer ||
          (action.target === 'self' || action.target === 'self-and-before' ? context.containerContext?.containerName : null) ||
          (node.instanceName || node.name)
        if (action.target === 'self') {
          behaviorRegistry.select(node.id, containerId)
        } else if (action.target === 'highlighted') {
          behaviorRegistry.selectHighlighted(containerId)
        } else if (action.target === 'self-and-before') {
          behaviorRegistry.selectSelfAndBefore(node.id, containerId)
        } else if (action.target === 'all') {
          behaviorRegistry.selectAll(containerId)
        } else if (action.target === 'none') {
          behaviorRegistry.selectNone(containerId)
        } else {
          behaviorRegistry.select(action.target, containerId)
        }
      }
      break

    case 'filter':
      // Filter behavior: filter items in container based on input
      if (action.target) {
        // Filter action typically gets the value from the triggering input
        const filterValue = event?.currentTarget instanceof HTMLInputElement
          ? event.currentTarget.value
          : ''
        behaviorRegistry.filter(action.target, filterValue)
      }
      break

    case 'focus':
      // Focus behavior: focus next, focus prev, focus first-empty, focus ComponentName
      if (action.target) {
        // Focus actions are handled by the Segment container or directly via DOM
        // For now, focus actions are signals that the component handles
        // The actual focus logic is in the SegmentContainer component
        if (registry) {
          const targetEntry = getTarget(registry, action.target)
          if (targetEntry) {
            // Try to focus the element via its DOM node
            const element = document.querySelector(`[data-id="${targetEntry.id}"]`) as HTMLElement
            if (element && 'focus' in element) {
              element.focus()
            }
          }
        }
      }
      break

    case 'activate':
      // Activate behavior: set element to 'active' state
      if (action.target === 'self' || action.target === node.name || !action.target) {
        setCurrentState('active')
        // Also set global state by ID so it overrides any 'inactive' from deactivate-siblings
        behaviorRegistry.setState(node.id, 'active')
      } else if (action.target) {
        behaviorRegistry.setState(action.target, 'active')
        if (registry) {
          const targetEntry = getTarget(registry, action.target)
          if (targetEntry) targetEntry.setState('active')
        }
      }
      break

    case 'deactivate':
      // Deactivate behavior: set element to 'inactive' state
      if (action.target === 'self' || action.target === node.name || !action.target) {
        setCurrentState('inactive')
        // Also set global state by ID for consistency with activate
        behaviorRegistry.setState(node.id, 'inactive')
      } else if (action.target) {
        behaviorRegistry.setState(action.target, 'inactive')
        if (registry) {
          const targetEntry = getTarget(registry, action.target)
          if (targetEntry) targetEntry.setState('inactive')
        }
      }
      break

    case 'deactivate-siblings':
      // Deactivate all siblings: set their state to 'inactive'
      // This requires the behavior registry to track sibling relationships
      // Use containerName (not containerId) because that's how items are registered
      {
        const container = containerContext?.containerName || node.name
        behaviorRegistry.deactivateSiblings(node.id, container)
      }
      break

    case 'toggle-state':
      // Toggle between states (e.g., expanded/collapsed for accordions)
      // V9: If states have categories, only cycle within the current state's category
      if (node.states && node.states.length >= 2) {
        const { categoryStates, setCategoryStates } = context

        // Group states by category
        const categories = new Map<string, string[]>()
        const flatStates: string[] = []

        for (const state of node.states) {
          if (state.category) {
            const list = categories.get(state.category) || []
            list.push(state.name)
            categories.set(state.category, list)
          } else {
            flatStates.push(state.name)
          }
        }

        // Handle category-based toggle
        let handled = false
        if (categories.size > 0 && categoryStates && setCategoryStates) {
          // Check which category the current state belongs to (for flat state compatibility)
          // Or cycle through the first category with 2+ states
          for (const [category, stateNames] of categories) {
            if (stateNames.length >= 2) {
              const currentCategoryState = categoryStates[category] || stateNames[0]
              const currentIndex = stateNames.indexOf(currentCategoryState)
              const nextIndex = (currentIndex + 1) % stateNames.length
              setCategoryStates(prev => ({ ...prev, [category]: stateNames[nextIndex] }))
              handled = true
              break // Only toggle one category at a time
            }
          }
        }

        // If not handled by categories, cycle through flat states
        if (!handled && flatStates.length >= 2) {
          const currentIndex = flatStates.indexOf(currentState)
          const nextIndex = (currentIndex + 1) % flatStates.length
          setCurrentState(flatStates[nextIndex])
        }
      } else if (containerContext?.toggleParentState) {
        // If current node doesn't have states, try to toggle parent's state
        // This is used for accordion patterns where Header clicks toggle Section's state
        containerContext.toggleParentState()
      }
      break

    case 'deselect':
      // Deselect behavior: remove selection from element
      if (action.target) {
        const container = action.inContainer || node.name
        if (action.target === 'self') {
          behaviorRegistry.selectNone(container)
        } else if (action.target === 'all' || action.target === 'none') {
          behaviorRegistry.selectNone(container)
        } else {
          // Deselect specific item - for now just clear selection
          behaviorRegistry.selectNone(container)
        }
      }
      break

    case 'clear-selection':
      // Clear all selections in the current container
      behaviorRegistry.selectNone(node.name)
      break

    case 'validate':
      // Validate behavior: trigger validation on target
      // For now, this is a signal that components can listen to
      if (action.target) {
        behaviorRegistry.setState(action.target, 'validating')
        // Actual validation logic would be in the component
      }
      break

    case 'reset':
      // Reset behavior: reset target to initial state
      if (action.target) {
        behaviorRegistry.setState(action.target, 'default')
        if (registry) {
          const targetEntry = getTarget(registry, action.target)
          if (targetEntry) targetEntry.setState('default')
        }
      }
      break
  }
}
