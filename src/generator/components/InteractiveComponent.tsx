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
import type { ASTNode, EventHandler, RuntimeValue } from '../../parser/parser'
import { SYSTEM_STATES } from '../../dsl/properties'
import { useBehaviorRegistry, BehaviorRegistryContext } from '../behaviors'
import { useComponentRegistry } from '../component-registry-hooks'
import { useOverlayRegistry } from '../overlay-registry-hooks'
import { propertiesToStyle } from '../../utils/style-converter'
import { matchesKeyModifier } from '../utils/key-modifiers'
import { executeEventHandler } from '../events'
import { composeConditionalStyles, composeFinalStyle, getConditionalContent } from '../styles'
import { useTemplateRegistry, useContainerContext, ContainerContext, StateOverrideProvider, useStateOverride } from '../contexts'
import { executeAction as executeSharedAction, type ActionExecutorContext } from '../actions/action-executor'
import { useRuntimeVariables } from '../runtime-context'

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
  // Check both by name (component type) and by id (for named instances)
  const context = useContext(BehaviorRegistryContext)
  const stateByName = context?.states.get(node.name)
  const stateById = node.id ? context?.states.get(node.id) : undefined
  // Prefer id-based state (for named instances like "Box named Panel")
  const state = stateById ?? stateByName

  // Check for parent state override (e.g., parent's state collapsed { Content { hidden } })
  // This allows dynamic visibility based on parent's current state
  const parentOverride = useStateOverride(node.name)
  const hasParentHiddenOverride = parentOverride?.hidden === true
  const hasParentVisibleOverride = parentOverride?.visible === true

  const hasHiddenProperty = node.properties.hidden === true

  // Hide if:
  // 1. State is explicitly 'closed'
  // 2. Has 'hidden' property AND state is undefined AND no parent visible override
  //    (parent visible override means the parent's current state wants this child visible)
  // 3. Parent state override sets hidden: true (and no visible override)
  if (state === 'closed' ||
      (hasHiddenProperty && state === undefined && !hasParentVisibleOverride) ||
      (hasParentHiddenOverride && !hasParentVisibleOverride && state !== 'open')) {
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

  // If parent has visible override, ensure hidden is cleared
  if (hasParentVisibleOverride && hasHiddenProperty) {
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

  // Initialize state:
  // 1. If activeState is explicitly set (e.g., Section { collapsed }), use that
  // 2. If there's an explicit 'default' state, use that
  // 3. For states with child overrides (accordion patterns), use 'default' when no activeState
  //    - This ensures Content is visible until explicitly collapsed
  // 4. For states with only properties (toggle patterns), use first custom state
  // 5. Fall back to 'default' if no custom states
  const initialState = useMemo(() => {
    // V8: Use explicitly set activeState from parsing (e.g., Section { collapsed })
    if (node.activeState) return node.activeState
    if (!node.states) return 'default'
    // Check for explicit 'default' state
    const defaultState = node.states.find(s => s.name === 'default' && !s.category)
    if (defaultState) return defaultState.name
    // Check if states have child overrides (accordion pattern)
    // States with children define visibility for slots - don't auto-activate
    const hasChildOverrides = node.states.some(s => s.children && s.children.length > 0)
    if (hasChildOverrides) {
      // Accordion pattern: no initial state means "expanded" (no child overrides)
      return 'default'
    }
    // Toggle pattern: use first non-system state (e.g., 'off' for on/off toggle)
    const firstCustomState = node.states.find(s =>
      !s.category && !SYSTEM_STATES.has(s.name)
    )
    if (firstCustomState) return firstCustomState.name
    return 'default'
  }, [node.states, node.activeState])
  const [localState, setLocalState] = useState(initialState)

  // Get global state from behaviorRegistry (set by "change X to Y" actions)
  // Check by name (e.g., "Status") for singleton components
  const globalStateByName = behaviorRegistry?.getState(node.name)
  // Also check by ID for sibling actions (deactivate-siblings sets state by ID)
  const globalStateById = behaviorRegistry?.getState(node.id)

  // Priority: ID-based state (from deactivate-siblings) > name-based state > local state
  const currentState = (globalStateById && globalStateById !== 'closed')
    ? globalStateById
    : (globalStateByName && globalStateByName !== 'closed')
      ? globalStateByName
      : localState

  // Setter updates only local state - global state is set by actions
  const setCurrentState = useCallback((newState: string) => {
    setLocalState(newState)
  }, [])

  // V9: Initialize category states from node.activeStatesByCategory
  const initialCategoryStates = useMemo(() => {
    const states: Record<string, string> = {}
    // First, set defaults for each category (first state in category)
    if (node.states) {
      const seenCategories = new Set<string>()
      for (const state of node.states) {
        if (state.category && !seenCategories.has(state.category)) {
          states[state.category] = state.name
          seenCategories.add(state.category)
        }
      }
    }
    // Then override with explicitly set states from parsing
    if (node.activeStatesByCategory) {
      Object.assign(states, node.activeStatesByCategory)
    }
    return states
  }, [node.states, node.activeStatesByCategory])
  const [categoryStates, setCategoryStates] = useState(initialCategoryStates)

  // Get runtime variables from context (global tokens like $query)
  const { variables: runtimeVariables, setVariable: setRuntimeVariable } = useRuntimeVariables()

  // Initialize local variables from node.variables
  const initialVars: Record<string, RuntimeValue> = {}
  if (node.variables) {
    for (const v of node.variables) {
      initialVars[v.name] = v.value
    }
  }
  const [localVariables, setLocalVariables] = useState(initialVars)

  // Merge runtime and local variables (local takes precedence)
  const variables = useMemo(() => ({
    ...runtimeVariables,
    ...localVariables
  }), [runtimeVariables, localVariables])

  // setVariables that updates both runtime and local variables
  // All variable updates go to runtime context so child components can see them
  // Supports RuntimeValue (primitives + objects for Master-Detail pattern)
  const setVariables: React.Dispatch<React.SetStateAction<Record<string, RuntimeValue>>> = useCallback((action) => {
    if (typeof action === 'function') {
      // For function updates, we need to handle both contexts
      const updates = action(localVariables)
      for (const [key, value] of Object.entries(updates)) {
        // Always update runtime variable so child components see the change
        setRuntimeVariable(key, value)
      }
      setLocalVariables(action)
    } else {
      // For direct updates
      for (const [key, value] of Object.entries(action)) {
        // Always update runtime variable so child components see the change
        setRuntimeVariable(key, value)
      }
      setLocalVariables(prev => ({ ...prev, ...action }))
    }
  }, [localVariables, setRuntimeVariable])

  // Calculate style for current (non-system) state
  // V9: Merge styles from flat state AND all active category states
  const stateStyle = useMemo(() => {
    if (!node.states) return baseStyle
    let composedStyle = { ...baseStyle }

    // Apply flat state style if active
    const flatStateConfig = node.states.find(s => s.name === currentState && !s.category && !SYSTEM_STATES.has(s.name))
    if (flatStateConfig) {
      composedStyle = { ...composedStyle, ...propertiesToStyle(flatStateConfig.properties, node.children.length > 0, node.name) }
    }

    // Apply category state styles
    for (const [category, stateName] of Object.entries(categoryStates)) {
      const categoryStateConfig = node.states.find(s => s.category === category && s.name === stateName)
      if (categoryStateConfig) {
        composedStyle = { ...composedStyle, ...propertiesToStyle(categoryStateConfig.properties, node.children.length > 0, node.name) }
      }
    }

    return composedStyle
  }, [node.states, node.children.length, currentState, categoryStates, baseStyle, node.name])

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
    // V9: Include category state management
    categoryStates,
    setCategoryStates,
    variables: variables as Record<string, RuntimeValue>,
    setVariables,
    registry,
    behaviorRegistry,
    overlayRegistry,
    templateRegistry,
    containerContext: containerContext ? {
      containerId: containerContext.containerId,
      containerName: containerContext.containerName,
      // Include toggle function for accordion patterns where children toggle parent state
      toggleParentState: containerContext.toggleParentState,
    } : null,
  }), [node, currentState, categoryStates, variables, registry, behaviorRegistry, overlayRegistry, templateRegistry, containerContext])

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
      if (matchesKeyModifier(e, handler.key)) {
        executeHandler(handler, e)
        break
      }
    }
  }, [keyDownHandlers, executeHandler])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    for (const handler of keyUpHandlers) {
      if (matchesKeyModifier(e, handler.key)) {
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
    let style = { ...baseComposed, ...systemStateStyle, ...behaviorStateStyle }

    // Handle visibility toggle:
    // When toggle sets state to 'open', show the element (override hidden)
    // When toggle sets state to 'closed', hide the element
    const toggleState = globalStateByName || globalStateById
    if (toggleState === 'open') {
      // Override hidden by removing display: none
      style = { ...style, display: style.display === 'none' ? 'flex' : style.display }
    } else if (toggleState === 'closed') {
      // Component was toggled closed (after being toggled open)
      style = { ...style, display: 'none' }
    }

    return style
  }, [highlightStyle, stateStyle, conditionalStyle, hoverStyle, isHovered, systemStateStyle, behaviorStateStyle, globalStateByName, globalStateById])

  // State content: Get _content from active state
  const stateContent = useMemo(() => {
    if (!node.states) return null
    const activeState = node.states.find(s => s.name === currentState && !s.category)
    if (activeState?.properties._content) {
      return String(activeState.properties._content)
    }
    return null
  }, [node.states, currentState])

  // Conditional content: Get _content from conditional properties
  const conditionalContent = useMemo(() => {
    return getConditionalContent(node.conditionalProperties, variables as Record<string, unknown>)
  }, [node.conditionalProperties, variables])

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

  // Toggle state function for children (accordion patterns)
  // When a child calls toggle-state and doesn't have its own states,
  // it can use this function to toggle the parent's state
  const toggleParentState = useCallback(() => {
    if (!node.states || node.states.length < 2) return

    // Get flat states (non-category states)
    const flatStates = node.states
      .filter(s => !s.category && !SYSTEM_STATES.has(s.name))
      .map(s => s.name)

    if (flatStates.length < 2) return

    const currentIndex = flatStates.indexOf(currentState)
    const nextIndex = (currentIndex + 1) % flatStates.length
    setCurrentState(flatStates[nextIndex])
  }, [node.states, currentState, setCurrentState])

  // Container context for children
  const containerContextValue = useMemo(() => ({
    containerId: node.id,
    containerName: node.instanceName || node.name,
    // State toggle support for accordion patterns
    parentStates: node.states,
    parentCurrentState: currentState,
    toggleParentState
  }), [node.id, node.instanceName, node.name, node.states, currentState, toggleParentState])

  // Determine what content to render:
  // Priority: state content > conditional content > original children
  // - If state has _content, use that (state overrides)
  // - If conditional has _content, use that (conditional based on variables)
  // - Otherwise use original children
  const renderedContent = stateContent !== null
    ? stateContent
    : conditionalContent !== null
      ? conditionalContent
      : children

  const wrappedChildren = renderedContent ? (
    <StateOverrideProvider states={node.states} currentState={currentState}>
      <ContainerContext.Provider value={containerContextValue}>
        {renderedContent}
      </ContainerContext.Provider>
    </StateOverrideProvider>
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

