/**
 * Drag & Drop Mock Factories
 *
 * Reusable mocks for testing drag-drop absolute positioning functionality.
 */

import { vi } from 'vitest'
import type {
  DragSource,
  DropTarget,
  DropResult,
  LayoutType,
  Direction,
  Point,
  Size,
  Rect,
  ExecutionResult,
  CodeExecutor,
} from '../../../studio/drag-drop/types'
import type { SourceMap } from '../../../compiler/ir/source-map'
import type { CodeModifier, ModificationResult } from '../../../studio/code-modifier/code-modifier'
import type { CodeExecutorDependencies } from '../../../studio/drag-drop/executor/code-executor'

// ============================================
// TYPES
// ============================================

export interface MockHTMLElement extends Partial<HTMLElement> {
  _rect: DOMRect
  _scroll: { left: number; top: number }
  _style: CSSStyleDeclaration
  _children: MockHTMLElement[]
  getBoundingClientRect: () => DOMRect
  scrollLeft: number
  scrollTop: number
  style: CSSStyleDeclaration
  querySelector: (selector: string) => MockHTMLElement | null
  querySelectorAll: (selector: string) => MockHTMLElement[]
  getAttribute: (name: string) => string | null
  setAttribute: (name: string, value: string) => void
  appendChild: (child: MockHTMLElement) => void
  removeChild: (child: MockHTMLElement) => void
  contains: (el: MockHTMLElement | null) => boolean
  parentElement: MockHTMLElement | null
  children: HTMLCollection
}

export interface MockSourceMap {
  get: ReturnType<typeof vi.fn>
  size: number
  _entries: Map<string, { line: number; column: number; endLine: number; endColumn: number }>
}

export interface MockCodeModifier {
  addChild: ReturnType<typeof vi.fn>
  addChildRelativeTo: ReturnType<typeof vi.fn>
  addChildWithTemplate: ReturnType<typeof vi.fn>
  addChildWithTemplateRelativeTo: ReturnType<typeof vi.fn>
  moveNode: ReturnType<typeof vi.fn>
  duplicateNode: ReturnType<typeof vi.fn>
  updateProperty: ReturnType<typeof vi.fn>
  _calls: Array<{ method: string; args: unknown[] }>
}

export interface MockCodeExecutorDeps {
  getSource: ReturnType<typeof vi.fn>
  getResolvedSource: ReturnType<typeof vi.fn>
  getPreludeOffset: ReturnType<typeof vi.fn>
  getSourceMap: ReturnType<typeof vi.fn>
  applyChange: ReturnType<typeof vi.fn>
  recompile: ReturnType<typeof vi.fn>
  createModifier: ReturnType<typeof vi.fn>
  getCurrentFile: ReturnType<typeof vi.fn>
  _modifier: MockCodeModifier | null
}

// ============================================
// GEOMETRY HELPERS
// ============================================

/**
 * Creates a DOMRect-like object
 */
export function createRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height }),
  }
}

/**
 * Creates a Rect object (our internal type)
 */
export function createInternalRect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height }
}

// ============================================
// DROP TARGET MOCKS
// ============================================

/**
 * Creates a mock DropTarget for positioned (stacked) containers
 */
export function createMockDropTarget(overrides: Partial<DropTarget> = {}): DropTarget {
  const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })

  return {
    nodeId: '1',
    element: element as unknown as HTMLElement,
    layoutType: 'positioned' as LayoutType,
    direction: 'vertical' as Direction,
    hasChildren: false,
    isPositioned: true,
    ...overrides,
  }
}

/**
 * Creates a mock DropTarget for flex containers
 */
export function createMockFlexTarget(overrides: Partial<DropTarget> = {}): DropTarget {
  const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })

  return {
    nodeId: '1',
    element: element as unknown as HTMLElement,
    layoutType: 'flex' as LayoutType,
    direction: 'vertical' as Direction,
    hasChildren: true,
    isPositioned: false,
    ...overrides,
  }
}

// ============================================
// DRAG SOURCE MOCKS
// ============================================

/**
 * Creates a mock DragSource for palette items
 */
export function createMockPaletteSource(overrides: Partial<DragSource> = {}): DragSource {
  return {
    type: 'palette',
    componentName: 'Frame',
    componentId: 'frame',
    properties: 'bg #1a1a1a',
    textContent: undefined,
    children: undefined,
    size: { width: 100, height: 40 },
    ...overrides,
  }
}

/**
 * Creates a mock DragSource for canvas elements
 */
export function createMockCanvasSource(overrides: Partial<DragSource> = {}): DragSource {
  const element = createMockElement(createRect(150, 150, 100, 40), { left: 0, top: 0 })

  return {
    type: 'canvas',
    nodeId: '2',
    element: element as unknown as HTMLElement,
    size: { width: 100, height: 40 },
    ...overrides,
  }
}

// ============================================
// HTML ELEMENT MOCKS
// ============================================

/**
 * Creates a mock HTMLElement with configurable bounding rect and scroll
 */
