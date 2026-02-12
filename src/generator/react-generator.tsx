import React, { useState, useCallback, useMemo, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ASTNode, EventHandler, ActionStatement, Conditional, Expression, ComponentTemplate } from '../parser/parser'
import { INTERNAL_NODES } from '../constants'
import { SYSTEM_STATES } from '../dsl/properties'
import { sanitizeTextContent } from '../utils/sanitize'
import { getBehaviorHandler, useBehaviorRegistry, BehaviorRegistryProvider, BehaviorRegistryContext } from './behaviors/registry'
import { groupChildrenBySlot } from './behaviors/index'
import { ComponentRegistryProvider, useComponentRegistry } from './component-registry'
import { propertiesToStyle, extractHoverStyles, hasHoverStyles } from '../utils/style-converter'
import { toPascalCase, evaluateExpression } from './utils'
import { RuntimeVariableProvider, useRuntimeVariables } from './runtime-context'
import { OverlayRegistryProvider, useOverlayRegistry } from './overlay-registry'
import { OverlayPortal } from './overlay-portal'
import { HoverableDiv, SafeLibraryRenderer, renderDynamicIcon } from './components'
import { composeConditionalStyles, composeFinalStyle, createHighlightStyle, getAnimationStyle } from './styles'
import {
  isInputPrimitive,
  isTextareaPrimitive,
  isLinkPrimitive,
  isIconComponent,
  isHeadingPrimitive,
  renderInput,
  renderTextarea,
  renderLink,
  renderIcon,
  renderImageElement,
  renderHeading,
  getImageSrc
} from './primitives'
import { executeEventHandler } from './events'
import { ConditionalRenderer, IteratorRenderer } from './renderers'
import type { GenerateOptions } from './renderers/types'

// Re-export for use in Preview
export { BehaviorRegistryProvider, ComponentRegistryProvider, RuntimeVariableProvider, OverlayRegistryProvider, OverlayPortal }

// ============================================
// Template Registry Context
// ============================================

const TemplateRegistryContext = createContext<Map<string, ComponentTemplate> | null>(null)

export function TemplateRegistryProvider({
  registry,
  children
}: {
  registry: Map<string, ComponentTemplate>
  children: ReactNode
}) {
  return (
    <TemplateRegistryContext.Provider value={registry}>
      {children}
    </TemplateRegistryContext.Provider>
  )
}

export function useTemplateRegistry() {
  return useContext(TemplateRegistryContext)
}

// Helper: Convert ComponentTemplate to ASTNode
function templateToNode(name: string, template: ComponentTemplate): ASTNode {
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

// ============================================
// Code Generation (for export)
// ============================================

export interface RenderedComponent {
  element: React.ReactNode
  code: string
}

export function generateReactCode(nodes: ASTNode[], indent = 0): string {
  const spaces = '  '.repeat(indent)
  let code = ''

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.name === INTERNAL_NODES.TEXT) {
      // Apply text properties (col, size, etc.)
      const textStyle = propertiesToStyle(node.properties, false, node.name)
      const hasTextStyle = Object.keys(textStyle).length > 0
      // Check if next node is also _text - if so, add space
      const nextNode = nodes[i + 1]
      const addSpace = nextNode && nextNode.name === INTERNAL_NODES.TEXT ? ' ' : ''
      if (hasTextStyle) {
        const textStyleStr = JSON.stringify(textStyle, null, 2)
          .split('\n')
          .map((line, idx) => (idx === 0 ? line : spaces + '  ' + line))
          .join('\n')
        code += `${spaces}<span style={${textStyleStr}}>${sanitizeTextContent(node.content)}</span>${addSpace}\n`
      } else {
        code += `${spaces}<span>${sanitizeTextContent(node.content)}</span>${addSpace}\n`
      }
      continue
    }

    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
    const hasTextChildren = node.children.length > 0 &&
      node.children.some(child => child.name === INTERNAL_NODES.TEXT)
    const style = propertiesToStyle(node.properties, hasRealChildren, node.name)

    const styleStr = JSON.stringify(style, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : spaces + '    ' + line))
      .join('\n')
    const hasContent = node.content !== undefined
    const iconName = node.properties.icon as string | undefined

    if (hasRealChildren || hasTextChildren) {
      code += `${spaces}<div className="${node.name}" style={${styleStr}}>\n`
      if (iconName) {
        code += `${spaces}  <${toPascalCase(iconName)} size={20} />\n`
      }
      code += generateReactCode(node.children, indent + 1)
      code += `${spaces}</div>\n`
    } else if (hasContent || iconName) {
      code += `${spaces}<div className="${node.name}" style={${styleStr}}>`
      if (iconName) {
        code += `<${toPascalCase(iconName)} size={20} />`
      }
      if (hasContent) {
        // Use JSON.stringify to safely escape content for JSX
        code += `{${JSON.stringify(node.content)}}`
      }
      code += `</div>\n`
    } else {
      code += `${spaces}<div className="${node.name}" style={${styleStr}} />\n`
    }
  }

  return code
}

