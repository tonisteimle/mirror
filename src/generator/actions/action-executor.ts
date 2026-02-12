/**
 * Action Executor Module
 *
 * Executes actions from event handlers.
 * Handles: change, open, close, toggle, assign, page
 */

import type { ActionStatement, Expression, ComponentTemplate, ASTNode } from '../../parser/parser'
import type { BehaviorRegistry } from '../behaviors'
import type { ComponentRegistry } from '../component-registry'
import type { OverlayRegistry } from '../overlay-registry'
import { evaluateExpression } from '../utils'

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
    templateRegistry
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
  }
}
