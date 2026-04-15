/**
 * DragTestRunner - Orchestrates programmatic drag & drop tests
 *
 * This class provides a high-level API for testing drag & drop operations
 * without requiring real DOM events. It:
 * - Sets up global drag data (simulating palette drag start)
 * - Calls DragController.simulateDrop() to execute the drop
 * - Captures before/after code changes
 * - Returns structured results for assertions
 *
 * @example
 * ```typescript
 * const runner = new DragTestRunner({ getCode, setCode, recompile })
 *
 * const result = await runner.simulatePaletteDrag({
 *   componentType: 'Button',
 *   targetNodeId: 'node-1',
 *   insertionIndex: 0,
 * })
 *
 * expect(result.success).toBe(true)
 * expect(result.codeChange.after).toContain('Button "Button"')
 * ```
 */

import { getDragController, type DragController } from '../drag-controller'
import type { DragSource, DropTarget } from '../types'
import type {
  DragTestConfig,
  DragTestContext,
  DragTestResult,
  PaletteDragParams,
  CanvasMoveParams,
  ComponentFixture,
} from './types'
import { getFixture, ALL_COMPONENTS } from './fixtures'
import { ALL_CONTAINERS } from './fixtures/container-setups'

// =============================================================================
// Drag Data Helpers (optional dependency injection for testing)
// =============================================================================

export interface DragDataHelpers {
  setCurrentDragData: (data: any) => void
  clearCurrentDragData: () => void
  setCanvasDragData: (nodeId: string) => void
}

// Default implementation using real drag-preview module
let dragDataHelpers: DragDataHelpers | null = null

function getDragDataHelpers(): DragDataHelpers {
  if (!dragDataHelpers) {
    // Lazy-load to avoid circular dependencies
    const dragPreview = require('../../drag-preview')
    dragDataHelpers = {
      setCurrentDragData: dragPreview.setCurrentDragData,
      clearCurrentDragData: dragPreview.clearCurrentDragData,
      setCanvasDragData: dragPreview.setCanvasDragData,
    }
  }
  return dragDataHelpers
}

/**
 * Set drag data helpers for testing (dependency injection)
 */
export function setDragDataHelpers(helpers: DragDataHelpers): void {
  dragDataHelpers = helpers
}

/**
 * Reset drag data helpers to default
 */
