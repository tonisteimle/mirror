/**
 * Render Utilities for Style Validation
 *
 * Renders Mirror code to DOM for validation testing.
 */

import { parse } from '../parser/parser'
import { toIR, SourceMap } from '../ir'
import { generateDOM } from '../backends/dom'
import type { RenderContext } from './types'
import type { IR } from '../ir/types'

// =============================================================================
// RENDER FUNCTION
// =============================================================================

/**
 * Render Mirror code to DOM and return a context for validation.
 *
 * @param code - Mirror source code
 * @param container - Optional container element (defaults to document.body)
 * @returns RenderContext with root element, elements map, IR, and cleanup
 *
 * @example
 * ```typescript
 * const ctx = renderMirror('Frame hor, gap 12, bg #2271C1')
 * // ... validate styles ...
 * ctx.cleanup()
 * ```
 */
export function renderMirror(code: string, container?: HTMLElement): RenderContext {
  // Parse the code
  const ast = parse(code)

  // Transform to IR with source map (for validation purposes)
  const irResult = toIR(ast, true)
  const { ir, sourceMap } = irResult

  // Generate DOM code from AST (generateDOM calls toIR internally again,
  // but we need the IR separately for validation)
  let domCode = generateDOM(ast)

  // Remove export for eval
  domCode = domCode.replace(/^export\s+function/gm, 'function')

  // Execute the generated code
  const fn = new Function(domCode + '\nreturn createUI();')
  const ui = fn() as { root: HTMLElement; [key: string]: unknown }

  // Get the actual content element (skip <style> tag)
  const root = ui.root

  // Append to container
  const targetContainer = container || document.body
  targetContainer.appendChild(root)

  // Build elements map
  const elements = new Map<string, HTMLElement>()
  const allElements = Array.from(root.querySelectorAll('[data-mirror-id]'))
  for (const el of allElements) {
    const nodeId = el.getAttribute('data-mirror-id')
    if (nodeId) {
      elements.set(nodeId, el as HTMLElement)
    }
  }

  // Also add root if it has a data-mirror-id
  const rootId = root.getAttribute('data-mirror-id')
  if (rootId) {
    elements.set(rootId, root)
  }

  // Cleanup function
  const cleanup = () => {
    if (root.parentNode) {
      root.parentNode.removeChild(root)
    }
  }

  return {
    root,
    elements,
    ir,
    sourceMap,
    cleanup,
  }
}

// =============================================================================
// ELEMENT LOOKUP
// =============================================================================

/**
 * Find element by node ID in a render context
 */
export function getElementByNodeId(ctx: RenderContext, nodeId: string): HTMLElement | null {
  return ctx.elements.get(nodeId) || null
}

/**
 * Find element by instance name
 */
export function getElementByName(ctx: RenderContext, name: string): HTMLElement | null {
  return ctx.root.querySelector(`[data-instance-name="${name}"]`) as HTMLElement | null
}

/**
 * Find element by component name
 */
export function getElementByComponent(ctx: RenderContext, componentName: string): HTMLElement | null {
  return ctx.root.querySelector(`[data-component-name="${componentName}"]`) as HTMLElement | null
}

/**
 * Find all elements of a component type
 */
export function getElementsByComponent(ctx: RenderContext, componentName: string): HTMLElement[] {
  return Array.from(ctx.root.querySelectorAll(`[data-component-name="${componentName}"]`)) as HTMLElement[]
}

// =============================================================================
// IR NODE LOOKUP
// =============================================================================

/**
 * Get IR node by ID
 */
export function getIRNodeById(ir: IR, nodeId: string): import('../ir/types').IRNode | null {
  function findNode(nodes: import('../ir/types').IRNode[]): import('../ir/types').IRNode | null {
    for (const node of nodes) {
      if (node.id === nodeId) return node
      const found = findNode(node.children)
      if (found) return found
    }
    return null
  }
  return findNode(ir.nodes)
}

/**
 * Get all IR nodes (flattened)
 */
export function getAllIRNodes(ir: IR): import('../ir/types').IRNode[] {
  const nodes: import('../ir/types').IRNode[] = []

  function collect(nodeList: import('../ir/types').IRNode[]) {
    for (const node of nodeList) {
      nodes.push(node)
      collect(node.children)
    }
  }

  collect(ir.nodes)
  return nodes
}

// =============================================================================
// STYLE EXTRACTION
// =============================================================================

/**
 * MirrorElement interface for accessing runtime properties
 */
interface MirrorElement extends HTMLElement {
  _baseStyles?: Record<string, string>
  _stateStyles?: Record<string, Record<string, string>>
  _stateMachine?: {
    current: string
    states: Record<string, { styles: Record<string, string> }>
  }
}

/**
 * Get current inline styles from an element
 */
export function getInlineStyles(el: HTMLElement): Record<string, string> {
  const styles: Record<string, string> = {}
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i]
    styles[prop] = el.style.getPropertyValue(prop)
  }
  return styles
}

/**
 * Get base styles from a rendered element.
 * Tries _baseStyles first, then falls back to inline styles.
 */
export function getElementBaseStyles(el: HTMLElement): Record<string, string> {
  const mirrorEl = el as MirrorElement

  // First try _baseStyles (set by runtime)
  if (mirrorEl._baseStyles && Object.keys(mirrorEl._baseStyles).length > 0) {
    return mirrorEl._baseStyles
  }

  // Fall back to inline styles (works in JSDOM)
  return getInlineStyles(el)
}

/**
 * Get state styles from a rendered element
 */
export function getElementStateStyles(el: HTMLElement, state: string): Record<string, string> {
  const mirrorEl = el as MirrorElement
  return mirrorEl._stateStyles?.[state] || {}
}

/**
 * Get computed styles for specific properties
 */
export function getComputedStylesFor(el: HTMLElement, properties: string[]): Record<string, string> {
  const computed = window.getComputedStyle(el)
  const styles: Record<string, string> = {}
  for (const prop of properties) {
    styles[prop] = computed.getPropertyValue(prop)
  }
  return styles
}

/**
 * Get current state of an element
 */
export function getElementState(el: HTMLElement): string {
  const mirrorEl = el as MirrorElement
  return mirrorEl._stateMachine?.current || 'default'
}