// ============================================
// InteractiveComponent
// ============================================

interface InteractiveComponentProps {
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
// Toggleable Node - handles visibility state from behaviorRegistry
// ============================================

// Wrapper component for nodes that can be toggled by name
interface ToggleableNodeProps {
  node: ASTNode
  options: GenerateOptions
  renderNode: (node: ASTNode, options: GenerateOptions) => React.ReactNode
}

function ToggleableNode({ node, options, renderNode }: ToggleableNodeProps) {
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

const InteractiveComponent = React.memo(function InteractiveComponent({
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
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isActive, setIsActive] = useState(false)

  // Initialize state from node.states (exclude system states from initial state)
  const initialState = node.states?.find(s => !SYSTEM_STATES.has(s.name))?.name || 'default'
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

  // Execute a single action
  const executeAction = useCallback((action: ActionStatement, event?: React.SyntheticEvent) => {
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
    }
  }, [node.name, node.states, currentState, registry, behaviorRegistry, overlayRegistry, templateRegistry, variables])

  // Execute handler with conditionals (using extracted executeEventHandler)
  const executeHandler = useCallback((handler: EventHandler, event?: React.SyntheticEvent) => {
    executeEventHandler(handler, variables as Record<string, unknown>, executeAction, event)
  }, [variables, executeAction])

  // Pre-compute event handler map for O(1) lookup instead of O(n) find()
  const eventHandlerMap = useMemo(() => {
    const map = new Map<string, EventHandler>()
    if (node.eventHandlers) {
      for (const handler of node.eventHandlers) {
        map.set(handler.event, handler)
      }
    }
    return map
  }, [node.eventHandlers])

  // Event handlers using pre-computed map
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
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  const handleFocus = useCallback((e: React.FocusEvent) => {
    setIsFocused(true)
    const handler = eventHandlerMap.get('onfocus')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    setIsFocused(false)
    const handler = eventHandlerMap.get('onblur')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsActive(true)
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsActive(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const handler = eventHandlerMap.get('onkeydown')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    const handler = eventHandlerMap.get('onkeyup')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  // Conditional style (using extracted style-composer)
  const conditionalStyle = useMemo(() => {
    return composeConditionalStyles(node.conditionalProperties, variables as Record<string, unknown>)
  }, [node.conditionalProperties, variables])

  // Final style (using extracted style-composer)
  // System state styles are applied on top of everything else
  const finalStyle = useMemo(() => {
    const baseComposed = composeFinalStyle(highlightStyle, stateStyle, conditionalStyle, hoverStyle, isHovered)
    return { ...baseComposed, ...systemStateStyle }
  }, [highlightStyle, stateStyle, conditionalStyle, hoverStyle, isHovered, systemStateStyle])

  // Use pre-computed map for O(1) event existence checks
  const hasChangeEvent = eventHandlerMap.has('onchange')
  const hasInputEvent = eventHandlerMap.has('oninput')
  const hasFocusEvent = eventHandlerMap.has('onfocus')
  const hasBlurEvent = eventHandlerMap.has('onblur')
  const hasKeyDownEvent = eventHandlerMap.has('onkeydown')
  const hasKeyUpEvent = eventHandlerMap.has('onkeyup')

  // Check for system states that require specific event handlers
  const hasFocusState = node.states?.some(s => s.name === 'focus') ?? false
  const hasActiveState = node.states?.some(s => s.name === 'active') ?? false

  return (
    <div
      data-id={node.id}
      data-state={currentState}
      className={node.name}
      style={finalStyle}
      tabIndex={hasFocusState ? 0 : undefined}
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
      {children}
    </div>
  )
})

function needsInteractiveComponent(node: ASTNode): boolean {
  return Boolean(
    (node.states && node.states.length > 0) ||
    (node.variables && node.variables.length > 0) ||
    (node.eventHandlers && node.eventHandlers.length > 0) ||
    (node.conditionalProperties && node.conditionalProperties.length > 0)
  )
}

// ============================================
// Library Component Renderer
// ============================================

interface LibraryComponentRendererProps {
  node: ASTNode
  options: GenerateOptions
}

function LibraryComponentRenderer({ node, options }: LibraryComponentRendererProps) {
  return (
    <SafeLibraryRenderer node={node}>
      <LibraryComponentRendererInner node={node} options={options} />
    </SafeLibraryRenderer>
  )
}

function LibraryComponentRendererInner({ node, options }: LibraryComponentRendererProps) {
  const behaviorRegistry = useBehaviorRegistry()
  // Use _libraryType for handler lookup (e.g., "Dialog" for "SettingsDialog as Dialog")
  const libraryType = node._libraryType || node.name
  const handler = getBehaviorHandler(libraryType)

  if (!handler) {
    // No behavior handler - render as styled div with children
    // This handles library components like Card, Badge, Button, etc. that don't need special behavior
    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
    const style = propertiesToStyle(node.properties, hasRealChildren, node.name, node._libraryType)

    // Text library type renders as span (inline element)
    if (node._libraryType === 'Text') {
      const textContent = node.children
        .filter(child => child.name === INTERNAL_NODES.TEXT)
        .map(child => child.content)
        .join('')
      return <span key={node.id} data-id={node.id} className={node.name} style={style}>{textContent || generateReactElement(node.children, options)}</span>
    }

    // Render children or content (content is used when children is empty)
    const renderContent = () => {
      if (node.children.length > 0) {
        return node.children.map(child => generateReactElement([child], options))
      }
      // Use content as text if no children
      return node.content ? sanitizeTextContent(node.content) : null
    }

    // Check if the library component needs interactive behavior (e.g., onclick handlers)
    if (needsInteractiveComponent(node)) {
      const hoverStyles = hasHoverStyles(node.properties) ? extractHoverStyles(node.properties) : {}
      const highlightStyle = style  // Library components don't use inspect mode styling here
      return (
        <InteractiveComponent
          key={node.id}
          node={node}
          baseStyle={style}
          hoverStyle={hoverStyles}
          highlightStyle={highlightStyle}
        >
          {renderContent()}
        </InteractiveComponent>
      )
    }

    return (
      <div key={node.id} data-id={node.id} className={node.name} style={style}>
        {renderContent()}
      </div>
    )
  }

  const renderFn = (childNode: ASTNode, opts?: { skipLibraryHandling?: boolean }) => {
    if (opts?.skipLibraryHandling) {
      return generateReactElementWithoutLibrary([childNode], options)
    }
    return generateReactElement([childNode], options)
  }

  const slots = groupChildrenBySlot(node)
  return handler.render(node, slots, renderFn, behaviorRegistry)
}

// ============================================
// Shared Node Rendering Helpers
// ============================================

interface NodeRenderContext {
  node: ASTNode
  style: React.CSSProperties
  highlightStyle: React.CSSProperties
  iconName: string | undefined
  iconSize: number
  iconColor: string
  imageSrc: string | undefined
  imageElement: React.JSX.Element | null
  nodeHasHover: boolean
  hoverStyles: React.CSSProperties
  handleMouseEnter: (() => void) | undefined
  handleMouseLeave: (() => void) | undefined
  handleClick: ((e: React.MouseEvent) => void) | undefined
}

function prepareNodeContext(
  node: ASTNode,
  options: GenerateOptions
): NodeRenderContext {
  const { onHover, onClick, hoveredId, selectedId, inspectMode } = options

  // Only count as "hasChildren" if there are non-text children
  // Text-only content (_text nodes) doesn't need flex layout
  const hasRealChildren = node.children.length > 0 &&
    node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
  const baseStyle = propertiesToStyle(node.properties, hasRealChildren, node.name, node._libraryType)
  let style = baseStyle

  // If parent is stacked, child occupies same grid cell (stacking effect)
  if (options.parentStacked) {
    style = { ...style, gridArea: '1 / 1' }
  }

  // Apply continuous animation if defined
  if (node.continuousAnimation) {
    const animStyle = getAnimationStyle(node.continuousAnimation)
    style = { ...style, ...animStyle }
  }

  // Apply show animation for initially visible elements
  if (node.showAnimation && !node.properties.hidden) {
    const animStyle = getAnimationStyle(node.showAnimation)
    style = { ...style, ...animStyle }
  }

  const isHovered = Boolean(inspectMode && hoveredId === node.id)
  const isSelected = Boolean(selectedId === node.id)
  const highlightStyle = createHighlightStyle(style, isHovered, isSelected, inspectMode ?? false)

  const iconName = node.properties.icon as string | undefined
  const iconSize = typeof node.properties.size === 'number' ? node.properties.size : 20
  const iconColor = typeof node.properties.col === 'string' ? node.properties.col : 'currentColor'

  const imageSrc = getImageSrc(node)
  const imageElement = renderImageElement(node)

  const nodeHasHover = hasHoverStyles(node.properties)
  const hoverStyles = nodeHasHover ? extractHoverStyles(node.properties) : {}

  const handleMouseEnter = inspectMode ? () => onHover?.(node.id) : undefined
  const handleMouseLeave = inspectMode ? () => onHover?.(null) : undefined
  const handleClick = inspectMode ? (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(node.id)
  } : undefined

  return {
    node,
    style,
    highlightStyle,
    iconName,
    iconSize,
    iconColor,
    imageSrc,
    imageElement,
    nodeHasHover,
    hoverStyles,
    handleMouseEnter,
    handleMouseLeave,
    handleClick
  }
}

function renderBasicElement(
  ctx: NodeRenderContext,
  children: React.ReactNode
): React.JSX.Element {
  const { node, highlightStyle, iconName, iconSize, iconColor, imageElement, nodeHasHover, hoverStyles, handleMouseEnter, handleMouseLeave, handleClick } = ctx

  if (nodeHasHover) {
    return (
      <HoverableDiv
        key={node.id}
        dataId={node.id}
        className={node.name}
        baseStyle={highlightStyle}
        hoverStyle={hoverStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {imageElement}
        {renderDynamicIcon(iconName, iconSize, iconColor)}
        {children}
      </HoverableDiv>
    )
  }

  return (
    <div
      key={node.id}
      data-id={node.id}
      className={node.name}
      style={highlightStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {imageElement}
      {renderDynamicIcon(iconName, iconSize, iconColor)}
      {children}
    </div>
  )
}

function generateReactElementWithoutLibrary(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  return nodes.map((node, index) => {
    if (node.name === INTERNAL_NODES.TEXT) {
      // Apply text properties (col, size, etc.)
      const textStyle = propertiesToStyle(node.properties, false, node.name)
      const span = <span key={node.id} style={textStyle}>{sanitizeTextContent(node.content)}</span>

      // Add space between consecutive _text nodes
      const nextNode = nodes[index + 1]
      if (nextNode && nextNode.name === INTERNAL_NODES.TEXT) {
        return <React.Fragment key={node.id}>{span}{' '}</React.Fragment>
      }
      return span
    }

    const ctx = prepareNodeContext(node, options)
    const { iconName } = ctx

    // Pass parentStacked to direct children only if this node has stacked layout
    // Reset parentStacked for non-stacked nodes to prevent propagation to grandchildren
    const childOptions = node.properties.stacked
      ? { ...options, parentStacked: true }
      : { ...options, parentStacked: undefined }
    const children = node.children.length > 0
      ? generateReactElementWithoutLibrary(node.children, childOptions)
      : (ctx.imageSrc ? null : node.content)

    // Primitive props for extracted renderers
    const primitiveProps = {
      node,
      style: ctx.highlightStyle,
      onMouseEnter: ctx.handleMouseEnter,
      onMouseLeave: ctx.handleMouseLeave,
      onClick: ctx.handleClick
    }

    // Use extracted primitive detection and rendering
    if (isInputPrimitive(node)) {
      return renderInput(primitiveProps)
    }

    if (isTextareaPrimitive(node)) {
      return renderTextarea(primitiveProps)
    }

    if (isLinkPrimitive(node)) {
      return renderLink(primitiveProps, children, iconName)
    }

    // Use extracted isIconComponent
    if (isIconComponent(node) && iconName) {
      return renderIcon(primitiveProps)
    }

    // Heading elements (H1-H6)
    if (isHeadingPrimitive(node)) {
      return renderHeading(primitiveProps, children)
    }

    return renderBasicElement(ctx, children)
  })
}

// ============================================
// Main Generator
// ============================================

// Note: GenerateOptions is imported from ./renderers/types

// Helper to check if a node can be toggled (has a custom name, not an internal node)
function isToggleableNode(node: ASTNode): boolean {
  return Boolean(node.name && !node.name.startsWith('_') && node.name !== 'Box' && node.name !== 'Text')
}

// Inner render function for a single node
function renderSingleNode(node: ASTNode, options: GenerateOptions): React.ReactNode {
  const { inspectMode } = options

  // Use shared context preparation
  const ctx = prepareNodeContext(node, options)
  const { iconName, iconSize, iconColor, imageElement, hoverStyles } = ctx

  // Pass parentStacked to direct children only if this node has stacked layout
  // Reset parentStacked for non-stacked nodes to prevent propagation to grandchildren
  const childOptions = node.properties.stacked
    ? { ...options, parentStacked: true }
    : { ...options, parentStacked: undefined }
  const children = node.children.length > 0
    ? generateReactElement(node.children, childOptions)
    : (ctx.imageSrc ? null : node.content)

  // Primitive props for extracted renderers
  const primitiveProps = {
    node,
    style: ctx.highlightStyle,
    onMouseEnter: ctx.handleMouseEnter,
    onMouseLeave: ctx.handleMouseLeave,
    onClick: ctx.handleClick
  }

  // Use extracted isIconComponent and renderIcon
  if (isIconComponent(node) && iconName) {
    return renderIcon(primitiveProps)
  }

  // Check for primitive types (Input, Textarea, Link, Heading)
  if (isInputPrimitive(node)) {
    return renderInput(primitiveProps)
  }

  if (isTextareaPrimitive(node)) {
    return renderTextarea(primitiveProps)
  }

  if (isLinkPrimitive(node)) {
    return renderLink(primitiveProps, children, iconName)
  }

  if (isHeadingPrimitive(node)) {
    return renderHeading(primitiveProps, children)
  }

  // Interactive components need special handling
  if (needsInteractiveComponent(node)) {
    return (
      <InteractiveComponent
        key={node.id}
        node={node}
        baseStyle={ctx.style}
        hoverStyle={hoverStyles}
        highlightStyle={ctx.highlightStyle}
        inspectMode={inspectMode}
        onInspectHover={ctx.handleMouseEnter}
        onInspectLeave={ctx.handleMouseLeave}
        onInspectClick={ctx.handleClick}
      >
        {imageElement}
        {renderDynamicIcon(iconName, iconSize, iconColor)}
        {children}
      </InteractiveComponent>
    )
  }

  // Use shared basic element rendering
  return renderBasicElement(ctx, children)
}

export function generateReactElement(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  return nodes.map((node, index) => {
    // Handle special node types
    if (node.name === INTERNAL_NODES.TEXT) {
      // Apply text properties (col, size, etc.)
      const textStyle = propertiesToStyle(node.properties, false, node.name)
      const span = <span key={node.id} style={textStyle}>{sanitizeTextContent(node.content)}</span>

      // Add space between consecutive _text nodes
      const nextNode = nodes[index + 1]
      if (nextNode && nextNode.name === INTERNAL_NODES.TEXT) {
        return <React.Fragment key={node.id}>{span}{' '}</React.Fragment>
      }
      return span
    }

    if (node.name === INTERNAL_NODES.CONDITIONAL && node.condition) {
      return <ConditionalRenderer key={node.id} node={node} options={options} renderChildren={generateReactElement} />
    }

    if (node.name === INTERNAL_NODES.ITERATOR && node.iteration) {
      return <IteratorRenderer key={node.id} node={node} options={options} renderChildren={generateReactElement} />
    }

    if (node._isLibrary) {
      // Library components that can be toggled by name
      if (isToggleableNode(node)) {
        return <ToggleableNode key={node.id} node={node} options={options} renderNode={() => <LibraryComponentRenderer node={node} options={options} />} />
      }
      return <LibraryComponentRenderer key={node.id} node={node} options={options} />
    }

    // Custom components that can be toggled by name
    if (isToggleableNode(node)) {
      return <ToggleableNode key={node.id} node={node} options={options} renderNode={renderSingleNode} />
    }

    // Render the node directly
    return renderSingleNode(node, options)
  })
}
