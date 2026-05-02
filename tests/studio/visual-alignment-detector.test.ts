/**
 * studio/visual/layout-inference/alignment-detector
 *
 * Detects groups of horizontally-aligned absolutely-positioned elements
 * inside a container. Runs against jsdom; we mock getBoundingClientRect
 * since jsdom doesn't compute layout.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AlignmentDetector } from '../../studio/visual/layout-inference/alignment-detector'

interface RectSpec {
  nodeId: string
  x: number
  y: number
  width: number
  height: number
  position?: 'absolute' | 'relative' | 'static'
}

let container: HTMLElement

function setup(rects: RectSpec[]): void {
  container = document.createElement('div')
  container.style.position = 'relative'
  document.body.appendChild(container)

  for (const spec of rects) {
    const el = document.createElement('div')
    el.setAttribute('data-mirror-id', spec.nodeId)
    el.style.position = spec.position ?? 'absolute'
    el.style.left = `${spec.x}px`
    el.style.top = `${spec.y}px`
    el.style.width = `${spec.width}px`
    el.style.height = `${spec.height}px`

    el.getBoundingClientRect = () =>
      ({
        x: spec.x,
        y: spec.y,
        left: spec.x,
        top: spec.y,
        right: spec.x + spec.width,
        bottom: spec.y + spec.height,
        width: spec.width,
        height: spec.height,
        toJSON: () => ({}),
      }) as DOMRect

    container.appendChild(el)
  }
}

beforeEach(() => {
  // Clean DOM between tests
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AlignmentDetector — basic detection', () => {
  it('finds horizontally-aligned absolutely-positioned elements', () => {
    setup([
      { nodeId: 'a', x: 10, y: 50, width: 50, height: 50 },
      { nodeId: 'b', x: 100, y: 50, width: 50, height: 50 },
      { nodeId: 'c', x: 200, y: 50, width: 50, height: 50 },
    ])

    const detector = new AlignmentDetector({ container })
    const result = detector.detect()
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].type).toBe('horizontal')
    expect(result.groups[0].elements).toHaveLength(3)
  })

  it('skips non-absolute elements', () => {
    setup([
      { nodeId: 'a', x: 10, y: 50, width: 50, height: 50, position: 'relative' },
      { nodeId: 'b', x: 100, y: 50, width: 50, height: 50, position: 'relative' },
    ])
    const detector = new AlignmentDetector({ container })
    const result = detector.detect()
    expect(result.groups).toHaveLength(0)
  })

  it('skips elements without a node id attribute', () => {
    container = document.createElement('div')
    container.style.position = 'relative'
    document.body.appendChild(container)

    const noIdEl = document.createElement('div')
    noIdEl.style.position = 'absolute'
    noIdEl.style.left = '10px'
    noIdEl.style.top = '50px'
    container.appendChild(noIdEl)

    const detector = new AlignmentDetector({ container })
    const result = detector.detect()
    expect(result.groups).toHaveLength(0)
  })
})

describe('AlignmentDetector — group size threshold', () => {
  it('respects minGroupSize=3 (skips pair-only alignments)', () => {
    setup([
      { nodeId: 'a', x: 10, y: 50, width: 50, height: 50 },
      { nodeId: 'b', x: 100, y: 50, width: 50, height: 50 },
    ])
    const detector = new AlignmentDetector({ container, minGroupSize: 3 })
    const result = detector.detect()
    expect(result.groups).toHaveLength(0)
  })

  it('default minGroupSize=2 picks up pairs', () => {
    setup([
      { nodeId: 'a', x: 10, y: 50, width: 50, height: 50 },
      { nodeId: 'b', x: 100, y: 50, width: 50, height: 50 },
    ])
    const detector = new AlignmentDetector({ container })
    const result = detector.detect()
    expect(result.groups).toHaveLength(1)
  })
})

describe('AlignmentDetector — separates groups by Y center', () => {
  it('two horizontal rows produce two groups', () => {
    setup([
      // Row 1
      { nodeId: 'a', x: 10, y: 0, width: 50, height: 50 },
      { nodeId: 'b', x: 100, y: 0, width: 50, height: 50 },
      // Row 2 (different Y)
      { nodeId: 'c', x: 10, y: 200, width: 50, height: 50 },
      { nodeId: 'd', x: 100, y: 200, width: 50, height: 50 },
    ])
    const detector = new AlignmentDetector({ container })
    const result = detector.detect()
    expect(result.groups).toHaveLength(2)
  })
})

describe('AlignmentDetector — gap inference', () => {
  it('infers consistent gap as suggested DSL', () => {
    setup([
      { nodeId: 'a', x: 0, y: 50, width: 50, height: 50 },
      { nodeId: 'b', x: 60, y: 50, width: 50, height: 50 }, // gap = 10
      { nodeId: 'c', x: 120, y: 50, width: 50, height: 50 }, // gap = 10
    ])
    const detector = new AlignmentDetector({ container })
    const result = detector.detect()
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].suggestedDSL).toMatch(/hor.*gap/)
    expect(result.groups[0].inferredGap).toBeGreaterThan(0)
  })
})
