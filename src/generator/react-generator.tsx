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
  renderDynamicIcon,
  InteractiveComponent,
  ToggleableNode,
  needsInteractiveComponent
} from './components'
import { createHighlightStyle, getAnimationStyle } from './styles'
import {
  isInputPrimitive,
  isTextareaPrimitive,
  isLinkPrimitive,
  isIconComponent,
  isHeadingPrimitive,
  isSegmentPrimitive,
  renderInput,
  renderTextarea,
  renderLink,
  renderIcon,
  renderImageElement,
  renderHeading,
  getImageSrc,
  SegmentInput,
  SegmentContainer
} from './primitives'
import { ConditionalRenderer, IteratorRenderer, DataBindingRenderer } from './renderers'
import type { GenerateOptions } from './renderers/types'
import { TemplateRegistryProvider, ContainerContext } from './contexts'

// Re-export providers for use in Preview (only React components)
export { BehaviorRegistryProvider, ComponentRegistryProvider, RuntimeVariableProvider, OverlayRegistryProvider, OverlayPortal }
export { TemplateRegistryProvider } from './contexts/template-registry'
export { DataProvider } from './data-context'

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
    const hasRealChildren = node.children.length > 0 &&
      node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
    const style = propertiesToStyle(node.properties, hasRealChildren, node._libraryType || node.name)

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

  const hasRealChildren = node.children.length > 0 &&
    node.children.some(child => child.name !== INTERNAL_NODES.TEXT)
  const baseStyle = propertiesToStyle(node.properties, hasRealChildren, node._libraryType || node.name)
  let style = baseStyle

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
        dataSourceLine={node.line}
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
      data-source-line={node.line}
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
      const textStyle = propertiesToStyle(node.properties, false, node.name)
      const span = <span key={node.id} style={textStyle}>{sanitizeTextContent(node.content)}</span>

      const nextNode = nodes[index + 1]
      if (nextNode && nextNode.name === INTERNAL_NODES.TEXT) {
        return <React.Fragment key={node.id}>{span}{' '}</React.Fragment>
      }
      return span
    }

    const ctx = prepareNodeContext(node, options)
    const { iconName } = ctx

    const childOptions = node.properties.stacked
      ? { ...options, parentStacked: true }
      : { ...options, parentStacked: undefined }
    const children = node.children.length > 0
      ? generateReactElementWithoutLibrary(node.children, childOptions)
      : (ctx.imageSrc ? null : node.content)

    const primitiveProps = {
      node,
      style: ctx.highlightStyle,
      onMouseEnter: ctx.handleMouseEnter,
      onMouseLeave: ctx.handleMouseLeave,
      onClick: ctx.handleClick
    }

    if (isInputPrimitive(node)) {
      return renderInput(primitiveProps)
    }

    if (isTextareaPrimitive(node)) {
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
      return renderLink(primitiveProps, children, iconName)
    }

    if (isIconComponent(node) && iconName) {
      return renderIcon(primitiveProps)
    }

    if (isHeadingPrimitive(node)) {
      return renderHeading(primitiveProps, children)
    }

    return renderBasicElement(ctx, children)
  })
}

// ============================================
// Main Generator
// ============================================

function isToggleableNode(node: ASTNode): boolean {
  return Boolean(node.name && !node.name.startsWith('_') && node.name !== 'Box' && node.name !== 'Text')
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
  const { iconName, iconSize, iconColor, imageElement, hoverStyles } = ctx

  const childOptions = node.properties.stacked
    ? { ...options, parentStacked: true }
    : { ...options, parentStacked: undefined }

  const children = node.children.length > 0
    ? (hasSegmentChildren(node)
        ? renderSegmentChildren(node, childOptions, generateReactElement)
        : generateReactElement(node.children, childOptions))
    : (ctx.imageSrc ? null : node.content)

  const primitiveProps = {
    node,
    style: ctx.highlightStyle,
    onMouseEnter: ctx.handleMouseEnter,
    onMouseLeave: ctx.handleMouseLeave,
    onClick: ctx.handleClick
  }

  if (isIconComponent(node) && iconName) {
    return renderIcon(primitiveProps)
  }

  if (isInputPrimitive(node)) {
    return renderInput(primitiveProps)
  }

  if (isTextareaPrimitive(node)) {
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
    return renderLink(primitiveProps, children, iconName)
  }

  if (isHeadingPrimitive(node)) {
    return renderHeading(primitiveProps, children)
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
        {renderDynamicIcon(iconName, iconSize, iconColor)}
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
  return nodes.map((node, index) => {
    if (node.name === INTERNAL_NODES.TEXT) {
      const textStyle = propertiesToStyle(node.properties, false, node.name)
      const span = <span key={node.id} style={textStyle}>{sanitizeTextContent(node.content)}</span>

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

    if (node.dataBinding) {
      return <DataBindingRenderer key={node.id} node={node} options={options} renderChildren={generateReactElement} />
    }

    if (node._isLibrary) {
      if (isToggleableNode(node)) {
        return <ToggleableNode key={node.id} node={node} options={options} renderNode={() => <LibraryComponentRenderer node={node} options={options} />} />
      }
      return <LibraryComponentRenderer key={node.id} node={node} options={options} />
    }

    if (isToggleableNode(node)) {
      return <ToggleableNode key={node.id} node={node} options={options} renderNode={renderSingleNode} />
    }

    return renderSingleNode(node, options)
  })
}
