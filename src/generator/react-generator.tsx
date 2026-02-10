import React, { useState, useCallback, useMemo, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ASTNode, EventHandler, ActionStatement, Conditional, Expression, ComponentTemplate } from '../parser/parser'
import { INTERNAL_NODES } from '../constants'
import { sanitizeTextContent } from '../utils/sanitize'
import { getBehaviorHandler, useBehaviorRegistry, BehaviorRegistryProvider } from './behaviors/registry'
import { groupChildrenBySlot } from './behaviors/index'
import { ComponentRegistryProvider, useComponentRegistry } from './component-registry'
import { propertiesToStyle, extractHoverStyles, hasHoverStyles } from '../utils/style-converter'
import { toPascalCase, getIcon, modifiersToStyle, evaluateExpression } from './utils'
import { RuntimeVariableProvider, useRuntimeVariables } from './runtime-context'
import { OverlayRegistryProvider, useOverlayRegistry } from './overlay-registry'
import { OverlayPortal } from './overlay-portal'
import { HoverableDiv, SafeLibraryRenderer } from './components'
import { composeConditionalStyles, composeFinalStyle, createHighlightStyle } from './styles'
import {
  isInputPrimitive,
  isTextareaPrimitive,
  isLinkPrimitive,
  isIconComponent,
  renderInput,
  renderTextarea,
  renderLink,
  renderIcon,
  renderImageElement,
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
    modifiers: template.modifiers,
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

  for (const node of nodes) {
    if (node.name === INTERNAL_NODES.TEXT) {
      code += `${spaces}<span>${sanitizeTextContent(node.content)}</span>\n`
      continue
    }

    const hasChildren = node.children.length > 0
    const style = modifiersToStyle(
      node.modifiers,
      propertiesToStyle(node.properties, hasChildren, node.name)
    )

    const styleStr = JSON.stringify(style, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : spaces + '    ' + line))
      .join('\n')
    const hasContent = node.content !== undefined
    const iconName = node.properties.icon as string | undefined

    if (hasChildren) {
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
        code += node.content
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

  // Initialize state from node.states
  const initialState = node.states?.[0]?.name || 'default'
  const [currentState, setCurrentState] = useState(initialState)

  // Initialize variables from node.variables
  const initialVars: Record<string, string | number | boolean> = {}
  if (node.variables) {
    for (const v of node.variables) {
      initialVars[v.name] = v.value
    }
  }
  const [variables, setVariables] = useState(initialVars)

  // Calculate style for current state
  const stateStyle = useMemo(() => {
    if (!node.states) return baseStyle
    const stateConfig = node.states.find(s => s.name === currentState)
    if (!stateConfig) return baseStyle
    return { ...baseStyle, ...propertiesToStyle(stateConfig.properties, node.children.length > 0, node.name) }
  }, [node.states, node.children.length, currentState, baseStyle, node.name])

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
    const handler = eventHandlerMap.get('onfocus')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const handler = eventHandlerMap.get('onblur')
    if (handler) executeHandler(handler, e)
  }, [eventHandlerMap, executeHandler])

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
  const finalStyle = useMemo(() => {
    return composeFinalStyle(highlightStyle, stateStyle, conditionalStyle, hoverStyle, isHovered)
  }, [highlightStyle, stateStyle, conditionalStyle, hoverStyle, isHovered])

  // Use pre-computed map for O(1) event existence checks
  const hasChangeEvent = eventHandlerMap.has('onchange')
  const hasInputEvent = eventHandlerMap.has('oninput')
  const hasFocusEvent = eventHandlerMap.has('onfocus')
  const hasBlurEvent = eventHandlerMap.has('onblur')
  const hasKeyDownEvent = eventHandlerMap.has('onkeydown')
  const hasKeyUpEvent = eventHandlerMap.has('onkeyup')

  return (
    <div
      data-id={node.id}
      data-state={currentState}
      className={node.name}
      style={finalStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onChange={hasChangeEvent ? handleChange as React.ChangeEventHandler<HTMLDivElement> : undefined}
      onInput={hasInputEvent ? handleInput as React.FormEventHandler<HTMLDivElement> : undefined}
      onFocus={hasFocusEvent ? handleFocus : undefined}
      onBlur={hasBlurEvent ? handleBlur : undefined}
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
  const handler = getBehaviorHandler(node.name)

  if (!handler) {
    return (
      <div key={node.id} data-id={node.id} className={node.name}>
        {node.children.map(child => generateReactElement([child], options))}
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
  IconComponent: React.ComponentType<{ size: number; color: string }> | null
  iconSize: number
  iconColor: string
  imageSrc: string | undefined
  imageElement: JSX.Element | null
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

  const hasChildren = node.children.length > 0
  const baseStyle = propertiesToStyle(node.properties, hasChildren, node.name)
  const style = modifiersToStyle(node.modifiers, baseStyle)

  const isHovered = inspectMode && hoveredId === node.id
  const isSelected = selectedId === node.id
  const highlightStyle = createHighlightStyle(style, isHovered, isSelected, inspectMode)

  const iconName = node.properties.icon as string | undefined
  const IconComponent = iconName ? getIcon(iconName) : null
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
    IconComponent,
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
): JSX.Element {
  const { node, highlightStyle, IconComponent, iconSize, iconColor, imageElement, nodeHasHover, hoverStyles, handleMouseEnter, handleMouseLeave, handleClick } = ctx

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
        {IconComponent && <IconComponent size={iconSize} color={iconColor} />}
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
      {IconComponent && <IconComponent size={iconSize} color={iconColor} />}
      {children}
    </div>
  )
}

function generateReactElementWithoutLibrary(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  return nodes.map((node) => {
    if (node.name === INTERNAL_NODES.TEXT) {
      return <span key={node.id}>{sanitizeTextContent(node.content)}</span>
    }

    const ctx = prepareNodeContext(node, options)
    const { iconName, IconComponent } = ctx

    const children = node.children.length > 0
      ? generateReactElementWithoutLibrary(node.children, options)
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
    if (isIconComponent(node) && IconComponent) {
      return renderIcon(primitiveProps)
    }

    return renderBasicElement(ctx, children)
  })
}

// ============================================
// Main Generator
// ============================================

// Note: GenerateOptions is imported from ./renderers/types

export function generateReactElement(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  const { inspectMode } = options

  return nodes.map((node) => {
    // Handle special node types
    if (node.name === INTERNAL_NODES.TEXT) {
      return <span key={node.id}>{sanitizeTextContent(node.content)}</span>
    }

    if (node.name === INTERNAL_NODES.CONDITIONAL && node.condition) {
      return <ConditionalRenderer key={node.id} node={node} options={options} renderChildren={generateReactElement} />
    }

    if (node.name === INTERNAL_NODES.ITERATOR && node.iteration) {
      return <IteratorRenderer key={node.id} node={node} options={options} renderChildren={generateReactElement} />
    }

    if (node._isLibrary) {
      return <LibraryComponentRenderer key={node.id} node={node} options={options} />
    }

    // Use shared context preparation
    const ctx = prepareNodeContext(node, options)
    const { IconComponent, iconSize, iconColor, imageElement, hoverStyles } = ctx

    const children = node.children.length > 0
      ? generateReactElement(node.children, options)
      : (ctx.imageSrc ? null : node.content)

    // Use extracted isIconComponent and renderIcon
    if (isIconComponent(node) && IconComponent) {
      const primitiveProps = {
        node,
        style: ctx.highlightStyle,
        onMouseEnter: ctx.handleMouseEnter,
        onMouseLeave: ctx.handleMouseLeave,
        onClick: ctx.handleClick
      }
      return renderIcon(primitiveProps)
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
          {IconComponent && <IconComponent size={iconSize} color={iconColor} />}
          {children}
        </InteractiveComponent>
      )
    }

    // Use shared basic element rendering
    return renderBasicElement(ctx, children)
  })
}
