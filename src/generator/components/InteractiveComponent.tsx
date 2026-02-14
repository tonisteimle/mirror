/**
 * InteractiveComponent
 *
 * Handles interactive behavior for components with:
 * - State management (states, variables)
 * - Event handlers (onclick, onhover, onkeydown, etc.)
 * - System states (hover, focus, active, disabled)
 * - Behavior states (highlighted, selected)
 * - Conditional properties
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, useContext } from 'react'
import type { ASTNode, EventHandler } from '../../parser/parser'
import { SYSTEM_STATES } from '../../dsl/properties'
import { useBehaviorRegistry, BehaviorRegistryContext } from '../behaviors'
import { useComponentRegistry } from '../component-registry-hooks'
import { useOverlayRegistry } from '../overlay-registry-hooks'
import { propertiesToStyle } from '../../utils/style-converter'
import { matchesKeyModifier } from '../utils/key-modifiers'
import { executeEventHandler } from '../events'
import { composeConditionalStyles, composeFinalStyle } from '../styles'
import { useTemplateRegistry, useContainerContext, ContainerContext } from '../contexts'
import { executeAction as executeSharedAction, type ActionExecutorContext } from '../actions/action-executor'

// ============================================
// Props Interfaces
// ============================================

export interface InteractiveComponentProps {
  node: ASTNode
  baseStyle: React.CSSProperties
  hoverStyle: React.CSSProperties
  highlightStyle: React.CSSProperties
  children: React.ReactNode
  inspectMode?: boolean
  onInspectHover?: () => void
  onInspectLeave?: () => void
  onInspectClick?: (e: React.MouseEvent) => void
}

// ============================================
// ToggleableNode - handles visibility state
// ============================================

export interface ToggleableNodeProps {
  node: ASTNode
  options: { inspectMode?: boolean }
  renderNode: (node: ASTNode, options: { inspectMode?: boolean }) => React.ReactNode
}

export function ToggleableNode({ node, options, renderNode }: ToggleableNodeProps) {
  // Get raw state from context - undefined means not toggled yet
  const context = useContext(BehaviorRegistryContext)
  const state = context?.states.get(node.name)
  const hasHiddenProperty = node.properties.hidden === true

  // Hide if:
  // 1. State is explicitly 'closed'
  // 2. Has 'hidden' property AND state is undefined (initial state)
  if (state === 'closed' || (hasHiddenProperty && state === undefined)) {
    return null
  }

  // If state is 'open', render without the hidden property
  if (state === 'open' && hasHiddenProperty) {
    const nodeWithoutHidden = {
      ...node,
      properties: { ...node.properties, hidden: false }
    }
    return <>{renderNode(nodeWithoutHidden, options)}</>
  }

  return <>{renderNode(node, options)}</>
}

// ============================================
// InteractiveComponent
// ============================================

export const InteractiveComponent = React.memo(function InteractiveComponent({
  node,
  baseStyle,
  hoverStyle,
  highlightStyle,
  children,
  inspectMode,
  onInspectHover,
  onInspectLeave,
  onInspectClick,
}: InteractiveComponentProps) {
  const registry = useComponentRegistry()
  const behaviorRegistry = useBehaviorRegistry()
  const overlayRegistry = useOverlayRegistry()
  const templateRegistry = useTemplateRegistry()
  const containerContext = useContainerContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref for executeHandler to avoid re-registering click-outside listener on every state change
  const executeHandlerRef = useRef<(handler: EventHandler, event?: React.SyntheticEvent) => void>(() => {})
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isActive, setIsActive] = useState(false)

  // Initialize state: always start with 'default' unless there's an explicit 'default' state
  // Behavior states like 'highlighted', 'selected', 'open' should only activate via actions
  const initialState = node.states?.find(s => s.name === 'default')?.name || 'default'
  const [currentState, setCurrentState] = useState(initialState)

  // Initialize variables from node.variables
  const initialVars: Record<string, string | number | boolean> = {}
  if (node.variables) {
    for (const v of node.variables) {
      initialVars[v.name] = v.value
    }
  }
  const [variables, setVariables] = useState(initialVars)

  // Calculate style for current (non-system) state
  const stateStyle = useMemo(() => {
    if (!node.states) return baseStyle
    const stateConfig = node.states.find(s => s.name === currentState && !SYSTEM_STATES.has(s.name))
    if (!stateConfig) return baseStyle
    return { ...baseStyle, ...propertiesToStyle(stateConfig.properties, node.children.length > 0, node.name) }
  }, [node.states, node.children.length, currentState, baseStyle, node.name])

  // Calculate system state styles (hover, focus, active, disabled)
  // Priority order: hover < focus < active < disabled
  const systemStateStyle = useMemo(() => {
    if (!node.states) return {}
    let style: React.CSSProperties = {}

    // Check disabled first (overrides everything)
    const disabledState = node.states.find(s => s.name === 'disabled')
    if (disabledState && node.properties.disabled) {
      return propertiesToStyle(disabledState.properties, node.children.length > 0, node.name)
    }

    // Hover state (lowest priority)
    if (isHovered) {
      const hoverState = node.states.find(s => s.name === 'hover')
      if (hoverState) {
        style = { ...style, ...propertiesToStyle(hoverState.properties, node.children.length > 0, node.name) }
      }
    }

    // Focus state
    if (isFocused) {
      const focusState = node.states.find(s => s.name === 'focus')
      if (focusState) {
        style = { ...style, ...propertiesToStyle(focusState.properties, node.children.length > 0, node.name) }
      }
    }

    // Active state (mouse down) - highest priority among interactive states
    if (isActive) {
      const activeState = node.states.find(s => s.name === 'active')
      if (activeState) {
        style = { ...style, ...propertiesToStyle(activeState.properties, node.children.length > 0, node.name) }
      }
    }

    return style
  }, [node.states, node.properties.disabled, node.children.length, node.name, isHovered, isFocused, isActive])

  // Check if this component is highlighted or selected in its parent container
  const parentContainerName = containerContext?.containerName
  const isHighlighted = parentContainerName
    ? behaviorRegistry.isItemHighlighted(node.id, parentContainerName)
    : false
  const isSelected = parentContainerName
    ? behaviorRegistry.isItemSelected(node.id, parentContainerName)
    : false

  // Behavior state styles (highlight, select)
  const behaviorStateStyle = useMemo((): React.CSSProperties => {
    let style: React.CSSProperties = {}

    if (isHighlighted) {
      const highlightState = node.states?.find(s => s.name === 'highlight')
      if (highlightState) {
        style = { ...style, ...propertiesToStyle(highlightState.properties, node.children.length > 0, node.name) }
      } else {
        style = { ...style, backgroundColor: 'rgba(59, 130, 246, 0.1)' }
      }
    }

    if (isSelected) {
      const selectState = node.states?.find(s => s.name === 'select')
      if (selectState) {
        style = { ...style, ...propertiesToStyle(selectState.properties, node.children.length > 0, node.name) }
      } else {
        style = { ...style, backgroundColor: 'rgba(59, 130, 246, 0.2)' }
      }
    }

    return style
  }, [isHighlighted, isSelected, node.states, node.children.length, node.name])

  // Register this item with its parent container (for highlight next/prev)
  useEffect(() => {
    if (containerContext && node.id) {
      behaviorRegistry.registerContainerItem(containerContext.containerName, node.id)
    }
    // Cleanup: unregister item when component unmounts
    return () => {
      if (containerContext && node.id) {
        behaviorRegistry.unregisterContainerItem(containerContext.containerName, node.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerContext?.containerName, node.id])

  // Cleanup debounce and delay timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
      }
    }
  }, [])

  // Build action execution context
  const actionContext: ActionExecutorContext = useMemo(() => ({
    node,
    currentState,
    setCurrentState,
    variables,
    setVariables,
    registry,
    behaviorRegistry,
    overlayRegistry,
    templateRegistry,
    containerContext: containerContext ? {
      containerId: containerContext.containerId,
      containerName: containerContext.containerName,
    } : null,
  }), [node, currentState, variables, registry, behaviorRegistry, overlayRegistry, templateRegistry, containerContext])

  // Execute a single action using shared executor
  const executeAction = useCallback((action: Parameters<typeof executeSharedAction>[0], event?: React.SyntheticEvent) => {
    executeSharedAction(action, actionContext, event)
  }, [actionContext])

  // Execute handler with conditionals
  const executeHandler = useCallback((handler: EventHandler, event?: React.SyntheticEvent) => {
    executeEventHandler(handler, variables as Record<string, unknown>, executeAction, event)
  }, [variables, executeAction])

  // Keep ref in sync for stable click-outside listener
  useEffect(() => {
    executeHandlerRef.current = executeHandler
  })

  // Pre-compute event handler map for O(1) lookup
  const eventHandlerMap = useMemo(() => {
    const map = new Map<string, EventHandler>()
    if (node.eventHandlers) {
      for (const handler of node.eventHandlers) {
        map.set(handler.event, handler)
      }
    }
    return map
  }, [node.eventHandlers])

  // Separate list for keyboard handlers
  const keyDownHandlers = useMemo(() => {
    return node.eventHandlers?.filter(h => h.event === 'onkeydown') || []
  }, [node.eventHandlers])

  const keyUpHandlers = useMemo(() => {
    return node.eventHandlers?.filter(h => h.event === 'onkeyup') || []
  }, [node.eventHandlers])

  // Click-outside detection - use ref to avoid re-registering listener on state changes
  const clickOutsideHandler = eventHandlerMap.get('onclick-outside')
  useEffect(() => {
    if (!clickOutsideHandler) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        executeHandlerRef.current(clickOutsideHandler)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [clickOutsideHandler])

  // Event handlers
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (inspectMode) {
      e.stopPropagation()
      onInspectClick?.(e)
      return
    }
    const handler = eventHandlerMap.get('onclick')
    if (handler) {
      e.stopPropagation()
      executeHandler(handler, e)
    }
  }, [inspectMode, onInspectClick, eventHandlerMap, executeHandler])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true)
    if (inspectMode) onInspectHover?.()
    const handler = eventHandlerMap.get('onhover')
    if (handler) executeHandler(handler, e)
  }, [inspectMode, onInspectHover, eventHandlerMap, executeHandler])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (inspectMode) onInspectLeave?.()
  }, [inspectMode, onInspectLeave])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const handler = eventHandlerMap.get('onchange')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const handler = eventHandlerMap.get('oninput')
    if (!handler) return

    if (handler.debounce && handler.debounce > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        executeHandler(handler, e)
        debounceTimerRef.current = null
      }, handler.debounce)
    } else {
      executeHandler(handler, e)
    }
  }, [eventHandlerMap, executeHandler])

  const handleFocus = useCallback((e: React.FocusEvent) => {
    setIsFocused(true)
    const handler = eventHandlerMap.get('onfocus')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    setIsFocused(false)
    const handler = eventHandlerMap.get('onblur')
    if (!handler) return

    if (handler.delay && handler.delay > 0) {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current)
      }
      delayTimerRef.current = setTimeout(() => {
        executeHandler(handler, e)
        delayTimerRef.current = null
      }, handler.delay)
    } else {
      executeHandler(handler, e)
    }
  }, [eventHandlerMap, executeHandler])

  const handleMouseDown = useCallback(() => {
    setIsActive(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsActive(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    for (const handler of keyDownHandlers) {
      if (matchesKeyModifier(e, handler.modifier)) {
        executeHandler(handler, e)
        break
      }
    }
  }, [keyDownHandlers, executeHandler])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    for (const handler of keyUpHandlers) {
      if (matchesKeyModifier(e, handler.modifier)) {
        executeHandler(handler, e)
        break
      }
    }
  }, [keyUpHandlers, executeHandler])

  // Conditional style
  const conditionalStyle = useMemo(() => {
    return composeConditionalStyles(node.conditionalProperties, variables as Record<string, unknown>)
  }, [node.conditionalProperties, variables])

  // Final style
  const finalStyle = useMemo(() => {
    const baseComposed = composeFinalStyle(highlightStyle, stateStyle, conditionalStyle, hoverStyle, isHovered)
    return { ...baseComposed, ...systemStateStyle, ...behaviorStateStyle }
  }, [highlightStyle, stateStyle, conditionalStyle, hoverStyle, isHovered, systemStateStyle, behaviorStateStyle])

  // Event existence checks
  const hasChangeEvent = eventHandlerMap.has('onchange')
  const hasInputEvent = eventHandlerMap.has('oninput')
  const hasFocusEvent = eventHandlerMap.has('onfocus')
  const hasBlurEvent = eventHandlerMap.has('onblur')
  const hasKeyDownEvent = keyDownHandlers.length > 0
  const hasKeyUpEvent = keyUpHandlers.length > 0

  // System state checks
  const hasFocusState = node.states?.some(s => s.name === 'focus') ?? false
  const hasActiveState = node.states?.some(s => s.name === 'active') ?? false
  const needsFocus = hasFocusState || hasKeyDownEvent || hasKeyUpEvent

  // Container context for children
  const containerContextValue = useMemo(() => ({
    containerId: node.id,
    containerName: node.instanceName || node.name
  }), [node.id, node.instanceName, node.name])

  const wrappedChildren = children ? (
    <ContainerContext.Provider value={containerContextValue}>
      {children}
    </ContainerContext.Provider>
  ) : null

  return (
    <div
      ref={containerRef}
      data-id={node.id}
      data-state={currentState}
      data-highlighted={isHighlighted || undefined}
      data-selected={isSelected || undefined}
      className={node.name}
      style={finalStyle}
      tabIndex={needsFocus ? 0 : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={hasActiveState ? handleMouseDown : undefined}
      onMouseUp={hasActiveState ? handleMouseUp : undefined}
      onChange={hasChangeEvent ? handleChange as React.ChangeEventHandler<HTMLDivElement> : undefined}
      onInput={hasInputEvent ? handleInput as React.FormEventHandler<HTMLDivElement> : undefined}
      onFocus={(hasFocusEvent || hasFocusState) ? handleFocus : undefined}
      onBlur={(hasBlurEvent || hasFocusState) ? handleBlur : undefined}
      onKeyDown={hasKeyDownEvent ? handleKeyDown : undefined}
      onKeyUp={hasKeyUpEvent ? handleKeyUp : undefined}
    >
      {wrappedChildren}
    </div>
  )
})

