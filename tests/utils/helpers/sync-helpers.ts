/**
 * Test Helpers for Sync Testing
 *
 * Utility functions to simplify sync-related test setup and assertions.
 */

import { vi } from 'vitest'
import { state, actions } from '../../../studio/core'
import type { SelectionOrigin } from '../../../studio/core/state'
import type { SyncCoordinator } from '../../../studio/sync/sync-coordinator'
import type { MockSourceMap, MockSyncTargets } from '../mocks/sync-mocks'

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Resets studio state to initial values
 */
export function resetStudioState(): void {
  state.set({
    source: '',
    ast: null,
    ir: null,
    sourceMap: null,
    errors: [],
    selection: { nodeId: null, origin: 'editor' },
    cursor: { line: 1, column: 1 },
    editorHasFocus: false,
    currentFile: 'index.mirror',
  })
}

/**
 * Sets up state with a source and optional selection
 */
export function setupStateWithSource(source: string, selection?: { nodeId: string; origin: SelectionOrigin }): void {
  state.set({
    source,
    ast: null,
    ir: null,
    sourceMap: null,
    errors: [],
    selection: selection || { nodeId: null, origin: 'editor' },
    cursor: { line: 1, column: 1 },
    editorHasFocus: false,
    currentFile: 'index.mirror',
  })
}

// ============================================
// SYNC HELPERS
// ============================================

/**
 * Waits for debounce to complete
 */
export async function waitForDebounce(ms = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Advances timers and flushes promises
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms)
  await vi.runAllTimersAsync()
}

/**
 * Simulates a selection change through the state system
 */
export function simulateSelection(nodeId: string | null, origin: SelectionOrigin): void {
  actions.setSelection(nodeId, origin)
}

/**
 * Simulates multiple rapid selections (for debounce testing)
 */
export function simulateRapidSelections(
  nodeIds: string[],
  origin: SelectionOrigin,
  intervalMs = 10
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0
    const interval = setInterval(() => {
      if (index >= nodeIds.length) {
        clearInterval(interval)
        resolve()
        return
      }
      actions.setSelection(nodeIds[index], origin)
      index++
    }, intervalMs)
  })
}

// ============================================
// ASSERTIONS
// ============================================

/**
 * Asserts that editor was scrolled to specific line
 */
export function assertEditorScrolledTo(targets: MockSyncTargets, line: number): void {
  const lastScroll = targets._scrollHistory[targets._scrollHistory.length - 1]
  if (lastScroll !== line) {
    throw new Error(`Expected editor to scroll to line ${line}, but scrolled to ${lastScroll}`)
  }
}

/**
 * Asserts that preview element was highlighted
 */
export function assertPreviewHighlighted(targets: MockSyncTargets, nodeId: string | null): void {
  const lastHighlight = targets._highlightHistory[targets._highlightHistory.length - 1]
  if (lastHighlight !== nodeId) {
    throw new Error(`Expected preview highlight "${nodeId}", but got "${lastHighlight}"`)
  }
}

/**
 * Asserts that editor was NOT scrolled
 */
export function assertEditorNotScrolled(targets: MockSyncTargets): void {
  if (targets._scrollHistory.length > 0) {
    throw new Error(
      `Expected editor not to scroll, but scrolled to lines: ${targets._scrollHistory.join(', ')}`
    )
  }
}

/**
 * Asserts that preview was NOT highlighted
 */
export function assertPreviewNotHighlighted(targets: MockSyncTargets): void {
  if (targets._highlightHistory.length > 0) {
    throw new Error(
      `Expected preview not to highlight, but highlighted: ${targets._highlightHistory.join(', ')}`
    )
  }
}

/**
 * Asserts current selection state
 */
export function assertSelection(expectedNodeId: string | null, expectedOrigin?: SelectionOrigin): void {
  const { selection } = state.get()
  if (selection.nodeId !== expectedNodeId) {
    throw new Error(`Expected selection "${expectedNodeId}", but got "${selection.nodeId}"`)
  }
  if (expectedOrigin && selection.origin !== expectedOrigin) {
    throw new Error(`Expected origin "${expectedOrigin}", but got "${selection.origin}"`)
  }
}

// ============================================
// COORDINATOR SETUP
// ============================================

/**
 * Sets up a SyncCoordinator with mock dependencies
 */
export function setupCoordinatorWithMocks(
  coordinator: SyncCoordinator,
  sourceMap: MockSourceMap,
  targets: MockSyncTargets
): void {
  coordinator.setSourceMap(sourceMap as unknown as import('../../../compiler/ir/source-map').SourceMap)
  // Cast to SyncTargets - the mock functions are compatible at runtime
  coordinator.setTargets({
    scrollEditorToLine: targets.scrollEditorToLine as unknown as (line: number) => void,
    highlightPreviewElement: targets.highlightPreviewElement as unknown as (nodeId: string | null) => void,
  })
  coordinator.subscribe()
}

/**
 * Cleans up coordinator after tests
 */
export function cleanupCoordinator(coordinator: SyncCoordinator): void {
  coordinator.dispose()
}

// ============================================
// SCENARIO BUILDERS
// ============================================

/**
 * Creates a complete test scenario with coordinator and mocks
 */
export interface SyncTestScenario {
  coordinator: SyncCoordinator
  sourceMap: MockSourceMap
  targets: MockSyncTargets
  cleanup: () => void
}

/**
 * Builds a sync test scenario
 */
export function buildSyncScenario(
  createCoordinator: () => SyncCoordinator,
  sourceMap: MockSourceMap,
  targets: MockSyncTargets
): SyncTestScenario {
  const coordinator = createCoordinator()
  setupCoordinatorWithMocks(coordinator, sourceMap, targets)

  return {
    coordinator,
    sourceMap,
    targets,
    cleanup: () => cleanupCoordinator(coordinator),
  }
}

// ============================================
// TIMING UTILITIES
// ============================================

/**
 * Creates a promise that resolves after a timeout
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Runs a function and measures execution time
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = performance.now()
  const result = await fn()
  const timeMs = performance.now() - start
  return { result, timeMs }
}
