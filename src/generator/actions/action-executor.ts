/**
 * Action Executor Module
 *
 * Executes actions from event handlers.
 * Handles: change, open, close, toggle, assign, page
 */

import type { ActionStatement, Expression, ComponentTemplate, ASTNode } from '../../parser/parser'
import type { BehaviorRegistry } from '../behaviors'
import type { ComponentRegistry } from '../component-registry-context'
import type { OverlayRegistry } from '../overlay-registry-context'
import { evaluateExpression } from '../utils'

/**
 * Container context for highlight/select actions.
 */
export interface ContainerContextInfo {
  containerId: string
  containerName: string
}

/**
 * Context required for action execution.
 */
export interface ActionExecutorContext {
  node: ASTNode
  currentState: string
  setCurrentState: (state: string) => void
  variables: Record<string, string | number | boolean>
  setVariables: React.Dispatch<React.SetStateAction<Record<string, string | number | boolean>>>
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
          const target = registry.getByName(action.target)
          if (target && action.toState) target.setState(action.toState)
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
            const target = registry.getByName(action.target)
            if (target) target.setState('visible')
          }
        }
      }
      break

    case 'close':
      if (action.target) {
        // First: Check if it's an open overlay
        if (overlayRegistry?.isOpen(action.target)) {
          overlayRegistry.close(action.target, action.animation, action.duration)
        } else {
          // Fallback: Library component behavior
          behaviorRegistry.setState(action.target, 'closed')
          if (registry) {
            const target = registry.getByName(action.target)
            if (target) target.setState('hidden')
          }
        }
      } else {
        // No target: close topmost overlay
        overlayRegistry?.close(undefined, action.animation, action.duration)
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
        behaviorRegistry.toggle(action.target)
        if (registry) {
          const target = registry.getByName(action.target)
          if (target) target.toggle()
        }
      }
      break

    case 'assign':
      if (action.target && action.value !== undefined) {
        const actionValue = action.value
        let resolvedValue: unknown
        if (typeof actionValue === 'object' && actionValue !== null && 'type' in actionValue) {
          resolvedValue = evaluateExpression(actionValue as Expression, variables as Record<string, unknown>, event)
        } else {
          resolvedValue = actionValue
        }
        setVariables(prev => ({ ...prev, [action.target!]: resolvedValue as string | number | boolean }))
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
      if (action.target) {
        behaviorRegistry.setState(action.target, 'visible')
        if (registry) {
          const target = registry.getByName(action.target)
          if (target) target.setState('visible')
        }
      }
      break

    case 'hide':
      if (action.target) {
        behaviorRegistry.setState(action.target, 'hidden')
        if (registry) {
          const target = registry.getByName(action.target)
          if (target) target.setState('hidden')
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
          const target = registry.getByName(action.target)
          if (target) {
            // Try to focus the element via its DOM node
            const element = document.querySelector(`[data-id="${target.id}"]`) as HTMLElement
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
      } else if (action.target) {
        behaviorRegistry.setState(action.target, 'active')
        if (registry) {
          const target = registry.getByName(action.target)
          if (target) target.setState('active')
        }
      }
      break

    case 'deactivate':
      // Deactivate behavior: set element to 'inactive' state
      if (action.target === 'self' || action.target === node.name || !action.target) {
        setCurrentState('inactive')
      } else if (action.target) {
        behaviorRegistry.setState(action.target, 'inactive')
        if (registry) {
          const target = registry.getByName(action.target)
          if (target) target.setState('inactive')
        }
      }
      break

    case 'deactivate-siblings':
      // Deactivate all siblings: set their state to 'inactive'
      // This requires the behavior registry to track sibling relationships
      {
        const container = containerContext?.containerId || node.name
        behaviorRegistry.deactivateSiblings(node.id, container)
      }
      break

    case 'toggle-state':
      // Toggle between two states (e.g., expanded/collapsed for accordions)
      // Uses the component's defined states to cycle
      if (node.states && node.states.length >= 2) {
        const stateNames = node.states.map(s => s.name)
        const currentIndex = stateNames.indexOf(currentState)
        const nextIndex = (currentIndex + 1) % stateNames.length
        setCurrentState(stateNames[nextIndex])
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
          const target = registry.getByName(action.target)
          if (target) target.setState('default')
        }
      }
      break
  }
}
