/**
 * Integration Test Environment
 *
 * Ermöglicht realistische Tests des kompletten Workflows:
 * Code → Parse → IR → Mock-DOM → Manipulation → CodeModifier → Code
 *
 * Die Modelle sind DOM-frei, aber wir simulieren DOM-Rects basierend auf
 * den Properties im Code (x, y, w, h).
 */

import { parse } from '../../compiler/parser'
import { toIR, type IRResult } from '../../compiler/ir'
import { createCodeModifier, type CodeModifier } from '../../compiler/studio/code-modifier'
import type { SourceMap, NodeMapping } from '../../compiler/ir/source-map'
import type { Point, Rect } from '../../studio/visual/models/drag-state'

// ============================================================================
// Types
// ============================================================================

export interface ElementInfo {
  nodeId: string
  componentName: string
  rect: Rect
  parentId?: string
  properties: Record<string, string | number | boolean>
}

export interface ContainerInfo {
  nodeId: string
  rect: Rect
  isPositioned: boolean
  isVertical: boolean
  isHorizontal: boolean
  children: ElementInfo[]
}

export interface DragSimulation {
  element: ElementInfo
  from: Point
  to: Point
}

export interface PaletteDragSimulation {
  componentName: string
  to: Point
  defaultSize?: { width: number; height: number }
  properties?: string
  textContent?: string
  /** Component ID for template lookup (e.g., 'Button', 'Input'). Required for testing template-based insertion. */
  componentId?: string
}

export interface DragSimulationResult {
  source: {
    type: 'element'
    nodeId: string
    rect: Rect
    grabOffset: Point
  } | {
    type: 'palette'
    componentName: string
    properties?: string
    textContent?: string
    defaultSize?: { width: number; height: number }
    componentId?: string
  }
  targetNodeId: string
  placement: 'absolute' | 'before' | 'after' | 'inside'
  insertionIndex?: number
  absolutePosition?: Point
  delta: Point
}

export interface TestEnvironment {
  // Accessors
  getCode(): string
  getSourceMap(): SourceMap
  getCodeModifier(): CodeModifier

  // Element queries
  getElement(nameOrId: string): ElementInfo | null
  getElements(): ElementInfo[]
  getContainer(nameOrId: string): ContainerInfo | null

  // Simulation
  simulateDrag(drag: DragSimulation): DragSimulationResult
  simulatePaletteDrag(drag: PaletteDragSimulation): DragSimulationResult

  // Modification
  applyDrop(result: DragSimulationResult): boolean
  updateProperty(nodeId: string, prop: string, value: string): boolean

  // Re-parse after changes
  recompile(): void
}

// ============================================================================
// Default Layout Values
// ============================================================================

const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
  Button: { width: 100, height: 40 },
  Text: { width: 100, height: 24 },
  Input: { width: 200, height: 40 },
  Box: { width: 100, height: 100 },
  Image: { width: 100, height: 100 },
  Icon: { width: 24, height: 24 },
}

const DEFAULT_SIZE = { width: 100, height: 40 }

// ============================================================================
// Implementation
// ============================================================================