export function resetDragDataHelpers(): void {
  dragDataHelpers = null
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<DragTestConfig> = {
  captureTimings: true,
  captureCodeChanges: true,
  timeout: 5000,
  resetBetweenTests: true,
}

/**
 * DragTestRunner - Main test orchestration class
 */
export class DragTestRunner {
  private config: Required<DragTestConfig>
  private context: DragTestContext

  constructor(context: DragTestContext, config: Partial<DragTestConfig> = {}) {
    this.context = context
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Simulate a palette drag operation
   *
   * This simulates dragging a component from the palette to a target container.
   * It sets up the global drag data, executes the drop, and returns the result.
   */
  async simulatePaletteDrag(params: PaletteDragParams): Promise<DragTestResult> {
    const startTime = performance.now()
    const codeBefore = this.config.captureCodeChanges ? this.context.getCode() : ''

    // Get fixture for component type
    const fixture = getFixture(params.componentType)
    if (!fixture) {
      return this.createErrorResult(`Unknown component type: ${params.componentType}`, codeBefore)
    }

    // Build drag source
    const source: DragSource = {
      type: 'palette',
      componentName: fixture.componentName,
      template: fixture.template,
    }

    // Build drop target
    const target: DropTarget = {
      containerId: params.targetNodeId,
      insertionIndex: params.insertionIndex,
    }

    // Set up global drag data (simulating ComponentPanel.handleDragStart)
    this.setGlobalDragData({
      componentName: fixture.componentName,
      properties: params.properties ?? fixture.properties,
      textContent: params.textContent ?? fixture.textContent,
      children: params.children,
      fromComponentPanel: true,
    })

    try {
      // Execute drop via DragController
      const dropStartTime = performance.now()
      await getDragController().simulateDrop(source, target)
      const dropDuration = performance.now() - dropStartTime

      // Wait for code modification (async)
      await this.waitForCodeChange(codeBefore)
      const codeModificationDuration = performance.now() - dropStartTime - dropDuration

      const codeAfter = this.context.getCode()
      const totalDuration = performance.now() - startTime

      return {
        success: true,
        source,
        target,
        codeChange: {
          before: codeBefore,
          after: codeAfter,
          diff: this.createDiff(codeBefore, codeAfter),
        },
        timing: this.config.captureTimings
          ? {
              dropDuration,
              codeModificationDuration,
              totalDuration,
            }
          : undefined,
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error),
        codeBefore
      )
    } finally {
      this.clearGlobalDragData()
    }
  }

  /**
   * Simulate a canvas element move operation
   *
   * This simulates dragging an existing element from one position to another.
   */
  async simulateCanvasMove(params: CanvasMoveParams): Promise<DragTestResult> {
    const startTime = performance.now()
    const codeBefore = this.config.captureCodeChanges ? this.context.getCode() : ''

    // Build drag source
    const source: DragSource = {
      type: 'canvas',
      nodeId: params.sourceNodeId,
    }

    // Build drop target
    const target: DropTarget = {
      containerId: params.targetNodeId,
      insertionIndex: params.insertionIndex,
    }

    // Set canvas drag data
    this.setCanvasDragData(params.sourceNodeId)

    try {
      // Execute drop via DragController
      const dropStartTime = performance.now()
      await getDragController().simulateDrop(source, target)
      const dropDuration = performance.now() - dropStartTime

      // Wait for code modification
      await this.waitForCodeChange(codeBefore)
      const codeModificationDuration = performance.now() - dropStartTime - dropDuration

      const codeAfter = this.context.getCode()
      const totalDuration = performance.now() - startTime

      return {
        success: true,
        source,
        target,
        codeChange: {
          before: codeBefore,
          after: codeAfter,
          diff: this.createDiff(codeBefore, codeAfter),
        },
        timing: this.config.captureTimings
          ? {
              dropDuration,
              codeModificationDuration,
              totalDuration,
            }
          : undefined,
      }
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error),
        codeBefore
      )
    } finally {
      this.clearGlobalDragData()
    }
  }

  /**
   * Set the initial code for testing
   */
  setCode(code: string): void {
    this.context.setCode(code)
  }

  /**
   * Get current code
   */
  getCode(): string {
    return this.context.getCode()
  }

  /**
   * Trigger recompilation
   */
  async recompile(): Promise<void> {
    await this.context.recompile()
  }

  /**
   * Get all available fixtures
   */
  getFixtures() {
    return {
      components: ALL_COMPONENTS,
      containers: ALL_CONTAINERS,
    }
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  /**
   * Set global drag data (simulating ComponentPanel behavior)
   */
  private setGlobalDragData(data: {
    componentName: string
    properties?: string
    textContent?: string
    children?: string
    fromComponentPanel?: boolean
  }): void {
    getDragDataHelpers().setCurrentDragData(data)
  }

  /**
   * Set canvas drag data
   */
  private setCanvasDragData(nodeId: string): void {
    getDragDataHelpers().setCanvasDragData(nodeId)
  }

  /**
   * Clear global drag data
   */
  private clearGlobalDragData(): void {
    getDragDataHelpers().clearCurrentDragData()
  }

  /**
   * Wait for code to change after drop
   */
  private async waitForCodeChange(originalCode: string): Promise<void> {
    const startTime = performance.now()

    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const currentCode = this.context.getCode()
        if (currentCode !== originalCode) {
          clearInterval(checkInterval)
          resolve()
          return
        }
        if (performance.now() - startTime > this.config.timeout) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 10)
    })
  }

  /**
   * Create a simple diff between two code strings
   */
  private createDiff(before: string, after: string): string {
    const beforeLines = before.split('\n')
    const afterLines = after.split('\n')

    const diff: string[] = []

    // Simple line-by-line diff
    const maxLines = Math.max(beforeLines.length, afterLines.length)
    for (let i = 0; i < maxLines; i++) {
      const beforeLine = beforeLines[i]
      const afterLine = afterLines[i]

      if (beforeLine === afterLine) {
        diff.push(`  ${afterLine || ''}`)
      } else if (beforeLine === undefined) {
        diff.push(`+ ${afterLine}`)
      } else if (afterLine === undefined) {
        diff.push(`- ${beforeLine}`)
      } else {
        diff.push(`- ${beforeLine}`)
        diff.push(`+ ${afterLine}`)
      }
    }

    return diff.join('\n')
  }

  /**
   * Create an error result
   */
  private createErrorResult(error: string, codeBefore: string): DragTestResult {
    return {
      success: false,
      source: { type: 'palette' },
      target: { containerId: '', insertionIndex: -1 },
      codeChange: {
        before: codeBefore,
        after: this.context.getCode(),
        diff: '',
      },
      error,
    }
  }
}