export function createMockElement(
  rect: DOMRect,
  scroll: { left: number; top: number } = { left: 0, top: 0 },
  attributes: Record<string, string> = {},
  datasetAttrs: Record<string, string> = {}
): MockHTMLElement {
  const children: MockHTMLElement[] = []
  const attrs: Record<string, string> = { ...attributes }
  const dataset: Record<string, string | undefined> = { ...datasetAttrs }

  const mockStyle = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  } as unknown as CSSStyleDeclaration

  const element: MockHTMLElement = {
    _rect: rect,
    _scroll: scroll,
    _style: mockStyle,
    _children: children,

    getBoundingClientRect: () => rect,

    get scrollLeft() {
      return scroll.left
    },
    set scrollLeft(value: number) {
      scroll.left = value
    },

    get scrollTop() {
      return scroll.top
    },
    set scrollTop(value: number) {
      scroll.top = value
    },

    get style() {
      return mockStyle
    },

    querySelector: (selector: string) => {
      // Simple selector matching for data-mirror-id
      const match = selector.match(/\[data-mirror-id="([^"]+)"\]/)
      if (match) {
        const nodeId = match[1]
        return children.find(c => c.getAttribute('data-mirror-id') === nodeId) || null
      }
      return null
    },

    querySelectorAll: (selector: string) => {
      return children
    },

    getAttribute: (name: string) => attrs[name] ?? null,

    setAttribute: (name: string, value: string) => {
      attrs[name] = value
    },

    appendChild: (child: MockHTMLElement) => {
      children.push(child)
      child.parentElement = element
    },

    removeChild: (child: MockHTMLElement) => {
      const index = children.indexOf(child)
      if (index >= 0) {
        children.splice(index, 1)
        child.parentElement = null
      }
    },

    contains: (el: MockHTMLElement | null) => {
      if (!el) return false
      return children.includes(el)
    },

    parentElement: null,

    get children() {
      return children as unknown as HTMLCollection
    },

    get dataset() {
      return dataset as DOMStringMap
    },
  }

  return element
}

/**
 * Creates a positioned container element with children
 */
export function createPositionedContainer(
  id: string,
  rect: Rect,
  childConfigs: Array<{ id: string; rect: Rect }> = []
): MockHTMLElement {
  const container = createMockElement(
    createRect(rect.x, rect.y, rect.width, rect.height),
    { left: 0, top: 0 },
    { 'data-mirror-id': id },
    { layout: 'stacked' } // Mark as positioned container
  )

  // Override style for positioned container
  ;(container._style as any).position = 'relative'
  ;(container._style as any).display = 'block'

  // Add children
  for (const childConfig of childConfigs) {
    const child = createMockElement(
      createRect(
        childConfig.rect.x,
        childConfig.rect.y,
        childConfig.rect.width,
        childConfig.rect.height
      ),
      { left: 0, top: 0 },
      { 'data-mirror-id': childConfig.id }
    )
    ;(child._style as any).position = 'absolute'
    container.appendChild(child)
  }

  return container
}

// ============================================
// SOURCE MAP MOCKS
// ============================================

/**
 * Creates a mock SourceMap
 */
export function createMockSourceMap(
  entries: Map<
    string,
    { line: number; column: number; endLine: number; endColumn: number }
  > = new Map()
): MockSourceMap {
  // Default entries if none provided
  if (entries.size === 0) {
    entries.set('1', { line: 1, column: 0, endLine: 1, endColumn: 20 })
    entries.set('2', { line: 2, column: 2, endLine: 2, endColumn: 25 })
  }

  return {
    get: vi.fn((nodeId: string) => entries.get(nodeId) ?? null),
    size: entries.size,
    _entries: entries,
  }
}

// ============================================
// CODE MODIFIER MOCKS
// ============================================

/**
 * Creates a mock CodeModifier
 */