export function createTestEnvironment(initialCode: string): TestEnvironment {
  let code = initialCode
  let ast = parse(code)
  let irResult = toIR(ast, true) as IRResult
  let sourceMap = irResult.sourceMap
  let codeModifier = createCodeModifier(code, sourceMap)

  // Cache of computed element info
  let elementsCache: ElementInfo[] | null = null

  /**
   * Extract properties from a node
   */
  function extractProperties(node: NodeMapping): Record<string, string | number | boolean> {
    const props: Record<string, string | number | boolean> = {}

    // Get the line content from source
    const lines = code.split('\n')
    const line = lines[node.position.line - 1]
    if (!line) return props

    // Simple property extraction (x, y, w, h, bg, etc.)
    const patterns: Array<{ regex: RegExp; name: string; isString?: boolean }> = [
      { regex: /\bx\s+(\d+)/, name: 'x' },
      { regex: /\by\s+(\d+)/, name: 'y' },
      { regex: /\bw\s+(\d+)/, name: 'w' },
      { regex: /\bh\s+(\d+)/, name: 'h' },
      { regex: /\bwidth\s+(\d+)/, name: 'w' },
      { regex: /\bheight\s+(\d+)/, name: 'h' },
      { regex: /\bstacked\b/, name: 'stacked' },
      { regex: /\bhor\b/, name: 'hor' },
      { regex: /\bver\b/, name: 'ver' },
      { regex: /\bbg\s+(#[0-9a-fA-F]{3,6})/, name: 'bg', isString: true },
      { regex: /\bgap\s+(\d+)/, name: 'gap' },
      { regex: /\bpad\s+(\d+)/, name: 'pad' },
      { regex: /\brad\s+(\d+)/, name: 'rad' },
    ]

    for (const { regex, name, isString } of patterns) {
      const match = line.match(regex)
      if (match) {
        if (match[1]) {
          props[name] = isString ? match[1] : parseInt(match[1], 10)
        } else {
          props[name] = true
        }
      }
    }

    return props
  }

  /**
   * Compute rect for an element based on its properties and parent
   */
  function computeRect(node: NodeMapping, props: Record<string, any>, parentRect?: Rect): Rect {
    const componentName = node.componentName || 'Box'
    const defaultSize = DEFAULT_SIZES[componentName] || DEFAULT_SIZE

    const width = typeof props.w === 'number' ? props.w : defaultSize.width
    const height = typeof props.h === 'number' ? props.h : defaultSize.height

    let x = 0
    let y = 0

    if (typeof props.x === 'number') {
      x = props.x + (parentRect?.x || 0)
    }
    if (typeof props.y === 'number') {
      y = props.y + (parentRect?.y || 0)
    }

    return { x, y, width, height }
  }

  /**
   * Build element info for all nodes
   *
   * Simulates basic flex layout:
   * - For `ver` containers: children are stacked vertically
   * - For `hor` containers: children are stacked horizontally
   * - For `pos` containers: children use absolute x/y
   */
  function buildElements(): ElementInfo[] {
    if (elementsCache) return elementsCache

    const elements: ElementInfo[] = []
    const nodeRects = new Map<string, Rect>()
    const nodeProps = new Map<string, Record<string, any>>()

    // Track cumulative offsets for flex layout simulation
    const flexOffsets = new Map<string, { x: number; y: number }>()

    // Process nodes in order (parents before children)
    const allNodes = sourceMap.getAllNodes()

    // Sort by line number to ensure parents come first
    const sortedNodes = [...allNodes].sort((a, b) => a.position.line - b.position.line)

    for (const node of sortedNodes) {
      const props = extractProperties(node)
      nodeProps.set(node.nodeId, props)

      // Get parent rect and props if exists
      let parentRect: Rect | undefined
      let parentProps: Record<string, any> | undefined
      if (node.parentId) {
        parentRect = nodeRects.get(node.parentId)
        parentProps = nodeProps.get(node.parentId)
      }

      // Calculate rect with flex layout simulation
      const rect = computeRectWithLayout(node, props, parentRect, parentProps, flexOffsets)
      nodeRects.set(node.nodeId, rect)

      elements.push({
        nodeId: node.nodeId,
        componentName: node.componentName || 'Unknown',
        rect,
        parentId: node.parentId,
        properties: props,
      })
    }

    elementsCache = elements
    return elements
  }

  /**
   * Compute rect with flex layout simulation
   */
  function computeRectWithLayout(
    node: NodeMapping,
    props: Record<string, any>,
    parentRect: Rect | undefined,
    parentProps: Record<string, any> | undefined,
    flexOffsets: Map<string, { x: number; y: number }>
  ): Rect {
    const componentName = node.componentName || 'Box'
    const defaultSize = DEFAULT_SIZES[componentName] || DEFAULT_SIZE

    const width = typeof props.w === 'number' ? props.w : defaultSize.width
    const height = typeof props.h === 'number' ? props.h : defaultSize.height

    let x = parentRect?.x || 0
    let y = parentRect?.y || 0

    // For positioned containers or explicit x/y, use absolute positioning
    if (parentProps?.pos || typeof props.x === 'number' || typeof props.y === 'number') {
      if (typeof props.x === 'number') {
        x = (parentRect?.x || 0) + props.x
      }
      if (typeof props.y === 'number') {
        y = (parentRect?.y || 0) + props.y
      }
    } else if (node.parentId) {
      // Simulate flex layout for ver/hor containers
      const isVertical = parentProps?.ver === true
      const isHorizontal = parentProps?.hor === true

      // Get or initialize flex offset for this parent
      if (!flexOffsets.has(node.parentId)) {
        flexOffsets.set(node.parentId, { x: parentRect?.x || 0, y: parentRect?.y || 0 })
      }
      const offset = flexOffsets.get(node.parentId)!

      if (isVertical) {
        // Vertical stacking: use current y offset
        x = parentRect?.x || 0
        y = offset.y
        // Update offset for next sibling
        offset.y += height
      } else if (isHorizontal) {
        // Horizontal stacking: use current x offset
        x = offset.x
        y = parentRect?.y || 0
        // Update offset for next sibling
        offset.x += width
      }
    }

    return { x, y, width, height }
  }

  /**
   * Find element by name or ID
   */
  function getElement(nameOrId: string): ElementInfo | null {
    const elements = buildElements()
    return elements.find(el =>
      el.nodeId === nameOrId ||
      el.componentName === nameOrId
    ) || null
  }

  /**
   * Get all elements
   */
  function getElements(): ElementInfo[] {
    return buildElements()
  }

  /**
   * Get container info
   */
  function getContainer(nameOrId: string): ContainerInfo | null {
    const element = getElement(nameOrId)
    if (!element) return null

    const elements = buildElements()
    const children = elements.filter(el => el.parentId === element.nodeId)

    return {
      nodeId: element.nodeId,
      rect: element.rect,
      isPositioned: element.properties.pos === true,
      isVertical: element.properties.ver === true,
      isHorizontal: element.properties.hor === true,
      children,
    }
  }

  /**
   * Find the deepest container at a point and determine drop placement
   *
   * For palette drops, we prefer flex containers (ver/hor) over leaf elements.
   * This allows dropping BETWEEN children in a flex container.
   */
  function findDropTarget(point: Point, excludeNodeId?: string): {
    container: ElementInfo
    placement: 'absolute' | 'before' | 'after' | 'inside'
    insertionIndex?: number
  } | null {
    const elements = buildElements()

    // Find all containers that contain the point (deepest first)
    const containersAtPoint: ElementInfo[] = []

    for (const el of elements) {
      if (excludeNodeId && el.nodeId === excludeNodeId) continue

      const r = el.rect
      if (point.x >= r.x && point.x <= r.x + r.width &&
          point.y >= r.y && point.y <= r.y + r.height) {
        containersAtPoint.push(el)
      }
    }

    if (containersAtPoint.length === 0) {
      return null
    }

    // Sort by depth (children come after parents in the list, so last is deepest)
    const sortedByDepth = containersAtPoint.sort((a, b) => {
      const depthA = countAncestors(a, elements)
      const depthB = countAncestors(b, elements)
      return depthB - depthA  // Deepest first
    })

    // Find the best target container:
    // - For pos containers: use the deepest pos container
    // - For flex containers (ver/hor): prefer flex containers over leaf elements
    // - For leaf elements: bubble up to parent flex container if exists
    let targetContainer = sortedByDepth[0]

    // Check if deepest is a leaf (no layout properties)
    const isLeaf = !targetContainer.properties.pos &&
                   !targetContainer.properties.ver &&
                   !targetContainer.properties.hor

    if (isLeaf && sortedByDepth.length > 1) {
      // Bubble up to find a flex or pos parent
      for (let i = 1; i < sortedByDepth.length; i++) {
        const candidate = sortedByDepth[i]
        if (candidate.properties.ver || candidate.properties.hor || candidate.properties.pos) {
          targetContainer = candidate
          break
        }
      }
    }

    // Determine placement based on container type
    if (targetContainer.properties.pos) {
      // Positioned container: absolute placement
      return {
        container: targetContainer,
        placement: 'absolute',
      }
    } else if (targetContainer.properties.ver || targetContainer.properties.hor) {
      // Flex container: calculate insertion index
      const children = elements.filter(el => el.parentId === targetContainer.nodeId)
      const isVertical = targetContainer.properties.ver === true

      // Find insertion position based on cursor position relative to children
      let insertionIndex = children.length  // Default: append at end

      if (isVertical) {
        // Vertical: compare y positions
        for (let i = 0; i < children.length; i++) {
          const childCenterY = children[i].rect.y + children[i].rect.height / 2
          if (point.y < childCenterY) {
            insertionIndex = i
            break
          }
        }
      } else {
        // Horizontal: compare x positions
        for (let i = 0; i < children.length; i++) {
          const childCenterX = children[i].rect.x + children[i].rect.width / 2
          if (point.x < childCenterX) {
            insertionIndex = i
            break
          }
        }
      }

      // For flex containers, we use 'inside' placement with insertionIndex
      // The insertionIndex tells the CodeModifier where to insert the child
      return {
        container: targetContainer,
        placement: 'inside',
        insertionIndex,
      }
    } else {
      // Default container (no explicit layout): treat as inside
      return {
        container: targetContainer,
        placement: 'inside',
      }
    }
  }

  /**
   * Count ancestors of an element
   */
  function countAncestors(element: ElementInfo, allElements: ElementInfo[]): number {
    let count = 0
    let current = element
    while (current.parentId) {
      count++
      const parent = allElements.find(el => el.nodeId === current.parentId)
      if (!parent) break
      current = parent
    }
    return count
  }

  /**
   * Simulate a drag operation
   */
  function simulateDrag(drag: DragSimulation): DragSimulationResult {
    const { element, from, to } = drag

    // Calculate grab offset (where in the element the user clicked)
    const grabOffset: Point = {
      x: from.x - element.rect.x,
      y: from.y - element.rect.y,
    }

    // Calculate delta
    const delta: Point = {
      x: to.x - from.x,
      y: to.y - from.y,
    }

    // Find the drop target (container at drop position)
    const elements = buildElements()
    let targetContainer: ElementInfo | null = null

    // Find the deepest container that contains the drop point
    for (const el of elements) {
      if (el.nodeId === element.nodeId) continue
      if (el.properties.pos) {
        // Check if drop point is inside this container
        const r = el.rect
        if (to.x >= r.x && to.x <= r.x + r.width &&
            to.y >= r.y && to.y <= r.y + r.height) {
          targetContainer = el
        }
      }
    }

    // If no container found, use root
    if (!targetContainer && elements.length > 0) {
      targetContainer = elements[0]
    }

    // Calculate new absolute position (relative to container)
    const newPosition: Point = {
      x: element.rect.x + delta.x - (targetContainer?.rect.x || 0),
      y: element.rect.y + delta.y - (targetContainer?.rect.y || 0),
    }

    return {
      source: {
        type: 'element',
        nodeId: element.nodeId,
        rect: element.rect,
        grabOffset,
      },
      targetNodeId: targetContainer?.nodeId || 'root',
      placement: 'absolute',
      absolutePosition: newPosition,
      delta,
    }
  }

  /**
   * Simulate a palette drag (new component from palette)
   */
  function simulatePaletteDrag(drag: PaletteDragSimulation): DragSimulationResult {
    const { componentName, to, defaultSize, properties, textContent, componentId } = drag

    // Find drop target
    const dropTarget = findDropTarget(to)

    if (!dropTarget) {
      // Fallback to root
      const elements = buildElements()
      return {
        source: {
          type: 'palette',
          componentName,
          properties,
          textContent,
          defaultSize,
          componentId,
        },
        targetNodeId: elements[0]?.nodeId || 'root',
        placement: 'inside',
        delta: { x: 0, y: 0 },
      }
    }

    const { container, placement, insertionIndex } = dropTarget

    // For absolute placement, calculate position relative to container
    let absolutePosition: Point | undefined
    if (placement === 'absolute') {
      absolutePosition = {
        x: to.x - container.rect.x,
        y: to.y - container.rect.y,
      }
    }

    return {
      source: {
        type: 'palette',
        componentName,
        properties,
        textContent,
        defaultSize,
        componentId,
      },
      targetNodeId: container.nodeId,
      placement,
      insertionIndex,
      absolutePosition,
      delta: { x: 0, y: 0 },
    }
  }

  /**
   * Apply a drop result to the code
   */
  function applyDrop(result: DragSimulationResult): boolean {
    if (result.source.type === 'element') {
      // Moving existing element
      if (result.placement !== 'absolute' || !result.absolutePosition) {
        return false
      }

      const { nodeId } = result.source
      const newX = Math.round(result.absolutePosition.x)
      const newY = Math.round(result.absolutePosition.y)

      // Update x property
      const resultX = codeModifier.updateProperty(nodeId, 'x', String(newX))
      if (!resultX.success) return false

      // Update y property
      const resultY = codeModifier.updateProperty(nodeId, 'y', String(newY))
      if (!resultY.success) return false

      // Update internal state
      code = codeModifier.getSource()
      elementsCache = null

      return true
    } else {
      // Adding new component from palette
      const { componentName, properties, textContent } = result.source

      // Build properties string
      let propsString = properties || ''

      // Add x/y for absolute positioning
      if (result.placement === 'absolute' && result.absolutePosition) {
        const posProps = `x ${Math.round(result.absolutePosition.x)}, y ${Math.round(result.absolutePosition.y)}`
        propsString = propsString ? `${propsString}, ${posProps}` : posProps
      }

      // Add child using CodeModifier
      const addResult = codeModifier.addChild(result.targetNodeId, componentName, {
        position: result.insertionIndex ?? 'last',
        properties: propsString || undefined,
        textContent: textContent,
      })

      if (!addResult.success) return false

      // Update internal state
      code = codeModifier.getSource()
      elementsCache = null

      return true
    }
  }

  /**
   * Update a single property
   */
  function updateProperty(nodeId: string, prop: string, value: string): boolean {
    const result = codeModifier.updateProperty(nodeId, prop, value)
    if (result.success) {
      code = codeModifier.getSource()
      elementsCache = null
    }
    return result.success
  }

  /**
   * Re-parse the code after external changes
   */
  function recompile(): void {
    ast = parse(code)
    irResult = toIR(ast, true) as IRResult
    sourceMap = irResult.sourceMap
    codeModifier = createCodeModifier(code, sourceMap)
    elementsCache = null
  }

  return {
    getCode: () => code,
    getSourceMap: () => sourceMap,
    getCodeModifier: () => codeModifier,
    getElement,
    getElements,
    getContainer,
    simulateDrag,
    simulatePaletteDrag,
    applyDrop,
    updateProperty,
    recompile,
  }
}
