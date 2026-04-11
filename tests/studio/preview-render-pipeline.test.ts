/**
 * RenderPipeline Tests
 *
 * Phase 2 of Preview Architecture Refactoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  RenderPipeline,
  createRenderPipeline,
  nextFrame,
  delay,
} from '../../studio/preview/render-pipeline'
import { state, actions } from '../../studio/core/state'
import { events } from '../../studio/core/events'

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
global.window = dom.window as unknown as Window & typeof globalThis

// Mock requestAnimationFrame
let rafCallbacks: (() => void)[] = []
global.requestAnimationFrame = (callback: () => void) => {
  rafCallbacks.push(callback)
  return rafCallbacks.length
}
global.cancelAnimationFrame = (id: number) => {
  rafCallbacks = rafCallbacks.filter((_, i) => i !== id - 1)
}

function flushRAF() {
  const callbacks = [...rafCallbacks]
  rafCallbacks = []
  callbacks.forEach(cb => cb())
}

describe('RenderPipeline', () => {
  let container: HTMLElement
  let pipeline: RenderPipeline

  beforeEach(() => {
    // Reset state
    actions.clearLayoutInfo()
    rafCallbacks = []

    // Create container
    container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    // Mock getBoundingClientRect for container
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      right: 800,
      bottom: 600,
      left: 0,
      toJSON: () => ({}),
    })
  })

  afterEach(() => {
    pipeline?.dispose()
    container.remove()
    vi.restoreAllMocks()
    events.clearAll()
  })

  describe('constructor', () => {
    it('creates pipeline with default options', () => {
      pipeline = createRenderPipeline({ container })
      expect(pipeline).toBeInstanceOf(RenderPipeline)
    })

    it('auto-attaches when autoExtract is true (default)', () => {
      pipeline = createRenderPipeline({ container })

      // Add an element
      const element = createMirrorElement('node-1', container)

      // Emit compile:completed
      events.emit('compile:completed', {
        ast: {} as any,
        ir: {} as any,
        sourceMap: {} as any,
        version: 1,
        hasErrors: false,
      })

      // Flush double-RAF
      flushRAF()
      flushRAF()

      // Layout should be extracted
      expect(state.get().layoutInfo.has('node-1')).toBe(true)
    })

    it('does not auto-attach when autoExtract is false', () => {
      pipeline = createRenderPipeline({ container, autoExtract: false })

      const element = createMirrorElement('node-1', container)

      events.emit('compile:completed', {
        ast: {} as any,
        ir: {} as any,
        sourceMap: {} as any,
        version: 1,
        hasErrors: false,
      })

      flushRAF()
      flushRAF()

      // Layout should NOT be extracted
      expect(state.get().layoutInfo.has('node-1')).toBe(false)
    })
  })

  describe('attach() and detach()', () => {
    it('attach enables event listening', () => {
      pipeline = createRenderPipeline({ container, autoExtract: false })
      pipeline.attach()

      const element = createMirrorElement('node-1', container)

      events.emit('compile:completed', {
        ast: {} as any,
        ir: {} as any,
        sourceMap: {} as any,
        version: 1,
        hasErrors: false,
      })

      flushRAF()
      flushRAF()

      expect(state.get().layoutInfo.has('node-1')).toBe(true)
    })

    it('detach stops event listening', () => {
      pipeline = createRenderPipeline({ container })
      pipeline.detach()

      const element = createMirrorElement('node-1', container)

      events.emit('compile:completed', {
        ast: {} as any,
        ir: {} as any,
        sourceMap: {} as any,
        version: 1,
        hasErrors: false,
      })

      flushRAF()
      flushRAF()

      expect(state.get().layoutInfo.has('node-1')).toBe(false)
    })

    it('attach is idempotent', () => {
      pipeline = createRenderPipeline({ container })
      pipeline.attach()
      pipeline.attach() // Should not add duplicate listener

      const element = createMirrorElement('node-1', container)

      events.emit('compile:completed', {
        ast: {} as any,
        ir: {} as any,
        sourceMap: {} as any,
        version: 1,
        hasErrors: false,
      })

      flushRAF()
      flushRAF()

      // Should only have extracted once (layoutVersion = 1)
      expect(state.get().layoutVersion).toBe(1)
    })
  })

  describe('extractLayoutNow()', () => {
    it('extracts layout synchronously', () => {
      pipeline = createRenderPipeline({ container, autoExtract: false })

      const element = createMirrorElement('node-1', container)

      pipeline.extractLayoutNow()

      expect(state.get().layoutInfo.has('node-1')).toBe(true)
    })

    it('does not require RAF', () => {
      pipeline = createRenderPipeline({ container, autoExtract: false })

      const element = createMirrorElement('node-1', container)

      pipeline.extractLayoutNow()

      // Should work without flushing RAF
      expect(state.get().layoutInfo.size).toBe(1)
    })
  })

  describe('scheduleLayoutExtraction()', () => {
    it('uses double-RAF for stability', () => {
      pipeline = createRenderPipeline({ container, autoExtract: false })

      const element = createMirrorElement('node-1', container)

      pipeline.scheduleLayoutExtraction()

      // After first RAF, should not be extracted yet
      flushRAF()
      expect(state.get().layoutInfo.has('node-1')).toBe(false)

      // After second RAF, should be extracted
      flushRAF()
      expect(state.get().layoutInfo.has('node-1')).toBe(true)
    })

    it('cancels pending extraction when called again', () => {
      pipeline = createRenderPipeline({ container, autoExtract: false })

      const element1 = createMirrorElement('node-1', container)

      pipeline.scheduleLayoutExtraction()
      flushRAF() // First RAF done

      // Add another element and reschedule
      const element2 = createMirrorElement('node-2', container)
      pipeline.scheduleLayoutExtraction()

      // Complete all RAFs
      flushRAF()
      flushRAF()
      flushRAF()

      // Both elements should be in layout info
      expect(state.get().layoutInfo.has('node-1')).toBe(true)
      expect(state.get().layoutInfo.has('node-2')).toBe(true)

      // Only one extraction should have happened (version = 1)
      expect(state.get().layoutVersion).toBe(1)
    })
  })

  describe('onLayoutExtracted callback', () => {
    it('calls callback after extraction', () => {
      const callback = vi.fn()
      pipeline = createRenderPipeline({
        container,
        onLayoutExtracted: callback,
      })

      createMirrorElement('node-1', container)

      events.emit('compile:completed', {
        ast: {} as any,
        ir: {} as any,
        sourceMap: {} as any,
        version: 1,
        hasErrors: false,
      })

      flushRAF()
      flushRAF()

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('preview:rendered event', () => {
    it('emits success: true on successful extraction', () => {
      const handler = vi.fn()
      events.on('preview:rendered', handler)

      pipeline = createRenderPipeline({ container })

      createMirrorElement('node-1', container)

      events.emit('compile:completed', {
        ast: {} as any,
        ir: {} as any,
        sourceMap: {} as any,
        version: 1,
        hasErrors: false,
      })

      flushRAF()
      flushRAF()

      expect(handler).toHaveBeenCalledWith({ success: true })
    })
  })

  describe('dispose()', () => {
    it('cleans up resources', () => {
      pipeline = createRenderPipeline({ container })

      createMirrorElement('node-1', container)

      pipeline.scheduleLayoutExtraction()
      pipeline.dispose()

      // Should not extract after dispose
      flushRAF()
      flushRAF()

      // Initial layoutVersion is 0, should stay 0
      expect(state.get().layoutVersion).toBe(0)
    })
  })
})

describe('nextFrame utility', () => {
  it('resolves after double-RAF', async () => {
    let resolved = false

    const promise = nextFrame().then(() => {
      resolved = true
    })

    expect(resolved).toBe(false)

    flushRAF()
    expect(resolved).toBe(false)

    flushRAF()
    await promise
    expect(resolved).toBe(true)
  })
})

describe('delay utility', () => {
  it('resolves after specified time', async () => {
    vi.useFakeTimers()

    let resolved = false
    const promise = delay(100).then(() => {
      resolved = true
    })

    expect(resolved).toBe(false)

    vi.advanceTimersByTime(50)
    expect(resolved).toBe(false)

    vi.advanceTimersByTime(50)
    await promise
    expect(resolved).toBe(true)

    vi.useRealTimers()
  })
})

/**
 * Helper to create a mock element with data-mirror-id
 */
function createMirrorElement(
  nodeId: string,
  parent: HTMLElement,
  options: {
    x?: number
    y?: number
    width?: number
    height?: number
  } = {}
): HTMLElement {
  const { x = 0, y = 0, width = 100, height = 100 } = options

  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', nodeId)
  parent.appendChild(element)

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    toJSON: () => ({}),
  })

  return element
}
