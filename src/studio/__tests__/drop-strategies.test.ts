/**
 * Tests for Drop Strategies
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FlexDropStrategy, createFlexDropStrategy } from '../drop-strategies/flex-strategy'
import { AbsoluteDropStrategy, createAbsoluteDropStrategy } from '../drop-strategies/absolute-strategy'
import {
  createDefaultRegistry,
  createRegistry,
  getDefaultRegistry,
  resetDefaultRegistry,
} from '../drop-strategies/registry'
import type { DropContext } from '../drop-strategies/types'

// ===========================================
// TEST HELPERS
// ===========================================

function createElement(
  styles: Partial<CSSStyleDeclaration> = {},
  dataset: Record<string, string> = {}
): HTMLElement {
  const element = document.createElement('div')
  Object.assign(element.style, styles)
  Object.entries(dataset).forEach(([key, value]) => {
    element.dataset[key] = value
  })
  document.body.appendChild(element)
  return element
}

function createChildElement(
  parent: HTMLElement,
  nodeId: string,
  rect: { left: number; top: number; width: number; height: number }
): HTMLElement {
  const child = document.createElement('div')
  child.dataset.mirrorId = nodeId
  parent.appendChild(child)

  vi.spyOn(child, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(rect.left, rect.top, rect.width, rect.height)
  )

  return child
}

function createContext(
  overrides: Partial<DropContext> = {}
): DropContext {
  return {
    clientX: 100,
    clientY: 100,
    containerRect: new DOMRect(0, 0, 400, 400),
    children: [],
    isHorizontal: true,
    ...overrides,
  }
}

function cleanupElement(element: HTMLElement): void {
  if (element.parentNode) {
    element.parentNode.removeChild(element)
  }
}

// ===========================================
// FlexDropStrategy
// ===========================================

describe('FlexDropStrategy', () => {
  let strategy: FlexDropStrategy
  let container: HTMLElement

  beforeEach(() => {
    strategy = new FlexDropStrategy()
  })

  afterEach(() => {
    if (container) {
      cleanupElement(container)
    }
    vi.restoreAllMocks()
  })

  describe('matches', () => {
    it('should match flex container', () => {
      container = createElement({ display: 'flex' })

      expect(strategy.matches(container)).toBe(true)
    })

    it('should match block container', () => {
      container = createElement({ display: 'block' })

      expect(strategy.matches(container)).toBe(true)
    })

    it('should match container with data-layout="hor"', () => {
      container = createElement({}, { layout: 'hor' })

      expect(strategy.matches(container)).toBe(true)
    })

    it('should match container with data-layout="ver"', () => {
      container = createElement({}, { layout: 'ver' })

      expect(strategy.matches(container)).toBe(true)
    })

    it('should not match absolute container', () => {
      container = createElement({ position: 'relative' }, { layout: 'abs' })

      expect(strategy.matches(container)).toBe(false)
    })

    it('should not match ZStack', () => {
      container = createElement({ position: 'relative' }, { mirrorName: 'ZStack' })

      expect(strategy.matches(container)).toBe(false)
    })
  })

  describe('calculateDropZone', () => {
    it('should calculate drop zone for empty container', () => {
      container = createElement({ display: 'flex', flexDirection: 'row' })
      container.dataset.mirrorId = 'container-1'

      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 200)
      )

      const context = createContext({
        clientX: 200,
        clientY: 100,
        containerRect: new DOMRect(0, 0, 400, 200),
        children: [],
      })

      const result = strategy.calculateDropZone(container, context)

      expect(result).not.toBeNull()
      expect(result!.layoutType).toBe('flex')
      expect(result!.placement).toBe('inside')
      expect(result!.targetId).toBe('container-1')
      expect(result!.direction).toBe('horizontal')
    })

    it('should calculate insertion slot for container with children', () => {
      container = createElement({ display: 'flex', flexDirection: 'row' })
      container.dataset.mirrorId = 'container-1'

      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 100)
      )

      const child1 = createChildElement(container, 'child-1', { left: 0, top: 0, width: 100, height: 100 })
      const child2 = createChildElement(container, 'child-2', { left: 110, top: 0, width: 100, height: 100 })

      const context = createContext({
        clientX: 105, // Between child1 and child2
        clientY: 50,
        containerRect: new DOMRect(0, 0, 400, 100),
        children: [
          { element: child1, nodeId: 'child-1' },
          { element: child2, nodeId: 'child-2' },
        ],
      })

      const result = strategy.calculateDropZone(container, context)

      expect(result).not.toBeNull()
      expect(result!.layoutType).toBe('flex')
      expect(result!.insertionIndex).toBe(1)
    })

    it('should handle vertical layout', () => {
      container = createElement({ display: 'flex', flexDirection: 'column' })
      container.dataset.mirrorId = 'container-1'

      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 400)
      )

      const context = createContext({
        clientX: 100,
        clientY: 200,
        containerRect: new DOMRect(0, 0, 200, 400),
        children: [],
      })

      const result = strategy.calculateDropZone(container, context)

      expect(result).not.toBeNull()
      expect(result!.direction).toBe('vertical')
    })

    it('should exclude source node from children', () => {
      container = createElement({ display: 'flex', flexDirection: 'row' })
      container.dataset.mirrorId = 'container-1'

      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 100)
      )

      const child1 = createChildElement(container, 'child-1', { left: 0, top: 0, width: 100, height: 100 })
      const child2 = createChildElement(container, 'child-2', { left: 110, top: 0, width: 100, height: 100 })

      const context = createContext({
        clientX: 50,
        clientY: 50,
        containerRect: new DOMRect(0, 0, 400, 100),
        children: [
          { element: child1, nodeId: 'child-1' },
          { element: child2, nodeId: 'child-2' },
        ],
        sourceNodeId: 'child-1', // Moving child-1
      })

      const result = strategy.calculateDropZone(container, context)

      // Should only consider child-2
      expect(result).not.toBeNull()
    })
  })

  describe('getIndicatorConfig', () => {
    it('should return zone config for empty container drop', () => {
      const result = {
        layoutType: 'flex' as const,
        placement: 'inside' as const,
        targetId: 'container-1',
        parentId: 'container-1',
        direction: 'horizontal' as const,
        suggestedAlignment: 'center' as const,
      }

      const config = strategy.getIndicatorConfig(result, new DOMRect(0, 0, 400, 200))

      expect(config.type).toBe('zone')
    })

    it('should return line config for sibling insertion', () => {
      const result = {
        layoutType: 'flex' as const,
        placement: 'after' as const,
        targetId: 'child-1',
        parentId: 'container-1',
        direction: 'horizontal' as const,
      }

      const config = strategy.getIndicatorConfig(result, new DOMRect(0, 0, 400, 200))

      expect(config.type).toBe('line')
    })
  })

  describe('getInsertionProperties', () => {
    it('should return empty object (flex does not add properties)', () => {
      const result = {
        layoutType: 'flex' as const,
        placement: 'inside' as const,
        targetId: 'container-1',
        parentId: 'container-1',
      }

      const props = strategy.getInsertionProperties(result)

      expect(props).toEqual({})
    })
  })

  describe('toDropZone', () => {
    it('should convert result to DropZone', () => {
      container = createElement({ display: 'flex' })

      const result = {
        layoutType: 'flex' as const,
        placement: 'after' as const,
        targetId: 'child-1',
        parentId: 'container-1',
        siblingId: 'child-1',
        insertionIndex: 1,
        direction: 'horizontal' as const,
        suggestedAlignment: 'start' as const,
      }

      const dropZone = strategy.toDropZone(result, container)

      expect(dropZone.targetId).toBe('child-1')
      expect(dropZone.placement).toBe('after')
      expect(dropZone.element).toBe(container)
      expect(dropZone.parentId).toBe('container-1')
      expect(dropZone.parentDirection).toBe('horizontal')
    })
  })
})

describe('createFlexDropStrategy', () => {
  it('should create FlexDropStrategy instance', () => {
    const strategy = createFlexDropStrategy()

    expect(strategy).toBeInstanceOf(FlexDropStrategy)
  })
})

// ===========================================
// RTL Support Tests
// ===========================================

describe('FlexDropStrategy RTL Support', () => {
  let strategy: FlexDropStrategy
  let container: HTMLElement

  beforeEach(() => {
    strategy = new FlexDropStrategy()
  })

  afterEach(() => {
    if (container) {
      cleanupElement(container)
    }
    vi.restoreAllMocks()
  })

  it('should flip alignment for RTL empty container', () => {
    container = createElement({ display: 'flex', flexDirection: 'row', direction: 'rtl' })
    container.dataset.mirrorId = 'container-1'

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 300, 100)
    )

    // Click on the LEFT side (in RTL, this is "end")
    const contextLTR = createContext({
      clientX: 50, // Left side
      clientY: 50,
      containerRect: new DOMRect(0, 0, 300, 100),
      children: [],
      isRTL: false,
    })

    const contextRTL = createContext({
      clientX: 50, // Left side (but RTL)
      clientY: 50,
      containerRect: new DOMRect(0, 0, 300, 100),
      children: [],
      isRTL: true,
    })

    const resultLTR = strategy.calculateDropZone(container, contextLTR)
    const resultRTL = strategy.calculateDropZone(container, contextRTL)

    // In LTR, left side = 'start'
    // In RTL, left side = 'end' (because RTL flips the calculation)
    expect(resultLTR!.suggestedAlignment).toBe('start')
    expect(resultRTL!.suggestedAlignment).toBe('end')
  })

  it('should calculate correct insertion slots for RTL with children', () => {
    container = createElement({ display: 'flex', flexDirection: 'row', direction: 'rtl' })
    container.dataset.mirrorId = 'container-1'

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 100)
    )

    // In RTL: child-1 is on the RIGHT, child-2 is on the LEFT
    const child1 = createChildElement(container, 'child-1', { left: 300, top: 0, width: 100, height: 100 })
    const child2 = createChildElement(container, 'child-2', { left: 0, top: 0, width: 100, height: 100 })

    const context = createContext({
      clientX: 200, // Between the children
      clientY: 50,
      containerRect: new DOMRect(0, 0, 400, 100),
      children: [
        { element: child1, nodeId: 'child-1' },
        { element: child2, nodeId: 'child-2' },
      ],
      isRTL: true,
    })

    const result = strategy.calculateDropZone(container, context)

    expect(result).not.toBeNull()
    expect(result!.insertionIndex).toBe(1) // Between the two children
  })
})

// ===========================================
// AbsoluteDropStrategy
// ===========================================

describe('AbsoluteDropStrategy', () => {
  let strategy: AbsoluteDropStrategy
  let container: HTMLElement

  beforeEach(() => {
    strategy = new AbsoluteDropStrategy()
  })

  afterEach(() => {
    if (container) {
      cleanupElement(container)
    }
    vi.restoreAllMocks()
  })

  describe('matches', () => {
    it('should match absolute container via data-layout="abs"', () => {
      container = createElement({ position: 'relative' }, { layout: 'abs' })

      expect(strategy.matches(container)).toBe(true)
    })

    it('should match ZStack', () => {
      container = createElement({ position: 'relative' }, { mirrorName: 'ZStack' })

      expect(strategy.matches(container)).toBe(true)
    })

    it('should match Canvas', () => {
      container = createElement({ position: 'relative' }, { mirrorName: 'Canvas' })

      expect(strategy.matches(container)).toBe(true)
    })

    it('should not match flex container', () => {
      container = createElement({ display: 'flex' })

      expect(strategy.matches(container)).toBe(false)
    })

    it('should not match block container', () => {
      container = createElement({ display: 'block' })

      expect(strategy.matches(container)).toBe(false)
    })
  })

  describe('calculateDropZone', () => {
    it('should calculate x/y position relative to container', () => {
      container = createElement({ position: 'relative' }, { layout: 'abs' })
      container.dataset.mirrorId = 'canvas-1'

      const context = createContext({
        clientX: 150,
        clientY: 100,
        containerRect: new DOMRect(50, 50, 400, 400),
      })

      const result = strategy.calculateDropZone(container, context)

      expect(result).not.toBeNull()
      expect(result!.layoutType).toBe('absolute')
      expect(result!.placement).toBe('inside')
      expect(result!.x).toBe(100) // 150 - 50
      expect(result!.y).toBe(50)  // 100 - 50
    })

    it('should return raw coordinates (snapping handled by CoordinateTransformer)', () => {
      // Note: Grid snapping is NOT applied by the strategy - it's handled centrally
      // by DragDropManager using CoordinateTransformer to avoid double-snapping
      strategy = new AbsoluteDropStrategy()
      container = createElement({ position: 'relative' }, { layout: 'abs' })
      container.dataset.mirrorId = 'canvas-1'

      const context = createContext({
        clientX: 57, // Raw coordinate
        clientY: 43, // Raw coordinate
        containerRect: new DOMRect(0, 0, 400, 400),
      })

      const result = strategy.calculateDropZone(container, context)

      // Strategy returns raw (rounded) coordinates - snapping is done elsewhere
      expect(result!.x).toBe(57)
      expect(result!.y).toBe(43)
    })

    it('should apply edge padding', () => {
      strategy = new AbsoluteDropStrategy({ edgePadding: 10 })
      container = createElement({ position: 'relative' }, { layout: 'abs' })
      container.dataset.mirrorId = 'canvas-1'

      const context = createContext({
        clientX: 5, // Would be 5, but edge padding forces minimum 10
        clientY: 3, // Would be 3, but edge padding forces minimum 10
        containerRect: new DOMRect(0, 0, 400, 400),
      })

      const result = strategy.calculateDropZone(container, context)

      expect(result!.x).toBe(10)
      expect(result!.y).toBe(10)
    })

    it('should ensure non-negative coordinates', () => {
      container = createElement({ position: 'relative' }, { layout: 'abs' })
      container.dataset.mirrorId = 'canvas-1'

      const context = createContext({
        clientX: -10, // Negative
        clientY: -20,
        containerRect: new DOMRect(0, 0, 400, 400),
      })

      const result = strategy.calculateDropZone(container, context)

      expect(result!.x).toBe(0)
      expect(result!.y).toBe(0)
    })
  })

  describe('getIndicatorConfig', () => {
    it('should return crosshair config', () => {
      const result = {
        layoutType: 'absolute' as const,
        placement: 'inside' as const,
        targetId: 'canvas-1',
        parentId: 'canvas-1',
        x: 100,
        y: 50,
      }

      const config = strategy.getIndicatorConfig(result, new DOMRect(0, 0, 400, 400))

      expect(config.type).toBe('crosshair')
      expect(config.x).toBe(100)
      expect(config.y).toBe(50)
    })

    it('should include position label by default', () => {
      const result = {
        layoutType: 'absolute' as const,
        placement: 'inside' as const,
        targetId: 'canvas-1',
        parentId: 'canvas-1',
        x: 100,
        y: 50,
      }

      const config = strategy.getIndicatorConfig(result, new DOMRect(0, 0, 400, 400))

      expect(config.label).toBe('x: 100, y: 50')
    })

    it('should hide label when configured', () => {
      strategy = new AbsoluteDropStrategy({ showPositionLabel: false })

      const result = {
        layoutType: 'absolute' as const,
        placement: 'inside' as const,
        targetId: 'canvas-1',
        parentId: 'canvas-1',
        x: 100,
        y: 50,
      }

      const config = strategy.getIndicatorConfig(result, new DOMRect(0, 0, 400, 400))

      expect(config.label).toBeUndefined()
    })
  })

  describe('getInsertionProperties', () => {
    it('should return x/y properties', () => {
      const result = {
        layoutType: 'absolute' as const,
        placement: 'inside' as const,
        targetId: 'canvas-1',
        parentId: 'canvas-1',
        x: 100,
        y: 50,
      }

      const props = strategy.getInsertionProperties(result)

      expect(props).toEqual({ x: '100', y: '50' })
    })
  })

  describe('toDropZone', () => {
    it('should convert result to DropZone with absolute position', () => {
      container = createElement({ position: 'relative' }, { layout: 'abs' })

      const result = {
        layoutType: 'absolute' as const,
        placement: 'inside' as const,
        targetId: 'canvas-1',
        parentId: 'canvas-1',
        x: 100,
        y: 50,
      }

      const dropZone = strategy.toDropZone(result, container)

      expect(dropZone.targetId).toBe('canvas-1')
      expect(dropZone.placement).toBe('inside')
      expect(dropZone.absolutePosition).toEqual({ x: 100, y: 50 })
      expect(dropZone.isAbsoluteContainer).toBe(true)
    })
  })

  describe('options', () => {
    it('should allow updating options', () => {
      strategy.setOptions({ snapToGrid: 8 })

      expect(strategy.getOptions().snapToGrid).toBe(8)
    })

    it('should preserve other options when updating', () => {
      strategy = new AbsoluteDropStrategy({ showPositionLabel: false })
      strategy.setOptions({ snapToGrid: 8 })

      expect(strategy.getOptions().showPositionLabel).toBe(false)
      expect(strategy.getOptions().snapToGrid).toBe(8)
    })
  })
})

describe('createAbsoluteDropStrategy', () => {
  it('should create AbsoluteDropStrategy instance', () => {
    const strategy = createAbsoluteDropStrategy()

    expect(strategy).toBeInstanceOf(AbsoluteDropStrategy)
  })

  it('should pass options to constructor', () => {
    const strategy = createAbsoluteDropStrategy({ snapToGrid: 16 })

    expect(strategy.getOptions().snapToGrid).toBe(16)
  })
})

// ===========================================
// Registry
// ===========================================

describe('Drop Strategy Registry', () => {
  let container: HTMLElement

  beforeEach(() => {
    resetDefaultRegistry()
  })

  afterEach(() => {
    if (container) {
      cleanupElement(container)
    }
    vi.restoreAllMocks()
    resetDefaultRegistry()
  })

  describe('createDefaultRegistry', () => {
    it('should create registry with default strategies', () => {
      const registry = createDefaultRegistry()

      expect(registry.getAll()).toHaveLength(2)
    })

    it('should have absolute strategy first (higher priority)', () => {
      const registry = createDefaultRegistry()
      const strategies = registry.getAll()

      expect(strategies[0].type).toBe('absolute')
      expect(strategies[1].type).toBe('flex')
    })
  })

  describe('createRegistry', () => {
    it('should create empty registry', () => {
      const registry = createRegistry()

      expect(registry.getAll()).toHaveLength(0)
    })
  })

  describe('getDefaultRegistry', () => {
    it('should return singleton instance', () => {
      const registry1 = getDefaultRegistry()
      const registry2 = getDefaultRegistry()

      expect(registry1).toBe(registry2)
    })
  })

  describe('register', () => {
    it('should add strategy to registry', () => {
      const registry = createRegistry()
      registry.register(new FlexDropStrategy())

      expect(registry.getAll()).toHaveLength(1)
    })

    it('should replace strategy with same type', () => {
      const registry = createRegistry()
      const strategy1 = new AbsoluteDropStrategy({ snapToGrid: 8 })
      const strategy2 = new AbsoluteDropStrategy({ snapToGrid: 16 })

      registry.register(strategy1)
      registry.register(strategy2)

      expect(registry.getAll()).toHaveLength(1)
      expect((registry.getStrategyByType('absolute') as AbsoluteDropStrategy).getOptions().snapToGrid).toBe(16)
    })
  })

  describe('getStrategy', () => {
    it('should return matching strategy for flex container', () => {
      const registry = createDefaultRegistry()
      container = createElement({ display: 'flex' })

      const strategy = registry.getStrategy(container)

      expect(strategy).not.toBeNull()
      expect(strategy!.type).toBe('flex')
    })

    it('should return matching strategy for absolute container', () => {
      const registry = createDefaultRegistry()
      container = createElement({ position: 'relative' }, { layout: 'abs' })

      const strategy = registry.getStrategy(container)

      expect(strategy).not.toBeNull()
      expect(strategy!.type).toBe('absolute')
    })

    it('should return null for empty registry', () => {
      const registry = createRegistry()
      container = createElement({ display: 'flex' })

      const strategy = registry.getStrategy(container)

      expect(strategy).toBeNull()
    })
  })

  describe('getStrategyByType', () => {
    it('should return strategy by type', () => {
      const registry = createDefaultRegistry()

      expect(registry.getStrategyByType('flex')!.type).toBe('flex')
      expect(registry.getStrategyByType('absolute')!.type).toBe('absolute')
    })

    it('should return null for unknown type', () => {
      const registry = createDefaultRegistry()

      expect(registry.getStrategyByType('grid')).toBeNull()
    })
  })

  describe('clear', () => {
    it('should remove all strategies', () => {
      const registry = createDefaultRegistry()
      expect(registry.getAll().length).toBeGreaterThan(0)

      registry.clear()

      expect(registry.getAll()).toHaveLength(0)
    })
  })
})