// =============================================================================
// Fluent API Builder
// =============================================================================

/**
 * Create a fluent test builder
 */
export function createDragTest(context: DragTestContext): DragTestBuilder {
  return new DragTestBuilder(context)
}

class DragTestBuilder {
  private context: DragTestContext
  private initialCode?: string

  constructor(context: DragTestContext) {
    this.context = context
  }

  withCode(code: string): this {
    this.initialCode = code
    return this
  }

  fromPalette(componentType: string): PaletteDragBuilderImpl {
    if (this.initialCode) {
      this.context.setCode(this.initialCode)
    }
    return new PaletteDragBuilderImpl(this.context, componentType)
  }

  fromCanvas(nodeId: string): CanvasMoveBuilderImpl {
    if (this.initialCode) {
      this.context.setCode(this.initialCode)
    }
    return new CanvasMoveBuilderImpl(this.context, nodeId)
  }
}

class PaletteDragBuilderImpl {
  private context: DragTestContext
  private componentType: string
  private properties?: string
  private textContent?: string
  private targetNodeId?: string
  private insertionIndex: number = 0

  constructor(context: DragTestContext, componentType: string) {
    this.context = context
    this.componentType = componentType
  }

  withProperties(props: string): this {
    this.properties = props
    return this
  }

  withText(text: string): this {
    this.textContent = text
    return this
  }

  toContainer(nodeId: string): this {
    this.targetNodeId = nodeId
    return this
  }

  atPosition(index: number): this {
    this.insertionIndex = index
    return this
  }

  async execute(): Promise<DragTestResult> {
    if (!this.targetNodeId) {
      throw new Error('Target container must be specified with toContainer()')
    }

    const runner = new DragTestRunner(this.context)
    return runner.simulatePaletteDrag({
      componentType: this.componentType,
      targetNodeId: this.targetNodeId,
      insertionIndex: this.insertionIndex,
      properties: this.properties,
      textContent: this.textContent,
    })
  }
}

class CanvasMoveBuilderImpl {
  private context: DragTestContext
  private sourceNodeId: string
  private targetNodeId?: string
  private insertionIndex: number = 0

  constructor(context: DragTestContext, sourceNodeId: string) {
    this.context = context
    this.sourceNodeId = sourceNodeId
  }

  toContainer(nodeId: string): this {
    this.targetNodeId = nodeId
    return this
  }

  atPosition(index: number): this {
    this.insertionIndex = index
    return this
  }

  async execute(): Promise<DragTestResult> {
    if (!this.targetNodeId) {
      throw new Error('Target container must be specified with toContainer()')
    }

    const runner = new DragTestRunner(this.context)
    return runner.simulateCanvasMove({
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      insertionIndex: this.insertionIndex,
    })
  }
}
