/**
 * Tests for FlexDropStrategy - Move Only Child
 *
 * Verifies that when moving the only child in a container,
 * the 9-zone alignment model is used instead of sibling insertion.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FlexDropStrategy } from '../drop-strategies/flex-strategy'
import type { DropContext } from '../drop-strategies/types'
import { JSDOM } from 'jsdom'

describe('FlexDropStrategy - Move Only Child', () => {
  let strategy: FlexDropStrategy
  let container: HTMLElement
  let childElement: HTMLElement

  beforeEach(() => {
    strategy = new FlexDropStrategy()

    // Create mock DOM elements
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document

    // Create container with flex layout
    container = document.createElement('div')
    container.setAttribute('data-mirror-id', 'container-1')
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.padding = '20px'

    // Create child element
    childElement = document.createElement('div')
    childElement.setAttribute('data-mirror-id', 'child-1')
    container.appendChild(childElement)

    document.body.appendChild(container)

    // Mock getBoundingClientRect
    container.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 600,
      width: 1000,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    // Mock getComputedStyle
    ;(dom.window as any).getComputedStyle = () => ({
      display: 'flex',
      flexDirection: 'column',
      position: 'static',
      direction: 'ltr',
      transform: 'none',
      paddingLeft: '20px',
      paddingRight: '20px',
      paddingTop: '20px',
      paddingBottom: '20px',
    })

    // Make getComputedStyle available globally for the strategy
    global.window = dom.window as any
  })

  it('should use 9-zone model when moving the only child (center drop)', () => {
    const context: DropContext = {
      clientX: 500, // Center X
      clientY: 300, // Center Y
      sourceNodeId: 'child-1', // The only child - being moved
      containerRect: {
        left: 0,
        top: 0,
        right: 1000,
        bottom: 600,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
      children: [{ element: childElement, nodeId: 'child-1' }],
      isHorizontal: false,
    }

    const result = strategy.calculateDropZone(container, context)

    expect(result).not.toBeNull()
    expect(result!.placement).toBe('inside')
    expect(result!.suggestedAlignment).toBe('center')
    expect(result!.suggestedCrossAlignment).toBe('center')
  })

  it('should use 9-zone model when moving the only child (top-left drop)', () => {
    const context: DropContext = {
      clientX: 50, // Left third
      clientY: 50, // Top third
      sourceNodeId: 'child-1',
      containerRect: {
        left: 0,
        top: 0,
        right: 1000,
        bottom: 600,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
      children: [{ element: childElement, nodeId: 'child-1' }],
      isHorizontal: false,
    }

    const result = strategy.calculateDropZone(container, context)

    expect(result).not.toBeNull()
    expect(result!.placement).toBe('inside')
    expect(result!.suggestedAlignment).toBe('start')
    expect(result!.suggestedCrossAlignment).toBe('start')
  })

  it('should use 9-zone model when moving the only child (bottom-right drop)', () => {
    const context: DropContext = {
      clientX: 950, // Right third
      clientY: 550, // Bottom third
      sourceNodeId: 'child-1',
      containerRect: {
        left: 0,
        top: 0,
        right: 1000,
        bottom: 600,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
      children: [{ element: childElement, nodeId: 'child-1' }],
      isHorizontal: false,
    }

    const result = strategy.calculateDropZone(container, context)

    expect(result).not.toBeNull()
    expect(result!.placement).toBe('inside')
    expect(result!.suggestedAlignment).toBe('end')
    expect(result!.suggestedCrossAlignment).toBe('end')
  })

  it('should NOT use 9-zone when container has other children', () => {
    // Add a second child
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document
    const secondChild = document.createElement('div')
    secondChild.setAttribute('data-mirror-id', 'child-2')

    // Mock rect for second child
    secondChild.getBoundingClientRect = () => ({
      left: 0,
      top: 300,
      right: 100,
      bottom: 400,
      width: 100,
      height: 100,
      x: 0,
      y: 300,
      toJSON: () => ({}),
    })

    const context: DropContext = {
      clientX: 500,
      clientY: 300,
      sourceNodeId: 'child-1', // Moving child-1, but child-2 remains
      containerRect: {
        left: 0,
        top: 0,
        right: 1000,
        bottom: 600,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
      children: [
        { element: childElement, nodeId: 'child-1' },
        { element: secondChild, nodeId: 'child-2' },
      ],
      isHorizontal: false,
    }

    const result = strategy.calculateDropZone(container, context)

    expect(result).not.toBeNull()
    // Should use sibling insertion, not 9-zone
    expect(result!.placement).not.toBe('inside')
    expect(['before', 'after']).toContain(result!.placement)
  })

  it('should use 9-zone for empty container (no sourceNodeId)', () => {
    const context: DropContext = {
      clientX: 500,
      clientY: 300,
      sourceNodeId: undefined, // New element being dropped
      containerRect: {
        left: 0,
        top: 0,
        right: 1000,
        bottom: 600,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
      children: [], // Empty container
      isHorizontal: false,
    }

    const result = strategy.calculateDropZone(container, context)

    expect(result).not.toBeNull()
    expect(result!.placement).toBe('inside')
    expect(result!.suggestedAlignment).toBe('center')
    expect(result!.suggestedCrossAlignment).toBe('center')
  })
})
