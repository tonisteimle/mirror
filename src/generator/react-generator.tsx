/**
 * React Generator
 *
 * Main entry point for generating React elements from Mirror AST nodes.
 * Coordinates rendering of primitives, library components, and interactive elements.
 */

import React from 'react'
import type { ASTNode } from '../parser/parser'
import { INTERNAL_NODES } from '../constants'
import { sanitizeTextContent } from '../utils/sanitize'
import { getBehaviorHandler, useBehaviorRegistry, BehaviorRegistryProvider, groupChildrenBySlot } from './behaviors'
import { ComponentRegistryProvider } from './component-registry'
import { propertiesToStyle, extractHoverStyles, hasHoverStyles } from '../utils/style-converter'
import { RuntimeVariableProvider } from './RuntimeVariableProvider'
import { OverlayRegistryProvider } from './overlay-registry'
import { OverlayPortal } from './overlay-portal'
import {
  HoverableDiv,
  SafeLibraryRenderer,
  InteractiveComponent,
  ToggleableNode,
  needsInteractiveComponent,
  DynamicContent
} from './components'
import { createHighlightStyle, getAnimationStyle } from './styles'
import {
  isButtonPrimitive,
  isInputPrimitive,
  isTextareaPrimitive,
  isLinkPrimitive,
  isIconComponent,
  isHeadingPrimitive,
  isSegmentPrimitive,
  isSelectPrimitive,
  renderButton,
  renderInput,
  renderTextarea,
  renderLink,
  renderIcon,
  renderImageElement,
  renderHeading,
  renderNativeSelect,
  getImageSrc,
  SegmentInput,
  SegmentContainer
} from './primitives'
import { ConditionalRenderer, IteratorRenderer, DataBindingRenderer } from './renderers'
import type { GenerateOptions } from './renderers/types'
import { TemplateRegistryProvider, ContainerContext, useStateOverride, buildStateOverrides, useTypography } from './contexts'

// Re-export providers for use in Preview (only React components)
export { BehaviorRegistryProvider, ComponentRegistryProvider, RuntimeVariableProvider, OverlayRegistryProvider, OverlayPortal }
export { TemplateRegistryProvider } from './contexts/template-registry'
export { DataProvider } from './data-context'

// ============================================
// Helper: Get effective properties with activeState applied
// ============================================

/**
 * Merges base properties with active state properties.
 * e.g., Status pending "Waiting" -> applies 'pending' state's properties
 */
function getEffectiveProperties(node: ASTNode): ASTNode['properties'] {
  if (!node.activeState || !node.states) {
    return node.properties
  }
  const activeStateDef = node.states.find(s => s.name === node.activeState)
  if (!activeStateDef) {
    return node.properties
  }
  // Merge: base properties + active state properties (state overrides base)
  return { ...node.properties, ...activeStateDef.properties }
}

// ============================================
// State Aware Node Wrapper
// ============================================

/**
 * Wraps a node to apply state overrides from parent's active state.
 * Used for patterns like accordion: state collapsed { Content { hidden } }
 */
interface StateAwareNodeProps {
  node: ASTNode
  options: GenerateOptions
  renderNode: (node: ASTNode, options: GenerateOptions) => React.ReactNode
}

