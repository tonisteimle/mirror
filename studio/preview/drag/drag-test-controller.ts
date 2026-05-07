/**
 * DragTestController — programmatic drag simulation for tests.
 *
 * Wraps a DragController and drives it via the `__forceState` /
 * `__inspectState` / `__cachedChildCount` backdoors. Production code
 * MUST NOT instantiate this class — it intentionally bypasses validation
 * and event ordering that real drag flows enforce.
 *
 * The simulated drop path is:
 *   __forceState('dragging', source, target) → controller.drop()
 *
 * `controller.drop()` is the same public method the real dragend flow uses,
 * so the dispatch pipeline (reset → onDrop callback) matches production.
 * The only thing skipped is the dragstart/dragover event sequence and its
 * geometry-driven target computation — which is the whole point of test
 * simulation.
 */

import { createLogger } from '../../../compiler/utils/logger'
import type { DragController } from './drag-controller'
import type { DragSource, DropTarget, FlexDropTarget, Point } from './types'

const log = createLogger('DragTestController')

/** Mirrors `DragState` in drag-controller.ts; duplicated to avoid import cycles. */
type DragState = 'idle' | 'dragging'

export class DragTestController {
  constructor(private readonly controller: DragController) {}

  /**
   * Simulate a complete drop. Forces the controller's internal state and
   * then invokes the public `drop()` method, so subscribers see the same
   * sequence (`reset` → onDrop) as a real dragend.
   *
   * @example
   *   const test = new DragTestController(getDragController())
   *   await test.simulateDrop(
   *     { type: 'palette', componentName: 'Button', template: 'Button' },
   *     { mode: 'flex', containerId: 'node-1', insertionIndex: 0 }
   *   )
   */
  async simulateDrop(source: DragSource, target: DropTarget): Promise<void> {
    this.controller.__forceState('dragging', source, target)
    log.info(
      '[Test] Simulated drop:',
      source.componentName || source.nodeId,
      '→',
      target.containerId,
      describeTarget(target)
    )
    await this.controller.drop()
  }

  /** Simulate a flex (index-based) drop. */
  simulateFlexDrop(source: DragSource, containerId: string, insertionIndex: number): Promise<void> {
    return this.simulateDrop(source, { mode: 'flex', containerId, insertionIndex })
  }

  /** Simulate an absolute (position-based) drop, appending at end of container. */
  simulateAbsoluteDrop(source: DragSource, containerId: string, position: Point): Promise<void> {
    return this.simulateDrop(source, {
      mode: 'absolute',
      containerId,
      position,
      insertionIndex: this.controller.__cachedChildCount(containerId),
    })
  }

  /**
   * Inject a source while keeping the existing target. Used by tests that
   * build up the drag state in stages.
   */
  setTestSource(source: DragSource): void {
    const current = this.controller.__inspectState()
    this.controller.__forceState('dragging', source, current.target)
  }

  /** Inject a target while keeping the existing source/state. */
  setTestTarget(target: DropTarget): void {
    const current = this.controller.__inspectState()
    this.controller.__forceState(current.state, current.source, target)
  }

  /** Snapshot of the controller's internal state. */
  getTestState(): { state: DragState; source: DragSource | null; target: DropTarget | null } {
    return this.controller.__inspectState()
  }
}

function describeTarget(target: DropTarget): string {
  if (target.mode === 'absolute') return `(${target.position.x}, ${target.position.y})`
  if (target.mode === 'aligned') return `aligned:${target.alignmentProperty}`
  return `index ${(target as FlexDropTarget).insertionIndex}`
}
