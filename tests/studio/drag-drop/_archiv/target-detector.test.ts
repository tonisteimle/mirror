/**
 * Target Detector Unit Tests
 *
 * Tests for the helper functions in target-detector.ts:
 * - detectLayoutType
 * - detectDirection
 * - hasValidChildren
 * - isLeafComponent
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  detectLayoutType,
  detectDirection,
  hasValidChildren,
  isLeafComponent,
  detectTarget,
  LEAF_COMPONENTS,
} from '../../../studio/drag-drop/system/target-detector'
import { createMockDOMAdapter, createMockStyle, createMockRect } from '../../utils/mocks'

// ============================================
// Helper to create mock elements
// ============================================

function createElement(
  tagName: string,
  attrs: Record<string, string> = {},
  dataset: Record<string, string> = {},
  children: HTMLElement[] = []
): HTMLElement {
  const el = document.createElement(tagName)

  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }

  for (const [key, value] of Object.entries(dataset)) {
    el.dataset[key] = value
  }

  for (const child of children) {
    el.appendChild(child)
  }

  return el
}

// ============================================
// detectLayoutType Tests
// ============================================

describe('detectLayoutType', () => {
  describe('positioned containers', () => {
    it('returns "positioned" for data-layout="stacked"', () => {
      const element = createElement('div', {}, { layout: 'stacked' })
      const style = createMockStyle({ display: 'block', position: 'relative' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })

    it('returns "positioned" for data-layout="absolute"', () => {
      const element = createElement('div', {}, { layout: 'absolute' })
      const style = createMockStyle({ display: 'block', position: 'relative' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })

    it('returns "positioned" for position:relative with data-layout="abs"', () => {
      const element = createElement('div', {}, { layout: 'abs' })
      const style = createMockStyle({ position: 'relative' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })

    it('returns "positioned" for position:relative with data-mirror-absolute="true"', () => {
      const element = createElement('div', {}, { mirrorAbsolute: 'true' })
      const style = createMockStyle({ position: 'relative' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })

    it('returns "positioned" for ZStack component', () => {
      const element = createElement('div', {}, { mirrorName: 'ZStack' })
      const style = createMockStyle({ position: 'relative' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })

    it('returns "positioned" for Canvas component', () => {
      const element = createElement('div', {}, { mirrorName: 'Canvas' })
      const style = createMockStyle({ position: 'relative' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })

    it('returns "positioned" for Artboard component', () => {
      const element = createElement('div', {}, { mirrorName: 'Artboard' })
      const style = createMockStyle({ position: 'relative' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })
  })

  describe('flex containers', () => {
    it('returns "flex" for display:flex', () => {
      const element = createElement('div')
      const style = createMockStyle({ display: 'flex' })

      expect(detectLayoutType(element, style)).toBe('flex')
    })

    it('returns "flex" for display:inline-flex', () => {
      const element = createElement('div')
      const style = createMockStyle({ display: 'inline-flex' })

      expect(detectLayoutType(element, style)).toBe('flex')
    })

    it('returns "flex" for display:grid (treated as flex)', () => {
      const element = createElement('div')
      const style = createMockStyle({ display: 'grid' })

      expect(detectLayoutType(element, style)).toBe('flex')
    })

    it('returns "flex" for display:inline-grid', () => {
      const element = createElement('div')
      const style = createMockStyle({ display: 'inline-grid' })

      expect(detectLayoutType(element, style)).toBe('flex')
    })
  })

  describe('non-container elements', () => {
    it('returns "none" for display:block without flex', () => {
      const element = createElement('div')
      const style = createMockStyle({ display: 'block' })

      expect(detectLayoutType(element, style)).toBe('none')
    })

    it('returns "none" for display:inline', () => {
      const element = createElement('span')
      const style = createMockStyle({ display: 'inline' })

      expect(detectLayoutType(element, style)).toBe('none')
    })
  })

  describe('priority', () => {
    it('prioritizes data-layout over display:flex', () => {
      const element = createElement('div', {}, { layout: 'stacked' })
      const style = createMockStyle({ display: 'flex' })

      expect(detectLayoutType(element, style)).toBe('positioned')
    })
  })
})

// ============================================
// detectDirection Tests
// ============================================

describe('detectDirection', () => {
  it('returns "vertical" for flex-direction:column', () => {
    const style = createMockStyle({ flexDirection: 'column' })

    expect(detectDirection(style)).toBe('vertical')
  })

  it('returns "vertical" for flex-direction:column-reverse', () => {
    const style = createMockStyle({ flexDirection: 'column-reverse' })

    expect(detectDirection(style)).toBe('vertical')
  })

  it('returns "horizontal" for flex-direction:row', () => {
    const style = createMockStyle({ flexDirection: 'row' })

    expect(detectDirection(style)).toBe('horizontal')
  })

  it('returns "horizontal" for flex-direction:row-reverse', () => {
    const style = createMockStyle({ flexDirection: 'row-reverse' })

    expect(detectDirection(style)).toBe('horizontal')
  })

  it('returns "horizontal" as default', () => {
    const style = createMockStyle({})

    expect(detectDirection(style)).toBe('horizontal')
  })
})

// ============================================
// hasValidChildren Tests
// ============================================

describe('hasValidChildren', () => {
  const NODE_ID_ATTR = 'data-mirror-id'

  it('returns true when child has node ID', () => {
    const child = createElement('div', { [NODE_ID_ATTR]: 'child-1' })
    const parent = createElement('div', {}, {}, [child])

    expect(hasValidChildren(parent, NODE_ID_ATTR)).toBe(true)
  })

  it('returns false when no children have node ID', () => {
    const child = createElement('div')
    const parent = createElement('div', {}, {}, [child])

    expect(hasValidChildren(parent, NODE_ID_ATTR)).toBe(false)
  })

  it('returns false when element has no children', () => {
    const parent = createElement('div')

    expect(hasValidChildren(parent, NODE_ID_ATTR)).toBe(false)
  })

  it('returns true if at least one child has node ID', () => {
    const child1 = createElement('div')
    const child2 = createElement('div', { [NODE_ID_ATTR]: 'child-2' })
    const parent = createElement('div', {}, {}, [child1, child2])

    expect(hasValidChildren(parent, NODE_ID_ATTR)).toBe(true)
  })

  it('ignores text nodes', () => {
    const parent = createElement('div')
    parent.appendChild(document.createTextNode('text'))

    expect(hasValidChildren(parent, NODE_ID_ATTR)).toBe(false)
  })
})

// ============================================
// isLeafComponent Tests
// ============================================

describe('isLeafComponent', () => {
  describe('by data-mirror-name', () => {
    it('identifies Text as leaf', () => {
      const element = createElement('span', {}, { mirrorName: 'Text' })
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies Button as leaf', () => {
      const element = createElement('button', {}, { mirrorName: 'Button' })
      expect(isLeafComponent(element)).toBe(true)
    })

    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])('identifies %s as leaf', heading => {
      const element = createElement('div', {}, { mirrorName: heading })
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies Icon as leaf', () => {
      const element = createElement('span', {}, { mirrorName: 'Icon' })
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies Input as leaf', () => {
      const element = createElement('input', {}, { mirrorName: 'Input' })
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies Divider as leaf', () => {
      const element = createElement('hr', {}, { mirrorName: 'Divider' })
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies Spacer as leaf', () => {
      const element = createElement('div', {}, { mirrorName: 'Spacer' })
      expect(isLeafComponent(element)).toBe(true)
    })

    it('does not mark Frame as leaf', () => {
      const element = createElement('div', {}, { mirrorName: 'Frame' })
      expect(isLeafComponent(element)).toBe(false)
    })

    it('does not mark unknown component as leaf', () => {
      const element = createElement('div', {}, { mirrorName: 'CustomComponent' })
      expect(isLeafComponent(element)).toBe(false)
    })
  })

  describe('by HTML tag name', () => {
    it('identifies span as leaf', () => {
      const element = createElement('span')
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies button as leaf', () => {
      const element = createElement('button')
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies input as leaf', () => {
      const element = createElement('input')
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies textarea as leaf', () => {
      const element = createElement('textarea')
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies img as leaf', () => {
      const element = createElement('img')
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies hr as leaf', () => {
      const element = createElement('hr')
      expect(isLeafComponent(element)).toBe(true)
    })

    it('identifies a (anchor) as leaf', () => {
      const element = createElement('a')
      expect(isLeafComponent(element)).toBe(true)
    })

    it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])('identifies heading <%s> as leaf', tag => {
      const element = createElement(tag)
      expect(isLeafComponent(element)).toBe(true)
    })

    it('does not mark div as leaf', () => {
      const element = createElement('div')
      expect(isLeafComponent(element)).toBe(false)
    })

    it('does not mark section as leaf', () => {
      const element = createElement('section')
      expect(isLeafComponent(element)).toBe(false)
    })
  })

  describe('LEAF_COMPONENTS constant', () => {
    it('contains expected text elements', () => {
      expect(LEAF_COMPONENTS.has('text')).toBe(true)
      expect(LEAF_COMPONENTS.has('muted')).toBe(true)
      expect(LEAF_COMPONENTS.has('title')).toBe(true)
      expect(LEAF_COMPONENTS.has('label')).toBe(true)
    })

    it('contains heading elements', () => {
      for (let i = 1; i <= 6; i++) {
        expect(LEAF_COMPONENTS.has(`h${i}`)).toBe(true)
      }
    })

    it('contains interactive elements', () => {
      expect(LEAF_COMPONENTS.has('button')).toBe(true)
      expect(LEAF_COMPONENTS.has('link')).toBe(true)
    })

    it('contains form elements', () => {
      expect(LEAF_COMPONENTS.has('input')).toBe(true)
      expect(LEAF_COMPONENTS.has('textarea')).toBe(true)
    })

    it('contains media elements', () => {
      expect(LEAF_COMPONENTS.has('image')).toBe(true)
      expect(LEAF_COMPONENTS.has('img')).toBe(true)
      expect(LEAF_COMPONENTS.has('icon')).toBe(true)
    })

    it('contains layout helpers', () => {
      expect(LEAF_COMPONENTS.has('divider')).toBe(true)
      expect(LEAF_COMPONENTS.has('spacer')).toBe(true)
    })
  })
})

// ============================================
// detectTarget Integration Tests
// ============================================

describe('detectTarget', () => {
  const NODE_ID_ATTR = 'data-mirror-id'

  it('returns null for element without node ID', () => {
    const element = createElement('div')
    const adapter = createMockDOMAdapter()
    adapter.setComputedStyle({ display: 'flex' })

    expect(detectTarget(element, NODE_ID_ATTR, adapter)).toBeNull()
  })

  it('returns DropTarget for element with node ID', () => {
    const element = createElement('div', { [NODE_ID_ATTR]: 'node-1' })
    const adapter = createMockDOMAdapter()
    adapter.setComputedStyle({ display: 'flex', flexDirection: 'column' })

    const target = detectTarget(element, NODE_ID_ATTR, adapter)

    expect(target).not.toBeNull()
    expect(target?.nodeId).toBe('node-1')
    expect(target?.layoutType).toBe('flex')
    expect(target?.direction).toBe('vertical')
  })

  it('returns layoutType "none" for leaf components', () => {
    const element = createElement('span', { [NODE_ID_ATTR]: 'text-1' }, { mirrorName: 'Text' })
    const adapter = createMockDOMAdapter()

    const target = detectTarget(element, NODE_ID_ATTR, adapter)

    expect(target?.layoutType).toBe('none')
    expect(target?.hasChildren).toBe(false)
    expect(target?.isPositioned).toBe(false)
  })

  it('uses provided DOM adapter for getComputedStyle', () => {
    const element = createElement('div', { [NODE_ID_ATTR]: 'node-1' })
    const adapter = createMockDOMAdapter()
    adapter.setComputedStyle({ display: 'flex', flexDirection: 'row' })

    const target = detectTarget(element, NODE_ID_ATTR, adapter)

    expect(target?.layoutType).toBe('flex')
    expect(target?.direction).toBe('horizontal')
    expect(adapter.spies.getComputedStyle).toHaveBeenCalledWith(element)
  })

  it('detects positioned container correctly', () => {
    const element = createElement('div', { [NODE_ID_ATTR]: 'canvas-1' }, { layout: 'stacked' })
    const adapter = createMockDOMAdapter()
    adapter.setComputedStyle({ display: 'block', position: 'relative' })

    const target = detectTarget(element, NODE_ID_ATTR, adapter)

    expect(target?.layoutType).toBe('positioned')
    expect(target?.isPositioned).toBe(true)
  })

  it('detects hasChildren correctly', () => {
    const child = createElement('div', { [NODE_ID_ATTR]: 'child-1' })
    const parent = createElement('div', { [NODE_ID_ATTR]: 'parent-1' }, {}, [child])
    const adapter = createMockDOMAdapter()
    adapter.setComputedStyle({ display: 'flex' })

    const target = detectTarget(parent, NODE_ID_ATTR, adapter)

    expect(target?.hasChildren).toBe(true)
  })
})
