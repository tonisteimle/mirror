/**
 * DragTestRunner - Unit Tests
 *
 * Tests the DragTestRunner class and fluent API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DragTestRunner,
  createDragTest,
  setDragDataHelpers,
  resetDragDataHelpers,
} from '../../../studio/preview/drag/test-api/drag-test-runner'
import { createMockContext, createMockContextWithDropSimulation } from './mock-context'

// Mock the drag controller
vi.mock('../../../studio/preview/drag/drag-controller', () => ({
  getDragController: () => ({
    simulateDrop: vi.fn().mockResolvedValue(undefined),
    setTestSource: vi.fn(),
    setTestTarget: vi.fn(),
    getTestState: vi.fn().mockReturnValue({ state: 'idle', source: null, target: null }),
  }),
}))

// Create mock drag data helpers
const mockDragDataHelpers = {
  setCurrentDragData: vi.fn(),
  clearCurrentDragData: vi.fn(),
  setCanvasDragData: vi.fn(),
}

describe('DragTestRunner', () => {
  // Set up mock helpers before each test
  beforeEach(() => {
    setDragDataHelpers(mockDragDataHelpers)
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetDragDataHelpers()
  })

  describe('constructor', () => {
    it('should create runner with default config', () => {
      const context = createMockContext()
      const runner = new DragTestRunner(context)
      expect(runner).toBeDefined()
    })

    it('should accept custom config', () => {
      const context = createMockContext()
      const runner = new DragTestRunner(context, {
        captureTimings: false,
        timeout: 1000,
      })
      expect(runner).toBeDefined()
    })
  })

  describe('simulatePaletteDrag', () => {
    let context: ReturnType<typeof createMockContextWithDropSimulation>
    let runner: DragTestRunner

    beforeEach(() => {
      context = createMockContextWithDropSimulation('Frame gap 8')
      runner = new DragTestRunner(context)
    })

    it('should return result with success flag', async () => {
      // Simulate code change after drop
      setTimeout(() => {
        context.simulateCodeChange('Frame gap 8\n  Button "Button"')
      }, 50)

      const result = await runner.simulatePaletteDrag({
        componentType: 'Button',
        targetNodeId: 'node-1',
        insertionIndex: 0,
      })

      expect(result.success).toBe(true)
    })

    it('should include source and target in result', async () => {
      setTimeout(() => {
        context.simulateCodeChange('Frame gap 8\n  Button "Button"')
      }, 50)

      const result = await runner.simulatePaletteDrag({
        componentType: 'Button',
        targetNodeId: 'node-1',
        insertionIndex: 0,
      })

      expect(result.source.type).toBe('palette')
      expect(result.source.componentName).toBe('Button')
      expect(result.target.containerId).toBe('node-1')
      expect(result.target.insertionIndex).toBe(0)
    })

    it('should capture code changes', async () => {
      const codeBefore = context.getCode()

      setTimeout(() => {
        context.simulateCodeChange('Frame gap 8\n  Button "Button"')
      }, 50)

      const result = await runner.simulatePaletteDrag({
        componentType: 'Button',
        targetNodeId: 'node-1',
        insertionIndex: 0,
      })

      expect(result.codeChange.before).toBe(codeBefore)
      expect(result.codeChange.after).toContain('Button')
    })

    it('should return error for unknown component', async () => {
      const result = await runner.simulatePaletteDrag({
        componentType: 'NonExistentComponent',
        targetNodeId: 'node-1',
        insertionIndex: 0,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown component type')
    })

    it('should include timing info when enabled', async () => {
      setTimeout(() => {
        context.simulateCodeChange('Frame gap 8\n  Text "Text"')
      }, 50)

      const result = await runner.simulatePaletteDrag({
        componentType: 'Text',
        targetNodeId: 'node-1',
        insertionIndex: 0,
      })

      expect(result.timing).toBeDefined()
      expect(result.timing?.dropDuration).toBeGreaterThanOrEqual(0)
      expect(result.timing?.totalDuration).toBeGreaterThanOrEqual(0)
    })

    it('should not include timing when disabled', async () => {
      const runnerNoTiming = new DragTestRunner(context, { captureTimings: false })

      setTimeout(() => {
        context.simulateCodeChange('Frame gap 8\n  Icon "star"')
      }, 50)

      const result = await runnerNoTiming.simulatePaletteDrag({
        componentType: 'Icon',
        targetNodeId: 'node-1',
        insertionIndex: 0,
      })

      expect(result.timing).toBeUndefined()
    })
  })

  describe('simulateCanvasMove', () => {
    let context: ReturnType<typeof createMockContextWithDropSimulation>
    let runner: DragTestRunner

    beforeEach(() => {
      context = createMockContextWithDropSimulation(`Frame gap 8
  Text "First"
  Text "Second"`)
      runner = new DragTestRunner(context)
    })

    it('should return result with success flag', async () => {
      setTimeout(() => {
        context.simulateCodeChange(`Frame gap 8
  Text "Second"
  Text "First"`)
      }, 50)

      const result = await runner.simulateCanvasMove({
        sourceNodeId: 'node-2',
        targetNodeId: 'node-1',
        insertionIndex: 1,
      })

      expect(result.success).toBe(true)
    })

    it('should include canvas source type', async () => {
      setTimeout(() => {
        context.simulateCodeChange(`Frame gap 8
  Text "Second"
  Text "First"`)
      }, 50)

      const result = await runner.simulateCanvasMove({
        sourceNodeId: 'node-2',
        targetNodeId: 'node-1',
        insertionIndex: 1,
      })

      expect(result.source.type).toBe('canvas')
      expect(result.source.nodeId).toBe('node-2')
    })
  })

  describe('setCode / getCode', () => {
    it('should set and get code through context', () => {
      const context = createMockContext('initial code')
      const runner = new DragTestRunner(context)

      expect(runner.getCode()).toBe('initial code')

      runner.setCode('new code')
      expect(runner.getCode()).toBe('new code')
    })
  })

  describe('getFixtures', () => {
    it('should return all fixtures', () => {
      const context = createMockContext()
      const runner = new DragTestRunner(context)

      const fixtures = runner.getFixtures()

      expect(fixtures.components).toBeDefined()
      expect(fixtures.containers).toBeDefined()
      expect(Object.keys(fixtures.components).length).toBeGreaterThan(0)
      expect(fixtures.containers.length).toBeGreaterThan(0)
    })
  })
})

describe('Fluent API (createDragTest)', () => {
  let context: ReturnType<typeof createMockContextWithDropSimulation>

  beforeEach(() => {
    setDragDataHelpers(mockDragDataHelpers)
    vi.clearAllMocks()
    context = createMockContextWithDropSimulation('Frame gap 8')
  })

  afterEach(() => {
    resetDragDataHelpers()
  })

  describe('fromPalette', () => {
    it('should build palette drag params', async () => {
      setTimeout(() => {
        context.simulateCodeChange('Frame gap 8\n  Button "Click me"')
      }, 50)

      const result = await createDragTest(context)
        .fromPalette('Button')
        .withText('Click me')
        .toContainer('node-1')
        .atPosition(0)
        .execute()

      expect(result.source.type).toBe('palette')
      expect(result.source.componentName).toBe('Button')
    })

    it('should throw without target container', async () => {
      const builder = createDragTest(context).fromPalette('Button').atPosition(0)

      await expect(builder.execute()).rejects.toThrow('Target container must be specified')
    })
  })

  describe('fromCanvas', () => {
    it('should build canvas move params', async () => {
      setTimeout(() => {
        context.simulateCodeChange('Frame gap 8\n  Text "moved"')
      }, 50)

      const result = await createDragTest(context)
        .fromCanvas('node-2')
        .toContainer('node-1')
        .atPosition(1)
        .execute()

      expect(result.source.type).toBe('canvas')
      expect(result.source.nodeId).toBe('node-2')
    })
  })

  describe('withCode', () => {
    it('should set initial code before test', async () => {
      const customCode = 'Frame hor, gap 4'

      setTimeout(() => {
        context.simulateCodeChange('Frame hor, gap 4\n  Button "Test"')
      }, 50)

      const result = await createDragTest(context)
        .withCode(customCode)
        .fromPalette('Button')
        .toContainer('node-1')
        .atPosition(0)
        .execute()

      expect(result.codeChange.before).toBe(customCode)
    })
  })
})

describe('DragTestRunner diff generation', () => {
  beforeEach(() => {
    setDragDataHelpers(mockDragDataHelpers)
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetDragDataHelpers()
  })

  it('should generate simple diff', async () => {
    const context = createMockContextWithDropSimulation('Frame gap 8')
    const runner = new DragTestRunner(context)

    setTimeout(() => {
      context.simulateCodeChange('Frame gap 8\n  Button "New"')
    }, 50)

    const result = await runner.simulatePaletteDrag({
      componentType: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      textContent: 'New',
    })

    expect(result.codeChange.diff).toContain('+')
    expect(result.codeChange.diff).toContain('Button')
  })
})