function StateAwareNode({ node, options, renderNode }: StateAwareNodeProps) {
  // Get parent state override for this node (by name)
  const parentOverride = useStateOverride(node.name)

  if (!parentOverride || Object.keys(parentOverride).length === 0) {
    // No override, render as-is
    return <>{renderNode(node, options)}</>
  }

  // Merge parent state overrides into node properties
  const mergedNode: ASTNode = {
    ...node,
    properties: { ...node.properties, ...parentOverride }
  }

  return <>{renderNode(mergedNode, options)}</>
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

/**
 * Check if a node's structure matches what the library handler expects.
 * Returns false if the user has defined their own structure that differs
 * from the library's expected slot structure.
 *
 * User-defined components can be detected by:
 * 1. Having 'hidden' property (for visibility toggling from outside)
 * 2. Having custom event handlers (onclick-outside, onkeydown, etc.)
 * 3. Not having the expected library slots
 */
function matchesLibraryStructure(node: ASTNode, libraryType: string): boolean {
  // For Dropdown: expect Trigger and/or Menu slots inside
  if (libraryType === 'Dropdown') {
    // Check for explicit library structure (Trigger/Menu slots)
    const hasTriggerSlot = node.children.some(child => child.name === 'Trigger')
    const hasMenuSlot = node.children.some(child => child.name === 'Menu')

    // If user added custom event handlers, they want custom behavior
    const hasCustomEvents = node.eventHandlers && node.eventHandlers.some(h =>
      h.event === 'onclick-outside' || h.event === 'onkeydown' || h.event === 'onkeyup'
    )

    // If has 'hidden' property, it's meant to be toggled from outside
    const hasHiddenProperty = node.properties.hidden === true

    // User-defined: has hidden or custom events, without proper library slots
    if ((hasHiddenProperty || hasCustomEvents) && !hasTriggerSlot) {
      return false
    }

    // Library structure: has Trigger or Menu slots
    return hasTriggerSlot || hasMenuSlot
  }
  // Other library components: always use handler
  return true
}

function LibraryComponentRendererInner({ node, options }: LibraryComponentRendererProps) {
  const behaviorRegistry = useBehaviorRegistry()
  // Use _libraryType for handler lookup (e.g., "Dialog" for "SettingsDialog as Dialog")
  const libraryType = node._libraryType || node.name
  const handler = getBehaviorHandler(libraryType)

  // Skip library handler if user defined their own structure
  const shouldUseHandler = handler && matchesLibraryStructure(node, libraryType)

  if (!shouldUseHandler) {
    // No behavior handler - render as styled div with children
    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
    const effectiveProps = getEffectiveProperties(node)
    const style = propertiesToStyle(effectiveProps, hasRealChildren, node._libraryType || node.name)

    // Text library type renders as span (inline element)
    if (node._libraryType === 'Text') {
      const textContent = node.children
        .filter(child => child.name === INTERNAL_NODES.TEXT)
        .map(child => child.content)
        .join('')
      return <span key={node.id} data-id={node.id} data-source-line={node.line} className={node.name} style={style}>{textContent || generateReactElement(node.children, options)}</span>
    }

    // Render children or content
    const renderContent = () => {
      if (node.children.length > 0) {
        return node.children.map(child => generateReactElement([child], options))
      }
      // Check for dynamic content expression (e.g., "Query: " + $query)
      if (node.contentExpression) {
        return <DynamicContent expression={node.contentExpression} />
      }
      return node.content ? sanitizeTextContent(node.content) : null
    }

    // Check if the library component needs interactive behavior
    if (needsInteractiveComponent(node)) {
      const hoverStyles = hasHoverStyles(node.properties) ? extractHoverStyles(node.properties) : {}
      return (
        <InteractiveComponent
          key={node.id}
          node={node}
          baseStyle={style}
          hoverStyle={hoverStyles}
          highlightStyle={style}
        >
          {renderContent()}
        </InteractiveComponent>
      )
    }

    return (
      <div key={node.id} data-id={node.id} data-source-line={node.line} className={node.name} style={style}>
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
  imageSrc: string | undefined
  imageElement: React.JSX.Element | null
  nodeHasHover: boolean
  hoverStyles: React.CSSProperties
  handleMouseEnter: (() => void) | undefined
  handleMouseLeave: (() => void) | undefined
  handleClick: ((e: React.MouseEvent) => void) | undefined
  hasChildren: boolean
}

function prepareNodeContext(
  node: ASTNode,
  options: GenerateOptions
): NodeRenderContext {
  const { onHover, onClick, hoveredId, selectedId, inspectMode } = options

  const hasRealChildren = node.children.length > 0 &&
    node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
  const effectiveProps = getEffectiveProperties(node)
  const baseStyle = propertiesToStyle(effectiveProps, hasRealChildren, node._libraryType || node.name)
  let style: React.CSSProperties = baseStyle

  // Set --cols CSS variable for grid rows (table layout)
  // For _gridRow, count ALL children (including _text nodes which become cells)
  if (effectiveProps._gridRow && node.children.length > 0) {
    const colCount = node.children.length
    ;(style as Record<string, unknown>)['--cols'] = colCount
  }

  // If parent is stacked, child occupies same grid cell
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
    imageSrc,
    imageElement,
    nodeHasHover,
    hoverStyles,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
    hasChildren: hasRealChildren
  }
}

function renderBasicElement(
  ctx: NodeRenderContext,
  children: React.ReactNode
): React.JSX.Element {
  const { node, highlightStyle, imageElement, nodeHasHover, hoverStyles, handleMouseEnter, handleMouseLeave, handleClick, hasChildren } = ctx

  // Wrap children in ContainerContext for sibling actions (deactivate-siblings, highlight next/prev, etc.)
  // This allows child components to register with their parent container
  const containerContextValue = {
    containerId: node.id,
    containerName: node.instanceName || node.name
  }
  const wrappedChildren = node.children.length > 0 ? (
    <ContainerContext.Provider value={containerContextValue}>
      {children}
    </ContainerContext.Provider>
  ) : children

  const innerContent = (
    <>
      {imageElement}
      {wrappedChildren}
    </>
  )

  if (nodeHasHover) {
    return (
      <HoverableDiv
        key={node.id}
        dataId={node.id}
        dataSourceLine={node.line}
        className={node.name}
        baseStyle={highlightStyle}
        hoverStyle={hoverStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {innerContent}
      </HoverableDiv>
    )
  }

  return (
    <div
      key={node.id}
      data-id={node.id}
      data-source-line={node.line}
      className={node.name}
      style={highlightStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {innerContent}
    </div>
  )
}

/**
 * Renders a single non-library node with state override awareness.
 * This component uses hooks so it can access StateOverrideContext.
 */
interface NodeRendererProps {
  node: ASTNode
  options: GenerateOptions
  nextNode?: ASTNode
}

function NodeRenderer({ node, options, nextNode }: NodeRendererProps) {
  // Apply state overrides from parent (e.g., state collapsed { Content { hidden } })
  const parentOverride = useStateOverride(node.name)

  // Merge parent state overrides into node properties
  const effectiveNode = (parentOverride && Object.keys(parentOverride).length > 0)
    ? { ...node, properties: { ...node.properties, ...parentOverride } }
    : node

  // Text nodes
  if (effectiveNode.name === INTERNAL_NODES.TEXT) {
    const textStyle = propertiesToStyle(effectiveNode.properties, false, effectiveNode.name)
    const span = <span key={effectiveNode.id} style={textStyle}>{sanitizeTextContent(effectiveNode.content)}</span>

    if (nextNode && nextNode.name === INTERNAL_NODES.TEXT) {
      return <React.Fragment key={effectiveNode.id}>{span}{' '}</React.Fragment>
    }
    return span
  }

  const ctx = prepareNodeContext(effectiveNode, options)

  const childOptions = effectiveNode.properties.stacked
    ? { ...options, parentStacked: true }
    : { ...options, parentStacked: undefined }

  // Handle static content, dynamic expressions, or children
  const contentOrChildren = effectiveNode.children.length > 0
    ? generateReactElementWithoutLibrary(effectiveNode.children, childOptions)
    : ctx.imageSrc ? null
    : effectiveNode.contentExpression ? <DynamicContent expression={effectiveNode.contentExpression} />
    : effectiveNode.content

  const primitiveProps = {
    node: effectiveNode,
    style: ctx.highlightStyle,
    onMouseEnter: ctx.handleMouseEnter,
    onMouseLeave: ctx.handleMouseLeave,
    onClick: ctx.handleClick,
    typography: options.typography
  }

  if (isInputPrimitive(effectiveNode)) {
    return renderInput(primitiveProps)
  }

  if (isTextareaPrimitive(effectiveNode)) {
    return renderTextarea(primitiveProps)
  }

  if (isSegmentPrimitive(effectiveNode)) {
    return (
      <SegmentInput
        key={effectiveNode.id}
        node={effectiveNode}
        style={ctx.highlightStyle}
        index={0}
        totalSegments={1}
      />
    )
  }

  if (isLinkPrimitive(effectiveNode)) {
    return renderLink(primitiveProps, contentOrChildren)
  }

  if (isIconComponent(effectiveNode) && effectiveNode.content) {
    return renderIcon(primitiveProps)
  }

  if (isHeadingPrimitive(effectiveNode)) {
    return renderHeading(primitiveProps, contentOrChildren)
  }

  if (isSelectPrimitive(effectiveNode)) {
    return renderNativeSelect(primitiveProps)
  }

  return renderBasicElement(ctx, contentOrChildren)
}

function generateReactElementWithoutLibrary(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  return nodes.map((node, index) => (
    <NodeRenderer
      key={node.id}
      node={node}
      options={options}
      nextNode={nodes[index + 1]}
    />
  ))
}

// ============================================
// Main Generator
// ============================================

function isToggleableNode(node: ASTNode): boolean {
  // Box and Text are basic primitives, but should be toggleable if they:
  // 1. Have an explicit id (from "named" keyword) - can be targeted by actions
  // 2. Have a hidden property - need visibility toggling
  if (node.name === 'Box' || node.name === 'Text') {
    return Boolean(node.id || node.properties?.hidden)
  }
  return Boolean(node.name && !node.name.startsWith('_'))
}

function hasSegmentChildren(node: ASTNode): boolean {
  return node.children.some(child => isSegmentPrimitive(child))
}

function renderSegmentChildren(
  node: ASTNode,
  options: GenerateOptions,
  generateFn: (children: ASTNode[], options: GenerateOptions) => React.ReactNode
): React.ReactNode {
  const segmentChildren = node.children.filter(child => isSegmentPrimitive(child))
  const otherChildren = node.children.filter(child => !isSegmentPrimitive(child))
  const totalSegments = segmentChildren.length

  const segmentElements = segmentChildren.map((child, index) => {
    const ctx = prepareNodeContext(child, options)
    return (
      <SegmentInput
        key={child.id}
        node={child}
        style={ctx.highlightStyle}
        index={index}
        totalSegments={totalSegments}
      />
    )
  })

  const segmentContainer = totalSegments > 0 ? (
    <SegmentContainer key="segment-container" node={node}>
      {segmentElements}
    </SegmentContainer>
  ) : null

  const otherElements = otherChildren.length > 0
    ? generateFn(otherChildren, options)
    : null

  return (
    <>
      {segmentContainer}
      {otherElements}
    </>
  )
}

function renderSingleNode(node: ASTNode, options: GenerateOptions): React.ReactNode {
  const { inspectMode } = options

  const ctx = prepareNodeContext(node, options)
  const { imageElement, hoverStyles } = ctx

  // Compute state overrides for children based on activeState
  // e.g., Section { collapsed } with state collapsed { Content { hidden } }
  // -> children get overrides: { Content: { hidden: true } }
  // Only apply overrides if activeState is explicitly set - undefined means no state is active
  const parentStateOverrides = node.activeState
    ? buildStateOverrides(node.states, node.activeState)
    : undefined

  const childOptions = node.properties.stacked
    ? { ...options, parentStacked: true, parentStateOverrides }
    : { ...options, parentStacked: undefined, parentStateOverrides }

  // Handle static content, dynamic expressions, or children
  const children = node.children.length > 0
    ? (hasSegmentChildren(node)
        ? renderSegmentChildren(node, childOptions, generateReactElement)
        : generateReactElement(node.children, childOptions))
    : ctx.imageSrc ? null
    : node.contentExpression ? <DynamicContent expression={node.contentExpression} />
    : node.content

  const primitiveProps = {
    node,
    style: ctx.highlightStyle,
    onMouseEnter: ctx.handleMouseEnter,
    onMouseLeave: ctx.handleMouseLeave,
    onClick: ctx.handleClick,
    typography: options.typography
  }

  if (isIconComponent(node) && node.content) {
    return renderIcon(primitiveProps)
  }

  // Button primitive - uses native <button> for accessibility
  if (isButtonPrimitive(node)) {
    if (needsInteractiveComponent(node)) {
      return (
        <InteractiveComponent
          key={node.id}
          node={node}
          baseStyle={ctx.style}
          hoverStyle={hoverStyles}
          highlightStyle={ctx.highlightStyle}
          inspectMode={inspectMode}
        >
          {renderButton(primitiveProps, children)}
        </InteractiveComponent>
      )
    }
    return renderButton(primitiveProps, children)
  }

  // Input/Textarea primitives with event handlers need InteractiveComponent for oninput etc.
  if (isInputPrimitive(node)) {
    if (needsInteractiveComponent(node)) {
      return (
        <InteractiveComponent
          key={node.id}
          node={node}
          baseStyle={ctx.style}
          hoverStyle={hoverStyles}
          highlightStyle={ctx.highlightStyle}
          inspectMode={inspectMode}
        >
          {renderInput(primitiveProps)}
        </InteractiveComponent>
      )
    }
    return renderInput(primitiveProps)
  }

  if (isTextareaPrimitive(node)) {
    if (needsInteractiveComponent(node)) {
      return (
        <InteractiveComponent
          key={node.id}
          node={node}
          baseStyle={ctx.style}
          hoverStyle={hoverStyles}
          highlightStyle={ctx.highlightStyle}
          inspectMode={inspectMode}
        >
          {renderTextarea(primitiveProps)}
        </InteractiveComponent>
      )
    }
    return renderTextarea(primitiveProps)
  }

  if (isSegmentPrimitive(node)) {
    return (
      <SegmentInput
        key={node.id}
        node={node}
        style={ctx.highlightStyle}
        index={0}
        totalSegments={1}
      />
    )
  }

  if (isLinkPrimitive(node)) {
    return renderLink(primitiveProps, children)
  }

  if (isHeadingPrimitive(node)) {
    return renderHeading(primitiveProps, children)
  }

  if (isSelectPrimitive(node)) {
    return renderNativeSelect(primitiveProps)
  }

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
        {children}
      </InteractiveComponent>
    )
  }

  return renderBasicElement(ctx, children)
}

export function generateReactElement(
  nodes: ASTNode[],
  options: GenerateOptions = {}
): React.ReactNode {
  const { parentStateOverrides } = options

  return nodes.map((node, index) => {
    // Skip definition-only nodes (they define templates but don't render)
    if (node._isExplicitDefinition) {
      return null
    }

    // Apply parent state overrides to this node
    // e.g., if parent is Section { collapsed } and state collapsed { Content { hidden } },
    // then Content gets hidden: true merged into properties
    let effectiveNode = node
    if (parentStateOverrides && parentStateOverrides.size > 0) {
      const override = parentStateOverrides.get(node.name)
      if (override && Object.keys(override).length > 0) {
        effectiveNode = {
          ...node,
          properties: { ...node.properties, ...override }
        }
      }
    }

    // Clear parentStateOverrides for nested children (only applies to immediate children)
    const childOptions = { ...options, parentStateOverrides: undefined }

    if (effectiveNode.name === INTERNAL_NODES.TEXT) {
      const textStyle = propertiesToStyle(effectiveNode.properties, false, effectiveNode.name)
      const span = <span key={effectiveNode.id} style={textStyle}>{sanitizeTextContent(effectiveNode.content)}</span>

      const nextNode = nodes[index + 1]
      if (nextNode && nextNode.name === INTERNAL_NODES.TEXT) {
        return <React.Fragment key={effectiveNode.id}>{span}{' '}</React.Fragment>
      }
      return span
    }

    if (effectiveNode.name === INTERNAL_NODES.CONDITIONAL && effectiveNode.condition) {
      return <ConditionalRenderer key={effectiveNode.id} node={effectiveNode} options={childOptions} renderChildren={generateReactElement} />
    }

    if (effectiveNode.name === INTERNAL_NODES.ITERATOR && effectiveNode.iteration) {
      return <IteratorRenderer key={effectiveNode.id} node={effectiveNode} options={childOptions} renderChildren={generateReactElement} />
    }

    if (effectiveNode.dataBinding) {
      return <DataBindingRenderer key={effectiveNode.id} node={effectiveNode} options={childOptions} renderChildren={generateReactElement} />
    }

    if (effectiveNode._isLibrary) {
      if (isToggleableNode(effectiveNode)) {
        return <ToggleableNode key={effectiveNode.id} node={effectiveNode} options={childOptions} renderNode={() => <LibraryComponentRenderer node={effectiveNode} options={childOptions} />} />
      }
      return <LibraryComponentRenderer key={effectiveNode.id} node={effectiveNode} options={childOptions} />
    }

    if (isToggleableNode(effectiveNode)) {
      return <ToggleableNode key={effectiveNode.id} node={effectiveNode} options={childOptions} renderNode={renderSingleNode} />
    }

    return renderSingleNode(effectiveNode, childOptions)
  })
}