export function createMockCodeModifier(
  initialSource = 'Frame stacked\n  Text "Hello"'
): MockCodeModifier {
  const calls: Array<{ method: string; args: unknown[] }> = []

  const createSuccessResult = (newSource: string): ModificationResult => ({
    success: true,
    newSource,
    change: { from: 0, to: initialSource.length, insert: newSource },
  })

  const createErrorResult = (error: string): ModificationResult => ({
    success: false,
    error,
  })

  const mock: MockCodeModifier = {
    _calls: calls,

    addChild: vi.fn((parentId: string, componentName: string, options?: any) => {
      calls.push({ method: 'addChild', args: [parentId, componentName, options] })

      // Build new source with x/y if provided in options
      let newLine = `  ${componentName}`
      if (options?.properties) {
        newLine += `, ${options.properties}`
      }
      if (options?.textContent) {
        newLine += ` "${options.textContent}"`
      }

      const newSource = initialSource + '\n' + newLine
      return createSuccessResult(newSource)
    }),

    addChildRelativeTo: vi.fn(
      (targetId: string, componentName: string, placement: string, options?: any) => {
        calls.push({
          method: 'addChildRelativeTo',
          args: [targetId, componentName, placement, options],
        })
        const newSource = initialSource + `\n  ${componentName}`
        return createSuccessResult(newSource)
      }
    ),

    addChildWithTemplate: vi.fn((parentId: string, template: string, options?: any) => {
      calls.push({ method: 'addChildWithTemplate', args: [parentId, template, options] })
      const newSource = initialSource + '\n' + template
      return createSuccessResult(newSource)
    }),

    addChildWithTemplateRelativeTo: vi.fn(
      (targetId: string, template: string, placement: string) => {
        calls.push({
          method: 'addChildWithTemplateRelativeTo',
          args: [targetId, template, placement],
        })
        const newSource = initialSource + '\n' + template
        return createSuccessResult(newSource)
      }
    ),

    moveNode: vi.fn(
      (
        sourceId: string,
        targetId: string,
        placement: string,
        index?: number,
        options?: { properties?: string }
      ) => {
        calls.push({ method: 'moveNode', args: [sourceId, targetId, placement, index, options] })
        // Simulate moving node with optional properties
        let newSource = initialSource
        if (options?.properties) {
          // Add properties to the first line of the moved element
          newSource = initialSource.replace(/^(\s*\w+)/, `$1, ${options.properties}`)
        }
        return createSuccessResult(newSource)
      }
    ),

    duplicateNode: vi.fn((sourceId: string, targetId: string, placement: string) => {
      calls.push({ method: 'duplicateNode', args: [sourceId, targetId, placement] })
      const newSource = initialSource + '\n  // duplicated'
      return createSuccessResult(newSource)
    }),

    updateProperty: vi.fn((nodeId: string, prop: string, value: string) => {
      calls.push({ method: 'updateProperty', args: [nodeId, prop, value] })
      return createSuccessResult(initialSource.replace(/bg [^,\n]+/, `bg ${value}`))
    }),
  }

  return mock
}

// ============================================
// CODE EXECUTOR MOCKS
// ============================================

/**
 * Creates mock CodeExecutorDependencies
 */
export function createMockCodeExecutorDeps(
  source = 'Frame stacked\n  Text "Hello"',
  preludeOffset = 0
): MockCodeExecutorDeps {
  const modifier = createMockCodeModifier(source)
  const sourceMap = createMockSourceMap()

  const deps: MockCodeExecutorDeps = {
    _modifier: modifier,

    getSource: vi.fn(() => source),
    getResolvedSource: vi.fn(() => source),
    getPreludeOffset: vi.fn(() => preludeOffset),
    getSourceMap: vi.fn(() => sourceMap as unknown as SourceMap),
    applyChange: vi.fn(),
    recompile: vi.fn(() => Promise.resolve()),
    createModifier: vi.fn(() => modifier as unknown as CodeModifier),
    getCurrentFile: vi.fn(() => 'test.mirror'),
  }

  return deps
}

/**
 * Creates a mock CodeExecutor
 */
export function createMockCodeExecutor(): CodeExecutor & {
  _executeCalls: Array<{ source: DragSource; result: DropResult }>
  _duplicateCalls: Array<{ source: DragSource; result: DropResult }>
} {
  const executeCalls: Array<{ source: DragSource; result: DropResult }> = []
  const duplicateCalls: Array<{ source: DragSource; result: DropResult }> = []

  return {
    _executeCalls: executeCalls,
    _duplicateCalls: duplicateCalls,

    execute: vi.fn((source: DragSource, result: DropResult): ExecutionResult => {
      executeCalls.push({ source, result })
      return { success: true, newSource: 'Frame stacked\n  Frame x 150, y 100' }
    }),

    duplicate: vi.fn((source: DragSource, result: DropResult): ExecutionResult => {
      duplicateCalls.push({ source, result })
      return { success: true, newSource: 'Frame stacked\n  Frame x 150, y 100' }
    }),
  }
}

// ============================================
// DROP RESULT HELPERS
// ============================================

/**
 * Creates a mock DropResult for absolute positioning
 */
export function createMockAbsoluteDropResult(
  target: DropTarget,
  position: Point,
  ghostSize: Size = { width: 100, height: 40 }
): DropResult {
  return {
    target,
    placement: 'absolute',
    targetId: target.nodeId,
    position,
    ghostSize,
  }
}

/**
 * Creates a mock DropResult for flex placement
 */
export function createMockFlexDropResult(
  target: DropTarget,
  placement: 'before' | 'after' | 'inside',
  targetId: string,
  insertionIndex?: number
): DropResult {
  return {
    target,
    placement,
    targetId,
    insertionIndex,
  }
}

// ============================================
// VISUAL STATE HELPERS
// ============================================

/**
 * Creates a mock visual state object
 */
export function createMockVisualState(
  overrides: Partial<{
    indicatorVisible: boolean
    indicatorRect: Rect | null
    parentOutlineVisible: boolean
    parentOutlineRect: Rect | null
    ghostVisible: boolean
    ghostRect: Rect | null
  }> = {}
) {
  return {
    indicatorVisible: false,
    indicatorRect: null,
    parentOutlineVisible: false,
    parentOutlineRect: null,
    ghostVisible: false,
    ghostRect: null,
    ...overrides,
  }
}
