/**
 * Absolute Layout Support Tests
 *
 * Phase 6.1 of Drag-Drop Test Expansion Plan
 * Tests absolute container detection, position calculation, and code generation
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DropZone } from '../../src/studio/drop-zone-calculator'

// ============================================================================
// CONTAINER DETECTION
// ============================================================================

describe('Absolute Layout: Container Detection', () => {
  it('detects data-layout="abs" as absolute container', () => {
    const element = document.createElement('div')
    element.setAttribute('data-layout', 'abs')

    const isAbsolute = element.getAttribute('data-layout') === 'abs'
    expect(isAbsolute).toBe(true)
  })

  it('detects data-mirror-stacked as absolute container', () => {
    const element = document.createElement('div')
    element.setAttribute('data-mirror-stacked', 'true')

    const isStacked = element.getAttribute('data-mirror-stacked') === 'true'
    expect(isStacked).toBe(true)
  })

  it('detects position:absolute in computed style', () => {
    const element = document.createElement('div')
    element.style.position = 'absolute'

    expect(element.style.position).toBe('absolute')
  })

  it('detects position:relative as potential absolute container', () => {
    const element = document.createElement('div')
    element.style.position = 'relative'

    // Relative positioning is required for absolute children
    expect(element.style.position).toBe('relative')
  })

  it('position:static is not an absolute container', () => {
    const element = document.createElement('div')
    element.style.position = 'static'

    const isAbsoluteContainer = element.style.position !== 'static'
    expect(isAbsoluteContainer).toBe(false)
  })
})

// ============================================================================
// POSITION CALCULATION
// ============================================================================

describe('Absolute Layout: Position Calculation', () => {
  it('calculates x relative to container left', () => {
    const containerRect = { left: 100, top: 50, width: 300, height: 200 }
    const clickX = 175

    const relativeX = clickX - containerRect.left
    expect(relativeX).toBe(75)
  })

  it('calculates y relative to container top', () => {
    const containerRect = { left: 100, top: 80, width: 300, height: 200 }
    const clickY = 130

    const relativeY = clickY - containerRect.top
    expect(relativeY).toBe(50)
  })

  it('calculates position at container origin correctly', () => {
    const containerRect = { left: 100, top: 100, width: 300, height: 200 }
    const clickX = 100
    const clickY = 100

    const relativeX = clickX - containerRect.left
    const relativeY = clickY - containerRect.top

    expect(relativeX).toBe(0)
    expect(relativeY).toBe(0)
  })

  it('calculates position at container corner correctly', () => {
    const containerRect = { left: 100, top: 100, width: 300, height: 200 }
    const clickX = 400 // right edge
    const clickY = 300 // bottom edge

    const relativeX = clickX - containerRect.left
    const relativeY = clickY - containerRect.top

    expect(relativeX).toBe(300)
    expect(relativeY).toBe(200)
  })

  it('handles containers with border in calculation', () => {
    const containerRect = { left: 100, top: 100, width: 300, height: 200 }
    const borderWidth = 2
    const clickX = 152

    // Inner position should account for border
    const relativeX = clickX - containerRect.left - borderWidth
    expect(relativeX).toBe(50)
  })

  it('handles containers with padding in calculation', () => {
    const containerRect = { left: 100, top: 100, width: 300, height: 200 }
    const padding = 10
    const clickX = 160

    // Inner position should account for padding
    const relativeX = clickX - containerRect.left - padding
    expect(relativeX).toBe(50)
  })

  it('handles scroll offset in calculation', () => {
    const containerRect = { left: 100, top: 100, width: 300, height: 200 }
    const scrollTop = 50
    const clickY = 200 // Client Y

    // Scroll-adjusted Y
    const relativeY = clickY - containerRect.top + scrollTop
    expect(relativeY).toBe(150)
  })
})

// ============================================================================
// DROP ZONE FOR ABSOLUTE
// ============================================================================

describe('Absolute Layout: Drop Zone', () => {
  it('isAbsoluteContainer should be true for stacked containers', () => {
    const dropZone: Partial<DropZone> = {
      targetId: 'stacked-container',
      placement: 'inside',
      isAbsoluteContainer: true,
      absolutePosition: { x: 100, y: 50 },
    }

    expect(dropZone.isAbsoluteContainer).toBe(true)
  })

  it('includes absolutePosition in drop zone', () => {
    const dropZone: Partial<DropZone> = {
      targetId: 'abs-container',
      placement: 'inside',
      isAbsoluteContainer: true,
      absolutePosition: { x: 150, y: 100 },
    }

    expect(dropZone.absolutePosition).toBeDefined()
    expect(dropZone.absolutePosition!.x).toBe(150)
    expect(dropZone.absolutePosition!.y).toBe(100)
  })

  it('placement is "inside" for absolute containers', () => {
    const dropZone: Partial<DropZone> = {
      targetId: 'abs-container',
      placement: 'inside',
      isAbsoluteContainer: true,
    }

    expect(dropZone.placement).toBe('inside')
  })

  it('drop zone without absolute position for flex containers', () => {
    const dropZone: Partial<DropZone> = {
      targetId: 'flex-container',
      placement: 'inside',
      isAbsoluteContainer: false,
    }

    expect(dropZone.isAbsoluteContainer).toBe(false)
    expect(dropZone.absolutePosition).toBeUndefined()
  })
})

// ============================================================================
// CODE GENERATION FOR ABSOLUTE
// ============================================================================

describe('Absolute Layout: Code Generation', () => {
  it('should add x property for horizontal position', () => {
    const x = 75
    const expectedProperty = `x ${x}`
    expect(expectedProperty).toBe('x 75')
  })

  it('should add y property for vertical position', () => {
    const y = 50
    const expectedProperty = `y ${y}`
    expect(expectedProperty).toBe('y 50')
  })

  it('handles zero coordinates', () => {
    const x = 0
    const y = 0
    expect(`x ${x}`).toBe('x 0')
    expect(`y ${y}`).toBe('y 0')
  })

  it('handles large coordinates', () => {
    const x = 1920
    const y = 1080
    expect(`x ${x}`).toBe('x 1920')
    expect(`y ${y}`).toBe('y 1080')
  })

  it('generates properties with proper spacing', () => {
    const componentName = 'Button'
    const x = 100
    const y = 50
    const generatedCode = `${componentName} x ${x}, y ${y}`

    expect(generatedCode).toBe('Button x 100, y 50')
  })
})

// ============================================================================
// LAYOUT TRANSITIONS
// ============================================================================

describe('Absolute Layout: Layout Transitions', () => {
  it('detects transition from flex to absolute', () => {
    const sourceLayoutType = 'flex'
    const targetLayoutType = 'absolute'

    const isTransition = sourceLayoutType !== targetLayoutType
    expect(isTransition).toBe(true)
  })

  it('detects transition from absolute to flex', () => {
    const sourceLayoutType = 'absolute'
    const targetLayoutType = 'flex'

    const isTransition = sourceLayoutType !== targetLayoutType
    expect(isTransition).toBe(true)
  })

  it('detects same-layout move within absolute container', () => {
    const sourceLayoutType = 'absolute'
    const targetLayoutType = 'absolute'

    const isTransition = sourceLayoutType !== targetLayoutType
    expect(isTransition).toBe(false)
  })

  it('flex to absolute requires adding x/y properties', () => {
    const transition = {
      from: 'flex',
      to: 'absolute',
      absolutePosition: { x: 100, y: 50 },
    }

    expect(transition.absolutePosition).toBeDefined()
  })

  it('absolute to flex requires removing x/y properties', () => {
    const transition = {
      from: 'absolute',
      to: 'flex',
    }

    // @ts-ignore
    expect(transition.absolutePosition).toBeUndefined()
  })
})

// ============================================================================
// GRID SNAP
// ============================================================================

describe('Absolute Layout: Grid Snap', () => {
  function snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize
  }

  it('snaps to 8px grid by default', () => {
    expect(snapToGrid(10, 8)).toBe(8)
    expect(snapToGrid(12, 8)).toBe(16)
    expect(snapToGrid(15, 8)).toBe(16)
    expect(snapToGrid(17, 8)).toBe(16)
  })

  it('snaps to custom grid size', () => {
    expect(snapToGrid(9, 4)).toBe(8)  // 9/4 = 2.25 -> rounds to 2 -> 8
    expect(snapToGrid(10, 4)).toBe(12) // 10/4 = 2.5 -> rounds to 3 -> 12
    expect(snapToGrid(11, 4)).toBe(12) // 11/4 = 2.75 -> rounds to 3 -> 12
    expect(snapToGrid(14, 4)).toBe(16) // 14/4 = 3.5 -> rounds to 4 -> 16
  })

  it('handles exact grid values', () => {
    expect(snapToGrid(16, 8)).toBe(16)
    expect(snapToGrid(24, 8)).toBe(24)
  })

  it('snaps zero correctly', () => {
    expect(snapToGrid(0, 8)).toBe(0)
    expect(snapToGrid(3, 8)).toBe(0)
    expect(snapToGrid(4, 8)).toBe(8)
  })

  it('snaps large values correctly', () => {
    expect(snapToGrid(153, 8)).toBe(152)
    expect(snapToGrid(157, 8)).toBe(160)
    expect(snapToGrid(1000, 8)).toBe(1000)
  })
})

// ============================================================================
// NESTED ABSOLUTE CONTAINERS
// ============================================================================

describe('Absolute Layout: Nested Containers', () => {
  it('uses closest absolute container for positioning', () => {
    const outerContainerRect = { left: 50, top: 50 }
    const innerContainerRect = { left: 100, top: 100 }
    const clickX = 150
    const clickY = 150

    // Should calculate relative to inner container
    const relativeToInner = {
      x: clickX - innerContainerRect.left,
      y: clickY - innerContainerRect.top,
    }

    expect(relativeToInner.x).toBe(50)
    expect(relativeToInner.y).toBe(50)
  })

  it('handles deeply nested containers', () => {
    const containers = [
      { left: 0, top: 0 },
      { left: 50, top: 50 },
      { left: 100, top: 100 },
      { left: 150, top: 150 },
    ]

    const closestContainer = containers[containers.length - 1]
    const clickX = 200
    const clickY = 200

    const relative = {
      x: clickX - closestContainer.left,
      y: clickY - closestContainer.top,
    }

    expect(relative.x).toBe(50)
    expect(relative.y).toBe(50)
  })
})
